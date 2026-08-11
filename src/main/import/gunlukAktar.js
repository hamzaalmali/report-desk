// Hamza ALMALI

'use strict';

const path = require('node:path');
const ExcelJS = require('exceljs');
const db = require('../db/db');
const { key, enYakin } = require('../../shared/tr');
const { hucreMetni, isoTarih } = require('./genisTablo');

const RAPORLAR = [
  {
    sayfa: 'ARIZADETAY', kategori: 'ARIZA_DETAY', tip: 'standart',
    ilce: 'İLÇE', il: 'İL', mahalle: '', koy: '', mudurluk: '',
  },
  {
    sayfa: 'AYS_IhbarTakipRaporu', kategori: 'DURUM_KODU', tip: 'standart',
    ilce: 'İLÇE ADI', il: 'İL ADI', mahalle: 'MAHALLE ADI', koy: 'KÖY ADI', mudurluk: 'MÜDÜRLÜK',
  },
  {
    sayfa: 'BİNATİPİOSOS', kategori: 'BINA_TIPI_OSOS', tip: 'standart',
    ilce: 'İLÇE ADI', il: 'İL ADI', mahalle: 'MAHALLE ADI', koy: 'KÖY ADI', mudurluk: 'MÜDÜRLÜK',
  },
  {
    sayfa: 'OSOSBAĞLANTIİHBARİNCELEMESİ', kategori: 'OSOS_BAGLANTI', tip: 'standart',
    ilce: 'İLÇE', il: 'İL', mahalle: '', koy: '', mudurluk: 'MÜDÜRLÜK',
  },
  {
    sayfaOnEk: 'TABLO1', kategori: 'BILGI_BELGE', tip: 'standart',
    ilce: 'İLÇE', il: 'İL', mahalle: '', koy: '', mudurluk: '',
  },
  { sayfa: 'İLİLÇE', kategori: 'IL_ILCE', tip: 'ililce' },
];

function raporBul(sayfaAdi) {
  const k = key(sayfaAdi);
  for (const r of RAPORLAR) {
    if (r.sayfa && key(r.sayfa) === k) return r;
    if (r.sayfaOnEk && k.startsWith(key(r.sayfaOnEk))) return r;
  }
  return null;
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

function isletmeyeEslestir(tablo, { il, ilce, mahalle, koy, mudurluk }) {
  let t = anahtarAra(tablo, `${mahalle || ''} ${koy || ''}`);
  if (t) return t;

  t = tamEslestir(tablo, ilce);
  if (t) return t;

  if (!ilce || !ilce.trim() || key(ilce) === 'MERKEZ') {
    t = tamEslestir(tablo, il);
    if (t) return t;
  }

  return tamEslestir(tablo, mudurluk);
}

function metindenIsletme(tablo, metin) {
  if (!metin || !metin.trim()) return '';
  const t = anahtarAra(tablo, metin);
  if (t) return t.isletme;

  const ara = key(metin);
  let enIyi = '', sonuc = '';
  for (const e of tablo) {
    if (e.anahtar.length > 3 && ara.includes(e.anahtar) && e.anahtar.length > enIyi.length) {
      enIyi = e.anahtar;
      sonuc = e.isletme;
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

  if (!cIlce && !cIl && !cMud) {
    gunluk.uyarilar.push(`${ws.name}: il/ilçe sütunu bulunamadı, atlandı.`);
    return null;
  }

  const bulunan = new Set();
  const eslesmezDegerler = new Map();
  let kayit = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    if (bosSatir(ws, r, sonSutun)) continue;
    const row = ws.getRow(r);
    const al = (c) => (c ? hucreMetni(row.getCell(c)) : '');
    const es = isletmeyeEslestir(tablo, {
      il: al(cIl), ilce: al(cIlce), mahalle: al(cMah), koy: al(cKoy), mudurluk: al(cMud),
    });
    if (es) bulunan.add(es.isletme_id);
    else {
      const il = al(cIl), ilce = al(cIlce), mud = al(cMud);
      const deger = ilce || il || mud;
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
    `${rapor.kategori} ← ${ws.name} (${kayit} kayıt → ${bulunan.size} işletme)`
  );
  return { bulunan, eslesmezDegerler };
}

function ilIlceTara(ws, tablo, gunluk) {
  const { basliklar, sonSutun } = satirlariOku(ws);
  const cEkip = baslikSutunu(basliklar, 'EKİP');
  const cUnsur = baslikSutunu(basliklar, 'ŞEBEKE UNSURU');
  const cKod = baslikSutunu(basliklar, 'KOD NO');

  const oneriler = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    if (bosSatir(ws, r, sonSutun)) continue;
    const row = ws.getRow(r);
    const al = (c) => (c ? hucreMetni(row.getCell(c)) : '');
    const ekip = al(cEkip), unsur = al(cUnsur);
    const tahmin = metindenIsletme(tablo, ekip) || metindenIsletme(tablo, unsur) || '?';
    oneriler.push({ kod_no: al(cKod), tahmin, ekip, unsur });
  }

  gunluk.satirlar.push(
    `IL_ILCE ← ${ws.name} (${oneriler.length} kayıt — sütun açıldı, işaretleme elle)`
  );
  return oneriler;
}

async function gunlukAktar(dosyalar, secenekler = {}) {
  const gunluk = { satirlar: [], uyarilar: [], eslesmez: new Map(), taninmayan: [] };
  const tablo = eslesmeTablosu();
  const katMap = db.kategoriHaritasi();

  let tarih = secenekler.tarih || null;
  if (!tarih) {
    for (const d of dosyalar) {
      const t = tarihiCikar(d);
      if (t) { tarih = t; break; }
    }
  }
  if (!tarih) {
    throw new Error(
      'Tarih belirlenemedi. Dosya adlarında GG.AA.YYYY yok — lütfen tarihi elle seçin.'
    );
  }

  const bulunanlar = new Map();
  const eslesmezKategori = new Map();
  let oneriler = null;

  for (const dosya of dosyalar) {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.readFile(dosya);
    } catch (e) {
      gunluk.uyarilar.push(`${path.basename(dosya)} okunamadı: ${e.message}`);
      continue;
    }

    let taninan = false;
    for (const ws of wb.worksheets) {
      const rapor = raporBul(ws.name);
      if (!rapor) continue;
      taninan = true;

      if (rapor.tip === 'ililce') {
        oneriler = ilIlceTara(ws, tablo, gunluk);
        if (!bulunanlar.has(rapor.kategori)) bulunanlar.set(rapor.kategori, new Set());
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

      if (secenekler.uzerineYaz !== false) db.kategoriSifirla(tarih, kat.id);

      if (!kat.otomatik) { yaziliKategoriler.push({ kod, adet: 0, otomatik: false }); continue; }

      const kayitlar = [...set].map((isletme_id) => ({
        tarih,
        isletme_id,
        kategori_id: kat.id,
        ...(kat.genislik === 4
          ? { ariza_var: 1, donus_saglandi_bekliyor: 1 }
          : { tutanak_gerekli: 1, tutanak_eklendi_bekliyor: 1 }),
      }));
      db.kayitYaz(kayitlar);
      yaziliKategoriler.push({ kod, adet: kayitlar.length, otomatik: true });
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

  return {
    tarih,
    kategoriler: yaziliKategoriler,
    isaretToplam: yaziliKategoriler.reduce((s, k) => s + k.adet, 0),
    satirlar: gunluk.satirlar,
    uyarilar: gunluk.uyarilar,
    eslesmez,
    eklenenIsletmeler,
    taninmayan: gunluk.taninmayan,
    oneriAdet: oneriler ? oneriler.length : 0,
  };
}

module.exports = { gunlukAktar, tarihiCikar, raporBul, baslikSutunu, isletmeyeEslestir };
