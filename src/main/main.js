// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const db = require('./db/db');
const { gecmisiAktar } = require('./import/gecmisAktar');
const { gunlukAktar } = require('./import/gunlukAktar');
const { aylikDisaAktar, gunlukDisaAktar, AY_ADLARI } = require('./export/excelDisaAktar');
const { vardiyaIceAktar } = require('./import/vardiyaAktar');
const { vardiyaDisaAktar } = require('./export/vardiyaDisaAktar');
const wa = require('./whatsapp/wa');
const komut = require('./whatsapp/komut');
const mgm = require('./hava/mgm');
const kilit = require('./kilit');
const ortak = require('./ortak');
const portal = require('./portal/portal');
const portalAyar = require('./portal/ayar');
const kasa = require('./portal/kasa');
const sahiplik = require('./whatsapp/sahiplik');
const senkron = require('./senkron/senkron');
const { guncellemeyiKur, guncellemeKontrol } = require('./updater');

let pencere = null;
let dbHatasi = null;
let dbTani = null;

app.setName('report-desk');

const VERI_DOSYASI = () => path.join(app.getPath('userData'), 'veri.sqlite');
const GUNLUK_DOSYASI = () => path.join(app.getPath('userData'), 'baslangic.log');
const PORTAL_KLASORU = () => path.join(app.getPath('userData'), 'portal-kayit');

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

function artikKilidiTemizle(dosyaYolu) {
  const kilit = dosyaYolu + '.lock';
  try {
    if (fs.existsSync(kilit)) {
      fs.rmSync(kilit, { recursive: true, force: true });
      kayit(`Artık kalmış kilit klasörü silindi: ${kilit}`);
      return true;
    }
  } catch (e) {
    hataYaz('kilit temizleme', e);
  }
  return false;
}

function tanila(dosyaYolu) {
  const klasor = path.dirname(dosyaYolu);
  const b = { yol: dosyaYolu, klasor, uzunluk: dosyaYolu.length, platform: process.platform };

  try {
    fs.mkdirSync(klasor, { recursive: true });
    b.klasorVar = true;
  } catch (e) {
    b.klasorVar = false;
    b.klasorHatasi = e.message;
  }

  try {
    b.dosyaBoyutu = fs.statSync(dosyaYolu).size;
  } catch {
    b.dosyaBoyutu = null;
  }

  b.kilitVar = fs.existsSync(dosyaYolu + '.lock');

  try {
    const deneme = path.join(klasor, 'yazma-testi.tmp');
    fs.writeFileSync(deneme, 'x');
    fs.unlinkSync(deneme);
    b.yazilabilir = true;
  } catch (e) {
    b.yazilabilir = false;
    b.yazmaHatasi = e.message;
  }

  try {
    const { Database } = require('node-sqlite3-wasm');
    const gecici = new Database(':memory:');
    gecici.run('CREATE TABLE t(a)');
    gecici.close();
    b.motorCalisiyor = true;
  } catch (e) {
    b.motorCalisiyor = false;
    b.motorHatasi = e.message;
  }

  return b;
}

function tesis(bilgi) {
  if (bilgi.kilitVar) {
    return 'Veri dosyasının yanında artık kalmış bir kilit klasörü var '
         + '(program daha önce zorla kapatılmış olabilir). "Onar" düğmesi bunu temizler; '
         + 'verileriniz silinmez.';
  }
  if (bilgi.motorCalisiyor === false) {
    return 'Veritabanı motoru (SQLite) yüklenemedi. Kurulum eksik ya da bir güvenlik '
         + 'yazılımı engelliyor olabilir. Programı kaldırıp yeniden kurmayı deneyin.';
  }
  if (bilgi.yazilabilir === false) {
    return 'Programın veri klasörüne yazma izni yok. Klasör: ' + bilgi.klasor;
  }
  if (bilgi.dosyaBoyutu === 0) {
    return 'Veri dosyası boş (0 bayt) — büyük olasılıkla önceki bir kapanmada bozulmuş. '
         + '"Onar" düğmesi dosyayı kenara alıp yenisini kurar.';
  }
  if (bilgi.dosyaBoyutu > 0) {
    return 'Veri dosyası var ama okunamıyor; içeriği bozulmuş olabilir. '
         + '"Onar" düğmesi dosyayı kenara alıp yenisini kurar, eski dosya silinmez.';
  }
  return 'Veri dosyası oluşturulamadı.';
}

function veritabaniniAc() {
  const yedekKlasor = path.join(app.getPath('documents'), 'report-desk');
  const yollar = [VERI_DOSYASI(), path.join(yedekKlasor, 'veri.sqlite')];

  let ilkHata = null;
  let ilkBilgi = null;

  for (const y of yollar) {
    try {
      artikKilidiTemizle(y);
      db.ac(y);
      kayit(`Veritabanı açıldı: ${y}`);
      dbHatasi = null;
      dbTani = null;
      return;
    } catch (e) {
      const metin = hataYaz(`veritabanı (${y})`, e);
      const bilgi = tanila(y);
      kayit('Teşhis: ' + JSON.stringify(bilgi));
      if (!ilkHata) { ilkHata = metin; ilkBilgi = bilgi; }
      if (bilgi.motorCalisiyor !== false && bilgi.yazilabilir !== false) break;
    }
  }

  dbHatasi = ilkHata;
  dbTani = { ...ilkBilgi, tesis: tesis(ilkBilgi || {}) };
}

app.whenReady().then(() => {
  kayit(`--- Başlangıç · sürüm ${app.getVersion()} · ${process.platform} ---`);
  ortak.kur(app.getPath('userData'));
  pencereOlustur();
  veritabaniniAc();
  zamanlayiciyiKur();
  try {
    guncellemeyiKur(() => pencere);
  } catch (e) {
    hataYaz('güncelleme kurulumu', e);
  }
  try {
    kilit.kur(db, kayit).catch((e) => hataYaz('uzak durum', e));
  } catch (e) {
    hataYaz('uzak durum kurulumu', e);
  }
  try {
    kasa.kur(() => ortakAnahtar());
    if (!dbHatasi) hesaplariOrtaklastir();
  } catch (e) {
    hataYaz('şifre kasası', e);
  }
  try {
    const klasor = waKur();
    kayit(`WhatsApp oturum klasörü: ${klasor}${waOrtakMi() ? ' (ortak)' : ''}`);
    if (wa.oturumVarMi()) {
      const d = waSahiplikDurumu();
      if (!d.ortakMi || d.bos || d.benMiyim) {
        waBaslatKontrollu().catch((e) => hataYaz('whatsapp başlangıç', e));
      } else {
        kayit(`WhatsApp başlatılmadı: oturum "${d.sahip}" bilgisayarında açık görünüyor.`);
      }
    }
  } catch (e) {
    hataYaz('whatsapp kurulumu', e);
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

function izinliNumaralar() {
  try {
    const d = db.ortakAyarOku('waIzinliNumaralar');
    if (d != null && String(d).trim()) return String(d);
  } catch { }
  return komut.VARSAYILAN_NUMARALAR;
}

const ANAHTAR_DOSYASI = 'anahtar.key';
let anahtarOnbellek = null;

function ortakAnahtar() {
  const dosya = ortak.ortakDosya();
  if (!dosya) { anahtarOnbellek = null; return null; }
  const yol = path.join(path.dirname(dosya), ANAHTAR_DOSYASI);
  if (anahtarOnbellek && anahtarOnbellek.yol === yol) return anahtarOnbellek.anahtar;
  try {
    let ham;
    if (fs.existsSync(yol)) {
      ham = Buffer.from(String(fs.readFileSync(yol, 'utf8')).trim(), 'base64');
    } else {
      ham = require('node:crypto').randomBytes(32);
      fs.mkdirSync(path.dirname(yol), { recursive: true });
      fs.writeFileSync(yol, ham.toString('base64'), 'utf8');
      kayit(`Ortak şifre anahtarı oluşturuldu: ${yol}`);
    }
    if (ham.length !== 32) return null;
    anahtarOnbellek = { yol, anahtar: ham };
    return ham;
  } catch (e) {
    hataYaz('ortak anahtar', e);
    return null;
  }
}

function hesaplariOrtaklastir() {
  if (!ortakAnahtar()) return 0;
  let sayi = 0;
  try {
    for (const h of db.raw.all(
      'SELECT id, numara, sifre, sifreli FROM portal_hesap WHERE sifreli = :y',
      { ':y': kasa.YEREL }
    )) {
      let acik;
      try { acik = kasa.coz(h.sifre, h.sifreli); } catch { continue; }
      const yeni = kasa.sifrele(acik);
      if (yeni.sifreli !== kasa.ORTAK) continue;
      db.raw.run(
        `UPDATE portal_hesap SET sifre = :s, sifreli = :sl, guncelleme = datetime('now')
         WHERE id = :i`,
        { ':s': yeni.deger, ':sl': yeni.sifreli, ':i': h.id }
      );
      sayi++;
    }
    if (sayi) kayit(`${sayi} portal şifresi ortak anahtarla yeniden şifrelendi.`);
  } catch (e) {
    hataYaz('şifre ortaklaştırma', e);
  }
  return sayi;
}

function waOrtakMi() {
  try {
    return db.ortakAyarOku('waOrtakOturum') === '1' && !!ortak.ortakDosya();
  } catch {
    return false;
  }
}

function waOturumKlasoru() {
  if (waOrtakMi()) {
    return path.join(path.dirname(ortak.ortakDosya()), 'whatsapp-oturum');
  }
  return path.join(app.getPath('userData'), 'whatsapp-oturum');
}

let waKalpAtisi = null;

function waSahiplikDurumu() {
  const ortakMi = waOrtakMi();
  const klasor = waOturumKlasoru();
  const ben = ortak.makineAdi();
  return {
    ortakMi,
    klasor,
    makine: ben,
    ortakKlasorVar: !!ortak.ortakDosya(),
    ...(ortakMi ? sahiplik.durum(klasor, ben) : { sahip: ben, benMiyim: true, taze: true, bos: false }),
  };
}

function waKalbiDurdur() {
  clearInterval(waKalpAtisi);
  waKalpAtisi = null;
}

function waKalbiBaslat() {
  waKalbiDurdur();
  if (!waOrtakMi()) return;
  waKalpAtisi = setInterval(() => {
    try {
      if (wa.durumAl().asama === 'bagli') sahiplik.tazele(waOturumKlasoru(), ortak.makineAdi());
    } catch { }
  }, 60000);
}

function waKur() {
  const klasor = waOturumKlasoru();
  wa.kur(
    klasor,
    (d) => {
      if (pencere && !pencere.isDestroyed()) {
        pencere.webContents.send('waDurum', { ...d, sahiplik: waSahiplikDurumu() });
      }
    },
    komut.olustur({
      izinliler: () => izinliNumaralar(),
      log: kayit,
      ekIzin: (numara) => portalHesabiVar(numara),
      servisler: { rapor: (b) => waRaporKomutu(b) },
    }),
    kayit
  );
  return klasor;
}

async function waBaslatKontrollu(zorla = false) {
  if (waOrtakMi()) {
    const ben = ortak.makineAdi();
    const klasor = waOturumKlasoru();
    const d = sahiplik.durum(klasor, ben);
    if (!zorla && d.taze && !d.benMiyim) {
      throw new Error(`WhatsApp oturumu şu an "${d.sahip}" bilgisayarında açık `
        + `(${d.dakika} dakika önce bildirdi). Aynı oturuma iki bilgisayardan bağlanmak `
        + 'oturumu düşürür. Oradan kapatın ya da "Bu bilgisayara al" deyin.');
    }
    sahiplik.al(klasor, ben);
  }
  try {
    const sonuc = await wa.baslat();
    waKalbiBaslat();
    return sonuc;
  } catch (e) {
    if (waOrtakMi()) sahiplik.birak(waOturumKlasoru(), ortak.makineAdi());
    throw e;
  }
}

app.on('before-quit', () => {
  waKalbiDurdur();
  try {
    if (waOrtakMi() && wa.durumAl().asama !== 'kapali') {
      sahiplik.birak(waOturumKlasoru(), ortak.makineAdi());
    }
  } catch { }
});

function portalHesabiVar(numara) {
  try {
    const h = db.portalHesap(numara);
    return !!(h && h.aktif && h.kullanici && h.sifre);
  } catch {
    return false;
  }
}

function portalAyarlari() {
  return portalAyar.oku(db);
}

function portalIlerlemeYolla(o) {
  if (pencere && !pencere.isDestroyed()) pencere.webContents.send('portalIlerleme', o);
}

function hesabiHazirla(numara) {
  const kayit = db.portalHesap(numara);
  if (!kayit) throw new Error('Bu numara için portal hesabı tanımlı değil.');
  if (!kayit.aktif) throw new Error('Bu numaranın portal hesabı kapalı.');
  if (!kayit.kullanici) throw new Error('Bu numara için kullanıcı adı girilmemiş.');
  let sifre;
  try {
    sifre = kasa.coz(kayit.sifre, kayit.sifreli);
  } catch {
    throw new Error('Kayıtlı şifre bu bilgisayarda çözülemedi. Ayarlar\'dan yeniden girin.');
  }
  if (!sifre) throw new Error('Bu numara için şifre girilmemiş.');
  return { numara: kayit.numara, ad: kayit.ad, kullanici: kayit.kullanici, sifre };
}

async function portaliCalistir({ numara, onayKodu, ilerleme }) {
  const ayarlar = portalAyarlari();
  const eksik = portalAyar.dogrula(ayarlar);
  if (eksik.length) throw new Error(`Portal ayarları eksik: ${eksik.join(', ')}.`);
  const hesap = hesabiHazirla(numara);

  return portal.calistir({
    hesap,
    ayarlar,
    kokKlasor: PORTAL_KLASORU(),
    onayKodu,
    log: kayit,
    ilerleme: (o) => {
      portalIlerlemeYolla(o);
      if (ilerleme) { try { ilerleme(o); } catch { } }
    },
  });
}

let uiOnayBekleyen = null;

function uiOnayIste(deneme, sonHata) {
  return new Promise((coz, red) => {
    if (uiOnayBekleyen) {
      clearTimeout(uiOnayBekleyen.sayac);
      uiOnayBekleyen.red(new Error('Yeni kod istendi.'));
    }
    const sure = (portalAyarlari().onaySn || 180) * 1000;
    const sayac = setTimeout(() => {
      uiOnayBekleyen = null;
      portalIlerlemeYolla({ tur: 'onay-bitti' });
      red(new Error('Onay kodu girilmedi, süre doldu.'));
    }, sure);
    uiOnayBekleyen = { coz, red, sayac };
    portalIlerlemeYolla({ tur: 'onay-istendi', deneme, sonHata: sonHata || null, saniye: sure / 1000 });
  });
}

async function waRaporKomutu(b) {
  if (portal.durumAl().calisiyor) return 'Portal işlemi hâlihazırda çalışıyor, bitince yeniden yazın.';

  await b.gonder('Portala giriliyor…');
  const ayarlar = portalAyarlari();
  const haber = (metin) => { b.gonder(metin).catch(() => { }); };

  const sonuc = await portaliCalistir({
    numara: b.gonderen,
    onayKodu: async (deneme, sonHata) => {
      const soru = (sonHata ? `${sonHata}\n\n` : '')
        + 'Size gelen onay kodunu yazıp gönderin.'
        + (deneme > 1 ? ` (${deneme}. deneme)` : '');
      return b.sor(soru, (ayarlar.onaySn || 180) * 1000);
    },
    ilerleme: (o) => {
      if (o.kod === 'rapor-kaydet' && o.durum === 'bitti') {
        haber(`Rapor kuyruğa alındı. Hazırlanması bekleniyor — her ${ayarlar.yenilemeSn} `
          + `saniyede bir bakılacak (en fazla ${ayarlar.beklemeDk} dakika).`);
      }
    },
  });

  db.logYaz(null, 'portal', `WhatsApp isteği (${b.gonderen}) → ${sonuc.dosyaAdi || 'dosya yok'}`);

  const bilgi = `Tarih: ${sonuc.aralik.bas} – ${sonuc.aralik.son} (${sonuc.aralik.saat})`;
  if (sonuc.dosya) {
    try {
      await wa.belgeGonder(b.sohbet, sonuc.dosya, sonuc.dosyaAdi, bilgi);
      return null;
    } catch (e) {
      kayit(`Rapor dosyası WhatsApp'tan gönderilemedi: ${e.message}`);
      return `Rapor indirildi ama dosya gönderilemedi: ${e.message}\n\n`
        + `Dosya: ${sonuc.dosyaAdi || '-'}\n${bilgi}\nKlasör: ${sonuc.klasor}`;
    }
  }
  return `Rapor indirilemedi — dosya oluşmadı.\n${bilgi}\nKlasör: ${sonuc.klasor}`;
}

const KILITSIZ = new Set([
  'surum', 'kilitDurum', 'panoyaKopyala', 'gunluguAc', 'klasorAc',
  'ortakDurum', 'ortakSec', 'ortakKaldir', 'ortakAralik', 'simdiEsitle',
]);

function kanal(ad, fn, vtGerekmez = false) {
  ipcMain.handle(ad, async (_olay, ...args) => {
    if (!KILITSIZ.has(ad)) {
      const k = kilit.durumAl();
      if (k.kilitli) return { ok: false, kilitli: true, hata: k.mesaj || 'Program kullanıma kapatıldı.' };
    }
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

let esitlemeCalisiyor = false;
let esitlemeSayaci = null;

function ortakDurum() {
  const dosya = ortak.ortakDosya();
  return {
    dosya,
    ortakMi: !!dosya,
    erisilebilir: dosya ? fs.existsSync(path.dirname(dosya)) : false,
    aralikDk: ortak.aralikDk(),
    araliklar: ortak.ARALIKLAR,
    makine: ortak.makineAdi(),
    son: ortak.sonEsitleme(),
    calisiyor: esitlemeCalisiyor,
    kimler: dosya ? ortak.kimler(dosya) : [],
  };
}

function esitlemeyiCalistir(elle = false) {
  const dosya = ortak.ortakDosya();
  if (!dosya) throw new Error('Ortak klasör seçilmemiş.');
  if (esitlemeCalisiyor) return ortak.sonEsitleme();
  if (dbHatasi) throw new Error('Yerel veritabanı açık değil.');

  esitlemeCalisiyor = true;
  const basladi = Date.now();
  let baglanti = null;
  try {
    baglanti = db.baglantiAc(dosya);
    const sayac = senkron.esitle(db.raw, baglanti.db);
    const kayitNesnesi = {
      zaman: new Date().toISOString(),
      sureMs: Date.now() - basladi,
      elle,
      basarili: true,
      ...sayac,
    };
    ortak.sonEsitlemeYaz(kayitNesnesi);
    ortak.varlikBildir(dosya, app.getVersion());
    try {
      if (wa.durumAl().asama === 'kapali' && wa.durumAl().yol !== waOturumKlasoru()) waKur();
    } catch { }
    kayit(`Eşitleme tamam (${kayitNesnesi.sureMs} ms): gönderilen ${sayac.gonderilen}, `
      + `alınan ${sayac.alinan}, silinen ${sayac.yerelSilinen + sayac.ortakSilinen}`);
    if (pencere && !pencere.isDestroyed()) {
      pencere.webContents.send('esitlemeBitti', { ...kayitNesnesi, durum: ortakDurum() });
    }
    return kayitNesnesi;
  } catch (e) {
    const kayitNesnesi = {
      zaman: new Date().toISOString(),
      sureMs: Date.now() - basladi,
      elle,
      basarili: false,
      hata: e.message,
    };
    ortak.sonEsitlemeYaz(kayitNesnesi);
    hataYaz('eşitleme', e);
    if (pencere && !pencere.isDestroyed()) {
      pencere.webContents.send('esitlemeBitti', { ...kayitNesnesi, durum: ortakDurum() });
    }
    throw e;
  } finally {
    if (baglanti) baglanti.kapat();
    esitlemeCalisiyor = false;
  }
}

function zamanlayiciyiKur() {
  clearInterval(esitlemeSayaci);
  if (!ortak.ortakDosya()) return;
  esitlemeSayaci = setInterval(() => {
    try { esitlemeyiCalistir(false); } catch { }
  }, ortak.aralikDk() * 60000);
}

kanal('ortakDurum', () => ortakDurum(), true);

kanal('ortakSec', async () => {
  const r = await dialog.showOpenDialog(pencere, {
    title: 'Ortak klasörü seçin',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (r.canceled) return null;
  const dosya = path.join(r.filePaths[0], 'veri-ortak.sqlite');
  ortak.ortakAyarla(dosya);
  anahtarOnbellek = null;
  kayit(`Ortak klasör seçildi: ${dosya}`);
  if (!dbHatasi) hesaplariOrtaklastir();
  zamanlayiciyiKur();
  esitlemeyiCalistir(true);
  return ortakDurum();
}, true);

kanal('ortakKaldir', () => {
  ortak.ortakKaldir();
  anahtarOnbellek = null;
  clearInterval(esitlemeSayaci);
  if (!dbHatasi) {
    try {
      db.ortakAyarYaz('waOrtakOturum', '0');
      waKalbiDurdur();
      waKur();
    } catch (e) { hataYaz('ortak oturum kapatma', e); }
  }
  kayit('Ortak klasör bağlantısı kaldırıldı.');
  return ortakDurum();
}, true);

kanal('ortakAralik', (dk) => {
  ortak.aralikYaz(dk);
  zamanlayiciyiKur();
  kayit(`Eşitleme aralığı: ${dk} dakika`);
  return ortakDurum();
}, true);

kanal('simdiEsitle', () => esitlemeyiCalistir(true), true);

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

kanal('gunExcelDisaAktar', async (tarih) => {
  const [y, a, g] = tarih.split('-');
  const r = await dialog.showSaveDialog(pencere, {
    title: 'Gün tablosunu kaydet',
    defaultPath: `Tablo-${g}.${a}.${y}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (r.canceled) return null;
  await gunlukDisaAktar(tarih, r.filePath);
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

kanal('vtDurum', () => ({
  hata: dbHatasi,
  tani: dbTani,
  yol: db.yol() || VERI_DOSYASI(),
  gunluk: GUNLUK_DOSYASI(),
  surum: app.getVersion(),
}), true);

kanal('panoyaKopyala', (metin) => {
  require('electron').clipboard.writeText(String(metin));
  return true;
}, true);

kanal('vtOnar', () => {
  const kaynak = VERI_DOSYASI();

  const kilitVardi = artikKilidiTemizle(kaynak);
  if (kilitVardi) {
    veritabaniniAc();
    if (!dbHatasi) return { yontem: 'kilit', veriKorundu: true };
  }

  const bosDosya = fs.existsSync(kaynak) && fs.statSync(kaynak).size === 0;
  if (fs.existsSync(kaynak) && !bosDosya) {
    const damga = new Date().toISOString().replace(/[:.]/g, '-');
    const hedef = `${kaynak}.bozuk-${damga}`;
    fs.renameSync(kaynak, hedef);
    kayit(`Bozuk veritabanı bir kenara alındı: ${hedef}`);
  } else if (bosDosya) {
    fs.unlinkSync(kaynak);
    kayit('Boş veri dosyası silindi.');
  }
  for (const ek of ['-journal', '-wal', '-shm']) {
    const y = kaynak + ek;
    if (fs.existsSync(y)) fs.unlinkSync(y);
  }

  veritabaniniAc();
  if (dbHatasi) throw new Error(dbHatasi);
  return { yontem: bosDosya ? 'bos-dosya' : 'yeniden-kurulum', veriKorundu: bosDosya };
}, true);

kanal('gunluguAc', () => { shell.showItemInFolder(GUNLUK_DOSYASI()); return true; }, true);

kanal('hepsiniSifirla', async () => {
  const secim = process.env.UI_TEST ? { response: 1 } : await dialog.showMessageBox(pencere, {
    type: 'warning',
    buttons: ['Vazgeç', 'Her şeyi sıfırla'],
    defaultId: 0,
    cancelId: 0,
    title: 'Her şeyi sıfırla',
    message: 'Tüm bilgiler silinecek',
    detail: 'Bütün günler, işaretlemeler, işletme listesi, eşleştirme kuralları, öneriler '
      + 've işlem günlüğü silinir. Program ilk kurulduğu hâline döner.\n\n'
      + 'Silmeden önce mevcut veri dosyasının bir yedeği aynı klasöre bırakılır.',
    noLink: true,
  });
  if (secim.response !== 1) return { iptal: true };

  db.kapat();
  const kaynak = VERI_DOSYASI();
  artikKilidiTemizle(kaynak);
  let yedek = null;
  if (fs.existsSync(kaynak)) {
    const damga = new Date().toISOString().replace(/[:.]/g, '-');
    yedek = `${kaynak}.yedek-${damga}`;
    fs.renameSync(kaynak, yedek);
  }
  for (const ek of ['-journal', '-wal', '-shm']) {
    const y = kaynak + ek;
    if (fs.existsSync(y)) fs.unlinkSync(y);
  }

  veritabaniniAc();
  if (dbHatasi) throw new Error(dbHatasi);

  try {
    const { session } = require('electron');
    await session.defaultSession.clearStorageData();
    await session.defaultSession.clearCache();
  } catch (e) {
    hataYaz('önbellek temizleme', e);
  }

  kayit(`Her şey sıfırlandı. Yedek: ${yedek || '(dosya yoktu)'}`);
  return { iptal: false, yedek };
}, true);
kanal('vardiyaEkipler', () => db.vardiyaEkipler());
kanal('vardiyaEkipEkle', (ad, v) => { db.vardiyaEkipEkle(ad, v); return db.vardiyaEkipler(); });
kanal('vardiyaEkipGuncelle', (id, p) => db.vardiyaEkipGuncelle(id, p));
kanal('vardiyaEkipSil', (id) => { db.vardiyaEkipSil(id); return db.vardiyaEkipler(); });
kanal('vardiyaPersonelEkle', (ekipId, ad) => { db.vardiyaPersonelEkle(ekipId, ad); return db.vardiyaPersoneller(null); });
kanal('vardiyaPersonelSil', (id) => { db.vardiyaPersonelSil(id); return db.vardiyaPersoneller(null); });
kanal('vardiyaPersonelTasi', (id, yon) => { db.vardiyaPersonelTasi(id, yon); return db.vardiyaPersoneller(null); });
kanal('vardiyaAyVerisi', (ay) => db.vardiyaAyVerisi(ay));
kanal('vardiyaAylar', () => db.vardiyaAylar());
kanal('vardiyaYaz', (ay, pid, gun, kod) => db.vardiyaYaz(ay, pid, gun, kod));
kanal('vardiyaAySil', (ay) => { db.vardiyaAySil(ay); return true; });
kanal('vardiyaAktar', (dosyalar, s) => vardiyaIceAktar(dosyalar, s));

kanal('vardiyaExcel', async (ay) => {
  const r = await dialog.showSaveDialog(pencere, {
    title: 'Vardiya tablosunu kaydet',
    defaultPath: `Vardiya-${ay}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (r.canceled) return null;
  await vardiyaDisaAktar(ay, r.filePath);
  return r.filePath;
});

kanal('waDurum', () => ({ ...wa.durumAl(), sahiplik: waSahiplikDurumu() }), true);
kanal('waBaslat', (zorla) => waBaslatKontrollu(!!zorla), true);
kanal('waDurdur', async () => {
  waKalbiDurdur();
  const d = await wa.durdur();
  if (waOrtakMi()) sahiplik.birak(waOturumKlasoru(), ortak.makineAdi());
  return d;
}, true);
kanal('waCikis', async () => {
  waKalbiDurdur();
  const d = await wa.cikisYap();
  if (waOrtakMi()) sahiplik.birak(waOturumKlasoru(), ortak.makineAdi());
  return d;
}, true);

kanal('waOrtakOturum', (acik) => {
  if (acik && !ortak.ortakDosya()) throw new Error('Önce ortak klasör seçilmeli.');
  if (wa.durumAl().asama !== 'kapali') {
    throw new Error('Önce WhatsApp bağlantısını kesin, sonra bu ayarı değiştirin.');
  }
  db.ortakAyarYaz('waOrtakOturum', acik ? '1' : '0');
  waKalbiDurdur();
  const klasor = waKur();
  kayit(`WhatsApp oturum klasörü değişti: ${klasor}`);
  return waSahiplikDurumu();
});

kanal('waIzinliler', () => izinliNumaralar());
kanal('waIzinlileriYaz', (metin) => {
  db.ortakAyarYaz('waIzinliNumaralar', String(metin || ''));
  return izinliNumaralar();
});
kanal('havaDenemesi', () => mgm.havaMetni());

kanal('waGruplar', () => db.waGruplar());
kanal('waGruplariTazele', async () => db.waGruplariYaz(await wa.gruplariGetir()));
kanal('waGrupSec', (jid, secili) => db.waGrupSec(jid, secili));

kanal('waGonder', async (istek) => {
  if (wa.durumAl().asama !== 'bagli') throw new Error('WhatsApp bağlı değil.');
  const secili = db.waSeciliGruplar();
  if (!secili.length) throw new Error('Hiç grup seçilmemiş.');

  const klasor = fs.mkdtempSync(path.join(app.getPath('temp'), 'gonder-'));
  let dosya, ad, aciklama;

  if (istek.tur === 'vardiya') {
    const [yil, aySayi] = istek.ay.split('-').map(Number);
    ad = `Vardiya-${istek.ay}.xlsx`;
    dosya = path.join(klasor, ad);
    await vardiyaDisaAktar(istek.ay, dosya);
    aciklama = `${AY_ADLARI[aySayi - 1]} ${yil} vardiya çizelgesi`;
  } else if (istek.tur === 'icmal-ay') {
    const [yil, aySayi] = istek.ay.split('-').map(Number);
    ad = `Tablo-${istek.ay}.xlsx`;
    dosya = path.join(klasor, ad);
    await aylikDisaAktar(istek.ay, dosya);
    aciklama = `${AY_ADLARI[aySayi - 1]} ${yil} tablosu`;
  } else {
    const [y, a, g] = istek.tarih.split('-');
    ad = `Tablo-${g}.${a}.${y}.xlsx`;
    dosya = path.join(klasor, ad);
    await gunlukDisaAktar(istek.tarih, dosya);
    aciklama = `${g}.${a}.${y} günlük tablo`;
  }

  if (istek.not && istek.not.trim()) aciklama += `\n\n${istek.not.trim()}`;

  const sonuc = await wa.topluBelgeGonder(
    secili.map((x) => x.jid), dosya, ad, aciklama,
    (p) => {
      if (pencere && !pencere.isDestroyed()) pencere.webContents.send('waGonderim', p);
    }
  );

  try { fs.rmSync(klasor, { recursive: true, force: true }); } catch { }

  const adlar = new Map(secili.map((x) => [x.jid, x.ad]));
  const ayrinti = sonuc.map((r) => ({ ...r, ad: adlar.get(r.jid) || r.jid }));
  db.logYaz(istek.tarih || istek.ay, 'whatsapp-gonderim',
    `${ad} → ${ayrinti.filter((r) => r.ok).length}/${ayrinti.length} grup`);
  return { dosya: ad, ayrinti };
});

kanal('portalAyar', () => ({
  ...portalAyarlari(),
  kasaVar: kasa.kullanilabilir(),
  ortakAnahtar: !!ortakAnahtar(),
  klasor: PORTAL_KLASORU(),
}));
kanal('portalAyarYaz', (gelen) => portalAyar.yaz(db, gelen || {}));
kanal('portalHesaplar', () => db.portalHesaplar());

kanal('portalHesapYaz', (gelen) => {
  const numara = komut.numaraDuzelt(gelen.numara);
  if (!numara) throw new Error('Geçerli bir numara yazın (ülke koduyla).');
  const alan = {
    id: gelen.id || null,
    numara,
    ad: gelen.ad,
    kullanici: (gelen.kullanici || '').trim(),
    aktif: gelen.aktif == null ? true : !!gelen.aktif,
  };
  if (gelen.sifre != null && gelen.sifre !== '') {
    const k = kasa.sifrele(gelen.sifre);
    alan.sifre = k.deger;
    alan.sifreli = k.sifreli;
  }
  return db.portalHesapYaz(alan);
});

kanal('portalHesapSil', (id) => db.portalHesapSil(id));
kanal('portalDurum', () => portal.durumAl(), true);
kanal('portalDurdur', () => portal.iptal(), true);

kanal('portalKlasorAc', () => {
  const kok = PORTAL_KLASORU();
  fs.mkdirSync(kok, { recursive: true });
  shell.openPath(kok);
  return kok;
}, true);

kanal('portalOnayVer', (kod) => {
  if (!uiOnayBekleyen) throw new Error('Şu an onay kodu beklenmiyor.');
  const b = uiOnayBekleyen;
  uiOnayBekleyen = null;
  clearTimeout(b.sayac);
  portalIlerlemeYolla({ tur: 'onay-bitti' });
  b.coz(String(kod || ''));
  return true;
}, true);

kanal('portalCalistir', async (numara) => {
  const sonuc = await portaliCalistir({ numara, onayKodu: uiOnayIste });
  db.logYaz(null, 'portal', `Elle çalıştırıldı (${numara}) → ${sonuc.dosyaAdi || 'dosya yok'}`);
  return sonuc;
});

kanal('kilitDurum', () => kilit.durumAl(), true);
kanal('kilitTazele', () => kilit.kontrolEt(), true);

kanal('guncellemeKontrol', () => guncellemeKontrol());
