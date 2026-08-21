// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { BrowserWindow, session, net } = require('electron');

const { YARDIM, indirmeyiIzle } = require('./portal');

const BOLME = 'persist:portal';
const VARSAYILAN_SAYFA_MS = 180000;
const INDIRME_SURESI = 180000;
const DUGMESIZ_BEKLEME = 3000;
const DOGRUDAN_SURESI = 120000;
const EN_BUYUK_DOSYA = 200 * 1024 * 1024;
const VARSAYILAN_DOSYA = 'osos_rapor.xlsx';
const SAYFA_TURU = /^(text\/html|application\/xhtml)/i;

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

function benzersizYol(klasor, ad) {
  let hedef = path.join(klasor, ad);
  const uzanti = path.extname(ad);
  const govde = ad.slice(0, ad.length - uzanti.length);
  let n = 2;
  while (fs.existsSync(hedef)) {
    hedef = path.join(klasor, `${govde}-${n++}${uzanti}`);
  }
  return hedef;
}

function dosyaAdiCoz(basliklar, url) {
  const ham = String((basliklar && (basliklar['content-disposition']
    || basliklar['Content-Disposition'])) || '');
  const yildizli = ham.match(/filename\*\s*=\s*[^']*''([^;]+)/i);
  if (yildizli) {
    try { return path.basename(decodeURIComponent(yildizli[1].trim())); } catch { }
  }
  const duz = ham.match(/filename\s*=\s*"([^"]+)"/i) || ham.match(/filename\s*=\s*([^;]+)/i);
  if (duz) {
    const ad = path.basename(duz[1].trim());
    if (ad) return ad;
  }
  try {
    const ad = path.basename(new URL(url).pathname);
    if (ad && ad.includes('.')) return ad;
  } catch { }
  return VARSAYILAN_DOSYA;
}

function dosyaYaniti(basliklar) {
  const tur = String((basliklar && (basliklar['content-type']
    || basliklar['Content-Type'])) || '');
  const ek = String((basliklar && (basliklar['content-disposition']
    || basliklar['Content-Disposition'])) || '');
  if (/attachment/i.test(ek)) return true;
  if (!tur) return false;
  return !SAYFA_TURU.test(tur.split(';')[0].trim());
}

function tekDeger(v) {
  return Array.isArray(v) ? v[0] : v;
}

function basliklariDuzle(ham) {
  const cikti = {};
  for (const [a, d] of Object.entries(ham || {})) cikti[a.toLowerCase()] = tekDeger(d);
  return cikti;
}

function dogrudanIndir(hedefUrl, klasor, oturum, log) {
  return new Promise((coz, red) => {
    let istek;
    try {
      istek = net.request({ url: hedefUrl, session: oturum, useSessionCookies: true });
    } catch (e) {
      return coz(null);
    }
    const sayac = setTimeout(() => {
      try { istek.abort(); } catch { }
      red(new Error('OSOS servisi yanıt vermedi (süre doldu).'));
    }, DOGRUDAN_SURESI);
    const bitir = (fn, deger) => { clearTimeout(sayac); fn(deger); };

    istek.on('error', (e) => bitir(red,
      new Error(`OSOS servisine ulaşılamadı: ${e.message}`)));

    istek.on('response', (yanit) => {
      const basliklar = basliklariDuzle(yanit.headers);
      if (yanit.statusCode >= 400) {
        yanit.on('data', () => { });
        yanit.on('end', () => { });
        return bitir(red, new Error(
          `OSOS servisi ${yanit.statusCode} yanıtı verdi (${hedefUrl}).`));
      }
      if (!dosyaYaniti(basliklar)) {
        yanit.on('data', () => { });
        yanit.on('end', () => bitir(coz, null));
        return null;
      }
      const parcalar = [];
      let boyut = 0;
      yanit.on('data', (p) => {
        boyut += p.length;
        if (boyut > EN_BUYUK_DOSYA) {
          try { istek.abort(); } catch { }
          return bitir(red, new Error('OSOS servisinden gelen dosya beklenenden büyük.'));
        }
        parcalar.push(p);
        return null;
      });
      yanit.on('end', () => {
        if (!boyut) return bitir(coz, null);
        const ad = dosyaAdiCoz(basliklar, hedefUrl);
        const hedef = benzersizYol(klasor, ad);
        fs.writeFileSync(hedef, Buffer.concat(parcalar));
        log(`OSOS servisi: adres doğrudan dosya verdi (${ad}).`);
        return bitir(coz, { dosya: hedef, ad: path.basename(hedef), boyut });
      });
      return null;
    });
    istek.end();
  });
}

async function indir({
  url, klasor, dugme = '', aralik = null,
  sayfaMs = VARSAYILAN_SAYFA_MS, gorunur = false, kapat = true, log = () => { },
}) {
  if (!url) throw new Error('OSOS servisi adresi tanımlı değil.');
  fs.mkdirSync(klasor, { recursive: true });
  const hedefUrl = adresiCoz(url, aralik);
  const oturum = session.fromPartition(BOLME);

  const dogrudan = await dogrudanIndir(hedefUrl, klasor, oturum, log);
  if (dogrudan) return dogrudan;
  log('OSOS servisi: adres sayfa döndürdü, indirme düğmesi aranacak.');

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

  const indirme = indirmeyiIzle(oturum, klasor);
  let indi = false;
  const sozu = indirme.sonraki().then((d) => { indi = true; return d; });
  sozu.catch(() => { });
  let hataOldu = false;

  try {
    try {
      await pencere.loadURL(hedefUrl);
    } catch (e) {
      if (!/ERR_ABORTED/.test(e.message || '')) throw e;
    }
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

module.exports = {
  indir, adresiCoz, dosyaAdiCoz, dosyaYaniti, DUGME_DESENI, VARSAYILAN_DOSYA,
};
