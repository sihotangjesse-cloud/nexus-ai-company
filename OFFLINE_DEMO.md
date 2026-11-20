# NEXUS PERSONAL — Mode Pribadi Offline

NEXUS PERSONAL adalah ruang kerja satu pemilik yang **selalu offline**. Mode ini dipaksa aktif oleh kode frontend untuk semua protokol, termasuk `file://`, `http://localhost`, dan `https://`. Browser tidak memanggil endpoint backend atau layanan AI.

## Cara membuka
1. Unduh ZIP branch `main`: https://github.com/sihotangjesse-cloud/nexus-ai-company/archive/refs/heads/main.zip
2. Ekstrak ZIP.
3. Di Windows, klik dua kali `Buka-NEXUS-Personal.bat`. Alternatifnya buka `public/index.html`.
4. Di Android, buka `public/index.html` dari aplikasi File/Pengelola File menggunakan browser.
5. Pastikan indikator aplikasi menunjukkan `MODE PRIBADI OFFLINE`.

## Fitur lokal
- Ruang proyek website: company profile, landing page, portfolio, toko online, blog, dan web app/dashboard.
- Checklist pekerjaan otomatis yang terhubung ke proyek.
- Progres proyek dan tugas, penanggung jawab, prioritas, status, dan tenggat.
- Starter website HTML mandiri dengan CSS responsif.
- Template kerja offline untuk riset, koordinasi, desain, copywriting, analisis, developer, dan QA.
- Kalender, agenda, laporan, ekspor CSV, backup, dan pemulihan.

- Website Studio lokal: edit judul, deskripsi, tombol, warna, tiga fitur, bagian tentang, dan kontak dengan pratinjau langsung.
- Simpan konten per proyek dan unduh HTML statis mandiri. Pratinjau memakai iframe sandbox tanpa skrip atau aset eksternal.

## Batas AI dan jaringan
Chat tim hanya menghasilkan template/checklist lokal, bukan balasan model AI. Tidak ada pemanggilan Gemini atau API dari antarmuka, bahkan ketika halaman dibuka melalui localhost. Fungsi backend lama tetap tersimpan untuk keperluan pengujian pengembangan, tetapi tidak digunakan aplikasi personal. Jangan menambahkan API key atau menjalankan backend lama.

## Penyimpanan dan privasi
Data disimpan pada localStorage browser dan tidak tersinkron ke perangkat lain. Tidak ada layar login/PIN aplikasi dan data aktif belum terenkripsi. Backup JSON biasa tidak terenkripsi; backup terenkripsi melindungi file ekspor, bukan data aktif. Buat backup berkala dan simpan secara privat.
