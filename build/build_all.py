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

# Polices hébergées localement : chaque site reçoit les siennes (+ licences OFL).
sys.path.insert(0, HERE)
import marque  # noqa: E402
POLICES_SRC = os.path.join(HERE, "polices")
for cle, polices in marque.POLICES.items():
    dest = os.path.join(REPO, "sites", marque.SITES[cle]["dossier"], "assets", "fonts")
    os.makedirs(dest, exist_ok=True)
    utiles = {f for _, f, _ in polices} | {f"LICENCE-{f.split('-')[0]}.txt" for _, f, _ in polices}
    for f in os.listdir(dest):
        if f not in utiles:
            os.remove(os.path.join(dest, f))
    for f in sorted(utiles):
        shutil.copyfile(os.path.join(POLICES_SRC, f), os.path.join(dest, f))
print("Polices copiées dans chaque site.")
