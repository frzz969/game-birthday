// Geser hue setiap kit: magenta/ungu -> coral/rose-gold, lewat ffmpeg.
// Dimensi piksel wajib identik; kalau berbeda, skrip berhenti dan melapor.
import { readdirSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets-kits/original');
const OUT = join(ROOT, 'assets-kits/recolored');

// ffmpeg 9 menamai opsi kecerahan `b`, bukan `brightness`.
const HUE = 'hue=h=42:s=1.15,format=rgba';
const HUE_LIFT = 'hue=h=42:s=1.15:b=0.02,format=rgba';

const run = (args) => spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });

const probeSize = (file) => {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
     '-of', 'csv=p=0', file],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`ffprobe gagal: ${file}\n${r.stderr}`);
  return r.stdout.trim();
};

// Rata-rata warna lewat downscale 1x1, dipakai membandingkan kecerahan sebelum/sesudah.
const meanLuma = (file) => {
  const r = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-vf', 'scale=1:1,format=rgb24', '-f', 'rawvideo', '-'],
    { maxBuffer: 1 << 20 },
  );
  if (r.status !== 0) throw new Error(`baca luma gagal: ${file}`);
  const [R, G, B] = r.stdout;
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.endsWith('.png')).sort();
const failures = [];
const report = [];

for (const file of files) {
  const src = join(SRC, file);
  const dst = join(OUT, file);
  const before = probeSize(src);
  const lumaBefore = meanLuma(src);

  let filter = HUE;
  let result = run(['-i', src, '-vf', filter, dst]);
  if (result.status !== 0) {
    failures.push(`${file}: ffmpeg gagal (${result.stderr.trim().split('\n')[0]})`);
    continue;
  }

  // Varian pressed (-down) yang ikut menggelap karena pergeseran hue dinaikkan sedikit.
  let lifted = false;
  if (/-down/.test(file)) {
    const lumaAfter = meanLuma(dst);
    if (lumaAfter < lumaBefore - 1.5) {
      filter = HUE_LIFT;
      result = run(['-i', src, '-vf', filter, dst]);
      if (result.status !== 0) {
        failures.push(`${file}: ffmpeg gagal saat lift (${result.stderr.trim().split('\n')[0]})`);
        continue;
      }
      lifted = true;
    }
  }

  const after = probeSize(dst);
  if (before !== after) {
    failures.push(`${file}: DIMENSI BERUBAH ${before} -> ${after}`);
    continue;
  }
  if (readFileSync(dst).subarray(1, 4).toString() !== 'PNG') {
    failures.push(`${file}: keluaran bukan PNG`);
    continue;
  }
  report.push({ file, size: after, lifted });
}

console.log(`diproses ${report.length}/${files.length} PNG -> ${OUT}`);
for (const r of report) {
  console.log(`  ${r.file.padEnd(30)} ${r.size.padEnd(9)}${r.lifted ? 'brightness+0.02' : ''}`);
}
if (failures.length) {
  console.log(`\nGAGAL ${failures.length}:`);
  for (const f of failures) console.log(`  ${f}`);
  process.exitCode = 1;
}
