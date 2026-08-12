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
  gunExcelDisaAktar: (tarih) => cagir('gunExcelDisaAktar', tarih),
  klasorAc: (dosya) => cagir('klasorAc', dosya),

  vardiyaEkipler: () => cagir('vardiyaEkipler'),
  vardiyaEkipEkle: (ad, v) => cagir('vardiyaEkipEkle', ad, v),
  vardiyaEkipGuncelle: (id, p) => cagir('vardiyaEkipGuncelle', id, p),
  vardiyaEkipSil: (id) => cagir('vardiyaEkipSil', id),
  vardiyaPersonelEkle: (ekipId, ad) => cagir('vardiyaPersonelEkle', ekipId, ad),
  vardiyaPersonelSil: (id) => cagir('vardiyaPersonelSil', id),
  vardiyaPersonelTasi: (id, yon) => cagir('vardiyaPersonelTasi', id, yon),
  vardiyaAyVerisi: (ay) => cagir('vardiyaAyVerisi', ay),
  vardiyaAylar: () => cagir('vardiyaAylar'),
  vardiyaYaz: (ay, pid, gun, kod) => cagir('vardiyaYaz', ay, pid, gun, kod),
  vardiyaAySil: (ay) => cagir('vardiyaAySil', ay),
  vardiyaAktar: (dosyalar, s) => cagir('vardiyaAktar', dosyalar, s),
  vardiyaExcel: (ay) => cagir('vardiyaExcel', ay),

  surum: () => cagir('surum'),
  vtDurum: () => cagir('vtDurum'),
  vtOnar: () => cagir('vtOnar'),
  gunluguAc: () => cagir('gunluguAc'),
  hepsiniSifirla: () => cagir('hepsiniSifirla'),
  panoyaKopyala: (metin) => cagir('panoyaKopyala', metin),
  guncellemeKontrol: () => cagir('guncellemeKontrol'),
  guncellemeDinle: (fn) => {
    ipcRenderer.on('guncelleme', (_o, veri) => fn(veri));
  },
});
