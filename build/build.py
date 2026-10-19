# -*- coding: utf-8 -*-
"""Génère l'ensemble du site DHB (HTML statique + sitemap + robots)."""
import os
import sys
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import base  # noqa: E402
import pages_home, pages_services, pages_zones, pages_blog, pages_misc  # noqa: E402


def write(rel, content):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    files = {}
    for mod in (pages_home, pages_services, pages_zones, pages_blog, pages_misc):
        files.update(mod.build())

    for rel, html in files.items():
        write(rel, html)

    # --- URLs pour le sitemap (dérivées des chemins index.html) ---
    urls = []
    priorities = {"index.html": "1.0"}
    for rel in files:
        if rel == "404.html":
            continue
        if rel.endswith("index.html"):
            url_path = rel[:-len("index.html")]  # garde le slash final
        else:
            url_path = rel
        loc = base.DOMAIN + "/" + url_path
        # priorités simples
        if url_path == "":
            prio = "1.0"
        elif url_path in ("services/", "zones/", "blog/", "contact/"):
            prio = "0.9"
        elif url_path.startswith("services/") or url_path.startswith("zones/"):
            prio = "0.8"
        elif url_path.startswith("blog/") and url_path != "blog/":
            prio = "0.6"
        elif url_path in ("mentions-legales/", "politique-confidentialite/", "plan-du-site/"):
            prio = "0.3"
        else:
            prio = "0.7"
        urls.append((loc, prio))

    today = datetime.date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, prio in sorted(urls, key=lambda x: (-float(x[1]), x[0])):
        sm.append(f"  <url><loc>{loc}</loc><lastmod>{today}</lastmod>"
                  f"<changefreq>monthly</changefreq><priority>{prio}</priority></url>")
    sm.append("</urlset>")
    write("sitemap.xml", "\n".join(sm) + "\n")

    # --- robots.txt ---
    robots = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /404.html\n\n"
        f"Sitemap: {base.DOMAIN}/sitemap.xml\n"
    )
    write("robots.txt", robots)

    print(f"{len(files)} pages HTML générées + sitemap.xml + robots.txt")
    print(f"{len(urls)} URLs dans le sitemap")


if __name__ == "__main__":
    main()
