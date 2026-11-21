#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT=4173
if [ "$#" -ge 1 ]; then PORT="$1"; fi

if ! command -v python >/dev/null 2>&1; then
  echo "Python belum terpasang. Di Termux jalankan: pkg install python"
  exit 1
fi

case "$PORT" in
  ''|*[!0-9]*)
    echo "Port harus berupa angka. Contoh: bash scripts/start-nexus-android.sh 4173"
    exit 2
    ;;
esac

if [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  echo "Pilih port antara 1024 dan 65535."
  exit 2
fi

if [ ! -d "$HOME/storage/shared" ]; then
  echo "Penyimpanan bersama Android belum terhubung."
  echo "Jalankan termux-setup-storage, izinkan akses file, lalu jalankan launcher lagi."
  echo "Tanpa izin tersebut, workspace disimpan di folder privat Termux."
fi

echo "NEXUS PERSONAL + Local Workspace akan dibuka pada http://127.0.0.1:$PORT/"
echo "Server hanya bind ke 127.0.0.1. Tidak dapat diakses dari perangkat lain."
echo "File hanya ditulis setelah kamu meninjau dan menyetujui usulan."
echo "Pemeriksaan kode hanya memeriksa sintaks; kode proyek tidak dijalankan."
echo "Tekan Ctrl+C untuk berhenti."
exec python "$ROOT_DIR/scripts/local_workspace_server.py" --port "$PORT"
