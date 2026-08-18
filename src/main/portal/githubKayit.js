// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EN_BUYUK_DOSYA = 8 * 1024 * 1024;
const EN_COK_DOSYA = 14;
const ISTEK_SURESI = 30000;

function apiBasliklari(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'report-desk',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function istek(url, secenekler = {}) {
  const kes = new AbortController();
  const sayac = setTimeout(() => kes.abort(), ISTEK_SURESI);
  try {
    return await fetch(url, { ...secenekler, signal: kes.signal });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'istek zaman aşımına uğradı' : e.message);
  } finally {
    clearTimeout(sayac);
  }
}

function dosyalariSec(klasor) {
  let adlar = [];
  try {
    adlar = fs.readdirSync(klasor).sort();
  } catch {
    return { secilen: [], atlanan: [] };
  }

  const secilen = new Set();
  if (adlar.includes('ozet.json')) secilen.add('ozet.json');
  for (const ad of adlar) if (ad.includes('-HATA')) secilen.add(ad);

  if (secilen.size <= 1) {
    const numarali = adlar.filter((a) => /^\d\d-/.test(a));
    const sonOnEk = numarali.length ? numarali[numarali.length - 1].slice(0, 2) : null;
    if (sonOnEk) for (const ad of adlar) if (ad.startsWith(sonOnEk)) secilen.add(ad);
  }

  const atlanan = [];
  const uygun = [];
  for (const ad of secilen) {
    let boyut = 0;
    try { boyut = fs.statSync(path.join(klasor, ad)).size; } catch { continue; }
    if (boyut > EN_BUYUK_DOSYA) { atlanan.push(`${ad} (${Math.round(boyut / 1048576)} MB)`); continue; }
    uygun.push(ad);
  }
  for (const ad of uygun.slice(EN_COK_DOSYA)) atlanan.push(`${ad} (dosya sınırı)`);
  return { secilen: uygun.slice(0, EN_COK_DOSYA), atlanan };
}

async function yukle({
  depo, token, klasor, makine = 'bilinmiyor',
  apiKok = 'https://api.github.com', log = () => { },
}) {
  const d = String(depo || '').trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(d)) {
    throw new Error(`Kayıt deposu "kullanici/depo" biçiminde olmalı (girilen: "${d}").`);
  }
  if (!token) throw new Error('GitHub erişim anahtarı tanımlı değil.');

  const yanit = await istek(`${apiKok}/repos/${d}`, { headers: apiBasliklari(token) });
  if (yanit.status === 401) throw new Error('GitHub erişim anahtarı geçersiz.');
  if (yanit.status === 404) {
    throw new Error(`Kayıt deposuna ulaşılamadı (${d}) — depo yok ya da anahtarın erişimi yok.`);
  }
  if (!yanit.ok) throw new Error(`GitHub deposu okunamadı (HTTP ${yanit.status}).`);
  const bilgi = await yanit.json();
  if (!bilgi.private) {
    throw new Error(`Kayıt deposu (${d}) özel (private) değil — portal kayıtları herkese açık `
      + 'bir depoya gönderilmez.');
  }

  const { secilen, atlanan } = dosyalariSec(klasor);
  if (!secilen.length) throw new Error(`Gönderilecek kayıt dosyası bulunamadı: ${klasor}`);

  const hedef = `kayitlar/${String(makine).replace(/[^\w.-]+/g, '-')}/${path.basename(klasor)}`;
  const gonderilen = [];
  for (const ad of secilen) {
    const icerik = fs.readFileSync(path.join(klasor, ad));
    const y = await istek(`${apiKok}/repos/${d}/contents/${hedef}/${encodeURIComponent(ad)}`, {
      method: 'PUT',
      headers: { ...apiBasliklari(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `portal kaydı: ${path.basename(klasor)} / ${ad}`,
        content: icerik.toString('base64'),
      }),
    });
    if (y.ok) gonderilen.push(ad);
    else {
      atlanan.push(`${ad} (HTTP ${y.status})`);
      log(`Portal kaydı gönderilemedi: ${ad} → HTTP ${y.status}`);
    }
  }

  return { hedef, gonderilen, atlanan };
}

module.exports = { yukle, dosyalariSec, EN_BUYUK_DOSYA, EN_COK_DOSYA };
