// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const QR = require('qrcode');
const { komutBul } = require('./komut');

const CIHAZ_ADI = 'ALMALI';

let sock = null;
let oturumYolu = null;
let dinleyici = () => { };
let kapatiliyor = false;
let komutIsleyici = null;
let gunlukYaz = () => { };
const sonKomut = new Map();
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

function gunluk(metin) {
  try { gunlukYaz(metin); } catch { }
}

function kur(klasor, olayFn, komutFn, logFn) {
  oturumYolu = klasor;
  if (olayFn) dinleyici = olayFn;
  if (komutFn) komutIsleyici = komutFn;
  if (logFn) gunlukYaz = logFn;
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
  sock.ev.on('messages.upsert', (olay) => {
    if (olay.type !== 'notify') return;
    for (const m of olay.messages || []) gelenMesaj(m).catch(() => { });
  });

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

const KOMUT_BEKLEME = 15000;
const kendiYanitlarimiz = new Set();
const bekleyenSorular = new Map();

function yanitiIsaretle(gonderim) {
  const kimlik = gonderim && gonderim.key && gonderim.key.id;
  if (!kimlik) return;
  kendiYanitlarimiz.add(kimlik);
  if (kendiYanitlarimiz.size > 50) {
    kendiYanitlarimiz.delete(kendiYanitlarimiz.values().next().value);
  }
}

async function gonder(sohbet, metin) {
  const s = bagliMi();
  yanitiIsaretle(await s.sendMessage(sohbet, { text: String(metin) }));
  return true;
}

function soruyuDusur(numara, hata) {
  const b = bekleyenSorular.get(numara);
  if (!b) return;
  clearTimeout(b.sayac);
  bekleyenSorular.delete(numara);
  b.red(hata);
}

function soruDusur(numara) {
  const vardi = bekleyenSorular.has(numara);
  soruyuDusur(numara, new Error('Bekleyen soru iptal edildi.'));
  return vardi;
}

async function sor(sohbet, numara, metin, sureMs = 180000) {
  soruyuDusur(numara, new Error('Yeni bir soru sorulunca bu soru düştü.'));
  await gonder(sohbet, metin);
  return new Promise((coz, red) => {
    const sayac = setTimeout(() => {
      bekleyenSorular.delete(numara);
      red(new Error('Yanıt gelmedi, süre doldu.'));
    }, sureMs);
    bekleyenSorular.set(numara, { coz, red, sayac, sohbet });
  });
}

function mesajMetni(m) {
  const i = m.message || {};
  return i.conversation
    || (i.extendedTextMessage && i.extendedTextMessage.text)
    || (i.imageMessage && i.imageMessage.caption)
    || (i.videoMessage && i.videoMessage.caption)
    || '';
}

function numaraCikar(jid) {
  return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

function lidMi(jid) {
  return String(jid || '').includes('@lid');
}

function kendiNumara() {
  return numaraCikar((sock && sock.user && sock.user.id) || '');
}

async function lidNumarasi(jid) {
  try {
    const esleme = sock && sock.signalRepository && sock.signalRepository.lidMapping;
    if (esleme && typeof esleme.getPNForLID === 'function') {
      const pn = await esleme.getPNForLID(jid);
      if (pn) return numaraCikar(pn);
    }
  } catch { }
  return null;
}

async function gonderenNumara(m, kendi) {
  const k = m.key;
  if (k.fromMe) return kendi != null ? kendi : kendiNumara();

  const grup = String(k.remoteJid || '').endsWith('@g.us');
  const adaylar = grup
    ? [k.participantAlt, k.participant]
    : [k.remoteJidAlt, k.remoteJid, k.participantAlt, k.participant];

  for (const a of adaylar) {
    if (a && !lidMi(a)) return numaraCikar(a);
  }
  for (const a of adaylar) {
    if (!a) continue;
    const pn = await lidNumarasi(a);
    if (pn) return pn;
  }
  return numaraCikar(adaylar.find(Boolean));
}

async function gelenMesaj(m) {
  if (!komutIsleyici || !m || !m.key) return;
  if (m.key.id && kendiYanitlarimiz.has(m.key.id)) return;

  const metin = mesajMetni(m).trim();
  const sohbet = m.key.remoteJid;
  const gonderen = metin ? await gonderenNumara(m) : '';

  const eslesme = metin ? komutBul(metin) : null;
  gunluk(`WhatsApp mesaj: sohbet=${sohbet || '?'} biçim=${m.key.addressingMode || '?'}`
    + ` katılımcı=${m.key.participant || '-'}/${m.key.participantAlt || '-'}`
    + ` karşı=${m.key.remoteJidAlt || '-'} benden=${m.key.fromMe ? 'evet' : 'hayır'}`
    + ` gönderen=${gonderen || '?'} uzunluk=${metin.length}`
    + ` komut=${eslesme ? eslesme.kod : 'yok'}`);

  if (!metin || !gonderen) return;

  const bekleyen = bekleyenSorular.get(gonderen);
  if (bekleyen) {
    clearTimeout(bekleyen.sayac);
    bekleyenSorular.delete(gonderen);
    gunluk(`WhatsApp yanıtı alındı: ${gonderen} → ${metin.length} karakter`);
    bekleyen.coz(metin);
    return;
  }

  const simdi = Date.now();
  if (simdi - (sonKomut.get(gonderen) || 0) < KOMUT_BEKLEME) {
    gunluk(`WhatsApp mesaj atlandı: ${gonderen} için bekleme süresi dolmadı`);
    return;
  }

  sonKomut.set(gonderen, simdi);
  let yanit = null;
  try {
    yanit = await komutIsleyici({
      gonderen,
      metin,
      sohbet,
      grupMu: String(sohbet).endsWith('@g.us'),
      gonder: (t) => gonder(sohbet, t),
      sor: (t, sure) => sor(sohbet, gonderen, t, sure),
    });
  } finally {
    sonKomut.delete(gonderen);
  }
  if (!yanit) return;

  try {
    yanitiIsaretle(await sock.sendMessage(sohbet, { text: yanit }, { quoted: m }));
  } catch { }
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

const XLSX_TUR = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const GONDERIM_ARASI = 3000;

const TURLER = {
  '.xlsx': XLSX_TUR,
  '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
};

function dosyaTuru(ad) {
  return TURLER[path.extname(String(ad || '')).toLowerCase()] || XLSX_TUR;
}

function bagliMi() {
  if (!sock || durum.asama !== 'bagli') throw new Error('WhatsApp bağlı değil.');
  return sock;
}

async function gruplariGetir() {
  const s = bagliMi();
  const hepsi = await s.groupFetchAllParticipating();
  return Object.values(hepsi || {})
    .map((g) => ({
      jid: g.id,
      ad: g.subject || g.id,
      katilimci: (g.participants || []).length,
      duyuru: !!g.announce,
      yonetici: !!(g.participants || []).some(
        (p) => p.id === (s.user || {}).id && (p.admin === 'admin' || p.admin === 'superadmin')
      ),
    }))
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

async function belgeGonder(jid, dosyaYolu, dosyaAdi, aciklama) {
  const s = bagliMi();
  const ad = dosyaAdi || path.basename(dosyaYolu);
  const veri = fs.readFileSync(dosyaYolu);
  yanitiIsaretle(await s.sendMessage(jid, {
    document: veri,
    fileName: ad,
    mimetype: dosyaTuru(ad),
    caption: aciklama || '',
  }));
}

async function topluBelgeGonder(jidler, dosyaYolu, dosyaAdi, aciklama, ilerleme) {
  bagliMi();
  const sonuc = [];
  for (let i = 0; i < jidler.length; i++) {
    const jid = jidler[i];
    try {
      await belgeGonder(jid, dosyaYolu, dosyaAdi, aciklama);
      sonuc.push({ jid, ok: true });
    } catch (e) {
      sonuc.push({ jid, ok: false, hata: e.message });
    }
    if (ilerleme) { try { ilerleme({ sira: i + 1, toplam: jidler.length, jid }); } catch { } }
    if (i < jidler.length - 1) await new Promise((r) => setTimeout(r, GONDERIM_ARASI));
  }
  return sonuc;
}

module.exports = {
  kur, baslat, durdur, cikisYap, durumAl, oturumVarMi,
  gruplariGetir, belgeGonder, topluBelgeGonder, dosyaTuru,
  gonderenNumara, mesajMetni, gonder, sor, soruDusur,
};
