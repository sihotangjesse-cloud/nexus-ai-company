# NEXUS AI COMPANY — Demo Offline (Zero-Credit)

Mode ini adalah demo browser lokal. **Tidak ada server, API, Gemini, API key, deployment, hosting, pembayaran, kartu, atau kredit cloud yang dibutuhkan atau digunakan.**

## Cara membuka

1. Unduh [ZIP branch main](https://github.com/sihotangjesse-cloud/nexus-ai-company/archive/refs/heads/main.zip).
2. Ekstrak file ZIP.
3. Buka folder `public`.
4. Buka `index.html` dengan browser modern seperti Chrome atau Edge.
5. Pastikan header menampilkan **MODE DEMO OFFLINE**.

Mode ini paling mudah dijalankan di komputer. Dukungan membuka file lokal dapat berbeda di browser perangkat seluler.

## Fitur yang berjalan

- Dashboard dan direktori karyawan contoh.
- Membuat dan mengelola tugas, mengubah status/progres, serta mengedit judul, penanggung jawab, prioritas, dan tenggat.
- Pencarian, filter gabungan, dan pengurutan tugas.
- Kalender dan agenda.
- Laporan harian dan mingguan.
- Ekspor laporan dan detail tugas ke CSV.
- Penyimpanan lokal melalui `localStorage`.
- Backup JSON biasa dan backup terenkripsi dengan kata sandi.
- Pemulihan backup setelah konfirmasi.

## Fitur yang sengaja dinonaktifkan

- Chat dengan karyawan AI.
- Delegasi perusahaan oleh Sena.
- Revisi tugas oleh AI.
- Login dan pemeriksaan kesehatan backend.

Mode demo memblokir permintaan API sebelum ada permintaan jaringan. Jangan menambahkan API key atau kata sandi backend ke berkas HTML.

## Data dan privasi

- Data hanya disimpan pada profil browser dan perangkat yang sedang digunakan.
- Data tidak disinkronkan otomatis ke perangkat lain atau layanan cloud.
- Backup JSON biasa tidak dienkripsi.
- Backup terenkripsi melindungi file hasil ekspor dengan kata sandi. Enkripsi ini tidak melindungi data aktif pada `localStorage`.
- Aplikasi tidak menyimpan kata sandi backup. File tidak dapat dipulihkan bila kata sandinya terlupa.
- Menghapus data browser atau memakai profil browser lain dapat membuat data demo tidak tersedia, kecuali ada backup.
- Jangan masukkan data pribadi, keuangan, atau kata sandi akun lain.

## Batasan penting

Demo ini bukan website yang sudah di-hosting dan bukan layanan AI produksi. Server Node.js serta integrasi Gemini yang ada di repositori merupakan komponen backend opsional dan tidak digunakan oleh demo offline.

Mengisi API key dan mengirim permintaan ke penyedia AI dapat memakai kuota atau menimbulkan biaya provider. Untuk mempertahankan mode tanpa biaya, jangan mengisi API key dan jangan menjalankan endpoint AI.

