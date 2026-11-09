// tools/build-hero.mjs
// Membangun ulang `assets-new/hero-new.webp` dari sprite sheet green-screen,
// lalu menempatkan tiap frame PERSIS ke kotak frame yang dipakai game.
//
// Kenapa perlu: game mengambil 5 frame dari satu gambar dengan koordinat tetap
// (array `boxes` di bundle). Kalau gambar pengganti tidak menaruh karakter di
// koordinat yang sama, karakternya tampak kecil / melayang / terpotong.
//
// Pakai: node tools/build-hero.mjs <sheet.png>
// Butuh ffmpeg di PATH. Tanpa dependency npm.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets-new", "hero-new.webp");

// Kotak frame asli, persis seperti di bundle game: [x, y, w, h] pada kanvas 1983x793
const BOXES = [
  [50, 202, 300, 475],
  [431, 202, 301, 475],
  [815, 208, 328, 469],
  [1206, 208, 338, 469],
  [1605, 188, 333, 416],
];
const CANVAS_W = 1983;
const CANVAS_H = 793;

// Watermark generator ada di pojok kanan bawah; area karakter tidak sampai situ.
const CROP_H = 940;

// Warna latar chroma-key. JANGAN diasumsikan #00FF00 — model gambar sering
// menghasilkan hijau yang lebih kusam. Nilai di bawah diambil langsung dari
// piksel pojok sheet (lihat README). Ganti kalau sheet baru memakai hijau lain.
const KEY_COLOR = process.env.KEY_COLOR ?? "0x379b3d";
const KEY_SIM = process.env.KEY_SIM ?? "0.10";
const KEY_BLEND = process.env.KEY_BLEND ?? "0.02";

const sheet = process.argv[2];
if (!sheet || !existsSync(sheet)) {
  console.error("Pakai: node tools/build-hero.mjs <path-sprite-sheet.png>");
  process.exit(1);
}

// --- 1. key out green, ambil piksel mentah RGBA ---
const raw = execFileSync(
  "ffmpeg",
  ["-v", "error", "-i", sheet, "-vf",
    `crop=1536:${CROP_H}:0:0,colorkey=${KEY_COLOR}:${KEY_SIM}:${KEY_BLEND},format=rgba`,
    "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
  { maxBuffer: 1024 * 1024 * 200 },
);

const W = 1536;
const H = CROP_H;
const expected = W * H * 4;
if (raw.length !== expected) {
  console.error(`GAGAL: ukuran buffer ${raw.length}, harusnya ${expected}. Cek dimensi sheet.`);
  process.exit(1);
}

// --- 2. bounding box per frame (5 kolom) ---
const colWidths = [307, 307, 307, 307, 308];
const boxes = [];
let colX = 0;
for (let i = 0; i < 5; i++) {
  const w = colWidths[i];
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = colX; x < colX + w; x++) {
      if (raw[(y * W + x) * 4 + 3] > 32) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    console.error(`GAGAL: frame ${i + 1} kosong setelah chroma key.`);
    process.exit(1);
  }
  boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
  colX += w;
}

console.log("bounding box per frame:");
boxes.forEach((b, i) => console.log(`  #${i + 1}  x=${b.x} y=${b.y} w=${b.w} h=${b.h}`));

// --- 3. susun filter: key out green SEKALI, pecah 5, crop, skala, tempel ke kotak asli ---
const parts = [];
const labels = [];
parts.push(
  `[0:v]crop=${W}:${H}:0:0,colorkey=${KEY_COLOR}:${KEY_SIM}:${KEY_BLEND},format=rgba,split=5` +
    [0, 1, 2, 3, 4].map((i) => `[s${i}]`).join(""),
);
for (let i = 0; i < 5; i++) {
  const b = boxes[i];
  const [, , bw, bh] = BOXES[i];
  // tinggi karakter disamakan dengan tinggi kotak; lebar mengikuti rasio asli
  let sh = bh;
  let sw = Math.round((b.w * sh) / b.h);
  if (sw > bw) {
    sw = bw;
    sh = Math.round((b.h * sw) / b.w);
  }
  const dx = BOXES[i][0] + Math.round((bw - sw) / 2);
  const dy = BOXES[i][1] + (bh - sh); // rata bawah: kaki menapak di dasar kotak
  parts.push(`[s${i}]crop=${b.w}:${b.h}:${b.x}:${b.y},scale=${sw}:${sh}:flags=lanczos[f${i}]`);
  labels.push({ label: `f${i}`, dx, dy, sw, sh });
}

let chain = `color=c=black@0.0:s=${CANVAS_W}x${CANVAS_H}:d=1[bg]`;
labels.forEach((f, i) => {
  const prev = i === 0 ? "bg" : `x${i}`;
  chain += `;[${prev}][${f.label}]overlay=${f.dx}:${f.dy}[x${i + 1}]`;
});

const filter = parts.join(";") + ";" + chain;

console.log("penempatan:");
labels.forEach((f, i) =>
  console.log(`  #${i + 1}  ${f.sw}x${f.sh} @ (${f.dx}, ${f.dy})  dalam kotak ${BOXES[i].slice(2).join("x")}`),
);

execFileSync("ffmpeg", [
  "-y", "-v", "error", "-i", sheet,
  "-filter_complex", filter,
  "-map", `[x5]`,
  "-c:v", "libwebp", "-quality", "88",
  OUT,
]);

console.log(`\ntulis: ${OUT}`);
