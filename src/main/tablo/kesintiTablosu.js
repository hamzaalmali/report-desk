// Hamza ALMALI

'use strict';

const path = require('node:path');
const ExcelJS = require('exceljs');
const { key, trUpper } = require('../../shared/tr');
const { hucreMetni } = require('../import/genisTablo');

const ALTI_SAAT = 6;
const BIN_ABONE = 1000;

const REKORTMAN_NEDEN = 'AG ABONE KABLOSU';
const REKORTMAN_KAYNAK = 'DAGITIM TRANSFORMATORU';

const EK_ABONE = 'TOPLAM ABONE';
const EK_TABLET = 'TABLET AÇIKLAMASI';

const VURGU_DOLGU = 'FFFFC7CE';
const VURGU_YAZI = 'FF9C0006';

function duz(s) {
  return key(s)
    .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
    .replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C');
}

function sayi(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'object') return sayi(v.result != null ? v.result : v.text);
  let s = String(v).trim();
  if (!s) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function hucreDegeri(cell) {
  const v = cell ? cell.value : null;
  if (v == null) return null;
  if (typeof v === 'object' && !(v instanceof Date)) {
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if (v.result != null) return v.result;
    if (v.text != null) return String(v.text);
    return null;
  }
  return v;
}

function sayfaOku(ws) {
  const ilk = ws.getRow(1);
  const sonSutun = Math.max(1, ws.actualColumnCount || ws.columnCount || 1);
  const basliklar = [];
  for (let c = 1; c <= sonSutun; c++) {
    basliklar.push({
      ad: hucreMetni(ilk.getCell(c)),
      anahtar: key(hucreMetni(ilk.getCell(c))),
      genislik: ws.getColumn(c).width || null,
    });
  }
  while (basliklar.length && !basliklar[basliklar.length - 1].ad) basliklar.pop();

  const satirlar = [];
  ws.eachRow((row, r) => {
    if (r === 1) return;
    const veri = [];
    let dolu = false;
    for (let c = 1; c <= basliklar.length; c++) {
      const v = hucreDegeri(row.getCell(c));
      veri.push(v);
      if (v != null && String(v).trim() !== '') dolu = true;
    }
    if (dolu) satirlar.push(veri);
  });

  return { ad: ws.name, basliklar, satirlar };
}

async function dosyaOku(yol, kodDesenleri) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(yol);
  let ilkDolu = null;
  for (const ws of wb.worksheets) {
    const o = sayfaOku(ws);
    if (!o.satirlar.length && !o.basliklar.length) continue;
    if (!ilkDolu) ilkDolu = o;
    if (sutunBul(o.basliklar, kodDesenleri) >= 0) return o;
  }
  if (!ilkDolu) throw new Error(`Dosyada okunacak sayfa yok: ${path.basename(yol)}`);
  return ilkDolu;
}

function sutunBul(basliklar, desenler) {
  for (const d of desenler) {
    const k = key(d);
    for (let i = 0; i < basliklar.length; i++) {
      if (basliklar[i].anahtar === k) return i;
    }
  }
  for (const d of desenler) {
    const k = key(d);
    for (let i = 0; i < basliklar.length; i++) {
      if (basliklar[i].anahtar && basliklar[i].anahtar.includes(k)) return i;
    }
  }
  return -1;
}

const KOD_DESEN = ['KESİNTİNİN KODU (1)', 'KOD NO (1)', 'KESİNTİ KODU', 'KOD NO'];
const SURE_DESEN = ['KESİNTİ SÜRESİ'];
const ILCE_DESEN = ['İLÇE (3B)', 'İLÇE'];
const NEDEN_DESEN = ['KESİNTİ NEDENİNE İLİŞKİN AÇIKLAMA (4)', 'KESİNTİ NEDEN'];
const KAYNAK_DESEN = ['KAYNAK TÜRÜ'];
const ABONE_DESEN = ['TOPLAM ABONE', 'ETKİLENEN ABONE', 'ABONE SAYISI'];
const TABLET_DESEN = ['TABLET AÇIKLAMA'];

function kodMetni(v) {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  return String(v).trim();
}

function sayfaYaz(wb, ad, basliklar, satirlar, sec = {}) {
  let isim = String(ad || 'Sayfa').replace(/[*?:\\/\[\]]/g, '-').slice(0, 31) || 'Sayfa';
  let n = 2;
  while (wb.worksheets.some((w) => w.name === isim)) {
    isim = `${isim.slice(0, 28)} ${n++}`;
  }
  const ws = wb.addWorksheet(isim, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.getRow(1).values = basliklar.map((b) => b.ad);
  basliklar.forEach((b, i) => {
    const col = ws.getColumn(i + 1);
    col.width = b.genislik
      || Math.min(28, Math.max(12, Math.ceil((b.ad || '').length * 0.9)));
  });

  const kenar = { style: 'thin', color: { argb: 'FF9E9E9E' } };
  const kenarlik = { top: kenar, left: kenar, bottom: kenar, right: kenar };

  const bas = ws.getRow(1);
  bas.font = { bold: true, size: 9 };
  bas.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  bas.height = 30;
  for (let c = 1; c <= basliklar.length; c++) bas.getCell(c).border = kenarlik;

  for (const satir of satirlar) {
    const row = ws.addRow(satir.slice(0, basliklar.length));
    for (let c = 1; c <= basliklar.length; c++) {
      const h = row.getCell(c);
      h.border = kenarlik;
      h.alignment = { vertical: 'middle', wrapText: true };
      if (sec.vurgulu && sec.vurgulu.sutun === c - 1 && sec.vurgulu.kodlar.has(kodMetni(satir[c - 1]))) {
        h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VURGU_DOLGU } };
        h.font = { color: { argb: VURGU_YAZI } };
      }
    }
  }

  if (basliklar.length) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, satirlar.length + 1), column: basliklar.length },
    };
  }
  return ws;
}

async function olustur({ anaDosya, detayDosya, hedefKlasor, tarihMetni, log = () => { } }) {
  const ana = await dosyaOku(anaDosya, KOD_DESEN);
  const detay = await dosyaOku(detayDosya, KOD_DESEN);

  const anaKod = sutunBul(ana.basliklar, KOD_DESEN);
  const anaSure = sutunBul(ana.basliklar, SURE_DESEN);
  const dKod = sutunBul(detay.basliklar, KOD_DESEN);
  const dIlce = sutunBul(detay.basliklar, ILCE_DESEN);
  const dNeden = sutunBul(detay.basliklar, NEDEN_DESEN);
  const dKaynak = sutunBul(detay.basliklar, KAYNAK_DESEN);
  const dAbone = sutunBul(detay.basliklar, ABONE_DESEN);
  const dTablet = sutunBul(detay.basliklar, TABLET_DESEN);

  if (anaKod < 0) throw new Error(`Kesinti listesinde kod sütunu bulunamadı (${path.basename(anaDosya)}).`);
  if (dKod < 0) throw new Error(`Detay raporunda kod sütunu bulunamadı (${path.basename(detayDosya)}).`);
  for (const [ix, adx] of [[dAbone, 'abone'], [dTablet, 'tablet açıklaması'], [dIlce, 'ilçe']]) {
    if (ix < 0) log(`Kesinti tablosu: detay raporunda ${adx} sütunu bulunamadı, ilgili alanlar boş kalacak.`);
  }
  if (anaSure < 0) log('Kesinti tablosu: listede süre sütunu bulunamadı, süre sayfası boş kalacak.');

  const ilkKayit = new Map();
  for (const s of detay.satirlar) {
    const k = kodMetni(s[dKod]);
    if (k && !ilkKayit.has(k)) ilkKayit.set(k, s);
  }

  const anaBasliklar = ana.basliklar.slice();
  let aboneSutun = sutunBul(anaBasliklar, ABONE_DESEN);
  let tabletSutun = sutunBul(anaBasliklar, TABLET_DESEN);
  if (aboneSutun < 0 && dAbone >= 0) {
    anaBasliklar.push({ ad: EK_ABONE, anahtar: key(EK_ABONE), genislik: 14 });
    aboneSutun = anaBasliklar.length - 1;
  }
  if (tabletSutun < 0 && dTablet >= 0) {
    anaBasliklar.push({ ad: EK_TABLET, anahtar: key(EK_TABLET), genislik: 40 });
    tabletSutun = anaBasliklar.length - 1;
  }

  const anaSatirlar = ana.satirlar.map((s) => {
    const yeni = s.slice();
    while (yeni.length < anaBasliklar.length) yeni.push(null);
    const d = ilkKayit.get(kodMetni(s[anaKod]));
    if (d) {
      if (aboneSutun >= ana.basliklar.length && dAbone >= 0) yeni[aboneSutun] = sayi(d[dAbone]);
      if (tabletSutun >= ana.basliklar.length && dTablet >= 0) yeni[tabletSutun] = d[dTablet];
    }
    return yeni;
  });

  const aboneDegeri = (s) => (aboneSutun >= 0 ? sayi(s[aboneSutun]) : null);

  const altiSaat = anaSure < 0 ? []
    : anaSatirlar.filter((s) => (sayi(s[anaSure]) || 0) >= ALTI_SAAT);
  const binAbone = aboneSutun < 0 ? []
    : anaSatirlar.filter((s) => (aboneDegeri(s) || 0) >= BIN_ABONE);
  const arizaDetay = anaSatirlar.slice().sort((a, b) => {
    const fa = aboneDegeri(a), fb = aboneDegeri(b);
    if (fa == null && fb == null) return 0;
    if (fa == null) return 1;
    if (fb == null) return -1;
    return fb - fa;
  });

  const ilceler = new Map();
  if (dIlce >= 0) {
    for (const s of detay.satirlar) {
      const k = kodMetni(s[dKod]);
      const ilce = kodMetni(s[dIlce]);
      if (!k || !ilce) continue;
      if (!ilceler.has(k)) ilceler.set(k, new Set());
      ilceler.get(k).add(trUpper(ilce));
    }
  }
  const cokIlceli = new Set([...ilceler].filter(([, v]) => v.size >= 2).map(([k]) => k));
  const ikiIlce = detay.satirlar.filter((s) => cokIlceli.has(kodMetni(s[dKod])));

  const rekortman = (dNeden < 0 || dKaynak < 0) ? []
    : detay.satirlar.filter((s) => duz(s[dNeden]) === duz(REKORTMAN_NEDEN)
      && duz(s[dKaynak]) === duz(REKORTMAN_KAYNAK));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Report Desk';
  sayfaYaz(wb, ana.ad || 'Kesintiler', anaBasliklar, anaSatirlar);
  sayfaYaz(wb, '6 Saat ve Üzeri Kesintiler', anaBasliklar, altiSaat);
  sayfaYaz(wb, '2 ve Üzeri Etkilenen İlçeler', detay.basliklar, ikiIlce,
    { vurgulu: { sutun: dKod, kodlar: cokIlceli } });
  sayfaYaz(wb, 'Rekortman', detay.basliklar, rekortman);
  sayfaYaz(wb, '1000 ve Üzeri Etkilenen Abone', anaBasliklar, binAbone);
  sayfaYaz(wb, 'ARIZA DETAY', anaBasliklar, arizaDetay);

  const ad = `${tarihMetni} Tarihinde Gerçekleşmiş Olan Kesinti Detayları.xlsx`
    .replace(/[\\/:*?"<>|]+/g, '-');
  const dosya = path.join(hedefKlasor, ad);
  await wb.xlsx.writeFile(dosya);

  const ozet = {
    toplam: anaSatirlar.length,
    detayToplam: detay.satirlar.length,
    altiSaat: altiSaat.length,
    binAbone: binAbone.length,
    ikiIlce: cokIlceli.size,
    rekortman: rekortman.length,
  };
  log(`Kesinti tablosu üretildi: ${ad} — ${JSON.stringify(ozet)}`);
  return { dosya, ad, ozet };
}

module.exports = {
  olustur, sayi, duz, sutunBul,
  ALTI_SAAT, BIN_ABONE, REKORTMAN_NEDEN, REKORTMAN_KAYNAK,
};
