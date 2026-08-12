// Hamza ALMALI

'use strict';

const ExcelJS = require('exceljs');
const db = require('../db/db');
const { AY_ADLARI } = require('./excelDisaAktar');
const {
  ACIKLAMALAR, gunSayisi, vardiyaListesi, saatBasligi, gunlukSayim,
} = require('../../shared/vardiya');

const BASLIK_DOLGU = 'FFFFE699';
const SAAT_DOLGU = 'FFD9D9D9';
const AD_DOLGU = 'FFF2F2F2';
const KOD_RENK = {
  A: 'FFDDEBF7',
  B: 'FFFCE4D6',
  C: 'FFE2EFDA',
  'R.T': 'FFFFC7CE',
  'Yİ': 'FFFFF2CC',
  'Sİ': 'FFD9D2E9',
  'Fİ': 'FFD0CECE',
};

function kenarlik() {
  const ince = { style: 'thin', color: { argb: 'FF9E9E9E' } };
  return { top: ince, left: ince, bottom: ince, right: ince };
}

function dolgu(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb }, bgColor: { indexed: 64 } };
}

function hucre(ws, r, c, deger, { kalin, renk, hiza = 'center', boyut = 10 } = {}) {
  const h = ws.getCell(r, c);
  if (deger !== undefined) h.value = deger;
  h.font = { bold: !!kalin, size: boyut };
  h.alignment = { horizontal: hiza, vertical: 'middle' };
  if (renk) h.fill = dolgu(renk);
  h.border = kenarlik();
  return h;
}

async function vardiyaDisaAktar(ay, yol) {
  const [yil, aySayi] = ay.split('-').map(Number);
  const gun = gunSayisi(ay);
  const sonSutun = gun + 1;
  const veri = db.vardiyaAyVerisi(ay);

  if (!veri.ekipler.length) throw new Error('Kayıtlı ekip yok.');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Rapor Masası';
  const ws = wb.addWorksheet(`${AY_ADLARI[aySayi - 1]} ${yil}`, {
    views: [{ state: 'frozen', xSplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.getColumn(1).width = 26;
  for (let c = 2; c <= sonSutun; c++) ws.getColumn(c).width = 4.5;

  let r = 1;
  for (const ekip of veri.ekipler) {
    const personeller = veri.personeller.filter((p) => p.ekip_id === ekip.id);
    if (!personeller.length) continue;
    const kayitlar = veri.kayitlar.filter((k) => k.ekip_id === ekip.id);
    const vardiyalar = vardiyaListesi(ekip);

    hucre(ws, r, 1, ekip.ad, { kalin: true, renk: BASLIK_DOLGU, boyut: 12 });
    for (let c = 2; c <= sonSutun; c++) hucre(ws, r, c, undefined, { renk: BASLIK_DOLGU });
    ws.mergeCells(r, 1, r, sonSutun);
    ws.getRow(r).height = 20;
    r++;

    hucre(ws, r, 1, ekip.ad, { kalin: true, renk: AD_DOLGU, hiza: 'left' });
    for (let g = 1; g <= gun; g++) hucre(ws, r, g + 1, g, { kalin: true, renk: AD_DOLGU, boyut: 9 });
    r++;

    for (const p of personeller) {
      hucre(ws, r, 1, p.ad, { kalin: true, hiza: 'left' });
      for (let g = 1; g <= gun; g++) {
        const k = kayitlar.find((x) => x.personel_id === p.id && x.gun === g);
        const kod = k ? k.kod : '';
        hucre(ws, r, g + 1, kod || null, { boyut: 9, renk: KOD_RENK[kod] });
      }
      r++;
    }

    hucre(ws, r, 1, 'SAAT', { kalin: true, renk: SAAT_DOLGU, hiza: 'left' });
    hucre(ws, r, 2, AY_ADLARI[aySayi - 1], { kalin: true, renk: SAAT_DOLGU });
    for (let c = 3; c <= sonSutun; c++) hucre(ws, r, c, undefined, { renk: SAAT_DOLGU });
    ws.mergeCells(r, 2, r, sonSutun);
    r++;

    for (const v of vardiyalar) {
      hucre(ws, r, 1, saatBasligi(v), { kalin: true, hiza: 'left', boyut: 9 });
      for (let g = 1; g <= gun; g++) {
        hucre(ws, r, g + 1, gunlukSayim(kayitlar, vardiyalar, g)[v], { boyut: 9 });
      }
      r++;
    }

    for (const a of ACIKLAMALAR) {
      hucre(ws, r, 1, a, { hiza: 'left', boyut: 9 });
      for (let c = 2; c <= sonSutun; c++) hucre(ws, r, c);
      r++;
    }

    r++;
  }

  await wb.xlsx.writeFile(yol);
  return { yol, ay, ekip: veri.ekipler.length, gun };
}

module.exports = { vardiyaDisaAktar };
