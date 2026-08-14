// Hamza ALMALI

'use strict';

const AYRAC = '\u001f';

function anahtarla(...parcalar) {
  return parcalar.map((p) => String(p == null ? '' : p)).join(AYRAC);
}

function isletmeHaritasi(db) {
  const ileri = new Map();
  const geri = new Map();
  for (const r of db.all('SELECT id, ad FROM isletme')) {
    ileri.set(r.ad, r.id);
    geri.set(r.id, r.ad);
  }
  return { ileri, geri };
}

function kategoriHaritasi(db) {
  const ileri = new Map();
  const geri = new Map();
  for (const r of db.all('SELECT id, kod FROM kategori')) {
    ileri.set(r.kod, r.id);
    geri.set(r.id, r.kod);
  }
  return { ileri, geri };
}

function personelHaritasi(db) {
  const ileri = new Map();
  const geri = new Map();
  const sorgu = `SELECT p.id, p.ad, e.ad AS ekip FROM vardiya_personel p
                 JOIN vardiya_ekip e ON e.id = p.ekip_id`;
  for (const r of db.all(sorgu)) {
    const a = anahtarla(r.ekip, r.ad);
    ileri.set(a, r.id);
    geri.set(r.id, a);
  }
  return { ileri, geri };
}

const KAYIT_ALANLARI = [
  'ariza_var', 'donus_saglandi', 'tutanak_gerekli', 'tutanak_eklendi',
  'ariza_var_bekliyor', 'donus_saglandi_bekliyor',
  'tutanak_gerekli_bekliyor', 'tutanak_eklendi_bekliyor',
];

const VARLIKLAR = [
  {
    tur: 'isletme',
    oku(db) {
      return db.all('SELECT ad, sira, aktif, guncelleme FROM isletme').map((r) => ({
        anahtar: anahtarla(r.ad),
        guncelleme: r.guncelleme,
        veri: { ad: r.ad, sira: r.sira, aktif: r.aktif },
      }));
    },
    yaz(db, s) {
      db.run(
        `INSERT INTO isletme (ad, sira, aktif, guncelleme) VALUES (:ad, :sira, :aktif, :g)
         ON CONFLICT(ad) DO UPDATE SET sira = excluded.sira, aktif = excluded.aktif,
           guncelleme = excluded.guncelleme`,
        { ':ad': s.veri.ad, ':sira': s.veri.sira, ':aktif': s.veri.aktif, ':g': s.guncelleme }
      );
    },
    sil(db, anahtar) {
      db.run('DELETE FROM isletme WHERE ad = :ad', { ':ad': anahtar });
    },
  },

  {
    tur: 'eslesme',
    oku(db) {
      const sorgu = `SELECT e.kaynak_deger, e.tip, e.guncelleme, i.ad AS isletme
                     FROM eslesme e JOIN isletme i ON i.id = e.isletme_id`;
      return db.all(sorgu).map((r) => ({
        anahtar: anahtarla(r.kaynak_deger, r.tip),
        guncelleme: r.guncelleme,
        veri: { kaynak: r.kaynak_deger, tip: r.tip, isletme: r.isletme },
      }));
    },
    yaz(db, s, h) {
      const isl = h.isletme.ileri.get(s.veri.isletme);
      if (!isl) return;
      db.run(
        `INSERT INTO eslesme (kaynak_deger, isletme_id, tip, guncelleme)
         VALUES (:k, :i, :t, :g)
         ON CONFLICT(kaynak_deger, tip) DO UPDATE SET isletme_id = excluded.isletme_id,
           guncelleme = excluded.guncelleme`,
        { ':k': s.veri.kaynak, ':i': isl, ':t': s.veri.tip, ':g': s.guncelleme }
      );
    },
    sil(db, anahtar) {
      const [kaynak, tip] = anahtar.split(AYRAC);
      db.run('DELETE FROM eslesme WHERE kaynak_deger = :k AND tip = :t',
        { ':k': kaynak, ':t': tip });
    },
  },

  {
    tur: 'gun_kategori',
    oku(db) {
      const sorgu = `SELECT g.tarih, g.guncelleme, k.kod FROM gun_kategori g
                     JOIN kategori k ON k.id = g.kategori_id`;
      return db.all(sorgu).map((r) => ({
        anahtar: anahtarla(r.tarih, r.kod),
        guncelleme: r.guncelleme,
        veri: { tarih: r.tarih, kod: r.kod },
      }));
    },
    yaz(db, s, h) {
      const kat = h.kategori.ileri.get(s.veri.kod);
      if (!kat) return;
      db.run(
        `INSERT INTO gun_kategori (tarih, kategori_id, guncelleme) VALUES (:t, :k, :g)
         ON CONFLICT(tarih, kategori_id) DO UPDATE SET guncelleme = excluded.guncelleme`,
        { ':t': s.veri.tarih, ':k': kat, ':g': s.guncelleme }
      );
    },
    sil(db, anahtar, h) {
      const [tarih, kod] = anahtar.split(AYRAC);
      const kat = h.kategori.ileri.get(kod);
      if (!kat) return;
      db.run('DELETE FROM gun_kategori WHERE tarih = :t AND kategori_id = :k',
        { ':t': tarih, ':k': kat });
    },
  },

  {
    tur: 'kayit',
    oku(db) {
      const sorgu = `SELECT k.tarih, k.guncelleme, k.aciklama, i.ad AS isletme, kt.kod,
                            ${KAYIT_ALANLARI.map((a) => 'k.' + a).join(', ')}
                     FROM kayit k
                     JOIN isletme i ON i.id = k.isletme_id
                     JOIN kategori kt ON kt.id = k.kategori_id`;
      return db.all(sorgu).map((r) => {
        const veri = { tarih: r.tarih, isletme: r.isletme, kod: r.kod, aciklama: r.aciklama };
        for (const a of KAYIT_ALANLARI) veri[a] = r[a];
        return { anahtar: anahtarla(r.tarih, r.isletme, r.kod), guncelleme: r.guncelleme, veri };
      });
    },
    yaz(db, s, h) {
      const isl = h.isletme.ileri.get(s.veri.isletme);
      const kat = h.kategori.ileri.get(s.veri.kod);
      if (!isl || !kat) return;
      const p = {
        ':t': s.veri.tarih, ':i': isl, ':k': kat,
        ':a': s.veri.aciklama == null ? null : s.veri.aciklama, ':g': s.guncelleme,
      };
      for (const a of KAYIT_ALANLARI) p[':' + a] = s.veri[a];
      db.run(
        `INSERT INTO kayit (tarih, isletme_id, kategori_id, aciklama, guncelleme,
                            ${KAYIT_ALANLARI.join(', ')})
         VALUES (:t, :i, :k, :a, :g, ${KAYIT_ALANLARI.map((a) => ':' + a).join(', ')})
         ON CONFLICT(tarih, isletme_id, kategori_id) DO UPDATE SET
           aciklama = excluded.aciklama, guncelleme = excluded.guncelleme,
           ${KAYIT_ALANLARI.map((a) => `${a} = excluded.${a}`).join(', ')}`,
        p
      );
    },
    sil(db, anahtar, h) {
      const [tarih, isletme, kod] = anahtar.split(AYRAC);
      const isl = h.isletme.ileri.get(isletme);
      const kat = h.kategori.ileri.get(kod);
      if (!isl || !kat) return;
      db.run('DELETE FROM kayit WHERE tarih = :t AND isletme_id = :i AND kategori_id = :k',
        { ':t': tarih, ':i': isl, ':k': kat });
    },
  },

  {
    tur: 'vardiya_ekip',
    oku(db) {
      return db.all('SELECT ad, vardiyalar, sira, guncelleme FROM vardiya_ekip').map((r) => ({
        anahtar: anahtarla(r.ad),
        guncelleme: r.guncelleme,
        veri: { ad: r.ad, vardiyalar: r.vardiyalar, sira: r.sira },
      }));
    },
    yaz(db, s) {
      db.run(
        `INSERT INTO vardiya_ekip (ad, vardiyalar, sira, guncelleme) VALUES (:a, :v, :s, :g)
         ON CONFLICT(ad) DO UPDATE SET vardiyalar = excluded.vardiyalar,
           sira = excluded.sira, guncelleme = excluded.guncelleme`,
        { ':a': s.veri.ad, ':v': s.veri.vardiyalar, ':s': s.veri.sira, ':g': s.guncelleme }
      );
    },
    sil(db, anahtar) {
      db.run('DELETE FROM vardiya_ekip WHERE ad = :a', { ':a': anahtar });
    },
  },

  {
    tur: 'vardiya_personel',
    oku(db) {
      const sorgu = `SELECT p.ad, p.sira, p.aktif, p.guncelleme, e.ad AS ekip
                     FROM vardiya_personel p JOIN vardiya_ekip e ON e.id = p.ekip_id`;
      return db.all(sorgu).map((r) => ({
        anahtar: anahtarla(r.ekip, r.ad),
        guncelleme: r.guncelleme,
        veri: { ekip: r.ekip, ad: r.ad, sira: r.sira, aktif: r.aktif },
      }));
    },
    yaz(db, s, h) {
      const ekip = h.ekip.ileri.get(s.veri.ekip);
      if (!ekip) return;
      db.run(
        `INSERT INTO vardiya_personel (ekip_id, ad, sira, aktif, guncelleme)
         VALUES (:e, :a, :s, :k, :g)
         ON CONFLICT(ekip_id, ad) DO UPDATE SET sira = excluded.sira,
           aktif = excluded.aktif, guncelleme = excluded.guncelleme`,
        { ':e': ekip, ':a': s.veri.ad, ':s': s.veri.sira, ':k': s.veri.aktif, ':g': s.guncelleme }
      );
    },
    sil(db, anahtar, h) {
      const [ekipAd, ad] = anahtar.split(AYRAC);
      const ekip = h.ekip.ileri.get(ekipAd);
      if (!ekip) return;
      db.run('DELETE FROM vardiya_personel WHERE ekip_id = :e AND ad = :a',
        { ':e': ekip, ':a': ad });
    },
  },

  {
    tur: 'vardiya_kayit',
    oku(db) {
      const sorgu = `SELECT v.ay, v.gun, v.kod, v.guncelleme, p.ad, e.ad AS ekip
                     FROM vardiya_kayit v
                     JOIN vardiya_personel p ON p.id = v.personel_id
                     JOIN vardiya_ekip e ON e.id = p.ekip_id`;
      return db.all(sorgu).map((r) => ({
        anahtar: anahtarla(r.ay, r.ekip, r.ad, r.gun),
        guncelleme: r.guncelleme,
        veri: { ay: r.ay, ekip: r.ekip, personel: r.ad, gun: r.gun, kod: r.kod },
      }));
    },
    yaz(db, s, h) {
      const pid = h.personel.ileri.get(anahtarla(s.veri.ekip, s.veri.personel));
      if (!pid) return;
      db.run(
        `INSERT INTO vardiya_kayit (ay, personel_id, gun, kod, guncelleme)
         VALUES (:a, :p, :g, :k, :t)
         ON CONFLICT(ay, personel_id, gun) DO UPDATE SET kod = excluded.kod,
           guncelleme = excluded.guncelleme`,
        { ':a': s.veri.ay, ':p': pid, ':g': s.veri.gun, ':k': s.veri.kod, ':t': s.guncelleme }
      );
    },
    sil(db, anahtar, h) {
      const [ay, ekip, personel, gun] = anahtar.split(AYRAC);
      const pid = h.personel.ileri.get(anahtarla(ekip, personel));
      if (!pid) return;
      db.run('DELETE FROM vardiya_kayit WHERE ay = :a AND personel_id = :p AND gun = :g',
        { ':a': ay, ':p': pid, ':g': Number(gun) });
    },
  },
];

module.exports = {
  VARLIKLAR, AYRAC, anahtarla,
  isletmeHaritasi, kategoriHaritasi, personelHaritasi,
};
