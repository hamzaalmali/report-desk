// Hamza ALMALI

'use strict';

function olustur() {
  let is = null;
  return {
    calisiyorMu() {
      return !!is;
    },
    basla() {
      is = { bekleyenler: [] };
    },
    ekle(sohbet) {
      if (!is || sohbet == null) return false;
      if (!is.bekleyenler.includes(sohbet)) is.bekleyenler.push(sohbet);
      return true;
    },
    bekleyenSayisi() {
      return is ? is.bekleyenler.length : 0;
    },
    async bitir(teslim) {
      const bekleyenler = is ? is.bekleyenler : [];
      is = null;
      let ulasan = 0;
      const hatalar = [];
      for (const sohbet of bekleyenler) {
        try {
          await teslim(sohbet);
          ulasan++;
        } catch (e) {
          hatalar.push({ sohbet, hata: e.message });
        }
      }
      return { toplam: bekleyenler.length, ulasan, hatalar };
    },
  };
}

module.exports = { olustur };
