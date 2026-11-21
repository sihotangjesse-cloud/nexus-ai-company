# NEXUS PERSONAL

**Versi 1.5.0 — ruang kerja pribadi, selalu offline**

NEXUS PERSONAL adalah aplikasi lokal untuk satu pemilik. Kamu bertindak sebagai CEO dan menggunakan ruang kerja proyek untuk merencanakan website, mengelola checklist, membuat starter HTML, dan memantau pekerjaan.

## Aturan operasi pribadi

Versi ini **selalu berjalan dalam mode offline**, baik dibuka dari file HTML maupun melalui alamat localhost. Antarmuka tidak memeriksa endpoint kesehatan, tidak melakukan login backend, dan tidak mengirim chat, revisi, atau pekerjaan ke API AI. Template tim virtual bersifat lokal, bukan jawaban dari model AI.

Tidak perlu mengisi API key, membuat akun layanan AI, menambah kartu, memakai kredit, menjalankan deployment, atau menyiapkan hosting. Backend lama tetap ada di repositori untuk pengujian/riwayat pengembangan, tetapi tidak digunakan oleh antarmuka NEXUS PERSONAL.

## Buka aplikasi tanpa instalasi

### Windows
1. Unduh [ZIP versi main](https://github.com/sihotangjesse-cloud/nexus-ai-company/archive/refs/heads/main.zip).
2. Ekstrak ZIP.
3. Klik dua kali **Buka-NEXUS-Personal.bat**.
4. Browser membuka NEXUS PERSONAL. Indikator harus menunjukkan **MODE PRIBADI OFFLINE**.

Jika launcher tidak terbuka, buka folder `public` dan klik dua kali `index.html`.

### Android
1. Unduh dan ekstrak ZIP melalui aplikasi File/Pengelola File.
2. Buka `public/index.html` dengan browser.
3. Dukungan penyimpanan file lokal berbeda antar-browser Android. Untuk penyimpanan yang paling konsisten, gunakan laptop Windows.

Aplikasi dapat digunakan langsung tanpa memasang Node.js. Launcher Windows hanya membuka file HTML lokal.

## Ruang proyek website

Buka **Proyek → Proyek website baru**. Isi nama, jenis website, tujuan, teknologi, dan target tanggal. NEXUS akan membuat checklist awal secara lokal dan menghubungkannya dengan ruang proyek.

Jenis proyek yang tersedia: company profile, landing page, portfolio, toko online, blog, dan web app/dashboard.

Setiap proyek mempunyai detail, status, target tanggal, daftar tugas terkait, dan progres. Checklist awal dibagi ke peran berikut:

- Sena — koordinasi dan kriteria keberhasilan.
- Nara — riset pengguna dan referensi.
- Jejak — sitemap dan kebutuhan fitur.
- Juno — user flow dan wireframe.
- Rupa — design system dan identitas visual.
- Kata — copywriting.
- Arka — SEO dan distribusi awal.
- Raka — web development.
- Tara — QA/testing.

Di detail proyek pilih **Unduh starter website HTML** untuk membuat file awal website mandiri. File tersebut bisa dibuka di browser dan diedit memakai editor teks/kode. Website Studio membuat HTML statis dari konten yang kamu isi. Ini fondasi frontend, bukan aplikasi lengkap dengan database, login, API, pembayaran, atau hosting.

## Website Studio offline

Dari detail proyek, edit nama brand, label, judul, deskripsi, teks tombol, warna utama, tiga kartu fitur, bagian tentang, dan kontak. Pratinjau berubah langsung saat konten diedit. Simpan perubahan ke data proyek, lalu unduh satu file HTML mandiri. Pratinjau menggunakan iframe sandbox tanpa JavaScript atau aset eksternal. Hasilnya adalah halaman statis yang dapat diedit lagi.

## Fitur yang tersedia

- Catatan dan ide pribadi dengan kategori, pin, dan hapus; tersimpan lokal serta ikut backup.
- Dashboard proyek, tugas, progres, dan tenggat.
- Buat proyek website dengan checklist otomatis.
- Detail, status, target, dan progres per proyek.
- Starter website HTML yang dibuat sepenuhnya di browser.
- Tugas manual dan tugas yang terhubung ke proyek.
- Filter tugas berdasarkan status, penanggung jawab, prioritas, dan proyek.
- Tim virtual dengan template kerja offline untuk riset, koordinasi, desain, copywriting, analisis, coding, dan QA.
- Kalender, agenda, laporan harian/mingguan, ekspor CSV.
- Backup JSON biasa atau terenkripsi dan pemulihan data.

## Data dan privasi

- Data proyek, tugas, agenda, percakapan template, dan laporan disimpan di `localStorage` browser pada perangkat ini.
- Tidak ada akun online atau sinkronisasi antarperangkat.
- Aplikasi personal ini tidak memiliki layar login/PIN. Siapa pun yang dapat membuka profil browser yang sama mungkin dapat melihat data.
- Data aktif localStorage belum dienkripsi.
- Backup JSON biasa tidak terenkripsi. Backup terenkripsi hanya melindungi file ekspor, bukan data aktif browser.
- Simpan backup dan kata sandinya di tempat privat. Kata sandi backup yang terlupa tidak dapat dipulihkan.

## Pemeriksaan kode

GitHub Actions menjalankan instalasi dari lockfile, pemeriksaan sintaks/frontend, dan tes otomatis. Tes backend memakai mock lokal. Tes frontend memastikan mode offline tidak mengirim permintaan API saat aplikasi dibuka melalui HTTP localhost.
