// Hamza ALMALI

'use strict';

const ALANLAR = [
  { anahtar: 'portalGirisUrl', ad: 'girisUrl', tur: 'metin', varsayilan: '' },
  { anahtar: 'portalAnaUrl', ad: 'anaUrl', tur: 'metin', varsayilan: '' },
  { anahtar: 'portalRaporAdi', ad: 'raporAdi', tur: 'metin', varsayilan: '' },
  { anahtar: 'portalTabloRapor1', ad: 'tabloRapor1', tur: 'metin', varsayilan: '' },
  { anahtar: 'portalTabloRapor2', ad: 'tabloRapor2', tur: 'metin', varsayilan: '' },
  { anahtar: 'portalSaat', ad: 'saat', tur: 'metin', varsayilan: '01:00' },
  {
    anahtar: 'portalMenuXpath',
    ad: 'menuXpath',
    tur: 'metin',
    varsayilan: '//*[@id="leftsidenav"]/li[6]',
  },
  {
    anahtar: 'portalAltMenuXpath',
    ad: 'altMenuXpath',
    tur: 'metin',
    varsayilan: '//*[@id="leftsidenav"]/li[6]/ul/li[1]/a',
  },
  { anahtar: 'portalGunGeri', ad: 'gunGeri', tur: 'sayi', varsayilan: 1 },
  { anahtar: 'portalYenilemeSn', ad: 'yenilemeSn', tur: 'sayi', varsayilan: 120, enAz: 5 },
  { anahtar: 'portalBeklemeDk', ad: 'beklemeDk', tur: 'sayi', varsayilan: 60, enAz: 1 },
  { anahtar: 'portalOnaySn', ad: 'onaySn', tur: 'sayi', varsayilan: 180 },
  { anahtar: 'portalGorunur', ad: 'gorunur', tur: 'evet', varsayilan: true },
  { anahtar: 'portalKapat', ad: 'kapat', tur: 'evet', varsayilan: false },
];

const ESKIYEN = {
  menuXpath: [
    '//*[@id="leftsidenav"]/li[7]',
    '/html/body/form/div[3]/div/div/div[1]/ul/li[7]',
  ],
  altMenuXpath: [
    '//*[@id="leftsidenav"]/li[7]/ul/li[1]/a',
    '/html/body/form/div[3]/div/div/div[1]/ul/li[7]/ul/li[1]/a',
  ],
};

function coz(tur, deger, varsayilan, enAz) {
  if (deger == null || deger === '') return varsayilan;
  if (tur === 'sayi') {
    const s = Number(deger);
    if (!Number.isFinite(s)) return varsayilan;
    return enAz == null ? s : Math.max(enAz, s);
  }
  if (tur === 'evet') return String(deger) === '1' || deger === true;
  return String(deger);
}

function oku(db) {
  const a = {};
  for (const f of ALANLAR) {
    let ham = db.ortakAyarOku(f.anahtar);
    if (ham != null && (ESKIYEN[f.ad] || []).includes(String(ham))) ham = null;
    a[f.ad] = coz(f.tur, ham, f.varsayilan, f.enAz);
  }
  if (!a.anaUrl && a.girisUrl) a.anaUrl = varsayilanAna(a.girisUrl);
  return a;
}

function yaz(db, gelen) {
  for (const f of ALANLAR) {
    if (!Object.prototype.hasOwnProperty.call(gelen, f.ad)) continue;
    const d = gelen[f.ad];
    db.ortakAyarYaz(f.anahtar,
      f.tur === 'evet' ? (d ? '1' : '0') : String(d == null ? '' : d).trim());
  }
  return oku(db);
}

function varsayilanAna(girisUrl) {
  try {
    return new URL('default.aspx', girisUrl).toString();
  } catch {
    return '';
  }
}

function dogrula(a) {
  const eksik = [];
  if (!a.girisUrl) eksik.push('giriş adresi');
  if (!a.raporAdi) eksik.push('rapor adı');
  return eksik;
}

function dogrulaTablo(a) {
  const eksik = [];
  if (!a.girisUrl) eksik.push('giriş adresi');
  if (!a.tabloRapor1) eksik.push('tablo raporu 1 (kesinti listesi)');
  if (!a.tabloRapor2) eksik.push('tablo raporu 2 (detay)');
  return eksik;
}

module.exports = { oku, yaz, dogrula, dogrulaTablo, varsayilanAna, ALANLAR, ESKIYEN };
