// Hamza ALMALI

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIZIN_ADI = 'dizin.csv';
const DIZIN_BASLIK = 'tarih;klasor;uid;gonderen;konu;boyut;dosya\n';
const ORNEK_SAYISI = 50;
const OBEK = 100;

const COP_OZEL = '\\Trash';

function ikiHane(s) {
  return String(s).padStart(2, '0');
}

function gunAnahtari(d) {
  const t = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(t.getTime())) return '0000-00-00';
  return `${t.getFullYear()}-${ikiHane(t.getMonth() + 1)}-${ikiHane(t.getDate())}`;
}

function dosyaAdiTemiz(metin, uzunluk = 60) {
  return String(metin == null ? '' : metin)
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/[\s-]+/g, '-')
    .slice(0, uzunluk)
    .replace(/^[-.]+|[-.]+$/g, '') || 'adsiz';
}

function csvHucre(metin) {
  const m = String(metin == null ? '' : metin).replace(/[\r\n]+/g, ' ');
  return `"${m.split('"').join('""')}"`;
}

function adresMetni(kutu) {
  if (!kutu || !kutu.length) return '';
  return kutu.map((a) => a.address || a.name || '').filter(Boolean).join(', ');
}

function tarihCoz(metin) {
  const m = String(metin || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    const d = new Date(metin);
    if (Number.isNaN(d.getTime())) throw new Error('Tarih anlaşılamadı (YYYY-AA-GG bekleniyor).');
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function istemciUret(ayar, sifre) {
  const { ImapFlow } = require('imapflow');
  return new ImapFlow({
    host: ayar.sunucu,
    port: ayar.port || 993,
    secure: ayar.guvenli !== false,
    auth: { user: ayar.kullanici, pass: sifre || '' },
    logger: false,
    emitLogs: false,
  });
}

async function calis({ ayar, sifre, uret = istemciUret }, fn) {
  if (!ayar || !ayar.kullanici) throw new Error('E-posta adresi girilmemiş.');
  if (!sifre) throw new Error('Uygulama şifresi girilmemiş.');
  const istemci = uret(ayar, sifre);
  try {
    await istemci.connect();
  } catch (e) {
    throw new Error(`Gmail'e bağlanılamadı: ${e.message}`);
  }
  try {
    return await fn(istemci);
  } finally {
    try { await istemci.logout(); } catch { try { istemci.close(); } catch { } }
  }
}

async function klasorler(secenekler) {
  return calis(secenekler, async (istemci) => {
    const liste = await istemci.list();
    return liste
      .filter((k) => !k.flags || !k.flags.has || !k.flags.has('\\Noselect'))
      .map((k) => ({
        yol: k.path,
        ad: k.name || k.path,
        ozel: k.specialUse || null,
      }));
  });
}

async function ozet(secenekler) {
  const { klasor = 'INBOX', tarih } = secenekler;
  const sinir = tarihCoz(tarih);
  return calis(secenekler, async (istemci) => {
    const kutu = await istemci.mailboxOpen(klasor, { readOnly: true });
    const uidler = await istemci.search({ before: sinir }, { uid: true }) || [];
    const ornekler = [];
    if (uidler.length) {
      const son = uidler.slice(-ORNEK_SAYISI);
      for await (const ileti of istemci.fetch(son, { envelope: true, size: true },
        { uid: true })) {
        ornekler.push({
          uid: ileti.uid,
          tarih: ileti.envelope && ileti.envelope.date ? ileti.envelope.date : null,
          gonderen: adresMetni(ileti.envelope && ileti.envelope.from),
          konu: (ileti.envelope && ileti.envelope.subject) || '(konu yok)',
          boyut: ileti.size || 0,
        });
      }
      ornekler.reverse();
    }
    return {
      klasor,
      klasorToplam: kutu.exists || 0,
      toplam: uidler.length,
      sinir: gunAnahtari(sinir),
      ornekler,
    };
  });
}

function yedekYolu(kok, hesap, klasor, ileti) {
  const gun = gunAnahtari(ileti.tarih || new Date(0));
  const dizin = path.join(kok, dosyaAdiTemiz(hesap, 80), dosyaAdiTemiz(klasor, 60),
    gun.slice(0, 4));
  const ad = `${gun}_${ileti.uid}_${dosyaAdiTemiz(ileti.konu, 50)}.eml`;
  return { dizin, dosya: path.join(dizin, ad) };
}

function yedegiYaz(kok, hesap, klasor, ileti, kaynak) {
  if (!kaynak || !kaynak.length) throw new Error('posta içeriği boş geldi');
  const { dizin, dosya } = yedekYolu(kok, hesap, klasor, ileti);
  fs.mkdirSync(dizin, { recursive: true });
  let hedef = dosya;
  let n = 2;
  while (fs.existsSync(hedef)) {
    hedef = dosya.replace(/\.eml$/, `-${n++}.eml`);
  }
  fs.writeFileSync(hedef, kaynak);
  const boyut = fs.statSync(hedef).size;
  if (boyut !== kaynak.length) {
    throw new Error(`yedek eksik yazıldı (${boyut}/${kaynak.length} bayt)`);
  }
  return { dosya: hedef, boyut };
}

function dizineEkle(kok, hesap, satir) {
  const dizin = path.join(kok, dosyaAdiTemiz(hesap, 80));
  fs.mkdirSync(dizin, { recursive: true });
  const yol = path.join(dizin, DIZIN_ADI);
  if (!fs.existsSync(yol)) fs.writeFileSync(yol, DIZIN_BASLIK, 'utf8');
  fs.appendFileSync(yol, satir, 'utf8');
  return yol;
}

async function copKutusu(istemci) {
  const liste = await istemci.list();
  const ozel = liste.find((k) => k.specialUse === COP_OZEL);
  if (ozel) return ozel.path;
  const adayi = liste.find((k) => /trash|çöp|cop/i.test(k.path));
  return adayi ? adayi.path : null;
}

async function kaliciSil(istemci, klasor, uidler, log) {
  const cop = await copKutusu(istemci);
  if (!cop) throw new Error('Çöp Kutusu klasörü bulunamadı, kalıcı silme yapılamadı.');
  if (istemci.mailbox && istemci.mailbox.path === cop) {
    await istemci.messageDelete(uidler, { uid: true });
    return { yol: 'dogrudan', cop };
  }
  const tasima = await istemci.messageMove(uidler, cop, { uid: true });
  const yeni = tasima && tasima.uidMap ? [...tasima.uidMap.values()] : [];
  if (!yeni.length) {
    log(`Mail: ${uidler.length} posta çöp kutusuna taşındı ama yeni numaraları alınamadı; `
      + 'kalıcı silme adımı atlandı (postalar çöp kutusunda).');
    return { yol: 'tasindi', cop };
  }
  await istemci.mailboxOpen(cop, { readOnly: false });
  await istemci.messageDelete(yeni, { uid: true });
  await istemci.mailboxOpen(klasor, { readOnly: false });
  return { yol: 'kalici', cop, silinen: yeni.length };
}

async function temizle(secenekler) {
  const {
    ayar, klasor = 'INBOX', tarih, yedekKok, kalici = true,
    ilerleme = () => { }, log = () => { },
  } = secenekler;
  if (!yedekKok) throw new Error('Yedek klasörü seçilmemiş.');
  const sinir = tarihCoz(tarih);
  const hesap = (ayar && ayar.kullanici) || 'hesap';
  fs.mkdirSync(yedekKok, { recursive: true });

  return calis(secenekler, async (istemci) => {
    await istemci.mailboxOpen(klasor, { readOnly: false });
    const uidler = await istemci.search({ before: sinir }, { uid: true }) || [];
    if (!uidler.length) {
      return {
        klasor, sinir: gunAnahtari(sinir), toplam: 0, yedeklenen: 0, silinen: 0,
        atlanan: [], yedekKok, kalici: false,
      };
    }

    log(`Mail: ${klasor} klasöründe ${gunAnahtari(sinir)} öncesi ${uidler.length} posta bulundu.`);
    ilerleme({ asama: 'yedek', toplam: uidler.length, biten: 0 });

    const yedeklenen = [];
    const atlanan = [];
    let biten = 0;
    let toplamBayt = 0;

    for await (const ileti of istemci.fetch(uidler,
      { envelope: true, source: true, size: true }, { uid: true })) {
      const bilgi = {
        uid: ileti.uid,
        tarih: ileti.envelope && ileti.envelope.date ? ileti.envelope.date : null,
        gonderen: adresMetni(ileti.envelope && ileti.envelope.from),
        konu: (ileti.envelope && ileti.envelope.subject) || '(konu yok)',
      };
      try {
        const yazilan = yedegiYaz(yedekKok, hesap, klasor, bilgi, ileti.source);
        dizineEkle(yedekKok, hesap, [
          csvHucre(gunAnahtari(bilgi.tarih || new Date(0))),
          csvHucre(klasor),
          csvHucre(bilgi.uid),
          csvHucre(bilgi.gonderen),
          csvHucre(bilgi.konu),
          csvHucre(yazilan.boyut),
          csvHucre(path.relative(yedekKok, yazilan.dosya)),
        ].join(';') + '\n');
        yedeklenen.push(bilgi.uid);
        toplamBayt += yazilan.boyut;
      } catch (e) {
        atlanan.push({ uid: bilgi.uid, konu: bilgi.konu, hata: e.message });
        log(`Mail: ${bilgi.uid} numaralı posta yedeklenemedi, silinmeyecek: ${e.message}`);
      }
      biten++;
      if (biten % 10 === 0 || biten === uidler.length) {
        ilerleme({ asama: 'yedek', toplam: uidler.length, biten });
      }
    }

    const bulunamayan = uidler.length - (yedeklenen.length + atlanan.length);
    if (bulunamayan > 0) {
      log(`Mail: ${bulunamayan} posta sunucudan okunamadı, onlar da silinmeyecek.`);
    }

    if (!yedeklenen.length) {
      throw new Error('Hiçbir posta yedeklenemedi, silme yapılmadı.');
    }

    ilerleme({ asama: 'sil', toplam: yedeklenen.length, biten: 0 });
    let silinen = 0;
    let silmeYolu = null;
    for (let i = 0; i < yedeklenen.length; i += OBEK) {
      const obek = yedeklenen.slice(i, i + OBEK);
      if (kalici) {
        const s = await kaliciSil(istemci, klasor, obek, log);
        silmeYolu = s.yol;
      } else {
        const cop = await copKutusu(istemci);
        if (!cop) throw new Error('Çöp Kutusu klasörü bulunamadı.');
        await istemci.messageMove(obek, cop, { uid: true });
        silmeYolu = 'cop';
      }
      silinen += obek.length;
      ilerleme({ asama: 'sil', toplam: yedeklenen.length, biten: silinen });
    }

    log(`Mail: ${silinen} posta ${kalici ? 'kalıcı olarak silindi' : 'çöp kutusuna taşındı'}, `
      + `${(toplamBayt / 1024).toFixed(0)} KB yedek yazıldı`
      + `${atlanan.length ? `, ${atlanan.length} posta atlandı` : ''}.`);

    return {
      klasor,
      sinir: gunAnahtari(sinir),
      toplam: uidler.length,
      yedeklenen: yedeklenen.length,
      silinen,
      bayt: toplamBayt,
      atlanan,
      yedekKok,
      kalici: !!kalici,
      silmeYolu,
    };
  });
}

module.exports = {
  klasorler, ozet, temizle, calis,
  tarihCoz, gunAnahtari, dosyaAdiTemiz, csvHucre, yedekYolu, yedegiYaz, dizineEkle,
  adresMetni, DIZIN_ADI, DIZIN_BASLIK,
};
