// Ekstrak PNG 9-slice yang ditanam sebagai --kit-* di CSS bundle.
// Dua varian: :root (1x) dan @media(max-width:700px),(max-height:600px) (compact).
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS = join(ROOT, 'site/assets/index-B6Jwk_4R.css');
const OUT = join(ROOT, 'assets-kits/original');
const COMPACT_AT = '@media(max-width:700px),(max-height:600px)';

const css = readFileSync(CSS, 'utf8');
const compactStart = css.indexOf(COMPACT_AT);
if (compactStart < 0) throw new Error(`media query tidak ditemukan: ${COMPACT_AT}`);

const re = /--kit-([a-z-]+)\s*:\s*url\(\s*["']?data:image\/png;base64,([A-Za-z0-9+/=]+)["']?\s*\)/g;
const kits = [];
let m;
while ((m = re.exec(css))) {
  kits.push({
    name: m[1],
    variant: m.index > compactStart ? 'compact' : 'root',
    buf: Buffer.from(m[2], 'base64'),
  });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const seen = new Set();
for (const k of kits) {
  const file = k.variant === 'root' ? `${k.name}.png` : `${k.name}--${k.variant}.png`;
  if (seen.has(file)) throw new Error(`duplikat nama kit: ${file}`);
  seen.add(file);
  if (k.buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file}: bukan PNG`);
  writeFileSync(join(OUT, file), k.buf);
  const w = k.buf.readUInt32BE(16);
  const h = k.buf.readUInt32BE(20);
  console.log(`${k.variant.padEnd(8)} ${file.padEnd(30)} ${w}x${h}  ${k.buf.length} B`);
}

const byVariant = kits.reduce((a, k) => ((a[k.variant] = (a[k.variant] ?? 0) + 1), a), {});
console.log(`\ntotal ${kits.length} PNG -> ${OUT}`);
console.log(`  root ${byVariant.root ?? 0}, compact ${byVariant.compact ?? 0}`);
