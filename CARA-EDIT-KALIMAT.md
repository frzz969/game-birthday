# Cara ganti kalimat di dalam game

Semua kalimat ada di **satu file**: `content/content.json`.
Setelah diedit, jalankan satu perintah. Selesai.

```bash
cd "E:/folder projek vs code/faraz-istii-game"

# 1. edit content/content.json pakai VS Code
# 2. terapkan
node tools/patch.mjs

# 3. lihat hasilnya
node tools/serve.mjs      # buka http://localhost:4321
```

Kalau `patch.mjs` bilang **PATCH SELESAI**, berarti berhasil.
Kalau gagal, dia kasih tahu persis apa yang salah — file game tidak akan dirusak.

---

## Di mana kalimat yang mana

Buka `content/content.json`, cari bagian `"z"`. Isinya:

| Yang mau diganti | Lokasi di JSON |
|---|---|
| Nama penerima | `z.recipient` |
| Nama pengirim | `z.sender` |
| Judul game (3 baris logo) | `z.title`, `z.logo` |
| Judul surat | `z.letterTitle` |
| Isi surat (5 paragraf) | `z.letter` — array, `[0]` paragraf pertama |
| Judul pesan kedua | `z.secondMessageTitle` |
| 3 harapan | `z.wishes` |
| Judul layar akhir | `z.finalTitle` |
| Pesan penutup | `z.finalMessage` |
| Judul + caption 6 foto | `z.photos[0..5].title` / `.caption` |
| Judul + caption 2 video | `z.videos[0..1]` |
| Judul, artis, caption 5 lagu | `z.songs[0..4]` |
| Nama kelinci pemandu | `z.guide.name` |
| Semua dialog kelinci | `z.guide.lines` |

Di luar `"z"`, ada `"outside"`:

| Yang mau diganti | Lokasi |
|---|---|
| Pemisah di badge judul (`>`) | `outside.welcomeSeparator` |
| Footer layar judul | `outside.titleFooter` |
| Judul tab browser | `outside.htmlTitle` |
| Deskripsi untuk mesin pencari | `outside.metaDescription` |

---

## Contoh: ganti satu paragraf surat

Cari di JSON:

```json
"letter": [
  "Hai, Istii,",
  "Happy birthday! Nggak kerasa kita udah sejauh ini. ...",
```

Ganti teks di dalam tanda kutip, **jangan hapus koma dan tanda kutipnya**:

```json
"letter": [
  "Hai, Istii,",
  "Happy birthday ya! Hari ini kamu resmi makin tua, dan aku makin sayang.",
```

Simpan → `node tools/patch.mjs` → refresh browser.

## Contoh: ganti caption foto ke-3

```json
"photos": [
  { "title": "Selfie dulu, baru jalan", "caption": "..." },
  { "title": "Mode receh: ON", "caption": "..." },
  { "title": "Pipi, korban favoritmu", "caption": "GANTI DI SINI" },
```

---

## 3 aturan yang bikin gagal

**1. Jangan hapus placeholder.** Teks seperti `{recipient}`, `{sender}`, `{left}`,
`{next}`, `{photos}`, `{songs}`, `{controls}` diisi otomatis oleh game.
`{recipient}` akan jadi `Istii`. Kalau dihapus, kalimatnya jadi bolong.

**2. Jangan hapus tanda kutip dan koma.** File ini JSON, bukan teks bebas.
Kalau ada `"` di dalam kalimat, tulis `\"`. Lebih aman: pakai kutip tunggal `'` saja.

**3. Jangan hapus `[` `]` `{` `}`.** Itu kerangka daftar dan objek.

Kalau JSON-nya rusak, `patch.mjs` akan menolak dan kasih tahu baris mana.
File game **tidak** ikut rusak karena patch selalu mulai dari salinan asli
di `tools/pristine/`.

---

## Kalau salah edit dan mau balik

Tinggal perbaiki teksnya di JSON, lalu `node tools/patch.mjs` lagi. Patch selalu
mulai dari salinan asli di `tools/pristine/`, jadi tidak ada sisa edit yang
menumpuk atau nyangkut.

Mau benar-benar balik ke teks awal? Copy `content/content.json` dulu sebelum
mengubah banyak hal:

```bash
cp content/content.json content/content.backup.json
```

Kalau kacau, kembalikan:

```bash
cp content/content.backup.json content/content.json && node tools/patch.mjs
```

---

## Ganti foto dan lagu

Itu bukan di JSON, tapi dengan menimpa file:

- Foto: `site/assets/journey/photo-1.webp` … `photo-6.webp` (736×552)
  dan thumbnail `photo-N-thumb.webp` (256×256)
- Lagu: `site/songs/01-...mp3` … `05-...mp3`, `00-backsound.mp3`
- Video: `site/assets/journey/video-1.mp4`, `video-2.mp4`

Timpa dengan nama yang sama, jaga rasionya biar tidak gepeng.
