#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:-4173}"

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

echo "NEXUS PERSONAL tersedia di http://127.0.0.1:$PORT/"
echo "Server ini hanya menyajikan file statis dari folder public dan hanya bind ke 127.0.0.1."
echo "Jangan ubah alamat bind menjadi 0.0.0.0. Tekan Ctrl+C untuk berhenti."
exec python -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT_DIR/public"
