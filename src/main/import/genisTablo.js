// Hamza ALMALI

'use strict';

const ExcelJS = require('exceljs');
const { key } = require('../../shared/tr');
const { kategoriBul, alanlar: kategoriAlanlari } = require('../../shared/kategoriler');

const SATIR_TARIH = 1;
const SATIR_KAT = 2;
const SATIR_ALT = 3;
const ILK_VERI = 4;

const ALAN_ESLEME = [
  ['ARIZASIVARMI', 'ariza_var'],
  ['DÖNÜŞSAĞLANDIMI', 'donus_saglandi'],
  ['TUTANAKGEREKLİMI', 'tutanak_gerekli'],
  ['TUTANAKEKLENDİMI', 'tutanak_eklendi'],
];

function altBasliktanAlan(metin) {
  const k = key(metin);
  if (!k) return null;
  for (const [desen, alan] of ALAN_ESLEME) {
    if (k.startsWith(desen)) return alan;
  }
  return null;
}

function kirmiziMi(cell) {
  const f = cell && cell.fill;
  if (!f || f.type !== 'pattern' || !f.fgColor) return false;
  const argb = f.fgColor.argb;
  if (!argb) return false;
  const r = parseInt(argb.slice(2, 4), 16);
  const g = parseInt(argb.slice(4, 6), 16);
  const b = parseInt(argb.slice(6, 8), 16);
  return r >= 200 && g <= 80 && b <= 80;
}

function hucreMetni(cell) {
  let v = cell ? cell.value : null;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.richText) v = v.richText.map((t) => t.text).join('');
    else if (v.text != null) v = v.text;
    else if (v.result != null) v = v.result;
    else return '';
  }
  return String(v).trim();
}

function tariheCevir(v) {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && v.result instanceof Date) return v.result;
  if (typeof v === 'number') {
    const ms = Math.round((v - 25569) * 86400000);
    return new Date(ms);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return null;
}

function isoTarih(d) {
  if (!d) return null;
  const y = d.getUTCFullYear();
  const ay = String(d.getUTCMonth() + 1).padStart(2, '0');
  const g = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${ay}-${g}`;
}

function gunBloklari(ws) {
  const bloklar = [];
  for (let c = 2; c <= ws.columnCount; c++) {
    const cell = ws.getCell(SATIR_TARIH, c);
    const master = cell.master || cell;
    if (master.address !== cell.address) continue;
    const t = tariheCevir(cell.value);
    if (t) bloklar.push({ sutun: c, tarih: t });
  }
  for (let i = 0; i < bloklar.length; i++) {
    bloklar[i].sonSutun = (i + 1 < bloklar.length ? bloklar[i + 1].sutun : ws.columnCount + 1) - 1;
  }
  return bloklar;
}

function kategoriSegmentleri(ws, blok) {
  const seg = [];
  for (let c = blok.sutun; c <= blok.sonSutun; c++) {
    const ad = hucreMetni(ws.getCell(SATIR_KAT, c));
    if (!ad) {
      if (seg.length) seg[seg.length - 1].sonSutun = c;
      continue;
    }
    const son = seg[seg.length - 1];
    if (son && key(son.ad) === key(ad)) son.sonSutun = c;
    else seg.push({ ad, sutun: c, sonSutun: c });
  }
  return seg;
}

function isletmeSatirlari(ws) {
  const liste = [];
  for (let r = ILK_VERI; r <= ws.rowCount; r++) {
    const ad = hucreMetni(ws.getCell(r, 1));
    if (ad) liste.push({ satir: r, ad });
  }
  return liste;
}

async function genisTabloOku(dosyaYolu) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(dosyaYolu);

  const kayitlar = [];
  const isletmeSira = new Map();
  const kategoriSet = new Set();
  const aylar = [];
  const uyarilar = [];

  for (const ws of wb.worksheets) {
    if (ws.state === 'veryHidden') continue;
    const bloklar = gunBloklari(ws);
    if (!bloklar.length) continue;
    aylar.push(ws.name);

    const isletmeler = isletmeSatirlari(ws);
    for (const i of isletmeler) {
      if (!isletmeSira.has(i.ad)) isletmeSira.set(i.ad, isletmeSira.size + 1);
    }

    for (const blok of bloklar) {
      const tarih = isoTarih(blok.tarih);
      const segmentler = kategoriSegmentleri(ws, blok);

      for (const seg of segmentler) {
        const kat = kategoriBul(seg.ad);
        if (!kat) {
          const uy = `${ws.name}: "${seg.ad}" tanınmayan kategori, atlandı.`;
          if (!uyarilar.includes(uy)) uyarilar.push(uy);
          continue;
        }
        kategoriSet.add(kat.kod);

        const genislik = seg.sonSutun - seg.sutun + 1;
        const varsayilan = kategoriAlanlari(genislik === 4 ? 4 : 2);
        const alanlar = [];
        for (let c = seg.sutun; c <= seg.sonSutun; c++) {
          const alan =
            altBasliktanAlan(hucreMetni(ws.getCell(SATIR_ALT, c))) ||
            varsayilan[c - seg.sutun] ||
            null;
          if (alan) alanlar.push({ sutun: c, alan });
        }
        if (!alanlar.length) {
          uyarilar.push(`${ws.name} ${tarih} "${seg.ad}": alt başlık okunamadı, atlandı.`);
          continue;
        }

        for (const isl of isletmeler) {
          const kayit = {
            tarih,
            isletme: isl.ad,
            kategori: kat.kod,
            ariza_var: 0,
            donus_saglandi: 0,
            tutanak_gerekli: 0,
            tutanak_eklendi: 0,
            ariza_var_bekliyor: 0,
            donus_saglandi_bekliyor: 0,
            tutanak_gerekli_bekliyor: 0,
            tutanak_eklendi_bekliyor: 0,
          };
          let doluMu = false;

          for (const a of alanlar) {
            const cell = ws.getCell(isl.satir, a.sutun);
            const metin = hucreMetni(cell);
            const isaretli = key(metin) === 'X' ? 1 : 0;
            const bekliyor = kirmiziMi(cell) ? 1 : 0;
            kayit[a.alan] = isaretli;
            kayit[a.alan + '_bekliyor'] = bekliyor;
            if (isaretli || bekliyor) doluMu = true;
          }

          if (doluMu) kayitlar.push(kayit);
        }
      }
    }
  }

  return {
    aylar,
    isletmeler: [...isletmeSira.keys()],
    kategoriler: [...kategoriSet],
    kayitlar,
    uyarilar,
  };
}

module.exports = { genisTabloOku, isoTarih, tariheCevir, hucreMetni, kirmiziMi, altBasliktanAlan };
