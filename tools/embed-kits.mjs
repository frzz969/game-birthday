// tools/embed-kits.mjs
// Menanam ulang PNG 9-slice hasil recolor (assets-kits/recolored) ke dalam
// site/theme-faraz.css sebagai override variabel --kit-*.
//
// Idempoten: isi blok penanda diganti, bukan ditumpuk.
// Pakai: node tools/embed-kits.mjs
//
// Dua varian wajib dijaga terpisah, karena CSS asli memakai dua set gambar:
//   - `:root`                                        -> file `<nama>.png`
//   - `@media(max-width:700px),(max-height:600px)`    -> file `<nama>--compact.png`
// Kalau tertukar, 9-slice akan gepeng di layar kecil.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets-kits', 'recolored');
const THEME = join(ROOT, 'site', 'theme-faraz.css');
const COMPACT_AT = '@media(max-width:700px),(max-height:600px)';

const BEGIN = '/* ===== BEGIN auto-generated kits (tools/embed-kits.mjs) ===== */';
const END = '/* ===== END auto-generated kits ===== */';

if (!existsSync(SRC)) {
  console.error(`GAGAL: folder hasil recolor tidak ada: ${SRC}`);
  process.exit(1);
}

const files = readdirSync(SRC).filter((f) => f.endsWith('.png'));
if (files.length === 0) {
  console.error('GAGAL: tidak ada PNG di folder recolor.');
  process.exit(1);
}

const rootDecls = [];
const compactDecls = [];

for (const file of files.sort()) {
  const isCompact = file.endsWith('--compact.png');
  const name = file.replace(/--compact\.png$/, '').replace(/\.png$/, '');
  const b64 = readFileSync(join(SRC, file)).toString('base64');
  const decl = `--kit-${name}:url("data:image/png;base64,${b64}")`;
  (isCompact ? compactDecls : rootDecls).push(decl);
}

if (rootDecls.length === 0 || compactDecls.length === 0) {
  console.error(`GAGAL: varian tidak lengkap (root ${rootDecls.length}, compact ${compactDecls.length}).`);
  process.exit(1);
}

const block =
  `${BEGIN}\n` +
  `:root{\n  ${rootDecls.join(';\n  ')}\n}\n` +
  `@media ${COMPACT_AT}{\n:root{\n  ${compactDecls.join(';\n  ')}\n}\n}\n` +
  `${END}`;

let css = readFileSync(THEME, 'utf8');
const hasBlock = css.includes(BEGIN) && css.includes(END);

if (hasBlock) {
  const start = css.indexOf(BEGIN);
  const stop = css.indexOf(END) + END.length;
  css = css.slice(0, start) + block + css.slice(stop);
} else {
  css = css.trimEnd() + '\n\n' + block + '\n';
}

writeFileSync(THEME, css, 'utf8');

console.log('TANAM KIT SELESAI');
console.log(`  root    : ${rootDecls.length} kit`);
console.log(`  compact : ${compactDecls.length} kit`);
console.log(`  total   : ${rootDecls.length + compactDecls.length} (harus sama dengan jumlah PNG: ${files.length})`);
console.log(`  blok    : ${hasBlock ? 'diganti (idempoten)' : 'ditambahkan'}`);
console.log(`  tulis   : site/theme-faraz.css (${(css.length / 1024).toFixed(0)} KB)`);
