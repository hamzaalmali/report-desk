// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { app } = require('electron');

const portal = require('../src/main/portal/portal');

const KULLANICI = 'deneme-kullanici';
const SIFRE = 'deneme-sifre-123';
const KOD = '654321';
const RAPOR = 'AYS Kesintiler Form Detay';

let gecti = 0;
let kaldi = 0;

function kontrol(ad, kosul, ayrinti = '') {
  if (kosul) { gecti++; console.log(`  ✓ ${ad}`); }
  else { kaldi++; console.log(`  ✗ ${ad}${ayrinti ? '  → ' + ayrinti : ''}`); }
}

const SAYFA = (baslik, govde) => `<!doctype html><html lang="tr"><head>
<meta charset="utf-8"><title>${baslik}</title></head><body>${govde}</body></html>`;

const GIRIS = SAYFA('Kullanici Girisi', `
  <h1>Giriş</h1>
  <form method="post" action="/Login.aspx">
    <input id="txtKullaniciAdi" name="k" />
    <input id="txtSifre" name="s" type="password" />
    <input id="btnGiris" type="submit" value="Giriş" />
  </form>`);

const ONAY = SAYFA('Onay Kodu', `
  <h1>Onay kodu</h1>
  <form method="post" action="/Onay.aspx">
    <input id="txtOnayKoduGiris" name="kod" />
    <input id="btnOnay" type="submit" value="Onayla" />
  </form>`);

const MENU_XPATH = '//*[@id="leftsidenav"]/li[6]';

const ANA = SAYFA('Ana Sayfa', `
  <form>
    <div>üst şerit</div>
    <div>ikinci şerit</div>
    <div><div><div><div>
      <ul id="leftsidenav">
        ${[1, 2, 3, 4, 5].map((n) => `<li class="sub1"><a href="javascript:void(0)"
          >Menü ${n}</a></li>`).join('')}
        <li class="sub1 t-indent" onclick="this.querySelector('ul').style.display='block'"
          >RAPORLAR<ul id="altmenu" style="display:none">
            <li><a class="mlink" href="/Rapor.aspx" target="content">Raporlar</a></li>
            <li><a class="mlink" href="/Kuyruk.aspx" target="content">Rapor Kuyruğu</a></li>
          </ul></li>
      </ul>
    </div></div></div></div>
    <iframe name="content" src="/bos.aspx" style="width:900px;height:500px"></iframe>
  </form>`);

const BOS = SAYFA('Bos', '<div>hoş geldiniz</div>');

const RAPOR_SAYFASI = SAYFA('Rapor Ekrani', `
  <h1>Rapor</h1>
  <div id="ctl00_ContentPlaceHolder1_cmbRaporlar">
    <input id="ctl00_ContentPlaceHolder1_cmbRaporlar_Input" readonly />
    <span id="ctl00_ContentPlaceHolder1_cmbRaporlar_Arrow">▾</span>
    <div id="ctl00_ContentPlaceHolder1_cmbRaporlar_DropDown" style="display:none">
      <ul>
        <li>Başka Bir Rapor</li>
        <li>${RAPOR}</li>
        <li>Üçüncü Rapor</li>
      </ul>
    </div>
  </div>
  <input id="ctl00_ContentPlaceHolder1_dateTimeBASTARIH_dateInput" />
  <input id="ctl00_ContentPlaceHolder1_dateTimeSONTARIH_dateInput" />
  <div id="ctl00_ContentPlaceHolder1_cmbSAAT">
    <input id="ctl00_ContentPlaceHolder1_cmbSAAT_Input" readonly />
    <span id="ctl00_ContentPlaceHolder1_cmbSAAT_Arrow">▾</span>
    <div id="ctl00_ContentPlaceHolder1_cmbSAAT_DropDown" style="display:none">
      <ul><li>00:00</li><li>01:00</li><li>02:00</li></ul>
    </div>
  </div>
  <input id="ctl00_ContentPlaceHolder1_btnRaporKaydet_input"
         type="button" value="Raporu Kaydet" />
  <script>
    function kur(id) {
      var acici = function () {
        document.getElementById(id + '_DropDown').style.display = 'block';
      };
      document.getElementById(id + '_Arrow').addEventListener('click', acici);
      document.getElementById(id + '_Input').addEventListener('click', acici);
      var liste = document.getElementById(id + '_DropDown');
      [].forEach.call(liste.querySelectorAll('li'), function (l) {
        l.addEventListener('click', function () {
          if (liste.style.display !== 'block') return;
          document.getElementById(id + '_Input').value = l.textContent.trim();
          liste.style.display = 'none';
        });
      });
    }
    kur('ctl00_ContentPlaceHolder1_cmbRaporlar');
    kur('ctl00_ContentPlaceHolder1_cmbSAAT');
    document.getElementById('ctl00_ContentPlaceHolder1_btnRaporKaydet_input')
      .addEventListener('click', function () {
        var b = document.getElementById('ctl00_ContentPlaceHolder1_dateTimeBASTARIH_dateInput').value;
        var s = document.getElementById('ctl00_ContentPlaceHolder1_dateTimeSONTARIH_dateInput').value;
        var r = document.getElementById('ctl00_ContentPlaceHolder1_cmbRaporlar_Input').value;
        var t = document.getElementById('ctl00_ContentPlaceHolder1_cmbSAAT_Input').value;
        window.location = '/kaydet?bas=' + encodeURIComponent(b) + '&son=' + encodeURIComponent(s)
          + '&rapor=' + encodeURIComponent(r) + '&saat=' + encodeURIComponent(t);
      });
  </script>`);

const HAZIR_YENILEME = 2;

const KUYRUK = (yenileme, silindi) => {
  const hazir = yenileme >= HAZIR_YENILEME;
  return SAYFA('Rapor Kuyrugu', `
  <h1>Rapor Kuyruğu</h1>
  <input id="ctl00_ContentPlaceHolder1_btnRaporKuyrukYenile_input"
         type="button" value="Yenile" />
  <table id="ctl00_ContentPlaceHolder1_grdRaporKuyruk"><tbody>
    ${silindi ? '' : `<tr>
      <td>AYS Kesintiler Form Detay</td>
      <td>${hazir ? 'Tamamlandı' : 'Hazırlanıyor'}</td>
      <td><input id="ctl00_ContentPlaceHolder1_grdRaporKuyruk_ctl00_ctl04_btnRaporIndir_input"
                 type="button" value="Rapor İndir" ${hazir ? '' : 'disabled'} />
          <input id="ctl00_ContentPlaceHolder1_grdRaporKuyruk_ctl00_ctl04_btnRaporSil_input"
                 type="button" value="Sil" /></td>
    </tr>`}
  </tbody></table>
  <script>
    var bagla = function (id, hedef) {
      var d = document.getElementById(id);
      if (d) d.addEventListener('click', function () { window.location = hedef; });
    };
    bagla('ctl00_ContentPlaceHolder1_btnRaporKuyrukYenile_input', '/Kuyruk.aspx');
    bagla('ctl00_ContentPlaceHolder1_grdRaporKuyruk_ctl00_ctl04_btnRaporIndir_input', '/indir');
    bagla('ctl00_ContentPlaceHolder1_grdRaporKuyruk_ctl00_ctl04_btnRaporSil_input', '/sil');
  </script>`);
};

function govdeOku(istek) {
  return new Promise((coz) => {
    let veri = '';
    istek.on('data', (p) => { veri += p; });
    istek.on('end', () => coz(new URLSearchParams(veri)));
  });
}

function sunucuKur(kayit) {
  return http.createServer(async (istek, yanit) => {
    const url = new URL(istek.url, 'http://127.0.0.1');
    const yolla = (govde, tur = 'text/html; charset=utf-8', ek = {}) => {
      yanit.writeHead(200, { 'Content-Type': tur, ...ek });
      yanit.end(govde);
    };

    if (url.pathname === '/Login.aspx' && istek.method === 'POST') {
      const f = await govdeOku(istek);
      kayit.giris = { k: f.get('k'), s: f.get('s') };
      if (f.get('k') === KULLANICI && f.get('s') === SIFRE) {
        yanit.writeHead(302, { Location: '/Onay.aspx' });
        return yanit.end();
      }
      return yolla(GIRIS);
    }
    if (url.pathname === '/Onay.aspx' && istek.method === 'POST') {
      const f = await govdeOku(istek);
      kayit.kod = f.get('kod');
      if (f.get('kod') === KOD) {
        yanit.writeHead(302, { Location: '/default.aspx' });
        return yanit.end();
      }
      return yolla(ONAY);
    }
    if (url.pathname === '/kaydet') {
      kayit.kaydet = Object.fromEntries(url.searchParams);
      kayit.yenileme = 0;
      return yolla(KUYRUK(0, false));
    }
    if (url.pathname === '/Kuyruk.aspx') {
      kayit.yenileme = (kayit.yenileme || 0) + 1;
      return yolla(KUYRUK(kayit.yenileme, kayit.silindi));
    }
    if (url.pathname === '/indir') {
      kayit.indirme = { yenileme: kayit.yenileme };
      return yolla('sahte-rapor-icerigi', 'application/octet-stream', {
        'Content-Disposition': 'attachment; filename="Kesintiler.xlsx"',
      });
    }
    if (url.pathname === '/sil') {
      kayit.silindi = true;
      kayit.olaylar.push('silme');
      return yolla(KUYRUK(kayit.yenileme, true));
    }
    if (url.pathname === '/Onay.aspx') return yolla(ONAY);
    if (url.pathname === '/default.aspx') return yolla(ANA);
    if (url.pathname === '/bos.aspx') return yolla(BOS);
    if (url.pathname === '/Rapor.aspx') return yolla(RAPOR_SAYFASI);
    return yolla(GIRIS);
  });
}

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const kayit = { olaylar: [] };
  const sunucu = sunucuKur(kayit);
  await new Promise((c) => sunucu.listen(0, '127.0.0.1', c));
  const kok = `http://127.0.0.1:${sunucu.address().port}`;
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-deneme-'));

  const gorunur = process.env.GORUNUR === '1';
  const onaySorulari = [];
  const adimlar = [];

  console.log(`\nSahte portal: ${kok}\nKayıt klasörü: ${klasor}\n`);
  console.log('Portal otomasyonu');

  let sonuc = null;
  let hata = null;
  try {
    sonuc = await portal.calistir({
      hesap: { numara: '905551112233', kullanici: KULLANICI, sifre: SIFRE },
      ayarlar: {
        girisUrl: `${kok}/Login.aspx`,
        anaUrl: `${kok}/default.aspx`,
        raporAdi: RAPOR,
        saat: '01:00',
        gunGeri: 1,
        onaySn: 30,
        yenilemeSn: 5,
        beklemeDk: 2,
        gorunur,
        kapat: true,
        menuXpath: MENU_XPATH,
        altMenuXpath: `${MENU_XPATH}/ul/li[1]/a`,
      },
      kokKlasor: klasor,
      onayKodu: async (deneme) => { onaySorulari.push(deneme); return KOD; },
      dosyaHazir: async (d) => {
        kayit.olaylar.push('gonderim');
        kayit.gonderilen = d.ad;
        return { ok: true };
      },
      ilerleme: (o) => { if (o.durum !== 'calisiyor') adimlar.push(o); },
      log: (m) => console.log('    · ' + m),
    });
  } catch (e) {
    hata = e;
  }

  if (hata) {
    kontrol('akış hatasız tamamlandı', false, hata.message);
  } else {
    kontrol('akış hatasız tamamlandı', true);
    kontrol('kullanıcı adı ve şifre siteye doğru gitti',
      kayit.giris && kayit.giris.k === KULLANICI && kayit.giris.s === SIFRE,
      JSON.stringify(kayit.giris));
    kontrol('onay kodu bir kez soruldu ve siteye yazıldı',
      onaySorulari.length === 1 && kayit.kod === KOD, `${onaySorulari.length} / ${kayit.kod}`);
    kontrol('rapor adı listeden seçildi',
      kayit.kaydet && kayit.kaydet.rapor === RAPOR, kayit.kaydet && kayit.kaydet.rapor);
    kontrol('saat kutusu doldu', kayit.kaydet && kayit.kaydet.saat === '01:00',
      kayit.kaydet && kayit.kaydet.saat);

    const bugun = new Date();
    const dun = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate() - 1);
    const bicim = (d) => `${String(d.getDate()).padStart(2, '0')}.`
      + `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    kontrol('başlangıç dün, bitiş bugün gitti',
      kayit.kaydet && kayit.kaydet.bas === bicim(dun) && kayit.kaydet.son === bicim(bugun),
      kayit.kaydet && `${kayit.kaydet.bas} → ${kayit.kaydet.son}`);

    kontrol('rapor hazır olana dek kuyruk yenilendi',
      kayit.yenileme === HAZIR_YENILEME, `${kayit.yenileme} yenileme`);
    kontrol('indirmeye ancak rapor hazır olunca basıldı',
      kayit.indirme && kayit.indirme.yenileme >= HAZIR_YENILEME,
      JSON.stringify(kayit.indirme));
    const kuyrukAdimi = adimlar.find((a) => a.kod === 'kuyruk');
    kontrol('kuyruk adımı bekleme sayısını ve satırı bildiriyor',
      !!kuyrukAdimi && kuyrukAdimi.sonuc.yenileme === HAZIR_YENILEME
      && /Tamamlandı/.test(kuyrukAdimi.sonuc.satir || '') && kuyrukAdimi.sonuc.hemenHazir === false,
      kuyrukAdimi && JSON.stringify(kuyrukAdimi.sonuc));

    kontrol('dosya önce gönderildi, sonra kuyruktan silindi',
      kayit.olaylar.join('>') === 'gonderim>silme' && kayit.gonderilen === 'Kesintiler.xlsx',
      `${kayit.olaylar.join('>')} / ${kayit.gonderilen}`);
    kontrol('silme adımı satırın kalktığını doğruluyor',
      !!sonuc.silme && sonuc.silme.silindi === true, JSON.stringify(sonuc.silme));

    kontrol('dosya indirilip klasöre kaydedildi',
      !!sonuc.dosya && fs.existsSync(sonuc.dosya)
      && fs.readFileSync(sonuc.dosya, 'utf8') === 'sahte-rapor-icerigi',
      sonuc.dosya);
    kontrol('indirilen dosya adı korundu', sonuc.dosyaAdi === 'Kesintiler.xlsx', sonuc.dosyaAdi);

    const dosyalar = fs.readdirSync(sonuc.klasor);
    const htmlSayisi = dosyalar.filter((d) => d.endsWith('.html')).length;
    const pngSayisi = dosyalar.filter((d) => d.endsWith('.png')).length;
    kontrol('her adımın HTML kaydı alındı', htmlSayisi >= 12, `${htmlSayisi} html`);
    kontrol('her adımın ekran görüntüsü alındı', pngSayisi === 12, `${pngSayisi} png`);
    kontrol('iframe içeriği ayrıca kaydedildi',
      dosyalar.some((d) => d.includes('--cerceve1.html')),
      dosyalar.filter((d) => d.endsWith('.html')).join(' '));
    kontrol('kayıt dosyaları sayfa adıyla adlandırıldı',
      dosyalar.some((d) => d.includes('Kullanici-Girisi'))
      && dosyalar.some((d) => d.includes('Ana-Sayfa')),
      dosyalar.join(' '));
    const menuAdimi = adimlar.find((a) => a.kod === 'raporlar-menu');
    kontrol('rapor ekranı iframe içinde bulundu',
      !!menuAdimi && menuAdimi.iz.cerceve >= 2 && /Rapor\.aspx$/.test(menuAdimi.sonuc.url || ''),
      menuAdimi && `${menuAdimi.iz.cerceve} çerçeve, ${menuAdimi.sonuc.url}`);
    kontrol('menü ve alt menü adlarından bulundu',
      !!menuAdimi && menuAdimi.sonuc.menu.yol === 'metin'
      && menuAdimi.sonuc.alt.yol === 'metin'
      && menuAdimi.sonuc.menu.metin === 'RAPORLAR'
      && menuAdimi.sonuc.alt.metin === 'Raporlar',
      menuAdimi && JSON.stringify({ m: menuAdimi.sonuc.menu, a: menuAdimi.sonuc.alt }));
    kontrol('özet dosyası yazıldı', dosyalar.includes('ozet.json'));

    const girisHtml = fs.readFileSync(
      path.join(sonuc.klasor, dosyalar.find((d) => d.startsWith('02-giris'))), 'utf8');
    kontrol('kayıtlarda şifre görünmüyor',
      !girisHtml.includes(SIFRE) && !girisHtml.includes(KULLANICI));

    kontrol('tüm adımlar bitti olarak işaretlendi',
      adimlar.length === 12 && adimlar.every((a) => a.durum === 'bitti'),
      adimlar.map((a) => `${a.kod}:${a.durum}`).join(' '));
    kontrol('iş bitince kilit kalkıyor', portal.durumAl().calisiyor === false);
  }

  console.log('\nHatada tarayıcı kapanıyor');
  {
    const { BrowserWindow } = require('electron');
    let hataMesaji = null;
    try {
      await portal.calistir({
        hesap: { numara: '905551112233', kullanici: KULLANICI, sifre: SIFRE },
        ayarlar: {
          girisUrl: 'http://127.0.0.1:1/Login.aspx',
          raporAdi: RAPOR,
          saat: '01:00',
          gunGeri: 1,
          gorunur,
          kapat: false,
        },
        kokKlasor: klasor,
        onayKodu: async () => KOD,
        log: () => { },
      });
    } catch (e) {
      hataMesaji = e.message;
    }
    kontrol('erişilemeyen adres hata veriyor', !!hataMesaji, String(hataMesaji));
    kontrol('"iş bitince kapansın" kapalıyken bile pencere kapandı',
      BrowserWindow.getAllWindows().length === 0,
      `${BrowserWindow.getAllWindows().length} pencere açık`);
    kontrol('hatadan sonra kilit kalkıyor', portal.durumAl().calisiyor === false);
  }

  console.log(`\n${gecti} geçti, ${kaldi} kaldı\n`);
  sunucu.close();
  if (!process.env.KALSIN) fs.rmSync(klasor, { recursive: true, force: true });
  app.exit(kaldi || hata ? 1 : 0);
});
