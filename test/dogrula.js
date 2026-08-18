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

function sahteSayfa(yardimKodu, tanimlar = [], menu = null) {
  const sayfa = { tiklananlar: [] };

  const oge = (t) => {
    const kendiYazi = t.yazi || '';
    const e = {
      id: t.id || '',
      tagName: t.etiket || 'INPUT',
      className: t.sinif || '',
      disabled: !!t.kapali,
      children: [],
      get textContent() {
        return [kendiYazi, ...e.children.map((c) => c.textContent)].join(' ').trim();
      },
      get childNodes() {
        return [{ nodeType: 3, nodeValue: kendiYazi }, ...e.children];
      },
      get firstElementChild() { return e.children[0] || null; },
      getBoundingClientRect: () => (t.gizli ? { width: 0, height: 0 } : { width: 90, height: 22 }),
      scrollIntoView() { },
      focus() { },
      dispatchEvent() { return true; },
      click() { sayfa.tiklananlar.push(e.id || e.textContent); },
      closest: (secici) => (secici === 'tr' ? { innerText: t.satir || '' } : null),
      querySelector: (secici) => ara(e, secici)[0] || null,
      querySelectorAll: (secici) => ara(e, secici),
    };
    return e;
  };

  const eslesir = (e, secici) => {
    const etiket = (secici.match(/^[a-z]+/) || [])[0];
    if (etiket && e.tagName !== etiket.toUpperCase()) return false;
    return (secici.match(/id\*="([^"]+)"/g) || [])
      .map((p) => p.slice(5, -1))
      .every((p) => String(e.id).includes(p));
  };

  const ara = (kok, secici) => {
    const son = secici.split(/[\s>]+/).filter(Boolean).pop();
    const bulunan = [];
    if (secici.trim().startsWith(':scope >')) {
      return kok.children.filter((c) => eslesir(c, son));
    }
    const gez = (e) => {
      for (const c of e.children) { if (eslesir(c, son)) bulunan.push(c); gez(c); }
    };
    gez(kok);
    return bulunan;
  };

  const ogeler = tanimlar.map(oge);
  const kokler = [...ogeler];

  if (menu) {
    const liste = oge({ id: menu.id || 'leftsidenav', etiket: 'UL' });
    for (const m of menu.ogeler) {
      const li = oge({ etiket: 'LI', yazi: m.yazi });
      if (m.altlar) {
        const alt = oge({ etiket: 'UL' });
        for (const ad of m.altlar) {
          const altLi = oge({ etiket: 'LI' });
          altLi.children.push(oge({ etiket: 'A', yazi: ad }));
          alt.children.push(altLi);
        }
        li.children.push(alt);
      }
      liste.children.push(li);
    }
    kokler.push(liste);
  }

  const tumu = () => {
    const hepsi = [];
    const gez = (e) => { hepsi.push(e); e.children.forEach(gez); };
    kokler.forEach(gez);
    return hepsi;
  };

  const belge = {
    getElementById: (id) => tumu().find((e) => e.id === id) || null,
    querySelectorAll: (secici) => tumu().filter((e) => eslesir(e, secici)),
    querySelector: (secici) => tumu().find((e) => eslesir(e, secici)) || null,
    evaluate: (yol) => ({ singleNodeValue: sayfa.yollar[yol] || null }),
  };

  sayfa.yollar = {};
  const pencere = {};
  require('node:vm').runInNewContext(yardimKodu, {
    window: pencere,
    document: belge,
    getComputedStyle: () => ({ visibility: 'visible' }),
  });

  sayfa.pencere = pencere;
  sayfa.belge = belge;
  sayfa.kok = kokler[kokler.length - 1];
  sayfa.rd = pencere.__rd;
  return sayfa;
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

    kontrol('rapor komutu tanınıyor',
      ['rapor gönder', 'Rapor Gönder', 'RAPOR GÖNDER', 'rapor gönder.', 'rapor indir', 'rapor']
        .every((m) => (komut.komutBul(m) || {}).kod === 'rapor'),
      ['rapor gönder', 'rapor indir', 'rapor']
        .map((m) => `${m}=${(komut.komutBul(m) || {}).kod}`).join(' '));
    kontrol('raporla ilgisiz metin rapor komutu değil',
      ['raporlama nasıl', 'rapordan bahsettik', 'gönder rapor']
        .every((m) => (komut.komutBul(m) || {}).kod !== 'rapor'));
    kontrol('hava komutu rapor komutuna karışmıyor',
      komut.komutBul('hava durumu').kod === 'hava');

    kontrol('tablo komutu tanınıyor',
      ['tablo gönder', 'Tablo Gönder', 'TABLO GÖNDER', 'tablo', 'tablo hazırla', 'kesinti tablosu']
        .every((m) => (komut.komutBul(m) || {}).kod === 'tablo'),
      ['tablo gönder', 'tablo', 'kesinti tablosu']
        .map((m) => `${m}=${(komut.komutBul(m) || {}).kod}`).join(' '));
    kontrol('tabloya benzeyen metin komut sayılmıyor',
      ['tablodan bahsettik', 'gönder tablo', 'tablolar']
        .every((m) => (komut.komutBul(m) || {}).kod !== 'tablo'));
    kontrol('tablo komutu rapor komutuna karışmıyor',
      komut.komutBul('rapor gönder').kod === 'rapor'
      && komut.komutBul('tablo gönder').kod === 'tablo');

    let cagrildi = null;
    const raporlu = komut.olustur({
      izinliler: () => '',
      log: () => { },
      ekIzin: (n) => n === '905551112233',
      servisler: { rapor: (b) => { cagrildi = b.gonderen; return 'oldu'; } },
    });
    kontrol('portal hesabı olan numara izinli listede olmadan rapor çekebiliyor',
      (await raporlu({ gonderen: '905551112233', metin: 'rapor gönder' })) === 'oldu'
      && cagrildi === '905551112233');
    kontrol('portal hesabı olmayan numaraya rapor komutu çalışmıyor',
      (await raporlu({ gonderen: '905009998877', metin: 'rapor gönder' })) === null);
    kontrol('rapor komutu grup sohbetinde çalışmıyor',
      (await raporlu({ gonderen: '905551112233', metin: 'rapor gönder', grupMu: true })) === null);

    const servissiz = komut.olustur({
      izinliler: () => '905551112233', log: () => { },
    });
    kontrol('servis bağlı değilken rapor komutu açıklama döndürüyor',
      typeof (await servissiz({ gonderen: '905551112233', metin: 'rapor gönder' })) === 'string');

    kontrol('tek numara düzeltme aynı kurala uyuyor',
      komut.numaraDuzelt('0538 817 94 95') === '905388179495'
      && komut.numaraDuzelt('') === '');
  }

  console.log('\nKesinti tablosu');
  {
    const ExcelJS = require('exceljs');
    const tablo = require('../src/main/tablo/kesintiTablosu');

    kontrol('sayı çözümü Türkçe biçimleri anlıyor',
      tablo.sayi('0,321') === 0.321 && tablo.sayi('1.250') === 1250
      && tablo.sayi('1.506,115') === 1506.115 && tablo.sayi(10.4) === 10.4
      && tablo.sayi('') === null && tablo.sayi('abc') === null,
      [tablo.sayi('0,321'), tablo.sayi('1.250'), tablo.sayi('1.506,115')].join(' | '));
    kontrol('yazım farkları aynı anahtara iniyor',
      tablo.duz('Dagitim Transformatörü') === tablo.duz('Dağıtım Transformatörü')
      && tablo.duz('AG ABONE KABLOSU') === tablo.duz('ag abone kablosu'));

    const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'kesinti-tablo-'));
    const anaYol = path.join(klasor, 'liste.xlsx');
    const detayYol = path.join(klasor, 'detay.xlsx');

    const yazDosya = async (yol, sayfaAdi, basliklar, satirlar) => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(sayfaAdi);
      ws.addRow(basliklar);
      for (const s of satirlar) ws.addRow(s);
      await wb.xlsx.writeFile(yol);
    };

    await yazDosya(anaYol, 'AnaListe', [
      'KESİNTİNİN KODU (1)', 'KADEME (2)', 'İL (3A)', 'İLÇE (3B)',
      'KESİNTİ NEDENİNE İLİŞKİN AÇIKLAMA (4)', 'KESİNTİ SÜRESİ (SAAT) (8)=(7)-(6)',
    ], [
      [5001, 1, 'BURSA', 'KESTEL', 'OG HAT BAKIM', 10.4],
      [5002, 1, 'BURSA', 'GÜRSU', 'AG ABONE KABLOSU', '0,5'],
      [5003, 1, 'YALOVA', 'MERKEZ', 'KUŞ ÇARPMASI', 6],
      [5004, 1, 'BURSA', 'NİLÜFER', 'SCADA-MANEVRA', '2,5'],
    ]);

    await yazDosya(detayYol, 'Detay', [
      'KOD NO (1)', 'KADEME (2)', 'İL (3A)', 'İLÇE (3B)', 'KAYNAK TÜRÜ',
      'KESİNTİ NEDENİNE İLİŞKİN AÇIKLAMA (4)', 'TOPLAM ABONE', 'TABLET AÇIKLAMA',
    ], [
      [5001, 1, 'BURSA', 'KESTEL', 'KÖK', 'OG HAT BAKIM', 1500, 'not-1'],
      [5001, 1, 'YALOVA', 'MERKEZ', 'KÖK', 'OG HAT BAKIM', 200, 'not-1b'],
      [5002, 1, 'BURSA', 'GÜRSU', 'Dagitim Transformatörü', 'AG ABONE KABLOSU', '1.250', 'kablo notu'],
      [5003, 1, 'YALOVA', 'MERKEZ', 'KÖK', 'KUŞ ÇARPMASI', 1000, ''],
      [5004, 1, 'BURSA', 'NİLÜFER', 'Dagitim Merkezi', 'SCADA-MANEVRA', 40, 'osos notu'],
      [5005, 1, 'BURSA', 'İNEGÖL', 'Dağıtım Transformatörü', 'AG ABONE KABLOSU', 10, ''],
    ]);

    const sonuc = await tablo.olustur({
      anaDosya: anaYol, detayDosya: detayYol,
      hedefKlasor: klasor, tarihMetni: '16.08.2026',
    });

    kontrol('çıktı dosyası tarihli adla yazıldı',
      sonuc.ad === '16.08.2026 Tarihinde Gerçekleşmiş Olan Kesinti Detayları.xlsx'
      && fs.existsSync(sonuc.dosya), sonuc.ad);
    kontrol('özet sayıları doğru',
      sonuc.ozet.toplam === 4 && sonuc.ozet.altiSaat === 2 && sonuc.ozet.binAbone === 3
      && sonuc.ozet.ikiIlce === 1 && sonuc.ozet.rekortman === 2,
      JSON.stringify(sonuc.ozet));

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(sonuc.dosya);
    const adlar = wb.worksheets.map((w) => w.name);
    kontrol('sayfalar doğru sırada',
      adlar.join('|') === 'AnaListe|6 Saat ve Üzeri Kesintiler|2 ve Üzeri Etkilenen İlçeler'
      + '|Rekortman|1000 ve Üzeri Etkilenen Abone|ARIZA DETAY', adlar.join('|'));

    const oku = (ad) => {
      const ws = wb.getWorksheet(ad);
      const satirlar = [];
      ws.eachRow((row, r) => {
        if (r === 1) return;
        satirlar.push([1, 2, 3, 4, 5, 6, 7, 8].map((c) => row.getCell(c).value));
      });
      return { ws, satirlar };
    };

    const ana = oku('AnaListe');
    const anaBaslik = [1, 2, 3, 4, 5, 6, 7, 8].map((c) => ana.ws.getRow(1).getCell(c).value);
    kontrol('ana listeye abone ve tablet sütunları eklendi',
      anaBaslik[6] === 'TOPLAM ABONE' && anaBaslik[7] === 'TABLET AÇIKLAMASI',
      anaBaslik.join(' | '));
    kontrol('abone ve tablet detaydan koda göre çekildi',
      ana.satirlar.length === 4
      && ana.satirlar[0][6] === 1500 && ana.satirlar[0][7] === 'not-1'
      && ana.satirlar[1][6] === 1250 && ana.satirlar[1][7] === 'kablo notu'
      && ana.satirlar[2][6] === 1000 && ana.satirlar[3][6] === 40,
      ana.satirlar.map((s) => `${s[0]}:${s[6]}`).join(' '));

    const alti = oku('6 Saat ve Üzeri Kesintiler');
    kontrol('6 saat ve üzeri sayfası sınırı dahil süzüyor',
      alti.satirlar.map((s) => s[0]).join(',') === '5001,5003',
      alti.satirlar.map((s) => s[0]).join(','));

    const bin = oku('1000 ve Üzeri Etkilenen Abone');
    kontrol('1000 ve üzeri abone sayfası sınırı dahil süzüyor',
      bin.satirlar.map((s) => s[0]).join(',') === '5001,5002,5003',
      bin.satirlar.map((s) => s[0]).join(','));

    const iki = oku('2 ve Üzeri Etkilenen İlçeler');
    kontrol('iki ve üzeri ilçe sayfası aynı kodun tüm satırlarını alıyor',
      iki.satirlar.length === 2 && iki.satirlar.every((s) => s[0] === 5001)
      && iki.satirlar[0][3] === 'KESTEL' && iki.satirlar[1][3] === 'MERKEZ',
      iki.satirlar.map((s) => `${s[0]}:${s[3]}`).join(' '));
    const vurgulu = iki.ws.getRow(2).getCell(1);
    kontrol('yinelenen kod hücresi kırmızı vurgulu',
      !!(vurgulu.fill && vurgulu.fill.fgColor && vurgulu.fill.fgColor.argb === 'FFFFC7CE'),
      JSON.stringify(vurgulu.fill || null));

    const rek = oku('Rekortman');
    kontrol('rekortman süzgeci yazım farkına rağmen çalışıyor',
      rek.satirlar.map((s) => s[0]).join(',') === '5002,5005',
      rek.satirlar.map((s) => s[0]).join(','));

    const ariza = oku('ARIZA DETAY');
    kontrol('arıza detay aboneye göre azalan sıralı',
      ariza.satirlar.map((s) => s[0]).join(',') === '5001,5002,5003,5004',
      ariza.satirlar.map((s) => `${s[0]}:${s[6]}`).join(' '));

    const dolu = ana.ws.getRow(1);
    kontrol('başlık satırı kalın ve süzgeçli',
      dolu.getCell(1).font && dolu.getCell(1).font.bold === true && !!ana.ws.autoFilter);

    fs.rmSync(klasor, { recursive: true, force: true });
  }

  console.log('\nPortal hesapları ve ayarları');
  {
    const portalAyar = require('../src/main/portal/ayar');
    const portal = require('../src/main/portal/portal');
    const kasa = require('../src/main/portal/kasa');

    const v = portalAyar.oku(db);
    kontrol('portal ayarları varsayılanla geliyor',
      v.saat === '01:00' && v.gunGeri === 1 && v.gorunur === true && v.girisUrl === ''
      && v.sayfaSn === 180,
      JSON.stringify(v));
    kontrol('sayfa beklemesi alt sınırın altına inmiyor',
      portalAyar.yaz(db, { sayfaSn: 3 }).sayfaSn === 15
      && portalAyar.yaz(db, { sayfaSn: 240 }).sayfaSn === 240
      && portalAyar.yaz(db, { sayfaSn: '' }).sayfaSn === 180);
    kontrol('eksik ayar bildiriliyor', portalAyar.dogrula(v).length === 2);
    kontrol('tablo ayarı eksikleri ayrıca bildiriliyor',
      portalAyar.dogrulaTablo(v).length === 3
      && portalAyar.dogrulaTablo({ girisUrl: 'x', tabloRapor1: 'A', tabloRapor2: 'B' }).length === 0,
      portalAyar.dogrulaTablo(v).join(', '));

    const y = portalAyar.yaz(db, {
      girisUrl: 'https://ornek.test/Login.aspx', raporAdi: 'Bir Rapor',
      saat: '02:00', gunGeri: 3, gorunur: false,
    });
    kontrol('ayarlar kaydedilip geri okunuyor',
      y.girisUrl === 'https://ornek.test/Login.aspx' && y.raporAdi === 'Bir Rapor'
      && y.saat === '02:00' && y.gunGeri === 3 && y.gorunur === false, JSON.stringify(y));
    kontrol('ana sayfa adresi giriş adresinden türetiliyor',
      y.anaUrl === 'https://ornek.test/default.aspx', y.anaUrl);
    kontrol('kaydedilmemiş ayar bozulmuyor',
      portalAyar.oku(db).altMenuXpath.endsWith('/li[6]/ul/li[1]/a'),
      portalAyar.oku(db).altMenuXpath);
    kontrol('ayarlar eksiksizken uyarı yok', portalAyar.dogrula(y).length === 0);

    for (const eski of portalAyar.ESKIYEN.menuXpath) {
      db.ortakAyarYaz('portalMenuXpath', eski);
      kontrol(`eskiyen menü yolu yeni varsayılana dönüyor (${eski.slice(0, 22)}…)`,
        portalAyar.oku(db).menuXpath === '//*[@id="leftsidenav"]/li[6]',
        portalAyar.oku(db).menuXpath);
    }
    for (const eski of portalAyar.ESKIYEN.altMenuXpath) {
      db.ortakAyarYaz('portalAltMenuXpath', eski);
      kontrol(`eskiyen alt menü yolu yeni varsayılana dönüyor (${eski.slice(0, 22)}…)`,
        portalAyar.oku(db).altMenuXpath === '//*[@id="leftsidenav"]/li[6]/ul/li[1]/a',
        portalAyar.oku(db).altMenuXpath);
    }
    db.ortakAyarYaz('portalAltMenuXpath', '');
    db.ortakAyarYaz('portalMenuXpath', '//özel/yol');
    kontrol('kullanıcının yazdığı menü yolu korunuyor',
      portalAyar.oku(db).menuXpath === '//özel/yol');
    db.ortakAyarYaz('portalMenuXpath', '');

    kontrol('portal ayarları eşitlenen tabloda duruyor',
      db.raw.get("SELECT COUNT(*) AS n FROM ortak_ayar WHERE anahtar LIKE 'portal%'").n > 0);

    const s = kasa.sifrele('gizli-123');
    kontrol('şifre kasadan geçip aynı dönüyor', kasa.coz(s.deger, s.sifreli) === 'gizli-123');
    kontrol('boş şifre boş kalıyor', kasa.sifrele('').deger === '');

    kasa.kur(() => Buffer.alloc(32, 7));
    const o = kasa.sifrele('ortak-gizli');
    kontrol('ortak anahtar varken o şema kullanılıyor', o.sifreli === kasa.ORTAK);
    kontrol('ortak anahtarla şifrelenen çözülüyor', kasa.coz(o.deger, o.sifreli) === 'ortak-gizli');
    kontrol('şifrelenmiş metin düz görünmüyor', !o.deger.includes('ortak-gizli'));
    kasa.kur(() => Buffer.alloc(32, 9));
    let yanlisAnahtarHatasi = false;
    try { kasa.coz(o.deger, o.sifreli); } catch { yanlisAnahtarHatasi = true; }
    kontrol('yanlış anahtarla çözülemiyor', yanlisAnahtarHatasi);
    kasa.kur(() => null);
    let anahtarsizHata = false;
    try { kasa.coz(o.deger, kasa.ORTAK); } catch { anahtarsizHata = true; }
    kontrol('anahtar yokken anlaşılır hata veriyor', anahtarsizHata);
    kontrol('yerel şema ortak sayılmıyor',
      kasa.paylasilirMi(kasa.ORTAK) && !kasa.paylasilirMi(kasa.YEREL));

    db.portalHesapYaz({
      numara: '905551112233', ad: 'Deneme', kullanici: 'kadi',
      sifre: s.deger, sifreli: s.sifreli, aktif: true,
    });
    let hepsi = db.portalHesaplar();
    kontrol('hesap kaydedildi, şifre listeye sızmıyor',
      hepsi.length === 1 && hepsi[0].sifreVar === 1 && hepsi[0].sifre === undefined,
      JSON.stringify(hepsi[0]));

    const kayit = db.portalHesap('905551112233');
    kontrol('kayıtlı şifre geri çözülüyor', kasa.coz(kayit.sifre, kayit.sifreli) === 'gizli-123');

    db.portalHesapYaz({ id: kayit.id, numara: '905551112233', ad: 'Deneme 2', kullanici: 'kadi2', aktif: true });
    const guncel = db.portalHesap('905551112233');
    kontrol('şifre gönderilmeyince eski şifre korunuyor',
      guncel.kullanici === 'kadi2' && kasa.coz(guncel.sifre, guncel.sifreli) === 'gizli-123');

    db.portalHesapYaz({ numara: '905551112233', ad: 'Çakışma', kullanici: 'k3', aktif: false });
    kontrol('aynı numara ikinci kez eklenmiyor, güncelleniyor',
      db.portalHesaplar().length === 1 && db.portalHesap('905551112233').aktif === 0);

    db.portalHesapSil(db.portalHesap('905551112233').id);
    kontrol('hesap silinebiliyor', db.portalHesaplar().length === 0);

    {
      const oncekiYol = db.yol();
      const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'goc-'));
      const eskiVt = path.join(gecici, 'eski.sqlite');
      db.ac(eskiVt);
      db.raw.run('DELETE FROM ortak_ayar');
      db.ayarYaz('portalGirisUrl', 'https://eski.test/Login.aspx');
      db.ayarYaz('portalRaporAdi', 'Eski Rapor');
      db.ayarYaz('waIzinliNumaralar', '905551112233');
      db.ayarYaz('ilkKurulum', 'dokunma');
      db.kapat();

      db.ac(eskiVt);
      const g = portalAyar.oku(db);
      kontrol('yükseltmede eski portal ayarları taşınıyor',
        g.girisUrl === 'https://eski.test/Login.aspx' && g.raporAdi === 'Eski Rapor',
        JSON.stringify(g));
      kontrol('yükseltmede izinli numaralar taşınıyor',
        db.ortakAyarOku('waIzinliNumaralar') === '905551112233');
      kontrol('taşınan ayar eski tablodan siliniyor',
        db.ayarOku('portalGirisUrl') === null);
      kontrol('program ayarlarına dokunulmuyor', db.ayarOku('ilkKurulum') === 'dokunma');
      db.kapat();
      fs.rmSync(gecici, { recursive: true, force: true });
      if (oncekiYol) db.ac(oncekiYol);
    }

    const a = portal.tarihAraligi(1, new Date(2026, 0, 1));
    kontrol('tarih aralığı bir gün geriden başlıyor',
      a.bas.metin === '31.12.2025' && a.son.metin === '01.01.2026',
      `${a.bas.metin} → ${a.son.metin}`);
    const a0 = portal.tarihAraligi(0, new Date(2026, 7, 14));
    kontrol('sıfır gün geri aynı günü veriyor',
      a0.bas.metin === '14.08.2026' && a0.son.metin === '14.08.2026');

    kontrol('kayıtlardaki şifre gizleniyor',
      portal.gizle('<input value="gizli-123">', ['gizli-123']) === '<input value="***">');
    kontrol('kısa değerler gizleme diye her şeyi silmiyor',
      portal.gizle('abcdef', ['ab']) === 'abcdef');
    kontrol('dosya adı güvenli hale geliyor',
      portal.dosyaAdiTemiz('Rapor / Giriş: 2026?') === 'Rapor-Giriş-2026');

    kontrol('kuyruk bekleme ayarları varsayılanla geliyor',
      portalAyar.oku(db).yenilemeSn === 120 && portalAyar.oku(db).beklemeDk === 60,
      `${portalAyar.oku(db).yenilemeSn} sn / ${portalAyar.oku(db).beklemeDk} dk`);
    const bekAyar = portalAyar.yaz(db, { yenilemeSn: 90, beklemeDk: 30 });
    kontrol('kuyruk bekleme ayarları kaydediliyor',
      bekAyar.yenilemeSn === 90 && bekAyar.beklemeDk === 30,
      JSON.stringify({ y: bekAyar.yenilemeSn, b: bekAyar.beklemeDk }));
    const kisaAyar = portalAyar.yaz(db, { yenilemeSn: 1, beklemeDk: 0 });
    kontrol('çok kısa yenileme alt sınıra çekiliyor',
      kisaAyar.yenilemeSn === 5 && kisaAyar.beklemeDk === 1,
      JSON.stringify({ y: kisaAyar.yenilemeSn, b: kisaAyar.beklemeDk }));
    portalAyar.yaz(db, { yenilemeSn: '', beklemeDk: '' });
    kontrol('ayar boşaltılınca 2 dakikaya dönüyor',
      portalAyar.oku(db).yenilemeSn === 120 && portalAyar.oku(db).beklemeDk === 60);
  }

  console.log('\nPortal kuyruğu (sayfa içi kod)');
  {
    const portal = require('../src/main/portal/portal');
    const S = portal.KUYRUK_SECICI;
    const HAZIR = portal.ALAN.indir;
    const BEKLEYEN = HAZIR.replace('ctl04', 'ctl06');

    let sayfa = sahteSayfa(portal.YARDIM, [
      { id: HAZIR, kapali: true, satir: 'Günlük Rapor Hazırlanıyor' },
    ]);
    let k = sayfa.rd.kuyruk(HAZIR, S);
    kontrol('rapor hazırlanırken indirme düğmesi hazır sayılmıyor',
      k.hazir === false && k.sayi === 1 && k.satir.includes('Hazırlanıyor'), JSON.stringify(k));

    sayfa = sahteSayfa(portal.YARDIM, [
      { id: HAZIR, satir: 'Günlük Rapor Tamamlandı' },
    ]);
    k = sayfa.rd.kuyruk(HAZIR, S);
    kontrol('rapor bitince hazır görünüyor',
      k.hazir === true && k.id === HAZIR && k.kendi === true, JSON.stringify(k));

    sayfa = sahteSayfa(portal.YARDIM, [{ id: BEKLEYEN, satir: 'Başka satır' }]);
    k = sayfa.rd.kuyruk(HAZIR, S);
    kontrol('beklenen satır yoksa kuyruktaki ilk düğmeye düşülüyor',
      k.hazir === true && k.id === BEKLEYEN && k.kendi === false, JSON.stringify(k));

    sayfa = sahteSayfa(portal.YARDIM, []);
    k = sayfa.rd.kuyruk(HAZIR, S);
    kontrol('kuyruk boşken hazır denmiyor',
      k.hazir === false && k.sayi === 0 && k.id === null, JSON.stringify(k));

    sayfa = sahteSayfa(portal.YARDIM, [{ id: portal.ALAN.kaydet }]);
    kontrol('düğmeye tıklanınca tıklandığı bildiriliyor',
      sayfa.rd.dugme(portal.ALAN.kaydet) === 'tik' && sayfa.tiklananlar[0] === portal.ALAN.kaydet,
      sayfa.tiklananlar.join(', '));

    sayfa = sahteSayfa(portal.YARDIM, [{ id: portal.ALAN.kaydet, kapali: true }]);
    kontrol('pasif düğme tıklanmıyor, pasif diye bildiriliyor',
      sayfa.rd.dugme(portal.ALAN.kaydet) === 'pasif' && sayfa.tiklananlar.length === 0);

    sayfa = sahteSayfa(portal.YARDIM, []);
    kontrol('olmayan düğme sessizce başarısız oluyor', sayfa.rd.dugme('yokBoyleBirSey') === null);
    kontrol('sayfa kodu tarayıcıyı kilitleyen kutuları devre dışı bırakıyor',
      sayfa.pencere.confirm() === true && sayfa.pencere.alert() === undefined);
  }

  console.log('\nPortal menüsü (sayfa içi kod)');
  {
    const portal = require('../src/main/portal/portal');
    const YOL = '//*[@id="leftsidenav"]/li[6]';
    const ALT_YOL = `${YOL}/ul/li[1]/a`;
    const MENU = (yerler) => ({
      ogeler: yerler.map((y) => (y === 'RAPORLAR'
        ? { yazi: 'RAPORLAR', altlar: ['Rapor Kuyruğu', 'Raporlar'] }
        : { yazi: y })),
    });
    const ALTI = ['Ana Sayfa', 'Abone', 'Sayaç', 'Arıza', 'Tanımlar', 'RAPORLAR'];

    let sayfa = sahteSayfa(portal.YARDIM, [], MENU(ALTI));
    let m = sayfa.rd.menuAc(YOL);
    kontrol('menü adına göre bulunuyor',
      m.yol === 'metin' && m.metin === 'RAPORLAR', JSON.stringify(m));
    let a = sayfa.rd.altMenuAc(ALT_YOL, YOL);
    kontrol('alt menüde ilk bağlantı değil, adı Raporlar olan seçiliyor',
      a.yol === 'metin' && a.metin === 'Raporlar', JSON.stringify(a));
    kontrol('önce menüye sonra alt menüye tıklanıyor',
      sayfa.tiklananlar.join(' | ') === 'RAPORLAR Rapor Kuyruğu Raporlar | Raporlar',
      sayfa.tiklananlar.join(' | '));

    sayfa = sahteSayfa(portal.YARDIM, [], MENU(['Abone', 'RAPORLAR', 'Tanımlar']));
    m = sayfa.rd.menuAc(YOL);
    kontrol('menü sırası değişince de doğru menü bulunuyor',
      m.yol === 'metin' && m.metin === 'RAPORLAR', JSON.stringify(m));

    sayfa = sahteSayfa(portal.YARDIM, [], {
      ogeler: [{ yazi: 'Abone' }, { yazi: 'Tanımlar', altlar: ['Kullanıcılar'] }],
    });
    const digerLi = sayfa.kok.children[1];
    sayfa.yollar[YOL] = digerLi;
    m = sayfa.rd.menuAc(YOL);
    kontrol('rapor menüsü yoksa ayardaki yola düşülüyor',
      m && m.yol === 'xpath' && m.metin === 'Tanımlar', JSON.stringify(m));
    a = sayfa.rd.altMenuAc(ALT_YOL, YOL);
    kontrol('ayardaki yolla açılan menünün alt bağlantısı tıklanıyor',
      a && a.yol === 'ilk' && a.metin === 'Kullanıcılar', JSON.stringify(a));

    sayfa = sahteSayfa(portal.YARDIM, [], {
      ogeler: [{ yazi: 'Abone' }, { yazi: 'Tanımlar', altlar: ['Kullanıcılar'] }],
    });
    kontrol('rapor menüsü de ayar yolu da yoksa uydurmuyor',
      sayfa.rd.menuAc(YOL) === null);
    kontrol('menüdekiler hata iletisi için listeleniyor',
      sayfa.rd.menuOgeleri().join(' · ') === '1) Abone · 2) Tanımlar Kullanıcılar',
      sayfa.rd.menuOgeleri().join(' · '));

    sayfa = sahteSayfa(portal.YARDIM, [], {
      ogeler: [{ yazi: 'Rapor Kuyruğu', altlar: ['Kuyruk'] }, { yazi: 'Abone' }],
    });
    m = sayfa.rd.menuAc(YOL);
    kontrol('tam eşleşme yoksa Rapor ile başlayan menü kullanılıyor',
      m && m.yol === 'metin' && m.metin === 'Rapor Kuyruğu', JSON.stringify(m));
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

    kontrol('belge türü uzantıdan seçiliyor',
      wa.dosyaTuru('Kesintiler.xlsx').endsWith('spreadsheetml.sheet')
      && wa.dosyaTuru('Kesintiler.xls') === 'application/vnd.ms-excel'
      && wa.dosyaTuru('Kesintiler.csv') === 'text/csv',
      [wa.dosyaTuru('a.xls'), wa.dosyaTuru('a.csv')].join(' | '));
    kontrol('bilinmeyen uzantı Excel sayılıyor',
      wa.dosyaTuru('rapor') === wa.dosyaTuru('rapor.xlsx'));

    const metin = (message) => wa.mesajMetni({ message });
    kontrol('mesaj metni her biçimden okunuyor',
      metin({ conversation: 'hava durumu' }) === 'hava durumu'
      && metin({ extendedTextMessage: { text: 'hava durumu' } }) === 'hava durumu');
  }

  console.log('\nOrtak WhatsApp oturumu');
  {
    const sahiplik = require('../src/main/whatsapp/sahiplik');
    const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'oturum-'));

    kontrol('boş klasörde sahip yok',
      sahiplik.durum(klasor, 'A-PC').bos && sahiplik.alinabilirMi(klasor, 'A-PC'));

    sahiplik.al(klasor, 'A-PC');
    const aDurum = sahiplik.durum(klasor, 'A-PC');
    kontrol('sahiplik alınıyor ve kendini tanıyor',
      aDurum.sahip === 'A-PC' && aDurum.benMiyim && aDurum.taze);
    kontrol('başka bilgisayar taze sahipliği alamıyor',
      !sahiplik.alinabilirMi(klasor, 'B-PC'));
    const bDurum = sahiplik.durum(klasor, 'B-PC');
    kontrol('başka bilgisayar sahibi görüyor',
      bDurum.sahip === 'A-PC' && !bDurum.benMiyim && bDurum.taze);

    const eski = JSON.parse(fs.readFileSync(path.join(klasor, sahiplik.DOSYA), 'utf8'));
    fs.writeFileSync(path.join(klasor, sahiplik.DOSYA),
      JSON.stringify({ ...eski, zaman: Date.now() - sahiplik.TAZELIK - 1000 }));
    kontrol('ses çıkmayan sahiplik devralınabiliyor', sahiplik.alinabilirMi(klasor, 'B-PC'));

    sahiplik.al(klasor, 'B-PC');
    kontrol('devralınca sahip değişiyor', sahiplik.durum(klasor, 'B-PC').benMiyim);
    kontrol('sahibi olmayan bırakamıyor',
      sahiplik.birak(klasor, 'A-PC').sahip === 'B-PC');
    kontrol('sahibi bırakınca sıra boşalıyor',
      sahiplik.birak(klasor, 'B-PC').bos && sahiplik.alinabilirMi(klasor, 'A-PC'));

    fs.writeFileSync(path.join(klasor, sahiplik.DOSYA), 'bozuk içerik');
    kontrol('bozuk sahip dosyası kilit yaratmıyor', sahiplik.alinabilirMi(klasor, 'A-PC'));

    fs.rmSync(klasor, { recursive: true, force: true });
  }

  console.log('\nOrtak klasör ayarları');
  {
    const ortak = require('../src/main/ortak');
    const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'ortak-'));
    ortak.kur(kok);

    kontrol('başlangıçta ortak klasör yok', ortak.ortakDosya() === null);

    const dosya = path.join(kok, 'paylasim', 'veri-ortak.sqlite');
    ortak.ortakAyarla(dosya);
    kontrol('ortak dosya kalıcı yazıldı', ortak.ortakDosya() === dosya);
    kontrol('yapılandırma dosyaya düştü',
      JSON.parse(fs.readFileSync(path.join(kok, 'yapilandirma.json'), 'utf8')).ortakDosya === dosya);

    kontrol('varsayılan aralık', ortak.aralikDk() === ortak.VARSAYILAN_ARALIK);
    ortak.aralikYaz(5);
    kontrol('aralık değiştirilebiliyor', ortak.aralikDk() === 5);
    let reddetti = false;
    try { ortak.aralikYaz(7); } catch { reddetti = true; }
    kontrol('geçersiz aralık reddediliyor', reddetti && ortak.aralikDk() === 5);

    fs.mkdirSync(path.dirname(dosya), { recursive: true });
    ortak.varlikBildir(dosya, '9.9.9');
    const k = ortak.kimler(dosya);
    kontrol('bu makine listede', k.length === 1 && k[0].benMiyim && k[0].surum === '9.9.9');

    const varlik = path.join(path.dirname(dosya), 'kim.json');
    const liste = JSON.parse(fs.readFileSync(varlik, 'utf8'));
    liste.push({ makine: 'DIGER-PC', surum: '1.0.0', zaman: Date.now() - 60000 });
    fs.writeFileSync(varlik, JSON.stringify(liste));
    ortak.varlikBildir(dosya, '9.9.9');
    kontrol('kendini bildirmek başkasını silmiyor',
      ortak.kimler(dosya).map((x) => x.makine).includes('DIGER-PC'));

    ortak.ortakKaldir();
    kontrol('bağlantı kaldırılabiliyor', ortak.ortakDosya() === null);
    fs.rmSync(kok, { recursive: true, force: true });
  }

  console.log('\nEşitleme');
  {
    const { esitle } = require('../src/main/senkron/senkron');
    const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'senk-'));
    const oncekiYol = db.yol();

    const A = path.join(kok, 'a.sqlite');
    const B = path.join(kok, 'b.sqlite');
    const ORTAK = path.join(kok, 'ortak.sqlite');

    const kur = (yol) => {
      db.ac(yol);
      db.isletmeEkle('ALFA', 1);
      db.isletmeEkle('BETA', 2);
      db.kapat();
    };
    kur(A);
    kur(B);

    const ac = (y) => db.baglantiAc(y);
    const kat = () => {
      const c = ac(A);
      const k = c.db.get('SELECT kod FROM kategori ORDER BY sira LIMIT 1').kod;
      c.kapat();
      return k;
    };
    const kod = kat();

    const isaretle = (yol, isletme, tarih, zaman) => {
      const c = ac(yol);
      const i = c.db.get('SELECT id FROM isletme WHERE ad = :a', { ':a': isletme }).id;
      const kt = c.db.get('SELECT id FROM kategori WHERE kod = :k', { ':k': kod }).id;
      c.db.run(
        `INSERT INTO kayit (tarih, isletme_id, kategori_id, ariza_var, guncelleme)
         VALUES (:t, :i, :k, 1, :g)
         ON CONFLICT(tarih, isletme_id, kategori_id) DO UPDATE SET
           ariza_var = excluded.ariza_var, guncelleme = excluded.guncelleme`,
        { ':t': tarih, ':i': i, ':k': kt, ':g': zaman }
      );
      c.kapat();
    };
    const oku = (yol, tarih, isletme) => {
      const c = ac(yol);
      const r = c.db.get(
        `SELECT k.ariza_var FROM kayit k
         JOIN isletme i ON i.id = k.isletme_id
         JOIN kategori kt ON kt.id = k.kategori_id
         WHERE k.tarih = :t AND i.ad = :a AND kt.kod = :k`,
        { ':t': tarih, ':a': isletme, ':k': kod }
      );
      c.kapat();
      return r ? r.ariza_var : null;
    };
    const esitleyi = (yol) => {
      const y = ac(yol);
      const o = ac(ORTAK);
      const s = esitle(y.db, o.db);
      y.kapat();
      o.kapat();
      return s;
    };

    isaretle(A, 'ALFA', '2026-09-01', '2026-08-01 08:00:00');
    isaretle(B, 'BETA', '2026-09-02', '2026-08-01 08:05:00');

    esitleyi(A);
    esitleyi(B);
    esitleyi(A);

    kontrol('A kendi kaydını koruyor', oku(A, '2026-09-01', 'ALFA') === 1);
    kontrol('A, B nin kaydını aldı', oku(A, '2026-09-02', 'BETA') === 1);
    kontrol('B, A nın kaydını aldı', oku(B, '2026-09-01', 'ALFA') === 1);

    const bos = esitleyi(A);
    kontrol('tekrar eşitleme boş — yankı yok',
      bos.gonderilen === 0 && bos.alinan === 0
      && bos.yerelSilinen === 0 && bos.ortakSilinen === 0, JSON.stringify(bos));

    isaretle(A, 'ALFA', '2026-09-03', '2026-08-03 10:00:00');
    isaretle(B, 'ALFA', '2026-09-03', '2026-08-03 09:00:00');
    {
      const c = ac(B);
      const i = c.db.get("SELECT id FROM isletme WHERE ad = 'ALFA'").id;
      const kt = c.db.get('SELECT id FROM kategori WHERE kod = :k', { ':k': kod }).id;
      c.db.run(`UPDATE kayit SET ariza_var = 0, guncelleme = '2026-08-03 09:00:00'
                WHERE tarih = '2026-09-03' AND isletme_id = :i AND kategori_id = :k`,
      { ':i': i, ':k': kt });
      c.kapat();
    }
    esitleyi(A);
    esitleyi(B);
    kontrol('çakışmada sonraki değişiklik kazanıyor',
      oku(B, '2026-09-03', 'ALFA') === 1, 'B nin eski değeri A nın yenisiyle değişmeli');

    db.ac(A);
    db.gunSil('2026-09-01');
    const mezar = db.raw.get("SELECT COUNT(*) c FROM silinen WHERE tur = 'kayit'").c;
    db.kapat();
    kontrol('silme mezar kaydı bırakıyor', mezar > 0, `${mezar} kayıt`);

    esitleyi(A);
    esitleyi(B);
    kontrol('silme diğer makineye geçiyor', oku(B, '2026-09-01', 'ALFA') === null);

    esitleyi(A);
    kontrol('silinen kayıt geri gelmiyor', oku(A, '2026-09-01', 'ALFA') === null);

    const bos2 = esitleyi(B);
    kontrol('silmeden sonra da kararlı',
      bos2.gonderilen === 0 && bos2.alinan === 0
      && bos2.yerelSilinen === 0 && bos2.ortakSilinen === 0, JSON.stringify(bos2));

    const damgala = (zaman) => {
      db.raw.run('UPDATE ortak_ayar SET guncelleme = :z', { ':z': zaman });
      db.raw.run('UPDATE portal_hesap SET guncelleme = :z', { ':z': zaman });
    };

    db.ac(A);
    db.ortakAyarYaz('portalRaporAdi', 'A Raporu');
    db.ortakAyarYaz('waIzinliNumaralar', '905551112233');
    db.portalHesapYaz({
      numara: '905551112233', ad: 'A Kişi', kullanici: 'a-kullanici',
      sifre: 'ŞIFRELI-METIN', sifreli: 2, aktif: true,
    });
    damgala('2026-08-01 08:00:00');
    db.kapat();
    esitleyi(A);
    esitleyi(B);

    db.ac(B);
    const gelenAyar = db.ortakAyarOku('portalRaporAdi');
    const gelenIzin = db.ortakAyarOku('waIzinliNumaralar');
    const gelenHesap = db.portalHesap('905551112233');
    db.kapat();
    kontrol('portal ayarı diğer bilgisayara geçti', gelenAyar === 'A Raporu', String(gelenAyar));
    kontrol('izinli numaralar diğer bilgisayara geçti', gelenIzin === '905551112233');
    kontrol('portal numarası kullanıcı adıyla birlikte geçti',
      !!gelenHesap && gelenHesap.kullanici === 'a-kullanici' && gelenHesap.aktif === 1,
      JSON.stringify(gelenHesap));
    kontrol('şifre şifreli hâliyle taşındı',
      !!gelenHesap && gelenHesap.sifre === 'ŞIFRELI-METIN' && gelenHesap.sifreli === 2);

    db.ac(B);
    db.ortakAyarYaz('portalRaporAdi', 'B Raporu');
    db.raw.run("UPDATE ortak_ayar SET guncelleme = '2026-08-01 09:00:00'"
      + " WHERE anahtar = 'portalRaporAdi'");
    db.kapat();
    esitleyi(B);
    esitleyi(A);
    db.ac(A);
    const sonAyar = db.ortakAyarOku('portalRaporAdi');
    db.kapat();
    kontrol('ayarda da son yazan kazanıyor', sonAyar === 'B Raporu', String(sonAyar));

    db.ac(A);
    db.portalHesapSil(db.portalHesap('905551112233').id);
    db.kapat();
    esitleyi(A);
    esitleyi(B);
    db.ac(B);
    const silindi = db.portalHesap('905551112233');
    db.kapat();
    kontrol('portal numarası silinince diğerinden de siliniyor', !silindi);

    db.kapat();
    if (oncekiYol) db.ac(oncekiYol);
    fs.rmSync(kok, { recursive: true, force: true });
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
