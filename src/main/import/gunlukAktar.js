// Hamza ALMALI

'use strict';

const path = require('node:path');
const ExcelJS = require('exceljs');
const db = require('../db/db');
const { key, enYakin } = require('../../shared/tr');
const { KOD_ILE } = require('../../shared/kategoriler');
const { hucreMetni, isoTarih } = require('./genisTablo');

const RAPORLAR = [
  {
    sayfa: 'ARIZADETAY', dosya: 'ARIZADETAY', kategori: 'ARIZA_DETAY', tip: 'standart',
    ilce: 'İLÇE', il: 'İL', mahalle: '', koy: '', mudurluk: '',
  },
  {
    sayfa: 'AYS_IhbarTakipRaporu', dosya: 'DURUMKODU', imza: ['DURUMKODUAÇIKLAMASI'],
    kategori: 'DURUM_KODU', tip: 'standart',
    ilce: 'İLÇE ADI', il: 'İL ADI', mahalle: 'MAHALLE ADI', koy: 'KÖY ADI', mudurluk: 'MÜDÜRLÜK',
  },
  {
    sayfa: 'BİNATİPİOSOS', dosya: 'BİNATİPİ', imza: ['TRAFOADI'],
    kategori: 'BINA_TIPI_OSOS', tip: 'standart',
    ilce: 'İLÇE ADI', il: 'İL ADI', mahalle: 'MAHALLE ADI', koy: 'KÖY ADI', mudurluk: 'MÜDÜRLÜK',
  },
  {
    sayfa: 'OSOSBAĞLANTIİHBARİNCELEMESİ', dosya: 'OSOSBAĞLANTI', imza: ['TSUİSBAĞLANMAORANI'],
    kategori: 'OSOS_BAGLANTI', tip: 'standart',
    ilce: 'İLÇE', il: 'İL', mahalle: '', koy: '', mudurluk: 'MÜDÜRLÜK',
  },
  {
    sayfaOnEk: 'TABLO1', dosya: 'BİLGİBELGE', imza: ['İSTENENBELGELER', 'TALEPEDİLEN'],
    kategori: 'BILGI_BELGE', tip: 'standart',
    ilce: 'İLÇE', il: 'İL', mahalle: '', koy: '', mudurluk: '',
  },
  { sayfa: 'İLİLÇE', dosya: 'İLİLÇE', kategori: 'IL_ILCE', tip: 'ililce' },
];

function raporBul(sayfaAdi) {
  const k = key(sayfaAdi);
  if (!k) return null;
  for (const r of RAPORLAR) {
    if (r.sayfa && key(r.sayfa) === k) return r;
    if (r.sayfaOnEk && k.startsWith(key(r.sayfaOnEk))) return r;
  }
  for (const r of RAPORLAR) {
    if (!r.sayfa) continue;
    const a = key(r.sayfa);
    if (k.startsWith(a)) return r;
    if (k.length >= 6 && a.startsWith(k)) return r;
  }
  return null;
}

function raporBulImza(basliklar) {
  const set = new Set(basliklar.filter(Boolean));
  for (const r of RAPORLAR) {
    if (r.imza && r.imza.some((i) => set.has(i))) return r;
  }
  return null;
}

function raporBulDosyaAdi(dosyaYolu) {
  const k = key(path.parse(dosyaYolu).name);
  if (!k) return null;
  for (const r of RAPORLAR) {
    if (r.dosya && k.includes(key(r.dosya))) return r;
  }
  return null;
}

function sayfalariEslestir(wb, dosya) {
  const eslesen = new Map();
  const bosta = [];

  for (const ws of wb.worksheets) {
    const r = raporBul(ws.name) || raporBulImza(satirlariOku(ws).basliklar);
    if (r) eslesen.set(ws, r);
    else bosta.push(ws);
  }

  if (bosta.length === 1) {
    const r = raporBulDosyaAdi(dosya);
    const zaten = [...eslesen.values()].some((x) => x.kategori === (r || {}).kategori);
    if (r && !zaten) eslesen.set(bosta.pop(), r);
  }

  return { eslesen, bosta };
}

function tarihiCikar(dosyaYolu) {
  const ad = path.basename(dosyaYolu);
  const m = ad.match(/(\d{2})[.\-/](\d{2})[.\-/](\d{4})/);
  if (!m) return null;
  const g = +m[1], ay = +m[2], y = +m[3];
  if (g < 1 || g > 31 || ay < 1 || ay > 12) return null;
  const d = new Date(Date.UTC(y, ay - 1, g));
  if (d.getUTCDate() !== g || d.getUTCMonth() !== ay - 1) return null;
  return isoTarih(d);
}

function baslikSutunu(basliklar, desen, haric = 0) {
  if (!desen || !desen.trim()) return 0;
  const d = key(desen);
  for (let c = 1; c < basliklar.length; c++) {
    if (c !== haric && basliklar[c] === d) return c;
  }
  for (let c = 1; c < basliklar.length; c++) {
    if (c !== haric && basliklar[c] && basliklar[c].startsWith(d)) return c;
  }
  for (let c = 1; c < basliklar.length; c++) {
    if (c !== haric && basliklar[c] && basliklar[c].includes(d)) return c;
  }
  return 0;
}

function eslesmeTablosu() {
  return db.eslesmeler().map((e) => ({
    anahtar: key(e.kaynak_deger),
    isletme: e.isletme,
    isletme_id: e.isletme_id,
    tip: e.tip,
  }));
}

function tamEslestir(tablo, deger) {
  if (!deger || !deger.trim()) return null;
  const k = key(deger);
  for (const t of tablo) if (t.tip === 'TAM' && t.anahtar === k) return t;
  return null;
}

function anahtarAra(tablo, metin) {
  if (!metin || !metin.trim()) return null;
  const k = key(metin);
  for (const t of tablo) {
    if (t.tip === 'İÇERİR' && t.anahtar && k.includes(t.anahtar)) return t;
  }
  return null;
}

function isletmeyeEslestir(tablo, { il, ilce, mahalle, koy, mudurluk, ekip }) {
  let t = anahtarAra(tablo, `${mahalle || ''} ${koy || ''}`);
  if (t) return t;

  t = tamEslestir(tablo, ilce);
  if (t) return t;

  if (!ilce || !ilce.trim() || key(ilce) === 'MERKEZ') {
    t = tamEslestir(tablo, il);
    if (t) return t;
  }

  t = tamEslestir(tablo, mudurluk);
  if (t) return t;

  return metindenEslestir(tablo, ekip);
}

function metindenEslestir(tablo, metin) {
  if (!metin || !metin.trim()) return null;
  const t = anahtarAra(tablo, metin);
  if (t) return t;

  const ara = key(metin);
  let enIyi = '', sonuc = null;
  for (const e of tablo) {
    if (e.anahtar.length > 3 && ara.includes(e.anahtar) && e.anahtar.length > enIyi.length) {
      enIyi = e.anahtar;
      sonuc = e;
    }
  }
  return sonuc;
}

function satirlariOku(ws) {
  const basliklar = [];
  const ilkSatir = ws.getRow(1);
  const sonSutun = ws.columnCount;
  for (let c = 1; c <= sonSutun; c++) basliklar[c] = key(hucreMetni(ilkSatir.getCell(c)));
  return { basliklar, sonSutun };
}

function bosSatir(ws, r, sonSutun) {
  const row = ws.getRow(r);
  for (let c = 1; c <= sonSutun; c++) {
    if (hucreMetni(row.getCell(c)) !== '') return false;
  }
  return true;
}

function sayfayiTara(ws, rapor, tablo, gunluk) {
  const { basliklar, sonSutun } = satirlariOku(ws);

  const cIlce = baslikSutunu(basliklar, rapor.ilce);
  const cIl = baslikSutunu(basliklar, rapor.il, cIlce);
  const cMah = baslikSutunu(basliklar, rapor.mahalle);
  const cKoy = baslikSutunu(basliklar, rapor.koy);
  const cMud = baslikSutunu(basliklar, rapor.mudurluk);
  const cEkip = baslikSutunu(basliklar, 'EKİP');

  if (!cIlce && !cIl && !cMud) {
    gunluk.uyarilar.push(`${ws.name}: il/ilçe sütunu bulunamadı, atlandı.`);
    return null;
  }

  const bulunan = new Set();
  const eslesmezDegerler = new Map();
  let kayit = 0, ekipten = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    if (bosSatir(ws, r, sonSutun)) continue;
    const row = ws.getRow(r);
    const al = (c) => (c ? hucreMetni(row.getCell(c)) : '');
    const es = isletmeyeEslestir(tablo, {
      il: al(cIl), ilce: al(cIlce), mahalle: al(cMah), koy: al(cKoy),
      mudurluk: al(cMud), ekip: al(cEkip),
    });
    if (es) {
      bulunan.add(es.isletme_id);
      if (!al(cIlce) && !al(cIl) && !al(cMud) && al(cEkip)) ekipten++;
    } else {
      const il = al(cIl), ilce = al(cIlce), mud = al(cMud);
      const deger = ilce || il || mud || al(cEkip);
      if (deger) {
        const anahtar = key(deger);
        eslesmezDegerler.set(anahtar, deger);
        const mevcut = gunluk.eslesmez.get(anahtar);
        if (mevcut) mevcut.adet++;
        else gunluk.eslesmez.set(anahtar, { deger, il, ilce, mudurluk: mud, sayfa: ws.name, adet: 1 });
      }
    }
    kayit++;
  }

  gunluk.satirlar.push(
    `${rapor.kategori} ← ${ws.name} (${kayit} kayıt → ${bulunan.size} işletme`
    + `${ekipten ? `, ${ekipten}'i ekip adından` : ''})`
  );
  return { bulunan, eslesmezDegerler };
}

function ilIlceTara(ws, tablo, gunluk) {
  const { basliklar, sonSutun } = satirlariOku(ws);
  const cEkip = baslikSutunu(basliklar, 'EKİP');
  const cUnsur = baslikSutunu(basliklar, 'ŞEBEKE UNSURU');
  const cKod = baslikSutunu(basliklar, 'KOD NO');

  const oneriler = [];
  const bulunan = new Set();
  let cozulemeyen = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    if (bosSatir(ws, r, sonSutun)) continue;
    const row = ws.getRow(r);
    const al = (c) => (c ? hucreMetni(row.getCell(c)) : '');
    const ekip = al(cEkip), unsur = al(cUnsur);
    const es = metindenEslestir(tablo, ekip) || metindenEslestir(tablo, unsur);
    if (es) bulunan.add(es.isletme_id); else cozulemeyen++;
    oneriler.push({ kod_no: al(cKod), tahmin: es ? es.isletme : '?', ekip, unsur });
  }

  gunluk.satirlar.push(
    `IL_ILCE ← ${ws.name} (${oneriler.length} kayıt → ${bulunan.size} işletme, `
    + `ekip adından; ${cozulemeyen} kayıt çözülemedi)`
  );
  return { oneriler, bulunan, cozulemeyen };
}

async function birGunAktar(dosyalar, tarih, secenekler = {}) {
  const gunluk = {
    satirlar: [], uyarilar: [], eslesmez: new Map(), taninmayan: [], atlananSayfalar: [],
  };
  const tablo = eslesmeTablosu();
  const katMap = db.kategoriHaritasi();

  const bulunanlar = new Map();
  const eslesmezKategori = new Map();
  let oneriler = null;
  let cozulemeyenIlIlce = 0;

  for (const dosya of dosyalar) {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.readFile(dosya);
    } catch (e) {
      gunluk.uyarilar.push(`${path.basename(dosya)} okunamadı: ${e.message}`);
      continue;
    }

    const { eslesen, bosta } = sayfalariEslestir(wb, dosya);
    const taninan = eslesen.size > 0;
    const atlanan = bosta.map((ws) => ws.name);

    for (const [ws, rapor] of eslesen) {

      if (rapor.tip === 'ililce') {
        const sonuc = ilIlceTara(ws, tablo, gunluk);
        oneriler = sonuc.oneriler;
        cozulemeyenIlIlce += sonuc.cozulemeyen;
        const mevcut = bulunanlar.get(rapor.kategori) || new Set();
        for (const id of sonuc.bulunan) mevcut.add(id);
        bulunanlar.set(rapor.kategori, mevcut);
      } else {
        const sonuc = sayfayiTara(ws, rapor, tablo, gunluk);
        if (sonuc) {
          const mevcut = bulunanlar.get(rapor.kategori) || new Set();
          for (const id of sonuc.bulunan) mevcut.add(id);
          bulunanlar.set(rapor.kategori, mevcut);

          const bekleyen = eslesmezKategori.get(rapor.kategori) || new Map();
          for (const [a, d] of sonuc.eslesmezDegerler) bekleyen.set(a, d);
          eslesmezKategori.set(rapor.kategori, bekleyen);
        }
      }
    }
    if (!taninan) gunluk.taninmayan.push(path.basename(dosya));
    if (atlanan.length) {
      gunluk.atlananSayfalar.push(`${path.basename(dosya)} → ${atlanan.join(', ')}`);
    }
  }

  if (bulunanlar.size === 0) {
    throw new Error(
      'Tanınan rapor sayfası bulunamadı. Dosyalar doğru mu? (Sayfa adlarına bakılır.)'
    );
  }

  const eklenenIsletmeler = [];
  if (secenekler.yeniIsletmeEkle) {
    db.islem(() => {
      const yeniler = new Map();
      for (const bekleyen of eslesmezKategori.values()) {
        for (const [anahtar, deger] of bekleyen) {
          if (!yeniler.has(anahtar)) {
            const mevcut = db.isletmeHaritasi().get(anahtar);
            const isl = mevcut || db.isletmeEkle(deger);
            if (isl) {
              yeniler.set(anahtar, isl.id);
              if (!mevcut) eklenenIsletmeler.push(deger);
            }
          }
        }
      }
      for (const [kod, bekleyen] of eslesmezKategori) {
        const set = bulunanlar.get(kod);
        if (!set) continue;
        for (const anahtar of bekleyen.keys()) {
          const id = yeniler.get(anahtar);
          if (id) set.add(id);
        }
      }
      gunluk.eslesmez.clear();
    });
  }

  const yaziliKategoriler = [];
  db.islem(() => {
    const acilan = [];
    for (const [kod, set] of bulunanlar) {
      const kat = katMap.get(kod);
      if (!kat) continue;
      acilan.push(kat.id);

      // İL-İLÇE'de işaretler ekip adından çıkarılıyor: sıfırlama YOK, yalnız ekleme.
      // Çözülemeyenleri Hamza elle işaretliyor, yeniden aktarım onları silmemeli.
      if (!kat.otomatik) {
        const adet = set.size ? db.otomatikIsaretle(tarih, kat.id, [...set], kat.genislik) : 0;
        yaziliKategoriler.push({ kod, adet, otomatik: false });
        continue;
      }

      if (secenekler.uzerineYaz !== false) db.kategoriSifirla(tarih, kat.id, kat.genislik);

      const adet = db.otomatikIsaretle(tarih, kat.id, [...set], kat.genislik);
      yaziliKategoriler.push({ kod, adet, otomatik: true });
    }
    db.gunKategoriAc(tarih, acilan);
    if (oneriler) db.onerileriYaz(tarih, oneriler);
    db.logYaz(tarih, 'gunluk-aktarim', gunluk.satirlar.join(' | '));
  });

  const mevcutIsletmeler = db.isletmeler();
  const eslesmez = [...gunluk.eslesmez.values()]
    .sort((a, b) => b.adet - a.adet)
    .slice(0, 200)
    .map((e) => {
      const y = enYakin(e.deger, mevcutIsletmeler);
      return {
        ...e,
        oneri: y ? { isletme_id: y.aday.id, ad: y.aday.ad, neden: y.neden } : null,
      };
    });

  const eksikRaporlar = RAPORLAR
    .filter((r) => !bulunanlar.has(r.kategori))
    .map((r) => ({ kod: r.kategori, ad: (KOD_ILE.get(r.kategori) || {}).ad || r.kategori }));

  return {
    tarih,
    dosyalar: dosyalar.map((d) => path.basename(d)),
    kategoriler: yaziliKategoriler,
    eksikRaporlar,
    atlananSayfalar: gunluk.atlananSayfalar,
    isaretToplam: yaziliKategoriler.reduce((s, k) => s + k.adet, 0),
    satirlar: gunluk.satirlar,
    uyarilar: gunluk.uyarilar,
    eslesmez,
    eklenenIsletmeler,
    taninmayan: gunluk.taninmayan,
    oneriAdet: oneriler ? oneriler.length : 0,
    cozulemeyenIlIlce,
  };
}

async function gunlukAktar(dosyalar, secenekler = {}) {
  if (secenekler.tarih) {
    const g = await birGunAktar(dosyalar, secenekler.tarih, secenekler);
    return { gunler: [g], tarihsiz: [], tarihiVerilen: [], cokluMu: false };
  }

  const gruplar = new Map();
  let tarihsiz = [];
  for (const d of dosyalar) {
    const t = tarihiCikar(d);
    if (!t) { tarihsiz.push(d); continue; }
    if (!gruplar.has(t)) gruplar.set(t, []);
    gruplar.get(t).push(d);
  }

  if (!gruplar.size) {
    throw new Error(
      'Hiçbir dosya adında GG.AA.YYYY bulunamadı — tarihi elle seçip tekrar deneyin.'
    );
  }

  const tarihiVerilen = [];
  if (gruplar.size === 1 && tarihsiz.length) {
    const t = [...gruplar.keys()][0];
    for (const d of tarihsiz) {
      gruplar.get(t).push(d);
      tarihiVerilen.push(path.basename(d));
    }
    tarihsiz = [];
  }

  const gunler = [];
  for (const t of [...gruplar.keys()].sort()) {
    try {
      gunler.push(await birGunAktar(gruplar.get(t), t, secenekler));
    } catch (e) {
      gunler.push({
        tarih: t,
        dosyalar: gruplar.get(t).map((d) => path.basename(d)),
        hata: e.message,
        kategoriler: [], isaretToplam: 0, satirlar: [], uyarilar: [],
        eslesmez: [], eklenenIsletmeler: [], taninmayan: [], oneriAdet: 0,
        eksikRaporlar: [], atlananSayfalar: [],
      });
    }
  }
  return {
    gunler,
    tarihsiz: tarihsiz.map((d) => path.basename(d)),
    tarihiVerilen,
    cokluMu: gruplar.size > 1,
  };
}

module.exports = {
  gunlukAktar, birGunAktar, tarihiCikar, raporBul, raporBulImza, raporBulDosyaAdi,
  baslikSutunu, isletmeyeEslestir,
};
