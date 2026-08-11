-- Hamza ALMALI

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS isletme (
  id     INTEGER PRIMARY KEY,
  ad     TEXT    NOT NULL UNIQUE,
  sira   INTEGER NOT NULL DEFAULT 0,
  aktif  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS kategori (
  id        INTEGER PRIMARY KEY,
  kod       TEXT    NOT NULL UNIQUE,
  ad        TEXT    NOT NULL,
  genislik  INTEGER NOT NULL,
  otomatik  INTEGER NOT NULL DEFAULT 0,
  sira      INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS kayit (
  id                        INTEGER PRIMARY KEY,
  tarih                     TEXT    NOT NULL,
  isletme_id                INTEGER NOT NULL REFERENCES isletme(id) ON DELETE CASCADE,
  kategori_id               INTEGER NOT NULL REFERENCES kategori(id) ON DELETE CASCADE,
  ariza_var                 INTEGER NOT NULL DEFAULT 0,
  donus_saglandi            INTEGER NOT NULL DEFAULT 0,
  tutanak_gerekli           INTEGER NOT NULL DEFAULT 0,
  tutanak_eklendi           INTEGER NOT NULL DEFAULT 0,
  ariza_var_bekliyor        INTEGER NOT NULL DEFAULT 0,
  donus_saglandi_bekliyor   INTEGER NOT NULL DEFAULT 0,
  tutanak_gerekli_bekliyor  INTEGER NOT NULL DEFAULT 0,
  tutanak_eklendi_bekliyor  INTEGER NOT NULL DEFAULT 0,
  aciklama                  TEXT,
  guncelleme                TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tarih, isletme_id, kategori_id)
);

CREATE INDEX IF NOT EXISTS ix_kayit_tarih ON kayit (tarih);
CREATE INDEX IF NOT EXISTS ix_kayit_isletme ON kayit (isletme_id);
CREATE TABLE IF NOT EXISTS gun_kategori (
  tarih        TEXT    NOT NULL,
  kategori_id  INTEGER NOT NULL REFERENCES kategori(id) ON DELETE CASCADE,
  PRIMARY KEY (tarih, kategori_id)
);
CREATE TABLE IF NOT EXISTS eslesme (
  id            INTEGER PRIMARY KEY,
  kaynak_deger  TEXT    NOT NULL,
  isletme_id    INTEGER NOT NULL REFERENCES isletme(id) ON DELETE CASCADE,
  tip           TEXT    NOT NULL DEFAULT 'TAM',   -- TAM | İÇERİR
  UNIQUE (kaynak_deger, tip)
);
CREATE TABLE IF NOT EXISTS oneri (
  id       INTEGER PRIMARY KEY,
  tarih    TEXT NOT NULL,
  kod_no   TEXT,
  tahmin   TEXT,
  ekip     TEXT,
  unsur    TEXT,
  islendi  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_oneri_tarih ON oneri (tarih);
CREATE TABLE IF NOT EXISTS islem_log (
  id      INTEGER PRIMARY KEY,
  zaman   TEXT NOT NULL DEFAULT (datetime('now')),
  tarih   TEXT,
  tur     TEXT,
  mesaj   TEXT
);

CREATE TABLE IF NOT EXISTS ayar (
  anahtar TEXT PRIMARY KEY,
  deger   TEXT
);
