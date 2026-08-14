// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { BrowserWindow, session } = require('electron');

const ALAN = {
  kullanici: 'txtKullaniciAdi',
  sifre: 'txtSifre',
  giris: 'btnGiris',
  onayKodu: 'txtOnayKoduGiris',
  onay: 'btnOnay',
  rapor: 'ctl00_ContentPlaceHolder1_cmbRaporlar',
  basTarih: 'ctl00_ContentPlaceHolder1_dateTimeBASTARIH',
  sonTarih: 'ctl00_ContentPlaceHolder1_dateTimeSONTARIH',
  saat: 'ctl00_ContentPlaceHolder1_cmbSAAT',
  indir: 'ctl00_ContentPlaceHolder1_grdRaporKuyruk_ctl00_ctl04_btnRaporIndir_input',
};

const BOLME = 'persist:portal';
const SAYFA_SURESI = 60000;
const OGE_SURESI = 30000;
const INDIRME_SURESI = 180000;

const YARDIM = `
(function () {
  if (window.__rd) return;
  var rd = window.__rd = {};
  rd.xp = function (yol) {
    try { return document.evaluate(yol, document, null, 9, null).singleNodeValue; }
    catch (e) { return null; }
  };
  rd.gorunur = function (e) {
    if (!e) return false;
    var k = e.getBoundingClientRect();
    return (k.width > 0 || k.height > 0) && getComputedStyle(e).visibility !== 'hidden';
  };
  rd.bul = function (id) { return document.getElementById(id); };
  rd.yaz = function (e, deger) {
    if (!e) return null;
    var proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var d = Object.getOwnPropertyDescriptor(proto, 'value');
    try { e.focus(); } catch (x) { }
    if (d && d.set) d.set.call(e, deger); else e.value = deger;
    ['keydown', 'keypress', 'input', 'keyup', 'change', 'blur'].forEach(function (t) {
      try {
        e.dispatchEvent(t.indexOf('key') === 0
          ? new KeyboardEvent(t, { bubbles: true })
          : new Event(t, { bubbles: true }));
      } catch (x) { }
    });
    return e.value;
  };
  rd.tikla = function (e) {
    if (!e) return false;
    try { e.scrollIntoView({ block: 'center' }); } catch (x) { }
    try { e.focus(); } catch (x) { }
    ['mouseover', 'mousedown', 'mouseup'].forEach(function (t) {
      try { e.dispatchEvent(new MouseEvent(t, { bubbles: true })); } catch (x) { }
    });
    if (typeof e.click === 'function') { e.click(); return true; }
    try { e.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch (x) { }
    return true;
  };
  rd.denetim = function (id) {
    try { return window.$find ? window.$find(id) : null; } catch (e) { return null; }
  };
  rd.mesgul = function () {
    if (document.readyState !== 'complete') return true;
    try {
      var m = window.Sys && window.Sys.WebForms && window.Sys.WebForms.PageRequestManager
        && window.Sys.WebForms.PageRequestManager.getInstance();
      if (m && m.get_isInAsyncPostBack && m.get_isInAsyncPostBack()) return true;
    } catch (e) { }
    return false;
  };
  rd.comboAc = function (id) {
    var c = rd.denetim(id);
    if (c && c.showDropDown) { try { c.showDropDown(); return 'api'; } catch (e) { } }
    var ok = rd.bul(id + '_Arrow') || rd.bul(id + '_Input');
    return rd.tikla(ok) ? 'tik' : null;
  };
  rd.comboListe = function (id) {
    var kok = rd.bul(id + '_DropDown') || document;
    return [].slice.call(kok.querySelectorAll('li'))
      .map(function (l) { return (l.textContent || '').trim(); })
      .filter(function (t) { return t.length > 0; });
  };
  rd.comboSec = function (id, deger) {
    var kok = rd.bul(id + '_DropDown') || document;
    var hepsi = [].slice.call(kok.querySelectorAll('li'));
    var oge = hepsi.filter(function (l) { return (l.textContent || '').trim() === deger; })[0];
    if (!oge) {
      oge = hepsi.filter(function (l) {
        return (l.textContent || '').trim().toLowerCase() === String(deger).toLowerCase();
      })[0];
    }
    if (!oge) return null;
    rd.tikla(oge);
    return true;
  };
  rd.comboApi = function (id, deger) {
    var c = rd.denetim(id);
    if (!c) return null;
    var it = null;
    try { it = c.findItemByText ? c.findItemByText(deger) : null; } catch (e) { }
    if (!it) { try { it = c.findItemByValue ? c.findItemByValue(deger) : null; } catch (e) { } }
    if (it) {
      try { c.trackChanges(); } catch (e) { }
      try { it.select(); } catch (e) { return null; }
      try { c.commitChanges(); } catch (e) { }
      return 'api';
    }
    if (c.set_text) { try { c.set_text(deger); return 'metin'; } catch (e) { } }
    return null;
  };
  rd.comboDeger = function (id) {
    var c = rd.denetim(id);
    if (c && c.get_text) { try { return c.get_text(); } catch (e) { } }
    var i = rd.bul(id + '_Input');
    return i ? i.value : null;
  };
  rd.tarih = function (id, metin, gg, aa, yyyy) {
    var p = rd.denetim(id);
    if (p && p.set_selectedDate) {
      try { p.set_selectedDate(new Date(yyyy, aa - 1, gg)); } catch (e) { }
    }
    var g = rd.bul(id + '_dateInput');
    if (!g) return null;
    if ((g.value || '').trim() !== metin) rd.yaz(g, metin);
    return g.value;
  };
})();
`;

let calisan = null;

function uyu(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ikiHane(s) {
  return String(s).padStart(2, '0');
}

function tarihParcala(g) {
  return {
    gun: g.getDate(),
    ay: g.getMonth() + 1,
    yil: g.getFullYear(),
    metin: `${ikiHane(g.getDate())}.${ikiHane(g.getMonth() + 1)}.${g.getFullYear()}`,
  };
}

function tarihAraligi(gunGeri, bugun = new Date()) {
  const son = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate());
  const bas = new Date(son);
  bas.setDate(bas.getDate() - (Number(gunGeri) || 0));
  return { bas: tarihParcala(bas), son: tarihParcala(son) };
}

function damga(d = new Date()) {
  return `${d.getFullYear()}-${ikiHane(d.getMonth() + 1)}-${ikiHane(d.getDate())}`
    + `_${ikiHane(d.getHours())}${ikiHane(d.getMinutes())}${ikiHane(d.getSeconds())}`;
}

function dosyaAdiTemiz(metin) {
  return String(metin || '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function gizle(metin, gizliler) {
  let m = String(metin == null ? '' : metin);
  for (const g of gizliler) {
    if (!g || String(g).length < 3) continue;
    m = m.split(String(g)).join('***');
  }
  return m;
}

function eskileriSil(kok, kalan = 20) {
  try {
    const girdiler = fs.readdirSync(kok, { withFileTypes: true })
      .filter((g) => g.isDirectory())
      .map((g) => g.name)
      .sort();
    for (const ad of girdiler.slice(0, Math.max(0, girdiler.length - kalan))) {
      fs.rmSync(path.join(kok, ad), { recursive: true, force: true });
    }
  } catch { }
}

function durumAl() {
  if (!calisan) return { calisiyor: false };
  return {
    calisiyor: true,
    kim: calisan.kim,
    baslangic: calisan.baslangic,
    adim: calisan.adim,
    klasor: calisan.klasor,
    adimlar: calisan.adimlar,
  };
}

function iptal() {
  if (!calisan) return false;
  calisan.iptalIstendi = true;
  try { if (calisan.pencere && !calisan.pencere.isDestroyed()) calisan.pencere.destroy(); } catch { }
  return true;
}

function indirmeyiIzle(oturum, klasor) {
  let coz = null;
  let red = null;
  const sozu = new Promise((c, r) => { coz = c; red = r; });
  const dinleyici = (_olay, oge) => {
    const ad = oge.getFilename();
    const hedef = path.join(klasor, ad);
    try { oge.setSavePath(hedef); } catch { }
    oge.once('done', (_o, durum) => {
      if (durum === 'completed') coz({ dosya: hedef, ad, boyut: oge.getReceivedBytes() });
      else red(new Error(`İndirme tamamlanmadı (${durum}).`));
    });
  };
  oturum.on('will-download', dinleyici);
  return { sozu, birak: () => { try { oturum.removeListener('will-download', dinleyici); } catch { } } };
}

async function calistir(istek) {
  if (calisan) throw new Error('Portal işlemi zaten çalışıyor.');
  const {
    hesap, ayarlar, kokKlasor,
    onayKodu = async () => { throw new Error('Onay kodu sorulamadı.'); },
    ilerleme = () => { },
    log = () => { },
  } = istek;

  if (!ayarlar.girisUrl) throw new Error('Portal giriş adresi Ayarlar\'da tanımlı değil.');
  if (!ayarlar.raporAdi) throw new Error('Rapor adı Ayarlar\'da tanımlı değil.');
  if (!hesap || !hesap.kullanici || !hesap.sifre) {
    throw new Error('Bu numara için kullanıcı adı ve şifre tanımlı değil.');
  }

  const klasor = path.join(kokKlasor, damga());
  fs.mkdirSync(klasor, { recursive: true });
  eskileriSil(kokKlasor);

  const gizliler = [hesap.sifre, hesap.kullanici];
  const adimlar = [];
  let sira = 0;

  calisan = {
    kim: hesap.numara,
    baslangic: new Date().toISOString(),
    adim: null,
    klasor,
    adimlar,
    iptalIstendi: false,
    pencere: null,
  };

  const bildir = (o) => {
    try { ilerleme({ ...o, klasor }); } catch { }
  };

  const pencere = new BrowserWindow({
    width: 1360,
    height: 900,
    show: !!ayarlar.gorunur,
    autoHideMenuBar: true,
    title: 'Rapor portalı',
    backgroundColor: '#ffffff',
    webPreferences: {
      partition: BOLME,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  calisan.pencere = pencere;
  pencere.webContents.setWindowOpenHandler(() => ({ action: 'allow' }));

  let pencereKapandi = false;
  pencere.on('closed', () => { pencereKapandi = true; });

  const oturum = session.fromPartition(BOLME);
  const indirme = indirmeyiIzle(oturum, klasor);

  const kontrol = () => {
    if (calisan && calisan.iptalIstendi) throw new Error('İşlem durduruldu.');
    if (pencereKapandi) throw new Error('Tarayıcı penceresi kapatıldı.');
  };

  const js = async (kod) => {
    kontrol();
    return pencere.webContents.executeJavaScript(`${YARDIM}\n${kod}`, true);
  };

  const dene = async (ifade) => {
    try { return await js(`(function () { try { return (${ifade}); } catch (e) { return null; } })()`); }
    catch { return null; }
  };

  const bekle = async (ifade, aciklama, sure = OGE_SURESI) => {
    const bitis = Date.now() + sure;
    let son = null;
    while (Date.now() < bitis) {
      kontrol();
      son = await dene(ifade);
      if (son) return son;
      await uyu(300);
    }
    throw new Error(`Beklenen aşamaya ulaşılamadı: ${aciklama}`);
  };

  const sakinlesme = async (sure = 20000) => {
    const bitis = Date.now() + sure;
    await uyu(400);
    while (Date.now() < bitis) {
      kontrol();
      const m = await dene('window.__rd.mesgul()');
      if (m === false) { await uyu(250); return true; }
      await uyu(250);
    }
    return false;
  };

  const kaydet = async (kod) => {
    sira++;
    let baslik = '';
    let url = '';
    try {
      baslik = await pencere.webContents.executeJavaScript('document.title', true);
      url = pencere.webContents.getURL();
    } catch { }
    const taban = `${ikiHane(sira)}-${kod}${baslik ? '-' + dosyaAdiTemiz(baslik) : ''}`;
    let html = null;
    try {
      html = await pencere.webContents.executeJavaScript('document.documentElement.outerHTML', true);
      fs.writeFileSync(path.join(klasor, taban + '.html'), gizle(html, gizliler), 'utf8');
    } catch { }
    try {
      const resim = await pencere.webContents.capturePage();
      fs.writeFileSync(path.join(klasor, taban + '.png'), resim.toPNG());
    } catch { }
    return { dosya: taban, baslik, url, uzunluk: html ? html.length : 0 };
  };

  const adim = async (kod, ad, fn) => {
    kontrol();
    calisan.adim = kod;
    const kayit = { kod, ad, durum: 'calisiyor', basladi: new Date().toISOString() };
    adimlar.push(kayit);
    bildir({ ...kayit });
    log(`Portal adımı: ${ad}`);
    try {
      const sonuc = await fn();
      const iz = await kaydet(kod);
      Object.assign(kayit, {
        durum: 'bitti', bitti: new Date().toISOString(), sonuc: sonuc || null, iz,
      });
      bildir({ ...kayit });
      return sonuc;
    } catch (e) {
      let iz = null;
      try { iz = await kaydet(kod + '-HATA'); } catch { }
      Object.assign(kayit, {
        durum: 'hata', bitti: new Date().toISOString(), hata: e.message, iz,
      });
      bildir({ ...kayit });
      throw e;
    }
  };

  const aralik = tarihAraligi(ayarlar.gunGeri);

  try {
    await adim('giris-sayfasi', 'Giriş sayfası açılıyor', async () => {
      await pencere.loadURL(ayarlar.girisUrl);
      await sakinlesme();
      await bekle(`!!window.__rd.bul(${JSON.stringify(ALAN.kullanici)})`, 'kullanıcı adı kutusu');
      return { url: pencere.webContents.getURL() };
    });

    await adim('giris', 'Kullanıcı adı ve şifre giriliyor', async () => {
      await js(`window.__rd.yaz(window.__rd.bul(${JSON.stringify(ALAN.kullanici)}),`
        + ` ${JSON.stringify(hesap.kullanici)})`);
      await js(`window.__rd.yaz(window.__rd.bul(${JSON.stringify(ALAN.sifre)}),`
        + ` ${JSON.stringify(hesap.sifre)})`);
      await uyu(200);
      await js(`window.__rd.tikla(window.__rd.bul(${JSON.stringify(ALAN.giris)}))`);
      await uyu(1500);
      await sakinlesme(30000);
      await bekle(
        `(function () {
           var o = window.__rd.bul(${JSON.stringify(ALAN.onayKodu)});
           if (o && window.__rd.gorunur(o)) return 'onay';
           if (!window.__rd.bul(${JSON.stringify(ALAN.giris)})) return 'gecti';
           return null;
         })()`,
        'giriş sonrası ekran — hâlâ giriş sayfasındayız, kullanıcı adı veya şifre yanlış olabilir'
        + ' (kaydedilen HTML dosyasına bakın)', 45000
      );
      return { url: pencere.webContents.getURL() };
    });

    const onayGerekli = await dene(
      `(function () { var o = window.__rd.bul(${JSON.stringify(ALAN.onayKodu)});`
      + ' return !!(o && window.__rd.gorunur(o)); })()'
    );

    if (onayGerekli) {
      await adim('onay-kodu', 'Onay kodu bekleniyor', async () => {
        let sonHata = null;
        for (let deneme = 1; deneme <= 2; deneme++) {
          kontrol();
          const kod = String(await onayKodu(deneme, sonHata) || '').replace(/\D/g, '');
          if (!kod) throw new Error('Onay kodu alınamadı.');
          await js(`window.__rd.yaz(window.__rd.bul(${JSON.stringify(ALAN.onayKodu)}),`
            + ` ${JSON.stringify(kod)})`);
          await uyu(200);
          await js(`window.__rd.tikla(window.__rd.bul(${JSON.stringify(ALAN.onay)}))`);
          await uyu(1500);
          await sakinlesme(30000);
          const halaVar = await dene(
            `(function () { var o = window.__rd.bul(${JSON.stringify(ALAN.onayKodu)});`
            + ' return !!(o && window.__rd.gorunur(o)); })()'
          );
          if (!halaVar) return { deneme, url: pencere.webContents.getURL() };
          sonHata = 'Kod kabul edilmedi.';
        }
        throw new Error('Onay kodu kabul edilmedi.');
      });
    } else {
      log('Portal: onay kodu istenmedi, oturum hatırlanmış olabilir.');
    }

    await adim('ana-sayfa', 'Ana sayfaya gidiliyor', async () => {
      const hedef = ayarlar.anaUrl || ayarlar.girisUrl;
      await pencere.loadURL(hedef);
      await sakinlesme();
      return { url: pencere.webContents.getURL() };
    });

    await adim('raporlar-menu', 'Raporlar menüsü açılıyor', async () => {
      const menu = await js(
        `(function () { var e = window.__rd.xp(${JSON.stringify(ayarlar.menuXpath)});`
        + ' if (!e) return null; window.__rd.tikla(e);'
        + ' var a = e.querySelector(":scope > a"); if (a) window.__rd.tikla(a);'
        + ' return (e.textContent || "").trim().slice(0, 60); })()'
      );
      if (!menu) throw new Error('Raporlar menüsü bulunamadı (XPath tutmuyor).');
      await uyu(700);
      const alt = await js(
        `(function () { var e = window.__rd.xp(${JSON.stringify(ayarlar.altMenuXpath)});`
        + ' if (!e) return null; window.__rd.tikla(e);'
        + ' return (e.textContent || "").trim().slice(0, 60); })()'
      );
      if (!alt) throw new Error('Raporlar alt menüsü bulunamadı (XPath tutmuyor).');
      await uyu(1500);
      await sakinlesme(30000);
      await bekle(`!!window.__rd.bul(${JSON.stringify(ALAN.rapor + '_Input')})`,
        'rapor seçim kutusu', SAYFA_SURESI);
      return { menu, alt, url: pencere.webContents.getURL() };
    });

    await adim('rapor-secimi', `Rapor seçiliyor: ${ayarlar.raporAdi}`, async () => {
      await js(`window.__rd.comboAc(${JSON.stringify(ALAN.rapor)})`);
      await uyu(900);
      let yontem = await dene(
        `window.__rd.comboSec(${JSON.stringify(ALAN.rapor)}, ${JSON.stringify(ayarlar.raporAdi)})`
      ) ? 'liste' : null;
      if (!yontem) {
        yontem = await dene(
          `window.__rd.comboApi(${JSON.stringify(ALAN.rapor)}, ${JSON.stringify(ayarlar.raporAdi)})`
        );
      }
      await uyu(1200);
      await sakinlesme(30000);
      const deger = await dene(`window.__rd.comboDeger(${JSON.stringify(ALAN.rapor)})`);
      if (!deger) throw new Error('Rapor seçilemedi.');
      const secenekler = await dene(`window.__rd.comboListe(${JSON.stringify(ALAN.rapor)}).slice(0, 60)`);
      if (String(deger).trim() !== String(ayarlar.raporAdi).trim()) {
        throw new Error(`Rapor adı kutuya yerleşmedi (kutuda "${deger}" yazıyor). `
          + `Listedekiler: ${(secenekler || []).join(' | ') || 'okunamadı'}`);
      }
      return { yontem, deger };
    });

    await adim('tarihler', 'Tarih ve saat yazılıyor', async () => {
      const bas = await js(
        `window.__rd.tarih(${JSON.stringify(ALAN.basTarih)}, ${JSON.stringify(aralik.bas.metin)},`
        + ` ${aralik.bas.gun}, ${aralik.bas.ay}, ${aralik.bas.yil})`
      );
      const son = await js(
        `window.__rd.tarih(${JSON.stringify(ALAN.sonTarih)}, ${JSON.stringify(aralik.son.metin)},`
        + ` ${aralik.son.gun}, ${aralik.son.ay}, ${aralik.son.yil})`
      );
      await uyu(400);

      await js(`window.__rd.comboAc(${JSON.stringify(ALAN.saat)})`);
      await uyu(700);
      let saatYontem = await dene(
        `window.__rd.comboSec(${JSON.stringify(ALAN.saat)}, ${JSON.stringify(ayarlar.saat)})`
      ) ? 'liste' : null;
      if (!saatYontem) {
        saatYontem = await dene(
          `window.__rd.comboApi(${JSON.stringify(ALAN.saat)}, ${JSON.stringify(ayarlar.saat)})`
        );
      }
      await uyu(800);
      await sakinlesme(20000);
      const saat = await dene(`window.__rd.comboDeger(${JSON.stringify(ALAN.saat)})`);

      if (!bas || !son) throw new Error('Tarih kutuları bulunamadı.');
      return { bas, son, saat, saatYontem, istenenBas: aralik.bas.metin, istenenSon: aralik.son.metin };
    });

    const sonuc = await adim('indir', 'Rapor indiriliyor', async () => {
      const varMi = await dene(`!!window.__rd.bul(${JSON.stringify(ALAN.indir)})`);
      if (!varMi) {
        throw new Error('İndirme düğmesi ekranda yok — rapor kuyruğa düşmemiş olabilir. '
          + 'Kaydedilen HTML dosyasından bakılabilir.');
      }
      await js(`window.__rd.tikla(window.__rd.bul(${JSON.stringify(ALAN.indir)}))`);
      const zamanAsimi = new Promise((_c, red) => {
        const sayac = setTimeout(() => red(new Error('İndirme süresi doldu.')), INDIRME_SURESI);
        indirme.sozu.then(() => clearTimeout(sayac), () => clearTimeout(sayac));
      });
      return Promise.race([indirme.sozu, zamanAsimi]);
    });

    const ozet = {
      klasor,
      dosya: sonuc ? sonuc.dosya : null,
      dosyaAdi: sonuc ? sonuc.ad : null,
      boyut: sonuc ? sonuc.boyut : null,
      adimlar,
      aralik: { bas: aralik.bas.metin, son: aralik.son.metin, saat: ayarlar.saat },
    };
    fs.writeFileSync(path.join(klasor, 'ozet.json'), JSON.stringify(ozet, null, 2), 'utf8');
    log(`Portal işlemi tamam: ${ozet.dosyaAdi || 'dosya yok'} → ${klasor}`);
    return ozet;
  } catch (e) {
    try {
      fs.writeFileSync(path.join(klasor, 'ozet.json'),
        JSON.stringify({ klasor, hata: e.message, adimlar }, null, 2), 'utf8');
    } catch { }
    log(`Portal işlemi başarısız: ${e.message}`);
    throw e;
  } finally {
    indirme.birak();
    calisan = null;
    if (ayarlar.kapat) {
      try { if (!pencere.isDestroyed()) pencere.destroy(); } catch { }
    }
  }
}

module.exports = { calistir, durumAl, iptal, tarihAraligi, dosyaAdiTemiz, gizle, ALAN };
