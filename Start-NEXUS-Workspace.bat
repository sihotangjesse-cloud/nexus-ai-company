@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python belum terpasang. Instal Python 3 dari python.org, lalu buka ulang launcher ini.
  pause
  exit /b 1
)

echo NEXUS PERSONAL + Local Workspace
echo Server hanya berjalan di 127.0.0.1 dan tidak dibuka ke jaringan.
echo File hanya disimpan setelah usulan ditinjau dan disetujui.
echo Pemeriksaan sintaks tidak menjalankan kode proyek.
python scripts\local_workspace_server.py --port 4173
pause
