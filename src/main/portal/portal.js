// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { BrowserWindow, session } = require('electron');
const { kars } = require('../../shared/tr');

const ALAN = {
  kullanici: 'txtKullaniciAdi',
  sifre: 'txtSifre',
  giris: 'btnGiris',
  onayKodu: 'txtOnayKoduGiris',
  onay: 'btnOnay',
  rapor: 'ctl00_ContentPlaceHolder1_cmbRaporlar',
  ilKodu: 'ctl00_ContentPlaceHolder1_cmbILKODU',
  mudurlukKodu: 'ctl00_ContentPlaceHolder1_cmbMUDURLUKKODU',
  basTarih: 'ctl00_ContentPlaceHolder1_dateTimeBASTARIH',
  sonTarih: 'ctl00_ContentPlaceHolder1_dateTimeSONTARIH',
  basTarihAlt: 'ctl00_ContentPlaceHolder1_dateTimeBASLANGICTARIHI',
  sonTarihAlt: 'ctl00_ContentPlaceHolder1_dateTimeBITISTARIHI',
  saat: 'ctl00_ContentPlaceHolder1_cmbSAAT',
  ilkSaat: 'ctl00_ContentPlaceHolder1_cmbILKSAAT',
  sonSaat: 'ctl00_ContentPlaceHolder1_cmbSONSAAT',
  kaydet: 'ctl00_ContentPlaceHolder1_btnRaporKaydet_input',
  yenile: 'ctl00_ContentPlaceHolder1_btnRaporKuyrukYenile_input',
  indir: 'ctl00_ContentPlaceHolder1_grdRaporKuyruk_ctl00_ctl04_btnRaporIndir_input',
  sil: 'ctl00_ContentPlaceHolder1_grdRaporKuyruk_ctl00_ctl04_btnRaporSil_input',
  jeton: 'CaptchaV3_hfRecaptchaToken',
  girisHata: 'lblHataMesaj',
};

const KUYRUK_SECICI = 'input[id*="grdRaporKuyruk"][id*="btnRaporIndir"]';

// Portal ayni hesapla ikinci girisi reddediyor. Bu hatada yeniden denemenin
// anlami yok: oturumu kapatmasi gereken kullanicidir.
const AKTIF_OTURUM = /aktif bir oturuma sahip|mevcut oturumu kapat/i;
const CIKIS_BEKLEME = 1500;
const AKTIF_OTURUM_DESENI_JS =
  '/[^.]*aktif bir oturuma sahip[^.]*\\.?[^.]*(?:kapat[^.]*\\.)?/i';

const BOLME = 'persist:portal';
const IL_KODU_DEGERI = 'Tümü';

const TUMU_KUTULARI = [ALAN.ilKodu, ALAN.mudurlukKodu];
const TUMU_DEGERLERI = ['(TÜMÜ)', '(Tümü)', IL_KODU_DEGERI, 'TÜMÜ', 'Tumu', 'TUMU'];
const BAS_TARIH_KUTULARI = [ALAN.basTarih, ALAN.basTarihAlt];
// Saat kutusunun adı rapora göre değişiyor: bazı raporlarda tek cmbSAAT,
// bazılarında cmbILKSAAT + cmbSONSAAT ikilisi. Var olanların hepsi doldurulur.
const SAAT_KUTULARI = [ALAN.saat, ALAN.ilkSaat, ALAN.sonSaat];
const SON_TARIH_KUTULARI = [ALAN.sonTarih, ALAN.sonTarihAlt];
const VARSAYILAN_SAYFA_SN = 180;
const OGE_SURESI = 30000;
const INDIRME_SURESI = 180000;
const JETON_SURESI = 20000;
const EN_KISA_YENILEME = 5;

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
  rd.kars = function (s) {
    return String(s == null ? '' : s)
      .normalize('NFC')
      .replace(/[\u0130I\u0131]/g, 'i')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  };
  rd.denetim = function (id) {
    try { return window.$find ? window.$find(id) : null; } catch (e) { return null; }
  };
  rd.metin = function (e, uzunluk) {
    if (!e) return '';
    return (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, uzunluk || 60);
  };
  rd.menuKok = function () {
    var kok = rd.bul('leftsidenav');
    if (kok) return kok;
    var uller = [].slice.call(document.querySelectorAll('ul'));
    uller.sort(function (a, b) { return b.children.length - a.children.length; });
    return uller[0] || null;
  };
  rd.baslikMetni = function (l) {
    var p = '';
    var c = (l && l.childNodes) || [];
    for (var i = 0; i < c.length; i++) {
      var n = c[i];
      if (n.nodeType === 3) p += n.nodeValue || '';
      else if (n.tagName && n.tagName !== 'UL') p += n.textContent || '';
    }
    return p.replace(/\\s+/g, ' ').trim().slice(0, 40);
  };
  rd.menuOgeleri = function () {
    var kok = rd.menuKok();
    if (!kok) return [];
    return [].slice.call(kok.children).map(function (l, i) {
      return (i + 1) + ') ' + rd.metin(l, 30);
    });
  };
  rd.buyuk = function (m) {
    return String(m || '').replace(/i/g, 'İ').toUpperCase();
  };
  rd.menuAdaylari = function () {
    var hepsi = [].slice.call(document.querySelectorAll('li'));
    var uygun = [];
    for (var i = 0; i < hepsi.length; i++) {
      var l = hepsi[i];
      if (!l.querySelector || !l.querySelector('ul')) continue;
      var b = rd.buyuk(rd.baslikMetni(l));
      if (b.indexOf('RAPOR') !== 0) continue;
      uygun.push({ oge: l, tam: b === 'RAPORLAR' });
    }
    return uygun;
  };
  rd.menuSec = function (yol) {
    var a = rd.menuAdaylari();
    for (var i = 0; i < a.length; i++) if (a[i].tam) return { oge: a[i].oge, yol: 'metin' };
    if (a.length) return { oge: a[0].oge, yol: 'metin' };
    var x = rd.xp(yol);
    return x ? { oge: x, yol: 'xpath' } : null;
  };
  rd.menuOge = function (yol) {
    var s = rd.menuSec(yol);
    return s ? s.oge : null;
  };
  rd.menuAc = function (yol) {
    var s = rd.menuSec(yol);
    if (!s) return null;
    rd.tikla(s.oge);
    var a = s.oge.querySelector(':scope > a');
    if (a) rd.tikla(a);
    return { metin: rd.baslikMetni(s.oge) || rd.metin(s.oge), yol: s.yol };
  };
  rd.altMenuAc = function (altYol, menuYol) {
    var m = rd.menuOge(menuYol);
    var hepsi = m ? [].slice.call(m.querySelectorAll('ul a')) : [];
    var gorunenler = hepsi.filter(function (b) { return rd.gorunur(b); });
    var adaUyan = function (liste) {
      for (var i = 0; i < liste.length; i++) {
        if (rd.buyuk(rd.metin(liste[i], 40)) === 'RAPORLAR') return liste[i];
      }
      return null;
    };
    var hedef = adaUyan(gorunenler);
    var yol = 'metin';
    if (!hedef) {
      hedef = adaUyan(hepsi);
      if (hedef) yol = 'metin-gizli';
    }
    if (!hedef) {
      var x = rd.xp(altYol);
      if (x) { hedef = x; yol = 'xpath'; }
    }
    if (!hedef && gorunenler.length) { hedef = gorunenler[0]; yol = 'ilk'; }
    if (!hedef && hepsi.length) { hedef = hepsi[0]; yol = 'ilk-gizli'; }
    if (!hedef) return null;
    rd.tikla(hedef);
    return { metin: rd.metin(hedef, 40) || 'tıklandı', yol: yol };
  };
  rd.etkin = function (e) {
    if (!e || e.disabled) return false;
    if (/rbDisabled|aspNetDisabled|rgDisabled/.test(e.className || '')) return false;
    var s = e.closest ? e.closest('.RadButton, span, div') : null;
    if (s && /rbDisabled/.test(s.className || '')) return false;
    return rd.gorunur(e);
  };
  rd.dugme = function (id) {
    var e = rd.bul(id);
    if (e && !rd.etkin(e)) return 'pasif';
    if (e && rd.tikla(e)) return 'tik';
    var c = rd.denetim(String(id).replace(/_input$/, ''));
    if (c && c.click) { try { c.click(); return 'api'; } catch (x) { } }
    return null;
  };
  rd.satirMetni = function (e) {
    var s = e && e.closest ? e.closest('tr') : null;
    if (!s) return '';
    return (s.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 160);
  };
  rd.kuyrukZaman = function (m) {
    var p = String(m || '').match(
      /(\\d{2})\\.(\\d{2})\\.(\\d{4})\\s+(\\d{2}):(\\d{2}):(\\d{2})/);
    if (!p) return 0;
    return new Date(+p[3], +p[2] - 1, +p[1], +p[4], +p[5], +p[6]).getTime();
  };
  // Kuyruk satirlari indirme dugmesinden degil izgaradan okunur: "Sirada" ve
  // "Hazirlaniyor" satirlarinda dugme hic yoktur, kendi kaydimizi ancak
  // satirin kayit numarasiyla izleyebiliriz.
  rd.kuyrukSatirlari = function () {
    var izgara = document.querySelector('[id*="grdRaporKuyruk"]');
    if (!izgara) return [];
    return [].slice.call(izgara.querySelectorAll('tr')).map(function (tr) {
      var h = [].slice.call(tr.cells || []).map(function (c) {
        return (c.innerText || '').replace(/\\s+/g, ' ').trim();
      });
      if (h.length < 7) return null;
      var d = tr.querySelector('input[id*="btnRaporIndir"][id$="_input"]');
      // Izgaranin baslik satiri da tr; kayit numarasi sayi degilse ve satirda
      // indirme dugmesi yoksa veri satiri sayilmaz.
      if (!d && !/^\\d+$/.test(h[0] || '')) return null;
      return {
        oge: d,
        id: d ? d.id : null,
        kayit: h[0] || '',
        rapor: h[1] || '',
        istek: rd.kuyrukZaman(h[2]),
        durum: h[6] || '',
        etkin: !!(d && rd.etkin(d)),
      };
    }).filter(function (x) { return x && (x.kayit || x.rapor); });
  };
  // Kaydet dugmesine basildiktan hemen sonra kendi satirimizin kayit
  // numarasini alir; sonraki yenilemelerde yalniz o satira bakilir.
  rd.kuyrukKendiKayit = function (raporAdi) {
    var hepsi = rd.kuyrukSatirlari();
    if (raporAdi) {
      var k = rd.kars(raporAdi);
      var ad = hepsi.filter(function (s) { return rd.kars(s.rapor) === k; });
      if (ad.length) hepsi = ad;
    }
    if (!hepsi.length) return null;
    var s2 = hepsi.slice().sort(function (a, b) { return b.istek - a.istek; });
    return { kayit: s2[0].kayit, rapor: s2[0].rapor, durum: s2[0].durum };
  };
  rd.kuyruk = function (id, secici, raporAdi, kayitNo) {
    var hepsi = rd.kuyrukSatirlari();
    var adaylar = hepsi;
    var nasil = 'ilk';
    if (kayitNo) {
      var kn = hepsi.filter(function (s) { return s.kayit === String(kayitNo); });
      if (kn.length) { adaylar = kn; nasil = 'kayit'; }
    }
    if (nasil === 'ilk' && raporAdi) {
      var k = rd.kars(raporAdi);
      var ad = hepsi.filter(function (s) { return rd.kars(s.rapor) === k; });
      if (ad.length) { adaylar = ad; nasil = 'ad'; }
    }
    var s2 = adaylar.slice().sort(function (a, b) { return b.istek - a.istek; });
    var e = s2.filter(function (x) { return x.etkin; })[0] || s2[0] || null;
    if (!e) {
      var y = rd.bul(id);
      return {
        hazir: !!(y && rd.etkin(y)), id: y ? y.id : null, kendi: !!y,
        nasil: 'yedek', sayi: hepsi.length, satir: rd.satirMetni(y),
      };
    }
    return {
      hazir: !!e.etkin,
      id: e.id,
      kendi: nasil !== 'ilk',
      nasil: nasil,
      durum: e.durum,
      kayit: e.kayit,
      sayi: hepsi.length,
      satir: rd.satirMetni(e.oge) || (e.kayit + ' ' + e.rapor + ' ' + e.durum),
    };
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
    if (!oge) {
      oge = hepsi.filter(function (l) {
        return rd.kars(l.textContent) === rd.kars(deger);
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
    if (!it) {
      try {
        var hepsi = c.get_items();
        for (var i = 0; i < hepsi.get_count(); i++) {
          var a = hepsi.getItem(i);
          if (rd.kars(a.get_text()) === rd.kars(deger)) { it = a; break; }
        }
      } catch (e) { }
    }
    if (it) {
      try { c.trackChanges(); } catch (e) { }
      try { it.select(); } catch (e) { return null; }
      try { c.commitChanges(); } catch (e) { }
      return 'api';
    }
    // set_text yaziyi kutuya yazar ama oge SECMEZ; secili oge dogrulanmadan
    // basari donmesi sessiz hataya yol aciyordu.
    if (c.set_text) {
      try {
        c.set_text(deger);
        var sec = c.get_selectedItem ? c.get_selectedItem() : null;
        if (sec && rd.kars(sec.get_text()) === rd.kars(deger)) return 'metin';
      } catch (e) { }
    }
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
  try {
    window.alert = function () { };
    window.confirm = function () { return true; };
  } catch (e) { }
})();
`;

let calisan = null;

function uyu(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ikiHane(s) {
  return String(s).padStart(2, '0');
}

function girisRedMesaji(mesaj) {
  if (AKTIF_OTURUM.test(mesaj)) {
    return `Portal girişi reddetti: “${mesaj}” — bu kullanıcının portalda açık `
      + 'bir oturumu var. Portala girip oturumu kapatın (ya da başka bir hesapla '
      + 'deneyin), sonra komutu yeniden gönderin.';
  }
  return `Portal girişi reddetti: “${mesaj}”`;
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
  const bekleyenler = [];
  const hazirlar = [];
  const dagit = (sonuc) => {
    const b = bekleyenler.shift();
    if (b) (sonuc.hata ? b.red(sonuc.hata) : b.coz(sonuc.deger));
    else hazirlar.push(sonuc);
  };
  const dinleyici = (_olay, oge) => {
    let ad = oge.getFilename();
    if (fs.existsSync(path.join(klasor, ad))) ad = `${Date.now() % 100000}-${ad}`;
    const hedef = path.join(klasor, ad);
    try { oge.setSavePath(hedef); } catch { }
    oge.once('done', (_o, durum) => {
      dagit(durum === 'completed'
        ? { deger: { dosya: hedef, ad, boyut: oge.getReceivedBytes() } }
        : { hata: new Error(`İndirme tamamlanmadı (${durum}).`) });
    });
  };
  oturum.on('will-download', dinleyici);
  return {
    sonraki() {
      const h = hazirlar.shift();
      if (h) return h.hata ? Promise.reject(h.hata) : Promise.resolve(h.deger);
      return new Promise((coz, red) => bekleyenler.push({ coz, red }));
    },
    birak: () => { try { oturum.removeListener('will-download', dinleyici); } catch { } },
  };
}

async function calistir(istek) {
  if (calisan) throw new Error('Portal işlemi zaten çalışıyor.');
  const {
    hesap, ayarlar, kokKlasor,
    onayKodu = async () => { throw new Error('Onay kodu sorulamadı.'); },
    dosyaHazir = null,
    ilerleme = () => { },
    log = () => { },
  } = istek;

  if (!ayarlar.girisUrl) throw new Error('Portal giriş adresi Ayarlar\'da tanımlı değil.');
  const raporlar = (istek.raporlar && istek.raporlar.length
    ? istek.raporlar : [ayarlar.raporAdi])
    .map((r) => String(r == null ? '' : r).trim())
    .filter(Boolean);
  if (!raporlar.length) throw new Error('Rapor adı Ayarlar\'da tanımlı değil.');
  const sayfaMs = Math.max(15, Number(ayarlar.sayfaSn) || VARSAYILAN_SAYFA_SN) * 1000;
  if (!hesap || !hesap.kullanici || !hesap.sifre) {
    throw new Error('Bu numara için kullanıcı adı ve şifre tanımlı değil.');
  }

  const klasor = path.join(kokKlasor, damga());
  fs.mkdirSync(klasor, { recursive: true });
  eskileriSil(kokKlasor);

  const gizliler = [hesap.sifre, hesap.kullanici];
  const adimlar = [];
  let sira = 0;
  let hataOldu = false;

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

  const anaCerceve = () => pencere.webContents.mainFrame;

  const cerceveler = () => {
    try {
      const a = anaCerceve();
      const hepsi = a.framesInSubtree || [a];
      return hepsi.length ? hepsi : [a];
    } catch {
      return [];
    }
  };

  let aktifCerceve = null;

  const jsC = async (cerceve, kod) => {
    kontrol();
    return cerceve.executeJavaScript(`${YARDIM}\n${kod}`, true);
  };

  const deneC = async (cerceve, ifade) => {
    try {
      return await jsC(cerceve, `(function () { try { return (${ifade}); } catch (e) { return null; } })()`);
    } catch {
      return null;
    }
  };

  const cerceveAra = async (ifade, sure, aciklama) => {
    const bitis = Date.now() + sure;
    while (Date.now() < bitis) {
      kontrol();
      for (const c of cerceveler()) {
        if (await deneC(c, ifade)) return c;
      }
      await uyu(300);
    }
    throw new Error(`Beklenen aşamaya ulaşılamadı: ${aciklama}`);
  };

  // Portal ayni kullaniciyla ikinci girisi "aktif bir oturumunuz var" diye
  // reddediyor. Pencereyi kapatmak sunucudaki oturumu bitirmiyor; baslik
  // cercevesindeki "Güvenli Çıkış" bagina basmak gerekiyor. Is nasil biterse
  // bitsin cagriliyor, bulamazsa sessizce geciyor.
  const guvenliCikis = async () => {
    if (pencereKapandi) return false;
    try { if (pencere.isDestroyed()) return false; } catch { return false; }
    for (const c of cerceveler()) {
      try {
        if (!await c.executeJavaScript("!!document.getElementById('lgStatus')", true)) continue;
        await c.executeJavaScript("document.getElementById('lgStatus').click()", true);
        await uyu(CIKIS_BEKLEME);
        log('Portal: güvenli çıkış yapıldı, sunucudaki oturum bırakıldı.');
        return true;
      } catch { }
    }
    return false;
  };

  const cerceveSec = async (ifade, aciklama, sure = OGE_SURESI) => {
    const c = await cerceveAra(ifade, sure, aciklama);
    aktifCerceve = { cerceve: c, ifade };
    return c;
  };

  const cerceve = async () => {
    if (!aktifCerceve) return anaCerceve();
    if (await deneC(aktifCerceve.cerceve, '1')) return aktifCerceve.cerceve;
    aktifCerceve.cerceve = await cerceveAra(aktifCerceve.ifade, 15000, 'çerçeve kayboldu');
    return aktifCerceve.cerceve;
  };

  const js = async (kod) => jsC(await cerceve(), kod);

  const dene = async (ifade) => deneC(await cerceve(), ifade);

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

  const sakinlesme = async (sure = sayfaMs) => {
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

  const kesikliUyu = async (ms, her = () => { }) => {
    const bitis = Date.now() + ms;
    let sonSaniye = -1;
    while (Date.now() < bitis) {
      kontrol();
      const kalan = Math.max(0, Math.round((bitis - Date.now()) / 1000));
      if (kalan !== sonSaniye) { sonSaniye = kalan; her(kalan); }
      await uyu(Math.min(500, Math.max(1, bitis - Date.now())));
    }
  };

  const kaydet = async (kod) => {
    sira++;
    let baslik = '';
    let url = '';
    try {
      baslik = await deneC(anaCerceve(), 'document.title') || '';
      url = pencere.webContents.getURL();
    } catch { }
    const taban = `${ikiHane(sira)}-${kod}${baslik ? '-' + dosyaAdiTemiz(baslik) : ''}`;

    const yazilan = [];
    const liste = cerceveler();
    for (let i = 0; i < liste.length; i++) {
      const html = await deneC(liste[i], 'document.documentElement.outerHTML');
      if (!html) continue;
      const ek = i === 0 ? '' : `--cerceve${i}`;
      try {
        fs.writeFileSync(path.join(klasor, taban + ek + '.html'), gizle(html, gizliler), 'utf8');
        yazilan.push(taban + ek + '.html');
      } catch { }
    }
    try {
      const resim = await pencere.webContents.capturePage();
      fs.writeFileSync(path.join(klasor, taban + '.png'), resim.toPNG());
    } catch { }
    return { dosya: taban, baslik, url, cerceve: liste.length, dosyalar: yazilan };
  };

  const adim = async (kod, ad, fn) => {
    kontrol();
    calisan.adim = kod;
    const kayit = { kod, ad, durum: 'calisiyor', basladi: new Date().toISOString() };
    adimlar.push(kayit);
    bildir({ ...kayit });
    log(`Portal adımı: ${ad}`);
    const bilgi = (metin) => {
      kayit.bilgi = metin;
      bildir({ ...kayit });
    };
    try {
      const sonuc = await fn(bilgi);
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

  // Cagiran taraf araligi onceden hesaplamis olabilir (BINA TIPI OSOS servis
  // dosyasini paralel indirirken yapiyor); gun donumunde ikisinin ayrisip
  // farkli gunun raporlarini istemesin diye ayni aralik kullaniliyor.
  const aralik = istek.aralik || tarihAraligi(ayarlar.gunGeri);

  const ONAY_GORUNUR = `(function () { var o = window.__rd.bul(${JSON.stringify(ALAN.onayKodu)});`
    + ' return !!(o && window.__rd.gorunur(o)); })()';
  const GIRIS_VAR = `!!window.__rd.bul(${JSON.stringify(ALAN.giris)})`;

  // reCAPTCHA v3: btnGiris'e basilinca jeton ASENKRON uretilip bu gizli alana yazilir,
  // form ancak ondan sonra gonderilir. Beklemeden ilerlemek girisi sessizce dusuruyordu.
  const JETON_DOLU = `(function () { var j = window.__rd.bul(${JSON.stringify(ALAN.jeton)});`
    + ' return !j || !!(j.value && String(j.value).length > 20); })()';
  const GIRIS_HATASI = `(function () { var h = window.__rd.bul(${JSON.stringify(ALAN.girisHata)});`
    + ' if (h && window.__rd.gorunur(h)) {'
    + ' var m = (h.innerText || h.textContent || "").replace(/\\s+/g, " ").trim();'
    + ' if (m) return m; }'
    + ` var g = (document.body ? document.body.innerText : "").replace(/\\s+/g, " ");`
    + ` var a = g.match(${AKTIF_OTURUM_DESENI_JS});`
    + ' return a ? a[0].trim() : ""; })()';

  const jetonuBekle = async (sure = JETON_SURESI) => {
    const bitis = Date.now() + sure;
    while (Date.now() < bitis) {
      kontrol();
      for (const c of cerceveler()) {
        if (await deneC(c, JETON_DOLU)) return true;
      }
      await uyu(200);
    }
    log('Portal: reCAPTCHA jetonu süresinde gelmedi; girişe yine de devam ediliyor.');
    return false;
  };

  const girisHatasi = async () => {
    for (const c of cerceveler()) {
      const m = await deneC(c, GIRIS_HATASI);
      if (m) return String(m);
    }
    return '';
  };

  const girisiBekle = async (sure = Math.max(45000, sayfaMs)) => {
    const bitis = Date.now() + sure;
    while (Date.now() < bitis) {
      kontrol();
      const liste = cerceveler();
      for (const c of liste) {
        if (await deneC(c, ONAY_GORUNUR)) {
          aktifCerceve = { cerceve: c, ifade: ONAY_GORUNUR };
          return 'onay';
        }
      }
      let girisVar = false;
      for (const c of liste) {
        if (await deneC(c, GIRIS_VAR)) { girisVar = true; break; }
      }
      if (!girisVar) { aktifCerceve = null; return 'gecti'; }
      const mesaj = await girisHatasi();
      if (mesaj) throw new Error(girisRedMesaji(mesaj));
      await uyu(300);
    }
    const son = await girisHatasi();
    if (son && AKTIF_OTURUM.test(son)) throw new Error(girisRedMesaji(son));
    throw new Error('Giriş sonrası ekran gelmedi — hâlâ giriş sayfasındayız. '
      + (son ? `Portalın mesajı: “${son}”` : 'Kullanıcı adı veya şifre yanlış olabilir, '
        + 'ya da reCAPTCHA jetonu gelmemiş olabilir.')
      + ' Kaydedilen HTML dosyasına bakın.');
  };

  let girisSonucu = null;

  try {
    await adim('giris-sayfasi', 'Giriş sayfası açılıyor', async () => {
      aktifCerceve = null;
      await pencere.loadURL(ayarlar.girisUrl);
      await sakinlesme();
      await cerceveSec(`!!window.__rd.bul(${JSON.stringify(ALAN.kullanici)})`,
        'kullanıcı adı kutusu', sayfaMs);
      return { url: pencere.webContents.getURL() };
    });

    await adim('giris', 'Kullanıcı adı ve şifre giriliyor', async () => {
      await js(`window.__rd.yaz(window.__rd.bul(${JSON.stringify(ALAN.kullanici)}),`
        + ` ${JSON.stringify(hesap.kullanici)})`);
      await js(`window.__rd.yaz(window.__rd.bul(${JSON.stringify(ALAN.sifre)}),`
        + ` ${JSON.stringify(hesap.sifre)})`);
      await uyu(200);
      await js(`window.__rd.tikla(window.__rd.bul(${JSON.stringify(ALAN.giris)}))`);
      const jeton = await jetonuBekle();
      await uyu(1500);
      await sakinlesme();
      aktifCerceve = null;
      girisSonucu = await girisiBekle();
      if (!jeton) log('Portal: giriş jetonsuz denendi.');
      return { sonuc: girisSonucu, url: pencere.webContents.getURL() };
    });

    if (girisSonucu === 'onay') {
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
          await sakinlesme();
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
      aktifCerceve = null;
      const hedef = ayarlar.anaUrl || ayarlar.girisUrl;
      await pencere.loadURL(hedef);
      await sakinlesme();
      return { url: pencere.webContents.getURL(), cerceve: cerceveler().length };
    });

    const menuOzeti = async () => {
      for (const c of cerceveler()) {
        const l = await deneC(c, 'window.__rd.menuOgeleri()');
        if (l && l.length) return l.join(' · ');
      }
      return 'menü okunamadı';
    };

    const dosyalar = [];

    for (let ri = 0; ri < raporlar.length; ri++) {
    const raporAdi = raporlar[ri];
    const ek = ri === 0 ? '' : `-r${ri + 1}`;
    const etiket = raporlar.length > 1 ? ` (${ri + 1}/${raporlar.length})` : '';

    await adim('raporlar-menu' + ek, 'Raporlar menüsü açılıyor' + etiket, async () => {
      if (ri > 0) {
        aktifCerceve = null;
        await pencere.loadURL(ayarlar.anaUrl || ayarlar.girisUrl);
        await sakinlesme();
      }
      try {
        await cerceveSec(`!!window.__rd.menuOge(${JSON.stringify(ayarlar.menuXpath)})`,
          'menü', sayfaMs);
      } catch {
        throw new Error('Raporlar menüsü bulunamadı — menüde adı "Rapor" ile başlayan '
          + 'bir başlık yok ve Ayarlar\'daki menü yolu da tutmuyor. '
          + `Menüdekiler: ${await menuOzeti()}`);
      }

      const menu = await js(`window.__rd.menuAc(${JSON.stringify(ayarlar.menuXpath)})`);
      if (menu && menu.yol === 'xpath') {
        log('Portal: menüde "Rapor" ile başlayan başlık bulunamadı, '
          + 'Ayarlar\'daki menü yolu kullanıldı.');
      }
      await uyu(900);

      const alt = await bekle(
        `window.__rd.altMenuAc(${JSON.stringify(ayarlar.altMenuXpath)},`
        + ` ${JSON.stringify(ayarlar.menuXpath)})`,
        'Raporlar alt menüsü açılmadı — alt menü yolu (XPath) tutmuyor olabilir', sayfaMs
      );

      await uyu(1500);
      const c = await cerceveSec(`!!window.__rd.bul(${JSON.stringify(ALAN.rapor + '_Input')})`,
        'rapor seçim kutusu — sayfa açılmadı ya da alan adı değişmiş', sayfaMs);
      await sakinlesme();
      return { menu, alt, url: c.url || pencere.webContents.getURL() };
    });

    await adim('rapor-secimi' + ek, `Rapor seçiliyor: ${raporAdi}`, async () => {
      await js(`window.__rd.comboAc(${JSON.stringify(ALAN.rapor)})`);
      await uyu(900);
      let yontem = await dene(
        `window.__rd.comboSec(${JSON.stringify(ALAN.rapor)}, ${JSON.stringify(raporAdi)})`
      ) ? 'liste' : null;
      if (!yontem) {
        yontem = await dene(
          `window.__rd.comboApi(${JSON.stringify(ALAN.rapor)}, ${JSON.stringify(raporAdi)})`
        );
      }
      await uyu(1200);
      await sakinlesme();
      const deger = await dene(`window.__rd.comboDeger(${JSON.stringify(ALAN.rapor)})`);
      if (!deger) throw new Error('Rapor seçilemedi.');
      const secenekler = await dene(`window.__rd.comboListe(${JSON.stringify(ALAN.rapor)}).slice(0, 60)`);
      const esit = String(deger).trim() === String(raporAdi).trim()
        || kars(deger) === kars(raporAdi);
      if (!esit) {
        throw new Error(`Rapor adı kutuya yerleşmedi (kutuda "${deger}" yazıyor). `
          + `Listedekiler: ${(secenekler || []).join(' | ') || 'okunamadı'}`);
      }
      if (String(deger).trim() !== String(raporAdi).trim()) {
        log(`Portal: rapor adı listede "${deger}" olarak geçiyor `
          + `(ayarlarda "${raporAdi}" yazıyor); listedeki ad kullanıldı.`);
      }
      return { yontem, deger };
    });

    const comboDoldur = async (id, degerler) => {
      if (!await dene(`!!window.__rd.bul(${JSON.stringify(id + '_Input')})`)) return null;
      await js(`window.__rd.comboAc(${JSON.stringify(id)})`);
      await uyu(700);
      let yontem = null;
      for (const d of degerler) {
        if (await dene(`window.__rd.comboSec(${JSON.stringify(id)}, ${JSON.stringify(d)})`)) {
          yontem = 'liste';
          break;
        }
      }
      if (!yontem) {
        for (const d of degerler) {
          yontem = await dene(`window.__rd.comboApi(${JSON.stringify(id)}, ${JSON.stringify(d)})`);
          if (yontem) break;
        }
      }
      await uyu(800);
      await sakinlesme();
      const deger = await dene(`window.__rd.comboDeger(${JSON.stringify(id)})`);
      return { id, yontem, deger };
    };

    const tarihDoldur = async (kutular, parca) => {
      for (const id of kutular) {
        if (!await dene(`!!window.__rd.bul(${JSON.stringify(id + '_dateInput')})`)) continue;
        const deger = await js(
          `window.__rd.tarih(${JSON.stringify(id)}, ${JSON.stringify(parca.metin)},`
          + ` ${parca.gun}, ${parca.ay}, ${parca.yil})`
        );
        if (deger) return { id, deger };
      }
      return null;
    };

    await adim('tarihler' + ek, 'Form dolduruluyor' + etiket, async () => {
      const kapsam = [];
      for (const id of TUMU_KUTULARI) {
        const sonuc = await comboDoldur(id, TUMU_DEGERLERI);
        if (!sonuc) continue;
        kapsam.push(sonuc);
        if (!sonuc.yontem) {
          log(`Portal: "${IL_KODU_DEGERI}" seçilemedi (${id}), kutuda "${sonuc.deger || ''}" var.`);
        }
      }

      const bas = await tarihDoldur(BAS_TARIH_KUTULARI, aralik.bas);
      const son = await tarihDoldur(SON_TARIH_KUTULARI, aralik.son);
      await uyu(400);

      let saatKutusu = null;
      for (const kutu of SAAT_KUTULARI) {
        const bulunan = await comboDoldur(kutu, [ayarlar.saat]);
        if (!bulunan) continue;
        if (!saatKutusu) saatKutusu = bulunan;
        if (kutu !== ALAN.saat) log(`Portal: saat kutusu ${kutu} olarak dolduruldu.`);
      }

      if (!bas || !son) {
        throw new Error('Tarih kutuları bulunamadı — bu raporun tarih alanları '
          + `beklenenden farklı olabilir (${BAS_TARIH_KUTULARI.join(', ')}).`);
      }
      return {
        bas: bas.deger, son: son.deger, basKutusu: bas.id, sonKutusu: son.id,
        saat: saatKutusu ? saatKutusu.deger : null,
        saatYontem: saatKutusu ? saatKutusu.yontem : null,
        kapsam,
        istenenBas: aralik.bas.metin, istenenSon: aralik.son.metin,
      };
    });

    let kendiKayit = null;
    await adim('rapor-kaydet' + ek, 'Rapor kuyruğa gönderiliyor' + etiket, async () => {
      const c = await cerceveSec(`!!window.__rd.bul(${JSON.stringify(ALAN.kaydet)})`,
        'Raporu kaydet düğmesi bulunamadı — sayfa ya da düğme adı değişmiş olabilir', sayfaMs);
      const yontem = await jsC(c, `window.__rd.dugme(${JSON.stringify(ALAN.kaydet)})`);
      if (yontem === 'pasif') {
        throw new Error('Raporu kaydet düğmesi pasif — zorunlu bir alan boş kalmış olabilir.');
      }
      if (!yontem) throw new Error('Raporu kaydet düğmesine tıklanamadı.');

      await uyu(1500);
      await sakinlesme();
      aktifCerceve = null;
      await cerceveSec(
        `(!!window.__rd.bul(${JSON.stringify(ALAN.yenile)})`
        + ` || !!document.querySelector(${JSON.stringify(KUYRUK_SECICI)})`
        + ' || !!document.querySelector(\'[id*="grdRaporKuyruk"]\'))',
        'rapor kuyruğu ekranı açılmadı — rapor kuyruğa alınmamış olabilir', sayfaMs
      );
      kendiKayit = await dene(
        `window.__rd.kuyrukKendiKayit(${JSON.stringify(raporAdi)})`
      );
      if (kendiKayit && kendiKayit.kayit) {
        log(`Portal: kuyruk kaydı ${kendiKayit.kayit} (${kendiKayit.durum || '?'}) `
          + 'bu isteğe ait sayıldı; kuyrukta yalnız o satır izlenecek.');
      } else {
        log('Portal: kuyruk kaydı numarası okunamadı, satır rapor adıyla aranacak.');
      }
      return { yontem, url: pencere.webContents.getURL(), kayit: kendiKayit };
    });

    const KUYRUK = `window.__rd.kuyruk(${JSON.stringify(ALAN.indir)},`
      + ` ${JSON.stringify(KUYRUK_SECICI)}, ${JSON.stringify(raporAdi)},`
      + ` ${JSON.stringify((kendiKayit && kendiKayit.kayit) || null)})`;

    const kuyruk = await adim('kuyruk' + ek, 'Raporun hazırlanması bekleniyor' + etiket, async (bilgi) => {
      const araMs = Math.max(EN_KISA_YENILEME, Number(ayarlar.yenilemeSn) || 120) * 1000;
      const sinirDk = Math.max(1, Number(ayarlar.beklemeDk) || 60);
      const bitis = Date.now() + sinirDk * 60000;
      let tur = 0;
      let son = null;
      let basarisizYenileme = 0;

      for (;;) {
        son = await dene(KUYRUK);
        if (son && son.hazir) {
          log(`Portal: rapor hazır (${tur} yenileme) — ${son.satir || 'satır okunamadı'}`);
          if (tur === 0) {
            log('Portal: rapor beklemeden hazır göründü, kuyruktaki satırın tarihini doğrulayın.');
          }
          return { ...son, yenileme: tur, hemenHazir: tur === 0 };
        }
        if (Date.now() >= bitis) {
          throw new Error(`Rapor ${sinirDk} dakikada hazırlanmadı `
            + `(${tur} yenileme). Kuyruk satırı: ${(son && son.satir) || 'okunamadı'}`);
        }

        tur++;
        const durumMetni = (son && son.satir) || 'kuyruk okunamadı';
        log(`Portal: rapor henüz hazır değil — ${durumMetni}`);
        await kesikliUyu(Math.min(araMs, Math.max(0, bitis - Date.now())), (kalan) => {
          bilgi(`${tur}. yenilemeye ${kalan} sn — ${durumMetni}`);
        });

        bilgi(`${tur}. yenileme yapılıyor…`);
        const y = await dene(`window.__rd.dugme(${JSON.stringify(ALAN.yenile)})`);
        if (!y || y === 'pasif') {
          basarisizYenileme++;
          log(`Portal: kuyruk yenileme düğmesine tıklanamadı (${basarisizYenileme}).`);
          if (basarisizYenileme >= 3) {
            throw new Error('Kuyruk yenileme düğmesi üst üste üç kez çalışmadı — '
              + 'oturum düşmüş ya da sayfa değişmiş olabilir.');
          }
        } else {
          basarisizYenileme = 0;
        }
        await uyu(1200);
        await sakinlesme();
      }
    });

    const sonuc = await adim('indir' + ek, 'Rapor indiriliyor' + etiket, async () => {
      const hedef = (kuyruk && kuyruk.id) || ALAN.indir;
      const yontem = await js(`window.__rd.dugme(${JSON.stringify(hedef)})`);
      if (!yontem || yontem === 'pasif') {
        throw new Error('İndirme düğmesine tıklanamadı — rapor kuyruğu değişmiş olabilir.');
      }
      const sozu = indirme.sonraki();
      const zamanAsimi = new Promise((_c, red) => {
        const sayac = setTimeout(() => red(new Error('İndirme süresi doldu.')), INDIRME_SURESI);
        sozu.then(() => clearTimeout(sayac), () => clearTimeout(sayac));
      });
      return Promise.race([sozu, zamanAsimi]);
    });

    let gonderim = null;
    if (typeof dosyaHazir === 'function' && sonuc && sonuc.dosya) {
      gonderim = await adim('gonderim' + ek, 'Rapor gönderiliyor' + etiket,
        async () => dosyaHazir({ ...sonuc, rapor: raporAdi, sira: ri }));
    }

    let silme = null;
    if (sonuc && sonuc.dosya && (!gonderim || gonderim.ok !== false)) {
      silme = await adim('kuyruk-sil' + ek, 'Rapor kuyruktan siliniyor' + etiket, async () => {
        const hedef = kuyruk && kuyruk.id
          ? String(kuyruk.id).replace('btnRaporIndir', 'btnRaporSil')
          : ALAN.sil;
        const yontem = await dene(`window.__rd.dugme(${JSON.stringify(hedef)})`);
        if (!yontem || yontem === 'pasif') {
          log(`Portal: kuyruk satırı silinemedi (${yontem || 'düğme yok'}).`);
          return { silindi: false, yontem: yontem || null };
        }
        await uyu(1200);
        await sakinlesme();
        const kaldiMi = await dene(`!!window.__rd.bul(${JSON.stringify(hedef)})`);
        if (kaldiMi) log('Portal: silme düğmesine basıldı ama satır kuyrukta duruyor.');
        return { silindi: !kaldiMi, yontem };
      });
    }

    dosyalar.push({
      rapor: raporAdi,
      dosya: sonuc ? sonuc.dosya : null,
      ad: sonuc ? sonuc.ad : null,
      boyut: sonuc ? sonuc.boyut : null,
      kuyruk: kuyruk
        ? { yenileme: kuyruk.yenileme, satir: kuyruk.satir, hemenHazir: !!kuyruk.hemenHazir }
        : null,
      gonderim,
      silme,
    });
    }

    const ilkDosya = dosyalar[0] || {};
    const ozet = {
      klasor,
      dosya: ilkDosya.dosya || null,
      dosyaAdi: ilkDosya.ad || null,
      boyut: ilkDosya.boyut || null,
      dosyalar,
      adimlar,
      kuyruk: ilkDosya.kuyruk || null,
      gonderim: ilkDosya.gonderim || null,
      silme: ilkDosya.silme || null,
      aralik: { bas: aralik.bas.metin, son: aralik.son.metin, saat: ayarlar.saat },
    };
    fs.writeFileSync(path.join(klasor, 'ozet.json'), JSON.stringify(ozet, null, 2), 'utf8');
    log(`Portal işlemi tamam: ${ozet.dosyaAdi || 'dosya yok'} → ${klasor}`);
    return ozet;
  } catch (e) {
    hataOldu = true;
    try {
      fs.writeFileSync(path.join(klasor, 'ozet.json'),
        JSON.stringify({ klasor, hata: e.message, adimlar }, null, 2), 'utf8');
    } catch { }
    e.klasor = klasor;
    log(`Portal işlemi başarısız: ${e.message}`);
    throw e;
  } finally {
    indirme.birak();
    try { await guvenliCikis(); } catch { }
    calisan = null;
    if (ayarlar.kapat || hataOldu) {
      try { if (!pencere.isDestroyed()) pencere.destroy(); } catch { }
    }
  }
}

module.exports = {
  calistir, durumAl, iptal, tarihAraligi, dosyaAdiTemiz, gizle, indirmeyiIzle,
  ALAN, KUYRUK_SECICI, YARDIM, AKTIF_OTURUM, girisRedMesaji, TUMU_DEGERLERI,
};
