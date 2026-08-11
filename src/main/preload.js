// Hamza ALMALI

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const cagir = (kanal, ...args) => ipcRenderer.invoke(kanal, ...args);

contextBridge.exposeInMainWorld('api', {
  ozet: () => cagir('ozet'),
  isletmeler: () => cagir('isletmeler'),
  kategoriler: () => cagir('kategoriler'),
  gunler: () => cagir('gunler'),
  aylar: () => cagir('aylar'),
  gunVerisi: (tarih) => cagir('gunVerisi', tarih),
  ayVerisi: (ay) => cagir('ayVerisi', ay),
  hucreGuncelle: (p) => cagir('hucreGuncelle', p),
  gunSil: (tarih) => cagir('gunSil', tarih),
  gunKategoriAc: (tarih, idler) => cagir('gunKategoriAc', tarih, idler),

  eslesmeler: () => cagir('eslesmeler'),
  eslesmeEkle: (p) => cagir('eslesmeEkle', p),
  eslesmeSil: (id) => cagir('eslesmeSil', id),
  eslesmeYedekle: () => cagir('eslesmeYedekle'),
  eslesmeGeriYukle: () => cagir('eslesmeGeriYukle'),
  isletmeEkle: (ad) => cagir('isletmeEkle', ad),
  isletmeSil: (id) => cagir('isletmeSil', id),
  isletmeTasi: (id, yon) => cagir('isletmeTasi', id, yon),
  isletmeSirala: (idler) => cagir('isletmeSirala', idler),
  isletmeSiralaAdlar: (adlar, s) => cagir('isletmeSiralaAdlar', adlar, s),
  vtYedekle: () => cagir('vtYedekle'),

  oneriler: (tarih) => cagir('oneriler', tarih),
  loglar: () => cagir('loglar'),

  dosyaSec: (baslik) => cagir('dosyaSec', baslik),
  gecmisAktar: (dosyalar, secenekler) => cagir('gecmisAktar', dosyalar, secenekler),
  gunlukAktar: (dosyalar, secenekler) => cagir('gunlukAktar', dosyalar, secenekler),
  excelDisaAktar: (ay) => cagir('excelDisaAktar', ay),
  klasorAc: (dosya) => cagir('klasorAc', dosya),

  surum: () => cagir('surum'),
  vtDurum: () => cagir('vtDurum'),
  vtOnar: () => cagir('vtOnar'),
  gunluguAc: () => cagir('gunluguAc'),
  hepsiniSifirla: () => cagir('hepsiniSifirla'),
  guncellemeKontrol: () => cagir('guncellemeKontrol'),
  guncellemeDinle: (fn) => {
    ipcRenderer.on('guncelleme', (_o, veri) => fn(veri));
  },
});
