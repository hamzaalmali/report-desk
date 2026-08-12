// Hamza ALMALI

'use strict';

function trUpper(s) {
  return String(s == null ? '' : s)
    .normalize('NFC')
    .replace(/i/g, 'İ')
    .replace(/ı/g, 'I')
    .replace(/ş/g, 'Ş')
    .replace(/ğ/g, 'Ğ')
    .replace(/ü/g, 'Ü')
    .replace(/ö/g, 'Ö')
    .replace(/ç/g, 'Ç')
    .toUpperCase();
}

function key(s) {
  return trUpper(String(s == null ? '' : s).trim()).replace(/[\s.\-_()/\r\n\t]/g, '');
}

function isBlank(v) {
  return v == null || String(v).trim() === '';
}

function altDiziMi(kisa, uzun) {
  if (!kisa || kisa.length >= uzun.length) return false;
  let i = 0;
  for (const h of uzun) {
    if (h === kisa[i]) i++;
    if (i === kisa.length) return true;
  }
  return false;
}

function uzaklik(a, b) {
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let onceki = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const simdi = [i];
    for (let j = 1; j <= n; j++) {
      simdi[j] = Math.min(
        onceki[j] + 1,
        simdi[j - 1] + 1,
        onceki[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    onceki = simdi;
  }
  return onceki[n];
}

function enYakin(deger, adaylar) {
  const k = key(deger);
  if (!k) return null;
  let enIyi = null;

  const dene = (aday, puan, neden) => {
    if (puan > 0 && (!enIyi || puan > enIyi.puan)) enIyi = { aday, puan, neden };
  };

  for (const aday of adaylar) {
    const a = key(aday.ad);
    if (!a) continue;
    if (a === k) { dene(aday, 100, 'birebir'); continue; }
    if (a.includes(k) || k.includes(a)) { dene(aday, 80, 'içeriyor'); continue; }
    if (altDiziMi(a, k) || altDiziMi(k, a)) { dene(aday, 70, 'kısaltma'); continue; }
    const u = uzaklik(a, k);
    const oran = 1 - u / Math.max(a.length, k.length);
    if (oran >= 0.72) dene(aday, Math.round(oran * 60), 'benzer yazım');
  }
  return enIyi;
}

module.exports = { trUpper, key, isBlank, enYakin, altDiziMi, uzaklik };
