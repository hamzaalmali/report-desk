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

function numaraDuzelt(ham) {
  return numaralariCoz(ham)[0] || '';
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
  {
    kod: 'rapor',
    tam: ['RAPOR', 'RAPORGÖNDER', 'RAPORAL', 'RAPORİNDİR', 'RAPORÇEK'],
    onEk: ['RAPORGÖNDER', 'RAPORAL', 'RAPORİNDİR', 'RAPORÇEK'],
    ozelSohbet: true,
    servis: 'rapor',
    calistir: (b) => b.servisler.rapor(b),
  },
  {
    kod: 'bina',
    tam: ['BİNA', 'BİNAGÖNDER', 'BİNATİPİ', 'BİNATİPİOSOS', 'OSOSGÖNDER', 'BİNATİPİOSOSGÖNDER'],
    onEk: ['BİNAGÖNDER', 'BİNATİPİOSOS', 'BİNATİPİ', 'OSOSGÖNDER'],
    ozelSohbet: true,
    servis: 'bina',
    calistir: (b) => b.servisler.bina(b),
  },
  {
    kod: 'tablo',
    tam: ['TABLO', 'TABLOGÖNDER', 'TABLOAL', 'TABLOHAZIRLA', 'KESİNTİTABLOSU'],
    onEk: ['TABLOGÖNDER', 'TABLOHAZIRLA', 'KESİNTİTABLOSU'],
    ozelSohbet: true,
    servis: 'tablo',
    calistir: (b) => b.servisler.tablo(b),
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

function olustur({ izinliler, log, servisler = {}, ekIzin = () => false }) {
  const yaz = log || (() => { });

  return async function isle(baglam) {
    const { gonderen, metin, grupMu } = baglam;
    const komut = komutBul(metin);
    if (!komut) return null;

    const liste = numaralariCoz(izinliler());
    if (!liste.includes(gonderen) && !ekIzin(gonderen, komut.kod)) {
      yaz(`WhatsApp komutu yok sayıldı (${komut.kod}): ${gonderen} izinli listede değil`);
      return null;
    }

    if (komut.ozelSohbet && grupMu) {
      yaz(`WhatsApp komutu yok sayıldı (${komut.kod}): grup sohbetinde çalışmaz`);
      return null;
    }

    if (komut.servis && typeof servisler[komut.servis] !== 'function') {
      yaz(`WhatsApp komutu karşılanamadı (${komut.kod}): servis bağlı değil`);
      return 'Bu komut bu bilgisayarda kullanıma açık değil.';
    }

    yaz(`WhatsApp komutu: ${gonderen} → ${komut.kod}`);
    try {
      return await komut.calistir({ ...baglam, servisler });
    } catch (e) {
      yaz(`WhatsApp komutu başarısız (${komut.kod}): ${e.message}`);
      return `İstek karşılanamadı: ${e.message}`;
    }
  };
}

module.exports = {
  olustur, komutBul, numaralariCoz, numaraDuzelt, anahtar, KOMUTLAR, VARSAYILAN_NUMARALAR,
};
