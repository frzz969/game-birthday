// tools/patch.mjs
// Tanpa dependency. Jalankan: node tools/patch.mjs
//
// Membaca tools/pristine/* (byte-identik dengan aslinya) + content/content.json,
// lalu menulis hasil patch ke site/. Karena SELALU membaca dari pristine,
// skrip ini idempoten: dijalankan berkali-kali hasilnya sama.
//
// Cara kerja:
//   1. Seluruh objek cerita (`const Z={...}`) DIGANTI UTUH dengan content.json -> "z".
//      Ini yang membuat semua kalimat bisa diedit dari satu file JSON.
//   2. Beberapa potongan di luar objek itu (badge, footer, judul tab, meta) diganti
//      lewat aturan pola eksak.
//   3. Kalau ada pola yang tidak ditemukan / ditemukan lebih dari sekali, skrip GAGAL.
//      Tidak ada pola yang dilewati diam-diam.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRISTINE = path.join(ROOT, 'tools', 'pristine');
const CONTENT = path.join(ROOT, 'content', 'content.json');

const BUNDLE_OUT = path.join(ROOT, 'site', 'assets', 'index-DJZmi1tB.js');
const HTML_OUT = path.join(ROOT, 'site', 'index.html');

const content = JSON.parse(fs.readFileSync(CONTENT, 'utf8'));
const { z, outside, theme } = content;

if (!z || typeof z !== 'object') throw new Error('content.json: bagian "z" tidak ada.');
if (!outside) throw new Error('content.json: bagian "outside" tidak ada.');
if (typeof outside.treeBanner !== 'string' || outside.treeBanner.trim() === '') {
  throw new Error('content.json: "outside.treeBanner" tidak ada atau kosong — banner tidak boleh disuntik "undefined".');
}
if (typeof outside.replyMeUrl !== 'string' || outside.replyMeUrl.trim() === '') {
  throw new Error('content.json: "outside.replyMeUrl" tidak ada atau kosong — tombol Reply Me tidak boleh disuntik "undefined".');
}

const q = JSON.stringify;

// --- batas objek cerita di bundle ---
const Z_START = 'const Z={';
const Z_END = ',rt=[...Z.photos.map';

// --- anchor potongan di luar objek cerita (harus unik) ---
const WELCOME_ANCHOR =
  'className:"eyebrow pixel-ribbon welcome-ribbon",children:[' +
  '`${Z.sender.toUpperCase()} `' +
  ',c.jsx(Ie,{name:"heart",height:13}),' +
  '` ${Z.recipient.toUpperCase()}`' +
  ']';

const WELCOME_REPLACEMENT =
  'className:"eyebrow pixel-ribbon welcome-ribbon",children:[' +
  '`${Z.sender.toUpperCase()} `' +
  ',' + q(outside.welcomeSeparator) + ',' +
  '` ${Z.recipient.toUpperCase()}`' +
  ']';

const FOOTER_ANCHOR =
  'children:`© ${Z.year} ${Z.sender.toUpperCase()} · UNTUK ${Z.recipient.toUpperCase()}`';

const META_ANCHOR =
  'content="Our Little Anniversary Adventure: game 8-bit kecil dari Abun, khusus buat Aca. Happy anniversary!"';

const TITLE_ANCHOR = '<title>Our Little Anniversary Adventure</title>';

/**
 * Satu aturan = satu pola literal -> satu pengganti literal.
 * `expect` = jumlah kemunculan yang diharapkan. Kalau beda, gagal.
 */
const rules = [
  {
    file: 'bundle',
    label: 'outside.welcomeSeparator (ikon hati -> teks)',
    find: WELCOME_ANCHOR,
    replace: WELCOME_REPLACEMENT,
    expect: 1,
  },
  {
    file: 'bundle',
    label: 'outside.titleFooter (template -> literal)',
    find: FOOTER_ANCHOR,
    replace: 'children:' + q(outside.titleFooter),
    expect: 1,
  },
  // Sisa "anniversary" yang berada DI LUAR objek cerita (banner dunia, pita akhir,
  // teks foto polaroid, kredit, nama file unduhan). Isi cerita sudah diganti
  // lewat content.json -> "z", jadi hitungannya 8 + 2.
  {
    file: 'bundle',
    label: 'anniversary -> birthday (8x di luar cerita)',
    find: 'anniversary',
    replace: 'birthday',
    expect: 8,
  },
  {
    file: 'bundle',
    label: 'ANNIVERSARY -> BIRTHDAY (2x di luar cerita)',
    find: 'ANNIVERSARY',
    replace: 'BIRTHDAY',
    expect: 2,
  },
  {
    file: 'bundle',
    label: 'outside.treeBanner (banner di atas pohon)',
    find: '"HAPPY BIRTHDAY, MY LOVE"',
    replace: q(outside.treeBanner),
    expect: 1,
  },
  {
    file: 'bundle',
    label: 'ending-links: tambah tombol Reply Me (di bawah, ~300px)',
    find: 'children:"Kredit \u25b8"})]})]})]})',
    replace: 'children:"Kredit \u25b8"})]}) , c.jsx("a",{className:"secondary reply-me",href:' + q(outside.replyMeUrl) + ',target:"_blank",rel:"noopener noreferrer",style:{width:"300px",textAlign:"center",marginTop:"8px"},children:"Reply Me"}) ]})]})]})',
    expect: 1,
  },
  {
    label: '"di hari birthday kita" -> "di hari ulang tahun kita"',
    find: 'di hari birthday kita',
    replace: 'di hari ulang tahun kita',
    expect: 1,
  },
  {
    file: 'html',
    label: 'outside.htmlTitle',
    find: TITLE_ANCHOR,
    replace: '<title>' + outside.htmlTitle + '</title>',
    expect: 1,
  },
  {
    file: 'html',
    label: 'outside.metaDescription',
    find: META_ANCHOR,
    replace: 'content=' + q(outside.metaDescription),
    expect: 1,
  },
  {
    file: 'bundle',
    label: 'signature "Yang sayang kamu" -> "Your longtime bro"',
    find: 'Yang sayang kamu,',
    replace: 'Your longtime bro,',
    expect: 1,
  },
  {
    file: 'bundle',
    label: 'ending-wish "Happy birthday, Istii" -> "Happy birthday, Istiii"',
    find: '`Happy birthday, ${Z.recipient} \u2665`',
    replace: '`Happy birthday, Istiii`',
    expect: 1,
  },
];

// Kata yang tidak boleh tersisa di hasil akhir.
const forbidden = {
  bundle: ['Aca', 'Abun', 'anniversary', 'Anniversary', 'ANNIVERSARY'],
  html: ['Aca', 'Abun', 'anniversary', 'Anniversary', 'ANNIVERSARY'],
};

function countOccurrences(haystack, needle) {
  let i = -1;
  let n = 0;
  while ((i = haystack.indexOf(needle, i + 1)) !== -1) n++;
  return n;
}

/** Ganti seluruh literal objek cerita dengan versi dari content.json. */
function swapStoryObject(src) {
  const start = src.indexOf(Z_START);
  if (start < 0) throw new Error(`[GAGAL] "${Z_START}" tidak ditemukan di bundle.`);
  if (src.indexOf(Z_START, start + 1) !== -1) {
    throw new Error(`[GAGAL] "${Z_START}" muncul lebih dari sekali. Anchor ambigu.`);
  }
  const end = src.indexOf(Z_END, start);
  if (end < 0) throw new Error(`[GAGAL] penutup objek cerita "${Z_END}" tidak ditemukan.`);

  const before = src.slice(0, start);
  const after = src.slice(end);
  const swapped = before + 'const Z=' + JSON.stringify(z) + after;
  return { swapped, bytesOld: end - start, bytesNew: JSON.stringify(z).length };
}

function applyRules(source, fileName, results) {
  let out = source;
  const mine = rules.filter((r) => r.file === fileName);

  for (const rule of mine) {
    const found = countOccurrences(out, rule.find);
    if (found !== rule.expect) {
      throw new Error(
        `[GAGAL] Aturan "${rule.label}" pada ${fileName}: ` +
          `diharapkan ${rule.expect} kemunculan, ditemukan ${found}.\n` +
          `  Pola yang dicari:\n  ${rule.find}\n` +
          `  Kemungkinan bundle berubah / pola tidak lagi cocok. Berhenti, jangan lanjut.`,
      );
    }
    out = out.split(rule.find).join(rule.replace);
    results.push({ file: fileName, label: rule.label, count: found });
  }

  for (const bad of forbidden[fileName] ?? []) {
    const left = countOccurrences(out, bad);
    if (left !== 0) {
      throw new Error(`[GAGAL] Setelah patch, "${bad}" masih tersisa ${left}x di ${fileName}.`);
    }
  }

  return out;
}

function main() {
  const bundleSrc = fs.readFileSync(path.join(PRISTINE, 'index.js'), 'utf8');
  const htmlSrc = fs.readFileSync(path.join(PRISTINE, 'index.html'), 'utf8');

  const results = [];

  // 1. objek cerita
  const { swapped, bytesOld, bytesNew } = swapStoryObject(bundleSrc);
  results.push({
    file: 'bundle',
    label: `objek cerita Z (${bytesOld} -> ${bytesNew} byte)`,
    count: 1,
  });

  // 2. sisa aturan
  const bundleOut = applyRules(swapped, 'bundle', results);
  let htmlOut = applyRules(htmlSrc, 'html', results);

  // 3. lapisan tema
  const themeCfg = theme ?? { enabled: true, href: '/theme-faraz.css' };
  if (themeCfg.enabled) {
    const anchor = '<link rel="stylesheet" crossorigin href="/assets/index-B6Jwk_4R.css">';
    if (!htmlOut.includes(anchor)) {
      throw new Error('Anchor CSS utama tidak ditemukan di index.html; tema tidak bisa dipasang.');
    }
    htmlOut = htmlOut.replace(
      anchor,
      anchor +
        `\n    <!-- Lapisan tema. Set "theme.enabled": false di content.json untuk mematikan. -->\n` +
        `    <link rel="stylesheet" href="${themeCfg.href}">`,
    );
  }

  fs.writeFileSync(BUNDLE_OUT, bundleOut, 'utf8');
  fs.writeFileSync(HTML_OUT, htmlOut, 'utf8');

  console.log('PATCH SELESAI');
  console.log('  sumber : tools/pristine/index.js, tools/pristine/index.html');
  console.log('  konten : content/content.json');
  console.log('');
  for (const r of results) {
    console.log(`    ${String(r.count).padStart(2)}x  ${r.label}`);
  }
  console.log('');
  console.log(`  tulis  : ${path.relative(ROOT, BUNDLE_OUT)}`);
  console.log(`  tulis  : ${path.relative(ROOT, HTML_OUT)}`);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
