// Hamza ALMALI

'use strict';

const { app } = require('electron');

let autoUpdater = null;
let pencereAl = () => null;
let sonDurum = { mesaj: 'Henüz kontrol edilmedi.' };

function gonder(veri) {
  sonDurum = veri;
  const p = pencereAl();
  if (p && !p.isDestroyed()) p.webContents.send('guncelleme', veri);
}

function guncellemeyiKur(pencereFn) {
  pencereAl = pencereFn;

  if (!app.isPackaged) {
    sonDurum = { mesaj: 'Geliştirme modunda güncelleme kontrolü yapılmaz.' };
    return;
  }

  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    sonDurum = {
      tasinabilir: true,
      mesaj: 'Taşınabilir sürüm otomatik güncellenmez. Yeni sürümü Releases sayfasından '
           + 'indirip eski dosyanın yerine koyun — verileriniz etkilenmez.',
    };
    return;
  }

  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch {
    sonDurum = { mesaj: 'Güncelleme modülü yüklenemedi.' };
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => gonder({ tur: 'kontrol', mesaj: 'Kontrol ediliyor…' }));
  autoUpdater.on('update-available', (b) =>
    gonder({ tur: 'var', surum: b.version, mesaj: `Yeni sürüm bulundu: ${b.version} — indiriliyor…` }));
  autoUpdater.on('update-not-available', () =>
    gonder({ tur: 'yok', mesaj: 'En güncel sürümü kullanıyorsunuz.' }));
  autoUpdater.on('download-progress', (p) =>
    gonder({ tur: 'iniyor', yuzde: Math.round(p.percent), mesaj: `İndiriliyor… %${Math.round(p.percent)}` }));
  autoUpdater.on('update-downloaded', (b) =>
    gonder({ tur: 'hazir', surum: b.version, mesaj: `${b.version} indirildi. Uygulama kapanınca kurulacak.` }));
  autoUpdater.on('error', (e) =>
    gonder({ tur: 'hata', mesaj: 'Güncelleme hatası: ' + (e == null ? '' : e.message || String(e)) }));

  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 8000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
}

async function guncellemeKontrol() {
  if (!autoUpdater) return sonDurum;
  try {
    await autoUpdater.checkForUpdates();
  } catch (e) {
    return { mesaj: 'Kontrol edilemedi: ' + (e.message || String(e)) };
  }
  return sonDurum;
}

module.exports = { guncellemeyiKur, guncellemeKontrol };
