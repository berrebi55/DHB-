@echo off
REM Lanceur du serveur de developpement local DHB (Windows).
REM Double-cliquez sur ce fichier, ou lancez ".\start.bat" dans PowerShell.
cd /d "%~dp0"
set PORT=8000
echo.
echo   ====================================================
echo    DHB - Serveur de developpement local
echo   ====================================================
echo    Portail      : http://localhost:%PORT%/
echo    Groupe       : http://localhost:%PORT%/sites/groupe/
echo    Infogerance  : http://localhost:%PORT%/sites/infogerance/
echo    Particuliers : http://localhost:%PORT%/sites/particuliers/
echo    Admin        : http://localhost:%PORT%/admin/
echo   ====================================================
echo    (Fermez cette fenetre ou Ctrl+C pour arreter)
echo.
python -m http.server %PORT% 2>nul || py -m http.server %PORT%
pause
