// Hamza ALMALI

'use strict';

const path = require('node:path');
const db = require('../db/db');
const { genisTabloOku } = require('./genisTablo');
const { key } = require('../../shared/tr');

async function gecmisiAktar(dosyalar, { uzerineYaz = true, siralamayiAl = true } = {}) {
  const sonuc = {
    dosyalar: [], toplamKayit: 0, gunler: [], yeniIsletmeler: [],
    siralandi: 0, uyarilar: [],
  };

  for (const dosya of dosyalar) {
    const okuma = await genisTabloOku(dosya);
    sonuc.uyarilar.push(...okuma.uyarilar);

    const islMap = db.isletmeHaritasi();
    const katMap = db.kategoriHaritasi();

    let siraSonu = Math.max(0, ...[...islMap.values()].map((i) => i.sira));
    for (const ad of okuma.isletmeler) {
      if (!islMap.has(key(ad))) {
        db.isletmeEkle(ad, ++siraSonu);
        sonuc.yeniIsletmeler.push(ad);
      }
    }
    const isl = db.isletmeHaritasi();

    if (siralamayiAl && okuma.isletmeler.length) {
      const idler = okuma.isletmeler
        .map((ad) => (isl.get(key(ad)) || {}).id)
        .filter(Boolean);
      sonuc.siralandi = db.isletmeSirala(idler);
    }

    const gunlerBuDosya = [...new Set(okuma.kayitlar.map((k) => k.tarih))].sort();

    db.islem(() => {
      if (uzerineYaz) for (const g of gunlerBuDosya) db.gunSil(g);

      const kayitlar = [];
      const gunKat = new Map();

      for (const k of okuma.kayitlar) {
        const i = isl.get(key(k.isletme));
        const kt = katMap.get(k.kategori);
        if (!i || !kt) continue;
        kayitlar.push({ ...k, isletme_id: i.id, kategori_id: kt.id });
        if (!gunKat.has(k.tarih)) gunKat.set(k.tarih, new Set());
        gunKat.get(k.tarih).add(kt.id);
      }

      sonuc.toplamKayit += db.kayitYaz(kayitlar);
      for (const [tarih, set] of gunKat) db.gunKategoriAc(tarih, [...set]);
      db.logYaz(null, 'gecmis-aktarim',
        `${path.basename(dosya)} → ${gunlerBuDosya.length} gün, ${kayitlar.length} kayıt`);
    });

    sonuc.dosyalar.push({ dosya: path.basename(dosya), gun: gunlerBuDosya.length });
    sonuc.gunler.push(...gunlerBuDosya);
  }

  sonuc.gunler = [...new Set(sonuc.gunler)].sort();
  return sonuc;
}

module.exports = { gecmisiAktar };
