@echo off
chcp 65001 >nul
title DHB - Demarrage local
cd /d "%~dp0"

echo ==========================================
echo   DHB - lancement en local
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js n'est pas installe. Installe la version LTS : https://nodejs.org
  pause
  exit /b 1
)

set PY=
where py >nul 2>nul && set PY=py
if "%PY%"=="" where python >nul 2>nul && set PY=python
if "%PY%"=="" (
  echo [ERREUR] Python n'est pas installe. Installe-le : https://www.python.org
  pause
  exit /b 1
)

echo [1/4] Generation des 3 sites publics...
%PY% build\build_all.py
if errorlevel 1 (
  echo [ERREUR] La generation des sites a echoue.
  pause
  exit /b 1
)

echo.
echo [2/4] Installation du back-office (1re fois seulement)...
if not exist "admin-react\node_modules" (
  pushd admin-react
  call npm install
  popd
)

echo.
echo [3/4] Demarrage des sites publics sur http://localhost:8000 ...
start "DHB - Sites publics" cmd /k "%PY% -m http.server 8000"

echo [4/4] Demarrage du back-office sur http://localhost:5173 ...
start "DHB - Back-office" cmd /k "cd /d %~dp0admin-react && npm run dev"

timeout /t 6 >nul
start "" http://localhost:8000/sites/groupe/
start "" http://localhost:8000/sites/infogerance/
start "" http://localhost:8000/sites/particuliers/
start "" http://localhost:5173

echo.
echo Tout est lance. Ferme les 2 fenetres noires pour arreter.
echo   Groupe     : http://localhost:8000/sites/groupe/
echo   Pro        : http://localhost:8000/sites/infogerance/
echo   Assistance : http://localhost:8000/sites/particuliers/
echo   Back-office: http://localhost:5173
echo.
pause
