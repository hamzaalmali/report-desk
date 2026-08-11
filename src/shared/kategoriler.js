// Hamza ALMALI

'use strict';

const { key } = require('./tr');

const KATEGORILER = [
  { kod: 'ARIZA_DETAY',   ad: 'ARIZA DETAY',                    genislik: 4, otomatik: true,  sira: 1 },
  { kod: 'DURUM_KODU',    ad: 'DURUM KODU',                     genislik: 4, otomatik: true,  sira: 2 },
  { kod: 'BINA_TIPI_OSOS',ad: 'BİNA TİPİ OSOS',                 genislik: 4, otomatik: true,  sira: 3 },
  { kod: 'OSOS_BAGLANTI', ad: 'OSOS BAĞLANTI İHBAR İNCELEMESİ', genislik: 4, otomatik: true,  sira: 4 },
  { kod: 'BILGI_BELGE',   ad: 'BİLGİ BELGE',                    genislik: 2, otomatik: true,  sira: 5 },
  { kod: 'OSOS_BAGLI_AG', ad: 'OSOS BAĞLI AG',                  genislik: 2, otomatik: false, sira: 6 },
  { kod: 'KABLO_TEST',    ad: 'KABLO TEST',                     genislik: 2, otomatik: false, sira: 7 },
  { kod: 'IL_ILCE',       ad: 'İL-İLÇE',                        genislik: 2, otomatik: false, sira: 8 },
  { kod: 'SCADA_TM',      ad: 'SCADA-TM',                       genislik: 2, otomatik: false, sira: 9 },
];

const TAKMA_ADLAR = {
  ARIZADETAY: 'ARIZA_DETAY',
  DURUMKODU: 'DURUM_KODU',
  BİNATİPİOSOS: 'BINA_TIPI_OSOS',
  OSOSBAĞLANTIİHBARİNCELEMESİ: 'OSOS_BAGLANTI',
  OSOSBAĞLANTIİHBARİNCELEME: 'OSOS_BAGLANTI',
  BİLGİBELGE: 'BILGI_BELGE',
  OSOSBAĞLIAG: 'OSOS_BAGLI_AG',
  KABLOTEST: 'KABLO_TEST',
  İLİLÇE: 'IL_ILCE',
  SCADATM: 'SCADA_TM',
  TMSCADA: 'SCADA_TM',
};

const KOD_ILE = new Map(KATEGORILER.map((k) => [k.kod, k]));

function kategoriBul(ad) {
  const k = key(ad);
  const kod = TAKMA_ADLAR[k];
  if (kod) return KOD_ILE.get(kod);
  for (const kat of KATEGORILER) if (key(kat.ad) === k) return kat;
  return null;
}

const ALANLAR_4 = ['ariza_var', 'donus_saglandi', 'tutanak_gerekli', 'tutanak_eklendi'];
const ALANLAR_2 = ['tutanak_gerekli', 'tutanak_eklendi'];

function alanlar(genislik) {
  return genislik === 4 ? ALANLAR_4 : ALANLAR_2;
}

const ALAN_BASLIK = {
  ariza_var: 'ARIZASI VAR MI?',
  donus_saglandi: 'DÖNÜŞ SAĞLANDI MI?',
  tutanak_gerekli: 'TUTANAK\nGEREKLİ MI?',
  tutanak_eklendi: 'TUTANAK\nEKLENDİ MI?',
};

const TUM_ALANLAR = ALANLAR_4;

module.exports = { KATEGORILER, kategoriBul, alanlar, ALAN_BASLIK, TUM_ALANLAR, KOD_ILE };
