# Panduan NEXUS PERSONAL

NEXUS PERSONAL adalah ruang kerja lokal untuk satu pemilik. Kamu menjadi CEO dan menggunakan dashboard/tugas/laporan untuk mengatur pekerjaan. Mode ini tidak membutuhkan akun atau layanan cloud.

## 1. Buka di laptop Windows

1. Unduh ZIP branch `main`: https://github.com/sihotangjesse-cloud/nexus-ai-company/archive/refs/heads/main.zip
2. Ekstrak ZIP.
3. Klik dua kali `Buka-NEXUS-Personal.bat`.
4. Browser membuka aplikasi dalam mode offline.

Launcher hanya membuka file HTML lokal. Launcher tidak memasang program, tidak membuat koneksi API, tidak menjalankan server, dan tidak membutuhkan administrator.

## 2. Buka di Android

1. Unduh ZIP.
2. Ekstrak menggunakan aplikasi File/Pengelola File.
3. Masuk ke `public/index.html`.
4. Pilih browser untuk membukanya.

Browser Android memiliki aturan berbeda untuk file lokal. Apabila data tidak tersimpan setelah halaman ditutup, gunakan versi laptop atau browser lain yang mendukung penyimpanan lokal untuk file tersebut.

## 3. Mulai menggunakan

- Buka **Pengaturan → Profil Pemilik** untuk mengubah nama pemilik/CEO.
- Buat tugas pada menu **Tugas**.
- Atur prioritas, penanggung jawab virtual, tenggat, status, dan progres.
- Gunakan **Kalender** untuk agenda.
- Buka **Laporan** untuk ringkasan harian atau mingguan.
- Gunakan tombol ekspor untuk menyimpan CSV.
- Buka **Pengaturan → Backup & Pemulihan Data** untuk menyimpan backup.

## 4. Simpan data

Data aplikasi disimpan oleh browser pada perangkat ini. Tutup tab tidak sama dengan menghapus data, tetapi menghapus data situs/browser, memakai profil browser lain, atau berpindah perangkat dapat membuat data tidak terlihat. Buat backup secara berkala.

Backup JSON biasa tidak dienkripsi. Backup terenkripsi memerlukan kata sandi minimal 12 karakter. Simpan kata sandi backup secara terpisah; aplikasi tidak dapat memulihkannya bila lupa.

**Perhatian:** backup terenkripsi tidak mengenkripsi data aktif di `localStorage`. Mode personal ini juga tidak memiliki login atau PIN aplikasi. Jaga perangkat dan profil browser tetap terkunci.

## 5. Fitur AI

Chat AI dan delegasi otomatis belum aktif dalam mode offline. Aplikasi tidak memakai API key, tidak mengirim data ke Gemini, dan tidak menggunakan kredit. Mengaktifkan AI eksternal di masa depan bisa memakai kuota dan berpotensi menimbulkan biaya, sehingga saat ini fitur tersebut dibiarkan nonaktif.
