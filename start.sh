#!/usr/bin/env bash
# Lanceur du serveur de développement local DHB.
# Usage : ./start.sh   (puis ouvrez http://localhost:8000)
cd "$(dirname "$0")"
PORT="${1:-8000}"
echo ""
echo "  ===================================================="
echo "   DHB — Serveur de développement local"
echo "  ===================================================="
echo "   Portail      : http://localhost:$PORT/"
echo "   Groupe       : http://localhost:$PORT/sites/groupe/"
echo "   Infogérance  : http://localhost:$PORT/sites/infogerance/"
echo "   Admin        : http://localhost:$PORT/admin/"
echo "  ===================================================="
echo "   (Ctrl+C pour arrêter)"
echo ""
python3 -m http.server "$PORT"
