"use strict";

// Erzeugt spiel/nebenquests-daten.js aus den Gemini-Ausarbeitungen in quellen/gemini/.
// Aufruf: node quellen/nebenquests-erzeugen.cjs
//
// Die Texte bleiben wörtlich. Nur eindeutige Schreibfehler bei Bestiariumsnamen werden auf den Kanon
// zurückgeführt (siehe korrekturen). Prüfvermerke (hinweise) markieren Punkte, die Henry noch entscheiden muss;
// sie ändern nichts am Text. Die Hauptquest aus teil1 übernimmt das Skript nach Geminis Aufbau (Entscheidung Henry,
// 18. 11. 2026). Einzige inhaltliche Änderung: Der Bleiche Skalde wird in Akt 4 entdeckt (siehe aenderungen).
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

// Henry, 18. 11. 2026: Runenwaffen darf das Kronreich tragen, Glutwaffen nicht.
const hinweise = {
  hagenfels_q07: "Glutwaffe: Im Kronreich nicht tragbar (Henry, 18. 11. 2026). Die Glutstahl-Klinge taugt nur als Beute zum Verkauf.",
  westvik_q03: "Prüfen: Von Westvik führt keine Straße direkt nach Kronhall (S23 nach Steinwacht, dann weiter).",
  rosshag_q02: "Prüfen: Titel nennt die Rostsegel (Orkpiraten), der Text Kundschafter der Staubreiter zu Lande.",
  kronhall_q10: "Begleiterin aus Geminis Hauptquest-Vorschlag, im Spiel noch nicht angelegt.",
  rosshag_q10: "Begleiter aus Geminis Hauptquest-Vorschlag, im Spiel noch nicht angelegt.",
  ulfsborg_q10: "Begleiter aus Geminis Hauptquest-Vorschlag, im Spiel noch nicht angelegt.",
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

// Hauptquest (Fraktionsreihe) nach Geminis Aufbau. Änderung Henry, 18. 11. 2026: Der Bleiche Skalde wird in Akt 4
// entdeckt, damit die Bedrohung durch die Untoten erklärt ist. Identität laut Henry (18. 11. 2026): Erzpriester Thorvald.
const skalde = "Erzpriester Thorvald vom Glutberg";
const aenderungen = {
  "hum_kronreich_act4/1": {
    titel: "Entlarvung des Bleichen Skalden",
    text: "Der stumme Heiler am Krankenbett Harald IV. wird als Grabwächter des Kults der Bleichen Ewigkeit entlarvt und seine " +
      "8-köpfige Kultzelle in den Katakomben zerschlagen. Seine Briefe führen zum Bleichen Skalden selbst: " + skalde + ". " +
      "Seit über hundert Jahren hält ihn die Totenmagie des Nordens am Leben. Als Preis dafür schwächt er die Ewige Flamme, " +
      "und je schwächer sie brennt, desto stärker werden die Untoten im hohen Norden. Der Held stellt ihn in den Katakomben " +
      "(Endgegner). Untoten-Bedrohung −15.",
    vermerk: "Änderung Henry (18. 11. 2026): Der Skalde wird hier entdeckt. Gemini ließ ihn unerkannt. Der Skalde ist Erzpriester Thorvald (Henry, 18. 11. 2026).",
  },
  "hum_kronreich_act5/3": {
    ort: "Fremde Küste (frei wählbarer Kontinent)",
    text: "Eroberung eines Küstenabschnitts und Errichtung des ersten Feldlagers. Das Ziel wählt der Spieler frei: die Elfen " +
      "im Osten, die Orks im Südwesten oder die Zwerge im Südosten, jeweils als Verbündete oder um sie zu unterwerfen. Wer " +
      "die Untoten-Bedrohung an der Wurzel vernichten will, segelt zum Kontinent der Untoten im hohen Norden: der " +
      "schwerste Weg. Ende Kapitel 1.",
    vermerk: "Änderung Henry (18. 11. 2026): Kontinent frei wählbar, Bündnis oder Unterwerfung; Untote extrem schwer.",
  },
};
// Klassen der Begleiter (Henry, 18. 11. 2026: keine zwei Späher). Wulfgar ist Steppenreiter (Späher des Kronreichs).
const begleiterKlassen = { comp_kron_sigrid: "waechter", comp_kron_wulfgar: "spaeher", comp_kron_fenris: "krieger" };
const teil1 = JSON.parse(fs.readFileSync(path.join(root, "quellen/gemini/kronreich-teil1-hauptquest.json"), "utf8"));
const ml = teil1.mainQuestline;
const wahl = (choice) => choice ? Object.values(choice).map((o) => ({ id: o.id, label: o.label, folge: o.effect })) : [];
const akte = ml.acts.map((a) => ({
  id: a.id,
  nr: typeof a.act === "number" ? String(a.act) : "2/3",
  titel: a.title,
  // Henry, 18. 11. 2026: Die Stufen der Schwester-Zweige richten sich nach der gespielten Reihenfolge,
  // nicht nach dem Zweig. Der erste Zweig ist Stufe 6–10, der zweite 11–15 (Geminis Werte bleiben als Empfehlung).
  stufen: a.freeOrder ? "6-10 als erster Zweig, 11-15 als zweiter" : a.levelRange,
  ...(a.freeOrder ? { freieReihenfolge: true, empfohlen: a.recommendedOrder, schwester: a.sisterFaction,
    stufenGemini: a.levelRange } : {}),
  ort: (a.id === "hum_kronreich_act5" ? "Haupthafen -> Seewege -> frei wählbarer Kontinent" : a.region) ?? a.mainLocations.join(", "),
  ...(a.focus ? { fokus: a.focus } : {}),
  ...(a.includesFolkQuest ? { volksquest: a.includesFolkQuest } : {}),
  schritte: a.steps.map((st) => ({ ort: st.location, titel: st.title, text: st.description,
    ...(aenderungen[a.id + "/" + st.step] ?? {}) })),
  wahl: wahl(a.keyChoice),
}));
const spez = ml.acts.find((a) => a.act3Specialization)?.act3Specialization;
const reihe = {
  motto: teil1.meta.motto,
  kapitel: ml.chapter,
  prolog: { titel: ml.prolog.title, text: ml.prolog.summary },
  akte,
  zweigStufen: ["6-10", "11-15"],
  // Henry, 18. 11. 2026: Die Fraktions-Spezialisierung kommt zur Spezialisierung der Klasse hinzu.
  spezialisierung: { ausloeser: spez.trigger, zusaetzlich: "zusätzlich zur Spezialisierung der Klasse", optionen: spez.options.map((o) => ({ id: o.id, name: o.name, bonus: o.bonus })) },
  begleiter: teil1.companions.map((c) => ({ id: c.id, name: c.name, rolle: c.role, klasse: begleiterKlassen[c.id], ort: knoten.nachName[c.recruitLocation],
    akt: c.recruitAct, auftrag: c.questId, faehigkeit: c.ability })),
  geheim: ["Identität der Stillen Feder"],
};

const daten = {
  kronreich: {
    reihe,
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
