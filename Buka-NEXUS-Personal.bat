@echo off
setlocal
title NEXUS PERSONAL
set "APP=%~dp0public\index.html"

if not exist "%APP%" (
  echo File NEXUS tidak ditemukan.
  echo Pastikan file ini berada di folder utama NEXUS PERSONAL.
  pause
  exit /b 1
)

start "" "%APP%"
exit /b 0
