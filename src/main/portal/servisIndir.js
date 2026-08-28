// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const zlib = require('node:zlib');
const { BrowserWindow, session } = require('electron');

const { YARDIM, indirmeyiIzle } = require('./portal');

// OSOS servisi portalin disinda, ayri bir sunucuda duruyor. Indirme portal
// oturumundan (cerezler, proxy, pencere) tamamen bagimsiz olsun diye duz
// http/https ile yapiliyor; dusme ihtimali olan pencere yolu ancak adres
// dosya yerine sayfa dondurdugunde devreye giriyor ve o da kendi bolmesinde.
const BOLME = 'persist:ososServis';
const YONLENDIRME_SINIRI = 5;
// Ic ag adreslerinde sertifika cogu zaman IP'ye uymuyor; disari cikan bir
// baglanti olmadigi icin yalniz bu araliklarda dogrulama gevsetiliyor.
const IC_AG = /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|localhost$)/i;
const VARSAYILAN_SAYFA_MS = 180000;
const INDIRME_SURESI = 180000;
const DUGMESIZ_BEKLEME = 3000;
// Servis dosyayi istek aninda uretiyor: ilk bayt gecikiyor, arada veri akmiyor.
// Olculen sure ~70 sn ama yuke gore uzuyor; ilk yanit icin genis, akis
// basladiktan sonra parcalar arasi bosluk icin ayri sinir kullanilir.
const ILK_YANIT_SURESI = 900000;
const AKIS_BOSLUK_SURESI = 180000;
// Servis bazen anlik olarak dusuyor; butun isi (icinde 15 dakikalik rapor da var)
// bastan almaktansa yalniz bu adimi birkac kez denemek dogru.
const DENEME_SAYISI = 3;
const DENEME_ARASI_MS = 15000;
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

function icAgMi(hedefUrl) {
  try { return IC_AG.test(new URL(hedefUrl).hostname); } catch { return false; }
}

function cozucu(kodlama) {
  const k = String(kodlama || '').toLowerCase();
  if (k === 'gzip' || k === 'x-gzip') return zlib.createGunzip();
  if (k === 'deflate') return zlib.createInflate();
  if (k === 'br') return zlib.createBrotliDecompress();
  return null;
}

function tekDeger(v) {
  return Array.isArray(v) ? v[0] : v;
}

function basliklariDuzle(ham) {
  const cikti = {};
  for (const [a, d] of Object.entries(ham || {})) cikti[a.toLowerCase()] = tekDeger(d);
  return cikti;
}

function iptalHatasi() {
  const e = new Error('OSOS servisinden indirme iptal edildi.');
  e.iptal = true;
  return e;
}

function dogrudanIndir(hedefUrl, klasor, log, ilkYanitMs = ILK_YANIT_SURESI,
  iptal = () => false, kalanYonlendirme = YONLENDIRME_SINIRI) {
  return new Promise((coz, red) => {
    if (iptal()) return red(iptalHatasi());
    let adres;
    try {
      adres = new URL(hedefUrl);
    } catch {
      return red(new Error(`OSOS servisi adresi anlaşılamadı: ${hedefUrl}`));
    }
    if (adres.protocol !== 'http:' && adres.protocol !== 'https:') {
      return red(new Error('OSOS servisi adresi http ya da https olmalı.'));
    }

    const kitaplik = adres.protocol === 'https:' ? https : http;
    let istek;
    try {
      istek = kitaplik.request(adres, {
        method: 'GET',
        headers: { Accept: '*/*', 'Accept-Encoding': 'gzip, deflate', 'User-Agent': 'report-desk' },
        ...(adres.protocol === 'https:' && icAgMi(hedefUrl) ? { rejectUnauthorized: false } : {}),
      });
    } catch (e) {
      return red(new Error(`OSOS servisine istek açılamadı: ${e.message}`));
    }

    let sayac = null;
    let nobetci = null;
    let bitti = false;
    let akis = null;
    let yazici = null;
    let hedef = null;
    const kur = (ms, mesaj) => {
      if (sayac) clearTimeout(sayac);
      sayac = setTimeout(() => {
        try { istek.destroy(); } catch { }
        dur(red, new Error(mesaj));
      }, ms);
    };
    const dur = (fn, deger) => {
      if (bitti) return;
      bitti = true;
      if (sayac) clearTimeout(sayac);
      if (nobetci) clearInterval(nobetci);
      if (akis) { try { akis.destroy(); } catch { } }
      if (yazici) { try { yazici.destroy(); } catch { } }
      if (fn === red && hedef) { try { fs.unlinkSync(hedef); } catch { } }
      fn(deger);
    };
    kur(ilkYanitMs, `OSOS servisi ${Math.round(ilkYanitMs / 1000)} saniyede yanıt vermedi.`);
    // Portal isi yarida kalirsa (ornegin giris reddedilirse) burada bekleyen
    // indirmenin dakikalarca surmesinin anlami yok; nobetci onu da kesiyor.
    nobetci = setInterval(() => {
      if (!iptal()) return;
      try { istek.destroy(); } catch { }
      dur(red, iptalHatasi());
    }, 1000);
    if (nobetci.unref) nobetci.unref();

    istek.on('error', (e) => dur(red,
      new Error(`OSOS servisine ulaşılamadı: ${e.message}`)));

    istek.on('response', (yanit) => {
      kur(AKIS_BOSLUK_SURESI, 'OSOS servisinden gelen dosya yarıda kesildi (akış durdu).');
      const basliklar = basliklariDuzle(yanit.headers);
      const durum = yanit.statusCode || 0;

      if (durum >= 300 && durum < 400 && basliklar.location) {
        yanit.resume();
        if (!kalanYonlendirme) {
          return dur(red, new Error('OSOS servisi çok fazla yönlendirme yaptı.'));
        }
        const sonraki = new URL(basliklar.location, adres).toString();
        if (sayac) clearTimeout(sayac);
        if (nobetci) clearInterval(nobetci);
        bitti = true;
        return dogrudanIndir(sonraki, klasor, log, ilkYanitMs, iptal, kalanYonlendirme - 1)
          .then(coz, red);
      }
      if (durum >= 400) {
        yanit.resume();
        return dur(red, new Error(
          `OSOS servisi ${durum} yanıtı verdi (${hedefUrl}).`));
      }
      if (!dosyaYaniti(basliklar)) {
        yanit.resume();
        yanit.on('end', () => dur(coz, null));
        return null;
      }

      const ad = dosyaAdiCoz(basliklar, hedefUrl);
      hedef = benzersizYol(klasor, ad);
      yazici = fs.createWriteStream(hedef);
      const ac = cozucu(basliklar['content-encoding']);
      akis = ac ? yanit.pipe(ac) : yanit;
      let boyut = 0;

      const kesil = (e) => dur(red, e);
      yanit.on('error', () => kesil(new Error('OSOS servisinden gelen dosya yarıda kesildi.')));
      if (ac) ac.on('error', (e) => kesil(new Error(`OSOS dosyası açılamadı: ${e.message}`)));
      yazici.on('error', (e) => kesil(new Error(`OSOS dosyası yazılamadı: ${e.message}`)));

      akis.on('data', (p) => {
        kur(AKIS_BOSLUK_SURESI, 'OSOS servisinden gelen dosya yarıda kesildi (akış durdu).');
        boyut += p.length;
        if (boyut > EN_BUYUK_DOSYA) {
          try { istek.destroy(); } catch { }
          try { yazici.destroy(); } catch { }
          kesil(new Error('OSOS servisinden gelen dosya beklenenden büyük.'));
        }
      });
      akis.pipe(yazici);
      yazici.on('close', () => {
        if (bitti) return;
        if (!boyut) {
          try { fs.unlinkSync(hedef); } catch { }
          hedef = null;
          return dur(coz, null);
        }
        const yol = hedef;
        hedef = null;
        log(`OSOS servisi: adres doğrudan dosya verdi (${path.basename(yol)}).`);
        return dur(coz, { dosya: yol, ad: path.basename(yol), boyut });
      });
      return null;
    });
    istek.end();
    return null;
  });
}

async function indir({
  url, klasor, dugme = '', aralik = null,
  sayfaMs = VARSAYILAN_SAYFA_MS, gorunur = false, kapat = true, log = () => { },
  denemeArasiMs = DENEME_ARASI_MS, iptal = () => false,
}) {
  if (!url) throw new Error('OSOS servisi adresi tanımlı değil.');
  fs.mkdirSync(klasor, { recursive: true });
  const hedefUrl = adresiCoz(url, aralik);

  let dogrudan = null;
  let sonHata = null;
  for (let deneme = 1; deneme <= DENEME_SAYISI; deneme++) {
    try {
      dogrudan = await dogrudanIndir(hedefUrl, klasor, log,
        Math.max(ILK_YANIT_SURESI, sayfaMs), iptal);
      sonHata = null;
      break;
    } catch (e) {
      sonHata = e;
      if (e.iptal || deneme >= DENEME_SAYISI) break;
      log(`OSOS servisi ${deneme}. denemede başarısız (${e.message}); `
        + `${Math.round(denemeArasiMs / 1000)} sn sonra yeniden denenecek.`);
      await uyu(denemeArasiMs);
    }
  }
  if (sonHata) throw sonHata;
  if (dogrudan) return dogrudan;
  if (iptal()) throw iptalHatasi();
  log('OSOS servisi: adres sayfa döndürdü, indirme düğmesi aranacak.');
  const oturum = session.fromPartition(BOLME);

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
  ILK_YANIT_SURESI, AKIS_BOSLUK_SURESI, DENEME_SAYISI,
};
