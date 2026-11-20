# NEXUS PERSONAL

**Versi 1.1.0 — edisi ruang kerja pribadi**

NEXUS PERSONAL dibuat untuk **satu pemilik/pengguna**, dengan kamu sebagai CEO dan delapan peran karyawan virtual: Sena (koordinator), Nara (riset pasar), Juno (direktur kreatif), Kata (copywriter), Arka (pemasaran), Jejak (analis bisnis), Garis (storyboard), dan Rupa (art direction).

## Aplikasi siap dibuka secara lokal

Edisi pribadi ini berjalan langsung di browser. Tidak perlu Node.js, instalasi software, server, hosting, kartu, langganan, atau kredit cloud.

### Windows (laptop Acer)

1. Unduh [ZIP NEXUS PERSONAL dari branch main](https://github.com/sihotangjesse-cloud/nexus-ai-company/archive/refs/heads/main.zip).
2. Ekstrak file ZIP ke folder yang mudah ditemukan, misalnya Documents.
3. Buka folder hasil ekstraksi.
4. Klik dua kali **Buka-NEXUS-Personal.bat**.
5. Browser akan membuka aplikasi. Pastikan indikator bertuliskan **MODE DEMO OFFLINE**.

Bila file launcher tidak terbuka, buka folder `public` lalu klik dua kali `index.html`.

### Android

1. Unduh ZIP dari tautan di atas.
2. Gunakan aplikasi File/Pengelola File untuk mengekstraknya.
3. Buka folder hasil ekstraksi, lalu folder `public`.
4. Pilih `index.html` dan buka memakai browser.
5. Bila browser Android tidak bisa menyimpan data dari file lokal, gunakan aplikasi di laptop Windows. Dukungan file lokal berbeda antarbrowser.

Panduan tambahan: [PANDUAN_PERSONAL.md](PANDUAN_PERSONAL.md).

## Apa yang bisa dilakukan?

- Melihat dashboard pekerjaan dan ringkasan tugas.
- Mengelola tugas: buat, ubah, cari, filter, urutkan, dan hapus.
- Mengatur prioritas, penanggung jawab virtual, status, progres, serta tenggat.
- Menggunakan kalender dan agenda.
- Membuat laporan harian/mingguan.
- Mengunduh laporan dan detail tugas sebagai CSV.
- Membuat backup JSON biasa atau backup terenkripsi.
- Memulihkan data dari file backup.

## Batas AI dan biaya

Mode offline **belum menjalankan model AI sungguhan**. Chat AI, delegasi otomatis oleh Sena, dan revisi AI sengaja dinonaktifkan. Delapan karyawan adalah peran/struktur kerja pada aplikasi; balasan AI langsung tidak tersedia dalam edisi tanpa API.

Repositori memiliki backend AI opsional, tetapi tidak digunakan saat membuka aplikasi lokal. Menyalakan AI dengan penyedia eksternal dapat menggunakan kuota dan berpotensi menimbulkan biaya. Karena aturan proyek adalah nol biaya, jangan memasukkan API key atau menjalankan endpoint AI.

## Data pribadi dan privasi

- Data tugas, kalender, chat demo, dan laporan disimpan di `localStorage` browser pada perangkat yang sedang dipakai.
- Tidak ada akun online atau sinkronisasi antarperangkat.
- Mode ini ditujukan untuk satu pemilik, tetapi **tidak memiliki layar login/PIN**. Siapa pun yang dapat membuka profil browser yang sama mungkin dapat melihat data.
- Data aktif `localStorage` belum dienkripsi.
- Backup JSON biasa tidak terenkripsi. Backup terenkripsi melindungi file ekspor dengan AES-256-GCM dan kata sandi; enkripsi backup tidak melindungi data aktif di browser.
- Simpan backup terenkripsi di tempat aman. Kata sandi yang terlupa tidak dapat dipulihkan oleh aplikasi.
- Jangan masukkan password akun lain atau data sangat sensitif.

## Pemeriksaan kode

CI memakai GitHub Actions untuk menjalankan instalasi dari lockfile, pemeriksaan sintaks/frontend, dan tes otomatis. Pengujian backend memakai mock lokal; tes tidak memanggil Gemini sungguhan.
