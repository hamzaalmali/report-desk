// Hamza ALMALI

'use strict';

const path = require('node:path');
const ExcelJS = require('exceljs');
const { key } = require('../../shared/tr');
const { hucreMetni } = require('../import/genisTablo');

const VURGU_DOLGU = 'FFFFC7CE';
const VURGU_YAZI = 'FF9C0006';

const EN_COK_BASLIK_ARAMA = 40;

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

function kodMetni(v) {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  return String(v).trim();
}

function satirAnahtarlari(ws, r, sonSutun) {
  const row = ws.getRow(r);
  const hepsi = [];
  for (let c = 1; c <= sonSutun; c++) {
    const ad = hucreMetni(row.getCell(c));
    hepsi.push({ sutun: c, ad, anahtar: key(ad) });
  }
  return hepsi;
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

function sutunSec(basliklar, desenler, harfSira) {
  const i = sutunBul(basliklar, desenler);
  if (i >= 0) return i;

  const duzBasliklar = basliklar.map((b) => duz(b.ad));
  for (const d of desenler) {
    const k = duz(d);
    const j = duzBasliklar.indexOf(k);
    if (j >= 0) return j;
  }
  for (const d of desenler) {
    const k = duz(d);
    const j = duzBasliklar.findIndex((b) => b && b.includes(k));
    if (j >= 0) return j;
  }

  if (!harfSira) return -1;
  for (let j = 0; j < basliklar.length; j++) {
    if (basliklar[j].sutun === harfSira) return j;
  }
  return -1;
}

function sayfaOku(ws, kodDesenleri) {
  const sonSutun = Math.max(1, ws.actualColumnCount || 0, ws.columnCount || 0);
  const aramaSiniri = Math.min(Math.max(1, ws.actualRowCount || ws.rowCount || 1),
    EN_COK_BASLIK_ARAMA);

  let baslikSatiri = 1;
  let kodVar = false;
  for (let r = 1; r <= aramaSiniri; r++) {
    if (sutunBul(satirAnahtarlari(ws, r, sonSutun), kodDesenleri) >= 0) {
      baslikSatiri = r;
      kodVar = true;
      break;
    }
  }

  const basliklar = satirAnahtarlari(ws, baslikSatiri, sonSutun)
    .filter((b) => b.ad)
    .map((b) => ({ ...b, genislik: ws.getColumn(b.sutun).width || null }));

  const satirlar = [];
  ws.eachRow((row, r) => {
    if (r <= baslikSatiri) return;
    const veri = [];
    let dolu = false;
    for (const b of basliklar) {
      const v = hucreDegeri(row.getCell(b.sutun));
      veri.push(v);
      if (v != null && String(v).trim() !== '') dolu = true;
    }
    if (dolu) satirlar.push(veri);
  });

  return { ad: ws.name, basliklar, satirlar, baslikSatiri, kodVar };
}

async function dosyaOku(yol, kodDesenleri) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(yol);
  let ilkDolu = null;
  for (const ws of wb.worksheets) {
    const o = sayfaOku(ws, kodDesenleri);
    if (!o.satirlar.length && !o.basliklar.length) continue;
    if (!ilkDolu) ilkDolu = o;
    if (o.kodVar) return o;
  }
  if (!ilkDolu) throw new Error(`Dosyada okunacak sayfa yok: ${path.basename(yol)}`);
  return ilkDolu;
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
      if (sec.vurgulu && sec.vurgulu.sutun === c - 1
        && sec.vurgulu.kodlar.has(kodMetni(satir[c - 1]))) {
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

module.exports = {
  sayi, duz, hucreDegeri, kodMetni, satirAnahtarlari,
  sutunBul, sutunSec, sayfaOku, dosyaOku, sayfaYaz,
  VURGU_DOLGU, VURGU_YAZI, EN_COK_BASLIK_ARAMA,
};
