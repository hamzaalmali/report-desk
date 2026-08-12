// Hamza ALMALI

'use strict';

const path = require('node:path');
const ExcelJS = require('exceljs');
const db = require('../db/db');
const { key, trUpper } = require('../../shared/tr');
const { kodNormalle, gunSayisi, VARDIYA_KODLARI } = require('../../shared/vardiya');
const { hucreMetni } = require('./genisTablo');
const { AY_ADLARI } = require('../export/excelDisaAktar');

function ayCoz(sayfaAdi, varsayilanYil) {
  const k = trUpper(sayfaAdi);
  const ix = AY_ADLARI.findIndex((a) => k.includes(a));
  if (ix < 0) return null;
  const y = k.match(/(20\d{2})/);
  const yil = y ? Number(y[1]) : varsayilanYil;
  return `${yil}-${String(ix + 1).padStart(2, '0')}`;
}

// Gün numaraları satırı: B'den itibaren 1,2,3… diye giden satır. Blokların çapası bu.
function gunSatiriMi(ws, r, beklenenGun) {
  const ilk = hucreMetni(ws.getCell(r, 2));
  if (ilk !== '1') return 0;
  let n = 0;
  for (let c = 2; c <= ws.columnCount; c++) {
    if (hucreMetni(ws.getCell(r, c)) === String(c - 1)) n++;
    else break;
  }
  return n >= Math.min(28, beklenenGun) ? n : 0;
}

function bloklariBul(ws, gun) {
  const bloklar = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const genislik = gunSatiriMi(ws, r, gun);
    if (!genislik) continue;
    const ad = hucreMetni(ws.getCell(r, 1))
      || hucreMetni(ws.getCell(r - 1, 1))
      || `EKİP ${bloklar.length + 1}`;
    bloklar.push({ ad, gunSatiri: r, genislik });
  }
  return bloklar;
}

async function vardiyaIceAktar(dosyalar, { uzerineYaz = true } = {}) {
  const sonuc = { dosyalar: [], aylar: [], ekipler: [], personel: 0, kayit: 0, uyarilar: [], farkli: [] };

  for (const dosya of dosyalar) {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.readFile(dosya);
    } catch (e) {
      sonuc.uyarilar.push(`${path.basename(dosya)} okunamadı: ${e.message}`);
      continue;
    }

    const dosyaYili = (path.basename(dosya).match(/(20\d{2})/) || [])[1];
    const varsayilanYil = Number(dosyaYili) || new Date().getUTCFullYear();

    for (const ws of wb.worksheets) {
      if (ws.state === 'veryHidden') continue;
      const ay = ayCoz(ws.name, varsayilanYil);
      if (!ay) { sonuc.uyarilar.push(`"${ws.name}" sayfasından ay çıkarılamadı, atlandı.`); continue; }

      const gun = gunSayisi(ay);
      const bloklar = bloklariBul(ws, gun);
      if (!bloklar.length) {
        sonuc.uyarilar.push(`"${ws.name}": gün numarası satırı bulunamadı, atlandı.`);
        continue;
      }

      db.islem(() => {
        if (uzerineYaz) db.vardiyaAySil(ay);

        for (const blok of bloklar) {
          const ekip = db.vardiyaEkipEkle(blok.ad);
          if (!sonuc.ekipler.includes(ekip.ad)) sonuc.ekipler.push(ekip.ad);

          const kullanilan = new Set();
          const yazilacak = [];

          for (let r = blok.gunSatiri + 1; r <= ws.rowCount; r++) {
            const ad = hucreMetni(ws.getCell(r, 1));
            if (!ad) continue;
            if (key(ad) === 'SAAT' || key(ad).startsWith('SAAT')) break;

            const mevcut = db.vardiyaPersoneller(ekip.id).find((p) => key(p.ad) === key(ad));
            const personel = mevcut || db.vardiyaPersonelEkle(ekip.id, ad);
            if (!mevcut) sonuc.personel++;

            for (let g = 1; g <= Math.min(gun, blok.genislik); g++) {
              const kod = kodNormalle(hucreMetni(ws.getCell(r, g + 1)), trUpper);
              if (!kod) continue;
              kullanilan.add(kod);
              yazilacak.push({ ay, personel_id: personel.id, gun: g, kod });
            }
          }

          const vardiyalar = VARDIYA_KODLARI.filter((v) => kullanilan.has(v));
          if (vardiyalar.length) db.vardiyaEkipGuncelle(ekip.id, { vardiyalar: vardiyalar.join(',') });

          sonuc.kayit += db.vardiyaTopluYaz(yazilacak);
          for (const k of kullanilan) {
            if (!VARDIYA_KODLARI.includes(k) && !['R.T', 'Yİ', 'Sİ', 'Fİ'].includes(k)
              && !sonuc.farkli.includes(k)) sonuc.farkli.push(k);
          }
        }
      });

      if (!sonuc.aylar.includes(ay)) sonuc.aylar.push(ay);
    }

    sonuc.dosyalar.push(path.basename(dosya));
  }

  sonuc.aylar.sort();
  db.logYaz(null, 'vardiya-aktarim',
    `${sonuc.dosyalar.join(', ')} → ${sonuc.aylar.length} ay, ${sonuc.kayit} kayıt`);
  return sonuc;
}

module.exports = { vardiyaIceAktar, ayCoz, bloklariBul };
