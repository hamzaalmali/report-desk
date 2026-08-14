// Hamza ALMALI

'use strict';

const api = window.api;

const IKON = {
  genel: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 9h8V3h-8z"/>',
  gunluk: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>',
  ay: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  aktar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  gecmis: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
  eslesme: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  oneri: '<path d="M12 2a7 7 0 0 0-4 12.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3A7 7 0 0 0 12 2z"/><path d="M9 22h6"/>',
  excel: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13l6 6M15 13l-6 6"/>',
  yenile: '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/>',
  sil: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  ekle: '<path d="M12 5v14M5 12h14"/>',
  kapat: '<path d="M18 6 6 18M6 6l12 12"/>',
  ok: '<path d="M20 6 9 17l-5-5"/>',
  uyari: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  wa: '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.5 8.5 0 0 1-4-1L3 20l1.1-5.4a8.4 8.4 0 0 1-.9-3.8 8.4 8.4 0 0 1 8.5-8.3 8.4 8.4 0 0 1 8.3 8.4z"/><path d="M8.5 8.2c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .6.5l.7 1.7c0 .2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.5.9 1.5 1.8 2.5 2.2.3.1.4 0 .6-.1l.5-.6c.2-.2.3-.1.5-.1l1.6.8c.2.1.4.2.4.3v.9c-.1.4-.7.9-1.2 1-.5 0-1.1.2-3.4-.8-2.4-1-3.9-3.5-4-3.7-.1-.2-1-1.3-1-2.5s.6-1.8.8-2z"/>',
  vardiya: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  sol: '<path d="m15 18-6-6 6-6"/>',
  sag: '<path d="m9 18 6-6-6-6"/>',
  yukari: '<path d="m18 15-6-6-6 6"/>',
  asagi: '<path d="m6 9 6 6 6-6"/>',
};

const svg = (ad, sinif = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round" class="${sinif}">${IKON[ad] || ''}</svg>`;

const SAYFALAR = [
  { id: 'genel',    ad: 'Genel Bakış',     alt: 'Özet ve son durum',                ikon: 'genel' },
  { id: 'gunluk',   ad: 'Günlük Takip',    alt: 'Gün bazlı işaretleme formu',       ikon: 'gunluk' },
  { id: 'ay',       ad: 'Ay Tablosu',      alt: 'Ayın tamamı, geniş tablo',                   ikon: 'ay' },
  { id: 'aktar',    ad: 'Rapor Aktar',     alt: 'Günlük rapor dosyalarını oku',     ikon: 'aktar' },
  { id: 'gecmis',   ad: 'Geçmiş Aktarım',  alt: 'Eski geniş tabloları içe aktar', ikon: 'gecmis' },
  { id: 'eslesme',  ad: 'Eşleştirme',      alt: 'Rapor metni → işletme kuralları',      ikon: 'eslesme' },
  { id: 'oneri',    ad: 'Öneriler', alt: 'Elle işaretlenecek kayıtlar',    ikon: 'oneri' },
  { id: 'vardiya',  ad: 'Vardiya',  alt: 'Aylık vardiya çizelgesi',        ikon: 'vardiya' },
  { id: 'whatsapp', ad: 'WhatsApp', alt: 'Oturum ve bağlantı durumu',      ikon: 'wa' },
];

const AY_ADI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const ALAN_KISA = {
  ariza_var: 'A', donus_saglandi: 'D', tutanak_gerekli: 'TG', tutanak_eklendi: 'TE',
};
const ALAN_AD = {
  ariza_var: 'Arızası var mı?', donus_saglandi: 'Dönüş sağlandı mı?',
  tutanak_gerekli: 'Tutanak gerekli mi?', tutanak_eklendi: 'Tutanak eklendi mi?',
};
const ALANLAR_4 = ['ariza_var', 'donus_saglandi', 'tutanak_gerekli', 'tutanak_eklendi'];
const ALANLAR_2 = ['tutanak_gerekli', 'tutanak_eklendi'];
const alanlariAl = (g) => (g === 4 ? ALANLAR_4 : ALANLAR_2);

const D = {
  sayfa: 'genel',
  daralt: false,
  isletmeler: [],
  kategoriler: [],
  tarih: null,
  ay: null,
  gunVerisi: null,
};

const $ = (s, k = document) => k.querySelector(s);
const el = (id) => document.getElementById(id);

async function cagir(sozVerilen) {
  const r = await sozVerilen;
  if (r && r.kilitli) { kilitEkrani(r.hata); throw new Error(r.hata || 'Kapalı'); }
  if (!r || !r.ok) throw new Error((r && r.hata) || 'Bilinmeyen hata');
  return r.veri;
}

function kilitEkrani(mesaj) {
  if (document.getElementById('kilitKatman')) return;
  const d = document.createElement('div');
  d.id = 'kilitKatman';
  d.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-bg-100 p-8';
  d.innerHTML = `
    <div class="card w-96 p-8 text-center">
      <div class="mb-3 flex justify-center text-danger">${svg('uyari', 'size-12')}</div>
      <div class="text-[15px] font-medium">Program kullanıma kapatıldı</div>
      <div class="mt-2 text-[12.5px] text-fg-2">${kacar(mesaj || 'Yöneticinize başvurun.')}</div>
      <button class="btn mt-5" id="kilitYenile">Yeniden dene</button>
    </div>`;
  document.body.appendChild(d);
  document.getElementById('kilitYenile').onclick = async () => {
    const r = await api.kilitTazele();
    if (r && r.ok && !r.veri.kilitli) location.reload();
  };
}

function bildir(mesaj, tur = 'bilgi') {
  const renk = {
    bilgi: 'border-line-2 bg-panel-3 text-fg',
    basari: 'border-brand-2/60 bg-brand-dim text-fg',
    uyari: 'border-warn/50 bg-warn/10 text-fg',
    hata: 'border-danger/60 bg-danger/15 text-fg',
  }[tur];
  const d = document.createElement('div');
  d.className = `pointer-events-auto rounded-lg border px-4 py-3 text-[12.5px] shadow-xl ${renk}`;
  d.innerHTML = mesaj;
  el('bildirimler').appendChild(d);
  setTimeout(() => {
    d.style.transition = 'opacity .3s';
    d.style.opacity = '0';
    setTimeout(() => d.remove(), 300);
  }, tur === 'hata' ? 9000 : 4500);
}

const gunAdi = (iso) => {
  const [y, a, g] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(y, a - 1, g));
  return ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][d.getUTCDay()];
};
const tarihYaz = (iso) => {
  if (!iso) return '—';
  const [y, a, g] = iso.split('-');
  return `${g}.${a}.${y}`;
};
const zamanYaz = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const gecen = Math.round((Date.now() - d.getTime()) / 60000);
  if (gecen < 1) return 'az önce';
  if (gecen < 60) return `${gecen} dk önce`;
  const ik = (n) => String(n).padStart(2, '0');
  const ayni = d.toDateString() === new Date().toDateString();
  return ayni
    ? `${ik(d.getHours())}:${ik(d.getMinutes())}`
    : `${ik(d.getDate())}.${ik(d.getMonth() + 1)} ${ik(d.getHours())}:${ik(d.getMinutes())}`;
};
const ayYaz = (ay) => {
  const [y, a] = ay.split('-').map(Number);
  return `${AY_ADI[a - 1]} ${y}`;
};
const bugun = () => new Date().toISOString().slice(0, 10);
const kacar = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function menuCiz() {
  el('menu').innerHTML = SAYFALAR.map((s) => `
    <button class="nav-item w-full ${D.sayfa === s.id ? 'active' : ''}" data-sayfa="${s.id}" title="${s.ad}">
      ${svg(s.ikon)}<span class="etiket truncate">${s.ad}</span>
    </button>`).join('');
}

function sidebarUygula() {
  const s = el('sidebar');
  s.classList.toggle('w-60', !D.daralt);
  s.classList.toggle('w-[60px]', D.daralt);
  document.querySelectorAll('.etiket').forEach((e) => e.classList.toggle('hidden', D.daralt));
  el('toggleIkon').style.transform = D.daralt ? 'rotate(180deg)' : '';
  el('toggleSidebar').title = D.daralt ? 'Menüyü aç (Ctrl+B)' : 'Menüyü daralt (Ctrl+B)';
  localStorage.setItem('daralt', D.daralt ? '1' : '0');
}

function panelAc(baslik, icerik) {
  const p = el('yanPanel');
  p.innerHTML = `
    <div class="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
      <div class="text-[14px] font-semibold">${baslik}</div>
      <button class="btn-ghost btn btn-sm" id="panelKapat">${svg('kapat', 'size-4')}</button>
    </div>
    <div class="min-h-0 flex-1 overflow-auto p-4">${icerik}</div>`;
  p.classList.remove('hidden');
  p.classList.add('flex');
  el('panelKatman').classList.remove('hidden');
  el('panelKapat').onclick = panelKapat;
}
function panelKapat() {
  el('yanPanel').classList.add('hidden');
  el('yanPanel').classList.remove('flex');
  el('panelKatman').classList.add('hidden');
}

function vtHatasiCiz(durum) {
  el('sayfaBaslik').textContent = 'Veritabanı açılamadı';
  el('sayfaAlt').textContent = 'Program çalışıyor, veri dosyası okunamıyor';
  el('navAraclar').innerHTML = '';
  el('icerik').innerHTML = `
    <div class="min-h-0 flex-1 overflow-auto">
      <div class="card border-danger/50">
        <div class="card-head bg-danger/10">
          <div class="flex items-center gap-2">
            <span class="text-danger">${svg('uyari', 'size-5')}</span>
            <div class="font-medium">Veri dosyası açılamadı</div>
          </div>
        </div>
        <div class="space-y-4 p-5 text-[12.5px]">
          ${durum.tani && durum.tani.tesis ? `
            <div class="rounded-md border border-warn/40 bg-warn/10 p-3 text-[12.5px]">
              <b>Muhtemel sebep:</b> ${kacar(durum.tani.tesis)}
            </div>` : ''}

          <div class="rounded-md border border-line bg-bg-200 p-3 font-mono text-[11.5px] text-danger">
            ${kacar(durum.hata)}
          </div>

          <table class="w-full text-[11.5px]">
            <tbody>
              ${[
                ['Dosya', durum.yol],
                ['Sürüm', durum.surum],
                ...(durum.tani ? [
                  ['Klasör yazılabilir mi', durum.tani.yazilabilir === false
                    ? 'HAYIR — ' + (durum.tani.yazmaHatasi || '') : 'evet'],
                  ['Veritabanı motoru', durum.tani.motorCalisiyor === false
                    ? 'YÜKLENEMEDİ — ' + (durum.tani.motorHatasi || '') : 'çalışıyor'],
                  ['Artık kilit klasörü', durum.tani.kilitVar ? 'VAR — temizlenmeli' : 'yok'],
                  ['Dosya boyutu', durum.tani.dosyaBoyutu === null
                    ? 'dosya yok' : durum.tani.dosyaBoyutu + ' bayt'],
                  ['Yol uzunluğu', durum.tani.uzunluk + ' karakter'],
                ] : []),
              ].map(([a, b]) => `<tr class="border-t border-line">
                  <td class="w-52 py-1.5 text-fg-3">${kacar(a)}</td>
                  <td class="py-1.5 font-mono text-fg-2">${kacar(b)}</td></tr>`).join('')}
            </tbody>
          </table>

          <div class="text-fg-2">
            <b>Onar</b> derseniz mevcut dosya silinmez; adının sonuna <span class="font-mono">.bozuk-…</span>
            eklenerek bir kenara alınır ve program boş bir veritabanıyla açılır.
          </div>

          <div class="flex flex-wrap gap-2">
            <button class="btn btn-brand" id="vtOnar">Onar ve yeniden dene</button>
            <button class="btn" id="vtKopyala">Hata raporunu kopyala</button>
            <button class="btn" id="vtKlasor">Klasörde göster</button>
            <button class="btn" id="vtGunluk">Günlük dosyasını göster</button>
          </div>
        </div>
      </div>
    </div>`;

  el('vtOnar').onclick = async () => {
    try {
      const r = await cagir(api.vtOnar());
      bildir(r.veriKorundu
        ? '<b>Onarıldı.</b> Takılı kalan kilit temizlendi, verileriniz olduğu gibi duruyor.'
        : '<b>Onarıldı.</b> Bozuk dosya kenara alındı, program temiz bir veritabanıyla açıldı.',
      'basari');
      git('genel');
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  };
  el('vtKlasor').onclick = () => api.klasorAc(durum.yol);
  el('vtGunluk').onclick = () => api.gunluguAc();
  el('vtKopyala').onclick = async () => {
    await api.panoyaKopyala(JSON.stringify(durum, null, 2));
    bildir('Hata raporu panoya kopyalandı — yapıştırıp gönderebilirsiniz.', 'basari');
  };
}

function duzenlemeVarMi() {
  const e = document.activeElement;
  if (e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.isContentEditable)) return true;
  const panel = document.getElementById('yanPanel');
  return !!panel && !panel.classList.contains('hidden');
}

async function git(id) {
  const durum = await cagir(api.vtDurum());
  if (durum.hata) { menuCiz(); return vtHatasiCiz(durum); }

  D.sayfa = id;
  menuCiz();
  const s = SAYFALAR.find((x) => x.id === id);
  el('sayfaBaslik').textContent = s ? s.ad : 'Ayarlar';
  el('sayfaAlt').textContent = s ? s.alt : 'Sürüm, güncelleme ve kayıtlar';
  el('navAraclar').innerHTML = '';
  el('icerik').innerHTML = `<div class="p-10 text-center text-fg-3">Yükleniyor…</div>`;
  try {
    await ({
      genel: sayfaGenel, gunluk: sayfaGunluk, ay: sayfaAy, aktar: sayfaAktar,
      gecmis: sayfaGecmis, eslesme: sayfaEslesme, oneri: sayfaOneri,
      vardiya: sayfaVardiya, whatsapp: sayfaWhatsapp, ayarlar: sayfaAyarlar,
    }[id] || sayfaGenel)();
  } catch (e) {
    el('icerik').innerHTML = `<div class="card p-6 text-danger">${kacar(e.message)}</div>`;
  }
}

async function sayfaGenel() {
  const [ozet, gunler, aylar] = await Promise.all([
    cagir(api.ozet()), cagir(api.gunler()), cagir(api.aylar()),
  ]);

  if (!ozet.gun && !ozet.isletme) {
    el('icerik').innerHTML = `
      <div class="min-h-0 flex-1 overflow-auto">
        <div class="card p-8">
          <h2 class="text-[17px] font-semibold">Başlayalım</h2>
          <p class="mt-2 text-[12.5px] text-fg-2">
            Uygulama hiçbir veriyle gelmez. İşletme listeniz, eşleştirme tablonuz ve tüm
            kayıtlarınız <b>bu bilgisayarda</b> oluşur ve burada kalır.
          </p>
          <ol class="mt-5 space-y-4 text-[12.5px]">
            <li class="flex gap-3">
              <span class="flex size-6 shrink-0 items-center justify-center rounded-full
                           border border-brand-2/50 text-[11px] text-brand">1</span>
              <div>
                <div class="font-medium">Geçmiş tablonuzu içe aktarın</div>
                <div class="text-fg-3">Mevcut geniş Excel tablonuz okunur; işletme listesi
                  dosyadan çıkarılır ve geçmiş işaretler kaydedilir.</div>
                <button class="btn btn-brand mt-2" data-sayfa="gecmis">
                  ${svg('gecmis', 'size-4')} Geçmiş Aktarım</button>
              </div>
            </li>
            <li class="flex gap-3">
              <span class="flex size-6 shrink-0 items-center justify-center rounded-full
                           border border-line-2 text-[11px] text-fg-3">2</span>
              <div>
                <div class="font-medium">Eşleştirmeyi gözden geçirin</div>
                <div class="text-fg-3">Her işletme için adıyla birebir eşleşen bir kural kurulur.
                  Beldeler gibi istisnaları (örn. bir beldenin bağlı ilçeye yazılması)
                  siz eklersiniz.</div>
                <button class="btn mt-2" data-sayfa="eslesme">${svg('eslesme', 'size-4')} Eşleştirme</button>
              </div>
            </li>
            <li class="flex gap-3">
              <span class="flex size-6 shrink-0 items-center justify-center rounded-full
                           border border-line-2 text-[11px] text-fg-3">3</span>
              <div>
                <div class="font-medium">Her gün raporları aktarın</div>
                <div class="text-fg-3">Günlük rapor dosyalarını seçin; işaretleme otomatik yapılır.</div>
                <button class="btn mt-2" data-sayfa="aktar">${svg('aktar', 'size-4')} Rapor Aktar</button>
              </div>
            </li>
          </ol>
        </div>
      </div>`;
    return;
  }

  const kart = (baslik, deger, alt, renk = 'text-fg') => `
    <div class="card p-4">
      <div class="text-[11.5px] uppercase tracking-wide text-fg-3">${baslik}</div>
      <div class="mt-1.5 text-[26px] font-semibold leading-none ${renk}">${deger}</div>
      <div class="mt-1.5 text-[11.5px] text-fg-3">${alt}</div>
    </div>`;

  el('navAraclar').innerHTML =
    `<button class="btn" id="yenile">${svg('yenile', 'size-4')} Yenile</button>`;
  el('yenile').onclick = () => git('genel');

  el('icerik').innerHTML = `
    <div class="grid shrink-0 grid-cols-4 gap-4">
      ${kart('Kayıtlı gün', ozet.gun, `${aylar.length} ay`)}
      ${kart('Toplam kayıt', ozet.kayit.toLocaleString('tr-TR'), `${ozet.isletme} işletme`)}
      ${kart('Bekleyen', (ozet.bekleyen || 0).toLocaleString('tr-TR'), 'dönüş / tutanak', 'text-warn')}
      ${kart('Son gün', tarihYaz(ozet.sonGun), ozet.sonGun ? gunAdi(ozet.sonGun) : '—', 'text-brand')}
    </div>

    <div class="mt-4 grid min-h-0 flex-1 grid-cols-3 gap-4">
      <div class="card col-span-2 flex min-h-0 flex-col overflow-hidden">
        <div class="card-head"><div class="font-medium">Son günler</div>
          <div class="text-[11.5px] text-fg-3">${gunler.length} gün</div></div>
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="tbl">
            <thead><tr><th>Tarih</th><th>Gün</th><th class="text-right">İşaret</th>
              <th class="text-right">Bekleyen</th><th></th></tr></thead>
            <tbody>${gunler.slice(0, 40).map((g) => `
              <tr class="cursor-pointer" data-gun="${g.tarih}">
                <td class="font-medium">${tarihYaz(g.tarih)}</td>
                <td class="text-fg-3">${gunAdi(g.tarih)}</td>
                <td class="text-right">${g.isaret || 0}</td>
                <td class="text-right ${g.bekleyen ? 'text-warn' : 'text-fg-3'}">${g.bekleyen || 0}</td>
                <td class="text-right text-fg-3">›</td>
              </tr>`).join('') || '<tr><td colspan="5" class="py-8 text-center text-fg-3">Kayıt yok</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card flex min-h-0 flex-col overflow-hidden">
        <div class="card-head"><div class="font-medium">Aylar</div></div>
        <div class="min-h-0 flex-1 overflow-auto p-2">
          ${aylar.map((a) => `
            <button class="nav-item w-full justify-between" data-ay="${a.ay}">
              <span>${ayYaz(a.ay)}</span>
              <span class="chip border-line-2 text-fg-3">${a.gun} gün</span>
            </button>`).join('') || '<div class="p-6 text-center text-fg-3">—</div>'}
        </div>
      </div>
    </div>`;

  document.querySelectorAll('[data-gun]').forEach((t) => {
    t.onclick = () => { D.tarih = t.dataset.gun; git('gunluk'); };
  });
  document.querySelectorAll('[data-ay]').forEach((t) => {
    t.onclick = () => { D.ay = t.dataset.ay; git('ay'); };
  });
}

async function sayfaGunluk() {
  const gunler = await cagir(api.gunler());
  if (!D.tarih) D.tarih = gunler.length ? gunler[0].tarih : bugun();

  el('navAraclar').innerHTML = `
    <button class="btn" id="oncekiGun" title="Önceki gün">${svg('sol', 'size-4')}</button>
    <input type="date" id="tarihSec" value="${D.tarih}" class="input" />
    <button class="btn" id="sonrakiGun" title="Sonraki gün">${svg('sag', 'size-4')}</button>
    <button class="btn ml-1" id="oncekiKayit" title="Kayıt olan önceki güne atla">« Kayıt</button>
    <button class="btn" id="sonrakiKayit" title="Kayıt olan sonraki güne atla">Kayıt »</button>
    <button class="btn btn-brand ml-1" id="raporAktar">${svg('aktar', 'size-4')} Rapor Aktar</button>`;

  el('tarihSec').onchange = (e) => {
    if (e.target.value) { D.tarih = e.target.value; sayfaGunluk(); }
  };
  el('raporAktar').onclick = () => git('aktar');

  const kaydir = (gun) => {
    const [y, a, g] = D.tarih.split('-').map(Number);
    const d = new Date(Date.UTC(y, a - 1, g + gun));
    D.tarih = d.toISOString().slice(0, 10);
    sayfaGunluk();
  };
  el('oncekiGun').onclick = () => kaydir(-1);
  el('sonrakiGun').onclick = () => kaydir(1);

  const sirali = gunler.map((g) => g.tarih).sort();
  const onceki = sirali.filter((t) => t < D.tarih).pop();
  const sonraki = sirali.find((t) => t > D.tarih);
  el('oncekiKayit').disabled = !onceki;
  el('sonrakiKayit').disabled = !sonraki;
  el('oncekiKayit').onclick = () => { if (onceki) { D.tarih = onceki; sayfaGunluk(); } };
  el('sonrakiKayit').onclick = () => { if (sonraki) { D.tarih = sonraki; sayfaGunluk(); } };

  await gunIzgarasiCiz();
}

async function gunIzgarasiCiz() {
  const [isletmeler, kategoriler, veri] = await Promise.all([
    cagir(api.isletmeler()), cagir(api.kategoriler()), cagir(api.gunVerisi(D.tarih)),
  ]);
  D.isletmeler = isletmeler;
  D.kategoriler = kategoriler;
  D.gunVerisi = veri;

  const acik = veri.acikKategoriler.length
    ? kategoriler.filter((k) => veri.acikKategoriler.includes(k.kod))
    : kategoriler;

  const harita = new Map();
  for (const s of veri.satirlar) {
    if (!harita.has(s.isletme_id)) harita.set(s.isletme_id, new Map());
    harita.get(s.isletme_id).set(s.kategori_kod, s);
  }
  D.harita = harita;

  if (!veri.satirlar.length && !veri.acikKategoriler.length) {
    el('icerik').innerHTML = `
      <div class="card flex flex-col items-center gap-3 p-12 text-center">
        <div class="text-fg-2">${tarihYaz(D.tarih)} için kayıt yok.</div>
        <div class="text-[12px] text-fg-3">Günlük rapor dosyalarını aktarabilir ya da hücrelere elle tıklayabilirsiniz.</div>
        <div class="mt-2 flex gap-2">
          <button class="btn btn-brand" id="bosAktar">${svg('aktar', 'size-4')} Rapor Aktar</button>
          <button class="btn" id="bosAc">Boş gün aç</button>
        </div>
      </div>`;
    el('bosAktar').onclick = () => git('aktar');
    el('bosAc').onclick = async () => {
      await cagir(api.gunKategoriAc(D.tarih, kategoriler.map((k) => k.id)));
      gunIzgarasiCiz();
    };
    return;
  }

  const basSatir1 = acik.map((k) => `
    <th colspan="${k.genislik}"
        class="border-b border-r border-line bg-panel-2 px-2 py-1.5 text-center text-[11px]
               font-semibold uppercase tracking-wide ${k.otomatik ? 'text-fg-2' : 'text-fg-3'}"
        title="${k.otomatik ? 'Rapordan otomatik işaretlenir' : 'Elle doldurulur'}">
      ${kacar(k.ad)}${k.otomatik ? '' : ' <span class="text-[9px] font-normal">(elle)</span>'}
    </th>`).join('');

  const basSatir2 = acik.map((k) => alanlariAl(k.genislik).map((a) => `
    <th class="border-b border-r border-line bg-panel-2 px-0 py-1 text-center text-[10px] font-medium text-fg-3"
        title="${ALAN_AD[a]}">${ALAN_KISA[a]}</th>`).join('')).join('');

  const satirlar = isletmeler.map((isl) => {
    const kayitlar = harita.get(isl.id) || new Map();
    const hucreler = acik.map((k) => {
      const kayit = kayitlar.get(k.kod);
      return alanlariAl(k.genislik).map((a) => {
        const isaretli = kayit && kayit[a] ? 'isaretli' : '';
        const bekliyor = kayit && kayit[a + '_bekliyor'] ? 'bekliyor' : '';
        return `<td class="grid-cell ${isaretli} ${bekliyor}"
                    data-i="${isl.id}" data-k="${k.id}" data-a="${a}"
                    title="${kacar(isl.ad)} · ${kacar(k.ad)} · ${ALAN_AD[a]}">${isaretli ? 'X' : ''}</td>`;
      }).join('');
    }).join('');
    return `<tr>
      <td class="sticky-col group cursor-pointer px-3 py-0 text-[12px] font-medium hover:text-brand"
          data-form="${isl.id}" style="height:26px" title="Form görünümünde aç">
        <span class="flex items-center justify-between gap-2">
          <span>${kacar(isl.ad)}</span>
          ${svg('sag', 'size-3.5 shrink-0 text-fg-3 opacity-40 group-hover:text-brand group-hover:opacity-100')}
        </span>
      </td>
      ${hucreler}</tr>`;
  }).join('');

  el('icerik').innerHTML = `
    <div class="mb-3 flex shrink-0 items-center justify-between">
      <div class="flex items-center gap-2 text-[12.5px]">
        <span class="chip border-brand-2/50 bg-brand-dim text-brand">${gunAdi(D.tarih)}, ${tarihYaz(D.tarih)}</span>
        <span class="text-fg-3">Hücreye tıklayarak işaretleyin · işletme adına tıklayın
          ${svg('sag', 'inline size-3 -mt-0.5')} o işletmenin bütün kategorileri sağda
          form olarak açılır</span>
      </div>
      <div class="flex items-center gap-3 text-[11px] text-fg-3">
        <span class="flex items-center gap-1.5"><i class="inline-block size-3 rounded-sm bg-brand-dim"></i> İşaretli</span>
        <span class="flex items-center gap-1.5"><i class="inline-block size-3 rounded-sm" style="background:rgba(240,82,82,.25)"></i> Bekliyor</span>
        <button class="btn btn-sm" id="gunExcel">${svg('excel', 'size-3.5')} Excel'e aktar</button>
        <button class="btn btn-sm" id="gunSil">${svg('sil', 'size-3.5')} Günü sil</button>
      </div>
    </div>

    <div class="card min-h-0 flex-1 overflow-auto">
      <table class="border-collapse">
        <thead class="sticky top-0 z-20">
          <tr><th rowspan="2" class="sticky-col border-b border-r border-line bg-panel-2 px-3 py-1.5
                     text-left text-[11px] font-semibold uppercase tracking-wide text-fg-2"
                  style="min-width:140px">İşletme</th>${basSatir1}</tr>
          <tr>${basSatir2}</tr>
        </thead>
        <tbody>${satirlar}</tbody>
      </table>
    </div>`;

  el('gunExcel').onclick = async () => {
    try {
      const yol = await cagir(api.gunExcelDisaAktar(D.tarih));
      if (!yol) return;
      bildir(`<b>${tarihYaz(D.tarih)} tablosu kaydedildi.</b><br>${kacar(yol)}`, 'basari');
      api.klasorAc(yol);
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  };

  el('gunSil').onclick = async () => {
    if (!confirm(`${tarihYaz(D.tarih)} gününe ait tüm kayıtlar silinecek. Emin misiniz?`)) return;
    await cagir(api.gunSil(D.tarih));
    bildir('Gün silindi.', 'basari');
    gunIzgarasiCiz();
  };

  el('icerik').querySelectorAll('.grid-cell').forEach((h) => {
    h.onclick = () => hucreTikla(h);
  });
  el('icerik').querySelectorAll('[data-form]').forEach((t) => {
    t.onclick = () => formAc(Number(t.dataset.form));
  });
}

async function hucreTikla(hucre) {
  const isletme_id = Number(hucre.dataset.i);
  const kategori_id = Number(hucre.dataset.k);
  const alan = hucre.dataset.a;
  const yeni = !hucre.classList.contains('isaretli');
  try {
    const kayit = await cagir(api.hucreGuncelle({
      tarih: D.tarih, isletme_id, kategori_id, alan, deger: yeni ? 1 : 0,
    }));
    hucre.classList.toggle('isaretli', yeni);
    hucre.classList.toggle('bekliyor', !!kayit[alan + '_bekliyor']);
    hucre.textContent = yeni ? 'X' : '';
    if (!D.harita.has(isletme_id)) D.harita.set(isletme_id, new Map());
    const kat = D.kategoriler.find((k) => k.id === kategori_id);
    if (kat) D.harita.get(isletme_id).set(kat.kod, { ...kayit, kategori_kod: kat.kod });
  } catch (e) {
    bildir(`Kaydedilemedi: ${kacar(e.message)}`, 'hata');
  }
}

function formAc(isletmeId) {
  const isl = D.isletmeler.find((i) => i.id === isletmeId);
  if (!isl) return;
  const kayitlar = D.harita.get(isletmeId) || new Map();
  const acik = D.gunVerisi.acikKategoriler.length
    ? D.kategoriler.filter((k) => D.gunVerisi.acikKategoriler.includes(k.kod))
    : D.kategoriler;

  const govde = acik.map((k) => {
    const kayit = kayitlar.get(k.kod) || {};
    const satirlar = alanlariAl(k.genislik).map((a) => `
      <label class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-panel-2">
        <span class="text-[12.5px] ${kayit[a] ? 'text-fg' : 'text-fg-2'}">${ALAN_AD[a]}</span>
        <span class="flex items-center gap-2">
          ${kayit[a + '_bekliyor'] ? '<span class="chip border-danger/50 bg-danger/15 text-danger">bekliyor</span>' : ''}
          <input type="checkbox" ${kayit[a] ? 'checked' : ''}
                 class="size-4 accent-[#3ecf8e]"
                 data-fi="${isletmeId}" data-fk="${k.id}" data-fa="${a}" />
        </span>
      </label>`).join('');
    return `
      <div class="card mb-3">
        <div class="card-head py-2">
          <div class="text-[12.5px] font-medium">${kacar(k.ad)}</div>
          ${k.otomatik
            ? '<span class="chip border-brand-2/40 text-brand">otomatik</span>'
            : '<span class="chip border-line-2 text-fg-3">elle</span>'}
        </div>
        <div class="p-2">${satirlar}</div>
      </div>`;
  }).join('');

  panelAc(
    `${kacar(isl.ad)} <span class="ml-2 text-[12px] font-normal text-fg-3">${tarihYaz(D.tarih)}</span>`,
    govde || '<div class="p-6 text-center text-fg-3">Bu gün için açık kategori yok.</div>'
  );

  el('yanPanel').querySelectorAll('input[type=checkbox]').forEach((c) => {
    c.onchange = async () => {
      try {
        await cagir(api.hucreGuncelle({
          tarih: D.tarih,
          isletme_id: Number(c.dataset.fi),
          kategori_id: Number(c.dataset.fk),
          alan: c.dataset.fa,
          deger: c.checked ? 1 : 0,
        }));
        const kat = D.kategoriler.find((k) => k.id === Number(c.dataset.fk));
        const h = el('icerik').querySelector(
          `.grid-cell[data-i="${c.dataset.fi}"][data-k="${c.dataset.fk}"][data-a="${c.dataset.fa}"]`
        );
        if (h) { h.classList.toggle('isaretli', c.checked); h.textContent = c.checked ? 'X' : ''; }
        if (kat) {
          if (!D.harita.has(Number(c.dataset.fi))) D.harita.set(Number(c.dataset.fi), new Map());
          const mevcut = D.harita.get(Number(c.dataset.fi)).get(kat.kod) || {};
          D.harita.get(Number(c.dataset.fi)).set(kat.kod, { ...mevcut, [c.dataset.fa]: c.checked ? 1 : 0 });
        }
      } catch (e) {
        c.checked = !c.checked;
        bildir(`Kaydedilemedi: ${kacar(e.message)}`, 'hata');
      }
    };
  });
}

async function sayfaAy() {
  const aylar = await cagir(api.aylar());
  if (!aylar.length) {
    el('icerik').innerHTML = '<div class="card p-12 text-center text-fg-3">Henüz kayıt yok.</div>';
    return;
  }
  if (!D.ay || !aylar.find((a) => a.ay === D.ay)) D.ay = aylar[0].ay;

  el('navAraclar').innerHTML = `
    <select id="aySec" class="input">${aylar.map((a) =>
      `<option value="${a.ay}" ${a.ay === D.ay ? 'selected' : ''}>${ayYaz(a.ay)} (${a.gun} gün)</option>`
    ).join('')}</select>
    <button class="btn btn-brand" id="excelAktar">${svg('excel', 'size-4')} Excel'e Aktar</button>`;

  el('aySec').onchange = (e) => { D.ay = e.target.value; sayfaAy(); };
  el('excelAktar').onclick = async () => {
    try {
      const yol = await cagir(api.excelDisaAktar(D.ay));
      if (!yol) return;
      bildir(`Kaydedildi:<br><span class="text-fg-3">${kacar(yol)}</span>`, 'basari');
      api.klasorAc(yol);
    } catch (e) { bildir(`Aktarılamadı: ${kacar(e.message)}`, 'hata'); }
  };

  const [isletmeler, kategoriler, veri] = await Promise.all([
    cagir(api.isletmeler()), cagir(api.kategoriler()), cagir(api.ayVerisi(D.ay)),
  ]);
  const katKod = new Map(kategoriler.map((k) => [k.kod, k]));

  const gunler = new Map();
  for (const s of veri) {
    if (!gunler.has(s.tarih)) gunler.set(s.tarih, new Map());
    const g = gunler.get(s.tarih);
    if (!g.has(s.kategori_kod)) g.set(s.kategori_kod, new Map());
    g.get(s.kategori_kod).set(s.isletme, s);
  }
  const tarihler = [...gunler.keys()].sort();

  const gunKategorileri = (t) =>
    [...gunler.get(t).keys()].map((k) => katKod.get(k)).filter(Boolean)
      .sort((a, b) => a.sira - b.sira);

  const bas1 = tarihler.map((t) => {
    const gen = gunKategorileri(t).reduce((s, k) => s + k.genislik, 0);
    return `<th colspan="${gen}" class="border-b border-r-2 border-r-line-2 border-line bg-panel-2
                px-2 py-1.5 text-center text-[11px] font-semibold">${tarihYaz(t)}</th>`;
  }).join('');

  const bas2 = tarihler.map((t) => gunKategorileri(t).map((k) =>
    `<th colspan="${k.genislik}" class="border-b border-r border-line bg-panel-2 px-1 py-1
         text-center text-[9.5px] font-medium text-fg-3" title="${kacar(k.ad)}">
       ${kacar(k.ad.length > 12 ? k.ad.slice(0, 11) + '…' : k.ad)}</th>`).join('')).join('');

  const govde = isletmeler.map((isl) => {
    const hucreler = tarihler.map((t) => gunKategorileri(t).map((k) => {
      const kayit = (gunler.get(t).get(k.kod) || new Map()).get(isl.ad);
      return alanlariAl(k.genislik).map((a) => {
        const i = kayit && kayit[a];
        const b = kayit && kayit[a + '_bekliyor'];
        return `<td class="grid-cell kilit ${i ? 'isaretli' : ''} ${b ? 'bekliyor' : ''}"
                    style="width:22px;min-width:22px">${i ? 'X' : ''}</td>`;
      }).join('');
    }).join('')).join('');
    return `<tr><td class="sticky-col px-3 text-[12px] font-medium" style="height:26px">${kacar(isl.ad)}</td>${hucreler}</tr>`;
  }).join('');

  el('icerik').innerHTML = `
    <div class="mb-3 shrink-0 text-[12px] text-fg-3">
      ${ayYaz(D.ay)} · ${tarihler.length} gün · salt okunur görünüm
      (düzenlemek için <button class="text-brand hover:underline" id="gunlugeGit">Günlük Takip</button>)
    </div>
    <div class="card min-h-0 flex-1 overflow-auto">
      <table class="border-collapse">
        <thead class="sticky top-0 z-20">
          <tr><th rowspan="2" class="sticky-col border-b border-r border-line bg-panel-2 px-3 py-1.5
                  text-left text-[11px] font-semibold" style="min-width:130px">İşletme</th>${bas1}</tr>
          <tr>${bas2}</tr>
        </thead>
        <tbody>${govde}</tbody>
      </table>
    </div>`;
  el('gunlugeGit').onclick = () => git('gunluk');
}

async function sayfaAktar() {
  const ozet = await cagir(api.ozet());
  const bosMu = !ozet.isletme;

  el('icerik').innerHTML = `
    <div class="min-h-0 flex-1 overflow-auto">
      <div class="card">
        <div class="card-head"><div class="font-medium">Günlük rapor dosyaları</div></div>
        <div class="space-y-4 p-5">
          <p class="text-[12.5px] text-fg-2">
            O güne ait rapor dosyalarını seçin (hepsini birden seçebilirsiniz). Raporlar önce
            sayfa adından, tanınmazsa sütun başlıklarından, o da olmazsa dosya adından
            anlaşılır. Tarih dosya adındaki <b>GG.AA.YYYY</b>'den okunur; tek gün seçtiyseniz
            adında tarih olmayan dosya da aynı güne yazılır.
          </p>

          <div class="rounded-md border border-line bg-bg-200 p-3 text-[11.5px] text-fg-3">
            <div class="mb-1.5 font-medium text-fg-2">Aranan raporlar</div>
            <div class="grid grid-cols-2 gap-x-6 gap-y-1">
              <span>ARIZA DETAY</span>
              <span>DURUM KODU</span>
              <span>BİNA TİPİ OSOS</span>
              <span>OSOS BAĞLANTI İHBAR İNCELEMESİ</span>
              <span>BİLGİ BELGE</span>
              <span>İL-İLÇE <b class="text-fg-2">(öneri listesi, işaretleme elle)</b></span>
            </div>
            <div class="mt-1.5">Biri seçilmemişse aktarım sonunda uyarı verir.</div>
          </div>

          <div class="space-y-2">
            <label class="flex items-center gap-2 text-[12.5px] text-fg-2">
              <input type="checkbox" id="uzerineYaz" checked class="size-4 accent-[#3ecf8e]" />
              Aynı gün varsa okunan kategorileri sıfırla
              <span class="text-fg-3">— elle girdikleriniz korunur</span>
            </label>
            <label class="flex items-center gap-2 text-[12.5px] text-fg-2">
              <input type="checkbox" id="yeniIsletme" ${bosMu ? 'checked' : ''} class="size-4 accent-[#3ecf8e]" />
              Tanınmayan ilçeleri işletme olarak ekle
              <span class="text-fg-3">${bosMu
                ? '— liste boş, ilk aktarımda işletmeler rapordan öğrenilsin'
                : '— kapalıysa eşleşmeyenler ekranda listelenir'}</span>
            </label>
          </div>
          <button class="btn btn-brand" id="dosyaSec">${svg('aktar', 'size-4')} Dosyaları Seç</button>
          <div class="text-[11.5px] text-fg-3">
            Tarih dosya adından okunamazsa aşağıdan seçebilirsiniz:
            <input type="date" id="elleTarih" class="input ml-2" />
          </div>
        </div>
      </div>
      <div id="aktarSonuc" class="mt-4"></div>
    </div>`;

  el('dosyaSec').onclick = async () => {
    const dosyalar = await cagir(api.dosyaSec('Günlük rapor dosyalarını seçin'));
    if (!dosyalar.length) return;
    const btn = el('dosyaSec');
    btn.disabled = true;
    btn.innerHTML = 'Okunuyor…';
    el('aktarSonuc').innerHTML =
      `<div class="card p-4 text-fg-3">${dosyalar.length} dosya işleniyor…</div>`;
    try {
      const r = await cagir(api.gunlukAktar(dosyalar, {
        tarih: el('elleTarih').value || undefined,
        uzerineYaz: el('uzerineYaz').checked,
        yeniIsletmeEkle: el('yeniIsletme').checked,
      }));
      aktarSonucuCiz(r);
      const toplam = r.gunler.reduce((s, g) => s + g.isaretToplam, 0);
      bildir(toplam
        ? `<b>Aktarım tamamlandı.</b><br>${r.gunler.length} gün — ${toplam} işaretleme yazıldı.`
        : `<b>Aktarım bitti ama hiçbir şey işaretlenmedi.</b><br>Ayrıntı ekranda.`,
      toplam ? 'basari' : 'hata');
    } catch (e) {
      el('aktarSonuc').innerHTML =
        `<div class="card border-danger/40 p-4 text-danger">${kacar(e.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${svg('aktar', 'size-4')} Dosyaları Seç`;
    }
  };
}

function aktarSonucuCiz(toplu) {
  const toplam = toplu.gunler.reduce((s, g) => s + g.isaretToplam, 0);
  el('aktarSonuc').innerHTML = `
    ${toplu.cokluMu ? `
      <div class="card mb-3 border-brand-2/40">
        <div class="flex items-center justify-between p-4">
          <div>
            <div class="font-medium">${toplu.gunler.length} ayrı gün aktarıldı</div>
            <div class="text-[11.5px] text-fg-3">
              Dosyalar adlarındaki tarihe göre ayrıldı · toplam ${toplam} işaretleme</div>
          </div>
          <div class="flex flex-wrap justify-end gap-1">
            ${toplu.gunler.map((g) => `
              <button class="chip ${g.isaretToplam
                ? 'border-brand-2/50 text-brand' : 'border-danger/50 text-danger'}"
                data-gunegit="${g.tarih}">${tarihYaz(g.tarih)} · ${g.isaretToplam}</button>`).join('')}
          </div>
        </div>
      </div>` : ''}
    ${(toplu.tarihiVerilen || []).length ? `
      <div class="card mb-3 border-brand-2/40 p-3 text-[12px]">
        ${svg('ok', 'inline size-3.5 -mt-0.5 text-brand')} Adında tarih olmayan
        ${toplu.tarihiVerilen.length} dosya, diğer dosyaların günü olan
        <b>${tarihYaz(toplu.gunler[0].tarih)}</b> gününe eklendi:
        <span class="text-fg-3">${toplu.tarihiVerilen.map(kacar).join(', ')}</span>
      </div>` : ''}
    ${toplu.tarihsiz.length ? `
      <div class="card mb-3 border-warn/40 p-3 text-[12px]">
        ${svg('uyari', 'inline size-3.5 -mt-0.5')} Adında tarih bulunmayan
        ${toplu.tarihsiz.length} dosya atlandı: ${toplu.tarihsiz.map(kacar).join(', ')}
        <span class="text-fg-3">— bunları tek başına seçip tarihi elle verin.</span>
      </div>` : ''}
    <div class="space-y-3">${toplu.gunler.map((g, ix) => gunSonucuCiz(g, ix)).join('')}</div>`;

  document.querySelectorAll('[data-gunegit]').forEach((b) => {
    b.onclick = () => { D.tarih = b.dataset.gunegit; git('gunluk'); };
  });
  toplu.gunler.forEach((g, ix) => gunSonucunuBagla(g, ix));
}

function gunSonucuCiz(r, ix) {
  const basarili = r.isaretToplam > 0;
  return `
    <div class="card ${basarili ? 'border-brand-2/50' : 'border-danger/50'}">
      <div class="card-head ${basarili ? 'bg-brand-dim/40' : 'bg-danger/10'}">
        <div class="flex items-center gap-2">
          <span class="${basarili ? 'text-brand' : 'text-danger'}">
            ${svg(basarili ? 'ok' : 'uyari', 'size-5')}</span>
          <div>
            <div class="font-medium">${basarili
              ? 'Aktarım tamamlandı'
              : 'Aktarım bitti — hiçbir şey işaretlenmedi'}</div>
            <div class="text-[11.5px] text-fg-3">
              ${tarihYaz(r.tarih)} · ${r.isaretToplam} işaretleme ·
              ${r.kategoriler.filter((k) => k.otomatik).length} kategori</div>
          </div>
        </div>
        <button class="btn btn-sm ${basarili ? 'btn-brand' : ''}" data-gunac="${ix}">Günü aç</button>
      </div>
      <div class="space-y-3 p-4">
        ${r.hata ? `
          <div class="rounded-md border border-danger/40 bg-danger/10 p-3 text-[12.5px]">
            ${kacar(r.hata)}
          </div>` : ''}
        ${!basarili && !r.hata ? `
          <div class="rounded-md border border-danger/40 bg-danger/10 p-3 text-[12.5px]">
            Raporlar okundu ama ilçelerin hiçbiri bir işletmeyle eşleşmedi.
            ${r.eslesmez.length
              ? 'Aşağıdaki değerler için karşılık seçin ya da aktarımı '
                + '<b>“Tanınmayan ilçeleri işletme olarak ekle”</b> seçeneğiyle tekrarlayın.'
              : 'Rapor sayfalarında il/ilçe sütunu bulunamamış olabilir.'}
          </div>` : ''}
        ${r.eklenenIsletmeler.length ? `
          <div class="rounded-md border border-brand-2/40 bg-brand-dim/40 p-3 text-[12px]">
            Rapordan <b>${r.eklenenIsletmeler.length}</b> yeni işletme öğrenildi:
            <span class="text-fg-3">${r.eklenenIsletmeler.map(kacar).join(', ')}</span>
          </div>` : ''}
        <div class="space-y-1 font-mono text-[11.5px] text-fg-2">
          ${r.satirlar.map((s) => `<div>${kacar(s)}</div>`).join('')}
        </div>
        ${(r.eksikRaporlar || []).length ? `
          <div class="rounded-md border border-warn/40 bg-warn/10 p-3 text-[12px]">
            ${svg('uyari', 'inline size-3.5 -mt-0.5')} Bu aktarımda
            <b>${r.eksikRaporlar.map((k) => kacar(k.ad)).join(', ')}</b>
            raporu hiç görülmedi — bu kategoriler işaretlenmedi.
            <div class="mt-1 text-fg-3">
              Dosyayı seçmemiş olabilirsiniz ya da sayfa adı değişmiş olabilir.
            </div>
            ${(r.atlananSayfalar || []).length ? `
              <details class="mt-1.5">
                <summary class="cursor-pointer text-fg-3">Tanınmayan sayfalar</summary>
                <div class="mt-1 space-y-0.5 font-mono text-[11px] text-fg-3">
                  ${r.atlananSayfalar.map((s) => `<div>${kacar(s)}</div>`).join('')}
                </div>
              </details>` : ''}
          </div>` : ''}
        ${r.oneriAdet ? `
          <div class="rounded-md border ${r.cozulemeyenIlIlce ? 'border-warn/40 bg-warn/10' : 'border-brand-2/40 bg-brand-dim/40'} p-3 text-[12px]">
            ${svg(r.cozulemeyenIlIlce ? 'uyari' : 'ok', 'inline size-3.5 -mt-0.5')}
            İL-İLÇE raporundaki <b>${r.oneriAdet}</b> kaydın
            <b>${r.oneriAdet - r.cozulemeyenIlIlce}</b> tanesinin ilçesi ekip adından bulundu
            ve işaretlendi.
            ${r.cozulemeyenIlIlce ? `Kalan <b>${r.cozulemeyenIlIlce}</b> kayıt elle işaretlenmeli.` : ''}
            <button class="ml-1 text-brand hover:underline" data-onerigit="${ix}">Önerilere git</button>
          </div>` : ''}
        ${r.eslesmez.length ? `
          <details class="rounded-md border border-warn/40 bg-bg-200 p-3 text-[11.5px]" open>
            <summary class="cursor-pointer text-warn">
              ${r.eslesmez.length} değer hiçbir işletmeyle eşleşmedi — bu kayıtlar işaretlenmedi
            </summary>
            <div class="mt-2 text-fg-3">
              Karşılığını seçip <b>Kural ekle</b> deyin; bir daha sormayacak. Kurallar bu
              bilgisayarda saklanır.
            </div>
            <table class="mt-2 w-full text-[11.5px]">
              <tbody>
                ${r.eslesmez.map((e, ei) => `
                  <tr class="border-t border-line">
                    <td class="py-1.5 pr-2 font-medium">${kacar(e.deger)}
                      <span class="text-fg-3">×${e.adet}</span></td>
                    <td class="py-1.5 pr-2 text-fg-3">${e.oneri
                      ? `<span class="chip border-brand-2/40 text-brand">öneri: ${kacar(e.oneri.ad)}</span>`
                      : kacar(e.sayfa)}</td>
                    <td class="py-1.5 pr-2">
                      <select class="input py-1" data-esec="${ix}-${ei}">
                        <option value="">— işletme seçin —</option>
                      </select>
                    </td>
                    <td class="py-1.5 text-right">
                      <button class="btn btn-sm" data-eekle="${ix}-${ei}"
                              data-deger="${kacar(e.deger)}">Kural ekle</button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </details>` : ''}
        ${r.taninmayan.length ? `
          <div class="text-[11.5px] text-fg-3">Tanınmayan dosyalar: ${r.taninmayan.map(kacar).join(', ')}</div>` : ''}
        ${r.uyarilar.length ? r.uyarilar.map((u) =>
          `<div class="text-[11.5px] text-warn">${kacar(u)}</div>`).join('') : ''}
      </div>
    </div>`;
}

async function gunSonucunuBagla(r, ix) {
  const gunAc = document.querySelector(`[data-gunac="${ix}"]`);
  if (gunAc) gunAc.onclick = () => { D.tarih = r.tarih; git('gunluk'); };
  const o = document.querySelector(`[data-onerigit="${ix}"]`);
  if (o) o.onclick = () => { D.tarih = r.tarih; git('oneri'); };
  if (!r.eslesmez.length) return;

  const isletmeler = await cagir(api.isletmeler());
  const secenekler = isletmeler.map((i) => `<option value="${i.id}">${kacar(i.ad)}</option>`).join('');

  r.eslesmez.forEach((e, ei) => {
    const sec = document.querySelector(`[data-esec="${ix}-${ei}"]`);
    const btn = document.querySelector(`[data-eekle="${ix}-${ei}"]`);
    if (!sec || !btn) return;
    sec.insertAdjacentHTML('beforeend', secenekler);
    if (e.oneri) sec.value = String(e.oneri.isletme_id);
    btn.onclick = async () => {
      if (!sec.value) return bildir('Önce bir işletme seçin.', 'hata');
      try {
        await cagir(api.eslesmeEkle({
          kaynak_deger: btn.dataset.deger, isletme_id: Number(sec.value), tip: 'TAM',
        }));
        btn.textContent = 'Eklendi ✓';
        btn.disabled = true;
        sec.disabled = true;
        bildir('Kural eklendi. Raporu yeniden aktarınca uygulanacak.', 'basari');
      } catch (err) { bildir(kacar(err.message), 'hata'); }
    };
  });
}

async function sayfaGecmis() {
  el('icerik').innerHTML = `
    <div class="min-h-0 flex-1 overflow-auto">
      <div class="card">
        <div class="card-head"><div class="font-medium">Geçmişe yönelik içe aktarma</div></div>
        <div class="space-y-4 p-5">
          <p class="text-[12.5px] text-fg-2">
            Eski <b>geniş</b> Excel tablolarınızı (gün blokları yan yana olan geniş tablo) seçin.
            Tüm ay sayfaları okunur; her gün, işletme ve kategori için işaretler ve
            <span class="text-danger">kırmızı (bekliyor)</span> hücreler veritabanına aktarılır.
          </p>
          <div class="flex items-center gap-3">
            <button class="btn btn-brand" id="gecmisSec">${svg('gecmis', 'size-4')} Tablo Dosyası Seç</button>
            <label class="flex items-center gap-2 text-[12.5px] text-fg-2">
              <input type="checkbox" id="uzerineYaz2" checked class="size-4 accent-[#3ecf8e]" />
              Aynı günler varsa üzerine yaz
            </label>
          </div>
          <label class="flex items-center gap-2 text-[12.5px] text-fg-2">
            <input type="checkbox" id="siralamayiAl" checked class="size-4 accent-[#3ecf8e]" />
            İşletme sıralamasını bu dosyadaki sıraya göre ayarla
            <span class="text-fg-3">— ekranda ve Excel çıktısında bu sıra kullanılır</span>
          </label>
          <div class="rounded-md border border-line bg-bg-200 p-3 text-[11.5px] text-fg-3">
            Aktarım sadece <b>dolu</b> hücreleri kaydeder. Tanınmayan kategori adları atlanır ve
            aşağıda listelenir.
          </div>
        </div>
      </div>
      <div id="gecmisSonuc" class="mt-4"></div>
    </div>`;

  el('gecmisSec').onclick = async () => {
    const dosyalar = await cagir(api.dosyaSec('Geçmiş tablo dosyalarını seçin'));
    if (!dosyalar.length) return;
    const btn = el('gecmisSec');
    btn.disabled = true;
    btn.innerHTML = 'Okunuyor… (büyük dosyalarda biraz sürebilir)';
    el('gecmisSonuc').innerHTML = `<div class="card p-4 text-fg-3">İşleniyor…</div>`;
    try {
      const r = await cagir(api.gecmisAktar(dosyalar, {
        uzerineYaz: el('uzerineYaz2').checked,
        siralamayiAl: el('siralamayiAl').checked,
      }));
      el('gecmisSonuc').innerHTML = `
        <div class="card">
          <div class="card-head"><div class="font-medium">Aktarım tamam</div>
            <button class="btn btn-sm" id="genelGit">Genel bakışa git</button></div>
          <div class="space-y-2 p-4 text-[12.5px]">
            <div>${r.dosyalar.map((d) => `<div>${kacar(d.dosya)} — <b>${d.gun}</b> gün</div>`).join('')}</div>
            <div class="text-fg-2">Toplam <b class="text-brand">${r.toplamKayit}</b> kayıt ·
              <b>${r.gunler.length}</b> gün
              ${r.gunler.length ? `(${tarihYaz(r.gunler[0])} – ${tarihYaz(r.gunler[r.gunler.length - 1])})` : ''}</div>
            ${r.yeniIsletmeler.length ? `<div class="text-warn">Yeni işletme eklendi: ${r.yeniIsletmeler.map(kacar).join(', ')}</div>` : ''}
            ${r.siralandi ? `<div class="text-fg-3">İşletme sıralaması dosyadaki sıraya göre ayarlandı (${r.siralandi} satır).</div>` : ''}
            ${r.uyarilar.length ? `<div class="space-y-0.5 text-[11.5px] text-warn">${r.uyarilar.map((u) => `<div>${kacar(u)}</div>`).join('')}</div>` : ''}
          </div>
        </div>`;
      el('genelGit').onclick = () => git('genel');
      bildir(`${r.toplamKayit} kayıt aktarıldı.`, 'basari');
    } catch (e) {
      el('gecmisSonuc').innerHTML =
        `<div class="card border-danger/40 p-4 text-danger">${kacar(e.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${svg('gecmis', 'size-4')} Tablo Dosyası Seç`;
    }
  };
}

async function sayfaEslesme() {
  const [eslesmeler, isletmeler] = await Promise.all([
    cagir(api.eslesmeler()), cagir(api.isletmeler()),
  ]);

  el('navAraclar').innerHTML =
    `<input id="ara" class="input w-56" placeholder="Ara…" />
     <button class="btn" id="yedekle" title="Tabloyu bilgisayarınıza kaydedin">Yedekle</button>
     <button class="btn" id="geriYukle" title="Yedek dosyasından geri yükleyin">Geri yükle</button>
     <button class="btn btn-brand" id="yeniEslesme">${svg('ekle', 'size-4')} Yeni</button>`;

  const ciz = (liste) => `
    <table class="tbl">
      <thead><tr><th>Kaynak değer</th><th>İşletme</th><th>Tip</th><th class="w-10"></th></tr></thead>
      <tbody>${liste.map((e) => `
        <tr>
          <td class="font-medium">${kacar(e.kaynak_deger)}</td>
          <td class="text-fg-2">${kacar(e.isletme)}</td>
          <td><span class="chip ${e.tip === 'İÇERİR'
            ? 'border-warn/50 text-warn' : 'border-line-2 text-fg-3'}">${e.tip}</span></td>
          <td><button class="btn-ghost btn btn-sm" data-sil="${e.id}">${svg('sil', 'size-3.5')}</button></td>
        </tr>`).join('')}</tbody>
    </table>`;

  el('icerik').innerHTML = `
    <div class="mb-3 shrink-0 text-[12px] text-fg-3">
      Raporlardaki <b>ilçe / il / müdürlük</b> metinlerinin hangi işletmeye yazılacağını belirler.
      <b class="text-fg-2">TAM</b> = birebir eşleşir · <b class="text-warn">İÇERİR</b> = mahalle/köy/ekip metninin içinde aranır.
    </div>
    <div class="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="min-h-0 flex-1 overflow-auto" id="eslesmeTablo">${ciz(eslesmeler)}</div>
    </div>`;

  const baglaSil = () => {
    document.querySelectorAll('[data-sil]').forEach((b) => {
      b.onclick = async () => {
        const yeni = await cagir(api.eslesmeSil(Number(b.dataset.sil)));
        el('eslesmeTablo').innerHTML = ciz(yeni);
        baglaSil();
        bildir('Silindi.', 'basari');
      };
    });
  };
  baglaSil();

  el('ara').oninput = (e) => {
    const q = e.target.value.trim().toLocaleLowerCase('tr');
    el('eslesmeTablo').innerHTML = ciz(eslesmeler.filter((x) =>
      x.kaynak_deger.toLocaleLowerCase('tr').includes(q) ||
      x.isletme.toLocaleLowerCase('tr').includes(q)));
    baglaSil();
  };

  el('yedekle').onclick = async () => {
    try {
      const yol = await cagir(api.eslesmeYedekle());
      if (yol) { bildir(`Yedeklendi:<br><span class="text-fg-3">${kacar(yol)}</span>`, 'basari'); api.klasorAc(yol); }
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  };
  el('geriYukle').onclick = async () => {
    try {
      const r = await cagir(api.eslesmeGeriYukle());
      if (!r) return;
      bildir(`${r.eslesme} eşleştirme, ${r.isletme} yeni işletme yüklendi.`, 'basari');
      sayfaEslesme();
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  };

  el('yeniEslesme').onclick = () => {
    panelAc('Yeni eşleştirme', `
      <div class="space-y-3">
        <div><label class="mb-1 block text-[12px] text-fg-2">Kaynak değer</label>
          <input id="yKaynak" class="input w-full" placeholder="Raporda geçen ilçe / il / müdürlük" /></div>
        <div><label class="mb-1 block text-[12px] text-fg-2">İşletme</label>
          <select id="yIsletme" class="input w-full">
            ${isletmeler.map((i) => `<option value="${i.id}">${kacar(i.ad)}</option>`).join('')}
          </select>
          <div class="mt-1.5 flex gap-2">
            <input id="yYeniIsletme" class="input flex-1" placeholder="Listede yoksa yeni işletme adı" />
            <button class="btn" id="yIsletmeEkle">Ekle</button>
          </div></div>
        <div><label class="mb-1 block text-[12px] text-fg-2">Tip</label>
          <select id="yTip" class="input w-full">
            <option value="TAM">TAM — birebir eşleşir</option>
            <option value="İÇERİR">İÇERİR — metnin içinde aranır</option>
          </select></div>
        <button class="btn btn-brand w-full justify-center" id="yKaydet">Kaydet</button>
      </div>`);

    el('yIsletmeEkle').onclick = async () => {
      const ad = el('yYeniIsletme').value.trim();
      if (!ad) return;
      try {
        const liste = await cagir(api.isletmeEkle(ad));
        el('yIsletme').innerHTML = liste.map((i) =>
          `<option value="${i.id}" ${i.ad === ad ? 'selected' : ''}>${kacar(i.ad)}</option>`).join('');
        el('yYeniIsletme').value = '';
        bildir(`"${kacar(ad)}" eklendi.`, 'basari');
      } catch (e) { bildir(kacar(e.message), 'hata'); }
    };

    el('yKaydet').onclick = async () => {
      const kaynak_deger = el('yKaynak').value.trim();
      if (!kaynak_deger) return bildir('Kaynak değer boş olamaz.', 'hata');
      try {
        await cagir(api.eslesmeEkle({
          kaynak_deger, isletme_id: Number(el('yIsletme').value), tip: el('yTip').value,
        }));
        panelKapat();
        bildir('Eklendi.', 'basari');
        sayfaEslesme();
      } catch (e) { bildir(kacar(e.message), 'hata'); }
    };
  };
}

async function sayfaOneri() {
  const oneriler = await cagir(api.oneriler(D.tarih || undefined));
  el('navAraclar').innerHTML = `
    <input type="date" id="oTarih" value="${D.tarih || ''}" class="input" />
    <button class="btn" id="oHepsi">Tümü</button>`;
  el('oTarih').onchange = (e) => { D.tarih = e.target.value; sayfaOneri(); };
  el('oHepsi').onclick = () => { D.tarih = null; sayfaOneri(); };

  el('icerik').innerHTML = `
    <div class="mb-3 shrink-0 text-[12px] text-fg-3">
      İL-İLÇE raporunda il/ilçe bilgisi gelmeyen kayıtlar. İlçe, <b>ekip</b> (yoksa şebeke
      unsuru) metninden çıkarılır; bulunanlar İL-İLÇE sütununa <b>işaretlenmiştir</b>.
      <span class="text-danger">?</span> olanlar işaretlenmedi —
      <button class="text-brand hover:underline" id="gunlugeGit2">Günlük Takip</button>
      ekranından elle koyun. Sık geçen bir ekip adı varsa Eşleştirme'ye
      <b>İÇERİR</b> kuralı ekleyerek kalıcı çözebilirsiniz.
    </div>
    <div class="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="min-h-0 flex-1 overflow-auto">
        <table class="tbl">
          <thead><tr><th>Tarih</th><th>Kod No</th><th>Tahmin</th><th>Ekip</th><th>Şebeke unsuru</th></tr></thead>
          <tbody>${oneriler.map((o) => `
            <tr>
              <td class="whitespace-nowrap">${tarihYaz(o.tarih)}</td>
              <td class="font-mono text-[11.5px]">${kacar(o.kod_no)}</td>
              <td><span class="chip ${o.tahmin === '?'
                ? 'border-danger/50 text-danger' : 'border-brand-2/50 text-brand'}">${kacar(o.tahmin)}</span></td>
              <td class="text-fg-2">${kacar(o.ekip)}</td>
              <td class="text-fg-3">${kacar(o.unsur)}</td>
            </tr>`).join('') ||
            '<tr><td colspan="5" class="py-10 text-center text-fg-3">Kayıt yok</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
  el('gunlugeGit2').onclick = () => git('gunluk');
}

const V_KODLAR = [
  { kod: 'A', ad: 'A · 07:00-15:00', renk: '#3b82f6' },
  { kod: 'B', ad: 'B · 15:00-23:00', renk: '#f59e0b' },
  { kod: 'C', ad: 'C · 23:00-07:00', renk: '#22c55e' },
  { kod: 'R.T', ad: 'Resmî tatil', renk: '#f0525b' },
  { kod: 'Yİ', ad: 'Yıllık izin', renk: '#a78bfa' },
  { kod: 'Sİ', ad: 'Sendikal izin', renk: '#06b6d4' },
  { kod: 'Fİ', ad: 'Fazla çalışma izni', renk: '#94a3b8' },
  { kod: '', ad: 'Boş / sil', renk: 'transparent' },
];
const V_RENK = new Map(V_KODLAR.map((k) => [k.kod, k.renk]));

function vAyGun(ay) {
  const [y, a] = ay.split('-').map(Number);
  return new Date(Date.UTC(y, a, 0)).getUTCDate();
}

function vGunAdi(ay, gun) {
  const [y, a] = ay.split('-').map(Number);
  return ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'][new Date(Date.UTC(y, a - 1, gun)).getUTCDay()];
}

function vVardiyalari(ekip) {
  const l = String(ekip.vardiyalar || 'A,B').split(',').map((x) => x.trim()).filter(Boolean);
  return l.length ? l : ['A', 'B'];
}

async function sayfaVardiya() {
  if (!D.vardiyaAy) {
    const aylar = await cagir(api.vardiyaAylar());
    const b = new Date();
    D.vardiyaAy = aylar.length ? aylar[0].ay
      : `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, '0')}`;
  }
  if (!D.vFirca) D.vFirca = 'A';

  const veri = await cagir(api.vardiyaAyVerisi(D.vardiyaAy));
  D.vardiyaVeri = veri;

  el('navAraclar').innerHTML = `
    <input type="month" id="vAy" value="${D.vardiyaAy}" class="input" />
    <button class="btn btn-sm" id="vIceAktar">${svg('aktar', 'size-3.5')} İçe aktar</button>
    <button class="btn btn-sm btn-brand" id="vExcel">${svg('excel', 'size-3.5')} Excel'e aktar</button>`;
  el('vAy').onchange = (e) => { D.vardiyaAy = e.target.value; sayfaVardiya(); };
  el('vExcel').onclick = async () => {
    try {
      const yol = await cagir(api.vardiyaExcel(D.vardiyaAy));
      if (!yol) return;
      bildir(`<b>Vardiya tablosu kaydedildi.</b><br>${kacar(yol)}`, 'basari');
      api.klasorAc(yol);
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  };
  el('vIceAktar').onclick = async () => {
    const dosyalar = await cagir(api.dosyaSec('Vardiya Excel dosyalarını seçin'));
    if (!dosyalar.length) return;
    try {
      const r = await cagir(api.vardiyaAktar(dosyalar));
      bildir(`<b>${r.aylar.length} ay aktarıldı.</b><br>`
        + `${r.ekipler.join(', ')} · ${r.personel} yeni personel · ${r.kayit} kayıt`
        + (r.farkli.length ? `<br>Standart dışı kod: ${kacar(r.farkli.join(', '))}` : ''), 'basari');
      if (r.aylar.length) D.vardiyaAy = r.aylar[r.aylar.length - 1];
      sayfaVardiya();
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  };

  if (!veri.ekipler.length) {
    el('icerik').innerHTML = `
      <div class="card flex flex-col items-center gap-3 p-12 text-center">
        <div class="text-fg-2">Henüz ekip yok.</div>
        <div class="text-[12px] text-fg-3">Mevcut vardiya Excel'inizi içe aktarın ya da elle ekip oluşturun.</div>
        <div class="mt-2 flex gap-2">
          <button class="btn btn-brand" id="vBosAktar">${svg('aktar', 'size-4')} Excel'den içe aktar</button>
          <button class="btn" id="vBosEkip">Ekip ekle</button>
        </div>
      </div>`;
    el('vBosAktar').onclick = () => el('vIceAktar').click();
    el('vBosEkip').onclick = vEkipEkle;
    return;
  }

  const gun = vAyGun(D.vardiyaAy);
  const gunler = Array.from({ length: gun }, (_, i) => i + 1);

  const firca = V_KODLAR.map((k) => `
    <button class="chip ${D.vFirca === k.kod ? 'ring-1 ring-brand' : ''}"
            style="border-color:${k.renk === 'transparent' ? 'var(--color-line-2)' : k.renk};
                   color:${k.renk === 'transparent' ? 'var(--color-fg-3)' : k.renk}"
            data-firca="${k.kod}" title="${kacar(k.ad)}">${k.kod || 'boş'}</button>`).join('');

  const bloklar = veri.ekipler.map((ekip) => {
    const kisiler = veri.personeller.filter((p) => p.ekip_id === ekip.id);
    const kayit = new Map();
    for (const k of veri.kayitlar) kayit.set(`${k.personel_id}|${k.gun}`, k.kod);

    const baslik = gunler.map((g) => {
      const hs = ['Ct', 'Pz'].includes(vGunAdi(D.vardiyaAy, g));
      return `<th class="v-gun ${hs ? 'v-hafta' : ''}">
        <div>${g}</div><div class="text-[8px] font-normal opacity-60">${vGunAdi(D.vardiyaAy, g)}</div></th>`;
    }).join('');

    const satirlar = kisiler.map((p) => `
      <tr>
        <td class="v-ad" title="${kacar(p.ad)}">
          <span class="flex items-center justify-between gap-1">
            <span class="truncate">${kacar(p.ad)}</span>
            <button class="v-sil" data-psil="${p.id}" title="Personeli sil">×</button>
          </span>
        </td>
        ${gunler.map((g) => {
          const kod = kayit.get(`${p.id}|${g}`) || '';
          const renk = V_RENK.get(kod);
          const bilinen = V_RENK.has(kod);
          return `<td class="v-h ${['Ct', 'Pz'].includes(vGunAdi(D.vardiyaAy, g)) ? 'v-hafta' : ''}"
                      data-p="${p.id}" data-g="${g}"
                      style="${kod && bilinen ? `background:${renk}22;color:${renk}` : ''}"
                      title="${kacar(p.ad)} · ${g}${kod && !bilinen ? ' · ' + kacar(kod) : ''}"
                  >${bilinen ? kacar(kod) : '!'}</td>`;
        }).join('')}
      </tr>`).join('');

    const sayimlar = vVardiyalari(ekip).map((v) => `
      <tr class="v-sayim">
        <td class="v-ad text-[10px]">${v}: ${v === 'A' ? '07:00-15:00' : v === 'B' ? '15:00-23:00' : '23:00-07:00'}</td>
        ${gunler.map((g) => {
          const n = kisiler.filter((p) => kayit.get(`${p.id}|${g}`) === v).length;
          return `<td class="v-h" data-sayim="${ekip.id}-${v}-${g}">${n || ''}</td>`;
        }).join('')}
      </tr>`).join('');

    return `
      <div class="card mb-4">
        <div class="card-head">
          <div class="flex items-center gap-2">
            <div class="font-medium">${kacar(ekip.ad)}</div>
            <span class="chip border-line-2 text-fg-3">${kisiler.length} kişi · ${ekip.vardiyalar}</span>
          </div>
          <div class="flex gap-1">
            <button class="btn btn-sm" data-pekle="${ekip.id}">${svg('ekle', 'size-3.5')} Personel</button>
            <button class="btn btn-sm" data-vekip="${ekip.id}" data-v="${kacar(ekip.vardiyalar)}">Vardiyalar</button>
            <button class="btn btn-sm" data-esil="${ekip.id}" data-ead="${kacar(ekip.ad)}">${svg('sil', 'size-3.5')}</button>
          </div>
        </div>
        <div class="overflow-auto">
          <table class="v-tablo">
            <thead><tr><th class="v-ad">Personel</th>${baslik}</tr></thead>
            <tbody>${satirlar}${sayimlar}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');

  el('icerik').innerHTML = `
    <div class="mb-3 flex shrink-0 flex-wrap items-center gap-2">
      <span class="text-[12px] text-fg-3">Fırça:</span>
      ${firca}
      <span class="ml-2 text-[11.5px] text-fg-3">
        Kod seç, hücrelere tıkla ya da sürükleyerek boya · alttaki sayılar kendiliğinden güncellenir</span>
      <button class="btn btn-sm ml-auto" id="vEkipEkle">${svg('ekle', 'size-3.5')} Ekip ekle</button>
    </div>
    <div class="min-h-0 flex-1 overflow-auto">${bloklar}</div>`;

  el('icerik').querySelectorAll('[data-firca]').forEach((b) => {
    b.onclick = () => { D.vFirca = b.dataset.firca; sayfaVardiya(); };
  });
  el('vEkipEkle').onclick = vEkipEkle;

  el('icerik').querySelectorAll('[data-pekle]').forEach((b) => {
    b.onclick = async () => {
      const ad = prompt('Personel adı:');
      if (!ad || !ad.trim()) return;
      try {
        await cagir(api.vardiyaPersonelEkle(Number(b.dataset.pekle), ad.trim()));
        sayfaVardiya();
      } catch (e) { bildir(kacar(e.message), 'hata'); }
    };
  });
  el('icerik').querySelectorAll('[data-psil]').forEach((b) => {
    b.onclick = async (ev) => {
      ev.stopPropagation();
      if (!confirm('Personel ve bütün vardiya kayıtları silinecek. Emin misiniz?')) return;
      await cagir(api.vardiyaPersonelSil(Number(b.dataset.psil)));
      sayfaVardiya();
    };
  });
  el('icerik').querySelectorAll('[data-esil]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm(`"${b.dataset.ead}" ekibi, personeli ve tüm kayıtları silinecek. Emin misiniz?`)) return;
      await cagir(api.vardiyaEkipSil(Number(b.dataset.esil)));
      sayfaVardiya();
    };
  });
  el('icerik').querySelectorAll('[data-vekip]').forEach((b) => {
    b.onclick = async () => {
      const v = prompt('Bu ekipteki vardiyalar (virgülle):', b.dataset.v);
      if (v == null) return;
      await cagir(api.vardiyaEkipGuncelle(Number(b.dataset.vekip), { vardiyalar: v }));
      sayfaVardiya();
    };
  });

  let boyuyor = false;
  const boya = async (td) => {
    if (!td || td.dataset.p === undefined) return;
    const pid = Number(td.dataset.p), g = Number(td.dataset.g);
    const kod = D.vFirca;
    if (td.textContent === kod && !!kod) return;
    td.textContent = kod;
    const renk = V_RENK.get(kod);
    td.style.background = kod ? `${renk}22` : '';
    td.style.color = kod ? renk : '';
    try {
      await cagir(api.vardiyaYaz(D.vardiyaAy, pid, g, kod));
      vSayimTazele();
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  };

  el('icerik').querySelectorAll('.v-h[data-p]').forEach((td) => {
    td.onmousedown = (e) => { e.preventDefault(); boyuyor = true; boya(td); };
    td.onmouseenter = () => { if (boyuyor) boya(td); };
  });
  document.addEventListener('mouseup', () => { boyuyor = false; }, { once: true });
}

function vSayimTazele() {
  const veri = D.vardiyaVeri;
  if (!veri) return;
  for (const ekip of veri.ekipler) {
    const kisiler = veri.personeller.filter((p) => p.ekip_id === ekip.id);
    for (const v of vVardiyalari(ekip)) {
      for (let g = 1; g <= vAyGun(D.vardiyaAy); g++) {
        const hedef = el('icerik').querySelector(`[data-sayim="${ekip.id}-${v}-${g}"]`);
        if (!hedef) continue;
        let n = 0;
        for (const p of kisiler) {
          const td = el('icerik').querySelector(`.v-h[data-p="${p.id}"][data-g="${g}"]`);
          if (td && td.textContent === v) n++;
        }
        hedef.textContent = n || '';
      }
    }
  }
}

async function vEkipEkle() {
  const ad = prompt('Ekip adı:');
  if (!ad || !ad.trim()) return;
  const v = prompt('Vardiyalar (virgülle):', 'A,B');
  if (v == null) return;
  try {
    await cagir(api.vardiyaEkipEkle(ad.trim(), v.trim() || 'A,B'));
    sayfaVardiya();
  } catch (e) { bildir(kacar(e.message), 'hata'); }
}

const WA_ASAMA = {
  kapali:     { ad: 'Bağlı değil',  renk: 'text-fg-3',   ikon: 'uyari' },
  baglaniyor: { ad: 'Bağlanıyor…',  renk: 'text-warn',   ikon: 'yenile' },
  qr:         { ad: 'QR bekleniyor', renk: 'text-warn',  ikon: 'wa' },
  bagli:      { ad: 'Bağlı',        renk: 'text-brand',  ikon: 'ok' },
  hata:       { ad: 'Hata',         renk: 'text-danger', ikon: 'uyari' },
};

async function sayfaWhatsapp() {
  const d = await cagir(api.waDurum());
  D.waDurum = d;
  waCiz(d);
  if (!D.waBagli) {
    D.waBagli = true;
    api.waDinle((yeni) => {
      D.waDurum = yeni;
      if (D.sayfa === 'whatsapp') waCiz(yeni);
    });
  }
}

function waCiz(d) {
  const a = WA_ASAMA[d.asama] || WA_ASAMA.kapali;
  el('navAraclar').innerHTML = `
    <span class="chip ${a.renk} border-line-2">${svg(a.ikon, 'size-3.5')} ${a.ad}</span>`;

  const govde = d.asama === 'bagli'
    ? `
      <div class="flex flex-col items-center gap-3 py-8">
        <span class="text-brand">${svg('ok', 'size-10')}</span>
        <div class="text-[15px] font-medium">WhatsApp bağlı</div>
        <div class="text-[12.5px] text-fg-2">
          ${d.numara ? `+${kacar(d.numara)}` : ''} ${d.ad ? `· ${kacar(d.ad)}` : ''}
        </div>
        <div class="text-[11.5px] text-fg-3">
          Oturum bu bilgisayarda saklanıyor; programı kapatıp açsanız da bağlı kalır.
        </div>
      </div>`
    : d.asama === 'qr' && d.qr
      ? `
      <div class="flex flex-col items-center gap-3 py-6">
        <img src="${d.qr}" alt="QR" class="rounded-lg bg-white p-2" style="width:280px;height:280px" />
        <div class="text-[12.5px] text-fg-2">Telefonda WhatsApp → <b>Bağlı cihazlar</b> → <b>Cihaz bağla</b></div>
        <div class="text-[11.5px] text-fg-3">Kod birkaç dakikada bir yenilenir, beklemeniz yeterli.</div>
      </div>`
      : `
      <div class="flex flex-col items-center gap-3 py-10 text-center">
        <span class="${a.renk}">${svg(a.ikon, 'size-9')}</span>
        <div class="text-[14px] font-medium">${a.ad}</div>
        <div class="text-[12px] text-fg-3">
          ${d.asama === 'baglaniyor'
            ? 'Sunucuya bağlanılıyor…'
            : d.oturumVar
              ? 'Kayıtlı bir oturum var. “Bağlan” deyin.'
              : '“Bağlan” deyince QR kodu çıkacak.'}
        </div>
      </div>`;

  el('icerik').innerHTML = `
    <div class="min-h-0 flex-1 overflow-auto">
      <div class="card">
        <div class="card-head">
          <div class="font-medium">WhatsApp oturumu</div>
          <div class="flex gap-2">
            ${d.asama === 'bagli' || d.asama === 'qr' || d.asama === 'baglaniyor'
              ? `<button class="btn btn-sm" id="waDurdur">Bağlantıyı kes</button>` : ''}
            ${d.asama !== 'bagli'
              ? `<button class="btn btn-sm btn-brand" id="waBaslat">${svg('yenile', 'size-3.5')} Bağlan</button>` : ''}
            ${d.oturumVar
              ? `<button class="btn btn-sm" id="waCikis">${svg('sil', 'size-3.5')} Oturumu sil</button>` : ''}
          </div>
        </div>
        <div class="p-5">
          ${govde}
          ${d.hata ? `
            <div class="mt-2 rounded-md border border-warn/40 bg-warn/10 p-3 text-[12px]">
              ${svg('uyari', 'inline size-3.5 -mt-0.5')} ${kacar(d.hata)}
            </div>` : ''}
        </div>
      </div>

      ${waOrtakBolumu(d)}

      <div class="card mt-4">
        <div class="card-head">
          <div class="font-medium">Gruplar</div>
          <button class="btn btn-sm" id="waGrupTazele" ${d.asama === 'bagli' ? '' : 'disabled'}>
            ${svg('yenile', 'size-3.5')} Grupları getir</button>
        </div>
        <div class="max-h-80 overflow-y-auto p-3" id="waGrupKutu"></div>
      </div>

      ${waGonderBolumu(d.asama === 'bagli')}

      <div class="card mt-4">
        <div class="card-head">
          <div class="font-medium">Gelen mesaj komutları</div>
          <button class="btn btn-sm" id="waHavaDene">Hava durumunu dene</button>
        </div>
        <div class="space-y-3 p-5">
          <div class="text-[12px] text-fg-2">
            Aşağıdaki numaralardan <b>“hava durumu”</b> yazan bir mesaj gelirse, Bursa ve
            17 ilçesinin Meteoroloji verisi çekilip aynı sohbete yanıt olarak gönderilir.
            Başka numaralara ve başka metinlere cevap verilmez.
          </div>
          <div class="text-[12px] text-fg-2">
            <b>“rapor gönder”</b> komutu ayrı çalışır: yalnızca <b>Ayarlar → Rapor portalı</b>
            bölümünde kullanıcı adı ve şifresi tanımlı numaralar kullanabilir, grup
            sohbetlerinde çalışmaz. Onay kodu aynı sohbetten sorulur.
          </div>
          <div class="flex items-end gap-2">
            <label class="flex flex-1 flex-col gap-1">
              <span class="text-[11px] text-fg-3">İzinli numaralar (virgülle, ülke koduyla)</span>
              <input type="text" id="waIzinli" class="input" placeholder="905388179495" />
            </label>
            <button class="btn" id="waIzinliKaydet">Kaydet</button>
          </div>
          <div id="waHavaSonuc"></div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-head"><div class="font-medium">Bilinmesi gerekenler</div></div>
        <div class="space-y-2 p-5 text-[12px] text-fg-2">
          <div>· Oturum dosyaları: <span class="font-mono text-[11px] text-fg-3">${kacar(d.yol || '')}</span></div>
          <div>· “Oturumu sil” hem buradaki kaydı siler hem de telefondaki bağlı cihaz listesinden düşürür.</div>
          <div>· Bu bağlantı WhatsApp'ın resmî iş API'si değil, telefonunuza bağlı cihaz olarak çalışır.
                 Toplu/otomatik mesajda aşırıya kaçmak numaranın kapatılmasına yol açabilir.</div>
        </div>
      </div>
    </div>`;

  waGruplariCiz();
  waGonderBagla(d.asama === 'bagli');
  waKomutBagla();

  const bagla = (id, fn) => { const b = el(id); if (b) b.onclick = fn; };
  bagla('waGrupTazele', async () => {
    const b = el('waGrupTazele');
    b.disabled = true;
    try {
      const g = await cagir(api.waGruplariTazele());
      bildir(`<b>${g.length} grup bulundu.</b>`, 'basari');
      waGruplariCiz();
    } catch (e) { bildir(kacar(e.message), 'hata'); }
    finally { b.disabled = false; }
  });
  bagla('waBaslat', async () => {
    el('waBaslat').disabled = true;
    try { waCiz(await cagir(api.waBaslat(false))); }
    catch (e) { bildir(kacar(e.message), 'hata'); waCiz(D.waDurum); }
  });
  bagla('waZorla', async () => {
    if (!confirm('Oturum başka bir bilgisayarda açık görünüyor. '
      + 'Yine de bu bilgisayara alınsın mı?')) return;
    try { waCiz(await cagir(api.waBaslat(true))); }
    catch (e) { bildir(kacar(e.message), 'hata'); waCiz(D.waDurum); }
  });
  const ortakKutu = el('waOrtak');
  if (ortakKutu) {
    ortakKutu.onchange = async () => {
      try {
        await cagir(api.waOrtakOturum(ortakKutu.checked));
        bildir(ortakKutu.checked
          ? 'Oturum ortak klasöre alındı. Yeniden QR okutmanız gerekebilir.'
          : 'Oturum bu bilgisayara özel yapıldı.', 'basari');
        waCiz(await cagir(api.waDurum()));
      } catch (e) {
        bildir(kacar(e.message), 'hata');
        ortakKutu.checked = !ortakKutu.checked;
      }
    };
  }
  bagla('waDurdur', async () => { waCiz(await cagir(api.waDurdur())); });
  bagla('waCikis', async () => {
    if (!confirm('Kayıtlı WhatsApp oturumu silinecek. Yeniden QR okutmanız gerekir. Emin misiniz?')) return;
    try {
      waCiz(await cagir(api.waCikis()));
      bildir('Oturum silindi.', 'basari');
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  });
}

function waOrtakBolumu(d) {
  const s = d.sahiplik || {};
  const baskasinda = s.ortakMi && s.taze && !s.benMiyim;
  return `
    <div class="card mt-4">
      <div class="card-head">
        <div>
          <div class="font-medium">Oturumu ortak kullan</div>
          <div class="text-[11.5px] text-fg-3">
            Oturum dosyaları ortak klasörde durur, her bilgisayar aynı bağlantıyı kullanır</div>
        </div>
        <span class="chip ${s.ortakMi ? 'border-brand-2/50 text-brand' : 'border-line-2 text-fg-3'}"
          >${s.ortakMi ? 'ortak' : 'bu bilgisayara özel'}</span>
      </div>
      <div class="space-y-3 p-5 text-[12.5px]">
        <label class="flex items-center gap-2 ${s.ortakKlasorVar ? '' : 'opacity-50'}">
          <input type="checkbox" id="waOrtak" class="size-4 accent-[#3ecf8e]"
                 ${s.ortakMi ? 'checked' : ''} ${s.ortakKlasorVar ? '' : 'disabled'} />
          <span>WhatsApp oturumunu ortak klasörde tut</span>
        </label>
        ${s.ortakKlasorVar ? '' : `<div class="text-[11.5px] text-warn">
          ${svg('uyari', 'inline size-3.5 -mt-0.5')}
          Önce Ayarlar'dan ortak klasörü seçin.</div>`}
        <div class="flex justify-between gap-4">
          <span class="shrink-0 text-fg-2">Oturum klasörü</span>
          <span class="truncate font-mono text-[11px] text-fg-3">${kacar(s.klasor || d.yol || '')}</span>
        </div>
        ${s.ortakMi ? `
          <div class="flex justify-between gap-4">
            <span class="shrink-0 text-fg-2">Şu an kimde</span>
            <span class="text-right">${s.sahip
              ? `<span class="${s.benMiyim ? 'text-brand' : s.taze ? 'text-warn' : 'text-fg-3'}"
                   >${kacar(s.sahip)}${s.benMiyim ? ' (bu bilgisayar)' : ''}</span>
                 <span class="text-fg-3">· ${s.dakika} dk önce bildirdi</span>`
              : '<span class="text-fg-3">boşta</span>'}</span>
          </div>
          ${baskasinda ? `
            <div class="rounded-md border border-warn/40 bg-warn/10 p-3">
              <div class="mb-2">Oturum <b>${kacar(s.sahip)}</b> bilgisayarında açık görünüyor.
                Aynı oturuma iki bilgisayardan bağlanmak bağlantıyı düşürür.</div>
              <button class="btn btn-sm" id="waZorla">Yine de bu bilgisayara al</button>
            </div>` : ''}
          <div class="rounded-md border border-line bg-bg-200 p-3 text-[12px] text-fg-3">
            Bir anda yalnızca <b class="text-fg-2">bir bilgisayar</b> bağlanabilir; diğerleri
            oturumun kimde olduğunu görür. Bağlantıyı kesince sıra boşa çıkar, 5 dakika ses
            çıkmazsa da başka bilgisayar devralabilir.
          </div>` : ''}
      </div>
    </div>`;
}

async function waKomutBagla() {
  const kutu = el('waIzinli');
  if (!kutu) return;
  try { kutu.value = await cagir(api.waIzinliler()); } catch { }

  el('waIzinliKaydet').onclick = async () => {
    try {
      kutu.value = await cagir(api.waIzinlileriYaz(kutu.value));
      bildir('İzinli numaralar kaydedildi.', 'basari');
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  };

  el('waHavaDene').onclick = async () => {
    const b = el('waHavaDene');
    b.disabled = true;
    el('waHavaSonuc').innerHTML =
      `<div class="rounded-md border border-line bg-bg-200 p-3 text-[12px] text-fg-3">Meteoroloji'den alınıyor…</div>`;
    try {
      const metin = await cagir(api.havaDenemesi());
      el('waHavaSonuc').innerHTML = `
        <div class="rounded-md border border-brand-2/40 bg-bg-200 p-3">
          <div class="mb-1 text-[11px] text-fg-3">Mesaj olarak böyle gidecek:</div>
          <pre class="whitespace-pre-wrap font-mono text-[11px] text-fg-2">${kacar(metin)}</pre>
        </div>`;
    } catch (e) {
      el('waHavaSonuc').innerHTML =
        `<div class="rounded-md border border-danger/40 bg-danger/10 p-3 text-[12px] text-danger">${kacar(e.message)}</div>`;
    } finally { b.disabled = false; }
  };
}

async function waGruplariCiz() {
  const kutu = el('waGrupKutu');
  if (!kutu) return;
  const gruplar = await cagir(api.waGruplar());
  D.waGruplar = gruplar;
  const secili = gruplar.filter((g) => g.secili).length;

  el('waSeciliSayi').textContent = secili ? `${secili} grup seçili` : 'grup seçilmedi';

  if (!gruplar.length) {
    kutu.innerHTML = `<div class="py-6 text-center text-[12px] text-fg-3">
      Henüz liste yok. <b>Grupları getir</b> deyin.</div>`;
    return;
  }

  kutu.innerHTML = gruplar.map((g) => `
    <label class="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-panel-2">
      <span class="flex min-w-0 items-center gap-2">
        <input type="checkbox" class="size-4 shrink-0 accent-[#3ecf8e]"
               data-grup="${kacar(g.jid)}" ${g.secili ? 'checked' : ''} />
        <span class="truncate text-[12.5px]">${kacar(g.ad)}</span>
      </span>
      <span class="shrink-0 text-[11px] text-fg-3">${g.katilimci} kişi</span>
    </label>`).join('');

  kutu.querySelectorAll('[data-grup]').forEach((c) => {
    c.onchange = async () => {
      try {
        await cagir(api.waGrupSec(c.dataset.grup, c.checked));
        waGruplariCiz();
      } catch (e) { bildir(kacar(e.message), 'hata'); }
    };
  });
}

function waGonderBolumu(bagli) {
  const b = new Date();
  const buAy = `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, '0')}`;
  const bugun = D.tarih || `${buAy}-${String(b.getDate()).padStart(2, '0')}`;
  return `
    <div class="card mt-4">
      <div class="card-head">
        <div class="font-medium">Gruplara gönder</div>
        <span id="waSeciliSayi" class="text-[11.5px] text-fg-3"></span>
      </div>
      <div class="space-y-3 p-5">
        <div class="flex flex-wrap items-end gap-2">
          <label class="flex flex-col gap-1">
            <span class="text-[11px] text-fg-3">Ne gönderilsin</span>
            <select id="waTur" class="input">
              <option value="icmal-gun">Günlük tablo</option>
              <option value="icmal-ay">Aylık tablo</option>
              <option value="vardiya">Vardiya çizelgesi</option>
            </select>
          </label>
          <label class="flex flex-col gap-1" id="waTarihKutu">
            <span class="text-[11px] text-fg-3">Gün</span>
            <input type="date" id="waTarih" value="${bugun}" class="input" />
          </label>
          <label class="flex flex-col gap-1 hidden" id="waAyKutu">
            <span class="text-[11px] text-fg-3">Ay</span>
            <input type="month" id="waAy" value="${buAy}" class="input" />
          </label>
          <label class="flex flex-1 flex-col gap-1" style="min-width:200px">
            <span class="text-[11px] text-fg-3">Mesaja not (isteğe bağlı)</span>
            <input type="text" id="waNot" class="input" placeholder="Dosyanın altına eklenir" />
          </label>
          <button class="btn btn-brand" id="waGonderBtn" ${bagli ? '' : 'disabled'}>
            ${svg('wa', 'size-4')} Gönder</button>
        </div>
        ${bagli ? '' : `<div class="text-[11.5px] text-warn">
          ${svg('uyari', 'inline size-3.5 -mt-0.5')} Göndermek için önce WhatsApp'a bağlanın.</div>`}
        <div id="waGonderSonuc"></div>
      </div>
    </div>`;
}

function waGonderBagla(bagli) {
  const tur = el('waTur');
  if (!tur) return;
  const tazele = () => {
    const gunluk = tur.value === 'icmal-gun';
    el('waTarihKutu').classList.toggle('hidden', !gunluk);
    el('waAyKutu').classList.toggle('hidden', gunluk);
  };
  tur.onchange = tazele;
  tazele();

  const btn = el('waGonderBtn');
  if (!btn || !bagli) return;
  btn.onclick = async () => {
    const secili = (D.waGruplar || []).filter((g) => g.secili);
    if (!secili.length) return bildir('Önce grup seçin.', 'hata');
    if (!confirm(`${secili.length} gruba gönderilecek:\n\n${secili.map((g) => '· ' + g.ad).join('\n')}\n\nDevam?`)) return;

    btn.disabled = true;
    const eski = btn.innerHTML;
    el('waGonderSonuc').innerHTML =
      `<div class="rounded-md border border-line bg-bg-200 p-3 text-[12px] text-fg-3">Gönderiliyor…</div>`;
    try {
      const r = await cagir(api.waGonder({
        tur: el('waTur').value,
        tarih: el('waTarih').value,
        ay: el('waAy').value,
        not: el('waNot').value,
      }));
      const basarili = r.ayrinti.filter((x) => x.ok).length;
      el('waGonderSonuc').innerHTML = `
        <div class="rounded-md border ${basarili === r.ayrinti.length ? 'border-brand-2/50 bg-brand-dim/40' : 'border-warn/40 bg-warn/10'} p-3 text-[12px]">
          <div class="mb-1 font-medium">${kacar(r.dosya)} → ${basarili}/${r.ayrinti.length} grup</div>
          ${r.ayrinti.map((x) => `<div class="${x.ok ? 'text-fg-2' : 'text-danger'}">
            ${x.ok ? '✓' : '✗'} ${kacar(x.ad)}${x.hata ? ' — ' + kacar(x.hata) : ''}</div>`).join('')}
        </div>`;
      bildir(basarili
        ? `<b>Gönderildi.</b><br>${basarili} grup`
        : '<b>Gönderilemedi.</b><br>Ayrıntı ekranda', basarili ? 'basari' : 'hata');
    } catch (e) {
      el('waGonderSonuc').innerHTML =
        `<div class="rounded-md border border-danger/40 bg-danger/10 p-3 text-[12px] text-danger">${kacar(e.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = eski;
    }
  };
}

function portalKarti(ayar, hesaplar) {
  const alan = (id, etiket, deger, tur = 'text', ipucu = '') => `
    <label class="flex flex-col gap-1">
      <span class="text-[11px] text-fg-3">${etiket}</span>
      <input type="${tur}" id="${id}" class="input" value="${kacar(deger == null ? '' : deger)}"
             placeholder="${kacar(ipucu)}" />
    </label>`;

  return `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="font-medium">Rapor portalı</div>
          <div class="text-[11.5px] text-fg-3">
            Tanımlı numaralardan “rapor gönder” yazılınca portala girilip rapor indirilir</div>
        </div>
        <span class="chip border-line-2 text-fg-3" id="portalRozet">
          ${hesaplar.length} numara</span>
      </div>

      <div class="grid gap-3 border-b border-line p-5 md:grid-cols-2">
        ${alan('pGiris', 'Giriş sayfası adresi', ayar.girisUrl, 'text', 'https://…/Login.aspx')}
        ${alan('pAna', 'Ana sayfa adresi', ayar.anaUrl, 'text', 'https://…/default.aspx')}
        ${alan('pRapor', 'Rapor adı (listede yazdığı gibi)', ayar.raporAdi, 'text', '')}
        ${alan('pSaat', 'Saat', ayar.saat, 'text', '01:00')}
        ${alan('pGunGeri', 'Başlangıç kaç gün geriden', ayar.gunGeri, 'number', '1')}
        ${alan('pOnaySn', 'Onay kodu bekleme (saniye)', ayar.onaySn, 'number', '180')}
        <label class="flex items-center gap-2 text-[12.5px] text-fg-2">
          <input type="checkbox" id="pGorunur" class="size-4 accent-[#3ecf8e]"
                 ${ayar.gorunur ? 'checked' : ''} /> Tarayıcı penceresi görünsün
        </label>
        <label class="flex items-center gap-2 text-[12.5px] text-fg-2">
          <input type="checkbox" id="pKapat" class="size-4 accent-[#3ecf8e]"
                 ${ayar.kapat ? 'checked' : ''} /> İş bitince pencere kapansın
        </label>
        <details class="md:col-span-2">
          <summary class="cursor-pointer text-[11.5px] text-fg-3">Menü yolları (gelişmiş)</summary>
          <div class="mt-2 grid gap-3 md:grid-cols-2">
            ${alan('pMenu', 'Raporlar menüsü XPath', ayar.menuXpath)}
            ${alan('pAltMenu', 'Raporlar alt menüsü XPath', ayar.altMenuXpath)}
          </div>
        </details>
        <div class="flex items-center gap-2 md:col-span-2">
          <button class="btn btn-brand" id="pAyarKaydet">Ayarları kaydet</button>
          <button class="btn" id="pKlasor">Kayıt klasörünü aç</button>
          <span class="text-[11.5px] ${ayar.kasaVar ? 'text-fg-3' : 'text-warn'}">
            ${ayar.kasaVar
              ? (ayar.ortakAnahtar
                ? 'Şifreler ortak klasördeki anahtarla şifrelenir; bu ayarlar ve numaralar '
                  + 'diğer bilgisayarlara da eşitlenir.'
                : 'Şifreler bu bilgisayarın kasasında şifrelenir. Ortak klasör seçilirse '
                  + 'diğer bilgisayarlarda da açılacak şekilde yeniden şifrelenir.')
              : 'Bu bilgisayarda işletim sistemi kasası yok — şifreler düz metin saklanır.'}
          </span>
        </div>
      </div>

      <div class="border-b border-line">
        <table class="tbl">
          <thead><tr>
            <th class="w-40">Numara</th><th>Ad</th><th>Kullanıcı adı</th>
            <th>Yeni şifre</th><th class="w-16">Açık</th><th class="w-24"></th>
          </tr></thead>
          <tbody id="pHesapGovde"></tbody>
        </table>
      </div>

      <div class="space-y-3 p-5">
        <div class="flex flex-wrap items-center gap-2">
          <select id="pKim" class="input" style="min-width:180px"></select>
          <button class="btn btn-brand" id="pCalistir">Şimdi çalıştır</button>
          <button class="btn hidden" id="pDurdur">Durdur</button>
          <span class="text-[11.5px] text-fg-3">
            Tarayıcı açılır, adımlar aşağıda görünür; her adımın HTML'i ve ekran görüntüsü kaydedilir.</span>
        </div>
        <div id="pOnayKutu" class="hidden rounded-md border border-warn/50 bg-warn/10 p-3">
          <div class="mb-2 text-[12.5px]" id="pOnayMesaj">Onay kodunu girin</div>
          <div class="flex gap-2">
            <input type="text" id="pOnayKod" class="input w-40" placeholder="123456" />
            <button class="btn btn-brand" id="pOnayGonder">Gönder</button>
          </div>
        </div>
        <div id="pIlerleme"></div>
      </div>
    </div>`;
}

function portalHesapSatirlari(hesaplar) {
  const govde = el('pHesapGovde');
  if (!govde) return;
  const satir = (h) => `
    <tr data-hesap="${h ? h.id : 'yeni'}">
      <td><input class="input w-full" data-a="numara" value="${kacar(h ? h.numara : '')}"
                 placeholder="905xxxxxxxxx" /></td>
      <td><input class="input w-full" data-a="ad" value="${kacar(h ? h.ad : '')}"
                 placeholder="Kim" /></td>
      <td><input class="input w-full" data-a="kullanici" value="${kacar(h ? h.kullanici : '')}" /></td>
      <td><input class="input w-full" type="password" data-a="sifre" autocomplete="new-password"
                 placeholder="${h && h.sifreVar ? '•••••• kayıtlı' : 'şifre'}" /></td>
      <td class="text-center"><input type="checkbox" class="size-4 accent-[#3ecf8e]" data-a="aktif"
                 ${!h || h.aktif ? 'checked' : ''} /></td>
      <td class="whitespace-nowrap text-right">
        <button class="btn btn-sm btn-brand" data-pkaydet="${h ? h.id : 'yeni'}">
          ${h ? 'Kaydet' : 'Ekle'}</button>
        ${h ? `<button class="btn-ghost btn btn-sm" data-psil="${h.id}"
                 title="Sil">${svg('sil', 'size-3.5')}</button>` : ''}
      </td>
    </tr>`;

  govde.innerHTML = hesaplar.map(satir).join('') + satir(null);

  const oku = (tr) => {
    const al = (a) => tr.querySelector(`[data-a="${a}"]`);
    return {
      numara: al('numara').value.trim(),
      ad: al('ad').value.trim(),
      kullanici: al('kullanici').value.trim(),
      sifre: al('sifre').value,
      aktif: al('aktif').checked,
    };
  };

  govde.querySelectorAll('[data-pkaydet]').forEach((b) => {
    b.onclick = async () => {
      const tr = b.closest('tr');
      const veri = oku(tr);
      if (!veri.numara) return bildir('Numara boş olamaz.', 'hata');
      const id = b.dataset.pkaydet === 'yeni' ? null : Number(b.dataset.pkaydet);
      b.disabled = true;
      try {
        const liste = await cagir(api.portalHesapYaz({ id, ...veri }));
        D.portalHesaplar = liste;
        portalHesapSatirlari(liste);
        portalKimDoldur(liste);
        bildir('Kaydedildi.', 'basari');
      } catch (e) { bildir(kacar(e.message), 'hata'); b.disabled = false; }
    };
  });

  govde.querySelectorAll('[data-psil]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Bu numara ve kayıtlı bilgileri silinecek. Emin misiniz?')) return;
      try {
        const liste = await cagir(api.portalHesapSil(Number(b.dataset.psil)));
        D.portalHesaplar = liste;
        portalHesapSatirlari(liste);
        portalKimDoldur(liste);
        bildir('Silindi.', 'basari');
      } catch (e) { bildir(kacar(e.message), 'hata'); }
    };
  });
}

function portalKimDoldur(hesaplar) {
  const s = el('pKim');
  if (!s) return;
  const secili = s.value;
  const acik = hesaplar.filter((h) => h.aktif && h.kullanici && h.sifreVar);
  s.innerHTML = acik.length
    ? acik.map((h) => `<option value="${kacar(h.numara)}">
        ${kacar(h.ad || h.numara)} · ${kacar(h.kullanici)}</option>`).join('')
    : '<option value="">— tanımlı hesap yok —</option>';
  if (secili) s.value = secili;
  const b = el('pCalistir');
  if (b) b.disabled = !acik.length;
  const r = el('portalRozet');
  if (r) r.textContent = `${hesaplar.length} numara`;
}

function portalIlerlemeCiz() {
  const kutu = el('pIlerleme');
  if (!kutu) return;
  const adimlar = D.portalAdimlar || [];
  if (!adimlar.length) { kutu.innerHTML = ''; return; }
  const simge = { calisiyor: '⏳', bitti: '✓', hata: '✗' };
  const renk = { calisiyor: 'text-fg-2', bitti: 'text-brand', hata: 'text-danger' };
  kutu.innerHTML = `
    <div class="rounded-md border border-line bg-bg-200 p-3 text-[12px]">
      ${adimlar.map((a) => `
        <div class="flex items-start gap-2 py-0.5 ${renk[a.durum] || ''}">
          <span class="w-4 shrink-0">${simge[a.durum] || '·'}</span>
          <span class="min-w-0 flex-1">
            ${kacar(a.ad)}
            ${a.hata ? `<div class="text-[11.5px] text-danger">${kacar(a.hata)}</div>` : ''}
            ${a.iz && a.iz.dosya
              ? `<div class="font-mono text-[10.5px] text-fg-3">${kacar(a.iz.dosya)}</div>` : ''}
          </span>
        </div>`).join('')}
    </div>`;
}

function portalDinleyiciKur() {
  if (D.portalBagli) return;
  D.portalBagli = true;
  api.portalDinle((o) => {
    if (o.tur === 'onay-istendi') {
      const kutu = el('pOnayKutu');
      if (kutu) {
        kutu.classList.remove('hidden');
        el('pOnayMesaj').textContent = (o.sonHata ? o.sonHata + ' ' : '')
          + `Size gelen onay kodunu girin (${o.saniye} sn).`;
        el('pOnayKod').value = '';
        el('pOnayKod').focus();
      }
      return;
    }
    if (o.tur === 'onay-bitti') {
      const kutu = el('pOnayKutu');
      if (kutu) kutu.classList.add('hidden');
      return;
    }
    if (!o.kod) return;
    D.portalAdimlar = D.portalAdimlar || [];
    const ix = D.portalAdimlar.findIndex((a) => a.kod === o.kod);
    if (ix >= 0) D.portalAdimlar[ix] = o; else D.portalAdimlar.push(o);
    portalIlerlemeCiz();
  });
}

function portalBagla(ayar) {
  portalDinleyiciKur();
  portalHesapSatirlari(D.portalHesaplar || []);
  portalKimDoldur(D.portalHesaplar || []);
  portalIlerlemeCiz();

  el('pAyarKaydet').onclick = async () => {
    const b = el('pAyarKaydet');
    b.disabled = true;
    try {
      const yeni = await cagir(api.portalAyarYaz({
        girisUrl: el('pGiris').value,
        anaUrl: el('pAna').value,
        raporAdi: el('pRapor').value,
        saat: el('pSaat').value,
        gunGeri: el('pGunGeri').value,
        onaySn: el('pOnaySn').value,
        gorunur: el('pGorunur').checked,
        kapat: el('pKapat').checked,
        menuXpath: el('pMenu').value,
        altMenuXpath: el('pAltMenu').value,
      }));
      el('pAna').value = yeni.anaUrl || '';
      bildir('Portal ayarları kaydedildi.', 'basari');
    } catch (e) { bildir(kacar(e.message), 'hata'); }
    finally { b.disabled = false; }
  };

  el('pKlasor').onclick = async () => {
    try { await cagir(api.portalKlasorAc()); }
    catch (e) { bildir(kacar(e.message), 'hata'); }
  };

  el('pOnayGonder').onclick = async () => {
    const kod = el('pOnayKod').value.trim();
    if (!kod) return;
    try {
      await cagir(api.portalOnayVer(kod));
      el('pOnayKutu').classList.add('hidden');
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  };
  el('pOnayKod').onkeydown = (o) => { if (o.key === 'Enter') el('pOnayGonder').click(); };

  el('pDurdur').onclick = async () => {
    try { await cagir(api.portalDurdur()); } catch (e) { bildir(kacar(e.message), 'hata'); }
  };

  el('pCalistir').onclick = async () => {
    const numara = el('pKim').value;
    if (!numara) return bildir('Önce kullanıcı adı ve şifresi girilmiş bir numara ekleyin.', 'hata');
    if (!ayar.girisUrl || !ayar.raporAdi) {
      return bildir('Önce giriş adresi ve rapor adını kaydedin.', 'hata');
    }
    const b = el('pCalistir');
    b.disabled = true;
    el('pDurdur').classList.remove('hidden');
    D.portalAdimlar = [];
    portalIlerlemeCiz();
    try {
      const r = await cagir(api.portalCalistir(numara));
      bildir(`<b>Rapor indirildi.</b><br>${kacar(r.dosyaAdi || '')}`, 'basari');
    } catch (e) {
      bildir(kacar(e.message), 'hata');
    } finally {
      b.disabled = false;
      el('pDurdur').classList.add('hidden');
      el('pOnayKutu').classList.add('hidden');
    }
  };
}

async function sayfaAyarlar() {
  const [surum, ozet, loglar, isletmeler, ortak, pAyar, pHesaplar] = await Promise.all([
    cagir(api.surum()), cagir(api.ozet()), cagir(api.loglar()), cagir(api.isletmeler()),
    cagir(api.ortakDurum()), cagir(api.portalAyar()), cagir(api.portalHesaplar()),
  ]);
  D.portalHesaplar = pHesaplar;

  el('icerik').innerHTML = `
    <div class="min-h-0 flex-1 space-y-4 overflow-auto">
      <div class="card">
        <div class="card-head"><div class="font-medium">Uygulama</div>
          <span class="chip border-brand-2/50 text-brand">v${surum.surum}</span></div>
        <div class="space-y-3 p-5 text-[12.5px]">
          <div class="flex items-center justify-between gap-4">
            <span class="text-fg-2">${surum.tasinabilir
              ? 'Taşınabilir sürüm — otomatik güncellenmez. Yeni sürümü indirip bu dosyanın '
                + 'yerine koymanız yeterli, verileriniz etkilenmez.'
              : 'Güncellemeler GitHub üzerinden otomatik indirilir.'}</span>
            <button class="btn shrink-0" id="gncKontrol">${svg('yenile', 'size-4')} Güncelleme kontrol et</button>
          </div>
          <div id="gncDurum" class="text-[12px] text-fg-3"></div>
          <div class="rounded-md border border-line bg-bg-200 p-3 text-[12px] text-fg-3">
            Güncelleme yalnızca <b class="text-fg-2">program dosyalarını</b> değiştirir.
            Kayıtlarınız aşağıdaki veri dosyasında durur; güncelleme sırasında okunmaz,
            taşınmaz ve silinmez.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div class="font-medium">Verileriniz</div>
          <span class="chip border-line-2 text-fg-3">bu bilgisayarda</span></div>
        <div class="space-y-2 p-5 text-[12.5px]">
          <div class="flex justify-between gap-4"><span class="shrink-0 text-fg-2">Konum</span>
            <span class="truncate font-mono text-[11px] text-fg-3">${kacar(surum.vt)}</span></div>
          <div class="flex justify-between"><span class="text-fg-2">Gün</span><span>${ozet.gun}</span></div>
          <div class="flex justify-between"><span class="text-fg-2">Kayıt</span><span>${ozet.kayit}</span></div>
          <div class="flex justify-between"><span class="text-fg-2">İşletme</span><span>${ozet.isletme}</span></div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button class="btn" id="vtAc">Klasörde göster</button>
            <button class="btn btn-brand" id="vtYedek">Yedek al</button>
            <button class="btn" id="gunlukAc">Başlangıç günlüğü</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <div class="font-medium">Ortak klasörle eşitleme</div>
            <div class="text-[11.5px] text-fg-3">
              Herkes kendi bilgisayarında çalışır, veriler düzenli olarak birleştirilir</div>
          </div>
          <span class="chip ${ortak.ortakMi ? 'border-brand-2/50 text-brand' : 'border-line-2 text-fg-3'}"
                id="ortakRozet">${ortak.ortakMi ? 'açık' : 'kapalı'}</span>
        </div>
        <div class="space-y-3 p-5 text-[12.5px]">
          <div id="ortakDurum"></div>
          <div class="flex flex-wrap items-center gap-2">
            <button class="btn btn-brand" id="ortakSec">
              ${ortak.ortakMi ? 'Klasörü değiştir' : 'Ortak klasörü seç'}</button>
            <button class="btn" id="simdiEsitle" ${ortak.ortakMi ? '' : 'disabled'}>
              ${svg('yenile', 'size-4')} Şimdi eşitle</button>
            ${ortak.ortakMi ? `<label class="ml-auto flex items-center gap-2 text-fg-2">
              Her <select class="input py-1" id="ortakAralik">
                ${ortak.araliklar.map((d) => `<option value="${d}"
                  ${d === ortak.aralikDk ? 'selected' : ''}>${d}</option>`).join('')}
              </select> dakikada</label>
            <button class="btn" id="ortakKaldir">Bağlantıyı kaldır</button>` : ''}
          </div>
          <div class="rounded-md border border-line bg-bg-200 p-3 text-[12px] text-fg-3">
            Her bilgisayar kendi veritabanında çalışır. Seçilen ağ klasöründeki ortak dosya
            belirlenen aralıkla <b class="text-fg-2">iki yönlü birleştirilir</b> — sizin
            girdikleriniz oraya gider, başkalarının girdikleri size gelir.
            Aynı hücreyi ikiniz de değiştirdiyseniz <b class="text-fg-2">en son yapılan</b> kalır.
            Rapor portalı ayarları, portal numaraları ve WhatsApp izinli numaraları da
            eşitlenir. İşlem günlüğü ve program ayarları her bilgisayara özeldir.
          </div>
        </div>
      </div>

      ${portalKarti(pAyar, pHesaplar)}

      <div class="card overflow-hidden">
        <div class="card-head">
          <div>
            <div class="font-medium">İşletmeler</div>
            <div class="text-[11.5px] text-fg-3">
              Bu sıra ekrandaki tabloda ve Excel çıktısında kullanılır</div>
          </div>
          <span class="text-[11.5px] text-fg-3">${isletmeler.length} kayıt</span>
        </div>
        <div class="flex gap-2 border-b border-line p-3">
          <input id="isEkleAd" class="input flex-1" placeholder="Yeni işletme adı" />
          <button class="btn btn-brand" id="isEkle">${svg('ekle', 'size-4')} Ekle</button>
          <button class="btn" id="siraYapistirAc">Sırayı yapıştır</button>
        </div>
        <div id="siraYapistir" class="hidden border-b border-line p-3">
          <div class="mb-2 text-[12px] text-fg-3">
            Her satıra bir işletme adı. Bu sıra uygulanır; listede olmayanlar eklenir,
            listede geçmeyen mevcut işletmeler sona alınır. Sıra kaydedilir ve sonraki
            açılışlarda korunur.
          </div>
          <textarea id="siraMetin" rows="8"
                    class="input w-full font-mono text-[11.5px]"
                    placeholder="BALYA&#10;DURSUNBEY&#10;SAVAŞTEPE&#10;…"></textarea>
          <div class="mt-2 flex items-center gap-2">
            <button class="btn btn-brand" id="siraUygula">Sırayı uygula</button>
            <button class="btn" id="siraMevcut">Mevcut sırayı yaz</button>
            <button class="btn-ghost btn" id="siraKapat">Vazgeç</button>
          </div>
        </div>
        <div class="max-h-80 overflow-auto">
          <table class="tbl"><tbody>
            ${isletmeler.map((i, ix) => `<tr>
              <td class="w-8 text-fg-3">${ix + 1}</td>
              <td>${kacar(i.ad)}</td>
              <td class="w-28 text-right whitespace-nowrap">
                <button class="btn-ghost btn btn-sm" data-tasi="${i.id}" data-yon="-1"
                        ${ix === 0 ? 'disabled' : ''} title="Yukarı">${svg('yukari', 'size-3.5')}</button>
                <button class="btn-ghost btn btn-sm" data-tasi="${i.id}" data-yon="1"
                        ${ix === isletmeler.length - 1 ? 'disabled' : ''} title="Aşağı">${svg('asagi', 'size-3.5')}</button>
                <button class="btn-ghost btn btn-sm" data-isil="${i.id}"
                        title="Sil — bu işletmenin tüm kayıtları da silinir">${svg('sil', 'size-3.5')}</button>
              </td></tr>`).join('') ||
              '<tr><td class="py-8 text-center text-fg-3">Henüz işletme yok — geçmiş tablonuzu içe aktarın.</td></tr>'}
          </tbody></table>
        </div>
      </div>

      <div class="card border-danger/40">
        <div class="card-head bg-danger/10">
          <div>
            <div class="font-medium">Her şeyi sıfırla</div>
            <div class="text-[11.5px] text-fg-3">Program ilk kurulduğu hâline döner</div>
          </div>
          <button class="btn border-danger/60 bg-danger/20 hover:bg-danger/30" id="hepsiniSifirla">
            ${svg('sil', 'size-4')} Sıfırla
          </button>
        </div>
        <div class="p-5 text-[12.5px] text-fg-2">
          Bütün günler, işaretlemeler, işletme listesi, eşleştirme kuralları, öneriler,
          işlem günlüğü ve program önbelleği silinir; varsayılan işletme listesi yeniden kurulur.
          <span class="text-fg-3">Silmeden önce mevcut veri dosyasının yedeği aynı klasöre bırakılır.</span>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="card-head"><div class="font-medium">İşlem günlüğü</div></div>
        <div class="max-h-72 overflow-auto p-3 font-mono text-[11px] text-fg-3">
          ${loglar.map((l) => `<div class="border-b border-line/50 py-1">
            <span class="text-fg-2">${kacar(l.zaman)}</span> · ${kacar(l.tur)}
            ${l.tarih ? '· ' + tarihYaz(l.tarih) : ''}<br>${kacar(l.mesaj)}</div>`).join('')
            || '<div class="p-4 text-center">Kayıt yok</div>'}
        </div>
      </div>
    </div>`;

  el('vtAc').onclick = () => api.klasorAc(surum.vt);
  el('gunlukAc').onclick = () => api.gunluguAc();
  portalBagla(pAyar);

  const ortakYaz = (d) => {
    const kutu = el('ortakDurum');
    if (!kutu) return;
    if (!d.ortakMi) {
      kutu.innerHTML = '<div class="text-fg-2">Ortak klasör seçilmedi — '
        + 'veriler yalnızca bu bilgisayarda duruyor.</div>';
      return;
    }
    const s = d.son;
    const sonSatir = !s
      ? '<span class="text-fg-3">henüz eşitlenmedi</span>'
      : s.basarili
        ? `<span class="text-brand">${zamanYaz(s.zaman)}</span>
           <span class="text-fg-3">· gönderilen ${s.gonderilen} · alınan ${s.alinan}
           ${s.yerelSilinen + s.ortakSilinen ? `· silinen ${s.yerelSilinen + s.ortakSilinen}` : ''}
           · ${(s.sureMs / 1000).toFixed(1)} sn</span>`
        : `<span class="text-danger">${zamanYaz(s.zaman)} — başarısız</span>
           <div class="text-[11.5px] text-fg-3">${kacar(s.hata || '')}</div>`;

    kutu.innerHTML = `
      <div class="flex justify-between gap-4"><span class="shrink-0 text-fg-2">Ortak dosya</span>
        <span class="truncate font-mono text-[11px] ${d.erisilebilir ? 'text-fg-3' : 'text-danger'}"
          >${kacar(d.dosya)}${d.erisilebilir ? '' : '  (klasöre erişilemiyor)'}</span></div>
      <div class="flex justify-between gap-4"><span class="shrink-0 text-fg-2">Son eşitleme</span>
        <span class="text-right">${sonSatir}</span></div>
      <div class="mt-2 text-fg-2">Bu klasörü kullananlar (${d.kimler.length})</div>
      <div class="mt-1 flex flex-wrap gap-1.5">
        ${d.kimler.map((k) => `<span class="chip ${k.benMiyim
          ? 'border-brand-2/50 text-brand' : 'border-line-2 text-fg-3'}"
          title="${k.dakika} dakika önce eşitledi">${kacar(k.makine)}${
          k.surum ? ` · v${kacar(k.surum)}` : ''}</span>`).join('')
        || '<span class="text-[11.5px] text-fg-3">Henüz kimse eşitlemedi.</span>'}
      </div>`;
  };
  ortakYaz(ortak);

  el('ortakSec').onclick = async () => {
    const b = el('ortakSec');
    b.disabled = true;
    try {
      const d = await cagir(api.ortakSec());
      if (d === null) { b.disabled = false; return; }
      bildir('Ortak klasör ayarlandı ve ilk eşitleme yapıldı.', 'basari');
      sayfaAyarlar();
    } catch (e) { bildir(kacar(e.message), 'hata'); b.disabled = false; }
  };

  el('simdiEsitle').onclick = async () => {
    const b = el('simdiEsitle');
    b.disabled = true;
    try {
      const s = await cagir(api.simdiEsitle());
      bildir(`Eşitlendi — gönderilen ${s.gonderilen}, alınan ${s.alinan}`
        + `${s.yerelSilinen + s.ortakSilinen ? `, silinen ${s.yerelSilinen + s.ortakSilinen}` : ''}.`,
      'basari');
      sayfaAyarlar();
    } catch (e) { bildir(kacar(e.message), 'hata'); b.disabled = false; }
  };

  if (el('ortakKaldir')) {
    el('ortakKaldir').onclick = async () => {
      try {
        await cagir(api.ortakKaldir());
        bildir('Ortak klasör bağlantısı kaldırıldı. Verileriniz bu bilgisayarda duruyor.', 'basari');
        sayfaAyarlar();
      } catch (e) { bildir(kacar(e.message), 'hata'); }
    };
  }

  if (el('ortakAralik')) {
    el('ortakAralik').onchange = async (o) => {
      try {
        await cagir(api.ortakAralik(Number(o.target.value)));
        bildir(`Eşitleme aralığı ${o.target.value} dakika olarak ayarlandı.`, 'basari');
      } catch (e) { bildir(kacar(e.message), 'hata'); }
    };
  }

  el('hepsiniSifirla').onclick = async () => {
    const b = el('hepsiniSifirla');
    b.disabled = true;
    try {
      const r = await cagir(api.hepsiniSifirla());
      if (r.iptal) return;
      localStorage.clear();
      bildir('Her şey sıfırlandı.'
        + (r.yedek ? `<br><span class="text-fg-3">Yedek: ${kacar(r.yedek)}</span>` : ''), 'basari');
      D.tarih = null;
      D.ay = null;
      git('genel');
    } catch (e) {
      bildir(kacar(e.message), 'hata');
    } finally {
      b.disabled = false;
    }
  };

  el('vtYedek').onclick = async () => {
    try {
      const yol = await cagir(api.vtYedekle());
      if (yol) { bildir(`Yedek alındı:<br><span class="text-fg-3">${kacar(yol)}</span>`, 'basari'); api.klasorAc(yol); }
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  };

  el('isEkle').onclick = async () => {
    const ad = el('isEkleAd').value.trim();
    if (!ad) return;
    try { await cagir(api.isletmeEkle(ad)); bildir(`"${kacar(ad)}" eklendi.`, 'basari'); sayfaAyarlar(); }
    catch (e) { bildir(kacar(e.message), 'hata'); }
  };

  el('siraYapistirAc').onclick = () => el('siraYapistir').classList.toggle('hidden');
  el('siraKapat').onclick = () => el('siraYapistir').classList.add('hidden');
  el('siraMevcut').onclick = () => {
    el('siraMetin').value = isletmeler.map((i) => i.ad).join('\n');
  };
  el('siraUygula').onclick = async () => {
    const satirlar = el('siraMetin').value.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!satirlar.length) return bildir('Liste boş.', 'hata');
    try {
      const r = await cagir(api.isletmeSiralaAdlar(satirlar));
      bildir(`Sıra uygulandı: <b>${r.siralandi}</b> işletme.`
        + (r.eklendi.length ? `<br>Yeni eklenen: ${kacar(r.eklendi.join(', '))}` : ''), 'basari');
      sayfaAyarlar();
    } catch (e) { bildir(kacar(e.message), 'hata'); }
  };

  document.querySelectorAll('[data-tasi]').forEach((b) => {
    b.onclick = async () => {
      try {
        await cagir(api.isletmeTasi(Number(b.dataset.tasi), Number(b.dataset.yon)));
        sayfaAyarlar();
      } catch (e) { bildir(kacar(e.message), 'hata'); }
    };
  });

  document.querySelectorAll('[data-isil]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Bu işletme ve ona ait tüm kayıtlar silinecek. Emin misiniz?')) return;
      try { await cagir(api.isletmeSil(Number(b.dataset.isil))); bildir('Silindi.', 'basari'); sayfaAyarlar(); }
      catch (e) { bildir(kacar(e.message), 'hata'); }
    };
  });

  el('gncKontrol').onclick = async () => {
    el('gncDurum').textContent = 'Kontrol ediliyor…';
    try {
      const r = await cagir(api.guncellemeKontrol());
      el('gncDurum').textContent = r && r.mesaj ? r.mesaj : 'Kontrol tamamlandı.';
    } catch (e) { el('gncDurum').textContent = 'Kontrol edilemedi: ' + e.message; }
  };
}

function baslat() {
  D.daralt = localStorage.getItem('daralt') === '1';
  sidebarUygula();
  menuCiz();

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sayfa]');
    if (b) git(b.dataset.sayfa);
  });

  el('toggleSidebar').onclick = () => { D.daralt = !D.daralt; sidebarUygula(); };
  el('panelKatman').onclick = panelKapat;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') panelKapat();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      D.daralt = !D.daralt;
      sidebarUygula();
    }
  });

  api.surum().then((r) => {
    if (r && r.ok) el('surumEtiket').textContent = 'sürüm ' + r.veri.surum;
  });

  api.kilitDurum().then((r) => {
    if (r && r.ok && r.veri.kilitli) kilitEkrani(r.veri.mesaj);
  });

  api.guncellemeDinle((veri) => {
    if (veri.tur === 'hazir') {
      bildir(`Yeni sürüm indirildi (<b>${veri.surum}</b>). Uygulamayı kapatınca kurulacak.`, 'basari');
    } else if (veri.tur === 'var') {
      bildir(`Yeni sürüm bulundu: <b>${veri.surum}</b> — indiriliyor…`);
    }
  });

  api.esitlemeDinle((v) => {
    if (!v.basarili) {
      bildir(`Eşitleme başarısız: ${kacar(v.hata || '')}`, 'uyari');
      return;
    }
    if (v.alinan || v.yerelSilinen) {
      bildir(`Eşitleme: ${v.alinan} kayıt alındı.`, 'basari');
      if (D.sayfa !== 'ayarlar' && !duzenlemeVarMi()) git(D.sayfa).catch(() => { });
    }
  });

  git('genel');
}

baslat();
