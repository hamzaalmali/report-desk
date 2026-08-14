// Hamza ALMALI

'use strict';

const crypto = require('node:crypto');

const DUZ = 0;
const YEREL = 1;
const ORTAK = 2;

let ortakAnahtarSaglayici = () => null;

function kur(saglayici) {
  ortakAnahtarSaglayici = typeof saglayici === 'function' ? saglayici : () => null;
}

function ortakAnahtar() {
  try {
    const a = ortakAnahtarSaglayici();
    return a && a.length === 32 ? a : null;
  } catch {
    return null;
  }
}

function motor() {
  try {
    const { safeStorage } = require('electron');
    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function'
        && safeStorage.isEncryptionAvailable()) {
      return safeStorage;
    }
  } catch { }
  return null;
}

function kullanilabilir() {
  return !!motor() || !!ortakAnahtar();
}

function ortakSifrele(anahtar, metin) {
  const iv = crypto.randomBytes(12);
  const sifreleyici = crypto.createCipheriv('aes-256-gcm', anahtar, iv);
  const govde = Buffer.concat([sifreleyici.update(metin, 'utf8'), sifreleyici.final()]);
  return Buffer.concat([iv, sifreleyici.getAuthTag(), govde]).toString('base64');
}

function ortakCoz(anahtar, deger) {
  const ham = Buffer.from(deger, 'base64');
  const cozucu = crypto.createDecipheriv('aes-256-gcm', anahtar, ham.subarray(0, 12));
  cozucu.setAuthTag(ham.subarray(12, 28));
  return Buffer.concat([cozucu.update(ham.subarray(28)), cozucu.final()]).toString('utf8');
}

function sifrele(metin) {
  const m = String(metin == null ? '' : metin);
  if (!m) return { deger: '', sifreli: DUZ };

  const ortak = ortakAnahtar();
  if (ortak) {
    try { return { deger: ortakSifrele(ortak, m), sifreli: ORTAK }; } catch { }
  }

  const s = motor();
  if (s) {
    try { return { deger: s.encryptString(m).toString('base64'), sifreli: YEREL }; } catch { }
  }
  return { deger: m, sifreli: DUZ };
}

function coz(deger, sifreli) {
  const d = String(deger == null ? '' : deger);
  if (!d) return '';
  const s = Number(sifreli) || DUZ;

  if (s === DUZ) return d;

  if (s === ORTAK) {
    const anahtar = ortakAnahtar();
    if (!anahtar) throw new Error('Ortak klasördeki anahtar dosyasına ulaşılamadı.');
    return ortakCoz(anahtar, d);
  }

  const m = motor();
  if (!m) throw new Error('Kayıtlı şifre bu bilgisayarda çözülemedi.');
  return m.decryptString(Buffer.from(d, 'base64'));
}

function paylasilirMi(sifreli) {
  return Number(sifreli) !== YEREL;
}

module.exports = { kur, sifrele, coz, kullanilabilir, paylasilirMi, DUZ, YEREL, ORTAK };
