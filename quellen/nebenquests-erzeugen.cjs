"use strict";

// Erzeugt spiel/nebenquests-daten.js aus den Gemini-Ausarbeitungen in quellen/gemini/.
// Aufruf: node quellen/nebenquests-erzeugen.cjs
//
// Die Texte bleiben wörtlich. Nur eindeutige Schreibfehler bei Bestiariumsnamen werden auf den Kanon
// zurückgeführt (siehe korrekturen). Prüfvermerke (hinweise) markieren Punkte, die Henry noch entscheiden muss;
// sie ändern nichts am Text. Die Hauptquest aus teil1 wird bewusst NICHT übernommen (siehe lore/quests/KRONREICH.md).
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const knoten = require(path.join(root, "spiel/knoten.js"));

// Weg-Kennungen aus „Orte und Wege der Menschen“ (18. 11. 2026), nur Kronreich und seine Grenzwege.
const wegKennungen = {
  S01: ["eikmark", "brandstein"], S02: ["eikmark", "grenzmarkt"], S03: ["eikmark", "haraldstad"], S04: ["eikmark", "kronhall"],
  S05: ["eikmark", "ulfsborg"], S06: ["hagenfels", "kronhall"], S07: ["hagenfels", "rosshag"], S08: ["hagenfels", "sandvik"],
  S09: ["hagenfels", "ulfsborg"], S10: ["haraldstad", "grenzmarkt"], S11: ["haraldstad", "skerheim"], S12: ["haraldstad", "ulfsborg"],
  S13: ["heidvang", "kornwik"], S14: ["heidvang", "rosshag"], S15: ["heidvang", "steinwacht"], S16: ["kornwik", "kronhall"],
  S17: ["kornwik", "rosshag"], S18: ["rosshag", "kronhall"], S19: ["ulfsborg", "kronhall"], S20: ["rosshag", "sandvik"],
  S21: ["rosshag", "steinwacht"], S22: ["sandvik", "steinwacht"], S23: ["steinwacht", "westvik"],
  P01: ["heidvang", "eiswacht"], P02: ["kronhall", "eiswacht"],
  M01: ["sandvik", "glutvik"], M02: ["sandvik", "rostbucht"], M03: ["sandvik", "skerheim"], M04: ["sandvik", "westvik"],
  M05: ["sandvik", "zhar-kesh"], M06: ["westvik", "rostbucht"], M07: ["westvik", "skarrak"], M08: ["westvik", "zarguth"],
  M09: ["westvik", "zhar-kesh"],
  D01: ["kronhall", "koenigsau"], D02: ["kronhall", "muehlbach"], D03: ["kronhall", "weizenhof"], D04: ["eikmark", "eichenhain"],
  D05: ["eikmark", "koehlerby"], D06: ["hagenfels", "burgwiese"], D07: ["hagenfels", "eisenbach"], D08: ["haraldstad", "ackerholm"],
  D09: ["haraldstad", "rinderby"], D10: ["heidvang", "heidby"], D11: ["heidvang", "schafhag"], D12: ["kornwik", "garbenfeld"],
  D13: ["kornwik", "hopfendal"], D14: ["rosshag", "hengstweide"], D15: ["rosshag", "sattelby"], D16: ["sandvik", "duenenhof"],
  D17: ["sandvik", "muschelby"], D18: ["steinwacht", "felsby"], D19: ["steinwacht", "grenzhof"], D20: ["ulfsborg", "birkenby"],
  D21: ["ulfsborg", "wolfstal"], D22: ["westvik", "netzby"], D23: ["westvik", "tangstrand"],
};

const korrekturen = [["Irrglühte", "Irrglut"]];

const magie = "Prüfen: Runen- oder Glutgegenstand als Lohn, im Kronreich ist Magie nach Königsrecht verboten.";
const hinweise = {
  kornwik_q06: magie, rosshag_q03: magie, eikmark_q06: magie, hagenfels_q07: magie, eikmark_q07: magie,
  westvik_q03: "Prüfen: Von Westvik führt keine Straße direkt nach Kronhall (S23 nach Steinwacht, dann weiter).",
  rosshag_q02: "Prüfen: Titel nennt die Rostsegel (Orkpiraten), der Text Kundschafter der Staubreiter zu Lande.",
  kronhall_q10: "Begleiterin aus Geminis Hauptquest-Vorschlag, im Spiel noch nicht angelegt.",
  rosshag_q10: "Begleiter aus Geminis Hauptquest-Vorschlag, im Spiel noch nicht angelegt.",
  ulfsborg_q10: "Begleiter aus Geminis Hauptquest-Vorschlag, im Spiel noch nicht angelegt.",
  haraldstad_q10: "Belohnung verweist auf Geminis Aktfolge (Akt 2/3), die Henry noch festlegt.",
  hagenfels_q10: "Belohnung verweist auf Geminis Akt 4, die Aktfolge legt Henry noch fest.",
};

const text = (wert) => korrekturen.reduce((s, [alt, neu]) => s.split(alt).join(neu), wert);
const auftrag = (q, art) => ({ id: q.id, titel: text(q.title), art: text(q.category ?? art), text: text(q.description),
  lohn: text(q.reward), ...(hinweise[q.id] ? { hinweis: hinweise[q.id] } : {}) });

const quelle = JSON.parse(fs.readFileSync(path.join(root, "quellen/gemini/kronreich-teil2-nebenquests.json"), "utf8"));
const orte = {};
for (const stadt of quelle.cities) {
  const id = knoten.nachName[stadt.city];
  if (!id) throw new Error("Unbekannte Stadt: " + stadt.city);
  orte[id] = { stufen: stadt.levelRange, auftraege: stadt.sideQuests.map((q) => auftrag(q)) };
  for (const dorf of stadt.villages) {
    const dorfId = knoten.nachName[dorf.village];
    if (!dorfId) throw new Error("Unbekanntes Dorf: " + dorf.village);
    orte[dorfId] = { stufen: stadt.levelRange, weg: dorf.road, ertrag: dorf.yield,
      auftraege: dorf.quests.map((q) => auftrag(q, "Dorfauftrag")) };
  }
}

const daten = {
  kronreich: {
    quelle: "Gemini, 18. 11. 2026, auf Grundlage von „Orte und Wege der Menschen“",
    stand: "Aushang: Aufträge sind lesbar, aber noch nicht spielbar.",
    orte,
  },
  wegKennungen,
};

const kopf = `"use strict";

// Erzeugt von quellen/nebenquests-erzeugen.cjs aus quellen/gemini/. Nicht von Hand ändern,
// sondern die Quelle oder das Skript anpassen und neu ausführen.
`;
fs.writeFileSync(path.join(root, "spiel/nebenquests-daten.js"), kopf + "const nebenquestDaten = " + JSON.stringify(daten) +
  ";\nif (typeof module !== \"undefined\") module.exports = nebenquestDaten;\n");
console.log("spiel/nebenquests-daten.js:", Object.keys(orte).length, "Orte,",
  Object.values(orte).reduce((n, o) => n + o.auftraege.length, 0), "Aufträge");
