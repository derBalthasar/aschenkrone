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

// Weg-Kennungen aus „Orte und Wege der Menschen“ (18. 11. 2026): Kronreich, Orden der Flamme und ihre Grenzwege.
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
  // Orden der Flamme
  S24: ["aschenkloster", "flammenhof"], S25: ["aschenkloster", "glutberg"], S26: ["aschenkloster", "lichtheim"],
  S27: ["aschenkloster", "wachtfeuer"], S28: ["brandstein", "lichtheim"], S29: ["brandstein", "sigrunsheim"],
  S30: ["brandstein", "thorvaldsklipp"], S31: ["eiswacht", "glutberg"], S32: ["eiswacht", "glutvik"],
  S33: ["eiswacht", "thorvaldsklipp"], S34: ["flammenhof", "tranvik"], S35: ["flammenhof", "wachtfeuer"],
  S36: ["glutberg", "lichtheim"], S37: ["glutberg", "nordwacht"], S38: ["glutberg", "thorvaldsklipp"],
  S39: ["glutvik", "nordwacht"], S40: ["glutvik", "thorvaldsklipp"], S41: ["lichtheim", "sigrunsheim"],
  S42: ["lichtheim", "thorvaldsklipp"], S43: ["lichtheim", "wachtfeuer"], S44: ["nordwacht", "thorvaldsklipp"],
  S45: ["sigrunsheim", "grenzmarkt"], S46: ["sigrunsheim", "wachtfeuer"], S47: ["wachtfeuer", "bernsvik"],
  S52: ["bernsvik", "tranvik"],
  P03: ["brandstein", "eiswacht"],
  M10: ["glutvik", "bernsvik"], M11: ["glutvik", "tranvik"], M12: ["nordwacht", "bernsvik"], M13: ["nordwacht", "draugrsund"],
  M14: ["nordwacht", "tranvik"], M23: ["bernsvik", "draugrsund"], M25: ["bernsvik", "perlvik"],
  D24: ["glutberg", "bergweide"], D25: ["glutberg", "kerzenhof"], D26: ["glutberg", "pilgerrast"], D27: ["aschenkloster", "hochtalhof"],
  D28: ["aschenkloster", "klostergarten"], D29: ["brandstein", "feuerhof"], D30: ["brandstein", "schwefelgrube"],
  D31: ["eiswacht", "firnby"], D32: ["eiswacht", "passhuette"], D33: ["flammenhof", "opferhain"], D34: ["flammenhof", "ziegenalm"],
  D35: ["glutvik", "eismeerby"], D36: ["glutvik", "walstrand"], D37: ["lichtheim", "bienental"], D38: ["lichtheim", "kapellby"],
  D39: ["nordwacht", "leuchtfeuer"], D40: ["nordwacht", "robbenstrand"], D41: ["sigrunsheim", "gerstenhof"],
  D42: ["sigrunsheim", "sigrunsquell"], D43: ["thorvaldsklipp", "gebetsfels"], D44: ["thorvaldsklipp", "kliffhof"],
  D45: ["wachtfeuer", "holzfaellerby"], D46: ["wachtfeuer", "wachthof"],
};

// Henry, 18. 11. 2026: Die Orden-Begleiter heißen anders, weil Bjarne (Ser Bjarne vom Eispass) und Solveig
// (Thingsprecherin Solveig Valsdottir) schon vergeben sind.
const korrekturen = [["Irrglühte", "Irrglut"], ["Bjarne Eisenrun", "Halvar Eisenrun"], ["Solveig Gluthand", "Gunhild Gluthand"]];
const text = (wert) => korrekturen.reduce((s, [alt, neu]) => s.split(alt).join(neu), wert);
const lies = (datei) => JSON.parse(fs.readFileSync(path.join(root, "quellen/gemini", datei), "utf8"));
// Dorfnamen sind nicht weltweit eindeutig (Ziegenalm gibt es zweimal), daher über die Stadt auflösen.
const dorfId = (name, stadtId) => Object.values(knoten.alle).find((o) => o.name === name && o.stadt === stadtId)?.id;

// Ein Auftrag. Neue Gemini-Lieferungen nennen Wege (roads) und Gegner (enemies) eigens; beides wird übernommen.
function auftrag(roh, art, hinweise, ersatz = {}) {
  const q = { ...roh, ...(ersatz[roh.id] ?? {}) };
  for (const k of q.roads ?? []) if (!wegKennungen[k]) throw new Error(q.id + ": unbekannter Weg " + k);
  return { id: q.id, titel: text(q.title), art: text(q.category ?? art), text: text(q.description), lohn: text(q.reward),
    ...(q.roads?.length ? { wege: q.roads } : {}), ...(q.enemies?.length ? { gegner: q.enemies.map(text) } : {}),
    ...(q.openPoint ? { offen: q.openPoint } : {}), ...(hinweise[q.id] ? { hinweis: hinweise[q.id] } : {}) };
}

function orteAus(quelle, hinweise, ersatz) {
  const orte = {};
  for (const stadt of quelle.cities) {
    const id = knoten.nachName[stadt.city];
    if (!id) throw new Error("Unbekannte Stadt: " + stadt.city);
    orte[id] = { stufen: stadt.levelRange, auftraege: stadt.sideQuests.map((q) => auftrag(q, undefined, hinweise, ersatz)) };
    for (const dorf of stadt.villages) {
      const id2 = dorfId(dorf.village, id);
      if (!id2) throw new Error("Unbekanntes Dorf: " + dorf.village + " bei " + stadt.city);
      orte[id2] = { stufen: stadt.levelRange, weg: dorf.road, ertrag: dorf.yield,
        auftraege: dorf.quests.map((q) => auftrag(q, "Dorfauftrag", hinweise, ersatz)) };
    }
  }
  return orte;
}

const wahl = (choice) => choice ? Object.values(choice).map((o) => ({ id: o.id, label: o.label, folge: o.effect })) : [];
// Henry, 18. 11. 2026: Die Stufen der Schwester-Zweige richten sich nach der gespielten Reihenfolge,
// nicht nach dem Zweig. Der erste Zweig ist Stufe 6–10, der zweite 11–15 (Geminis Werte bleiben als Empfehlung).
const ZWEIG_STUFEN = "6-10 als erster Zweig, 11-15 als zweiter";

function reiheAus(teil1, f) {
  const ml = teil1.mainQuestline;
  const akte = ml.acts.map((a) => {
    const geaendert = f.aktAenderungen?.[a.id] ?? {};
    const orteDerSchritte = [...new Set(a.steps.map((st) => st.location))].join(", ");
    return {
      id: a.id,
      nr: a.freeOrder ? "2/3" : String(a.act),
      titel: geaendert.titel ?? a.title,
      stufen: a.freeOrder ? ZWEIG_STUFEN : a.levelRange,
      ...(a.freeOrder ? { freieReihenfolge: true, empfohlen: a.recommendedOrder, schwester: a.sisterFaction,
        stufenGemini: a.levelRange } : {}),
      ort: geaendert.ort ?? a.region ?? a.mainLocations?.join(", ") ?? orteDerSchritte,
      ...(a.focus ? { fokus: a.focus } : {}),
      ...(a.includesFolkQuest ? { volksquest: a.includesFolkQuest } : {}),
      ...(geaendert.vermerk ? { vermerk: geaendert.vermerk } : {}),
      schritte: a.steps.map((st) => ({ ort: st.location, titel: st.title, text: st.description,
        ...(f.aenderungen[a.id + "/" + st.step] ?? {}) })),
      wahl: wahl(a.keyChoice),
    };
  });
  // Kronreich liefert die Spezialisierung im Akt (act3Specialization), der Orden unter mainQuestline.specialization.
  const spez = ml.specialization ?? ml.acts.find((a) => a.act3Specialization)?.act3Specialization;
  return {
    motto: teil1.meta.motto,
    kapitel: ml.chapter,
    prolog: { titel: ml.prolog.title, text: ml.prolog.summary ?? f.prologText },
    akte,
    zweigStufen: ["6-10", "11-15"],
    // Henry, 18. 11. 2026: Die Fraktions-Spezialisierung kommt zur Spezialisierung der Klasse hinzu.
    spezialisierung: { ausloeser: spez.trigger, zusaetzlich: "zusätzlich zur Spezialisierung der Klasse",
      optionen: spez.options.map((o) => ({ id: o.id, name: o.name, bonus: o.bonus })) },
    begleiter: teil1.companions.map((c) => {
      const klasse = f.begleiterKlassen?.[c.id] ?? c.class;
      if (!klasse) throw new Error("Begleiter ohne Klasse: " + c.name);
      return { id: c.id, name: text(c.name), rolle: c.role, klasse, ort: knoten.nachName[c.recruitLocation],
        akt: c.recruitAct, auftrag: c.questId, faehigkeit: c.ability, ...(f.begleiterVermerke?.[c.id] ? { vermerk: f.begleiterVermerke[c.id] } : {}) };
    }),
    geheim: f.geheim,
  };
}

// Der Bleiche Skalde (Henry, 18. 11. 2026): Erzpriester Thorvald, entlarvt in Akt 4. Er erklärt die Untoten-Bedrohung.
const skalde = "Erzpriester Thorvald vom Glutberg";

// ---------- Kronreich ----------
// Henry, 18. 11. 2026: Runenwaffen darf das Kronreich tragen, Glutwaffen nicht.
const kronreich = {
  teil1: "kronreich-teil1-hauptquest.json",
  teil2: ["kronreich-teil2-nebenquests.json"],
  hinweise: {
    hagenfels_q07: "Glutwaffe: Im Kronreich nicht tragbar (Henry, 18. 11. 2026). Die Glutstahl-Klinge taugt nur als Beute zum Verkauf.",
    westvik_q03: "Prüfen: Von Westvik führt keine Straße direkt nach Kronhall (S23 nach Steinwacht, dann weiter).",
    rosshag_q02: "Prüfen: Titel nennt die Rostsegel (Orkpiraten), der Text Kundschafter der Staubreiter zu Lande.",
    kronhall_q10: "Begleiterin aus Geminis Hauptquest-Vorschlag, im Spiel noch nicht angelegt.",
    rosshag_q10: "Begleiter aus Geminis Hauptquest-Vorschlag, im Spiel noch nicht angelegt.",
    ulfsborg_q10: "Begleiter aus Geminis Hauptquest-Vorschlag, im Spiel noch nicht angelegt.",
  },
  // Änderung Henry, 18. 11. 2026: Der Bleiche Skalde wird in Akt 4 entdeckt, damit die Bedrohung durch die Untoten erklärt ist.
  aenderungen: {
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
  },
  aktAenderungen: { hum_kronreich_act5: { ort: "Haupthafen -> Seewege -> frei wählbarer Kontinent" } },
  // Klassen der Begleiter (Henry, 18. 11. 2026: keine zwei Späher). Wulfgar ist Steppenreiter (Späher des Kronreichs).
  begleiterKlassen: { comp_kron_sigrid: "waechter", comp_kron_wulfgar: "spaeher", comp_kron_fenris: "krieger" },
  geheim: ["Identität der Stillen Feder"],
  quelle: "Gemini, 18. 11. 2026, auf Grundlage von „Orte und Wege der Menschen“",
  stand: "Aushang: Aufträge sind lesbar, aber noch nicht spielbar.",
};

// ---------- Orden der Flamme ----------
// Gemini, 18. 11. 2026: Hauptquest und Nebenquests Teil A (6 Städte) und Teil B (5 Städte).
// Henry hat am 18. 11. 2026 alle fünf Vorschläge angenommen (Skarn, Gebietsstufe, Namen, Akt-5-Titel, Korntreck).
const orden = {
  teil1: "orden-teil1-hauptquest.json",
  teil2: ["orden-teil2a-nebenquests.json", "orden-teil2b-nebenquests.json"],
  hinweise: {
    glutberg_q10: "Änderung Henry (18. 11. 2026): Skarn der Weiße Bär bleibt das Alphatier von Eiswacht. Glutberg bekommt die Mutter der Tiefen, so kommt jedes Alphatier des Ordens einmal vor.",
    brandstein_q04: "Prüfen: S29 führt nur bis Sigrunsheim. Nach Grenzmarkt geht es von dort über S45 weiter.",
    aschenkloster_q10: "Änderung Henry (18. 11. 2026): Bei Gemini hieß er Bruder Bjarne Eisenrun. Bjarne ist schon Ser Bjarne vom Eispass.",
    brandstein_q10: "Änderung Henry (18. 11. 2026): Bei Gemini hieß sie Solveig Gluthand. Solveig ist schon Thingsprecherin Solveig Valsdottir.",
  },
  // Henry, 18. 11. 2026: Glutberg bekommt statt eines zweiten Skarn die Mutter der Tiefen (Bestiarium „Ordensland“).
  ersatz: {
    glutberg_q10: { title: "Alphatier: Die Mutter der Tiefen",
      description: "Seit dem Beben im Süden kriechen Stollenkriecher aus den Felsspalten unter dem Gipfel. Pilger in der Herberge " +
        "flüstern von ihrer Königin, der Mutter der Tiefen, die ganze Minen leert. Steig in die Spalten unter dem Glutberg und töte sie.",
      roads: [], enemies: ["Die Mutter der Tiefen", "Stollenkriecher"], reward: "65 Silber, Trophäe der Mutter der Tiefen" },
  },
  aenderungen: {
    "orden_branch_kronreich/3": {
      ort: "Kronhall / Eiswacht",
      titel: "Der Korntreck über den Eispass",
      text: "Du sicherst den Korntreck von Kronhall über Pass P02 zurück nach Eiswacht. Auf dem Pass warten Schnee, Wegelagerer und die Zöllner beider Seiten.",
      vermerk: "Änderung Henry (18. 11. 2026): Bei Gemini lief der Treck über S04 und S01 nach Brandstein, also nicht über den Eispass. Jetzt passt er zur Kronreich-Seite („Der Zug über den Eispass“).",
    },
    "orden_act4/1": {
      vermerk: "Wie beim Kronreich: Der Bleiche Skalde ist Erzpriester Thorvald und wird in Akt 4 entlarvt (Henry, 18. 11. 2026). In Akt 1 tritt er unerkannt auf.",
    },
  },
  aktAenderungen: {
    orden_branch_kronreich: { ort: "Eiswacht, Kronhall" },
    orden_act5: { titel: "Über das Innere Meer", ort: "Nordwacht / Glutvik -> Seewege -> frei wählbarer Kontinent",
      vermerk: "Änderung Henry (18. 11. 2026): Bei Gemini „Über das Nordmeer“. Das Ziel ist frei wählbar, und nur der Weg zu den Untoten führt über das Nordmeer." },
  },
  prologText: "Herbst 612 n. E., die Nacht des Erwachens: Novizenweihe im Aschenkloster, ein gefallener Bruder steht im Kreuzgang " +
    "wieder auf, Kultisten löschen die Wachfeuer von Nordwacht, und am Glutberg flackert die Ewige Flamme. (Zusammenfassung des Prologs im Spiel.)",
  geheim: [],
  quelle: "Gemini, 18. 11. 2026, auf Grundlage von „Orte und Wege der Menschen“",
  stand: "Aushang: Aufträge sind lesbar, aber noch nicht spielbar.",
};

function fraktion(f) {
  const orte = Object.assign({}, ...f.teil2.map((d) => orteAus(lies(d), f.hinweise, f.ersatz)));
  for (const id of Object.keys(f.hinweise)) {
    if (!Object.values(orte).some((o) => o.auftraege.some((q) => q.id === id))) throw new Error("Hinweis ohne Auftrag: " + id);
  }
  return { volk: "menschen", reihe: reiheAus(lies(f.teil1), f), quelle: f.quelle, stand: f.stand, ...(f.fehlt ? { fehlt: f.fehlt } : {}), orte };
}

const daten = { kronreich: fraktion(kronreich), orden: fraktion(orden), wegKennungen };

const kopf = `"use strict";

// Erzeugt von quellen/nebenquests-erzeugen.cjs aus quellen/gemini/. Nicht von Hand ändern,
// sondern die Quelle oder das Skript anpassen und neu ausführen.
`;
fs.writeFileSync(path.join(root, "spiel/nebenquests-daten.js"), kopf + "const nebenquestDaten = " + JSON.stringify(daten) +
  ";\nif (typeof module !== \"undefined\") module.exports = nebenquestDaten;\n");
for (const id of ["kronreich", "orden"]) {
  const orte = Object.values(daten[id].orte);
  console.log(id + ":", orte.length, "Orte,", orte.reduce((n, o) => n + o.auftraege.length, 0), "Aufträge");
}
