// Hamza ALMALI

'use strict';

const KOK = 'https://servis.mgm.gov.tr/web';
const BASLIKLAR = {
  Origin: 'https://www.mgm.gov.tr',
  Referer: 'https://www.mgm.gov.tr/',
  'User-Agent': 'Mozilla/5.0',
};
const ZAMAN_ASIMI = 15000;
const ES_ZAMAN = 3;
const DENEME = 3;
const DENEME_ARASI = 700;
const ONBELLEK_SURESI = 24 * 60 * 60 * 1000;

const IL = 'BURSA';
const ILCELER = [
  'Osmangazi', 'Nilüfer', 'Yıldırım', 'Gemlik', 'Gürsu', 'Kestel', 'Mudanya',
  'Orhangazi', 'İznik', 'İnegöl', 'Yenişehir', 'Karacabey', 'Mustafakemalpaşa',
  'Orhaneli', 'Keles', 'Harmancık', 'Büyükorhan',
];

const HADISE = {
  A: 'Açık', AB: 'Az bulutlu', PB: 'Parçalı bulutlu', CB: 'Çok bulutlu',
  HY: 'Hafif yağmurlu', Y: 'Yağmurlu', KY: 'Kuvvetli yağmurlu',
  KKY: 'Karla karışık yağmurlu', HKY: 'Hafif kar yağışlı', K: 'Kar yağışlı',
  YKY: 'Yoğun kar yağışlı', HSY: 'Hafif sağanak yağışlı', SY: 'Sağanak yağışlı',
  KSY: 'Kuvvetli sağanak yağışlı', MSY: 'Mevzii sağanak yağışlı',
  GSY: 'Gökgürültülü sağanak yağışlı', KGY: 'Kuvvetli gökgürültülü sağanak yağışlı',
  DY: 'Dolu', SIS: 'Sisli', PUS: 'Puslu', DMN: 'Dumanlı', KF: 'Kum fırtınası',
  R: 'Rüzgârlı', GKR: 'Güneyli kuvvetli rüzgâr', KKR: 'Kuzeyli kuvvetli rüzgâr',
  SCK: 'Sıcak', SGK: 'Soğuk', HHY: 'Hafif yağışlı', BLS: 'Buzlanma',
};

const SIMGE = {
  A: '☀️', AB: '🌤️', PB: '⛅', CB: '☁️',
  HY: '🌦️', Y: '🌧️', KY: '🌧️', HSY: '🌦️', SY: '🌦️', KSY: '🌧️', MSY: '🌦️',
  GSY: '⛈️', KGY: '⛈️', DY: '🌨️',
  KKY: '🌨️', HKY: '🌨️', K: '❄️', YKY: '❄️',
  SIS: '🌫️', PUS: '🌫️', DMN: '🌫️', R: '💨', GKR: '💨', KKR: '💨',
  SCK: '🥵', SGK: '🥶', BLS: '🧊',
};

let merkezOnbellek = null;
let merkezZamani = 0;

async function birKez(yol) {
  const kes = new AbortController();
  const sayac = setTimeout(() => kes.abort(), ZAMAN_ASIMI);
  try {
    const y = await fetch(`${KOK}/${yol}`, { headers: BASLIKLAR, signal: kes.signal });
    if (!y.ok) throw new Error(`HTTP ${y.status}`);
    const d = await y.json();
    if (!Array.isArray(d) || !d.length) throw new Error('boş yanıt');
    return d;
  } finally {
    clearTimeout(sayac);
  }
}

async function iste(yol) {
  let son = null;
  for (let i = 0; i < DENEME; i++) {
    try {
      return await birKez(yol);
    } catch (e) {
      son = e;
      if (i < DENEME - 1) await new Promise((r) => setTimeout(r, DENEME_ARASI * (i + 1)));
    }
  }
  throw son;
}

async function sirayla(liste, isFn) {
  const sonuc = new Array(liste.length);
  let ix = 0;
  const isci = async () => {
    while (ix < liste.length) {
      const i = ix++;
      try { sonuc[i] = await isFn(liste[i]); } catch { sonuc[i] = null; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(ES_ZAMAN, liste.length) }, isci));
  return sonuc;
}

async function merkezleriGetir() {
  if (merkezOnbellek && Date.now() - merkezZamani < ONBELLEK_SURESI) return merkezOnbellek;
  const bulunan = await sirayla(ILCELER, async (ilce) => {
    const d = await iste(`merkezler?il=${encodeURIComponent(IL)}&ilce=${encodeURIComponent(ilce)}`);
    if (!d || !d.length) return null;
    return { ilce, sondurum: d[0].sondurumIstNo, tahmin: d[0].gunlukTahminIstNo };
  });
  const liste = bulunan.filter(Boolean);
  if (!liste.length) throw new Error('Meteoroloji servisinden merkez listesi alınamadı.');
  merkezOnbellek = liste;
  merkezZamani = Date.now();
  return liste;
}

function sayi(v) {
  return v == null || v === -9999 ? null : v;
}

async function havaDurumu() {
  const merkezler = await merkezleriGetir();

  const veriler = await sirayla(merkezler, async (m) => {
    const [son, tahmin] = await Promise.all([
      m.sondurum ? iste(`sondurumlar?istno=${m.sondurum}`).catch(() => null) : null,
      m.tahmin ? iste(`tahminler/gunluk?istno=${m.tahmin}`).catch(() => null) : null,
    ]);
    const s = son && son[0] ? son[0] : {};
    const t = tahmin && tahmin[0] ? tahmin[0] : {};
    return {
      ilce: m.ilce,
      sicaklik: sayi(s.sicaklik),
      hissedilen: sayi(s.hissedilenSicaklik),
      nem: sayi(s.nem),
      ruzgar: sayi(s.ruzgarHiz),
      hadise: s.hadiseKodu || t.hadiseGun1 || null,
      enDusuk: sayi(t.enDusukGun1),
      enYuksek: sayi(t.enYuksekGun1),
      tahminHadise: t.hadiseGun1 || null,
      zaman: s.veriZamani || null,
    };
  });

  return veriler.filter(Boolean);
}

function tarihYaz(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function metinOlustur(veriler) {
  const satirlar = veriler.map((v) => {
    const simge = SIMGE[v.hadise] || '•';
    const ad = HADISE[v.hadise] || v.hadise || '';
    const parcalar = [];
    if (v.sicaklik != null) parcalar.push(`${Math.round(v.sicaklik)}°C`);
    if (v.enDusuk != null && v.enYuksek != null) {
      parcalar.push(`${Math.round(v.enDusuk)}/${Math.round(v.enYuksek)}°`);
    }
    if (v.nem != null) parcalar.push(`%${Math.round(v.nem)} nem`);
    if (v.ruzgar != null) parcalar.push(`${Math.round(v.ruzgar)} km/s`);
    const olcum = parcalar.join(' · ') || 'veri yok';
    return `${simge} *${v.ilce}* — ${olcum}${ad ? `\n   ${ad}` : ''}`;
  });

  const eksik = veriler.filter((v) => v.sicaklik == null).length;
  return [
    `*BURSA HAVA DURUMU*`,
    `${tarihYaz()}`,
    '',
    satirlar.join('\n'),
    '',
    eksik ? `_${eksik} ilçede anlık ölçüm gelmedi._` : '',
    `_Kaynak: Meteoroloji Genel Müdürlüğü_`,
  ].filter((x) => x !== '').join('\n');
}

async function havaMetni() {
  const veriler = await havaDurumu();
  if (!veriler.length) throw new Error('Hava durumu verisi alınamadı.');
  return metinOlustur(veriler);
}

module.exports = { havaDurumu, havaMetni, metinOlustur, merkezleriGetir, ILCELER, HADISE };
