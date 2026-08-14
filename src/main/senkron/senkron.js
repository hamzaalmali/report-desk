// Hamza ALMALI

'use strict';

const {
  VARLIKLAR, isletmeHaritasi, kategoriHaritasi, personelHaritasi,
} = require('./varliklar');

const ESKI = '1970-01-01 00:00:00';

function haritalar(db) {
  return {
    isletme: isletmeHaritasi(db),
    kategori: kategoriHaritasi(db),
    ekip: (() => {
      const ileri = new Map();
      const geri = new Map();
      for (const r of db.all('SELECT id, ad FROM vardiya_ekip')) {
        ileri.set(r.ad, r.id);
        geri.set(r.id, r.ad);
      }
      return { ileri, geri };
    })(),
    personel: personelHaritasi(db),
  };
}

function silinenHarita(db, tur) {
  const h = new Map();
  for (const r of db.all('SELECT anahtar, zaman FROM silinen WHERE tur = :t', { ':t': tur })) {
    h.set(r.anahtar, r.zaman);
  }
  return h;
}

function silinenYaz(db, tur, anahtar, zaman) {
  db.run(
    `INSERT INTO silinen (tur, anahtar, zaman) VALUES (:t, :a, :z)
     ON CONFLICT(tur, anahtar) DO UPDATE SET zaman = excluded.zaman
     WHERE excluded.zaman > silinen.zaman`,
    { ':t': tur, ':a': anahtar, ':z': zaman }
  );
}

function enYeni(adaylar) {
  let kazanan = null;
  for (const a of adaylar) {
    if (!a || a.zaman == null) continue;
    if (!kazanan || a.zaman > kazanan.zaman) kazanan = a;
  }
  return kazanan;
}

function varlikEsitle(varlik, yerel, ortak, sayac) {
  const yerelH = haritalar(yerel);
  const ortakH = haritalar(ortak);

  const yerelSatir = new Map(varlik.oku(yerel).map((s) => [s.anahtar, s]));
  const ortakSatir = new Map(varlik.oku(ortak).map((s) => [s.anahtar, s]));
  const yerelSil = silinenHarita(yerel, varlik.tur);
  const ortakSil = silinenHarita(ortak, varlik.tur);

  const anahtarlar = new Set([
    ...yerelSatir.keys(), ...ortakSatir.keys(),
    ...yerelSil.keys(), ...ortakSil.keys(),
  ]);

  for (const anahtar of anahtarlar) {
    const y = yerelSatir.get(anahtar);
    const o = ortakSatir.get(anahtar);
    const ys = yerelSil.get(anahtar);
    const os = ortakSil.get(anahtar);

    const kazanan = enYeni([
      y && { tip: 'satir', zaman: y.guncelleme, kaynak: 'yerel', satir: y },
      o && { tip: 'satir', zaman: o.guncelleme, kaynak: 'ortak', satir: o },
      ys && { tip: 'silme', zaman: ys, kaynak: 'yerel' },
      os && { tip: 'silme', zaman: os, kaynak: 'ortak' },
    ]);
    if (!kazanan) continue;

    if (kazanan.tip === 'silme') {
      if (y) { varlik.sil(yerel, anahtar, yerelH); sayac.yerelSilinen++; }
      if (o) { varlik.sil(ortak, anahtar, ortakH); sayac.ortakSilinen++; }
      silinenYaz(yerel, varlik.tur, anahtar, kazanan.zaman);
      silinenYaz(ortak, varlik.tur, anahtar, kazanan.zaman);
      continue;
    }

    if (kazanan.kaynak === 'yerel') {
      if (!o || o.guncelleme < kazanan.zaman) {
        varlik.yaz(ortak, kazanan.satir, ortakH);
        sayac.gonderilen++;
      }
    } else if (!y || y.guncelleme < kazanan.zaman) {
      varlik.yaz(yerel, kazanan.satir, yerelH);
      sayac.alinan++;
    }
  }
}

function esitle(yerel, ortak) {
  const sayac = { gonderilen: 0, alinan: 0, yerelSilinen: 0, ortakSilinen: 0 };
  yerel.run('BEGIN');
  ortak.run('BEGIN');
  try {
    for (const varlik of VARLIKLAR) {
      varlikEsitle(varlik, yerel, ortak, sayac);
    }
    ortak.run('COMMIT');
    yerel.run('COMMIT');
  } catch (e) {
    try { ortak.run('ROLLBACK'); } catch { }
    try { yerel.run('ROLLBACK'); } catch { }
    throw e;
  }
  return sayac;
}

module.exports = { esitle, varlikEsitle, silinenYaz, ESKI };
