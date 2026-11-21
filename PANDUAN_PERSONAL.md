# Panduan NEXUS PERSONAL 1.6.0

NEXUS PERSONAL adalah ruang kerja satu pemilik dengan asisten AI generatif opsional. Inferensi dilakukan langsung di browser menggunakan WebAssembly dan file model GGUF yang kamu pilih dari perangkat. Tidak ada AI API cloud, API key, transaksi, kredit, langganan, hosting, atau server AI.

## 1. Menjalankan NEXUS di Android

Agar pemuat WebAssembly dapat menggunakan modul browser, buka NEXUS melalui alamat localhost, bukan dengan membuka file HTML langsung.

1. Unduh ZIP repo dan ekstrak ke folder penyimpanan Android.
2. Buka Termux. Jika Python belum ada, jalankan `pkg install python`.
3. Masuk ke folder hasil ekstrak repo. Nama folder bergantung pada lokasi dan nama ZIP yang kamu ekstrak.
4. Jalankan `bash scripts/start-nexus-android.sh`.
5. Biarkan Termux tetap berjalan.
6. Buka Chrome pada ponsel yang sama, lalu ketik `http://127.0.0.1:4173/`.

Server Python hanya menyajikan berkas statis dari folder `public`, dan hanya mendengarkan `127.0.0.1`. Server tersebut bukan server AI, tidak menerima pesan chat, dan tidak dapat diakses melalui jaringan Wi-Fi oleh perangkat lain. Jangan ubah alamat bind ke `0.0.0.0`.

Untuk penggunaan biasa tanpa asisten AI, kamu tetap dapat membuka `public/index.html` secara langsung. Namun, pemuatan modul WebAssembly eksternal dari halaman `file://` dapat diblokir oleh browser; gunakan langkah localhost di atas untuk menu Asisten AI.

## 2. Memuat model AI lokal

1. Unduh model instruksi GGUF dari [repositori resmi Qwen2.5-0.5B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF).
2. Pilih kuantisasi **Q4_K_M** (sekitar 491 MB sesuai daftar file repositori ketika panduan ini dibuat).
3. Simpan file `.gguf` ke folder perangkat yang mudah ditemukan. Unduhan model ini dilakukan manual dan tidak melalui NEXUS.
4. Di NEXUS, buka menu **Asisten AI**.
5. Tekan pemilih file dan pilih file GGUF tersebut.
6. Tekan **Muat model lokal**. Tunggu sampai muncul status model siap.
7. Tulis pertanyaan singkat dan tekan **Kirim pesan**.

Saat tombol pemuatan ditekan, browser mengambil kode mesin Wllama versi 3.13.0 dan WASM dari jsDelivr jika belum tersedia di cache. Ini adalah unduhan kode mesin, bukan permintaan inferensi AI. Isi prompt dan komputasi jawaban tetap berada pada perangkat.

## 3. Pengaturan kinerja dan batas model

- NEXUS memuat model dengan satu thread CPU, tanpa offload GPU, dan context 2.048 token.
- Jawaban dibatasi maksimal 256 token per pesan untuk mengurangi beban.
- File model dibatasi maksimal 900 MB di pemilih aplikasi.
- Model 0.5B Q4 adalah ukuran percobaan awal yang relatif kecil, bukan model sekelas ChatGPT.
- Ponsel dengan RAM 4 GB dapat kekurangan memori ketika browser, Android, dan model berjalan bersamaan. Tutup aplikasi lain, jangan membuka banyak tab, dan hentikan percobaan bila perangkat terasa panas atau browser tidak stabil.
- Laptop dengan RAM 2 GB tidak direkomendasikan untuk menjalankan model AI ini.
- Jika model lambat, browser berhenti, atau pemuatan gagal, lepas/tutup tab model dan kembali gunakan fitur ruang kerja biasa. Tidak ada jaminan model akan berjalan pada setiap varian perangkat.

Tekan **Lepas model** setelah selesai untuk meminta engine membebaskan memori. Jika halaman dimuat ulang, pilih file GGUF dan muat ulang model.

## 4. Keterbatasan asisten

Model kecil dapat membuat kesalahan, menjawab terlalu singkat, atau tidak memahami instruksi panjang. Periksa kembali informasi, hitungan, dan kode yang dihasilkannya. Gunakan untuk draf dan latihan, bukan sebagai sumber tunggal untuk keputusan penting.

Asisten hanya menghasilkan teks. Ia tidak dapat mencari informasi internet, membuka file perangkat lain, mengakses GitHub, menjalankan kode, atau melakukan tindakan eksternal. Riwayat percakapan disimpan pada localStorage browser. Jangan menulis password atau data pribadi yang sensitif.

Prompt keselamatan di aplikasi membantu mengarahkan model, tetapi bukan jaminan bahwa model kecil akan selalu menolak setiap permintaan yang tidak aman.

## 5. Windows dan laptop 2 GB RAM

Klik dua kali `Buka-NEXUS-Personal.bat` untuk menggunakan dashboard, proyek, tugas, Website Studio, Catatan & Ide, kalender, laporan, dan backup. Jangan memuat model generatif di laptop RAM 2 GB; gunakan menu-menu ruang kerja tanpa AI lokal.

## 6. Mengelola proyek website

1. Buka **Proyek** dan buat proyek baru.
2. Isi nama, jenis website, tujuan, stack, dan target tanggal opsional.
3. Buka detail proyek untuk mengelola checklist, status, tenggat, dan progres.
4. Gunakan **Website Studio** untuk mengedit konten dan melihat pratinjau.
5. Unduh website HTML untuk menyimpan hasil statis ke perangkat.

## 7. Catatan, backup, dan pemulihan

Menu **Catatan & Ide** menyimpan ide dan strategi di browser. Catatan dapat dikategorikan, dipin, dan dihapus. Semua data catatan masuk ke backup lokal.

Di menu **Pengaturan**, buat backup JSON biasa atau backup terenkripsi. Enkripsi hanya melindungi file backup. Data aktif di localStorage tetap belum dienkripsi; simpan perangkat dan profil browser dengan aman.

## 8. Biaya dan privasi

NEXUS tidak mengirim prompt ke layanan AI cloud dan tidak membutuhkan API key, akun AI, pembayaran, kredit, atau langganan. Namun, pengunduhan model GGUF dan pengambilan kode engine/WASM pertama kali memerlukan internet dan dapat memakai kuota data. Gunakan koneksi yang memang tersedia dan perhatikan ukuran file model.

Backend lama tetap berada di repo tetapi tidak digunakan oleh UI pribadi. Jangan mengisi `GEMINI_API_KEY` atau menjalankan layanan backend lama bila ingin mempertahankan mode ini.
