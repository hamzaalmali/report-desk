// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const db = require('../src/main/db/db');
const { genisTabloOku } = require('../src/main/import/genisTablo');
const { gecmisiAktar } = require('../src/main/import/gecmisAktar');
const {
  gunlukAktar, raporBul, raporBulImza, raporBulDosyaAdi, isletmeyeEslestir,
} = require('../src/main/import/gunlukAktar');
const { key } = require('../src/shared/tr');
const { aylikDisaAktar } = require('../src/main/export/excelDisaAktar');
const { vardiyaIceAktar } = require('../src/main/import/vardiyaAktar');
const { vardiyaDisaAktar } = require('../src/main/export/vardiyaDisaAktar');
const kilit = require('../src/main/kilit');
const komut = require('../src/main/whatsapp/komut');

const KOK = process.argv[3] || path.join(__dirname, '..', '..');

function excelAra(kok) {
  const bulunan = [];
  const tara = (klasor, derinlik) => {
    let girdiler = [];
    try { girdiler = fs.readdirSync(klasor, { withFileTypes: true }); } catch { return; }
    for (const g of girdiler) {
      const tam = path.join(klasor, g.name);
      if (g.isDirectory()) {
        if (derinlik > 0 && g.name !== 'node_modules' && !g.name.startsWith('.')) {
          tara(tam, derinlik - 1);
        }
      } else if (/\.xlsx?$/i.test(g.name) && !g.name.startsWith('~$')) {
        bulunan.push(tam);
      }
    }
  };
  tara(kok, 1);
  return bulunan;
}

async function genisTabloBul() {
  if (process.argv[2]) return process.argv[2];
  const adaylar = excelAra(KOK).filter((f) => /\.xlsx$/i.test(f));
  for (const a of adaylar) {
    try {
      const o = await genisTabloOku(a);
      if (o.kayitlar.length > 0) return a;
    } catch { }
  }
  return null;
}

let gecti = 0, kaldi = 0;
function kontrol(ad, kosul, ayrinti = '') {
  if (kosul) { gecti++; console.log(`  ✓ ${ad}`); }
  else { kaldi++; console.log(`  ✗ ${ad}${ayrinti ? '  → ' + ayrinti : ''}`); }
}

async function main() {
  const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'rapor-test-'));
  db.ac(path.join(gecici, 'test.sqlite'));

  const KAYNAK = await genisTabloBul();

  console.log('\nŞema ve başlangıç durumu');
  kontrol('9 kategori kuruldu', db.kategoriler().length === 9);
  const varsayilan = db.isletmeler();
  kontrol('varsayılan işletme listesi kurulu', varsayilan.length === 55, String(varsayilan.length));
  kontrol('varsayılan sıra ilk açılışta doğru',
    varsayilan[0].ad === 'BALYA' && varsayilan[54].ad === 'YILDIRIM',
    `${varsayilan[0].ad} … ${varsayilan[varsayilan.length - 1].ad}`);
  kontrol('varsayılan eşleştirme kuralları kurulu',
    db.eslesmeler().length === 64, String(db.eslesmeler().length));

  if (!KAYNAK) {
    console.log('\n! Geniş tablo düzeninde .xlsx bulunamadı — geçmiş/çıktı testleri atlandı.');
  } else {
  console.log(`\nGeçmiş tabloyu okuma  (${path.basename(KAYNAK)})`);
  const okuma = await genisTabloOku(KAYNAK);
  kontrol('tanınmayan kategori yok', okuma.uyarilar.length === 0, okuma.uyarilar.join(' | '));
  kontrol('kayıt üretildi', okuma.kayitlar.length > 0, String(okuma.kayitlar.length));
  const anahtarlar = new Set(okuma.kayitlar.map((k) => `${k.tarih}|${k.isletme}|${k.kategori}`));
  kontrol('çift kayıt yok', anahtarlar.size === okuma.kayitlar.length);

  console.log('\nVeritabanına aktarma');
  const aktarim = await gecmisiAktar([KAYNAK]);
  kontrol('tüm kayıtlar yazıldı', aktarim.toplamKayit === okuma.kayitlar.length,
    `${aktarim.toplamKayit} / ${okuma.kayitlar.length}`);
  const ozet = db.ozet();
  kontrol('gün sayısı tutuyor', ozet.gun === aktarim.gunler.length);
  kontrol('dosyadaki işletmeler zaten tanınıyor',
    aktarim.yeniIsletmeler.length === 0, aktarim.yeniIsletmeler.join(', '));

  const dosyaSirasi = okuma.isletmeler.join('|');
  kontrol('işletme sırası kaynak dosyayla birebir',
    db.isletmeler().map((i) => i.ad).join('|') === dosyaSirasi);

  db.isletmeEkle('ZZZ TEST');
  db.isletmeTasi(db.isletmeler()[0].id, 1);
  kontrol('elle sıralama ilk iki satırı yer değiştiriyor',
    db.isletmeler()[1].ad === okuma.isletmeler[0]
    && db.isletmeler()[0].ad === okuma.isletmeler[1]);
  await gecmisiAktar([KAYNAK]);
  kontrol('yeniden aktarım sırayı dosyaya geri döndürüyor',
    db.isletmeler().slice(0, okuma.isletmeler.length).map((i) => i.ad).join('|') === dosyaSirasi);
  db.isletmeSil(db.isletmeler().find((i) => i.ad === 'ZZZ TEST').id);

  const tersi = [...okuma.isletmeler].reverse();
  const y = db.isletmeSiralaAdlar(tersi);
  kontrol('ada göre sıralama listeyi birebir uyguluyor',
    db.isletmeler().map((i) => i.ad).join('|') === tersi.join('|'), `${y.siralandi} satır`);
  db.isletmeSiralaAdlar(okuma.isletmeler);
  kontrol('sıra dosya sırasına geri döndü',
    db.isletmeler().map((i) => i.ad).join('|') === dosyaSirasi);

  console.log("\nExcel'e aktarma (gidiş-dönüş)");
  const ay = db.aylar()[0].ay;
  const cikti = path.join(gecici, 'cikti.xlsx');
  await aylikDisaAktar(ay, cikti);
  const geri = await genisTabloOku(cikti);
  const normalle = (kayitlar) => {
    const m = new Map();
    for (const k of kayitlar) {
      if (!k.tarih.startsWith(ay)) continue;
      m.set(`${k.tarih}|${k.isletme}|${k.kategori}`,
        ['ariza_var', 'donus_saglandi', 'tutanak_gerekli', 'tutanak_eklendi']
          .map((f) => `${k[f]}${k[f + '_bekliyor']}`).join(''));
    }
    return m;
  };
  const kaynak = normalle(okuma.kayitlar);
  const uretilen = normalle(geri.kayitlar);
  let fark = 0;
  for (const [k, v] of kaynak) if (uretilen.get(k) !== v) fark++;
  for (const k of uretilen.keys()) if (!kaynak.has(k)) fark++;
  kontrol(`${ay} çıktısı kaynakla birebir`, fark === 0, `${fark} fark`);
  kontrol('çıktıdaki işletme sırası kaynak dosyayla aynı',
    geri.isletmeler.join('|') === okuma.isletmeler.join('|'),
    geri.isletmeler.slice(0, 5).join(', '));

  }

  console.log('\nGünlük rapor aktarımı');
  const tarihliIlk = excelAra(KOK).find((f) => /\d{2}\.\d{2}\.\d{4}/.test(path.basename(f)));
  const gunlukDosyalar = tarihliIlk
    ? excelAra(path.dirname(tarihliIlk)).filter((f) => path.dirname(f) === path.dirname(tarihliIlk))
    : [];
  if (!gunlukDosyalar.length) {
    console.log('  ! günlük rapor dosyası bulunamadı, atlandı.');
  } else {
    const toplu = await gunlukAktar(gunlukDosyalar);
    const r = toplu.gunler[0];
    kontrol('tarih dosya adından okundu', /^\d{4}-\d{2}-\d{2}$/.test(r.tarih), r.tarih);
    kontrol('tek güne ait dosyalar tek gün üretiyor', toplu.gunler.length === 1);
    kontrol('tüm dosyalar tanındı', r.taninmayan.length === 0, r.taninmayan.join(', '));
    kontrol('otomatik kategoriler işaretlendi',
      r.kategoriler.filter((k) => k.otomatik && k.adet > 0).length >= 5,
      JSON.stringify(r.kategoriler));
    kontrol('eşleşmeyen değerler yapılandırılmış geliyor',
      r.eslesmez.every((e) => e.deger && e.adet > 0));

    if (r.eslesmez.length) {
      const hedef = db.isletmeler()[0];
      for (const e of r.eslesmez) {
        db.eslesmeEkle({ kaynak_deger: e.deger, isletme_id: hedef.id, tip: 'TAM' });
      }
      const r2 = (await gunlukAktar(gunlukDosyalar)).gunler[0];
      kontrol('kural eklendikten sonra eşleşmeyen kalmıyor',
        r2.eslesmez.length === 0,
        r2.eslesmez.map((e) => e.deger).join(', '));
    } else {
      kontrol('eşleşmeyen değer yok', true);
    }
  }

  console.log('\nExcel başlıkları birleşik');
  if (gunlukDosyalar.length) {
    const ay = db.aylar()[0].ay;
    const yol = path.join(gecici, 'baslik.xlsx');
    await aylikDisaAktar(ay, yol);
    const wb = new (require('exceljs').Workbook)();
    await wb.xlsx.readFile(yol);
    const ws = wb.worksheets[0];
    const birlesik = new Set(ws.model.merges || []);

    kontrol('A1:A3 birleşik ve tek İŞLETME yazıyor',
      birlesik.has('A1:A3') && ws.getCell(1, 1).value === 'İŞLETME'
      && !ws.getCell(2, 1).model.value && !ws.getCell(3, 1).model.value,
      [...birlesik].join(' '));

    const master = (r, c) => {
      const h = ws.getCell(r, c);
      return (h.master || h).address === h.address;
    };
    const kats = db.kategoriler();
    let hepsi = true, ayrinti = '';
    for (let c = 2; c <= ws.columnCount; c++) {
      if (!master(2, c)) continue;
      const ad = String(ws.getCell(2, c).value || '');
      const kat = kats.find((k) => k.ad === ad);
      if (!kat) { hepsi = false; ayrinti = `bilinmeyen başlık: ${ad}`; break; }
      const son = c + kat.genislik - 1;
      if (kat.genislik > 1 && !birlesik.has(`${ws.getCell(2, c).address}:${ws.getCell(2, son).address}`)) {
        hepsi = false; ayrinti = `${ad} birleşik değil`; break;
      }
      c = son;
    }
    kontrol('kategori başlıkları sütunları boyunca birleşik', hepsi, ayrinti);
    kontrol('başlık ortalanmış',
      ws.getCell(1, 1).alignment.horizontal === 'center'
      && ws.getCell(1, 1).alignment.vertical === 'middle'
      && ws.getCell(2, 2).alignment.horizontal === 'center');

    const geri = await genisTabloOku(yol);
    kontrol('birleşik başlıklı dosya sorunsuz geri okunuyor',
      geri.uyarilar.length === 0 && geri.kategoriler.length > 0,
      geri.uyarilar.join(' | '));
  } else {
    console.log('  ! günlük rapor dosyası yok, atlandı.');
  }

  console.log('\nRapor tanıma');
  kontrol('OSOS sayfaları ek/eksik kelimeyle de tanınır',
    (raporBul('BİNA TİPİ OSOS KONTROL') || {}).kategori === 'BINA_TIPI_OSOS'
    && (raporBul('OSOS BAĞLANTI İHBAR İNCELEME') || {}).kategori === 'OSOS_BAGLANTI'
    && (raporBul('BİNA TİPİ') || {}).kategori === 'BINA_TIPI_OSOS');
  kontrol('rapor olmayan sayfalar tanınmaz',
    ['Rekortmen', 'Rakortman', '1000 Abone ve Üzeri', '6 Saat ve Üzeri']
      .every((s) => raporBul(s) === null));
  kontrol('adsız sayfa sütun başlıklarından tanınır',
    (raporBulImza(['DURUMKODUAÇIKLAMASI']) || {}).kategori === 'DURUM_KODU'
    && (raporBulImza(['İSTENENBELGELER']) || {}).kategori === 'BILGI_BELGE'
    && (raporBulImza(['TALEPEDİLEN']) || {}).kategori === 'BILGI_BELGE'
    && (raporBulImza(['TRAFOADI']) || {}).kategori === 'BINA_TIPI_OSOS'
    && (raporBulImza(['TSUİSBAĞLANMAORANI']) || {}).kategori === 'OSOS_BAGLANTI');
  kontrol('imzası olmayan başlık takımı tanınmaz',
    raporBulImza(['KODNO1', 'KADEME2', 'İL3A']) === null);
  kontrol('dosya adı son çare olarak tanınır',
    (raporBulDosyaAdi('11.08.2026 Tarihli İl-İlçe Bilgisi Gelmeyen Kesintiler.xlsx') || {})
      .kategori === 'IL_ILCE');
  kontrol('Türkçe harf ayrışık (NFD) yazılsa da eşleşir',
    key('İLÇE'.normalize('NFD')) === key('İLÇE')
    && (raporBulDosyaAdi('11.08.2026 BİNA TİPİ OSOS.xlsx'.normalize('NFD')) || {})
      .kategori === 'BINA_TIPI_OSOS');

  console.log('\nElle girilenler aktarımda korunuyor');
  if (gunlukDosyalar.length) {
    const t = (await gunlukAktar(gunlukDosyalar)).gunler[0].tarih;
    const kat = db.kategoriHaritasi();
    const isl = db.isletmeler();
    const oku = (kod, id, alan) => {
      const s = db.gunVerisi(t).satirlar.find((x) => x.kategori_kod === kod && x.isletme_id === id);
      return s ? s[alan] : null;
    };
    const isaretli = db.gunVerisi(t).satirlar.find((s) => s.kategori_kod === 'BINA_TIPI_OSOS' && s.ariza_var);
    db.hucreGuncelle({ tarih: t, isletme_id: isl[0].id, kategori_id: kat.get('IL_ILCE').id, alan: 'tutanak_gerekli', deger: 1 });
    db.hucreGuncelle({ tarih: t, isletme_id: isaretli.isletme_id, kategori_id: kat.get('BINA_TIPI_OSOS').id, alan: 'donus_saglandi', deger: 1 });
    db.hucreGuncelle({ tarih: t, isletme_id: isl[0].id, kategori_id: kat.get('SCADA_TM').id, alan: 'tutanak_gerekli', deger: 1 });

    await gunlukAktar(gunlukDosyalar);
    kontrol('İL-İLÇE elle işareti yeniden aktarımda silinmiyor',
      oku('IL_ILCE', isl[0].id, 'tutanak_gerekli') === 1);
    kontrol('otomatik kategorinin elle sütunu korunuyor',
      oku('BINA_TIPI_OSOS', isaretli.isletme_id, 'donus_saglandi') === 1);
    kontrol('raporu olmayan kategoriye dokunulmuyor',
      oku('SCADA_TM', isl[0].id, 'tutanak_gerekli') === 1);
    kontrol('otomatik işaret yine de yeniden yazılıyor',
      oku('BINA_TIPI_OSOS', isaretli.isletme_id, 'ariza_var') === 1);

    const osos = gunlukDosyalar.filter((d) => /osos/i.test(d));
    if (osos.length) {
      const kismi = (await gunlukAktar(osos)).gunler[0];
      kontrol('eksik kalan raporlar bildiriliyor',
        kismi.eksikRaporlar.length === 4
        && !kismi.eksikRaporlar.some((e) => e.kod.startsWith('OSOS') || e.kod === 'BINA_TIPI_OSOS'),
        kismi.eksikRaporlar.map((e) => e.kod).join(', '));
      const dk = db.gunVerisi(t).satirlar.find((s) => s.kategori_kod === 'DURUM_KODU' && s.ariza_var);
      kontrol('kısmi aktarım seçilmeyen kategorileri silmiyor', !!dk);
    }
  } else {
    console.log('  ! günlük rapor dosyası yok, atlandı.');
  }

  console.log('\nEkip adından ilçe tespiti');
  if (gunlukDosyalar.length) {
    const r = (await gunlukAktar(gunlukDosyalar)).gunler[0];
    const ilIlce = r.kategoriler.find((k) => k.kod === 'IL_ILCE');
    kontrol('İL-İLÇE kayıtları ekip adından işaretleniyor',
      ilIlce && ilIlce.adet > 0, JSON.stringify(ilIlce));
    kontrol('çözülemeyen kayıt sayısı bildiriliyor',
      typeof r.cozulemeyenIlIlce === 'number' && r.cozulemeyenIlIlce < r.oneriAdet,
      `${r.cozulemeyenIlIlce} / ${r.oneriAdet}`);

    const tablo = db.eslesmeler().map((e) => ({
      anahtar: key(e.kaynak_deger), isletme: e.isletme, isletme_id: e.isletme_id, tip: e.tip,
    }));
    const ekipten = (metin) => (isletmeyeEslestir(tablo, { ekip: metin }) || {}).isletme;
    kontrol('ekip metninden ilçe çıkarılıyor',
      ekipten('YALOVA EKİP 1') === 'YALOVA'
      && ekipten('947 16 BZY 947 KARACABEY 4X4') === 'KARACABEY'
      && ekipten('NİLÜFER G') === 'NİLÜFER',
      [ekipten('YALOVA EKİP 1'), ekipten('947 16 BZY 947 KARACABEY 4X4')].join(', '));
    kontrol('belde ekibi bağlı ilçeye yazılıyor',
      ekipten('AKÇAY SEPETLİ') === 'EDREMİT'
      && ekipten('ALTINOLUK EKİBİ') === 'EDREMİT'
      && ekipten('KÜÇÜKKUYU SEPETLİ') === 'AYVACIK',
      [ekipten('AKÇAY SEPETLİ'), ekipten('KÜÇÜKKUYU SEPETLİ')].join(', '));
    kontrol('ilçe içermeyen ekip adı zorlama eşleşme üretmiyor',
      ekipten('16 CBZ 919 (MÜRACAAT EKİBİ)') === undefined,
      String(ekipten('16 CBZ 919 (MÜRACAAT EKİBİ)')));

    const t = r.tarih;
    const kat = db.kategoriHaritasi();
    const elle = db.isletmeler().find((i) => !db.gunVerisi(t).satirlar
      .some((s) => s.kategori_kod === 'IL_ILCE' && s.isletme_id === i.id && s.tutanak_gerekli));
    db.hucreGuncelle({ tarih: t, isletme_id: elle.id, kategori_id: kat.get('IL_ILCE').id, alan: 'tutanak_gerekli', deger: 1 });
    await gunlukAktar(gunlukDosyalar);
    const s = db.gunVerisi(t).satirlar
      .find((x) => x.kategori_kod === 'IL_ILCE' && x.isletme_id === elle.id);
    kontrol('elle konan İL-İLÇE işareti yeniden aktarımda duruyor',
      !!s && s.tutanak_gerekli === 1, elle.ad);
  } else {
    console.log('  ! günlük rapor dosyası yok, atlandı.');
  }

  console.log('\nAdında tarih olmayan dosya');
  if (gunlukDosyalar.length >= 2) {
    const klasor = path.join(gecici, 'tarihsiz');
    fs.mkdirSync(klasor, { recursive: true });
    const kaynak = gunlukDosyalar.find((d) => /\d{2}\.\d{2}\.\d{4}/.test(path.basename(d)));
    const adsiz = path.join(klasor,
      path.basename(kaynak).replace(/\d{2}\.\d{2}\.\d{4}\s*/, ''));
    fs.copyFileSync(kaynak, adsiz);
    const kalan = gunlukDosyalar.filter((d) => d !== kaynak);

    const adsizMi = (d) => !/\d{2}\.\d{2}\.\d{4}/.test(path.basename(d));
    const temel = kalan.filter(adsizMi).length + 1;

    const tek = await gunlukAktar([...kalan, adsiz]);
    kontrol('tek gün varsa tarihsiz dosya o güne ekleniyor',
      tek.tarihsiz.length === 0 && tek.tarihiVerilen.length === temel && tek.gunler.length === 1,
      `tarihsiz=${tek.tarihsiz.length} verilen=${tek.tarihiVerilen.length} beklenen=${temel}`);

    const tarihli = kalan.find((d) => !adsizMi(d));
    const ikinci = path.join(klasor,
      path.basename(tarihli).replace(/\d{2}\.\d{2}\.\d{4}/, '01.01.2020'));
    fs.copyFileSync(tarihli, ikinci);
    const coklu = await gunlukAktar([...kalan, ikinci, adsiz]);
    kontrol('birden çok gün varsa tarihsiz dosya tahmin edilmiyor',
      coklu.tarihsiz.length === temel && coklu.tarihiVerilen.length === 0,
      `tarihsiz=${coklu.tarihsiz.length} verilen=${coklu.tarihiVerilen.length} beklenen=${temel}`);
  } else {
    console.log('  ! yeterli günlük dosya yok, atlandı.');
  }

  console.log('\nVardiya');
  const vardiyaDosyalari = excelAra(KOK).filter((f) => /vardiya/i.test(f.normalize('NFC')));
  if (!vardiyaDosyalari.length) {
    console.log('  ! vardiya Excel dosyası bulunamadı, atlandı.');
  } else {
    const v = await vardiyaIceAktar(vardiyaDosyalari);
    kontrol('vardiya dosyası okundu',
      v.aylar.length > 0 && v.kayit > 0 && v.uyarilar.length === 0,
      `${v.aylar.length} ay, ${v.kayit} kayıt ${v.uyarilar.join(' | ')}`);
    kontrol('ekipler ve personel kuruldu',
      db.vardiyaEkipler().length > 0 && db.vardiyaPersoneller(null).length > 0,
      `${db.vardiyaEkipler().length} ekip, ${db.vardiyaPersoneller(null).length} personel`);
    kontrol('her ekibin vardiya listesi kaynaktan öğrenildi',
      db.vardiyaEkipler().every((e) => /^[ABC](,[ABC])*$/.test(e.vardiyalar)),
      db.vardiyaEkipler().map((e) => `${e.ad}=${e.vardiyalar}`).join(' '));

    const ay = v.aylar[v.aylar.length - 1];
    const once = db.vardiyaAyVerisi(ay);
    const yol = path.join(gecici, 'vardiya.xlsx');
    const cikti = await vardiyaDisaAktar(ay, yol);
    kontrol('vardiya Excel yazıldı', cikti.gun >= 28 && cikti.ekip > 0, JSON.stringify(cikti));

    const ikinci = fs.mkdtempSync(path.join(os.tmpdir(), 'vardiya-rt-'));
    const anaVt = db.yol();
    db.ac(path.join(ikinci, 'v.sqlite'));
    await vardiyaIceAktar([yol]);
    const sonra = db.vardiyaAyVerisi(ay);
    const cizelge = (veri) => {
      const ad = new Map(veri.personeller.map((p) => [p.id, p.ad]));
      return new Set(veri.kayitlar.map((k) => `${ad.get(k.personel_id)}|${k.gun}|${k.kod}`));
    };
    const A = cizelge(once), B = cizelge(sonra);
    let fark = 0;
    for (const x of A) if (!B.has(x)) fark++;
    for (const x of B) if (!A.has(x)) fark++;
    kontrol(`${ay} vardiya çıktısı kaynakla birebir`, fark === 0, `${fark} fark (${A.size}/${B.size})`);

    const ekip = db.vardiyaEkipler()[0];
    const say = db.vardiyaAyVerisi(ay).kayitlar
      .filter((k) => k.ekip_id === ekip.id && k.gun === 1 && k.kod === 'A').length;
    kontrol('günlük vardiya sayımı hesaplanabiliyor', Number.isInteger(say), String(say));
    db.ac(anaVt);
  }

  console.log('\nWhatsApp grup seçimi');
  {
    const gelen = [
      { jid: '1@g.us', ad: 'Bkontrol', katilimci: 12 },
      { jid: '2@g.us', ad: 'Ateknik', katilimci: 5 },
    ];
    let liste = db.waGruplariYaz(gelen);
    kontrol('gruplar kaydedildi ve ada göre sıralı',
      liste.length === 2 && liste[0].ad === 'Ateknik', liste.map((g) => g.ad).join(', '));
    kontrol('hiçbiri baştan seçili değil', db.waSeciliGruplar().length === 0);

    db.waGrupSec('1@g.us', true);
    kontrol('seçim kaydediliyor',
      db.waSeciliGruplar().length === 1 && db.waSeciliGruplar()[0].jid === '1@g.us');

    db.waGruplariYaz([{ jid: '1@g.us', ad: 'Bkontrol yeni', katilimci: 13 }]);
    const g1 = db.waGruplar().find((g) => g.jid === '1@g.us');
    kontrol('yeniden getirmek seçimi bozmuyor',
      g1.secili === 1 && g1.ad === 'Bkontrol yeni' && g1.katilimci === 13, JSON.stringify(g1));

    db.waGrupSec('1@g.us', false);
    kontrol('seçim kaldırılabiliyor', db.waSeciliGruplar().length === 0);
  }

  console.log('\nWhatsApp komutları');
  {
    const coz = (m) => komut.numaralariCoz(m).join(',');
    kontrol('numara biçimleri tek forma geliyor',
      coz('+90 538 817 94 95') === '905388179495'
      && coz('0538 817 94 95') === '905388179495'
      && coz('5388179495') === '905388179495'
      && coz('905388179495') === '905388179495',
      [coz('+90 538 817 94 95'), coz('0538 817 94 95'), coz('5388179495')].join(' | '));
    kontrol('virgülle birden çok numara',
      coz('+90 538 817 94 95, 0555 111 22 33') === '905388179495,905551112233');

    kontrol('hava komutu tanınıyor',
      ['hava durumu', 'Hava Durumu', 'HAVA DURUMU', 'hava durumu?', 'hava']
        .every((m) => !!komut.komutBul(m)));
    kontrol('benzeyen kelimeler komut sayılmıyor',
      ['merhaba', 'havalimanı bilgisi', 'havale', ''].every((m) => komut.komutBul(m) === null));

    const isle = komut.olustur({ izinliler: () => '905388179495', log: () => { } });
    kontrol('izinsiz numaraya yanıt yok',
      (await isle({ gonderen: '905001112233', metin: 'hava durumu' })) === null);
    kontrol('izinli numara alakasız metne yanıt almıyor',
      (await isle({ gonderen: '905388179495', metin: 'merhaba' })) === null);
  }

  console.log('\nWhatsApp gönderen numarası');
  {
    const wa = require('../src/main/whatsapp/wa');
    const kim = (key) => wa.gonderenNumara({ key }, '905388179495');

    kontrol('özel sohbette numara doğrudan okunuyor',
      (await kim({ remoteJid: '905551112233@s.whatsapp.net' })) === '905551112233');
    kontrol('grupta katılımcıdan okunuyor, grup kimliğinden değil',
      (await kim({ remoteJid: '120363@g.us', participant: '905551112233@s.whatsapp.net' }))
      === '905551112233');
    kontrol('grupta LID yerine telefon karşılığı seçiliyor',
      (await kim({
        remoteJid: '120363@g.us',
        participant: '184736251@lid',
        participantAlt: '905551112233@s.whatsapp.net',
      })) === '905551112233');
    kontrol('özel sohbette LID yerine telefon karşılığı seçiliyor',
      (await kim({ remoteJid: '184736251@lid', remoteJidAlt: '905551112233@s.whatsapp.net' }))
      === '905551112233');
    kontrol('kendi telefonundan yazınca gönderen kendi numaramız',
      (await kim({ remoteJid: '120363@g.us', fromMe: true })) === '905388179495');

    const metin = (message) => wa.mesajMetni({ message });
    kontrol('mesaj metni her biçimden okunuyor',
      metin({ conversation: 'hava durumu' }) === 'hava durumu'
      && metin({ extendedTextMessage: { text: 'hava durumu' } }) === 'hava durumu');
  }

  console.log('\nUzaktan durdurma');
  {
    let icerik = '{"durum":"acik","mesaj":""}';
    let sunuyor = true;
    const sunucu = http.createServer((_q, r) => {
      if (!sunuyor) { r.socket.destroy(); return; }
      r.writeHead(200, { 'Content-Type': 'application/json' });
      r.end(icerik);
    });
    await new Promise((r) => sunucu.listen(0, '127.0.0.1', r));
    const adres = `http://127.0.0.1:${sunucu.address().port}/durum.json`;

    const kilitVt = path.join(gecici, 'kilit.sqlite');
    const anaVt = db.yol();
    db.ac(kilitVt);

    let d = await kilit.kur(db, () => { }, adres);
    kontrol('açıkken kilit yok', d.kilitli === false && !d.sonHata, JSON.stringify(d));
    kontrol('kontrol zamanı kaydediliyor', !!d.sonKontrol);

    icerik = '{"durum":"kapali","mesaj":"Durduruldu."}';
    d = await kilit.kontrolEt();
    kontrol('kapali görünce kilitleniyor',
      d.kilitli === true && d.mesaj === 'Durduruldu.', JSON.stringify(d));

    sunuyor = false;
    d = await kilit.kontrolEt();
    kontrol('ağ kopunca kilit açılmıyor', d.kilitli === true && !!d.sonHata, JSON.stringify(d));

    kilit.durdur();
    db.kapat();
    db.ac(kilitVt);
    kilit.kur(db, () => { }, adres);
    kontrol('yeniden açılışta kilit hatırlanıyor', kilit.durumAl().kilitli === true);

    sunuyor = true;
    icerik = 'bozuk json';
    d = await kilit.kontrolEt();
    kontrol('bozuk durum dosyası kilidi düşürmüyor',
      d.kilitli === true && !!d.sonHata, JSON.stringify(d));

    icerik = '{"durum":"acik"}';
    d = await kilit.kontrolEt();
    kontrol('tekrar acik olunca kilit kalkıyor', d.kilitli === false, JSON.stringify(d));

    kilit.durdur();
    sunucu.close();
    db.ac(anaVt);
  }

  console.log('\nÇoklu gün aktarımı');
  if (gunlukDosyalar.length) {
    const ikinci = path.join(gecici, 'ikinci-gun');
    fs.mkdirSync(ikinci, { recursive: true });
    const yeniTarih = '01.01.2020';
    const kopyalar = gunlukDosyalar.map((d) => {
      const yeni = path.join(ikinci, path.basename(d).replace(/\d{2}\.\d{2}\.\d{4}/, yeniTarih));
      fs.copyFileSync(d, yeni);
      return yeni;
    });
    const toplu = await gunlukAktar([...gunlukDosyalar, ...kopyalar]);
    kontrol('iki ayrı gün ayrı ayrı yazıldı', toplu.gunler.length === 2,
      toplu.gunler.map((g) => g.tarih).join(', '));
    const m = gunlukDosyalar
      .map((d) => path.basename(d).match(/(\d{2})\.(\d{2})\.(\d{4})/))
      .find(Boolean);
    const asilTarih = `${m[3]}-${m[2]}-${m[1]}`;
    kontrol('tarihler dosya adlarından doğru okundu',
      toplu.gunler.map((g) => g.tarih).sort().join(',') === `2020-01-01,${asilTarih}`,
      toplu.gunler.map((g) => g.tarih).join(','));
    kontrol('her gün kendi kayıtlarını aldı',
      toplu.gunler.every((g) => g.isaretToplam > 0),
      toplu.gunler.map((g) => `${g.tarih}:${g.isaretToplam}`).join(' '));
    const adsizAdet = [...gunlukDosyalar, ...kopyalar]
      .filter((d) => !/\d{2}\.\d{2}\.\d{4}/.test(path.basename(d))).length;
    kontrol('adı tarihsiz dosyalar eksiksiz bildiriliyor',
      toplu.tarihsiz.length === adsizAdet,
      `${toplu.tarihsiz.length} / ${adsizAdet}`);
  } else {
    console.log('  ! günlük rapor dosyası yok, atlandı.');
  }

  bitir();
}

function bitir() {
  console.log(`\n${gecti} geçti, ${kaldi} kaldı\n`);
  process.exit(kaldi ? 1 : 0);
}

main().catch((e) => { console.error('\nHATA:', e); process.exit(1); });
