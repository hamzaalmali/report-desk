// Hamza ALMALI

'use strict';

const { trUpper } = require('../../shared/tr');
const mgm = require('../hava/mgm');

const VARSAYILAN_NUMARALAR = '905388179495';

function numaralariCoz(ham) {
  return String(ham || '')
    .split(/[,;\n]+/)
    .map((n) => n.replace(/\D/g, ''))
    .filter(Boolean)
    .map((n) => {
      const t = n.replace(/^0+/, '');
      return t.length === 10 ? '90' + t : t;
    });
}

function anahtar(metin) {
  return trUpper(metin).replace(/[\s.\-_?!]/g, '');
}

const KOMUTLAR = [
  {
    kod: 'hava',
    tam: ['HAVA', 'HAVADURUMU', 'HAVADURUMUNEDİR'],
    onEk: ['HAVADURUMU'],
    calistir: () => mgm.havaMetni(),
  },
];

function komutBul(metin) {
  const k = anahtar(metin);
  if (!k) return null;
  for (const c of KOMUTLAR) {
    if ((c.tam || []).includes(k)) return c;
    if ((c.onEk || []).some((d) => k.startsWith(d))) return c;
  }
  return null;
}

function olustur({ izinliler, log }) {
  const yaz = log || (() => { });

  return async function isle({ gonderen, metin }) {
    const liste = numaralariCoz(izinliler());
    if (!liste.includes(gonderen)) return null;

    const komut = komutBul(metin);
    if (!komut) return null;

    yaz(`WhatsApp komutu: ${gonderen} → ${komut.kod}`);
    try {
      return await komut.calistir();
    } catch (e) {
      yaz(`WhatsApp komutu başarısız (${komut.kod}): ${e.message}`);
      return `İstek karşılanamadı: ${e.message}`;
    }
  };
}

module.exports = { olustur, komutBul, numaralariCoz, VARSAYILAN_NUMARALAR };
