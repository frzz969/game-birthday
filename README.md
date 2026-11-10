# Our Little Birthday Adventure

Salinan lokal dari `https://our-little-birthday-adventure.vercel.app/` dengan teks pemeran, badge, dan footer disesuaikan.
Struktur, alur, dunia, dan seluruh aset aslinya dipertahankan apa adanya.

## Jalankan

```bash
node tools/serve.mjs
# buka http://localhost:4321
```

Butuh Node.js saja. Tidak ada `npm install`, tidak ada dependency.

## Struktur

```
site/                    # yang disajikan ke browser (hasil build + patch)
  index.html
  theme-faraz.css        # lapisan tema (coral hangat), bisa dimatikan
  assets/                # bundle, css, font, semua gambar & audio asli
  songs/                 # placeholder backsound & 5 lagu
tools/
  serve.mjs              # static server, port 4321
  patch.mjs              # menerapkan content/content.json ke bundle
  swap-assets.mjs        # tukar art asli <-> art baru (bolak-balik)
  pristine/              # bundle ASLI, byte-identik, jangan diubah
content/
  content.json           # SATU-SATUNYA tempat mengedit teks
assets-new/              # art baru (cadangan)
assets-backup/           # arsip art asli, dibuat otomatis oleh swap-assets
```

## Tema warna

Warna asli game ini bukan hex CSS, tapi gambar 9-slice PNG yang ditanam sebagai
variabel `--kit-pink`, `--kit-lavender`, `--kit-navy`, dan seterusnya. Jadi palet
digeser **di level gambar**, bukan di level warna CSS.

Alur tiga langkah:

```bash
node tools/extract-kits.mjs   # PNG asli  -> assets-kits/original   (58 berkas)
node tools/recolor-kits.mjs   # hue +42°  -> assets-kits/recolored  (58 berkas)
node tools/embed-kits.mjs     # tanam jadi --kit-* di site/theme-faraz.css
```

`embed-kits.mjs` idempoten: isi blok penanda diganti, bukan ditumpuk. Dua varian
(`:root` dan `@media(max-width:700px),(max-height:600px)`) dijaga terpisah -
kalau tertukar, 9-slice gepeng di layar kecil.

Hasilnya: keluarga magenta (pita judul, tombol, panel) jadi coral hangat.
Kit navy (kotak dialog, tombol ikon) sengaja dibiarkan gelap supaya teks tetap kontras.

- Matikan: set `"theme": { "enabled": false }` di `content/content.json`, lalu `node tools/patch.mjs`.
- Hapus permanen: hapus baris `<link rel="stylesheet" href="/theme-faraz.css">` di `site/index.html`.

Link tema dipasang oleh `patch.mjs`, bukan diedit manual - supaya tidak hilang setiap kali patch dijalankan.


## Edit teks

**Panduan langkah demi langkah: [`CARA-EDIT-KALIMAT.md`](CARA-EDIT-KALIMAT.md)**

Semua kalimat game ada di `content/content.json`. Setelah diedit:

```bash
node tools/patch.mjs
```

Cara kerjanya: seluruh objek cerita (`const Z={...}` di bundle) **diganti utuh**
dengan bagian `"z"` dari `content.json`. Jadi tidak ada lagi teks yang terkunci -
surat, harapan, caption foto, dialog Moci, semuanya bisa diedit dari satu file.

Sisanya (`"outside"`) menangani teks yang berada di luar objek cerita:

| Field | Efek |
|---|---|
| `outside.welcomeSeparator` | Pemisah di badge judul (`>`) |
| `outside.titleFooter` | Baris footer layar judul |
| `outside.htmlTitle` | Judul tab browser |
| `outside.metaDescription` | Meta description |
| `outside.treeBanner` | Banner teks di atas pohon (layar akhir) |
| `outside.replyMeUrl` | Link WhatsApp tombol "Reply Me" |
| `outside.replyMeMessage` | Pesan otomatis yang terisi di WhatsApp |

Karena selalu mulai dari `tools/pristine/`, hasilnya idempoten - jalankan berapa kali pun sama.
Kalau ada pola yang tidak ketemu, skrip **gagal** dan memberi tahu, bukan diam-diam melewati.

## Ganti foto & lagu dengan milik sendiri

Game ini mencari berkas di lokasi tetap:

- Foto: `site/assets/journey/photo-1.webp` .. `photo-6.webp` (736x552) + `photo-N-thumb.webp` (256x256)
- Video: `site/assets/journey/video-1.mp4`, `video-2.mp4`
- Lagu: `site/songs/01-.mp3` .. `05-.mp3` dan `site/songs/00-backsound.mp3`
- Foto bareng di akhir: `site/assets/journey/photo-6.webp`

Cukup timpa berkasnya dengan nama yang sama (jaga rasio biar tidak gepeng), lalu refresh.
Catatan: `site/songs/*.mp3` saat ini berisi salinan `song-1.wav` sebagai placeholder -
ganti dengan MP3 asli kalau mau ada suara.

## Art baru (cadangan - TIDAK dipakai)

**Status sekarang: art ASLI yang aktif.** Art baru disimpan sebagai cadangan.
Alasannya: langit baru lebih pucat dan awannya jauh lebih kasar, sementara sprite
baru gayanya beda sendiri dibanding Peach & Sky Blue - di kartu outfit kelihatan
tidak satu keluarga. Art asli menang secara visual.

`assets-new/` berisi art baru bergaya pixel 16-bit dengan palet rose-gold:

| Berkas | Isi |
|---|---|
| `sky-new.webp` | Langit sunrise 1672x941, horizon di ~65% (sama seperti aslinya) |
| `hero-new.webp` | Sprite 5 frame 1983x793, diposisikan presisi ke kotak frame game |
| `Cute_pixel_art_portrait_.png` | Avatar kelinci Moci (belum dipasang) |
| `Pixel_art_game_prop_.png` | Kotak pos (belum dipasang) |
| `preview-hero.png`, `preview-sky2.png` | Pratinjau |

```bash
node tools/swap-assets.mjs new    # pakai art baru
node tools/swap-assets.mjs orig   # balik ke art asli
node tools/swap-assets.mjs status # cek mode sekarang
```

### Kenapa sprite butuh skrip khusus

Game mengambil 5 frame dari satu gambar dengan koordinat tetap (array `boxes` di bundle:
`[50,202,300,475]`, `[431,202,301,475]`, `[815,208,328,469]`, `[1206,208,338,469]`, `[1605,188,333,416]`).
Kalau gambar pengganti tidak menaruh karakter di koordinat itu, hasilnya karakter mengecil,
melayang, atau terpotong. `tools/build-hero.mjs` menyelesaikannya:

1. key out latar hijau (`colorkey`), **bukan** `chromakey` - hijau hasil generator biasanya
   bukan `#00FF00` (punya sheet ini `#379b3d`, bisa diatur lewat env `KEY_COLOR`)
2. hitung bounding box tiap karakter dari kanal alpha
3. skala tiap frame ke tinggi kotaknya, rata bawah, tengah horizontal
4. tempel ke kanvas transparan 1983x793

```bash
node tools/build-hero.mjs assets-new/<sheet>.png
```

Catatan penting: generator gambar kadang menggambar **pola kotak-kotak "transparan" palsu**
ke dalam PNG. Kalau itu terjadi, alpha-nya tidak nyata dan harus di-generate ulang dengan
latar hijau solid - bukan di-key dari pola kotak.

### Langit

Game memaksa rasio langit `1672/941` dan menampilkannya diskalakan kamera. Jadi yang
menentukan bukan ukuran file, tapi **posisi horizon** di dalam gambar. Horizon terlalu
rendah = yang tampil hampir semua langit. Nilai yang dipakai: horizon ~65% dari atas,
laut mengisi ~35% bawah, dan watermark generator dipotong keluar.

## Selisih yang diketahui dari asli

1. Teks pemeran, badge, dan footer disesuaikan (nama, pesan, caption) - diminta.
2. `site/songs/*.mp3` diisi placeholder; situs asli mengembalikan 404 untuk semua MP3-nya.
3. Baris petunjuk tombol di bawah kanan bisa terpotong di layar sempit - perilaku ini
   sama dengan aslinya, bukan regresi klon.
4. Palet baru hanya menggeser keluarga magenta (pita, tombol, panel) ke coral. Kit navy
   (kotak dialog, tombol ikon) tetap plum gelap - sengaja, supaya teks tetap kontras.

## Asal-usul

Kode, desain, dan art asli dibuat oleh pembuat game aslinya.
Repo ini adalah salinan untuk pemakaian pribadi; kalau mau dipublikasikan,
minta izin pembuat aslinya dulu.
