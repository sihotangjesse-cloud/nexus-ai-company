# NEXUS PERSONAL

**Versi 1.2.0 — ruang kerja pribadi dan proyek website**

NEXUS PERSONAL adalah aplikasi lokal untuk satu pemilik. Kamu bertindak sebagai CEO dan menggunakan tim virtual untuk mengatur proyek, terutama membuat website dari ide sampai checklist pengujian.

## Buka aplikasi tanpa instalasi

### Windows
1. Unduh [ZIP versi main](https://github.com/sihotangjesse-cloud/nexus-ai-company/archive/refs/heads/main.zip).
2. Ekstrak ZIP.
3. Klik dua kali **Buka-NEXUS-Personal.bat**.
4. Browser membuka NEXUS PERSONAL. Pastikan indikator menunjukkan **MODE DEMO OFFLINE**.

Jika launcher tidak terbuka, buka folder `public` dan klik dua kali `index.html`.

### Android
1. Unduh dan ekstrak ZIP melalui aplikasi File/Pengelola File.
2. Buka `public/index.html` dengan browser.
3. Dukungan penyimpanan file lokal berbeda antar-browser Android. Untuk penyimpanan yang paling konsisten, gunakan laptop Windows.

Aplikasi tidak membutuhkan Node.js, server, hosting, kartu, langganan, atau kredit cloud.

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

Di detail proyek pilih **Unduh starter website HTML** untuk membuat file awal website mandiri. File tersebut bisa dibuka di browser dan diedit memakai editor teks/kode. Starter ini merupakan kerangka awal, bukan website lengkap yang sudah siap dipublikasikan.

## Fitur yang tersedia

- Dashboard proyek, tugas, progres, dan tenggat.
- Buat proyek website dengan checklist otomatis.
- Detail, status, target, dan progres per proyek.
- Starter website HTML yang dibuat sepenuhnya di browser.
- Tugas manual dan tugas yang terhubung ke proyek.
- Filter tugas berdasarkan status, penanggung jawab, prioritas, dan proyek.
- Tim virtual dengan template kerja offline untuk riset, koordinasi, desain, copywriting, analisis, coding, dan QA.
- Kalender, agenda, laporan harian/mingguan, ekspor CSV.
- Backup JSON biasa atau terenkripsi dan pemulihan data.

## AI dan aturan tanpa biaya

NEXUS PERSONAL pada mode offline **tidak menjalankan model AI eksternal**. Chat peran memberikan kerangka/checklist offline, bukan jawaban generatif. Pembuatan proyek, checklist, dan starter HTML berjalan di browser tanpa API.

Backend Gemini tetap opsional di repositori tetapi tidak dipakai aplikasi offline. Jangan menambahkan API key atau mengaktifkan endpoint AI. Permintaan ke penyedia AI dapat memakai kuota dan berpotensi menimbulkan biaya, sehingga fitur tersebut tidak diaktifkan.

## Data dan privasi

- Data proyek, tugas, agenda, dan laporan disimpan di `localStorage` browser pada perangkat ini.
- Tidak ada akun online atau sinkronisasi antarperangkat.
- Aplikasi personal ini tidak memiliki layar login/PIN. Siapa pun yang dapat membuka profil browser yang sama mungkin dapat melihat data.
- Data aktif localStorage belum dienkripsi.
- Backup JSON biasa tidak dienkripsi. Backup terenkripsi hanya melindungi file ekspor, bukan data aktif browser.
- Simpan backup dan kata sandinya di tempat privat. Kata sandi backup yang terlupa tidak dapat dipulihkan.

## Pemeriksaan kode

GitHub Actions menjalankan instalasi dari lockfile, pemeriksaan sintaks/frontend, dan tes otomatis. Tes backend memakai mock lokal dan tidak melakukan panggilan Gemini sungguhan.
