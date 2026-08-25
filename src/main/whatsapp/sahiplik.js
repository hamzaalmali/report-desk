// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOSYA = 'sahip.json';
const TAZELIK = 5 * 60 * 1000;

function yol(klasor) {
  return path.join(klasor, DOSYA);
}

function oku(klasor) {
  try {
    const k = JSON.parse(fs.readFileSync(yol(klasor), 'utf8'));
    if (k && k.makine) return k;
  } catch { }
  return null;
}

const SAPMA_SINIRI = 2 * 60 * 1000;

function durum(klasor, ben) {
  const k = oku(klasor);
  if (!k) {
    return { sahip: null, benMiyim: false, taze: false, dakika: null, bos: true, sapma: false };
  }
  const gecen = Date.now() - (k.zaman || 0);
  const taze = gecen < TAZELIK;
  return {
    sahip: k.makine,
    benMiyim: k.makine === ben,
    taze,
    dakika: Math.max(0, Math.round(gecen / 60000)),
    bos: !taze,
    sapma: gecen < -SAPMA_SINIRI,
  };
}

function alinabilirMi(klasor, ben) {
  const d = durum(klasor, ben);
  return d.bos || d.benMiyim;
}

function al(klasor, ben) {
  fs.mkdirSync(klasor, { recursive: true });
  const hedef = yol(klasor);
  const icerik = JSON.stringify({ makine: ben, zaman: Date.now() });
  const gecici = `${hedef}.${process.pid}.yeni`;
  try {
    fs.writeFileSync(gecici, icerik);
    fs.renameSync(gecici, hedef);
  } catch {
    try { fs.unlinkSync(gecici); } catch { }
    fs.writeFileSync(hedef, icerik);
  }
  return durum(klasor, ben);
}

function tazele(klasor, ben) {
  const d = durum(klasor, ben);
  if (!d.benMiyim && d.taze) return d;
  return al(klasor, ben);
}

function birak(klasor, ben) {
  const d = durum(klasor, ben);
  if (d.benMiyim) {
    try { fs.unlinkSync(yol(klasor)); } catch { }
  }
  return durum(klasor, ben);
}

module.exports = { durum, alinabilirMi, al, tazele, birak, TAZELIK, SAPMA_SINIRI, DOSYA };
