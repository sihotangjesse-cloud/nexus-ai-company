# Panduan NEXUS PERSONAL 1.2.0

NEXUS PERSONAL adalah ruang kerja lokal untuk satu pemilik. Fokus utamanya adalah membuat dan mengelola proyek website dari perencanaan sampai checklist QA.

## 1. Buka aplikasi

**Laptop Windows:** unduh ZIP branch `main`, ekstrak, lalu klik dua kali `Buka-NEXUS-Personal.bat`. Launcher hanya membuka HTML lokal; tidak memasang software, menjalankan server, atau memanggil API.

**Android:** ekstrak ZIP dengan aplikasi File/Pengelola File, lalu buka `public/index.html` menggunakan browser. Apabila browser tidak mempertahankan data lokal, gunakan laptop Windows.

## 2. Buat proyek website

1. Buka menu **Proyek**.
2. Isi nama proyek dan pilih jenis website: company profile, landing page, portfolio, toko online, blog, atau web app/dashboard.
3. Jelaskan tujuan website dan siapa pengguna yang dituju.
4. Isi teknologi yang ingin dipakai, misalnya HTML, CSS, JavaScript atau React.
5. Tentukan target tanggal (opsional), lalu tekan **Buat proyek + checklist kerja**.
6. NEXUS membuat daftar pekerjaan dan menghubungkannya dengan proyek.

Checklist dibagi ke tim virtual: Sena (koordinasi), Nara (riset), Jejak (analisis/sitemap), Juno (user flow), Rupa (visual), Kata (copywriting), Arka (SEO/pemasaran), Raka (developer), dan Tara (QA).

## 3. Kerjakan dan pantau tugas

- Buka detail proyek untuk melihat checklist, total tugas, jumlah selesai, dan progres.
- Ubah status dan progres setiap tugas sesuai pekerjaan yang benar-benar selesai.
- Gunakan detail tugas untuk mengubah judul, penanggung jawab, prioritas, dan tenggat.
- Buka menu **Tugas** untuk mencari dan menyaring seluruh tugas, termasuk filter berdasarkan proyek.
- Ubah status proyek pada formulir detail proyek.

## 4. Buat starter website

Di halaman detail proyek, tekan **Unduh starter website HTML**. NEXUS membuat satu file HTML mandiri berisi struktur halaman, navigasi, hero, fitur, bagian tentang, kontak, dan CSS responsif. Buka file tersebut di browser untuk melihatnya, lalu edit teks, warna, dan komponen menggunakan editor teks/kode.

Starter HTML adalah fondasi awal. Untuk website dengan database, login, API, pembayaran, atau hosting, komponen tersebut perlu dibangun dan diuji secara terpisah. Tidak ada transaksi atau pembayaran yang dijalankan dari starter.

## 5. Gunakan tim virtual offline

Menu **Koordinasi** dan profil peran memberikan template kerja lokal. Kamu dapat menulis brief dan mendapatkan kerangka riset, desain, copywriting, analisis, coding, dan QA. Template tersebut bukan hasil model AI generatif dan tidak mengakses internet.

## 6. Kalender, laporan, dan backup

Gunakan **Kalender** untuk agenda dan **Laporan** untuk ringkasan pekerjaan. Laporan dapat disalin atau diunduh sebagai CSV.

Buka **Pengaturan → Backup & Pemulihan Data** untuk menyimpan backup. Backup terenkripsi membutuhkan kata sandi minimal 12 karakter. Enkripsi hanya melindungi file backup; data aktif localStorage belum terenkripsi.

## 7. Data pribadi dan biaya

Data tersimpan di browser/perangkat ini. Tidak ada akun online, login aplikasi, atau sinkronisasi otomatis. Jaga profil browser dan perangkat tetap privat, serta buat backup berkala.

Mode offline tidak menggunakan API key, Gemini, layanan cloud, deployment, atau kredit. Jangan menjalankan backend AI atau mengisi API key bila ingin mempertahankan aturan nol biaya.
