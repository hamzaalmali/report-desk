// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const QR = require('qrcode');

const CIHAZ_ADI = 'ALMALI';

let sock = null;
let oturumYolu = null;
let dinleyici = () => { };
let kapatiliyor = false;
let yenidenDeneme = 0;
let zamanlayici = null;

const durum = {
  asama: 'kapali',      // kapali | baglaniyor | qr | bagli | hata
  qr: null,
  numara: null,
  ad: null,
  hata: null,
  sonDegisim: null,
};

function bildir(yeni = {}) {
  Object.assign(durum, yeni, { sonDegisim: new Date().toISOString() });
  try { dinleyici({ ...durum }); } catch { }
}

function oturumVarMi() {
  try {
    return fs.existsSync(path.join(oturumYolu, 'creds.json'));
  } catch {
    return false;
  }
}

function kur(klasor, olayFn) {
  oturumYolu = klasor;
  if (olayFn) dinleyici = olayFn;
  fs.mkdirSync(oturumYolu, { recursive: true });
  bildir({ asama: oturumVarMi() ? 'kapali' : 'kapali' });
}

function durumAl() {
  return { ...durum, oturumVar: oturumVarMi(), yol: oturumYolu };
}

async function baslat() {
  if (sock) return durumAl();
  kapatiliyor = false;
  clearTimeout(zamanlayici);
  bildir({ asama: 'baglaniyor', qr: null, hata: null });

  const mod = await import('@whiskeysockets/baileys');
  const b = mod.default && mod.default.makeWASocket ? mod.default : mod;
  const makeWASocket = b.makeWASocket || b.default || mod.default;
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = b;

  const { state, saveCreds } = await useMultiFileAuthState(oturumYolu);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: [CIHAZ_ADI, 'Desktop', '1.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    logger: sessizGunluk(),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;

    if (qr) {
      const resim = await QR.toDataURL(qr, { margin: 1, width: 320 });
      bildir({ asama: 'qr', qr: resim, hata: null });
    }

    if (connection === 'open') {
      yenidenDeneme = 0;
      const kendi = sock.user || {};
      bildir({
        asama: 'bagli',
        qr: null,
        hata: null,
        numara: (kendi.id || '').split(':')[0].split('@')[0] || null,
        ad: kendi.name || kendi.verifiedName || null,
      });
    }

    if (connection === 'close') {
      const kod = lastDisconnect && lastDisconnect.error
        && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
      sock = null;

      if (kapatiliyor) { bildir({ asama: 'kapali', qr: null, numara: null, ad: null }); return; }

      if (kod === DisconnectReason.loggedOut) {
        oturumuTemizle();
        bildir({ asama: 'kapali', qr: null, numara: null, ad: null,
          hata: 'Oturum telefondan kapatılmış. Yeniden QR okutun.' });
        return;
      }

      yenidenDeneme++;
      if (yenidenDeneme > 5) {
        bildir({ asama: 'hata', qr: null, hata: 'Bağlantı kurulamadı, 5 deneme başarısız.' });
        return;
      }
      const bekle = Math.min(30000, 2000 * yenidenDeneme);
      bildir({ asama: 'baglaniyor', qr: null,
        hata: `Bağlantı koptu (${kod || 'bilinmiyor'}), ${bekle / 1000} sn sonra yeniden denenecek.` });
      zamanlayici = setTimeout(() => { baslat().catch(() => { }); }, bekle);
    }
  });

  return durumAl();
}

function sessizGunluk() {
  const bos = () => { };
  const g = { level: 'silent', trace: bos, debug: bos, info: bos, warn: bos, error: bos, fatal: bos };
  g.child = () => g;
  return g;
}

function oturumuTemizle() {
  try {
    if (oturumYolu && fs.existsSync(oturumYolu)) fs.rmSync(oturumYolu, { recursive: true, force: true });
    fs.mkdirSync(oturumYolu, { recursive: true });
  } catch { }
}

async function durdur() {
  kapatiliyor = true;
  clearTimeout(zamanlayici);
  if (sock) {
    try { sock.end(undefined); } catch { }
    sock = null;
  }
  bildir({ asama: 'kapali', qr: null, numara: null, ad: null, hata: null });
  return durumAl();
}

async function cikisYap() {
  kapatiliyor = true;
  clearTimeout(zamanlayici);
  if (sock) {
    try { await sock.logout(); } catch { }
    try { sock.end(undefined); } catch { }
    sock = null;
  }
  oturumuTemizle();
  bildir({ asama: 'kapali', qr: null, numara: null, ad: null, hata: null });
  return durumAl();
}

module.exports = { kur, baslat, durdur, cikisYap, durumAl, oturumVarMi };
