// Hamza ALMALI

'use strict';

function motor() {
  try {
    const { safeStorage } = require('electron');
    if (safeStorage && safeStorage.isEncryptionAvailable()) return safeStorage;
  } catch { }
  return null;
}

function kullanilabilir() {
  return !!motor();
}

function sifrele(metin) {
  const m = String(metin == null ? '' : metin);
  if (!m) return { deger: '', sifreli: 0 };
  const s = motor();
  if (!s) return { deger: m, sifreli: 0 };
  try {
    return { deger: s.encryptString(m).toString('base64'), sifreli: 1 };
  } catch {
    return { deger: m, sifreli: 0 };
  }
}

function coz(deger, sifreli) {
  const d = String(deger == null ? '' : deger);
  if (!d || !sifreli) return d;
  const s = motor();
  if (!s) throw new Error('Kayıtlı şifre bu bilgisayarda çözülemedi.');
  return s.decryptString(Buffer.from(d, 'base64'));
}

module.exports = { sifrele, coz, kullanilabilir };
