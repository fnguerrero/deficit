@echo off
REM Levanta la app en http://localhost:5599 y la abre en el navegador.
cd /d "%~dp0"
start "" http://localhost:5599
py -3 -m http.server 5599 --directory "%~dp0"
