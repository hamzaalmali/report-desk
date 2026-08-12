// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const db = require('../src/main/db/db');
const { genisTabloOku } = require('../src/main/import/genisTablo');
const { gecmisiAktar } = require('../src/main/import/gecmisAktar');
const { gunlukAktar, raporBul } = require('../src/main/import/gunlukAktar');
const { aylikDisaAktar } = require('../src/main/export/excelDisaAktar');

const KOK = process.argv[3] || path.join(__dirname, '..', '..');

async function genisTabloBul() {
  if (process.argv[2]) return process.argv[2];
  let adaylar = [];
  try {
    adaylar = fs.readdirSync(KOK)
      .filter((f) => /\.xlsx$/i.test(f) && !f.startsWith('~$'))
      .map((f) => path.join(KOK, f));
  } catch { return null; }
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
    console.log('\n! Geniş tablo düzeninde .xlsx bulunamadı — Excel testleri atlandı.');
    return bitir();
  }
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

  console.log('\nGünlük rapor aktarımı');
  const gunlukDosyalar = fs.readdirSync(KOK)
    .filter((f) => /^\d{2}\.\d{2}\.\d{4}.*\.xlsx?$/i.test(f))
    .map((f) => path.join(KOK, f));
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

  console.log('\nSayfa adı tanıma');
  kontrol('OSOS sayfaları ek/eksik kelimeyle de tanınır',
    (raporBul('BİNA TİPİ OSOS KONTROL') || {}).kategori === 'BINA_TIPI_OSOS'
    && (raporBul('OSOS BAĞLANTI İHBAR İNCELEME') || {}).kategori === 'OSOS_BAGLANTI');
  kontrol('rapor olmayan sayfalar tanınmaz',
    ['Rekortmen', '1000 Abone ve Üzeri', '6 Saat ve Üzeri'].every((s) => raporBul(s) === null));

  console.log('\nElle girilenler aktarımda korunuyor');
  if (gunlukDosyalar.length) {
    const t = (await gunlukAktar(gunlukDosyalar)).gunler[0].tarih;
    const kat = db.kategoriHaritasi();
    const isl = db.isletmeler();
    const oku = (kod, id, alan) => {
      const s = db.gunVerisi(t).satirlar.find((x) => x.kategori_kod === kod && x.isletme_id === id);
      return s ? s[alan] : null;
    };
    db.hucreGuncelle({ tarih: t, isletme_id: isl[0].id, kategori_id: kat.get('IL_ILCE').id, alan: 'tutanak_gerekli', deger: 1 });
    db.hucreGuncelle({ tarih: t, isletme_id: isl[3].id, kategori_id: kat.get('BINA_TIPI_OSOS').id, alan: 'donus_saglandi', deger: 1 });
    db.hucreGuncelle({ tarih: t, isletme_id: isl[0].id, kategori_id: kat.get('SCADA_TM').id, alan: 'tutanak_gerekli', deger: 1 });

    await gunlukAktar(gunlukDosyalar);
    kontrol('İL-İLÇE elle işareti yeniden aktarımda silinmiyor',
      oku('IL_ILCE', isl[0].id, 'tutanak_gerekli') === 1);
    kontrol('otomatik kategorinin elle sütunu korunuyor',
      oku('BINA_TIPI_OSOS', isl[3].id, 'donus_saglandi') === 1);
    kontrol('raporu olmayan kategoriye dokunulmuyor',
      oku('SCADA_TM', isl[0].id, 'tutanak_gerekli') === 1);
    kontrol('otomatik işaret yine de yeniden yazılıyor',
      oku('BINA_TIPI_OSOS', isl[3].id, 'ariza_var') === 1);

    const osos = gunlukDosyalar.filter((d) => /osos/i.test(d));
    if (osos.length) {
      const kismi = (await gunlukAktar(osos)).gunler[0];
      kontrol('eksik kalan raporlar bildiriliyor',
        kismi.eksikRaporlar.length === 4
        && !kismi.eksikRaporlar.some((e) => e.kod.startsWith('OSOS') || e.kod === 'BINA_TIPI_OSOS'),
        kismi.eksikRaporlar.map((e) => e.kod).join(', '));
      kontrol('kısmi aktarım seçilmeyen kategorileri silmiyor',
        oku('DURUM_KODU', isl[3].id, 'ariza_var') !== null);
    }
  } else {
    console.log('  ! günlük rapor dosyası yok, atlandı.');
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
    const m = path.basename(gunlukDosyalar[0]).match(/(\d{2})\.(\d{2})\.(\d{4})/);
    const asilTarih = `${m[3]}-${m[2]}-${m[1]}`;
    kontrol('tarihler dosya adlarından doğru okundu',
      toplu.gunler.map((g) => g.tarih).sort().join(',') === `2020-01-01,${asilTarih}`,
      toplu.gunler.map((g) => g.tarih).join(','));
    kontrol('her gün kendi kayıtlarını aldı',
      toplu.gunler.every((g) => g.isaretToplam > 0),
      toplu.gunler.map((g) => `${g.tarih}:${g.isaretToplam}`).join(' '));
    kontrol('tarihsiz dosya yok', toplu.tarihsiz.length === 0);
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
