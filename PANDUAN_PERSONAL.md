# Panduan NEXUS PERSONAL 1.9.0

NEXUS PERSONAL adalah ruang kerja satu pemilik dengan asisten GGUF lokal opsional dan File Workspace lokal. Inferensi AI berjalan di browser; File Workspace hanya mengelola file teks dalam folder khusus melalui jembatan Python loopback. Tidak ada AI API cloud, API key, transaksi, kredit, langganan, hosting, atau server AI.

## 1. Menjalankan NEXUS di Android

Agar pemuat WebAssembly dapat menggunakan modul browser, buka NEXUS melalui alamat localhost, bukan dengan membuka file HTML langsung.

1. Unduh ZIP repo dan ekstrak ke folder penyimpanan Android.
2. Buka Termux. Jika Python belum ada, jalankan `pkg install python`.
3. Masuk ke folder hasil ekstrak repo. Nama folder bergantung pada lokasi dan nama ZIP yang kamu ekstrak.
4. Jalankan `bash scripts/start-nexus-android.sh`.
5. Biarkan Termux tetap berjalan.
6. Buka Chrome pada ponsel yang sama, lalu ketik `http://127.0.0.1:4173/`.

Server Python menyajikan aplikasi dan jembatan File Workspace, dan hanya mendengarkan `127.0.0.1`. Server tersebut bukan server AI dan tidak dapat diakses melalui jaringan Wi-Fi oleh perangkat lain. Jangan ubah alamat bind ke `0.0.0.0`.

Untuk penggunaan biasa tanpa asisten AI, kamu tetap dapat membuka `public/index.html` secara langsung. Namun, pemuatan modul WebAssembly eksternal dari halaman `file://` dapat diblokir oleh browser; gunakan langkah localhost di atas untuk menu Asisten AI.

## 2. File Workspace lokal pada Android

File Workspace memberi akses terbatas ke satu folder proyek di perangkat. Ini adalah alat terpisah dari model AI lokal; model GGUF belum bisa memanggil alat ini secara otomatis.

1. Di Termux, jalankan `termux-setup-storage` dan izinkan akses file Android.
2. Jalankan ulang `bash scripts/start-nexus-android.sh`. Launcher membuat atau memakai folder `NEXUS-Workspace` di penyimpanan bersama.
3. Buka NEXUS melalui `http://127.0.0.1:4173/` dan pilih menu **File Workspace**.
4. Tekan **Hubungkan workspace lokal**, lalu buka folder dan file yang ingin dibaca.
5. Untuk membuat atau mengubah file, ajukan perubahan. Tinjau isi sebelum/sesudah dan tekan **Setujui & simpan file** hanya setelah yakin.
6. Gunakan **Periksa sintaks** untuk Python, JavaScript, atau JSON bila file tersebut didukung.

Jika tidak mengaktifkan izin penyimpanan bersama, folder kerja otomatis berada di ruang privat Termux. Untuk mengetahui lokasinya, lihat tulisan **Workspace lokal** di terminal Termux. File tidak otomatis masuk ke GitHub dan tidak tersinkron ke perangkat lain.

### Batasan dan perlindungan

- Server hanya bind ke `127.0.0.1`; jangan mengubahnya menjadi `0.0.0.0`.
- Tidak ada tombol hapus, eksekusi shell, atau tombol menjalankan aplikasi.
- Hanya ekstensi teks yang diizinkan; file tersembunyi/sensitif seperti `.env`, folder `.git`, dan `node_modules` diblokir.
- Batas baca 512 KB per file dan batas usulan perubahan 256 KB.
- Setiap penyimpanan melewati usulan, pratinjau, persetujuan, serta pemeriksaan apakah file berubah sejak usulan dibuat.
- Pemeriksaan Python hanya mem-parsing AST, JavaScript memakai `node --check`, dan JSON di-parse. Tidak satu pun menjalankan isi file.
- Workspace ini bukan sandbox untuk menjalankan program dan belum mengakses GitHub atau internet.

## 3. Memuat model AI lokal

1. Unduh model instruksi GGUF dari [repositori resmi Qwen2.5-0.5B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF).
2. Pilih kuantisasi **Q4_K_M** (sekitar 491 MB sesuai daftar file repositori ketika panduan ini dibuat).
3. Simpan file `.gguf` ke folder perangkat yang mudah ditemukan. Unduhan model ini dilakukan manual dan tidak melalui NEXUS.
4. Di NEXUS, buka menu **Asisten AI**.
5. Tekan pemilih file dan pilih file GGUF tersebut.
6. Tekan **Muat model lokal**. Tunggu sampai muncul status model siap.
7. Tulis pertanyaan singkat dan tekan **Kirim pesan**.

Saat tombol pemuatan ditekan, browser mengambil kode mesin Wllama versi 3.13.0 dan WASM dari jsDelivr jika belum tersedia di cache. Ini adalah unduhan kode mesin, bukan permintaan inferensi AI. Isi prompt dan komputasi jawaban tetap berada pada perangkat.

## 4. Pengaturan kinerja dan batas model

- NEXUS memuat model dengan satu thread CPU, tanpa offload GPU, dan context 2.048 token.
- Jawaban dibatasi maksimal 256 token per pesan untuk mengurangi beban.
- File model dibatasi maksimal 600 MB di pemilih aplikasi.
- Model 0.5B Q4 adalah ukuran percobaan awal yang relatif kecil, bukan model sekelas ChatGPT.
- Ponsel dengan RAM 4 GB dapat kekurangan memori ketika browser, Android, dan model berjalan bersamaan. Tutup aplikasi lain, jangan membuka banyak tab, dan hentikan percobaan bila perangkat terasa panas atau browser tidak stabil.
- Laptop dengan RAM 2 GB tidak direkomendasikan untuk menjalankan model AI ini.
- Jika model lambat, browser berhenti, atau pemuatan gagal, lepas/tutup tab model dan kembali gunakan fitur ruang kerja biasa. Tidak ada jaminan model akan berjalan pada setiap varian perangkat.

Tekan **Lepas model** setelah selesai untuk meminta engine membebaskan memori. Jika halaman dimuat ulang, pilih file GGUF dan muat ulang model.

## 5. Keterbatasan asisten

Model kecil dapat membuat kesalahan, menjawab terlalu singkat, atau tidak memahami instruksi panjang. Periksa kembali informasi, hitungan, dan kode yang dihasilkannya. Gunakan untuk draf dan latihan, bukan sebagai sumber tunggal untuk keputusan penting.

Model AI lokal masih hanya menghasilkan teks; ia belum mencari internet, mengakses GitHub, membaca file, atau memanggil File Workspace secara otomatis. Pengelolaan file dilakukan manual melalui menu File Workspace dengan persetujuan tersendiri. Riwayat percakapan disimpan pada localStorage browser. Jangan menulis password atau data pribadi yang sensitif.

Prompt keselamatan di aplikasi membantu mengarahkan model, tetapi bukan jaminan bahwa model kecil akan selalu menolak setiap permintaan yang tidak aman.

## 6. Windows dan laptop

Untuk menggunakan File Workspace pada Windows, pastikan Python 3 tersedia lalu klik dua kali `Start-NEXUS-Workspace.bat`. Server dibatasi ke `127.0.0.1`. Launcher `Buka-NEXUS-Personal.bat` tetap membuka halaman dasar tanpa jembatan file. Jangan memuat model generatif pada laptop RAM 2 GB.

## 7. Mengelola proyek website

1. Buka **Proyek** dan buat proyek baru.
2. Isi nama, jenis website, tujuan, stack, dan target tanggal opsional.
3. Buka detail proyek untuk mengelola checklist, status, tenggat, dan progres.
4. Gunakan **Website Studio** untuk mengedit konten dan melihat pratinjau.
5. Unduh website HTML untuk menyimpan hasil statis ke perangkat.

## 8. Catatan, backup, dan pemulihan

Menu **Catatan & Ide** menyimpan ide dan strategi di browser. Catatan dapat dikategorikan, dipin, dan dihapus. Semua data catatan masuk ke backup lokal.

Di menu **Pengaturan**, buat backup JSON biasa atau backup terenkripsi. Enkripsi hanya melindungi file backup. Data aktif di localStorage tetap belum dienkripsi; simpan perangkat dan profil browser dengan aman.

## 9. Catatan & Ide pribadi

Buka menu **Catatan & Ide** untuk menyimpan ide bisnis, website, konten, hal yang dipelajari, strategi, dan catatan umum. Pilih kategori, isi judul dan isi catatan, lalu simpan. Catatan dapat dipin atau dihapus, tersimpan pada browser, dan ikut masuk ke backup JSON biasa maupun terenkripsi.

## 10. Biaya dan privasi

NEXUS tidak mengirim prompt ke layanan AI cloud dan tidak membutuhkan API key, akun AI, pembayaran, kredit, atau langganan. Namun, pengunduhan model GGUF dan pengambilan kode engine/WASM pertama kali memerlukan internet dan dapat memakai kuota data. Gunakan koneksi yang memang tersedia dan perhatikan ukuran file model.

Backend lama tetap berada di repo tetapi tidak digunakan oleh UI pribadi. Jangan mengisi `GEMINI_API_KEY` atau menjalankan layanan backend lama bila ingin mempertahankan mode ini.

  
## 11. GitHub Explorer publik

1. Buka menu **GitHub**.
2. Masukkan repository publik dalam format `owner/repo`, misalnya repository NEXUS sendiri, lalu isi branch (biasanya `main`).
3. Kosongkan path untuk membuka folder utama atau isi path folder yang ingin dilihat.
4. Pilih folder untuk masuk, atau pilih file untuk membaca isinya.
5. Tekan **Salin isi file** untuk menyalin teks. Pindah ke File Workspace jika ingin mengajukan perubahan lokal; tinjau dan setujui file secara terpisah.

Fitur ini hanya membaca repository publik. Ia tidak meminta token GitHub dan tidak dapat mengedit repository, membuat branch, commit, atau push. Setiap permintaan mengirim nama repository, branch, dan path yang kamu minta langsung ke `api.github.com`; percakapan AI dan file lokal tidak dikirim. File maksimal 512 KB dan hanya teks UTF-8.

GitHub membatasi akses REST tanpa autentikasi hingga 60 permintaan per jam per alamat IP. Bila batas tercapai, tunggu sampai reset. Belum ada pencarian web umum, akses repository privat, atau pemanggilan alat oleh model AI.


## 12. Menggunakan Local AI Agent v1.9.0

1. Jalankan server lokal menggunakan launcher Android di Termux seperti pada Bagian 1.
2. Buka menu **Asisten AI**.
3. Pilih file model GGUF dan tekan **Muat model lokal**. Tunggu hingga status Model Siap.
4. Gulir ke bagian **Agent AI · Pemanggilan alat lokal**.
5. Berikan satu instruksi yang jelas. Contoh: `Baca README.md pada workspace lokal, lihat daftar file, lalu periksa sintaks package.json.`
6. Agent dapat memilih hingga tiga langkah alat: daftar/baca file workspace, daftar/baca file repository publik, periksa sintaks, atau siapkan usulan perubahan file.
7. Periksa bagian **Langkah yang dijalankan** untuk melihat alat dan hasil yang dikembalikan.
8. Untuk perubahan file, periksa isi sebelum/sesudah. File tidak berubah sampai kamu menekan **Setujui & simpan** dan mengonfirmasi dialog. Kamu juga dapat membatalkan usulan.

### Batas Agent v1.9.0

- Model GGUF kecil dapat salah memahami tugas atau menghasilkan format JSON alat yang tidak valid. Bila itu terjadi, tidak ada alat yang dijalankan; coba instruksi lebih pendek.
- Workspace lokal tersedia ketika launcher Python berjalan di perangkat yang sama. File harus berada di folder `NEXUS-Workspace`.
- GitHub hanya mendukung repository publik, GET/read-only, tanpa token. Permintaan mengirim nama repository, branch, dan path ke `api.github.com`; GitHub membatasi akses tanpa autentikasi.
- Perubahan Agent hanya ke folder workspace lokal. Tidak ada edit remote GitHub, branch, commit, atau push.
- Pemeriksaan sintaks Python/JavaScript/JSON tidak menjalankan program. Eksekusi kode aplikasi, shell command bebas, dan terminal belum tersedia.
- Pencarian web umum belum tersedia di Agent. GitHub Explorer bukan mesin pencari web.
- Agent memiliki batas maksimum tiga pemanggilan alat per instruksi dan tidak mengizinkan penghapusan file.
- Jangan masukkan password, token, API key, atau data rahasia ke prompt maupun file workspace.
