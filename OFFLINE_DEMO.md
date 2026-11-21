# NEXUS PERSONAL — Mode Pribadi & AI Lokal

NEXUS PERSONAL adalah ruang kerja satu pemilik. Fitur proyek, tugas, catatan, kalender, laporan, Website Studio, dan backup berjalan di browser. Backend cloud dan pemanggilan AI API dinonaktifkan.

## Cara membuka
1. Unduh ZIP branch `main`: https://github.com/sihotangjesse-cloud/nexus-ai-company/archive/refs/heads/main.zip
2. Ekstrak ZIP.
3. Di Windows, klik dua kali `Buka-NEXUS-Personal.bat` untuk memakai ruang kerja biasa.
4. Di Android, pasang Python di Termux jika belum tersedia (`pkg install python`), masuk ke folder repo, lalu jalankan `bash scripts/start-nexus-android.sh`.
5. Buka `http://127.0.0.1:4173/` di browser pada ponsel yang sama. Server Python hanya menyajikan file statis dan bind ke loopback; ia bukan API AI.
6. Pastikan indikator aplikasi menunjukkan `MODE PRIBADI · TANPA API`.

## Fitur lokal
- Ruang proyek website, checklist, progres, tugas, dan status.
- Website Studio: edit konten, pratinjau sandbox, dan unduh HTML statis.
- Catatan dan ide dengan kategori, pin, hapus, dan backup.
- Template kerja lokal untuk koordinasi, riset, desain, copywriting, analisis, developer, dan QA.
- Kalender, agenda, laporan, ekspor CSV, serta backup dan pemulihan.
- Asisten AI generatif browser-lokal menggunakan model GGUF pilihan pengguna.

## Asisten AI generatif browser-lokal
Asisten AI berjalan melalui WebAssembly di browser menggunakan Wllama. Pengguna harus mengunduh file GGUF sendiri dan memilihnya di menu **Asisten AI**. Inferensi berlangsung di perangkat; pesan dan riwayat percakapan tidak dikirim ke layanan AI cloud.

Saat pengguna menekan tombol **Muat model lokal**, aplikasi mengimpor versi Wllama 3.13.0 dan file WASM dari jsDelivr jika belum ada di cache. Unduhan awal memerlukan internet dan menghasilkan permintaan unduhan aset statis ke CDN. Tidak ada prompt, file model, atau inferensi yang dikirim ke CDN. Aplikasi tidak memakai API key, provider inference, AI API, pembayaran, kredit, langganan, hosting, atau resource cloud.

Model awal yang disarankan untuk percobaan adalah Qwen2.5-0.5B-Instruct-GGUF Q4_K_M (sekitar 491 MB). Lihat panduan untuk langkah unduh dan batas perangkat. Model kecil memiliki kualitas dan ketepatan terbatas dan tidak dijamin bekerja pada semua ponsel.

## Penyimpanan dan privasi
Data proyek, tugas, chat, catatan, agenda, dan laporan disimpan pada localStorage browser dan tidak disinkronkan ke perangkat lain. Data aktif belum dienkripsi dan tidak ada layar login/PIN. Backup JSON biasa tidak terenkripsi; backup terenkripsi hanya melindungi file ekspor. Jangan masukkan password atau data sensitif ke chat.
