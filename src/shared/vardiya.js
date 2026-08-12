// Hamza ALMALI

'use strict';

const SAATLER = {
  A: '07:00 - 15:00',
  B: '15:00 - 23:00',
  C: '23:00 - 07:00',
};

const KODLAR = [
  { kod: 'A', ad: 'A vardiyası', tip: 'vardiya' },
  { kod: 'B', ad: 'B vardiyası', tip: 'vardiya' },
  { kod: 'C', ad: 'C vardiyası', tip: 'vardiya' },
  { kod: 'R.T', ad: 'Resmî tatil', tip: 'izin' },
  { kod: 'Yİ', ad: 'Yıllık izin', tip: 'izin' },
  { kod: 'Sİ', ad: 'Sendikal izin', tip: 'izin' },
  { kod: 'Fİ', ad: 'Fazla çalışma izni', tip: 'izin' },
  { kod: '', ad: 'Boş', tip: 'bos' },
];

const ACIKLAMALAR = [
  'FAZLA ÇALIŞMA İZNİ : Fİ',
  'YILLIK İZİN : Yİ',
  'SENDİKAL İZİN : Sİ',
  'RESMİ TATİL : R.T',
];

const ESANLAM = {
  'A': 'A', 'B': 'B', 'C': 'C',
  'RT': 'R.T', 'R.T': 'R.T', 'R T': 'R.T', 'RESMİTATİL': 'R.T',
  'Yİ': 'Yİ', 'Y.İ': 'Yİ', 'YI': 'Yİ', 'YILLIKİZİN': 'Yİ',
  'Sİ': 'Sİ', 'S.İ': 'Sİ', 'SENDİKALİZİN': 'Sİ',
  'Fİ': 'Fİ', 'F.İ': 'Fİ', 'FAZLAÇALIŞMA': 'Fİ', 'FAZLAÇALIŞMAİZNİ': 'Fİ',
};

const VARDIYA_KODLARI = KODLAR.filter((k) => k.tip === 'vardiya').map((k) => k.kod);

function kodNormalle(ham, trUpper) {
  const metin = String(ham == null ? '' : ham).trim();
  if (!metin) return '';
  const sade = trUpper(metin).replace(/[\s]/g, '');
  if (ESANLAM[sade]) return ESANLAM[sade];
  const noktasiz = sade.replace(/\./g, '');
  if (ESANLAM[noktasiz]) return ESANLAM[noktasiz];
  return metin;
}

function gunSayisi(ay) {
  const [y, a] = String(ay).split('-').map(Number);
  return new Date(Date.UTC(y, a, 0)).getUTCDate();
}

function vardiyaListesi(ekip) {
  const ham = String((ekip && ekip.vardiyalar) || 'A,B');
  const liste = ham.split(',').map((v) => v.trim()).filter(Boolean);
  return liste.length ? liste : ['A', 'B'];
}

function saatBasligi(kod) {
  return SAATLER[kod] ? `${kod}: ${SAATLER[kod]}` : kod;
}

function gunlukSayim(kayitlar, vardiyalar, gun) {
  const sayim = {};
  for (const v of vardiyalar) sayim[v] = 0;
  for (const k of kayitlar) {
    if (k.gun === gun && sayim[k.kod] !== undefined) sayim[k.kod]++;
  }
  return sayim;
}

module.exports = {
  SAATLER, KODLAR, ACIKLAMALAR, VARDIYA_KODLARI,
  kodNormalle, gunSayisi, vardiyaListesi, saatBasligi, gunlukSayim,
};
