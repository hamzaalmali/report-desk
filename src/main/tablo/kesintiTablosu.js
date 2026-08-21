// Hamza ALMALI

'use strict';

const path = require('node:path');
const ExcelJS = require('exceljs');
const { key, trUpper } = require('../../shared/tr');
const {
  sayi, duz, kodMetni, sutunBul, dosyaOku, sayfaYaz,
} = require('./tabloOku');

const ALTI_SAAT = 6;
const BIN_ABONE = 1000;

const REKORTMAN_NEDEN = 'AG ABONE KABLOSU';
const REKORTMAN_KAYNAK = 'DAGITIM TRANSFORMATORU';
const REKORTMAN_EN_AZ_ABONE = 10;

const EK_ABONE = 'Toplam Abone';
const EK_TABLET = 'TABLET AÇIKLAMASI';

const DOKUZLU = /\(9[A-F]\)/;

const KOD_DESEN = ['KESİNTİNİN KODU (1)', 'KOD NO (1)', 'KESİNTİ KODU', 'KOD NO'];
const SURE_DESEN = ['KESİNTİ SÜRESİ'];
const ILCE_DESEN = ['İLÇE (3B)', 'İLÇE'];
const NEDEN_DESEN = ['KESİNTİ NEDENİNE İLİŞKİN AÇIKLAMA (4)', 'KESİNTİ NEDEN'];
const KAYNAK_DESEN = ['KAYNAK TÜRÜ'];
const ABONE_DESEN = ['TOPLAM ABONE', 'ETKİLENEN ABONE', 'ABONE SAYISI'];
const TABLET_DESEN = ['TABLET AÇIKLAMA'];

async function olustur({ anaDosya, detayDosya, hedefKlasor, tarihMetni, log = () => { } }) {
  let ana = await dosyaOku(anaDosya, KOD_DESEN);
  let detay = await dosyaOku(detayDosya, KOD_DESEN);

  if (sutunBul(ana.basliklar, TABLET_DESEN) >= 0
    && sutunBul(detay.basliklar, TABLET_DESEN) < 0) {
    [ana, detay] = [detay, ana];
    log('Kesinti tablosu: dosyalar ters sırada gelmiş, liste ile detay yer değiştirildi.');
  }
  if (ana.baslikSatiri > 1 || detay.baslikSatiri > 1) {
    log(`Kesinti tablosu: başlık satırı listede ${ana.baslikSatiri}., `
      + `detayda ${detay.baslikSatiri}. satırda bulundu; üstteki satırlar atlandı.`);
  }

  const anaKod = sutunBul(ana.basliklar, KOD_DESEN);
  const anaSure = sutunBul(ana.basliklar, SURE_DESEN);
  const dKod = sutunBul(detay.basliklar, KOD_DESEN);
  const dIlce = sutunBul(detay.basliklar, ILCE_DESEN);
  const dNeden = sutunBul(detay.basliklar, NEDEN_DESEN);
  const dKaynak = sutunBul(detay.basliklar, KAYNAK_DESEN);
  const dAbone = sutunBul(detay.basliklar, ABONE_DESEN);
  const dTablet = sutunBul(detay.basliklar, TABLET_DESEN);

  if (anaKod < 0) throw new Error(`Kesinti listesinde kod sütunu bulunamadı (${path.basename(anaDosya)}).`);
  if (dKod < 0) throw new Error(`Detay raporunda kod sütunu bulunamadı (${path.basename(detayDosya)}).`);
  for (const [ix, adx] of [[dAbone, 'abone'], [dTablet, 'tablet açıklaması'], [dIlce, 'ilçe']]) {
    if (ix < 0) log(`Kesinti tablosu: detay raporunda ${adx} sütunu bulunamadı, ilgili alanlar boş kalacak.`);
  }
  if (anaSure < 0) log('Kesinti tablosu: listede süre sütunu bulunamadı, süre sayfası boş kalacak.');

  const ilkKayit = new Map();
  for (const s of detay.satirlar) {
    const k = kodMetni(s[dKod]);
    if (k && !ilkKayit.has(k)) ilkKayit.set(k, s);
  }

  const dokuzlar = ana.basliklar
    .map((b, i) => (DOKUZLU.test(b.ad || '') ? i : -1))
    .filter((i) => i >= 0);

  let anaBasliklar;
  let anaSatirlar;
  let aboneSutun;
  let tabletSutun;

  if (dokuzlar.length) {
    const ilk9 = Math.min(...dokuzlar);
    const anaTablet = sutunBul(ana.basliklar, TABLET_DESEN);
    anaBasliklar = ana.basliklar.slice(0, ilk9).map((b) => ({ ...b }));
    anaBasliklar.push({ ad: EK_ABONE, anahtar: key(EK_ABONE), genislik: 14 });
    aboneSutun = anaBasliklar.length - 1;
    anaBasliklar.push({ ad: EK_TABLET, anahtar: key(EK_TABLET), genislik: 40 });
    tabletSutun = anaBasliklar.length - 1;

    let okunamayan = 0;
    anaSatirlar = ana.satirlar.map((s) => {
      const yeni = s.slice(0, ilk9);
      while (yeni.length < aboneSutun) yeni.push(null);
      let toplam = null;
      for (const i of dokuzlar) {
        const v = sayi(s[i]);
        if (v != null) toplam = (toplam || 0) + v;
        else if (s[i] != null && String(s[i]).trim() !== '') okunamayan++;
      }
      yeni[aboneSutun] = toplam == null ? null : Math.round(toplam);
      let tablet = anaTablet >= 0 ? s[anaTablet] : null;
      if ((tablet == null || tablet === '') && dTablet >= 0) {
        const d = ilkKayit.get(kodMetni(s[anaKod]));
        if (d) tablet = d[dTablet];
      }
      yeni[tabletSutun] = tablet == null ? null : tablet;
      return yeni;
    });
    log(`Kesinti tablosu: ${dokuzlar.length} abone sütunu toplanıp "Toplam Abone" yazıldı: `
      + dokuzlar.map((i) => ana.basliklar[i].ad).join(' + '));
    if (okunamayan) {
      log(`Kesinti tablosu: abone sütunlarında ${okunamayan} hücre sayıya çevrilemedi `
        + 've toplama girmedi.');
    }
    const eksikler = ['9A', '9B', '9C', '9D', '9E', '9F']
      .filter((e) => !dokuzlar.some((i) => (ana.basliklar[i].ad || '').includes(e)));
    if (eksikler.length) {
      log(`Kesinti tablosu: listede bulunamayan abone sütunları toplama girmedi: ${eksikler.join(', ')}`);
    }
  } else {
    anaBasliklar = ana.basliklar.slice();
    aboneSutun = sutunBul(anaBasliklar, ABONE_DESEN);
    tabletSutun = sutunBul(anaBasliklar, TABLET_DESEN);
    if (aboneSutun < 0 && dAbone >= 0) {
      anaBasliklar.push({ ad: EK_ABONE, anahtar: key(EK_ABONE), genislik: 14 });
      aboneSutun = anaBasliklar.length - 1;
    }
    if (tabletSutun < 0 && dTablet >= 0) {
      anaBasliklar.push({ ad: EK_TABLET, anahtar: key(EK_TABLET), genislik: 40 });
      tabletSutun = anaBasliklar.length - 1;
    }

    anaSatirlar = ana.satirlar.map((s) => {
      const yeni = s.slice();
      while (yeni.length < anaBasliklar.length) yeni.push(null);
      const d = ilkKayit.get(kodMetni(s[anaKod]));
      if (d) {
        if (aboneSutun >= ana.basliklar.length && dAbone >= 0) {
          const v = sayi(d[dAbone]);
          yeni[aboneSutun] = v == null ? null : Math.round(v);
        }
        if (tabletSutun >= ana.basliklar.length && dTablet >= 0) yeni[tabletSutun] = d[dTablet];
      }
      return yeni;
    });
  }

  const aboneDegeri = (s) => (aboneSutun >= 0 ? sayi(s[aboneSutun]) : null);

  const altiSaat = anaSure < 0 ? []
    : anaSatirlar.filter((s) => (sayi(s[anaSure]) || 0) >= ALTI_SAAT);
  const binAbone = aboneSutun < 0 ? []
    : anaSatirlar.filter((s) => (aboneDegeri(s) || 0) >= BIN_ABONE);
  const arizaDetay = anaSatirlar;

  const ilceler = new Map();
  if (dIlce >= 0) {
    for (const s of detay.satirlar) {
      const k = kodMetni(s[dKod]);
      const ilce = kodMetni(s[dIlce]);
      if (!k || !ilce) continue;
      if (!ilceler.has(k)) ilceler.set(k, new Set());
      ilceler.get(k).add(trUpper(ilce));
    }
  }
  const cokIlceli = new Set([...ilceler].filter(([, v]) => v.size >= 2).map(([k]) => k));
  const ikiIlce = detay.satirlar.filter((s) => cokIlceli.has(kodMetni(s[dKod])));

  const rekortman = (dNeden < 0 || dKaynak < 0) ? []
    : detay.satirlar.filter((s) => duz(s[dNeden]) === duz(REKORTMAN_NEDEN)
      && duz(s[dKaynak]) === duz(REKORTMAN_KAYNAK)
      && (dAbone < 0 || (sayi(s[dAbone]) || 0) >= REKORTMAN_EN_AZ_ABONE));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Report Desk';
  sayfaYaz(wb, '6 Saat ve Üzeri Kesintiler', anaBasliklar, altiSaat);
  sayfaYaz(wb, '2 ve Üzeri Etkilenen İlçeler', detay.basliklar, ikiIlce,
    { vurgulu: { sutun: dKod, kodlar: cokIlceli } });
  sayfaYaz(wb, 'Rekortman', detay.basliklar, rekortman);
  sayfaYaz(wb, '1000 ve Üzeri Etkilenen Abone', anaBasliklar, binAbone);
  sayfaYaz(wb, 'ARIZA DETAY', anaBasliklar, arizaDetay);

  const ad = `${tarihMetni} Tarihinde Gerçekleşmiş Olan Kesinti Detayları.xlsx`
    .replace(/[\\/:*?"<>|]+/g, '-');
  const dosya = path.join(hedefKlasor, ad);
  await wb.xlsx.writeFile(dosya);

  const ozet = {
    toplam: anaSatirlar.length,
    detayToplam: detay.satirlar.length,
    altiSaat: altiSaat.length,
    binAbone: binAbone.length,
    ikiIlce: cokIlceli.size,
    rekortman: rekortman.length,
  };
  log(`Kesinti tablosu üretildi: ${ad} — ${JSON.stringify(ozet)}`);
  return { dosya, ad, ozet };
}

module.exports = {
  olustur, sayi, duz, sutunBul,
  ALTI_SAAT, BIN_ABONE, REKORTMAN_NEDEN, REKORTMAN_KAYNAK, REKORTMAN_EN_AZ_ABONE,
};
