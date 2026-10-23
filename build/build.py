# -*- coding: utf-8 -*-
"""Génère l'ensemble du site DHB (HTML statique + sitemap + robots)."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
ROOT = os.path.join(REPO, "sites", "infogerance")  # sortie de la filiale Infogérance
sys.path.insert(0, HERE)

import base  # noqa: E402
import pages_home, pages_services, pages_zones, pages_blog, pages_misc, pages_problems, pages_outils  # noqa: E402


def write(rel, content):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    files = {}
    for mod in (pages_home, pages_services, pages_zones, pages_blog, pages_misc, pages_problems, pages_outils):
        files.update(mod.build())

    def priorite(url_path):
        if url_path == "":
            return "1.0"
        if url_path in ("services/", "zones/", "blog/", "contact/", "pannes-frequentes/"):
            return "0.9"
        if url_path.startswith("services/") or url_path.startswith("zones/"):
            return "0.8"
        if url_path.startswith(("blog/", "pannes-frequentes/")):
            return "0.6"
        if url_path in ("mentions-legales/", "politique-confidentialite/", "plan-du-site/"):
            return "0.3"
        return "0.7"

    nb_urls = base.marque.ecrire_site(ROOT, base.DOMAIN, files, priorite, exclus=("404.html",))

    # --- robots.txt ---
    robots = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /404.html\n"
        "Disallow: /admin/\n\n"
        f"Sitemap: {base.DOMAIN}/sitemap.xml\n"
    )
    write("robots.txt", robots)

    print(f"{len(files)} pages HTML générées + sitemap.xml + robots.txt")
    print(f"{nb_urls} URLs dans le sitemap")


if __name__ == "__main__":
    main()
