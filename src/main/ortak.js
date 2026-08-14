// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const VARLIK_DOSYASI = 'kim.json';
const VARLIK_TAZELIK = 15 * 60 * 1000;
const ARALIKLAR = [5, 10, 15, 30];
const VARSAYILAN_ARALIK = 10;

let yapilandirmaYolu = null;

function kur(userDataKlasoru) {
  yapilandirmaYolu = path.join(userDataKlasoru, 'yapilandirma.json');
}

function oku() {
  try {
    return JSON.parse(fs.readFileSync(yapilandirmaYolu, 'utf8')) || {};
  } catch {
    return {};
  }
}

function yaz(nesne) {
  const gecici = yapilandirmaYolu + '.yeni';
  fs.writeFileSync(gecici, JSON.stringify(nesne, null, 2));
  fs.renameSync(gecici, yapilandirmaYolu);
  return nesne;
}

function ortakDosya() {
  const y = oku().ortakDosya;
  return y && String(y).trim() ? String(y) : null;
}

function ortakAyarla(yol) {
  const c = oku();
  c.ortakDosya = yol;
  yaz(c);
  return yol;
}

function ortakKaldir() {
  const c = oku();
  delete c.ortakDosya;
  yaz(c);
}

function aralikDk() {
  const d = Number(oku().aralikDk);
  return ARALIKLAR.includes(d) ? d : VARSAYILAN_ARALIK;
}

function aralikYaz(dk) {
  const d = Number(dk);
  if (!ARALIKLAR.includes(d)) throw new Error('Geçersiz aralık.');
  const c = oku();
  c.aralikDk = d;
  yaz(c);
  return d;
}

function sonEsitleme() {
  return oku().sonEsitleme || null;
}

function sonEsitlemeYaz(kayit) {
  const c = oku();
  c.sonEsitleme = kayit;
  yaz(c);
  return kayit;
}

function makineAdi() {
  try {
    return os.hostname() || 'bilinmeyen';
  } catch {
    return 'bilinmeyen';
  }
}

function varlikYolu(dosya) {
  return path.join(path.dirname(dosya), VARLIK_DOSYASI);
}

function varlikOku(dosya) {
  try {
    const h = JSON.parse(fs.readFileSync(varlikYolu(dosya), 'utf8'));
    return Array.isArray(h) ? h : [];
  } catch {
    return [];
  }
}

function varlikBildir(dosya, surum) {
  const ben = makineAdi();
  const liste = varlikOku(dosya).filter((k) => k && k.makine && k.makine !== ben);
  liste.push({ makine: ben, surum: surum || '', zaman: Date.now() });
  try {
    const hedef = varlikYolu(dosya);
    const gecici = `${hedef}.${process.pid}.yeni`;
    fs.writeFileSync(gecici, JSON.stringify(liste));
    fs.renameSync(gecici, hedef);
  } catch { }
  return liste;
}

function kimler(dosya) {
  const simdi = Date.now();
  const ben = makineAdi();
  return varlikOku(dosya)
    .filter((k) => k && k.makine && simdi - (k.zaman || 0) < VARLIK_TAZELIK)
    .map((k) => ({
      makine: k.makine,
      surum: k.surum || '',
      benMiyim: k.makine === ben,
      dakika: Math.max(0, Math.round((simdi - (k.zaman || 0)) / 60000)),
    }))
    .sort((a, b) => a.makine.localeCompare(b.makine, 'tr'));
}

module.exports = {
  kur, oku, yaz, ortakDosya, ortakAyarla, ortakKaldir,
  aralikDk, aralikYaz, sonEsitleme, sonEsitlemeYaz,
  makineAdi, varlikBildir, kimler,
  ARALIKLAR, VARSAYILAN_ARALIK,
};
