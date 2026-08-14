// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Database } = require('node-sqlite3-wasm');
const { KATEGORILER, otomatikAlanlar, TUM_ALANLAR } = require('../../shared/kategoriler');
const { key } = require('../../shared/tr');
const { ISLETMELER, ESLESMELER } = require('./seed');
const { AYRAC } = require('../senkron/varliklar');

let db = null;
let ham = null;
let dbYolu = null;
let bekleyisSayaci = { deneme: 0, toplamMs: 0, sonHata: null };

const BEKLEME_BUTCESI = 8000;
const SARILACAK = new Set(['run', 'get', 'all', 'exec', 'prepare']);

function kilitliMi(e) {
  return !!e && /database (is|table is) locked/i.test(e.message || '');
}

function uyu(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const bas = Date.now();
    while (Date.now() - bas < ms);
  }
}

function yenidenDene(fn) {
  const bitis = Date.now() + BEKLEME_BUTCESI;
  let bekle = 10;
  let denendi = 0;
  const basladi = Date.now();
  for (;;) {
    try {
      const r = fn();
      if (denendi) {
        bekleyisSayaci.deneme += denendi;
        bekleyisSayaci.toplamMs += Date.now() - basladi;
      }
      return r;
    } catch (e) {
      if (!kilitliMi(e) || Date.now() >= bitis) {
        if (kilitliMi(e)) bekleyisSayaci.sonHata = new Date().toISOString();
        throw e;
      }
      denendi++;
      uyu(bekle + Math.floor(Math.random() * bekle));
      bekle = Math.min(250, bekle * 2);
    }
  }
}

function ifadeSarmala(ifade) {
  return new Proxy(ifade, {
    get(hedef, ad) {
      const d = hedef[ad];
      if (typeof d !== 'function') return d;
      if (ad === 'run' || ad === 'get' || ad === 'all') {
        return (...a) => yenidenDene(() => d.apply(hedef, a));
      }
      return d.bind(hedef);
    },
  });
}

function sarmala(gercek) {
  return new Proxy(gercek, {
    get(hedef, ad) {
      const d = hedef[ad];
      if (typeof d !== 'function') return d;
      if (ad === 'prepare') {
        return (...a) => ifadeSarmala(yenidenDene(() => d.apply(hedef, a)));
      }
      if (!SARILACAK.has(ad)) return d.bind(hedef);
      return (...a) => yenidenDene(() => d.apply(hedef, a));
    },
  });
}

function bekleyisOzeti() {
  return { ...bekleyisSayaci };
}

function ac(dosyaYolu) {
  if (ham) ham.close();
  dbYolu = dosyaYolu;
  fs.mkdirSync(path.dirname(dosyaYolu), { recursive: true });
  ham = new Database(dosyaYolu);
  db = sarmala(ham);
  db.run('PRAGMA foreign_keys = ON');
  kur();
  return db;
}

const DAMGALI_TABLOLAR = [
  'isletme', 'eslesme', 'gun_kategori', 'vardiya_ekip', 'vardiya_personel', 'vardiya_kayit',
];

function goc(hedef) {
  for (const tablo of DAMGALI_TABLOLAR) {
    const sutunlar = hedef.all(`PRAGMA table_info(${tablo})`).map((s) => s.name);
    if (!sutunlar.includes('guncelleme')) {
      hedef.run(`ALTER TABLE ${tablo} ADD COLUMN guncelleme TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'`);
      hedef.run(`UPDATE ${tablo} SET guncelleme = datetime('now')`);
    }
  }
}

function semaKur(hedef) {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  hedef.exec(sql);
  goc(hedef);
}

function baglantiAc(dosyaYolu) {
  fs.mkdirSync(path.dirname(dosyaYolu), { recursive: true });
  const hamBaglanti = new Database(dosyaYolu);
  const sarili = sarmala(hamBaglanti);
  sarili.run('PRAGMA foreign_keys = ON');
  semaKur(sarili);
  kategorileriSenkronla(sarili);
  return {
    db: sarili,
    kapat() { try { hamBaglanti.close(); } catch { } },
  };
}

function kur() {
  semaKur(db);
  kategorileriSenkronla();
  if (sayi('isletme') === 0 && db.get("SELECT deger FROM ayar WHERE anahtar = 'ilkKurulum'") == null) {
    ilkKurulum();
  }
}

function ilkKurulum() {
  islem(() => {
    ISLETMELER.forEach((ad, i) => isletmeEkle(ad, i + 1));
    const harita = isletmeHaritasi();
    for (const [kaynak, hedef] of ESLESMELER) {
      const isl = harita.get(key(hedef));
      if (isl) {
        db.run(
          `INSERT INTO eslesme (kaynak_deger, isletme_id, tip) VALUES (:k, :i, 'TAM')
           ON CONFLICT(kaynak_deger, tip) DO UPDATE SET isletme_id = excluded.isletme_id`,
          { ':k': kaynak, ':i': isl.id }
        );
      }
    }
    db.run("INSERT OR REPLACE INTO ayar (anahtar, deger) VALUES ('ilkKurulum', datetime('now'))");
  });
}

function sayi(tablo) {
  return db.get(`SELECT COUNT(*) AS c FROM ${tablo}`).c;
}

function kategorileriSenkronla(hedef = db) {
  const st = hedef.prepare(
    `INSERT INTO kategori (kod, ad, genislik, otomatik, sira)
     VALUES (:kod, :ad, :genislik, :otomatik, :sira)
     ON CONFLICT(kod) DO UPDATE SET
       ad = excluded.ad, genislik = excluded.genislik,
       otomatik = excluded.otomatik, sira = excluded.sira`
  );
  for (const k of KATEGORILER) {
    st.run({
      ':kod': k.kod, ':ad': k.ad, ':genislik': k.genislik,
      ':otomatik': k.otomatik ? 1 : 0, ':sira': k.sira,
    });
  }
  st.finalize();
}

function isletmeEkle(ad, sira) {
  ad = String(ad || '').trim();
  if (!ad) throw new Error('İşletme adı boş olamaz.');
  const enBuyuk = db.get('SELECT COALESCE(MAX(sira), 0) AS s FROM isletme').s;
  db.run('INSERT OR IGNORE INTO isletme (ad, sira) VALUES (:ad, :s)', {
    ':ad': ad, ':s': sira == null ? enBuyuk + 1 : sira,
  });
  const i = db.get('SELECT id FROM isletme WHERE ad = :ad', { ':ad': ad });
  if (i) {
    db.run(
      `INSERT OR IGNORE INTO eslesme (kaynak_deger, isletme_id, tip)
       VALUES (:k, :i, 'TAM')`,
      { ':k': ad, ':i': i.id }
    );
  }
  return i;
}

function mezarYaz(tur, anahtar) {
  db.run(
    `INSERT INTO silinen (tur, anahtar, zaman) VALUES (:t, :a, datetime('now'))
     ON CONFLICT(tur, anahtar) DO UPDATE SET zaman = datetime('now')`,
    { ':t': tur, ':a': anahtar }
  );
}

function anahtarBirlestir(...p) {
  return p.map((x) => String(x == null ? '' : x)).join(AYRAC);
}

function isletmeSil(id) {
  islem(() => {
    const i = db.get('SELECT ad FROM isletme WHERE id = :id', { ':id': id });
    if (!i) return;
    for (const k of db.all(
      `SELECT k.tarih, kt.kod FROM kayit k JOIN kategori kt ON kt.id = k.kategori_id
       WHERE k.isletme_id = :id`, { ':id': id })) {
      mezarYaz('kayit', anahtarBirlestir(k.tarih, i.ad, k.kod));
    }
    for (const e of db.all('SELECT kaynak_deger, tip FROM eslesme WHERE isletme_id = :id',
      { ':id': id })) {
      mezarYaz('eslesme', anahtarBirlestir(e.kaynak_deger, e.tip));
    }
    db.run('DELETE FROM isletme WHERE id = :id', { ':id': id });
    mezarYaz('isletme', anahtarBirlestir(i.ad));
  });
}

function isletmeSirala(idler) {
  if (!Array.isArray(idler) || !idler.length) return 0;
  let n = 0;
  islem(() => {
    const st = db.prepare("UPDATE isletme SET sira = :s, guncelleme = datetime('now') WHERE id = :id");
    idler.forEach((id, i) => { st.run({ ':s': i + 1, ':id': id }); n++; });
    st.finalize();
    const kalan = db.all(
      'SELECT id FROM isletme WHERE id NOT IN (' + idler.map(() => '?').join(',') + ') ORDER BY sira, id',
      idler
    );
    const st2 = db.prepare("UPDATE isletme SET sira = :s, guncelleme = datetime('now') WHERE id = :id");
    kalan.forEach((r, i) => st2.run({ ':s': idler.length + i + 1, ':id': r.id }));
    st2.finalize();
  });
  return n;
}

function isletmeSiralaAdlar(adlar, { eksikleriEkle = true } = {}) {
  const temiz = (Array.isArray(adlar) ? adlar : String(adlar).split(/\r?\n/))
    .map((a) => String(a).trim())
    .filter(Boolean);
  if (!temiz.length) throw new Error('Liste boş.');

  const sonuc = { siralandi: 0, eklendi: [], bulunamadi: [] };
  islem(() => {
    const idler = [];
    for (const ad of temiz) {
      const harita = isletmeHaritasi();
      const mevcut = harita.get(key(ad));
      if (mevcut) idler.push(mevcut.id);
      else if (eksikleriEkle) {
        const yeni = isletmeEkle(ad);
        if (yeni) { idler.push(yeni.id); sonuc.eklendi.push(ad); }
      } else sonuc.bulunamadi.push(ad);
    }
    sonuc.siralandi = isletmeSirala(idler);
  });
  return sonuc;
}

function isletmeTasi(id, yon) {
  const liste = isletmeler();
  const ix = liste.findIndex((i) => i.id === id);
  const hedef = ix + (yon < 0 ? -1 : 1);
  if (ix < 0 || hedef < 0 || hedef >= liste.length) return liste;
  const yeni = liste.map((i) => i.id);
  yeni.splice(hedef, 0, yeni.splice(ix, 1)[0]);
  isletmeSirala(yeni);
  return isletmeler();
}

function isletmeler() {
  return db.all('SELECT id, ad, sira, aktif FROM isletme ORDER BY sira, id');
}

function kategoriler() {
  return db.all('SELECT id, kod, ad, genislik, otomatik, sira FROM kategori ORDER BY sira');
}

function isletmeHaritasi() {
  const m = new Map();
  for (const i of isletmeler()) m.set(key(i.ad), i);
  return m;
}

function kategoriHaritasi() {
  const m = new Map();
  for (const k of kategoriler()) m.set(k.kod, k);
  return m;
}

function gunler() {
  return db
    .all(
      `SELECT tarih,
              COUNT(*) AS kayit,
              SUM(ariza_var + tutanak_gerekli) AS isaret,
              SUM(ariza_var_bekliyor + donus_saglandi_bekliyor
                  + tutanak_gerekli_bekliyor + tutanak_eklendi_bekliyor) AS bekleyen
       FROM kayit GROUP BY tarih ORDER BY tarih DESC`
    );
}

function aylar() {
  return db.all(
    `SELECT substr(tarih,1,7) AS ay, COUNT(DISTINCT tarih) AS gun
     FROM kayit GROUP BY ay ORDER BY ay DESC`
  );
}

function gunVerisi(tarih) {
  const satirlar = db.all(
    `SELECT k.*, i.ad AS isletme, i.sira AS isletme_sira, kt.kod AS kategori_kod
     FROM kayit k
     JOIN isletme i  ON i.id  = k.isletme_id
     JOIN kategori kt ON kt.id = k.kategori_id
     WHERE k.tarih = :tarih`,
    { ':tarih': tarih }
  );
  const acikKategoriler = db
    .all(
      `SELECT kt.kod FROM gun_kategori g JOIN kategori kt ON kt.id = g.kategori_id
       WHERE g.tarih = :tarih ORDER BY kt.sira`,
      { ':tarih': tarih }
    )
    .map((r) => r.kod);
  return { tarih, satirlar, acikKategoriler };
}

function ayVerisi(ay) {
  return db.all(
    `SELECT k.tarih, i.ad AS isletme, kt.kod AS kategori_kod,
            k.ariza_var, k.donus_saglandi, k.tutanak_gerekli, k.tutanak_eklendi,
            k.ariza_var_bekliyor, k.donus_saglandi_bekliyor,
            k.tutanak_gerekli_bekliyor, k.tutanak_eklendi_bekliyor
     FROM kayit k
     JOIN isletme i   ON i.id  = k.isletme_id
     JOIN kategori kt ON kt.id = k.kategori_id
     WHERE substr(k.tarih,1,7) = :ay
     ORDER BY k.tarih, i.sira, kt.sira`,
    { ':ay': ay }
  );
}

const ALANLAR = [
  'ariza_var', 'donus_saglandi', 'tutanak_gerekli', 'tutanak_eklendi',
  'ariza_var_bekliyor', 'donus_saglandi_bekliyor',
  'tutanak_gerekli_bekliyor', 'tutanak_eklendi_bekliyor',
];

function kayitYaz(kayitlar) {
  const st = db.prepare(
    `INSERT INTO kayit (tarih, isletme_id, kategori_id,
        ariza_var, donus_saglandi, tutanak_gerekli, tutanak_eklendi,
        ariza_var_bekliyor, donus_saglandi_bekliyor,
        tutanak_gerekli_bekliyor, tutanak_eklendi_bekliyor, aciklama)
     VALUES (:tarih, :isletme_id, :kategori_id,
        :ariza_var, :donus_saglandi, :tutanak_gerekli, :tutanak_eklendi,
        :ariza_var_bekliyor, :donus_saglandi_bekliyor,
        :tutanak_gerekli_bekliyor, :tutanak_eklendi_bekliyor, :aciklama)
     ON CONFLICT(tarih, isletme_id, kategori_id) DO UPDATE SET
        ariza_var = excluded.ariza_var,
        donus_saglandi = excluded.donus_saglandi,
        tutanak_gerekli = excluded.tutanak_gerekli,
        tutanak_eklendi = excluded.tutanak_eklendi,
        ariza_var_bekliyor = excluded.ariza_var_bekliyor,
        donus_saglandi_bekliyor = excluded.donus_saglandi_bekliyor,
        tutanak_gerekli_bekliyor = excluded.tutanak_gerekli_bekliyor,
        tutanak_eklendi_bekliyor = excluded.tutanak_eklendi_bekliyor,
        aciklama = COALESCE(excluded.aciklama, kayit.aciklama),
        guncelleme = datetime('now')`
  );
  let n = 0;
  for (const k of kayitlar) {
    const p = {
      ':tarih': k.tarih, ':isletme_id': k.isletme_id, ':kategori_id': k.kategori_id,
      ':aciklama': k.aciklama == null ? null : String(k.aciklama),
    };
    for (const a of ALANLAR) p[':' + a] = k[a] ? 1 : 0;
    st.run(p);
    n++;
  }
  st.finalize();
  return n;
}

function hucreGuncelle({ tarih, isletme_id, kategori_id, alan, deger }) {
  if (!ALANLAR.includes(alan)) throw new Error('Geçersiz alan: ' + alan);
  const bekleyen = TUM_ALANLAR.includes(alan) && deger ? alan + '_bekliyor' : null;
  db.run(
    `INSERT INTO kayit (tarih, isletme_id, kategori_id, ${alan})
     VALUES (:tarih, :isletme_id, :kategori_id, :deger)
     ON CONFLICT(tarih, isletme_id, kategori_id) DO UPDATE SET
       ${alan} = :deger,${bekleyen ? ` ${bekleyen} = 0,` : ''} guncelleme = datetime('now')`,
    {
      ':tarih': tarih, ':isletme_id': isletme_id,
      ':kategori_id': kategori_id, ':deger': deger ? 1 : 0,
    }
  );
  return db.get(
    `SELECT * FROM kayit WHERE tarih = :t AND isletme_id = :i AND kategori_id = :k`,
    { ':t': tarih, ':i': isletme_id, ':k': kategori_id }
  );
}

function gunKategoriAc(tarih, kategoriIdler) {
  const st = db.prepare(
    'INSERT OR IGNORE INTO gun_kategori (tarih, kategori_id) VALUES (:t, :k)'
  );
  for (const id of kategoriIdler) st.run({ ':t': tarih, ':k': id });
  st.finalize();
}

function kayitMezarlari(kosul, parametre) {
  return db.all(
    `SELECT k.tarih, i.ad AS isletme, kt.kod FROM kayit k
     JOIN isletme i ON i.id = k.isletme_id
     JOIN kategori kt ON kt.id = k.kategori_id
     WHERE ${kosul}`, parametre
  );
}

function gunSil(tarih) {
  islem(() => {
    for (const k of kayitMezarlari('k.tarih = :t', { ':t': tarih })) {
      mezarYaz('kayit', anahtarBirlestir(k.tarih, k.isletme, k.kod));
    }
    for (const g of db.all(
      `SELECT kt.kod FROM gun_kategori g JOIN kategori kt ON kt.id = g.kategori_id
       WHERE g.tarih = :t`, { ':t': tarih })) {
      mezarYaz('gun_kategori', anahtarBirlestir(tarih, g.kod));
    }
    db.run('DELETE FROM kayit WHERE tarih = :t', { ':t': tarih });
    db.run('DELETE FROM gun_kategori WHERE tarih = :t', { ':t': tarih });
    db.run('DELETE FROM oneri WHERE tarih = :t', { ':t': tarih });
  });
}

function kategoriSifirla(tarih, kategoriId, genislik = 4) {
  const temizlenecek = otomatikAlanlar(genislik === 2 ? 2 : 4);
  islem(() => {
    db.run(
      `UPDATE kayit SET ${temizlenecek.map((a) => `${a} = 0`).join(', ')},
              guncelleme = datetime('now')
       WHERE tarih = :t AND kategori_id = :k`,
      { ':t': tarih, ':k': kategoriId }
    );
    const kosul = `k.tarih = :t AND k.kategori_id = :k
       AND ${ALANLAR.map((a) => `k.${a} = 0`).join(' AND ')}
       AND (k.aciklama IS NULL OR k.aciklama = '')`;
    for (const s of kayitMezarlari(kosul, { ':t': tarih, ':k': kategoriId })) {
      mezarYaz('kayit', anahtarBirlestir(s.tarih, s.isletme, s.kod));
    }
    db.run(
      `DELETE FROM kayit WHERE tarih = :t AND kategori_id = :k
         AND ${ALANLAR.map((a) => `${a} = 0`).join(' AND ')}
         AND (aciklama IS NULL OR aciklama = '')`,
      { ':t': tarih, ':k': kategoriId }
    );
  });
}

function otomatikIsaretle(tarih, kategoriId, isletmeIdler, genislik) {
  const alanListesi = otomatikAlanlar(genislik === 2 ? 2 : 4);
  const st = db.prepare(
    `INSERT INTO kayit (tarih, isletme_id, kategori_id, ${alanListesi.join(', ')})
     VALUES (:t, :i, :k, ${alanListesi.map(() => '1').join(', ')})
     ON CONFLICT(tarih, isletme_id, kategori_id) DO UPDATE SET
       ${alanListesi.map((a) => `${a} = 1`).join(', ')},
       guncelleme = datetime('now')`
  );
  let n = 0;
  for (const id of isletmeIdler) {
    st.run({ ':t': tarih, ':i': id, ':k': kategoriId });
    n++;
  }
  st.finalize();
  return n;
}

function eslesmeler() {
  return db.all(
    `SELECT e.id, e.kaynak_deger, e.tip, i.ad AS isletme, e.isletme_id
     FROM eslesme e JOIN isletme i ON i.id = e.isletme_id
     ORDER BY e.kaynak_deger`
  );
}

function eslesmeEkle({ kaynak_deger, isletme_id, tip }) {
  db.run(
    `INSERT INTO eslesme (kaynak_deger, isletme_id, tip) VALUES (:k, :i, :t)
     ON CONFLICT(kaynak_deger, tip) DO UPDATE SET isletme_id = excluded.isletme_id`,
    { ':k': kaynak_deger.trim(), ':i': isletme_id, ':t': tip === 'İÇERİR' ? 'İÇERİR' : 'TAM' }
  );
}

function eslesmeSil(id) {
  islem(() => {
    const e = db.get('SELECT kaynak_deger, tip FROM eslesme WHERE id = :id', { ':id': id });
    if (!e) return;
    db.run('DELETE FROM eslesme WHERE id = :id', { ':id': id });
    mezarYaz('eslesme', anahtarBirlestir(e.kaynak_deger, e.tip));
  });
}

function eslesmeleriDisaAktar() {
  return {
    surum: 1,
    olusturma: new Date().toISOString(),
    isletmeler: isletmeler().map((i) => ({ ad: i.ad, sira: i.sira })),
    eslesmeler: eslesmeler().map((e) => ({
      kaynak_deger: e.kaynak_deger, isletme: e.isletme, tip: e.tip,
    })),
  };
}

function eslesmeleriIceAktar(veri) {
  if (!veri || !Array.isArray(veri.eslesmeler)) {
    throw new Error('Dosya tanınmadı: eşleştirme yedeği değil.');
  }
  let isletme = 0, eslesme = 0;
  islem(() => {
    for (const i of veri.isletmeler || []) {
      const varMi = db.get('SELECT id FROM isletme WHERE ad = :ad', { ':ad': i.ad });
      if (!varMi) { isletmeEkle(i.ad, i.sira); isletme++; }
    }
    const harita = isletmeHaritasi();
    for (const e of veri.eslesmeler) {
      const hedef = harita.get(key(e.isletme));
      if (!hedef) continue;
      db.run(
        `INSERT INTO eslesme (kaynak_deger, isletme_id, tip) VALUES (:k, :i, :t)
         ON CONFLICT(kaynak_deger, tip) DO UPDATE SET isletme_id = excluded.isletme_id`,
        { ':k': e.kaynak_deger, ':i': hedef.id, ':t': e.tip === 'İÇERİR' ? 'İÇERİR' : 'TAM' }
      );
      eslesme++;
    }
  });
  return { isletme, eslesme };
}

function onerileriYaz(tarih, kayitlar) {
  db.run('DELETE FROM oneri WHERE tarih = :t', { ':t': tarih });
  const st = db.prepare(
    'INSERT INTO oneri (tarih, kod_no, tahmin, ekip, unsur) VALUES (:t, :k, :h, :e, :u)'
  );
  for (const o of kayitlar) {
    st.run({ ':t': tarih, ':k': o.kod_no || '', ':h': o.tahmin || '', ':e': o.ekip || '', ':u': o.unsur || '' });
  }
  st.finalize();
}

function oneriler(tarih) {
  return tarih
    ? db.all('SELECT * FROM oneri WHERE tarih = :t ORDER BY id', { ':t': tarih })
    : db.all('SELECT * FROM oneri ORDER BY tarih DESC, id LIMIT 500');
}

function vardiyaEkipler() {
  return db.all('SELECT id, ad, vardiyalar, sira FROM vardiya_ekip ORDER BY sira, id');
}

function vardiyaEkipEkle(ad, vardiyalar = 'A,B') {
  ad = String(ad || '').trim();
  if (!ad) throw new Error('Ekip adı boş olamaz.');
  const enBuyuk = db.get('SELECT COALESCE(MAX(sira), 0) AS s FROM vardiya_ekip').s;
  db.run('INSERT OR IGNORE INTO vardiya_ekip (ad, vardiyalar, sira) VALUES (:a, :v, :s)',
    { ':a': ad, ':v': vardiyalar, ':s': enBuyuk + 1 });
  return db.get('SELECT * FROM vardiya_ekip WHERE ad = :a', { ':a': ad });
}

function vardiyaEkipGuncelle(id, { ad, vardiyalar }) {
  if (ad != null) {
    db.run("UPDATE vardiya_ekip SET ad = :a, guncelleme = datetime('now') WHERE id = :id", { ':a': String(ad).trim(), ':id': id });
  }
  if (vardiyalar != null) {
    db.run("UPDATE vardiya_ekip SET vardiyalar = :v, guncelleme = datetime('now') WHERE id = :id",
      { ':v': String(vardiyalar), ':id': id });
  }
  return vardiyaEkipler();
}

function vardiyaEkipSil(id) {
  islem(() => {
    const e = db.get('SELECT ad FROM vardiya_ekip WHERE id = :id', { ':id': id });
    if (!e) return;
    for (const p of db.all('SELECT ad FROM vardiya_personel WHERE ekip_id = :id', { ':id': id })) {
      mezarYaz('vardiya_personel', anahtarBirlestir(e.ad, p.ad));
    }
    for (const v of db.all(
      `SELECT v.ay, v.gun, p.ad FROM vardiya_kayit v
       JOIN vardiya_personel p ON p.id = v.personel_id WHERE p.ekip_id = :id`, { ':id': id })) {
      mezarYaz('vardiya_kayit', anahtarBirlestir(v.ay, e.ad, v.ad, v.gun));
    }
    db.run('DELETE FROM vardiya_ekip WHERE id = :id', { ':id': id });
    mezarYaz('vardiya_ekip', anahtarBirlestir(e.ad));
  });
}

function vardiyaPersoneller(ekipId) {
  return ekipId
    ? db.all('SELECT id, ekip_id, ad, sira FROM vardiya_personel WHERE ekip_id = :e ORDER BY sira, id',
      { ':e': ekipId })
    : db.all('SELECT id, ekip_id, ad, sira FROM vardiya_personel ORDER BY ekip_id, sira, id');
}

function vardiyaPersonelEkle(ekipId, ad) {
  ad = String(ad || '').trim();
  if (!ad) throw new Error('Personel adı boş olamaz.');
  const enBuyuk = db.get(
    'SELECT COALESCE(MAX(sira), 0) AS s FROM vardiya_personel WHERE ekip_id = :e', { ':e': ekipId }
  ).s;
  db.run('INSERT OR IGNORE INTO vardiya_personel (ekip_id, ad, sira) VALUES (:e, :a, :s)',
    { ':e': ekipId, ':a': ad, ':s': enBuyuk + 1 });
  return db.get('SELECT * FROM vardiya_personel WHERE ekip_id = :e AND ad = :a',
    { ':e': ekipId, ':a': ad });
}

function vardiyaPersonelSil(id) {
  islem(() => {
    const p = db.get(
      `SELECT p.ad, e.ad AS ekip FROM vardiya_personel p
       JOIN vardiya_ekip e ON e.id = p.ekip_id WHERE p.id = :id`, { ':id': id });
    if (!p) return;
    for (const v of db.all('SELECT ay, gun FROM vardiya_kayit WHERE personel_id = :id',
      { ':id': id })) {
      mezarYaz('vardiya_kayit', anahtarBirlestir(v.ay, p.ekip, p.ad, v.gun));
    }
    db.run('DELETE FROM vardiya_personel WHERE id = :id', { ':id': id });
    mezarYaz('vardiya_personel', anahtarBirlestir(p.ekip, p.ad));
  });
}

function vardiyaPersonelTasi(id, yon) {
  const p = db.get('SELECT ekip_id FROM vardiya_personel WHERE id = :id', { ':id': id });
  if (!p) return [];
  const liste = vardiyaPersoneller(p.ekip_id);
  const ix = liste.findIndex((x) => x.id === id);
  const hedef = ix + (yon < 0 ? -1 : 1);
  if (ix < 0 || hedef < 0 || hedef >= liste.length) return liste;
  const idler = liste.map((x) => x.id);
  idler.splice(hedef, 0, idler.splice(ix, 1)[0]);
  islem(() => {
    const st = db.prepare("UPDATE vardiya_personel SET sira = :s, guncelleme = datetime('now') WHERE id = :id");
    idler.forEach((pid, i) => st.run({ ':s': i + 1, ':id': pid }));
    st.finalize();
  });
  return vardiyaPersoneller(p.ekip_id);
}

function vardiyaAyVerisi(ay) {
  const kayitlar = db.all(
    `SELECT k.ay, k.personel_id, k.gun, k.kod, p.ekip_id
     FROM vardiya_kayit k JOIN vardiya_personel p ON p.id = k.personel_id
     WHERE k.ay = :ay`,
    { ':ay': ay }
  );
  return { ay, ekipler: vardiyaEkipler(), personeller: vardiyaPersoneller(null), kayitlar };
}

function vardiyaAylar() {
  return db.all('SELECT ay, COUNT(*) AS kayit FROM vardiya_kayit GROUP BY ay ORDER BY ay DESC');
}

function vardiyaYaz(ay, personelId, gun, kod) {
  const temiz = String(kod == null ? '' : kod).trim();
  if (!temiz) {
    db.run('DELETE FROM vardiya_kayit WHERE ay = :a AND personel_id = :p AND gun = :g',
      { ':a': ay, ':p': personelId, ':g': gun });
    return { ay, personel_id: personelId, gun, kod: '' };
  }
  db.run(
    `INSERT INTO vardiya_kayit (ay, personel_id, gun, kod) VALUES (:a, :p, :g, :k)
     ON CONFLICT(ay, personel_id, gun) DO UPDATE SET kod = excluded.kod`,
    { ':a': ay, ':p': personelId, ':g': gun, ':k': temiz }
  );
  return { ay, personel_id: personelId, gun, kod: temiz };
}

function vardiyaTopluYaz(kayitlar) {
  let n = 0;
  islem(() => {
    for (const k of kayitlar) { vardiyaYaz(k.ay, k.personel_id, k.gun, k.kod); n++; }
  });
  return n;
}

function vardiyaAySil(ay) {
  islem(() => {
    for (const v of db.all(
      `SELECT v.gun, p.ad, e.ad AS ekip FROM vardiya_kayit v
       JOIN vardiya_personel p ON p.id = v.personel_id
       JOIN vardiya_ekip e ON e.id = p.ekip_id WHERE v.ay = :a`, { ':a': ay })) {
      mezarYaz('vardiya_kayit', anahtarBirlestir(ay, v.ekip, v.ad, v.gun));
    }
    db.run('DELETE FROM vardiya_kayit WHERE ay = :a', { ':a': ay });
  });
}

function waGruplar() {
  return db.all('SELECT jid, ad, katilimci, secili FROM wa_grup ORDER BY ad');
}

function waGruplariYaz(liste) {
  islem(() => {
    const st = db.prepare(
      `INSERT INTO wa_grup (jid, ad, katilimci, guncelleme)
       VALUES (:j, :a, :k, datetime('now'))
       ON CONFLICT(jid) DO UPDATE SET
         ad = excluded.ad, katilimci = excluded.katilimci, guncelleme = datetime('now')`
    );
    for (const g of liste) st.run({ ':j': g.jid, ':a': g.ad, ':k': g.katilimci || 0 });
    st.finalize();
  });
  return waGruplar();
}

function waGrupSec(jid, secili) {
  db.run('UPDATE wa_grup SET secili = :s WHERE jid = :j', { ':s': secili ? 1 : 0, ':j': jid });
  return waGruplar();
}

function waSeciliGruplar() {
  return db.all('SELECT jid, ad FROM wa_grup WHERE secili = 1 ORDER BY ad');
}

function ayarOku(anahtar, varsayilan = null) {
  const r = db.get('SELECT deger FROM ayar WHERE anahtar = :a', { ':a': anahtar });
  return r && r.deger != null ? r.deger : varsayilan;
}

function ayarYaz(anahtar, deger) {
  db.run('INSERT OR REPLACE INTO ayar (anahtar, deger) VALUES (:a, :d)',
    { ':a': anahtar, ':d': deger == null ? null : String(deger) });
  return deger;
}

function portalHesaplar() {
  return db.all(
    `SELECT id, numara, ad, kullanici, aktif,
            CASE WHEN sifre = '' THEN 0 ELSE 1 END AS sifreVar, sifreli
     FROM portal_hesap ORDER BY id`
  );
}

function portalHesap(numara) {
  return db.get('SELECT * FROM portal_hesap WHERE numara = :n', { ':n': String(numara || '') });
}

function portalHesapYaz({ id, numara, ad, kullanici, sifre, sifreli, aktif }) {
  const mevcut = id ? db.get('SELECT * FROM portal_hesap WHERE id = :i', { ':i': id }) : null;
  const yeniSifre = sifre == null ? (mevcut ? mevcut.sifre : '') : sifre;
  const yeniSifreli = sifre == null ? (mevcut ? mevcut.sifreli : 0) : (sifreli ? 1 : 0);

  if (mevcut) {
    db.run(
      `UPDATE portal_hesap SET numara = :n, ad = :ad, kullanici = :k, sifre = :s,
              sifreli = :sl, aktif = :a, guncelleme = datetime('now') WHERE id = :i`,
      {
        ':i': id, ':n': numara, ':ad': ad || '', ':k': kullanici || '',
        ':s': yeniSifre, ':sl': yeniSifreli, ':a': aktif ? 1 : 0,
      }
    );
  } else {
    db.run(
      `INSERT INTO portal_hesap (numara, ad, kullanici, sifre, sifreli, aktif)
       VALUES (:n, :ad, :k, :s, :sl, :a)
       ON CONFLICT(numara) DO UPDATE SET
         ad = excluded.ad, kullanici = excluded.kullanici, sifre = excluded.sifre,
         sifreli = excluded.sifreli, aktif = excluded.aktif, guncelleme = datetime('now')`,
      {
        ':n': numara, ':ad': ad || '', ':k': kullanici || '',
        ':s': yeniSifre, ':sl': yeniSifreli, ':a': aktif ? 1 : 0,
      }
    );
  }
  return portalHesaplar();
}

function portalHesapSil(id) {
  db.run('DELETE FROM portal_hesap WHERE id = :i', { ':i': id });
  return portalHesaplar();
}

function logYaz(tarih, tur, mesaj) {
  db.run('INSERT INTO islem_log (tarih, tur, mesaj) VALUES (:t, :tur, :m)', {
    ':t': tarih || null, ':tur': tur, ':m': mesaj,
  });
}

function loglar(limit = 200) {
  return db.all('SELECT * FROM islem_log ORDER BY id DESC LIMIT :n', { ':n': limit });
}

function ozet() {
  const g = db.get('SELECT COUNT(DISTINCT tarih) AS gun, COUNT(*) AS kayit FROM kayit');
  const b = db.get(
    `SELECT COUNT(*) AS bekleyen FROM kayit
     WHERE ariza_var_bekliyor + donus_saglandi_bekliyor
         + tutanak_gerekli_bekliyor + tutanak_eklendi_bekliyor > 0`
  );
  const son = db.get('SELECT MAX(tarih) AS tarih FROM kayit');
  return { ...g, ...b, sonGun: son ? son.tarih : null, isletme: sayi('isletme'), yol: dbYolu };
}

let islemDerinlik = 0;

function islem(fn) {
  if (islemDerinlik > 0) {
    islemDerinlik++;
    try {
      return fn();
    } finally {
      islemDerinlik--;
    }
  }
  db.run('BEGIN');
  islemDerinlik = 1;
  try {
    const r = fn();
    db.run('COMMIT');
    return r;
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  } finally {
    islemDerinlik = 0;
  }
}

function yol() {
  return dbYolu;
}

function kapat() {
  if (ham) {
    try { ham.close(); } catch { }
    ham = null;
    db = null;
  }
}

module.exports = {
  ac, kur, yol, kapat, get raw() { return db; }, islem, bekleyisOzeti, baglantiAc,
  isletmeler, kategoriler, isletmeHaritasi, kategoriHaritasi,
  isletmeEkle, isletmeSil, isletmeSirala, isletmeTasi, isletmeSiralaAdlar,
  gunler, aylar, gunVerisi, ayVerisi,
  kayitYaz, hucreGuncelle, gunKategoriAc, gunSil, kategoriSifirla, otomatikIsaretle,
  eslesmeler, eslesmeEkle, eslesmeSil, eslesmeleriDisaAktar, eslesmeleriIceAktar,
  onerileriYaz, oneriler, logYaz, loglar, ozet,
  vardiyaEkipler, vardiyaEkipEkle, vardiyaEkipGuncelle, vardiyaEkipSil,
  vardiyaPersoneller, vardiyaPersonelEkle, vardiyaPersonelSil, vardiyaPersonelTasi,
  vardiyaAyVerisi, vardiyaAylar, vardiyaYaz, vardiyaTopluYaz, vardiyaAySil,
  waGruplar, waGruplariYaz, waGrupSec, waSeciliGruplar,
  ayarOku, ayarYaz,
  portalHesaplar, portalHesap, portalHesapYaz, portalHesapSil,
};
