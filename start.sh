#!/usr/bin/env bash
# Lanceur local DHB (macOS / Linux). Sous Windows : start.bat.
# Génère les 3 sites, sert les fichiers sur le port 8000 et lance le back-office.
set -e
cd "$(dirname "$0")"
python3 build/build_all.py
[ -d admin-react/node_modules ] || (cd admin-react && npm install)
(cd admin-react && npm run dev) &
echo ""
echo "  Portail     : http://localhost:8000/"
echo "  Groupe      : http://localhost:8000/sites/groupe/"
echo "  Pro         : http://localhost:8000/sites/infogerance/"
echo "  Assistance  : http://localhost:8000/sites/particuliers/"
echo "  Back-office : http://localhost:5173/"
echo "  (Ctrl+C pour arrêter)"
python3 -m http.server 8000
