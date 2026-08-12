// Hamza ALMALI

'use strict';

const VARSAYILAN_ADRES = 'https://raw.githubusercontent.com/hamzaalmali/report-desk/main/durum.json';
const ARALIK = 6 * 60 * 60 * 1000;
const ZAMAN_ASIMI = 10000;

let db = null;
let gunlukYaz = () => { };
let zamanlayici = null;
let sonHata = null;
let adres = VARSAYILAN_ADRES;

function ayarOku(anahtar, varsayilan = null) {
  if (!db || !db.raw) return varsayilan;
  try {
    const r = db.raw.get('SELECT deger FROM ayar WHERE anahtar = :a', { ':a': anahtar });
    return r ? r.deger : varsayilan;
  } catch (e) {
    gunlukYaz(`Uzak durum okunamadı (ayar): ${e.message}`);
    return varsayilan;
  }
}

function ayarYaz(anahtar, deger) {
  if (!db || !db.raw) throw new Error('veritabanı bağlı değil');
  db.raw.run('INSERT OR REPLACE INTO ayar (anahtar, deger) VALUES (:a, :d)',
    { ':a': anahtar, ':d': deger == null ? null : String(deger) });
}

function durumAl() {
  return {
    kilitli: ayarOku('uzakDurum') === 'kapali',
    mesaj: ayarOku('uzakMesaj') || '',
    sonKontrol: ayarOku('uzakSonKontrol'),
    sonHata,
    adres,
  };
}

async function kontrolEt() {
  const kes = new AbortController();
  const sayac = setTimeout(() => kes.abort(), ZAMAN_ASIMI);
  try {
    const yanit = await fetch(`${adres}?t=${Date.now()}`, {
      signal: kes.signal,
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
    const veri = await yanit.json();

    const kapali = String(veri.durum || '').trim().toLowerCase() === 'kapali';
    ayarYaz('uzakDurum', kapali ? 'kapali' : 'acik');
    ayarYaz('uzakMesaj', veri.mesaj || '');
    ayarYaz('uzakSonKontrol', new Date().toISOString());
    sonHata = null;
    gunlukYaz(`Uzak durum: ${kapali ? 'KAPALI' : 'açık'}`);
  } catch (e) {
    sonHata = e.name === 'AbortError' ? 'zaman aşımı' : e.message;
    gunlukYaz(`Uzak durum okunamadı (${sonHata}), son bilinen durum korunuyor.`);
  } finally {
    clearTimeout(sayac);
  }
  return durumAl();
}

function kur(vt, log, ozelAdres) {
  db = vt;
  if (log) gunlukYaz = log;
  if (ozelAdres) adres = ozelAdres;
  clearTimeout(zamanlayici);
  const tekrar = () => {
    zamanlayici = setTimeout(async () => {
      await kontrolEt();
      tekrar();
    }, ARALIK);
  };
  tekrar();
  return kontrolEt();
}

function durdur() {
  clearTimeout(zamanlayici);
}

module.exports = { kur, kontrolEt, durumAl, durdur, VARSAYILAN_ADRES };
