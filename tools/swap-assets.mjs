// Ganti asset asli <-> asset baru (backup), bolak-balik.
// Pakai: node tools/swap-assets.mjs new      -> pakai art baru
//        node tools/swap-assets.mjs orig     -> balik ke art asli
//        node tools/swap-assets.mjs status   -> lihat kondisi sekarang
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
const backup = join(root, "assets-backup");
const stateFile = join(backup, "state.json");

// target di site  ->  sumber asset baru
const MAP = {
  "assets/reference-art/sky.webp": "sky-new.webp",
  "assets/reference-art/hero.webp": "hero-new.webp",
};

function ensureBackup() {
  mkdirSync(backup, { recursive: true });
  for (const rel of Object.keys(MAP)) {
    const src = join(site, rel);
    const dst = join(backup, rel);
    if (!existsSync(dst)) {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
    }
  }
}

function state() {
  if (!existsSync(stateFile)) return "orig";
  try {
    return JSON.parse(readFileSync(stateFile, "utf8")).mode ?? "orig";
  } catch {
    return "orig";
  }
}

function setState(mode) {
  writeFileSync(stateFile, JSON.stringify({ mode, at: new Date().toISOString() }, null, 2));
}

const cmd = process.argv[2] ?? "status";

if (cmd === "status") {
  console.log("Mode asset sekarang:", state());
  for (const [rel, src] of Object.entries(MAP)) {
    const p = join(site, rel);
    console.log(`  ${rel} -> ${existsSync(p) ? "ada" : "HILANG"} (sumber baru: assets-new/${src})`);
  }
} else if (cmd === "new") {
  ensureBackup();
  for (const [rel, src] of Object.entries(MAP)) {
    const from = join(root, "assets-new", src);
    if (!existsSync(from)) {
      console.error(`GAGAL: asset baru tidak ada: ${from}`);
      process.exit(1);
    }
    copyFileSync(from, join(site, rel));
    console.log(`dipakai: ${rel} <- assets-new/${src}`);
  }
  setState("new");
  console.log("Selesai. Art baru aktif. Balikkan dengan: node tools/swap-assets.mjs orig");
} else if (cmd === "orig") {
  for (const rel of Object.keys(MAP)) {
    const from = join(backup, rel);
    if (!existsSync(from)) {
      console.error(`GAGAL: backup tidak ada untuk ${rel}. Jalankan 'new' dulu sekali.`);
      process.exit(1);
    }
    copyFileSync(from, join(site, rel));
    console.log(`dipulihkan: ${rel}`);
  }
  setState("orig");
  console.log("Selesai. Art asli aktif.");
} else {
  console.error("Perintah tidak dikenal. Pakai: new | orig | status");
  process.exit(1);
}
