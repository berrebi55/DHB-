// Lot 15 : la règle « chemin interne » de la page de connexion, lue dans le fichier source.
import fs from "node:fs";
const src = fs.readFileSync(process.argv[2], "utf8");
const m = src.match(/export const retourInterne = \(to: string\) => (\/.*\/)\.test\(to\);/);
const re = eval(m[1]);
const cas = {
  "/": true, "/clients/abc-123": true, "/factures?x=1": true,
  "//evil.example": false, "/\\evil.example": false, "/clients\\..\\x": false,
  "https://evil.example": false, "evil": false, "/ok path": false, "/\tevil": false, "": false,
};
let ko = 0;
for (const [k, v] of Object.entries(cas)) if (re.test(k) !== v) { ko++; console.log("ÉCHEC", JSON.stringify(k)); }
console.log(`${Object.keys(cas).length - ko} / ${Object.keys(cas).length} cas conformes`);
