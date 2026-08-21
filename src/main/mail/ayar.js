// Hamza ALMALI

'use strict';

const ALANLAR = [
  { anahtar: 'mailSunucu', ad: 'sunucu', tur: 'metin', varsayilan: 'imap.gmail.com' },
  { anahtar: 'mailPort', ad: 'port', tur: 'sayi', varsayilan: 993, enAz: 1 },
  { anahtar: 'mailGuvenli', ad: 'guvenli', tur: 'evet', varsayilan: true },
  { anahtar: 'mailKullanici', ad: 'kullanici', tur: 'metin', varsayilan: '' },
  { anahtar: 'mailKlasor', ad: 'klasor', tur: 'metin', varsayilan: 'INBOX' },
];

const YEREL_ALAN = 'mailYedekKlasor';

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
  a.yedekKlasor = db.ayarOku(YEREL_ALAN, '') || '';
  return a;
}

function yaz(db, gelen) {
  for (const f of ALANLAR) {
    if (!Object.prototype.hasOwnProperty.call(gelen, f.ad)) continue;
    const d = gelen[f.ad];
    db.ortakAyarYaz(f.anahtar,
      f.tur === 'evet' ? (d ? '1' : '0') : String(d == null ? '' : d).trim());
  }
  if (Object.prototype.hasOwnProperty.call(gelen, 'yedekKlasor')) {
    db.ayarYaz(YEREL_ALAN, String(gelen.yedekKlasor == null ? '' : gelen.yedekKlasor).trim());
  }
  return oku(db);
}

function dogrula(a, sifreVar) {
  const eksik = [];
  if (!a.sunucu) eksik.push('IMAP sunucusu');
  if (!a.kullanici) eksik.push('e-posta adresi');
  if (!sifreVar) eksik.push('uygulama şifresi');
  return eksik;
}

function silmeyeHazir(a, sifreVar) {
  const eksik = dogrula(a, sifreVar);
  if (!a.yedekKlasor) eksik.push('yedek klasörü');
  return eksik;
}

module.exports = { oku, yaz, dogrula, silmeyeHazir, ALANLAR, YEREL_ALAN };
