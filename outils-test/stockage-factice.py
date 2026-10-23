# Faux service Supabase Storage (test de sauvegarde/restauration uniquement).
# GET  /storage/v1/object/documents/<chemin>  → fichier (clé serveur exigée)
# POST /storage/v1/object/documents/<chemin>  → dépôt (x-upsert)
import http.server, os, sys

RACINE = sys.argv[1]
CLE = "cle-serveur-de-test"
PREFIXE = "/storage/v1/object/documents/"


class Gestion(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _chemin(self):
        if not self.path.startswith(PREFIXE):
            return None
        rel = self.path[len(PREFIXE):]
        if ".." in rel or rel.startswith("/"):
            return None
        return os.path.join(RACINE, rel)

    def _autorise(self):
        return self.headers.get("Authorization") == f"Bearer {CLE}"

    def do_GET(self):
        f = self._chemin()
        if not self._autorise():
            self.send_response(401); self.end_headers(); return
        if not f or not os.path.isfile(f):
            self.send_response(404); self.end_headers(); return
        data = open(f, "rb").read()
        self.send_response(200); self.send_header("Content-Type", "application/pdf"); self.send_header("Content-Length", str(len(data))); self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        f = self._chemin()
        if not self._autorise() or not f:
            self.send_response(401); self.end_headers(); return
        n = int(self.headers.get("Content-Length", "0"))
        os.makedirs(os.path.dirname(f), exist_ok=True)
        open(f, "wb").write(self.rfile.read(n))
        self.send_response(200); self.end_headers(); self.wfile.write(b"{}")


http.server.ThreadingHTTPServer(("127.0.0.1", 8787), Gestion).serve_forever()
