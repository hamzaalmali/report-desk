// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const { BrowserWindow, session } = require('electron');

const { YARDIM, indirmeyiIzle } = require('./portal');

const BOLME = 'persist:portal';
const VARSAYILAN_SAYFA_MS = 180000;
const INDIRME_SURESI = 180000;
const DUGMESIZ_BEKLEME = 3000;

const DUGME_DESENI = 'excel|indir|olustur|oluştur|rapor|getir|listele|download';

const TIKLA = (secici, desen) => `(function () {
  var rd = window.__rd;
  var aday = null;
  var s = ${JSON.stringify(secici || '')};
  if (s) {
    try { aday = document.querySelector(s); } catch (e) { aday = null; }
    if (!aday) aday = rd.bul(s);
    if (!aday && s.indexOf('/') === 0) aday = rd.xp(s);
  }
  if (!aday) {
    var hepsi = [].slice.call(document.querySelectorAll(
      'button, input[type=button], input[type=submit], a'));
    var re = new RegExp(${JSON.stringify(desen)}, 'i');
    for (var i = 0; i < hepsi.length; i++) {
      var e = hepsi[i];
      var m = (e.value || e.textContent || '').replace(/\\s+/g, ' ').trim();
      if (rd.gorunur(e) && re.test(m)) { aday = e; break; }
    }
  }
  if (!aday) return null;
  rd.tikla(aday);
  return {
    metin: (aday.value || aday.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40),
    id: aday.id || null,
    secici: !!s,
  };
})()`;

function uyu(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function adresiCoz(url, aralik) {
  const bas = aralik && aralik.bas ? aralik.bas : '';
  const son = aralik && aralik.son ? aralik.son : '';
  return String(url || '')
    .replace(/\{tarih\}/gi, encodeURIComponent(bas))
    .replace(/\{bas\}/gi, encodeURIComponent(bas))
    .replace(/\{son\}/gi, encodeURIComponent(son));
}

async function indir({
  url, klasor, dugme = '', aralik = null,
  sayfaMs = VARSAYILAN_SAYFA_MS, gorunur = false, kapat = true, log = () => { },
}) {
  if (!url) throw new Error('OSOS servisi adresi tanımlı değil.');
  fs.mkdirSync(klasor, { recursive: true });
  const hedefUrl = adresiCoz(url, aralik);

  const pencere = new BrowserWindow({
    width: 1100,
    height: 780,
    show: !!gorunur,
    autoHideMenuBar: true,
    title: 'OSOS servisi',
    backgroundColor: '#ffffff',
    webPreferences: {
      partition: BOLME,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const oturum = session.fromPartition(BOLME);
  const indirme = indirmeyiIzle(oturum, klasor);
  let indi = false;
  const sozu = indirme.sonraki().then((d) => { indi = true; return d; });
  sozu.catch(() => { });
  let hataOldu = false;

  try {
    await pencere.loadURL(hedefUrl);
    await uyu(DUGMESIZ_BEKLEME);

    if (!indi) {
      const tiklanan = await pencere.webContents.executeJavaScript(
        `${YARDIM}\n${TIKLA(dugme, DUGME_DESENI)}`, true
      );
      if (!tiklanan) {
        throw new Error('OSOS servisinde indirme düğmesi bulunamadı. '
          + 'Ayarlar\'daki "OSOS servisi indirme düğmesi" alanına düğmenin kimliğini '
          + 'ya da CSS seçicisini yazın.');
      }
      log(`OSOS servisi: "${tiklanan.metin || tiklanan.id}" düğmesine basıldı`
        + `${tiklanan.secici ? ' (ayarlardaki seçici)' : ''}.`);
    } else {
      log('OSOS servisi: sayfa açılır açılmaz dosya inmeye başladı.');
    }

    const zamanAsimi = new Promise((_c, red) => {
      const sayac = setTimeout(
        () => red(new Error('OSOS servisinden dosya inmedi (süre doldu).')),
        Math.max(INDIRME_SURESI, sayfaMs)
      );
      sozu.then(() => clearTimeout(sayac), () => clearTimeout(sayac));
    });
    const dosya = await Promise.race([sozu, zamanAsimi]);
    log(`OSOS servisinden dosya indi: ${dosya.ad} (${dosya.boyut} bayt)`);
    return dosya;
  } catch (e) {
    hataOldu = true;
    throw e;
  } finally {
    indirme.birak();
    if (kapat || hataOldu) {
      try { if (!pencere.isDestroyed()) pencere.destroy(); } catch { }
    }
  }
}

module.exports = { indir, adresiCoz, DUGME_DESENI };
