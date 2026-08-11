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
let dbHatasi = null;

app.setName('report-desk');

const VERI_DOSYASI = () => path.join(app.getPath('userData'), 'veri.sqlite');
const GUNLUK_DOSYASI = () => path.join(app.getPath('userData'), 'baslangic.log');

function kayit(mesaj) {
  const satir = `${new Date().toISOString()}  ${mesaj}`;
  try {
    fs.mkdirSync(path.dirname(GUNLUK_DOSYASI()), { recursive: true });
    fs.appendFileSync(GUNLUK_DOSYASI(), satir + '\n');
  } catch { }
  console.log(satir);
}

function hataYaz(nerede, hata) {
  const metin = hata && hata.stack ? hata.stack : String(hata);
  kayit(`HATA ${nerede}: ${metin}`);
  return metin;
}

process.on('uncaughtException', (e) => {
  const metin = hataYaz('uncaughtException', e);
  try {
    dialog.showErrorBox('Rapor Masası — beklenmeyen hata',
      `${metin}\n\nAyrıntı: ${GUNLUK_DOSYASI()}`);
  } catch { }
});
process.on('unhandledRejection', (e) => hataYaz('unhandledRejection', e));

if (!app.requestSingleInstanceLock()) {
  kayit('Zaten çalışan bir kopya var, bu kopya kapatılıyor.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (pencere && !pencere.isDestroyed()) {
      if (pencere.isMinimized()) pencere.restore();
      pencere.show();
      pencere.focus();
    }
  });
}

function pencereOlustur() {
  kayit('Pencere oluşturuluyor');
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

  let gosterildi = false;
  const goster = (neden) => {
    if (gosterildi || !pencere || pencere.isDestroyed()) return;
    gosterildi = true;
    kayit(`Pencere gösteriliyor (${neden})`);
    pencere.show();
  };

  pencere.once('ready-to-show', () => goster('ready-to-show'));
  pencere.webContents.once('did-finish-load', () => goster('did-finish-load'));
  setTimeout(() => goster('zaman aşımı'), 4000);

  pencere.webContents.on('did-fail-load', (_o, kod, aciklama, url) => {
    hataYaz('did-fail-load', `${kod} ${aciklama} ${url}`);
    goster('did-fail-load');
  });
  pencere.webContents.on('render-process-gone', (_o, ayrinti) => {
    hataYaz('render-process-gone', JSON.stringify(ayrinti));
    try {
      dialog.showErrorBox('Rapor Masası — arayüz çöktü',
        `Sebep: ${ayrinti.reason}\n\nAyrıntı: ${GUNLUK_DOSYASI()}`);
    } catch { }
  });
  pencere.webContents.on('preload-error', (_o, yol, hata) => hataYaz('preload', `${yol} ${hata}`));
  pencere.webContents.on('console-message', (_o, seviye, mesaj, satir, kaynak) => {
    if (seviye >= 2) kayit(`[arayüz] ${mesaj} (${kaynak}:${satir})`);
    else if (!app.isPackaged) console.log(`[renderer] ${mesaj}`);
  });

  pencere.loadFile(path.join(__dirname, '../renderer/index.html'))
    .catch((e) => { hataYaz('loadFile', e); goster('loadFile hatası'); });

  if (process.env.UI_TEST) {
    pencere.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const betik = process.env.UI_TEST !== '1'
          ? process.env.UI_TEST
          : path.join(__dirname, '../../test/dom-kontrol.js');
        const js = fs.readFileSync(betik, 'utf8');
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

function veritabaniniAc() {
  try {
    db.ac(VERI_DOSYASI());
    kayit(`Veritabanı açıldı: ${VERI_DOSYASI()}`);
    dbHatasi = null;
  } catch (e) {
    dbHatasi = hataYaz('veritabanı', e);
  }
}

app.whenReady().then(() => {
  kayit(`--- Başlangıç · sürüm ${app.getVersion()} · ${process.platform} ---`);
  pencereOlustur();
  veritabaniniAc();
  try {
    guncellemeyiKur(() => pencere);
  } catch (e) {
    hataYaz('güncelleme kurulumu', e);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) pencereOlustur();
  });
}).catch((e) => {
  const metin = hataYaz('whenReady', e);
  try {
    dialog.showErrorBox('Rapor Masası açılamadı', `${metin}\n\nAyrıntı: ${GUNLUK_DOSYASI()}`);
  } catch { }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function kanal(ad, fn, vtGerekmez = false) {
  ipcMain.handle(ad, async (_olay, ...args) => {
    if (dbHatasi && !vtGerekmez) return { ok: false, hata: dbHatasi, vtHatasi: true };
    try {
      return { ok: true, veri: await fn(...args) };
    } catch (hata) {
      hataYaz(ad, hata);
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
  vt: dbHatasi ? VERI_DOSYASI() : db.ozet().yol,
  gunluk: GUNLUK_DOSYASI(),
  vtHatasi: dbHatasi,
  tasinabilir: !!process.env.PORTABLE_EXECUTABLE_DIR,
}), true);

kanal('vtDurum', () => ({ hata: dbHatasi, yol: VERI_DOSYASI(), gunluk: GUNLUK_DOSYASI() }), true);

kanal('vtOnar', () => {
  const kaynak = VERI_DOSYASI();
  if (fs.existsSync(kaynak)) {
    const damga = new Date().toISOString().replace(/[:.]/g, '-');
    const hedef = `${kaynak}.bozuk-${damga}`;
    fs.renameSync(kaynak, hedef);
    kayit(`Bozuk veritabanı bir kenara alındı: ${hedef}`);
  }
  for (const ek of ['-journal', '-wal', '-shm']) {
    const y = kaynak + ek;
    if (fs.existsSync(y)) fs.unlinkSync(y);
  }
  veritabaniniAc();
  if (dbHatasi) throw new Error(dbHatasi);
  return true;
}, true);

kanal('gunluguAc', () => { shell.showItemInFolder(GUNLUK_DOSYASI()); return true; }, true);
kanal('guncellemeKontrol', () => guncellemeKontrol());
