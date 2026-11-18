"use strict";

// Reisekarte der Menschenlande (Gemini, 18. 11. 2026, quellen/gemini/karte-menschen.json): schematische Karte mit
// 33 Städten der Menschen, 12 Überseehäfen fremder Völker, 69 Dörfern und allen Wegen S, P, D und M auf 760 × 740.
// Das Skript ordnet jeden Ort einem Knoten zu und prüft jeden Weg gegen das Knotennetz und das Wegenetz.
// Ausgabe: spiel/reisekarte-daten.js. Aufruf: node quellen/reisekarte-erzeugen.cjs
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const quelle = JSON.parse(fs.readFileSync(path.join(root, "quellen/gemini/karte-menschen.json"), "utf8"));
const knoten = require(path.join(root, "spiel/knoten.js"));
const nebenquests = require(path.join(root, "spiel/nebenquests.js"));
const kennungen = nebenquests.daten.wegKennungen;
const fehler = [];

const fraktionen = { "Kronreich": "kronreich", "Orden der Flamme": "orden", "Freie Häfen": "haefen",
  "Staubreiter": "staubreiter", "Grüne Banner": "gruene-banner", "Hof der Bleichen Krone": "hof", "Die Erinnernden": "erinnernde",
  "Hüter des Weltenbaums": "hueter", "Tiefgräber": "tiefgraeber" };
const fraktionVon = (text) => fraktionen[text] ?? fraktionen[/\(([^)]+)\)/.exec(text)?.[1]];
const typen = { Hauptstadt: "hauptstadt", Stadt: "stadt", Hafenstadt: "hafenstadt", Dorf: "dorf" };

const { width: breite, height: hoehe } = quelle.meta.coordinateSystem;
const orte = {};
const nachName = {};
function ort(eintrag, id) {
  const k = knoten.alle[id];
  if (!k) return fehler.push(eintrag.name + ": kein Knoten");
  if (k.name !== eintrag.name) fehler.push(eintrag.name + ": Knoten heißt " + k.name);
  const fraktion = fraktionVon(eintrag.faction);
  if (fraktion !== k.fraktion) fehler.push(eintrag.name + ": Fraktion " + eintrag.faction + " statt " + k.fraktion);
  // Überseehäfen sind auf dieser Karte nur Anlegestellen fremder Völker, ihr Rang daheim bleibt.
  if (eintrag.type && eintrag.type !== "Überseehafen" && typen[eintrag.type] !== k.typ && !(eintrag.type === "Hafenstadt" && k.hatHafen)) {
    fehler.push(eintrag.name + ": Typ " + eintrag.type + " statt " + k.typ);
  }
  if ("isHarbor" in eintrag && eintrag.isHarbor !== k.hatHafen) fehler.push(eintrag.name + ": Hafen " + eintrag.isHarbor + " statt " + k.hatHafen);
  if (!(eintrag.x >= 0 && eintrag.x <= breite && eintrag.y >= 0 && eintrag.y <= hoehe)) fehler.push(eintrag.name + ": außerhalb der Karte");
  if (orte[id]) fehler.push(eintrag.name + ": doppelt");
  orte[id] = { x: Math.round(eintrag.x * 10) / 10, y: Math.round(eintrag.y * 10) / 10 };
  nachName[eintrag.name] ??= id;
}
for (const stadt of quelle.nodes.cities) ort(stadt, knoten.nachName[stadt.name]);
// Dörfer tragen den Namen nicht eindeutig (Ziegenalm, Nebelstrand): Die Dorfstraße D.. nennt den Knoten.
for (const dorf of quelle.nodes.villages) {
  const enden = kennungen[dorf.edgeId] ?? [];
  const stadt = knoten.nachName[dorf.parentCity];
  if (!enden.includes(stadt)) fehler.push(dorf.name + ": " + dorf.edgeId + " führt nicht nach " + dorf.parentCity);
  ort(dorf, enden.find(id => id !== stadt));
}

// Wege: Enden über den Namen, beim Dorfweg über die Kennung. Typ wie im Knotennetz.
const typNachBuchstabe = { S: "strasse", D: "strasse", P: "pass", M: "seeweg" };
const wege = [];
for (const weg of [...quelle.edges.landEdges, ...quelle.edges.villageEdges, ...quelle.edges.seaEdges]) {
  const enden = kennungen[weg.id];
  if (!enden) { fehler.push(weg.id + ": unbekannte Kennung"); continue; }
  const namen = [weg.from, weg.to].map(name => knoten.alle[enden[0]].name === name ? enden[0] : knoten.alle[enden[1]].name === name ? enden[1] : null);
  if (namen.includes(null) || namen[0] === namen[1]) fehler.push(weg.id + ": " + weg.from + " – " + weg.to + " passt nicht zu " + enden.join(" – "));
  const kante = knoten.verbindung(enden[0], enden[1]);
  if (kante?.kantenTyp !== typNachBuchstabe[weg.id[0]]) fehler.push(weg.id + ": Wegtyp " + kante?.kantenTyp);
  for (const id of enden) if (!orte[id]) fehler.push(weg.id + ": " + id + " fehlt auf der Karte");
  wege.push([weg.id, enden[0], enden[1]]);
}
if (new Set(wege.map(([id]) => id)).size !== wege.length) fehler.push("doppelte Wege");
// Jede Kante des Knotennetzes von einem Ort der Menschen zu einem Ort der Karte muss eingezeichnet sein.
// Wege zwischen zwei fremden Häfen gehören zu den Karten der anderen Völker.
const menschen = new Set(["kronreich", "orden", "haefen"]);
const gezeichnet = new Set(wege.map(([, a, b]) => [a, b].sort().join("|")));
for (const id of Object.keys(orte)) for (const kante of knoten.alle[id].verbindungen) {
  if (orte[kante.zielId] && (menschen.has(knoten.alle[id].fraktion) || menschen.has(knoten.alle[kante.zielId].fraktion)) && !gezeichnet.has([id, kante.zielId].sort().join("|"))) {
    fehler.push("Kante " + id + " – " + kante.zielId + " fehlt auf der Karte");
  }
}
if (fehler.length) {
  console.error([...new Set(fehler)].join("\n"));
  process.exit(1);
}

const daten = { titel: "Menschenlande und Seewege", breite, hoehe, regeln: quelle.meta.rules, orte, wege };
const kopf = `"use strict";

// Erzeugt von quellen/reisekarte-erzeugen.cjs aus quellen/gemini/karte-menschen.json. Nicht von Hand ändern,
// sondern die Quelle oder das Skript anpassen und neu ausführen.
// Weg: [Kennung, Knoten A, Knoten B]
`;
fs.writeFileSync(path.join(root, "spiel/reisekarte-daten.js"), kopf + "const reisekarteDaten = " + JSON.stringify(daten) +
  ";\nif (typeof module !== \"undefined\") module.exports = reisekarteDaten;\n");
console.log(Object.keys(orte).length + " Orte, " + wege.length + " Wege.");
