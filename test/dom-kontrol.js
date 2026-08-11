// Hamza ALMALI

(async () => {
  const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => document.querySelector(s);
  const sonuc = { adimlar: [], hatalar: [] };

  window.addEventListener('error', (e) => sonuc.hatalar.push(String(e.message)));

  const doluluk = () => {
    const k = q('#icerik').getBoundingClientRect();
    const cocuklar = [...q('#icerik').children];
    if (!cocuklar.length) return null;
    const sag = Math.max(...cocuklar.map((c) => c.getBoundingClientRect().right));
    const alt = Math.max(...cocuklar.map((c) => c.getBoundingClientRect().bottom));
    return { bosSag: Math.round(k.right - sag), bosAlt: Math.round(k.bottom - alt) };
  };

  const olc = (ad) => ({
    ad,
    baslik: q('#sayfaBaslik').textContent,
    kartSayisi: document.querySelectorAll('#icerik .card').length,
    satirSayisi: document.querySelectorAll('#icerik tbody tr').length,
    hucreSayisi: document.querySelectorAll('#icerik .grid-cell').length,
    metinUzunluk: q('#icerik').innerText.length,
    doluluk: doluluk(),
  });

  sonuc.menuSayisi = document.querySelectorAll('#menu button').length;
  sonuc.sidebarGenislik = q('#sidebar').getBoundingClientRect().width;
  sonuc.adimlar.push(olc('genel'));

  q('#toggleSidebar').click();
  await bekle(350);
  sonuc.sidebarDaralmis = q('#sidebar').getBoundingClientRect().width;
  const t = q('#toggleSidebar').getBoundingClientRect();
  const n = document.querySelector('header').getBoundingClientRect();
  sonuc.toggleKonum = {
    merkezX: Math.round(t.left + t.width / 2),
    merkezY: Math.round(t.top + t.height / 2),
    sidebarSagKenar: Math.round(q('#sidebar').getBoundingClientRect().right),
    navbarAltKenar: Math.round(n.bottom),
  };
  q('#toggleSidebar').click();
  await bekle(350);
  sonuc.sidebarAcik = q('#sidebar').getBoundingClientRect().width;

  for (const s of ['gunluk', 'ay', 'aktar', 'gecmis', 'eslesme', 'oneri', 'ayarlar']) {
    document.querySelector(`[data-sayfa="${s}"]`).click();
    await bekle(s === 'ay' ? 1600 : 900);
    sonuc.adimlar.push(olc(s));
  }

  document.querySelector('[data-sayfa="gunluk"]').click();
  await bekle(1200);
  const h = document.querySelector('#icerik .grid-cell');
  if (h) {
    const oncesi = h.classList.contains('isaretli');
    h.click();
    await bekle(600);
    sonuc.hucreYazma = { oncesi, sonrasi: h.classList.contains('isaretli') };
    h.click();
    await bekle(600);
    sonuc.hucreGeriAl = h.classList.contains('isaretli');
  }

  const isl = document.querySelector('#icerik [data-form]');
  if (isl) {
    isl.click();
    await bekle(500);
    sonuc.formPanel = {
      gorunur: !document.querySelector('#yanPanel').classList.contains('hidden'),
      kutuSayisi: document.querySelectorAll('#yanPanel input[type=checkbox]').length,
      baslik: (document.querySelector('#yanPanel .text-\\[14px\\]') || {}).textContent || '',
    };
  }

  return sonuc;
})();
