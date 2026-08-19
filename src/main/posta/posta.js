// Hamza ALMALI

'use strict';

const path = require('node:path');

const ALANLAR = [
  { anahtar: 'postaSunucu', ad: 'sunucu', tur: 'metin', varsayilan: '' },
  { anahtar: 'postaPort', ad: 'port', tur: 'sayi', varsayilan: 587, enAz: 1 },
  { anahtar: 'postaGuvenli', ad: 'guvenli', tur: 'evet', varsayilan: false },
  { anahtar: 'postaKullanici', ad: 'kullanici', tur: 'metin', varsayilan: '' },
  { anahtar: 'postaGonderen', ad: 'gonderen', tur: 'metin', varsayilan: '' },
  { anahtar: 'postaAlicilar', ad: 'alicilar', tur: 'metin', varsayilan: '' },
  { anahtar: 'postaTabloGonder', ad: 'tabloGonder', tur: 'evet', varsayilan: true },
];

function coz(tur, deger, varsayilan, enAz) {
  if (deger == null || deger === '') return varsayilan;
  if (tur === 'sayi') {
    const s = Number(deger);
    if (!Number.isFinite(s)) return varsayilan;
    return enAz == null ? s : Math.max(enAz, s);
  }
  if (tur === 'evet') return String(deger) === '1' || deger === true;
  return String(deger);
}

function oku(db) {
  const a = {};
  for (const f of ALANLAR) {
    a[f.ad] = coz(f.tur, db.ortakAyarOku(f.anahtar), f.varsayilan, f.enAz);
  }
  return a;
}

function yaz(db, gelen) {
  for (const f of ALANLAR) {
    if (!Object.prototype.hasOwnProperty.call(gelen, f.ad)) continue;
    const d = gelen[f.ad];
    db.ortakAyarYaz(f.anahtar,
      f.tur === 'evet' ? (d ? '1' : '0') : String(d == null ? '' : d).trim());
  }
  return oku(db);
}

function alicilariCoz(metin) {
  return String(metin || '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
}

function dogrula(a) {
  const eksik = [];
  if (!a.sunucu) eksik.push('giden posta sunucusu');
  if (!alicilariCoz(a.alicilar).length) eksik.push('alıcı adresi');
  return eksik;
}

function hazirMi(a) {
  return dogrula(a).length === 0;
}

async function gonder({ ayar, sifre, konu, metin, dosyalar = [] }) {
  const eksik = dogrula(ayar);
  if (eksik.length) throw new Error(`E-posta ayarları eksik: ${eksik.join(', ')}.`);

  const nodemailer = require('nodemailer');
  const alicilar = alicilariCoz(ayar.alicilar);
  const tasiyici = nodemailer.createTransport({
    host: ayar.sunucu,
    port: ayar.port,
    secure: !!ayar.guvenli,
    auth: ayar.kullanici ? { user: ayar.kullanici, pass: sifre || '' } : undefined,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 120000,
    tls: { minVersion: 'TLSv1.2' },
  });
  try {
    await tasiyici.sendMail({
      from: ayar.gonderen || ayar.kullanici,
      to: alicilar.join(', '),
      subject: konu,
      text: metin,
      attachments: dosyalar.map((d) => ({
        filename: d.ad || path.basename(d.dosya),
        path: d.dosya,
      })),
    });
  } finally {
    try { tasiyici.close(); } catch { }
  }
  return { alicilar };
}

module.exports = { oku, yaz, dogrula, hazirMi, alicilariCoz, gonder, ALANLAR };
