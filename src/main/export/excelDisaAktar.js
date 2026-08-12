// Hamza ALMALI

'use strict';

const ExcelJS = require('exceljs');
const db = require('../db/db');
const { alanlar, ALAN_BASLIK } = require('../../shared/kategoriler');

const AY_ADLARI = [
  'OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN',
  'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK',
];

const KIRMIZI = 'FFFF0000';
const KATEGORI_RENK = {
  ARIZA_DETAY: 'FFD9D9D9',
  DURUM_KODU: 'FFC6E0B4',
  BINA_TIPI_OSOS: 'FFF8CBAD',
  OSOS_BAGLANTI: 'FFA9D08E',
  BILGI_BELGE: 'FFDDEBF7',
  OSOS_BAGLI_AG: 'FFFFF2CC',
  KABLO_TEST: 'FFE2EFDA',
  IL_ILCE: 'FFD0CECE',
  SCADA_TM: 'FFFCE4D6',
};

function kenarlik() {
  const ince = { style: 'thin', color: { argb: 'FF9E9E9E' } };
  return { top: ince, left: ince, bottom: ince, right: ince };
}

function dolgu(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb }, bgColor: { indexed: 64 } };
}

function gunYaz(tarih) {
  const [y, a, g] = tarih.split('-');
  return `${g}.${a}.${y}`;
}

async function tabloDisaAktar(ay, yol, tekGun) {
  const [yil, aySayi] = ay.split('-').map(Number);
  const isletmeler = db.isletmeler();
  const kategoriler = db.kategoriler();
  const katKod = new Map(kategoriler.map((k) => [k.kod, k]));
  const satirlar = db.ayVerisi(ay);

  const gunler = new Map();
  for (const s of satirlar) {
    if (!gunler.has(s.tarih)) gunler.set(s.tarih, new Map());
    const kat = gunler.get(s.tarih);
    if (!kat.has(s.kategori_kod)) kat.set(s.kategori_kod, new Map());
    kat.get(s.kategori_kod).set(s.isletme, s);
  }

  const acik = db.raw.all(
    `SELECT g.tarih, kt.kod, kt.sira FROM gun_kategori g
     JOIN kategori kt ON kt.id = g.kategori_id
     WHERE substr(g.tarih,1,7) = :ay ORDER BY g.tarih, kt.sira`,
    { ':ay': ay }
  );
  const gunKategori = new Map();
  for (const a of acik) {
    if (!gunKategori.has(a.tarih)) gunKategori.set(a.tarih, []);
    gunKategori.get(a.tarih).push(a.kod);
  }
  for (const t of gunler.keys()) {
    if (!gunKategori.has(t)) {
      gunKategori.set(t, [...gunler.get(t).keys()].sort(
        (a, b) => katKod.get(a).sira - katKod.get(b).sira
      ));
    }
  }

  const tumGunler = [...gunKategori.keys()].sort()
    .filter((t) => !tekGun || t === tekGun);

  if (tekGun && !tumGunler.length) {
    throw new Error(`${gunYaz(tekGun)} için kayıt yok.`);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Rapor Masası';
  const ws = wb.addWorksheet(
    tekGun ? gunYaz(tekGun) : `${AY_ADLARI[aySayi - 1]} ${yil}`,
    { views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }] }
  );

  ws.getColumn(1).width = 16;
  for (const r of [1, 2, 3]) {
    const c = ws.getCell(r, 1);
    c.font = { bold: true, size: 10 };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.fill = dolgu('FFBFBFBF');
    c.border = kenarlik();
  }
  ws.getCell(1, 1).value = 'İŞLETME';
  ws.mergeCells(1, 1, 3, 1);

  isletmeler.forEach((isl, i) => {
    const c = ws.getCell(4 + i, 1);
    c.value = isl.ad;
    c.font = { bold: true, size: 10 };
    c.alignment = { vertical: 'middle' };
    c.border = kenarlik();
  });

  let sutun = 2;
  for (const tarih of tumGunler) {
    const kodlar = gunKategori.get(tarih);
    const blokBas = sutun;

    for (const kod of kodlar) {
      const kat = katKod.get(kod);
      if (!kat) continue;
      const alanListesi = alanlar(kat.genislik);
      const veri = (gunler.get(tarih) || new Map()).get(kod) || new Map();

      alanListesi.forEach((alan, ofs) => {
        const c = sutun + ofs;
        ws.getColumn(c).width = 9;

        const kh = ws.getCell(2, c);
        if (ofs === 0) kh.value = kat.ad;
        kh.font = { bold: true, size: 9 };
        kh.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        kh.fill = dolgu(KATEGORI_RENK[kod] || 'FFEFEFEF');
        kh.border = kenarlik();

        const ah = ws.getCell(3, c);
        ah.value = ALAN_BASLIK[alan];
        ah.font = { bold: true, size: 8 };
        ah.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        ah.fill = dolgu(KATEGORI_RENK[kod] || 'FFEFEFEF');
        ah.border = kenarlik();

        isletmeler.forEach((isl, i) => {
          const hucre = ws.getCell(4 + i, c);
          const kayit = veri.get(isl.ad);
          hucre.value = kayit && kayit[alan] ? 'X' : null;
          hucre.alignment = { horizontal: 'center', vertical: 'middle' };
          hucre.font = { bold: true, size: 10 };
          hucre.border = kenarlik();
          if (kayit && kayit[alan + '_bekliyor']) hucre.fill = dolgu(KIRMIZI);
        });
      });

      if (kat.genislik > 1) ws.mergeCells(2, sutun, 2, sutun + kat.genislik - 1);
      sutun += kat.genislik;
    }

    if (sutun > blokBas) {
      ws.mergeCells(1, blokBas, 1, sutun - 1);
      const g = ws.getCell(1, blokBas);
      g.value = new Date(Date.UTC(yil, aySayi - 1, Number(tarih.slice(8, 10))));
      g.numFmt = 'dd.mm.yyyy';
      g.font = { bold: true, size: 11 };
      g.alignment = { horizontal: 'center', vertical: 'middle' };
      g.fill = dolgu('FFFFE699');
      g.border = kenarlik();
    }
  }

  ws.getRow(1).height = 22;
  ws.getRow(2).height = 34;
  ws.getRow(3).height = 34;

  await wb.xlsx.writeFile(yol);
  return { yol, gun: tumGunler.length, sutun: sutun - 1 };
}

function aylikDisaAktar(ay, yol) {
  return tabloDisaAktar(ay, yol, null);
}

function gunlukDisaAktar(tarih, yol) {
  return tabloDisaAktar(tarih.slice(0, 7), yol, tarih);
}

module.exports = { aylikDisaAktar, gunlukDisaAktar, AY_ADLARI };
