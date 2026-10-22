# -*- coding: utf-8 -*-
"""Régénère les trois sites publics (Pro, Groupe, Assistance) et synchronise
la feuille de style et le script communs depuis sites/infogerance/assets.

  python3 build/build_all.py                 # liens relatifs entre dossiers (local)
  DHB_LIENS=prod python3 build/build_all.py  # liens vers les vrais domaines
"""
import os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
SOURCE = os.path.join(REPO, "sites", "infogerance", "assets")

for script in ("build.py", "groupe/build_groupe.py", "particuliers/build_particuliers.py"):
    subprocess.run([sys.executable, os.path.join(HERE, script)], check=True)

for site in ("groupe", "particuliers"):
    for rel in ("css/style.css", "js/main.js", "js/suivi.js"):
        dest = os.path.join(REPO, "sites", site, "assets", rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(os.path.join(SOURCE, rel), dest)
print("Feuille de style et script communs synchronisés.")
