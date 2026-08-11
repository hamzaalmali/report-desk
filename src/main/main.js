// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const db = require('./db/db');
const { gecmisiAktar } = require('./import/gecmisAktar');
const { gunlukAktar } = require('./import/gunlukAktar');
const { aylikDisaAktar } = require('./export/excelDisaAktar');
const { guncellemeyiKur, guncellemeKontrol } = require('./updater');

let pencere = null;

app.setName('report-desk');

const VERI_DOSYASI = () => path.join(app.getPath('userData'), 'veri.sqlite');

function pencereOlustur() {
  pencere = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#171717',
    show: false,
    autoHideMenuBar: true,
    title: 'Rapor Masası',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  pencere.loadFile(path.join(__dirname, '../renderer/index.html'));
  pencere.once('ready-to-show', () => pencere.show());

  if (!app.isPackaged) {
    pencere.webContents.on('console-message', (_o, seviye, mesaj, satir, kaynak) => {
      console.log(`[renderer:${seviye}] ${mesaj} (${kaynak}:${satir})`);
    });
  }

  if (process.env.UI_TEST) {
    pencere.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const betik = process.env.UI_TEST !== '1'
          ? process.env.UI_TEST
          : path.join(__dirname, '../../test/dom-kontrol.js');
        const js = require('node:fs').readFileSync(betik, 'utf8');
        try {
          console.log('TEST>>' + JSON.stringify(await pencere.webContents.executeJavaScript(js)));
        } catch (e) {
          console.log('TEST>>' + JSON.stringify({ hata: e.message }));
        }
        app.quit();
      }, 2500);
    });
  }

  pencere.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  db.ac(VERI_DOSYASI());
  pencereOlustur();
  guncellemeyiKur(() => pencere);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) pencereOlustur();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function kanal(ad, fn) {
  ipcMain.handle(ad, async (_olay, ...args) => {
    try {
      return { ok: true, veri: await fn(...args) };
    } catch (hata) {
      console.error(ad, hata);
      return { ok: false, hata: hata.message || String(hata) };
    }
  });
}

kanal('ozet', () => db.ozet());
kanal('isletmeler', () => db.isletmeler());
kanal('kategoriler', () => db.kategoriler());
kanal('gunler', () => db.gunler());
kanal('aylar', () => db.aylar());
kanal('gunVerisi', (tarih) => db.gunVerisi(tarih));
kanal('ayVerisi', (ay) => db.ayVerisi(ay));
kanal('hucreGuncelle', (p) => db.hucreGuncelle(p));
kanal('gunSil', (tarih) => { db.gunSil(tarih); return true; });
kanal('gunKategoriAc', (tarih, idler) => { db.gunKategoriAc(tarih, idler); return true; });

kanal('eslesmeler', () => db.eslesmeler());
kanal('eslesmeEkle', (p) => { db.eslesmeEkle(p); return db.eslesmeler(); });
kanal('eslesmeSil', (id) => { db.eslesmeSil(id); return db.eslesmeler(); });
kanal('isletmeEkle', (ad) => { db.isletmeEkle(ad); return db.isletmeler(); });
kanal('isletmeSil', (id) => { db.isletmeSil(id); return db.isletmeler(); });
kanal('isletmeTasi', (id, yon) => db.isletmeTasi(id, yon));
kanal('isletmeSirala', (idler) => { db.isletmeSirala(idler); return db.isletmeler(); });
kanal('isletmeSiralaAdlar', (adlar, s) => db.isletmeSiralaAdlar(adlar, s));

kanal('eslesmeYedekle', async () => {
  const r = await dialog.showSaveDialog(pencere, {
    title: 'Eşleştirme tablosunu kaydet',
    defaultPath: 'eslestirme-yedek.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (r.canceled) return null;
  fs.writeFileSync(r.filePath, JSON.stringify(db.eslesmeleriDisaAktar(), null, 2), 'utf8');
  return r.filePath;
});

kanal('eslesmeGeriYukle', async () => {
  const r = await dialog.showOpenDialog(pencere, {
    title: 'Eşleştirme yedeğini seçin',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (r.canceled) return null;
  return db.eslesmeleriIceAktar(JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8')));
});

kanal('vtYedekle', async () => {
  const g = new Date();
  const damga = `${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, '0')}-${String(g.getDate()).padStart(2, '0')}`;
  const r = await dialog.showSaveDialog(pencere, {
    title: 'Veritabanı yedeğini kaydet',
    defaultPath: `veri-yedek-${damga}.sqlite`,
    filters: [{ name: 'SQLite', extensions: ['sqlite'] }],
  });
  if (r.canceled) return null;
  fs.copyFileSync(db.yol(), r.filePath);
  return r.filePath;
});

kanal('oneriler', (tarih) => db.oneriler(tarih));
kanal('loglar', () => db.loglar());

kanal('dosyaSec', async (baslik) => {
  const r = await dialog.showOpenDialog(pencere, {
    title: baslik || 'Excel dosyalarını seçin',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xlsm', 'xls'] }],
  });
  return r.canceled ? [] : r.filePaths;
});

kanal('gecmisAktar', (dosyalar, secenekler) => gecmisiAktar(dosyalar, secenekler));
kanal('gunlukAktar', (dosyalar, secenekler) => gunlukAktar(dosyalar, secenekler));

kanal('excelDisaAktar', async (ay) => {
  const r = await dialog.showSaveDialog(pencere, {
    title: 'Ay tablosunu kaydet',
    defaultPath: `Tablo-${ay}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (r.canceled) return null;
  await aylikDisaAktar(ay, r.filePath);
  return r.filePath;
});

kanal('klasorAc', (dosya) => { shell.showItemInFolder(dosya); return true; });
kanal('surum', () => ({
  surum: app.getVersion(),
  vt: db.ozet().yol,
  tasinabilir: !!process.env.PORTABLE_EXECUTABLE_DIR,
}));
kanal('guncellemeKontrol', () => guncellemeKontrol());
