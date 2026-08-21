// Hamza ALMALI

'use strict';

const path = require('node:path');
const ExcelJS = require('exceljs');
const { key } = require('../../shared/tr');
const {
  sayi, duz, kodMetni, sutunBul, sutunSec, dosyaOku, sayfaYaz,
} = require('./tabloOku');

const IHBAR_DETAY_SECILEN = 'OSOS Ihbar Olusturma';
const KAPSAM_DISI = 'TSUIS KAPSAMINDA DEGIL';
const TAM_ORAN = 100;

const KESINTI_VAR = 'VAR';
const KESINTI_YOK = 'YOK';

const IHBAR_SAYFA = 'BİNA TİPİ';
const BAGLANTI_SAYFA = 'OSOS BAĞLANTI';

const IHBAR_KOD_DESEN = ['İHBAR NO', 'TALEP NO'];
const OSOS_KOD_DESEN = ['TALEP NO', 'ADI'];
const FORM_KOD_DESEN = ['KESİNTİNİN KODU (1)', 'KOD NO (1)', 'KESİNTİ KODU', 'KOD NO'];
const BAGLANTI_KOD_DESEN = ['KESINTI NO', 'KESİNTİ NO'];

const IHBAR_SUTUNLARI = [
  { ad: 'İhbar No', desen: ['İHBAR NO'], harf: 1, genislik: 13.14 },
  { ad: 'Talep No', desen: ['TALEP NO'], harf: 2, genislik: 13.43, sayiya: true },
];

const IHBAR_SON_SUTUNLAR = [
  { ad: 'Müdürlük', desen: ['MÜDÜRLÜK', 'MÜDÜRLÜK ADI'], genislik: 14.14 },
  { ad: 'İl Adı', desen: ['İL ADI'], genislik: 11.57 },
  { ad: 'İlçe Adı', desen: ['İLÇE ADI'], genislik: 13.57 },
  { ad: 'Mahalle Adı', desen: ['MAHALLE ADI'], genislik: 22.29 },
  { ad: 'Köy Adı', desen: ['KÖY ADI'], genislik: 13.86 },
  { ad: 'İhbar Detay', desen: ['İHBAR DETAY'], harf: 17, genislik: 20.86 },
  { ad: 'İhbar Tarihi', desen: ['İHBAR TARİHİ'], genislik: 18 },
  { ad: 'Enerji Alma Zamanı', desen: ['ENERJİ ALMA ZAMANI'], genislik: 22.71 },
  { ad: 'Kesinti No', desen: ['KESİNTİ NO'], harf: 5, genislik: 13, sayiya: true },
];

const OSOS_TALEP = { desen: ['TALEP NO', 'TALEP NUMARASI', 'TALEP'], harf: 3 };
const OSOS_SUTUNLARI = [
  { ad: 'TRAFO ADI', desen: ['ADI'], harf: 4, genislik: 40 },
  { ad: 'TİPİ', desen: ['TIPI', 'TİPİ'], harf: 7, genislik: 16 },
  { ad: 'FONKSİYON', desen: ['FONKSIYON', 'FONKSİYON'], harf: 8, genislik: 20 },
  { ad: 'İŞLETME', desen: ['ISLETME', 'İŞLETME'], harf: 10, genislik: 18 },
  { ad: 'MÜLKİYET', desen: ['MULKIYET', 'MÜLKİYET'], harf: 13, genislik: 16 },
];

const KESINTI_SUTUNU = { ad: 'KESİNTİ KAYDI', genislik: 15 };

const BAGLANTI_SUTUNLARI = [
  { ad: 'KESINTI NO', desen: ['KESINTI NO', 'KESİNTİ NO'], genislik: 11 },
  { ad: 'ENERJİLENEN KAYNAK', desen: ['ENERJİLENEN KAYNAK'], genislik: 20.57 },
  { ad: 'ENERJİLENEN HAT', desen: ['ENERJİLENEN HAT'], genislik: 16.71 },
  { ad: 'İL', desen: ['İL'], genislik: 11.57 },
  { ad: 'İLÇE', desen: ['İLÇE'], genislik: 13.57 },
  { ad: 'MÜDÜRLÜK', desen: ['MÜDÜRLÜK'], genislik: 12 },
  { ad: 'GERİLİM SEVİYESİ', desen: ['GERİLİM SEVİYESİ'], genislik: 16.14 },
  { ad: 'SÜREYE GÖRE', desen: ['SÜREYE GÖRE'], genislik: 12.71 },
  { ad: 'BİLDİRİM DURUMU', desen: ['BİLDİRİM DURUMU'], genislik: 17.57 },
  { ad: 'KESINTI BASLANGIC ZAMANI', desen: ['KESINTI BASLANGIC ZAMANI', 'KESİNTİ BAŞLANGIÇ ZAMANI'], genislik: 26.43 },
  { ad: 'KESINTI BITIS ZAMANI', desen: ['KESINTI BITIS ZAMANI', 'KESİNTİ BİTİŞ ZAMANI'], genislik: 20.43 },
  { ad: 'KESINTI SÜRESİ', desen: ['KESINTI SÜRESİ', 'KESİNTİ SÜRESİ'], genislik: 15.14 },
  { ad: 'ENERJILENEN TRAFO SAYISI', desen: ['ENERJILENEN TRAFO SAYISI', 'ENERJİLENEN TRAFO SAYISI'], genislik: 22.14 },
  { ad: 'ENERJILENEN BINA TIPI TRAFO SAYISI', desen: ['ENERJILENEN BINA TIPI TRAFO SAYISI', 'ENERJİLENEN BİNA TİPİ TRAFO SAYISI'], genislik: 22.14 },
  { ad: 'BAĞLANAN BINA TIPI TRAFO SAYISI', desen: ['BAĞLANAN BINA TIPI TRAFO SAYISI', 'BAĞLANAN BİNA TİPİ TRAFO SAYISI'], genislik: 22.14 },
  { ad: 'TSUİS KAPSAMINDA BAĞLANMASI GEREKEN TRAFO SAYISI', desen: ['TSUİS KAPSAMINDA BAĞLANMASI GEREKEN TRAFO SAYISI'], genislik: 22.14 },
  { ad: 'TSUİS KAPSAMINDA BAĞLANAN TRAFO SAYISI', desen: ['TSUİS KAPSAMINDA BAĞLANAN TRAFO SAYISI'], genislik: 22.14 },
  { ad: 'TSUİS BAĞLANMA ORANI', desen: ['TSUİS BAĞLANMA ORANI'], genislik: 22.14 },
  { ad: 'BAĞLANMAYAN BİNA TİPİ TRAFOLAR', desen: ['BAĞLANMAYAN BİNA TİPİ TRAFOLAR'], genislik: 101 },
];

const ORAN_ADI = 'TSUİS BAĞLANMA ORANI';
const BASLANGIC_ADI = 'KESINTI BASLANGIC ZAMANI';

function ikiHane(s) {
  return String(s).padStart(2, '0');
}

function gunMetni(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    return `${ikiHane(v.getUTCDate())}.${ikiHane(v.getUTCMonth() + 1)}.${v.getUTCFullYear()}`;
  }
  const s = String(v).trim();
  const nokta = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (nokta) return `${ikiHane(nokta[1])}.${ikiHane(nokta[2])}.${nokta[3]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
  return '';
}

function sayiyaCevir(v) {
  const n = sayi(v);
  return n == null ? v : n;
}

function sutunlariEsle(basliklar, tanimlar, kaynakAdi, log) {
  const eksik = [];
  const cozum = tanimlar.map((t) => {
    const i = sutunSec(basliklar, t.desen, t.harf);
    if (i < 0) eksik.push(t.ad);
    return { ...t, kaynak: i, kaynakAd: i >= 0 ? basliklar[i].ad : null };
  });
  if (eksik.length) {
    log(`BİNA TİPİ OSOS: ${kaynakAdi} dosyasında bulunamayan sütunlar boş bırakıldı: `
      + eksik.join(', '));
  }
  return cozum;
}

function atilanlariYaz(basliklar, kullanilan, kaynakAdi, log) {
  const kalan = basliklar
    .filter((_, i) => !kullanilan.has(i))
    .map((b) => b.ad)
    .filter(Boolean);
  if (kalan.length) {
    log(`BİNA TİPİ OSOS: ${kaynakAdi} dosyasında listede olmayan `
      + `${kalan.length} sütun atıldı: ${kalan.join(', ')}`);
  }
}

function basliklariUret(cozum) {
  return cozum.map((c) => ({ ad: c.ad, anahtar: key(c.ad), genislik: c.genislik }));
}

async function ihbarSayfasi({ ihbarDosya, ososDosya, formDetayDosya, log }) {
  const ihbar = await dosyaOku(ihbarDosya, IHBAR_KOD_DESEN);
  const osos = await dosyaOku(ososDosya, OSOS_KOD_DESEN);
  const form = await dosyaOku(formDetayDosya, FORM_KOD_DESEN);

  if (ihbar.baslikSatiri > 1) {
    log(`BİNA TİPİ OSOS: ihbar raporunda başlık ${ihbar.baslikSatiri}. satırda bulundu, `
      + 'üstteki satırlar atlandı.');
  }
  if (form.baslikSatiri > 1) {
    log(`BİNA TİPİ OSOS: form detay raporunda başlık ${form.baslikSatiri}. satırda bulundu, `
      + 'üstteki satırlar atlandı.');
  }

  const ihbarCozum = sutunlariEsle(ihbar.basliklar,
    [...IHBAR_SUTUNLARI, ...IHBAR_SON_SUTUNLAR], 'AYS İhbar Takip', log);
  atilanlariYaz(ihbar.basliklar,
    new Set(ihbarCozum.map((c) => c.kaynak).filter((i) => i >= 0)), 'AYS İhbar Takip', log);

  const ososCozum = sutunlariEsle(osos.basliklar, OSOS_SUTUNLARI, 'osos_rapor', log);
  const ososTalep = sutunSec(osos.basliklar, OSOS_TALEP.desen, OSOS_TALEP.harf);
  if (ososTalep < 0) {
    throw new Error(`osos_rapor dosyasında Talep No sütunu bulunamadı `
      + `(${path.basename(ososDosya)}).`);
  }
  log('BİNA TİPİ OSOS: osos_rapor eşleşen sütunlar — '
    + ososCozum.map((c) => `${c.ad}←${c.kaynakAd || 'yok'}`).join(', '));

  const ososKayit = new Map();
  for (const s of osos.satirlar) {
    const k = kodMetni(sayiyaCevir(s[ososTalep]));
    if (k && !ososKayit.has(k)) ososKayit.set(k, s);
  }

  const formKod = sutunBul(form.basliklar, FORM_KOD_DESEN);
  if (formKod < 0) {
    throw new Error('AYS Kesintiler Form Detay raporunda kesinti kodu sütunu bulunamadı '
      + `(${path.basename(formDetayDosya)}).`);
  }
  const formKodlari = new Set();
  for (const s of form.satirlar) {
    const k = kodMetni(sayiyaCevir(s[formKod]));
    if (k) formKodlari.add(k);
  }

  const ihbarDetay = ihbarCozum.find((c) => c.ad === 'İhbar Detay');
  const kesintiNo = ihbarCozum.find((c) => c.ad === 'Kesinti No');
  const secilen = duz(IHBAR_DETAY_SECILEN);

  const basliklar = [
    ...basliklariUret(ihbarCozum.slice(0, IHBAR_SUTUNLARI.length)),
    ...basliklariUret(ososCozum),
    ...basliklariUret(ihbarCozum.slice(IHBAR_SUTUNLARI.length)),
    { ad: KESINTI_SUTUNU.ad, anahtar: key(KESINTI_SUTUNU.ad), genislik: KESINTI_SUTUNU.genislik },
  ];

  let ososBulunmayan = 0;
  let kesintisiz = 0;
  const satirlar = [];
  for (const s of ihbar.satirlar) {
    if (ihbarDetay && ihbarDetay.kaynak >= 0
      && duz(s[ihbarDetay.kaynak]) !== secilen) continue;

    const al = (c) => {
      if (c.kaynak < 0) return null;
      const v = s[c.kaynak];
      return c.sayiya ? sayiyaCevir(v) : v;
    };

    const bas = ihbarCozum.slice(0, IHBAR_SUTUNLARI.length).map(al);
    const son = ihbarCozum.slice(IHBAR_SUTUNLARI.length).map(al);

    const talep = kodMetni(bas[1]);
    const esKayit = ososKayit.get(talep);
    if (!esKayit) ososBulunmayan++;
    const orta = ososCozum.map((c) => (esKayit && c.kaynak >= 0 ? esKayit[c.kaynak] : null));

    const kod = kesintiNo ? kodMetni(al(kesintiNo)) : '';
    const kayit = kod && formKodlari.has(kod) ? KESINTI_VAR : KESINTI_YOK;
    if (kayit === KESINTI_YOK) kesintisiz++;

    satirlar.push([...bas, ...orta, ...son, kayit]);
  }

  log(`BİNA TİPİ OSOS: ihbar raporunda ${ihbar.satirlar.length} satırdan `
    + `${satirlar.length} tanesi "${IHBAR_DETAY_SECILEN}" olarak süzüldü; `
    + `${ososBulunmayan} tanesinin talebi osos_rapor'da yok, `
    + `${kesintisiz} tanesinin kesintisi form detayda yok.`);

  return {
    basliklar,
    satirlar,
    ozet: {
      ihbarHam: ihbar.satirlar.length,
      ihbar: satirlar.length,
      ososYok: ososBulunmayan,
      kesintiYok: kesintisiz,
    },
  };
}

async function baglantiSayfasi({ baglantiDosya, bitisTarihi, log }) {
  const veri = await dosyaOku(baglantiDosya, BAGLANTI_KOD_DESEN);
  if (veri.baslikSatiri > 1) {
    log(`BİNA TİPİ OSOS: bağlanma oran raporunda başlık ${veri.baslikSatiri}. satırda `
      + 'bulundu, üstteki satırlar atlandı.');
  }

  const cozum = sutunlariEsle(veri.basliklar, BAGLANTI_SUTUNLARI,
    'AYS Osos Bağlanma Oran', log);
  atilanlariYaz(veri.basliklar,
    new Set(cozum.map((c) => c.kaynak).filter((i) => i >= 0)), 'AYS Osos Bağlanma Oran', log);

  const oran = cozum.find((c) => c.ad === ORAN_ADI);
  const baslangic = cozum.find((c) => c.ad === BASLANGIC_ADI);
  const bitisGunu = gunMetni(bitisTarihi);

  let tamOran = 0;
  let kapsamDisi = 0;
  let sonrakiGun = 0;
  const satirlar = [];
  for (const s of veri.satirlar) {
    if (oran && oran.kaynak >= 0) {
      const ham = s[oran.kaynak];
      const n = sayi(ham);
      if (n != null && n >= TAM_ORAN) { tamOran++; continue; }
      if (n == null && duz(ham).includes(duz(KAPSAM_DISI))) { kapsamDisi++; continue; }
    }
    if (bitisGunu && baslangic && baslangic.kaynak >= 0
      && gunMetni(s[baslangic.kaynak]) === bitisGunu) {
      sonrakiGun++;
      continue;
    }
    satirlar.push(cozum.map((c) => (c.kaynak >= 0 ? s[c.kaynak] : null)));
  }

  log(`BİNA TİPİ OSOS: bağlanma oran raporunda ${veri.satirlar.length} satırdan `
    + `${tamOran} tanesi %100, ${kapsamDisi} tanesi kapsam dışı, `
    + `${sonrakiGun} tanesi ${bitisGunu} tarihli olduğu için çıkarıldı; `
    + `${satirlar.length} satır kaldı.`);

  return {
    basliklar: basliklariUret(cozum),
    satirlar,
    ozet: {
      baglantiHam: veri.satirlar.length,
      baglanti: satirlar.length,
      tamOran,
      kapsamDisi,
      sonrakiGun,
    },
  };
}

async function olustur({
  ihbarDosya, ososDosya, formDetayDosya, baglantiDosya,
  hedefKlasor, tarihMetni, bitisTarihi, log = () => { },
}) {
  const ihbar = await ihbarSayfasi({ ihbarDosya, ososDosya, formDetayDosya, log });
  const baglanti = await baglantiSayfasi({ baglantiDosya, bitisTarihi, log });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Report Desk';
  sayfaYaz(wb, IHBAR_SAYFA, ihbar.basliklar, ihbar.satirlar);
  sayfaYaz(wb, BAGLANTI_SAYFA, baglanti.basliklar, baglanti.satirlar);

  const ad = `${tarihMetni} BİNA TİPİ OSOS.xlsx`.replace(/[\\/:*?"<>|]+/g, '-');
  const dosya = path.join(hedefKlasor, ad);
  await wb.xlsx.writeFile(dosya);

  const ozet = { ...ihbar.ozet, ...baglanti.ozet };
  log(`BİNA TİPİ OSOS tablosu üretildi: ${ad} — ${JSON.stringify(ozet)}`);
  return { dosya, ad, ozet };
}

module.exports = {
  olustur, gunMetni, sayiyaCevir,
  IHBAR_DETAY_SECILEN, KAPSAM_DISI, TAM_ORAN, KESINTI_VAR, KESINTI_YOK,
  IHBAR_SAYFA, BAGLANTI_SAYFA, BAGLANTI_SUTUNLARI, OSOS_SUTUNLARI,
};
