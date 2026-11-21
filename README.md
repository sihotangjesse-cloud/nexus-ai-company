# NEXUS PERSONAL

**Versi 1.8.0 — ruang kerja lokal dengan GitHub Explorer publik hanya-baca**

NEXUS PERSONAL adalah aplikasi pribadi untuk satu pemilik. Kamu dapat mengelola proyek website, checklist, tugas, ide, catatan, laporan, menggunakan asisten generatif kecil di browser melalui WebAssembly, dan membaca repository GitHub publik secara opsional.

## Aturan operasi pribadi

- Chat AI generatif menggunakan model GGUF yang kamu pilih dari perangkat dan diproses langsung di browser.
- Tidak ada permintaan inferensi ke layanan AI cloud, API key, akun AI, langganan, transaksi, atau kredit.
- Kode mesin WebAssembly dan file WASM diambil dari versi Wllama yang dipatok di jsDelivr hanya ketika kamu menekan tombol **Muat model lokal**. Pengambilan file mesin pertama kali memerlukan koneksi internet.
- File model GGUF diunduh sendiri dari repositori model resmi, lalu dipilih dari perangkat. Isi percakapan dan file model pilihan tidak diunggah oleh NEXUS ke layanan AI.
- NEXUS menggunakan browser Worker/WebAssembly untuk inferensi CPU satu thread. Tidak ada server AI localhost atau backend AI.
- Server Python lokal di Android/Windows menyajikan aplikasi dan menyediakan workspace file pada alamat loopback perangkat. Server ini bukan server AI dan tidak dapat diakses dari jaringan luar.

Backend lama tetap ada di repositori untuk riwayat/pengujian, tetapi antarmuka pribadi memblokir endpoint backend. Jangan mengatur API key atau menjalankan backend lama untuk mode ini.

## Buka aplikasi

### Windows
1. Unduh [ZIP branch main](https://github.com/sihotangjesse-cloud/nexus-ai-company/archive/refs/heads/main.zip).
2. Ekstrak ZIP.
3. Klik dua kali **Buka-NEXUS-Personal.bat** untuk memakai ruang kerja biasa.
4. Laptop dengan RAM 2 GB tidak direkomendasikan untuk menjalankan model bahasa lokal. Gunakan Dashboard, Proyek, Website Studio, Catatan, dan fitur kerja tanpa memuat model.

### Android
1. Ekstrak ZIP repo ke folder perangkat.
2. Siapkan Termux dan Python. Di Termux jalankan `pkg install python` satu kali.
3. Masuk ke folder repo yang sudah diekstrak.
4. Jalankan `bash scripts/start-nexus-android.sh`.
5. Buka `http://127.0.0.1:4173/` di Chrome pada perangkat yang sama.
6. Server hanya terikat ke `127.0.0.1`; jangan ubah alamat bind menjadi `0.0.0.0`.

Launcher Android menjalankan aplikasi dan jembatan File Workspace pada alamat loopback yang sama. Untuk melihat serta menyimpan file di penyimpanan bersama Android, jalankan `termux-setup-storage` satu kali dan izinkan akses. Menu File Workspace tidak tersedia saat halaman dibuka langsung dengan `file://`. Untuk memuat modul AI WebAssembly, tetap gunakan alamat localhost.

## Asisten AI generatif lokal

Buka menu **Asisten AI**. Unduh sendiri model instruksi GGUF kecil dari repositori resmi [Qwen2.5-0.5B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF), lalu pilih varian kuantisasi **Q4_K_M** (sekitar 491 MB pada halaman repositori saat dokumentasi ini diperiksa).

1. Pilih file `.gguf` dari penyimpanan perangkat.
2. Tekan **Muat model lokal** dan tunggu pemuatan selesai.
3. Tulis pertanyaan singkat. Jawaban dibuat oleh model yang sedang berjalan di perangkat.
4. Tekan **Lepas model** ketika selesai untuk membebaskan memori.
5. Gunakan **Hapus percakapan** untuk menghapus riwayat chat lokal.

Batas implementasi saat ini: context 2.048 token, satu thread CPU, dan maksimal 256 token output per jawaban. Perangkat perlu ruang RAM tambahan di luar ukuran file model. Pada ponsel kelas pemula, model dapat berjalan lambat, browser bisa berhenti karena memori, atau pemuatan dapat gagal. Mulailah dari model 0.5B Q4; ini hanya uji awal, bukan jaminan kompatibel pada setiap perangkat.

Untuk Galaxy A05s/SM-A057F, varian memori perangkat dapat berbeda. Pada varian RAM 4 GB, tutup aplikasi lain sebelum mencoba. Laptop lama dengan RAM 2 GB tidak cocok untuk inferensi model tersebut.

**Keterbatasan kualitas:** model 0.5B jauh lebih kecil dan biasanya kurang cermat daripada ChatGPT atau model cloud besar. Jawaban dapat keliru, dangkal, atau tidak mengikuti instruksi. Gunakan untuk draf, ide sederhana, dan latihan; verifikasi fakta penting. Prompt keselamatan aplikasi bukan jaminan bahwa model kecil akan selalu patuh.

Asisten model GGUF masih hanya menghasilkan teks dan belum dapat memanggil alat secara otomatis, mencari internet, atau mengakses GitHub. Fitur File Workspace adalah alat terpisah yang hanya membaca/menyimpan file setelah persetujuan pemilik. Jangan masukkan sandi atau informasi pribadi/sensitif ke percakapan.

## File Workspace lokal v1.7.0

Jalankan `bash scripts/start-nexus-android.sh` di Termux, lalu buka `http://127.0.0.1:4173/` dan pilih **File Workspace**. Di Android, jalankan `termux-setup-storage` sekali lalu izinkan akses file agar folder `NEXUS-Workspace` berada di penyimpanan bersama. Tanpa izin tersebut, folder dibuat di ruang privat Termux. Windows dapat memakai `Start-NEXUS-Workspace.bat` dengan Python 3.

Fitur awal: daftar folder dan file teks, baca file, usulkan file baru/perubahan, lihat isi sebelum/sesudah, lalu setujui penyimpanan. Tidak ada tombol hapus. File dibatasi ke ekstensi teks yang diizinkan, maksimal 512 KB untuk dibaca dan 256 KB untuk perubahan; file tersembunyi/sensitif dan path di luar workspace diblokir.

Tombol **Periksa sintaks** hanya memeriksa Python (AST), JavaScript (`node --check`), dan JSON. Kode proyek tidak dijalankan. Pemeriksaan JavaScript membutuhkan Node.js. Workspace tidak otomatis tersinkronisasi ke GitHub atau antarperangkat; pindahkan/backup folder sendiri.

## GitHub Explorer publik hanya-baca v1.8.0

Menu **GitHub** dapat membuka folder dan membaca file teks dari repository publik melalui GitHub REST API. Masukkan format `owner/repo`, branch, dan path folder. Pilih file untuk membaca isinya dan gunakan **Salin isi file** jika ingin memindahkannya ke File Workspace.

Fitur ini hanya membuat permintaan HTTPS GET ke `api.github.com` setelah kamu menekan tombol. Tidak meminta token, tidak mengakses repository privat, dan tidak bisa mengubah file, branch, commit, atau push ke GitHub. Isi chat AI dan file workspace lokal tidak dikirim. File teks dibatasi 512 KB.

GitHub mendokumentasikan batas permintaan REST tanpa autentikasi sebesar 60 permintaan per jam per alamat IP. Jika kuota habis, tunggu hingga jendela batas berakhir. Baca dokumentasi resmi [GitHub REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) dan [CORS](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests).

## Ruang proyek website

Buka **Proyek → Proyek website baru**. Isi nama, jenis website, tujuan, teknologi, dan target tanggal. NEXUS membuat checklist lokal yang terhubung dengan ruang proyek.

Jenis proyek: company profile, landing page, portfolio, toko online, blog, dan web app/dashboard. Checklist dibagi ke peran virtual untuk koordinasi, riset, perencanaan, desain, penulisan, SEO, pengembangan, dan QA. Peran tersebut adalah template kerja lokal, bukan beberapa model AI yang berjalan di latar belakang.

Di detail proyek pilih **Unduh website HTML** untuk menghasilkan halaman statis yang bisa dibuka dan diedit lagi.

## Website Studio offline

Edit nama brand, label, judul, deskripsi, teks tombol, warna utama, tiga kartu fitur, bagian tentang, dan kontak. Pratinjau berubah saat konten diedit. Simpan perubahan pada proyek lalu unduh satu file HTML mandiri. Pratinjau menggunakan iframe sandbox tanpa JavaScript atau aset eksternal. Hasilnya frontend statis, bukan sistem database, login, API, pembayaran, atau hosting.

## Fitur pribadi lain

- Dashboard proyek, tugas, progres, dan tenggat.
- Catatan dan ide pribadi dengan enam kategori, pin, dan hapus.
- Tugas manual, filter, serta daftar pekerjaan per proyek.
- Tim virtual offline berbasis template.
- Kalender, agenda, laporan harian/mingguan, dan ekspor CSV.
- Backup JSON biasa atau terenkripsi dan pemulihan data.

## Data dan privasi

- Proyek, tugas, chat, catatan, agenda, dan laporan disimpan di `localStorage` browser pada perangkat.
- Riwayat asisten lokal juga disimpan di `localStorage`; data aktif tidak dienkripsi.
- Tidak ada akun online, PIN aplikasi, atau sinkronisasi antarperangkat.
- Backup JSON biasa tidak terenkripsi. Backup terenkripsi hanya melindungi file ekspor, bukan data aktif browser.
- Kode engine/WASM diunduh dari jsDelivr saat kamu meminta memuat model. CDN dapat melihat metadata koneksi unduhan, tetapi teks prompt tidak dikirim ke sana oleh fitur inferensi lokal.
- Buat backup berkala dan jangan berbagi perangkat/browser profile dengan orang yang tidak dipercaya.

## Pemeriksaan kode

GitHub Actions menjalankan instalasi dari lockfile, pemeriksaan sintaks frontend, tes otomatis Node.js, dan tes API jembatan workspace Python. Tes memeriksa batas loopback, path traversal, persetujuan penyimpanan, konflik file, dan pemeriksaan sintaks tanpa menjalankan kode. Keberhasilan CI tidak menggantikan uji langsung di ponsel.
