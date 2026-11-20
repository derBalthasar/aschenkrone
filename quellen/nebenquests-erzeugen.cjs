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
  // Freie Häfen und Seewege zu den anderen Völkern (Orte und Wege der Menschen, 18. 11. 2026)
  S48: ["ankerfjord", "nebelvik"], S49: ["ankerfjord", "silberholm"], S50: ["bernsvik", "grenzmarkt"],
  S51: ["bernsvik", "silberholm"], S53: ["grenzmarkt", "perlvik"], S54: ["grenzmarkt", "skerheim"],
  S55: ["nebelvik", "silberholm"], S56: ["perlvik", "salzwacht"], S57: ["salzwacht", "skerheim"],
  M15: ["ankerfjord", "bernsvik"], M16: ["ankerfjord", "draugrsund"], M17: ["ankerfjord", "moewenstad"],
  M18: ["ankerfjord", "perlvik"], M19: ["ankerfjord", "salzwacht"], M20: ["ankerfjord", "schattmund"],
  M21: ["ankerfjord", "skerheim"], M22: ["ankerfjord", "tranvik"], M24: ["bernsvik", "nebelvik"], M26: ["bernsvik", "skerheim"],
  M27: ["bernsvik", "totenwacht"], M28: ["moewenstad", "rubinhafen"], M29: ["moewenstad", "schattmund"],
  M30: ["moewenstad", "silberholm"], M31: ["moewenstad", "zollholm"], M32: ["draugrsund", "nebelvik"],
  M33: ["nebelvik", "perlvik"], M34: ["nebelvik", "salzwacht"], M35: ["nebelvik", "schattmund"], M36: ["nebelvik", "skerheim"],
  M37: ["nebelvik", "totenwacht"], M38: ["nebelvik", "tranvik"], M39: ["draugrsund", "perlvik"], M40: ["perlvik", "silberholm"],
  M41: ["perlvik", "skerheim"], M42: ["draugrsund", "salzwacht"], M43: ["rostbucht", "salzwacht"],
  M44: ["salzwacht", "silberholm"], M45: ["draugrsund", "silberholm"], M46: ["silberholm", "skerheim"],
  M47: ["silberholm", "totenwacht"], M48: ["silberholm", "tranvik"], M49: ["rostbucht", "skerheim"],
  M50: ["draugrsund", "tranvik"], M51: ["totenwacht", "tranvik"], M52: ["erzhafen", "zollholm"], M53: ["laubmarkt", "zollholm"],
  M54: ["rubinhafen", "zollholm"], M55: ["salzbucht", "zollholm"], M56: ["schattmund", "zollholm"],
  M57: ["westhort", "zollholm"], D47: ["perlvik", "fischerholm"], D48: ["perlvik", "gartenby"], D49: ["perlvik", "perlstrand"],
  D50: ["ankerfjord", "fjordhof"], D51: ["ankerfjord", "seilerby"], D52: ["bernsvik", "bernsteinstrand"],
  D53: ["bernsvik", "tangby"], D54: ["grenzmarkt", "passhof"], D55: ["grenzmarkt", "saumby"],
  D56: ["moewenstad", "moewenstrand"], D57: ["moewenstad", "salzgarten"], D58: ["nebelvik", "nebelstrand"],
  D59: ["nebelvik", "schmugglerbucht"], D60: ["salzwacht", "teerhag"], D61: ["salzwacht", "werftby"],
  D62: ["silberholm", "inselhof"], D63: ["silberholm", "silbergrube"], D64: ["skerheim", "klippenhof"],
  D65: ["skerheim", "robbenschaer"], D66: ["tranvik", "raeucherby"], D67: ["tranvik", "walby"], D68: ["zollholm", "kliffby"],
  D69: ["zollholm", "leuchtholm"],
};

// Henry, 18. 11. 2026: Die Orden-Begleiter heißen anders, weil Bjarne (Ser Bjarne vom Eispass) und Solveig
// (Thingsprecherin Solveig Valsdottir) schon vergeben sind.
// Gemini schrieb einmal „Haizahn-Harpoon“ (englisch); im Spiel heißt die Waffe Haizahn-Harpune.
const korrekturen = [["Irrglühte", "Irrglut"], ["Bjarne Eisenrun", "Halvar Eisenrun"], ["Solveig Gluthand", "Gunhild Gluthand"],
  ["Haizahn-Harpoon", "Haizahn-Harpune"]];
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

function orteAus(quelle, hinweise, ersatz, einheitlicheStufen = null) {
  const orte = {};
  for (const stadt of quelle.cities) {
    const id = knoten.nachName[stadt.city];
    if (!id) throw new Error("Unbekannte Stadt: " + stadt.city);
    orte[id] = { stufen: einheitlicheStufen ?? stadt.levelRange, auftraege: stadt.sideQuests.map((q) => auftrag(q, undefined, hinweise, ersatz)) };
    for (const dorf of stadt.villages) {
      const id2 = dorfId(dorf.village, id);
      if (!id2) throw new Error("Unbekanntes Dorf: " + dorf.village + " bei " + stadt.city);
      orte[id2] = { stufen: einheitlicheStufen ?? stadt.levelRange, weg: dorf.road, ertrag: dorf.yield,
        auftraege: dorf.quests.map((q) => auftrag(q, "Dorfauftrag", hinweise, ersatz)) };
    }
  }
  return orte;
}

const wahl = (choice) => choice ? Object.values(choice).map((o) => ({ id: o.id, label: o.label, folge: o.effect })) : [];
// Henry, 18. 11. 2026: Die Stufen der Schwester-Zweige richten sich nach der gespielten Reihenfolge,
// nicht nach dem Zweig. Der erste Zweig ist Stufe 6–10, der zweite 11–15 (Geminis Werte bleiben als Empfehlung).
const ZWEIG_STUFEN = "6-10 als erster Zweig, 11-15 als zweiter";
// Patch 2.6.19 (Henry, B7): verbindliche Akt-Stufen 1–5, 6–10, 11–15, 16–22, 20–26 (Untoten-Norden 25–30); Geminis Werte bleiben als stufenGemini.
const AKT_STUFEN = { "1": "1-5", "4": "16-22", "5": "20-26" };

function reiheAus(teil1, f) {
  const ml = teil1.mainQuestline;
  const akte = ml.acts.map((a) => {
    const geaendert = f.aktAenderungen?.[a.id] ?? {};
    const orteDerSchritte = [...new Set(a.steps.map((st) => st.location))].join(", ");
    return {
      id: a.id,
      nr: a.freeOrder ? "2/3" : String(a.act),
      titel: geaendert.titel ?? a.title,
      stufen: a.freeOrder ? ZWEIG_STUFEN : AKT_STUFEN[String(a.act)] ?? a.levelRange,
      ...(!a.freeOrder && AKT_STUFEN[String(a.act)] && AKT_STUFEN[String(a.act)] !== a.levelRange ? { stufenGemini: a.levelRange } : {}),
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
      return { id: f.begleiterIds?.[c.id] ?? c.id, name: text(c.name), rolle: c.role, klasse, ort: knoten.nachName[c.recruitLocation],
        akt: c.recruitAct, auftrag: c.questId, faehigkeit: c.ability, ...(f.begleiterVermerke?.[c.id] ? { vermerk: f.begleiterVermerke[c.id] } : {}) };
    }),
    flotte: { kriegsrat: f.kriegsrat, ziele: flotteZiele },
    geheim: f.geheim,
  };
}

// Patch Henry, 18. 11. 2026 (Feinschliff Volk der Menschen, Punkt 1): Akt 5 beginnt mit dem Kriegsrat im Haupthafen.
// Dort wählt der Spieler das Ziel. Danach verlegt die Flotte in den echten Starthafen der gewählten Seeweg-Route.
const flotteZiele = [
  { volk: "elfen", name: "Elfen", wahl: ["Bündnis", "Unterwerfung"], starthaefen: [{ hafen: "zollholm", wege: ["M53"] }] },
  { volk: "zwerge", name: "Zwerge", wahl: ["Bündnis", "Unterwerfung"], starthaefen: [{ hafen: "zollholm", wege: ["M52", "M55", "M57"] }] },
  { volk: "orks", name: "Orks", wahl: ["Bündnis", "Unterwerfung"],
    starthaefen: [{ hafen: "westvik", wege: ["M09", "M06"] }, { hafen: "sandvik", wege: ["M02", "M05"] }] },
  { volk: "untote", name: "Untote", wahl: ["Vernichtung"], schwer: "extrem schwer",
    starthaefen: [{ hafen: "tranvik", wege: ["M50", "M51"] }, { hafen: "nordwacht", wege: ["M13"] }] },
];
for (const z of flotteZiele) for (const s of z.starthaefen) for (const k of s.wege) {
  if (!wegKennungen[k]?.includes(s.hafen)) throw new Error("Flotte: " + k + " beginnt nicht in " + s.hafen);
}
const kriegsratSchritt = (ort) => ({
  ort,
  titel: "Kriegsrat und Auslaufen der Armada",
  text: "Im Haupthafen " + ort + " tagt der letzte Kriegsrat der vereinten Menschen. Hier wählst du das Ziel der Armada: " +
    "die Elfen im Osten, die Orks im Südwesten oder die Zwerge im Südosten, jeweils als Bündnis oder um sie zu unterwerfen, " +
    "oder als extrem schweren Weg die Untoten im hohen Norden. Danach verlegt die Flotte in den Starthafen ihrer Route und läuft " +
    "dort aus: Zollholm für die Elfen (M53) und die Zwerge (M52, M55, M57), Westvik oder Sandvik für die Orks (M09, M06, M02, M05), " +
    "Tranvik (M50, M51) oder Nordwacht (M13) für die Untoten.",
  vermerk: "Änderung Henry (18. 11. 2026): Kriegsrat mit Zielwahl im Haupthafen, Abfahrt aus dem echten Starthafen der Route.",
});

// Der Bleiche Skalde (Henry, 18. 11. 2026): Erzpriester Thorvald, entlarvt in Akt 4. Er erklärt die Untoten-Bedrohung.
const skalde = "Erzpriester Thorvald vom Glutberg";

// Henry, 18. 11. 2026: Runen- und Glutgegenstände sind Gruppen-Relikte (quellen/henry/relikte.json).
const relikte = JSON.parse(fs.readFileSync(path.join(root, "quellen/henry/relikte.json"), "utf8"));
const reliktHinweis = (id) => {
  const r = relikte.relicItems.find((item) => item.sourceQuest === id);
  const wer = Object.entries(relikte.partyRelicSystem.factionPermissions).filter(([, typen]) => typen.includes(r.relicType))
    .map(([f]) => ({ kronreich: "Kronreich", orden: "Orden der Flamme", haefen: "Freie Häfen" })[f]);
  return "Gruppen-Relikt (Henry, 18. 11. 2026): " + r.name + " stärkt als einziges aktives Relikt die ganze Gruppe (" +
    r.partyBuff.label + "). Nutzbar für " + wer.join(", ") + "; alle anderen verkaufen es für " + r.sellValue + " Silber.";
};

// ---------- Kronreich ----------
// Henry, 18. 11. 2026: Runenwaffen darf das Kronreich tragen, Glutwaffen nicht.
const kronreich = {
  teil1: "kronreich-teil1-hauptquest.json",
  teil2: ["kronreich-teil2-nebenquests.json"],
  // Henry, 18. 11. 2026 (Arbeitsanweisung Volk der Menschen): Landweg für den Salzkarren, Titel passend zu den Staubreitern.
  ersatz: {
    westvik_q03: { description: "Schütze Salzkarren aus Tangstrand auf dem Landweg nach Kronhall: über S23 nach Steinwacht, " +
      "dann über S21 nach Rosshag und S18 nach Kronhall.", roads: ["S23", "S21", "S18"] },
    rosshag_q02: { title: "Pferdediebe der Staubreiter" },
  },
  hinweise: {
    hagenfels_q07: "Glutwaffe: Im Kronreich nicht tragbar (Henry, 18. 11. 2026). Die Glutstahl-Klinge taugt nur als Beute zum Verkauf.",
    westvik_q03: "Änderung Henry (18. 11. 2026): Bei Gemini direkt nach Kronhall. Der Landweg führt über S23 nach Steinwacht und von dort über Rosshag (S21, S18) nach Kronhall.",
    rosshag_q02: "Änderung Henry (18. 11. 2026): Bei Gemini „Pferdediebe der Rostsegel“. Die Diebe sind Kundschafter der Staubreiter zu Lande.",
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
    "hum_kronreich_act5/1": kriegsratSchritt("Perlvik"),
    "hum_kronreich_act5/3": {
      ort: "Fremde Küste (frei wählbarer Kontinent)",
      text: "Eroberung eines Küstenabschnitts und Errichtung des ersten Feldlagers. Das Ziel wählt der Spieler frei: die Elfen " +
        "im Osten, die Orks im Südwesten oder die Zwerge im Südosten, jeweils als Verbündete oder um sie zu unterwerfen. Wer " +
        "die Untoten-Bedrohung an der Wurzel vernichten will, segelt zum Kontinent der Untoten im hohen Norden: der " +
        "schwerste Weg. Ende Kapitel 1.",
      vermerk: "Änderung Henry (18. 11. 2026): Kontinent frei wählbar, Bündnis oder Unterwerfung; Untote extrem schwer.",
    },
  },
  aktAenderungen: { hum_kronreich_act5: { ort: "Perlvik (Kriegsrat) -> Starthafen der Route -> frei wählbarer Kontinent" } },
  kriegsrat: ["perlvik"],
  // Patch Henry, 18. 11. 2026 (Punkt 2): Alle 33 Städte der Menschen haben am Aushang Stufe 1–5.
  stufen: "1-5",
  // Klassen der Begleiter (Henry, 18. 11. 2026: keine zwei Späher). Wulfgar ist Steppenreiter (Späher des Kronreichs).
  // Patch 2.6.19 (Henry, B5): Fenris ist Meister-Bogenschütze und damit Späher (Fernkampf, Geschick).
  begleiterKlassen: { comp_kron_sigrid: "waechter", comp_kron_wulfgar: "spaeher", comp_kron_fenris: "spaeher" },
  geheim: ["Identität der Stillen Feder"],
  quelle: "Gemini, 18. 11. 2026, auf Grundlage von „Orte und Wege der Menschen“",
  stand: "Aushang: Helden der drei Menschen-Fraktionen nehmen die Aufträge an. Andere Völker lesen nur mit.",
};

// ---------- Orden der Flamme ----------
// Gemini, 18. 11. 2026: Hauptquest und Nebenquests Teil A (6 Städte) und Teil B (5 Städte).
// Henry hat am 18. 11. 2026 alle fünf Vorschläge angenommen (Skarn, Gebietsstufe, Namen, Akt-5-Titel, Korntreck).
const orden = {
  teil1: "orden-teil1-hauptquest.json",
  teil2: ["orden-teil2a-nebenquests.json", "orden-teil2b-nebenquests.json"],
  hinweise: {
    aschenkloster_q07: reliktHinweis("aschenkloster_q07"), glutberg_q08: reliktHinweis("glutberg_q08"),
    glutberg_q10: "Änderung Henry (18. 11. 2026): Skarn der Weiße Bär bleibt das Alphatier von Eiswacht. Glutberg bekommt die Mutter der Tiefen, so kommt jedes Alphatier des Ordens einmal vor.",
    brandstein_q04: "Änderung Henry (18. 11. 2026): Bei Gemini nur S29. Nach Grenzmarkt führt S29 bis Sigrunsheim und dann S45.",
    aschenkloster_q10: "Änderung Henry (18. 11. 2026): Bei Gemini hieß er Bruder Bjarne Eisenrun. Bjarne ist schon Ser Bjarne vom Eispass.",
    brandstein_q10: "Änderung Henry (18. 11. 2026): Bei Gemini hieß sie Solveig Gluthand. Solveig ist schon Thingsprecherin Solveig Valsdottir.",
  },
  // Henry, 18. 11. 2026: Glutberg bekommt statt eines zweiten Skarn die Mutter der Tiefen (Bestiarium „Ordensland“).
  ersatz: {
    brandstein_q04: { description: "Schmuggler wollen Schwefel aus Brandstein über S29 und weiter über S45 an die Freien Häfen " +
      "in Grenzmarkt verkaufen. Fang sie auf S29 ab, bevor sie Sigrunsheim erreichen.", roads: ["S29", "S45"] },
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
    "orden_act5/1": kriegsratSchritt("Nordwacht / Glutberg"),
    "orden_act4/1": {
      vermerk: "Wie beim Kronreich: Der Bleiche Skalde ist Erzpriester Thorvald und wird in Akt 4 entlarvt (Henry, 18. 11. 2026). In Akt 1 tritt er unerkannt auf.",
    },
  },
  aktAenderungen: {
    orden_branch_kronreich: { ort: "Eiswacht, Kronhall" },
    orden_act5: { titel: "Über das Innere Meer", ort: "Nordwacht / Glutberg (Kriegsrat) -> Starthafen der Route -> frei wählbarer Kontinent",
      vermerk: "Änderung Henry (18. 11. 2026): Bei Gemini „Über das Nordmeer“. Das Ziel ist frei wählbar, und nur der Weg zu den Untoten führt über das Nordmeer." },
  },
  prologText: "Herbst 612 n. E., die Nacht des Erwachens: Novizenweihe im Aschenkloster, ein gefallener Bruder steht im Kreuzgang " +
    "wieder auf, Kultisten löschen die Wachfeuer von Nordwacht, und am Glutberg flackert die Ewige Flamme. (Zusammenfassung des Prologs im Spiel.)",
  geheim: [],
  kriegsrat: ["nordwacht", "glutberg"],
  // Henry, 18. 11. 2026: Alle Startgebiete des Ordens in Akt 1 haben Stufe 1–5. Höhere Stufen greifen über die Akt-Reihenfolge.
  stufen: "1-5",
  // Einheitliche Kennungen der Begleiter (Arbeitsanweisung Volk der Menschen, 18. 11. 2026).
  begleiterIds: { comp_orden_bjarne: "comp_orden_halvar", comp_orden_solveig: "comp_orden_gunhild" },
  quelle: "Gemini, 18. 11. 2026, auf Grundlage von „Orte und Wege der Menschen“",
  stand: "Aushang: Helden der drei Menschen-Fraktionen nehmen die Aufträge an. Andere Völker lesen nur mit.",
};

// ---------- Freie Häfen ----------
// Gemini, 18. 11. 2026: Hauptquest, Nebenquests Teil A (Perlvik, Silberholm, Skerheim, Tranvik, Zollholm) und Teil B
// (Ankerfjord, Bernsvik, Grenzmarkt, Möwenstad, Nebelvik, Salzwacht). Silberholm q01–q08 hat Henry am 18. 11. 2026 nachgeliefert.
const haefen = {
  teil1: "haefen-teil1-hauptquest.json",
  teil2: ["haefen-teil2a-nebenquests.json", "haefen-teil2b-nebenquests.json"],
  hinweise: {
    ankerfjord_q04: reliktHinweis("ankerfjord_q04"), grenzmarkt_q04: reliktHinweis("grenzmarkt_q04"),
    silberholm_q04: reliktHinweis("silberholm_q04"), nebelvik_q04: reliktHinweis("nebelvik_q04"),
    zollholm_q10: "Änderung Henry (18. 11. 2026): Bei Gemini „Mutter Tiefe“. Umbenannt in „Die Schwarze Krake“, damit sie nicht mit der Mutter der Tiefen aus dem Ordensland verwechselt wird.",
    skerheim_q07: "Gemini schrieb „Haizahn-Harpoon“. Im Spiel heißt der Lohn Haizahn-Harpune.",
  },
  // Patch Henry, 18. 11. 2026 (Punkt 3): Das Alphatier der Tiefenkraken heißt Die Schwarze Krake.
  ersatz: {
    zollholm_q10: { title: "Alphatier: Die Schwarze Krake", enemies: ["Die Schwarze Krake"], reward: "65 Silber, Trophäe der Schwarzen Krake",
      description: "In den tiefen Gewässern rund um die Zollinseln lauert die Schwarze Krake, der größte Tiefenkrake des Inneren Meeres, " +
        "und zieht ganze Zollkutter in die Tiefe." },
  },
  aenderungen: {
    // Arbeitsanweisung Volk der Menschen, 18. 11. 2026: „Gold und Eisen“ folgt den echten Straßen.
    "haefen_branch_orden/2": {
      ort: "Wachtfeuer / Lichtheim / Brandstein",
      text: "Von Wachtfeuer reist du über S43 nach Lichtheim und über S28 weiter nach Brandstein. Dort verhandelst du über " +
        "Schwefellieferungen für die Schiffskanonen von Admiral Knut Salzhand, während Erzpriester Thorvald misstrauisch deine Schritte beobachtet.",
      vermerk: "Änderung Henry (18. 11. 2026): Weg über Lichtheim (S43, S28).",
    },
    "haefen_branch_orden/3": {
      ort: "Thorvaldsklipp / Glutberg",
      text: "Über S30 nach Thorvaldsklipp und S38 hinauf zum Glutberg. Am Gipfel schließt du mit Hochmeisterin Ragna Glutherz und " +
        "Seherin Freydis den Pakt über gemeinsame Kreuzzugs- und Handelsflotten.",
      vermerk: "Änderung Henry (18. 11. 2026): Weg über Thorvaldsklipp (S30, S38).",
    },
    "haefen_act5/1": kriegsratSchritt("Perlvik"),
  },
  aktAenderungen: {
    haefen_act5: { titel: "Über das Innere Meer", ort: "Perlvik (Kriegsrat) -> Starthafen der Route -> frei wählbarer Kontinent",
      vermerk: "Änderung Henry (18. 11. 2026): Bei Gemini „Die Flotte gen Norden“. Das Ziel ist frei wählbar, darum heißt der Akt wie bei Kronreich und Orden." },
  },
  kriegsrat: ["perlvik"],
  prologText: "Herbst 612 n. E., die Nacht des Erwachens: Ein Schmugglerschiff aus dem Norden läuft in Perlvik ein. Im Laderaum " +
    "liegen Aethari-Schriften und gefesselte Elfenhändler. Kurz nach Mitternacht brennt das Gildenhaus, die Schriften verschwinden, " +
    "und der Held flieht mit den Elfen nach Zollholm. (Zusammenfassung des Prologs im Spiel.)",
  geheim: ["Identität der Stillen Feder"],
  stufen: "1-5",
  quelle: "Gemini, 18. 11. 2026, auf Grundlage von „Orte und Wege der Menschen“",
  stand: "Aushang: Helden der drei Menschen-Fraktionen nehmen die Aufträge an. Andere Völker lesen nur mit.",
};

// ---------- Spielwerte (Henry, 18. 11. 2026: Haupt- und Nebenquests spielbar) ----------
// Gegnerarten der Aufträge. Gruppen kämpfen als Mitläufer (3 gegen einen Helden, je Begleiter einer mehr),
// Einzeltiere als Elite, Alphatiere als Anführer auf Gebietsstufe (Kampfdokument, Errata 4). Die Zahlen im
// Auftragstext („Sieben Kultisten“) bleiben Erzählung.
const gegnerTypen = {
  kultisten: { name: "Kultisten", rang: "mitlaeufer", anzahl: 3, leader: "Kultführer", ally: "Kultist" },
  schmuggler: { name: "Schmuggler", rang: "mitlaeufer", anzahl: 3, leader: "Schmugglerkapitän", ally: "Schmuggler" },
  spione: { name: "Spione", rang: "mitlaeufer", anzahl: 3, leader: "Spitzel", ally: "Späher" },
  deserteure: { name: "Deserteure", rang: "mitlaeufer", anzahl: 3, leader: "Wortführer", ally: "Deserteur" },
  wegelagerer: { name: "Wegelagerer", rang: "mitlaeufer", anzahl: 3, leader: "Bandenführer", ally: "Wegelagerer" },
  grauwoelfe: { name: "Grauwölfe", rang: "mitlaeufer", anzahl: 3, leader: "Leitwolf", ally: "Grauwolf" },
  aschenkraehen: { name: "Aschenkrähen", rang: "mitlaeufer", anzahl: 3, leader: "Aschenkrähe", ally: "Weitere Krähe" },
  galgenkraehen: { name: "Galgenkrähen", rang: "mitlaeufer", anzahl: 3, leader: "Galgenkrähe", ally: "Weitere Krähe" },
  schneeschleicher: { name: "Schneeschleicher", rang: "mitlaeufer", anzahl: 3, leader: "Schneeschleicher", ally: "Schneeschleicher" },
  stollenkriecher: { name: "Stollenkriecher", rang: "mitlaeufer", anzahl: 3, leader: "Stollenkriecher", ally: "Stollenkriecher" },
  glutkaefer: { name: "Glutkäfer", rang: "mitlaeufer", anzahl: 3, leader: "Glutkäfer", ally: "Weiterer Glutkäfer" },
  wrackkrabben: { name: "Wrackkrabben", rang: "mitlaeufer", anzahl: 3, leader: "Wrackkrabbe", ally: "Wrackkrabbe" },
  riffhaie: { name: "Riffhaie", rang: "mitlaeufer", anzahl: 3, leader: "Riffhai", ally: "Riffhai" },
  orkvortrupp: { name: "Ork-Vortrupp", rang: "mitlaeufer", anzahl: 3, leader: "Rostsegel-Plünderer", ally: "Ork-Krieger" },
  frostbaer: { name: "Frostbär", rang: "elite" }, eishauer: { name: "Eishauer", rang: "elite" },
  klippenwyrm: { name: "Klippenwyrm", rang: "elite" }, glutwurm: { name: "Glutwurm", rang: "elite" },
  runenfresser: { name: "Runenfresser", rang: "elite" }, aschenmammut: { name: "Aschenmammut", rang: "elite" },
  keiler: { name: "Eisenborstenkeiler", rang: "elite" }, flussschnapper: { name: "Flussschnapper", rang: "elite" },
  netzweberin: { name: "Netzweberin", rang: "elite" }, irrglut: { name: "Irrglut", rang: "elite" },
  moorschlinger: { name: "Moorschlinger", rang: "elite" }, kulthauptmann: { name: "Kult-Hauptmann", rang: "elite" },
  skarn: { name: "Skarn der Weiße Bär", rang: "anfuehrer", alpha: true },
  mutterdertiefen: { name: "Die Mutter der Tiefen", rang: "anfuehrer", alpha: true },
  letztermammut: { name: "Der Letzte Mammut", rang: "anfuehrer", alpha: true },
  graufang: { name: "Graufang", rang: "anfuehrer", alpha: true },
  diealte: { name: "Die Alte vom Moor", rang: "anfuehrer", alpha: true },
  // Freie Häfen (Bestiarium „Meere und Inseln“)
  hafenratten: { name: "Hafenratten", rang: "mitlaeufer", anzahl: 3, leader: "Hafenratte", ally: "Hafenratte" },
  orkpiraten: { name: "Orkpiraten", rang: "mitlaeufer", anzahl: 3, leader: "Piratenkapitän", ally: "Orkpirat" },
  tiefenkrake: { name: "Tiefenkrake", rang: "elite" }, sturmrochen: { name: "Sturmrochen", rang: "elite" },
  schwarzekrake: { name: "Die Schwarze Krake", rang: "anfuehrer", alpha: true },
  kapitaen: { name: "Der Kapitän", rang: "anfuehrer", alpha: true },
};
const gegnerNachName = { "Grauwolf": "grauwoelfe", "Grauwölfe": "grauwoelfe", "Kultisten": "kultisten", "Schmuggler": "schmuggler",
  "Spione": "spione", "Deserteure": "deserteure", "Wegelagerer": "wegelagerer", "Aschenkrähen": "aschenkraehen",
  "Schneeschleicher": "schneeschleicher", "Stollenkriecher": "stollenkriecher", "Frostbär": "frostbaer", "Eishauer": "eishauer",
  "Klippenwyrm": "klippenwyrm", "Glutwurm": "glutwurm", "Runenfresser": "runenfresser", "Aschenmammut": "aschenmammut",
  "Skarn der Weiße Bär": "skarn", "Die Mutter der Tiefen": "mutterdertiefen", "Der Letzte Mammut": "letztermammut",
  "Galgenkrähen": "galgenkraehen", "Riffhaie": "riffhaie", "Wrackkrabben": "wrackkrabben", "Hafenratten": "hafenratten",
  "Orkpiraten": "orkpiraten", "Tiefenkrake": "tiefenkrake", "Sturmrochen": "sturmrochen", "Die Schwarze Krake": "schwarzekrake",
  "Der Kapitän": "kapitaen" };
// Das Kronreich hat Gemini ohne Gegnerliste geliefert. Die Gegner folgen hier aus dem Auftragstext (erste Regel gewinnt).
const gegnerAusText = [
  [/Graufang/, "graufang"], [/uralten Moorschlinger/, "diealte"], [/Kult-Hauptmann/, "kulthauptmann"],
  [/Kultist|Kultzirkel|Kult-Plünderer|Kultzelle|Zelle von/, "kultisten"], [/Glutkäfer/, "glutkaefer"],
  [/Galgenkrähen/, "galgenkraehen"], [/Keiler/, "keiler"], [/Grauw[öo]lf|Wölfe|Rudel/, "grauwoelfe"],
  [/Netzweberin|Riesenspinne/, "netzweberin"], [/Irrglut/, "irrglut"], [/Moorschlinger/, "moorschlinger"],
  [/Flussschnapper/, "flussschnapper"], [/Riffhaie/, "riffhaie"], [/Wrackkrabben/, "wrackkrabben"],
  [/orkischen Vortrupp/, "orkvortrupp"], [/Deserteure|Entlassene Söldner|Entlaufene Soldaten/, "deserteure"],
  [/Schmuggler|Agenten/, "schmuggler"], [/Spion/, "spione"],
  [/Banditen|Wegelagerer|Viehdiebe|Lederdiebe|Diebe/, "wegelagerer"],
];

const gegenstandNachName = { Heilmittel: "harzverband", Heiltrank: "harzverband", Gegenmittel: "gegengift", Gegengift: "gegengift",
  ...Object.fromEntries(relikte.relicItems.map((r) => [r.name, r.id])) };
// Lohnteile, die kein Gegenstand sind, sondern als Vermerk (Wissen, Ruf, spätere Folgen) im Spielstand bleiben.
const vermerkMuster = /Lore|Ruf|Bonus|bonus|Segen|in Akt|Akt \d|Begleiter|Frühwarnung|Flotte|Schutz |Überfallgefahr|kosten? \d Vorrat|Spur|Beweise|Briefe|hält|können|dauerhaft|sicherer|geschützt/;
const slug = (t) => t.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const trophaeen = {};

function lohnAus(text, ressource) {
  const lohn = { silber: 0, vorrat: 0, leisten: {}, gegenstaende: [], vermerke: [] };
  for (let teil of text.split(/[,;]|\s&\s(?!\d)/).map((t) => t.trim()).filter(Boolean)) {
    teil = teil.replace(/\s*\((Wert[^)]*|\d\/\d[^)]*|tragbar|nur Handelsware[^)]*)\)?$/, "").trim();
    // Eine schließende Klammer bleibt nur, wenn sie zu einer öffnenden gehört („Moral-Bonus im Großen Thing (Akt 4)“).
    if (teil.endsWith(")") && (teil.match(/\(/g) ?? []).length < (teil.match(/\)/g) ?? []).length) teil = teil.slice(0, -1).trim();
    let m;
    if ((m = teil.match(/^(\d+) Silber/))) lohn.silber += +m[1];
    else if ((m = teil.match(/^([+-−]\d+) (Korn|Glaube|Gold)( bei Auslieferung)?$/))) lohn.vorrat += +m[1].replace("−", "-");
    else if ((m = teil.match(/^Untoten-Bedrohung ([-−]\d+)/))) lohn.leisten.untote = +m[1].replace("−", "-");
    else if ((m = teil.match(/^Ork-Bedrohung ([-−]\d+)/))) lohn.leisten.orks = +m[1].replace("−", "-");
    else if ((m = teil.match(/(?:Weg|Reisen auf) ([SPMD]\d\d) koste[nt]? 1 Vorrat weniger/))) { lohn.wegRabatt = m[1]; lohn.vermerke.push(teil); }
    else if (vermerkMuster.test(teil)) lohn.vermerke.push(teil);
    else {
      const [, n, name] = teil.match(/^(?:(\d+)x )?(.+)$/);
      const id = gegenstandNachName[name] ?? "beute-" + slug(name);
      if (id.startsWith("beute-")) trophaeen[id] = name;
      for (let i = 0; i < (+n || 1); i++) lohn.gegenstaende.push(id);
    }
  }
  return lohn;
}

const menschenFraktionen = ["kronreich", "orden", "haefen"];
function spielwerte(q, ortId, fraktionId) {
  const gegner = (q.gegner?.length ? q.gegner.map((n) => gegnerNachName[n]).filter(Boolean) : null) ??
    (fraktionId === "kronreich" ? [gegnerAusText.find(([re]) => re.test(q.text))?.[1]].filter(Boolean) : []);
  for (const n of q.gegner ?? []) if (!gegnerNachName[n]) throw new Error(q.id + ": unbekannter Gegner " + n);
  const wege = q.wege ?? [...new Set(q.text.match(/\b[SPMD]\d\d\b/g) ?? [])].filter((k) => wegKennungen[k]);
  // Ein Kampfauftrag auf einem Weg, der am Auftragsort beginnt, wird beim Reisen über diesen Weg ausgelöst.
  // Alle anderen erledigt der Held am Auftragsort.
  // Ein Seeweg in fremdes Land (etwa M39 nach Draugrsund) löst nichts aus: Dort abzufangen hieße, als Held der Stufe 1
  // ins Land der Untoten zu segeln. Solche Aufträge erledigt der Held am Auftragsort (im Hafen, vor dem Auslaufen).
  // Wege ins eigene Land gehen vor Wegen zu den Schwesterfraktionen.
  const anderesEnde = (k) => knoten.get(wegKennungen[k].find((id) => id !== ortId))?.fraktion;
  const amOrt = wege.filter((k) => wegKennungen[k].includes(ortId) && menschenFraktionen.includes(anderesEnde(k)));
  const weg = gegner.length ? (amOrt.find((k) => anderesEnde(k) === fraktionId) ?? amOrt[0]) : undefined;
  const [haupt, oder] = q.lohn.split(/\s*\(oder\s*/);
  return { gegner: gegner[0] ?? null, ...(weg ? { weg } : {}), lohn: [lohnAus(haupt), ...(oder ? [lohnAus(oder.replace(/\)$/, ""))] : [])] };
}

function fraktion(f) {
  const orte = Object.assign({}, ...f.teil2.map((d) => orteAus(lies(d), f.hinweise, f.ersatz ?? {}, f.stufen)));
  for (const id of Object.keys(f.hinweise)) {
    if (!Object.values(orte).some((o) => o.auftraege.some((q) => q.id === id))) throw new Error("Hinweis ohne Auftrag: " + id);
  }
  const fraktionId = f.id;
  for (const [ortId, eintrag] of Object.entries(orte)) for (const q of eintrag.auftraege) q.spiel = spielwerte(q, ortId, fraktionId);
  return { volk: "menschen", reihe: reiheAus(lies(f.teil1), f), quelle: f.quelle, stand: f.stand, ...(f.fehlt ? { fehlt: f.fehlt } : {}), orte };
}

kronreich.id = "kronreich";
orden.id = "orden";
haefen.id = "haefen";
const daten = { kronreich: fraktion(kronreich), orden: fraktion(orden), haefen: fraktion(haefen), wegKennungen, gegnerTypen };
daten.trophaeen = trophaeen;
// Jedes Relikt muss als Lohn seines Quellauftrags vorkommen.
for (const r of relikte.relicItems) {
  const q = ["kronreich", "orden", "haefen"].flatMap((f) => Object.values(daten[f].orte).flatMap((o) => o.auftraege)).find((a) => a.id === r.sourceQuest);
  if (!q?.spiel.lohn.some((l) => l.gegenstaende.includes(r.id))) throw new Error("Relikt ohne Quellauftrag: " + r.id);
}
daten.relikte = { system: relikte.partyRelicSystem, gegenstaende: relikte.relicItems };

// Wegenetz der Menschen (Henry, 18. 11. 2026, quellen/henry/wegenetz-menschen.json): Gefahr und Gegner je Weg.
// Enden, Wegtyp, Zone und Kosten müssen zum Knotennetz passen (spiel/knoten-daten.js, quellen/knoten-erzeugen.py).
const wegenetz = JSON.parse(fs.readFileSync(path.join(root, "quellen/henry/wegenetz-menschen.json"), "utf8"));
const wegGegner = { "Grauwölfe": "jagd-grauwolf", "Galgenkrähen": "jagd-galgenkraehe", "Eishauer": "auftrag-eishauer",
  "Klippenwyrm": "auftrag-klippenwyrm" };
// Dorfnamen gibt es doppelt (Ziegenalm, Nebelstrand): Dörfer erst über ihre Stadt suchen.
const ortId = (name, anderes) => dorfId(name, anderes) ?? knoten.nachName[name] ??
  Object.values(knoten.alle).find((o) => o.name === name && o.verbindungen.some((v) => v.zielId === anderes))?.id;
daten.wegenetz = { regeln: { land: wegenetz.landRules, see: wegenetz.seaRules }, wege: {} };
for (const e of [...wegenetz.landEdges, ...wegenetz.seaEdges]) {
  const von = knoten.nachName[e.from] ?? ortId(e.from, knoten.nachName[e.to]);
  const zu = ortId(e.to, von);
  const enden = wegKennungen[e.id];
  if (!enden || [von, zu].sort().join() !== [...enden].sort().join()) throw new Error("Wegenetz: " + e.id + " passt nicht zu " + enden);
  const kante = knoten.verbindung(von, zu);
  const typ = { S: "strasse", D: "strasse", P: "pass", M: "seeweg" }[e.id[0]];
  const zone = e.zone?.toLowerCase() ?? (e.targetFolk ? (e.targetFolk === "Menschen (Kernland)" ? "kernland" : "grenzland") : "kernland");
  const kosten = e.costType === "Silber" ? kante.kostenGold : kante.kostenRessource;
  if (kante.kantenTyp !== typ || kante.sicherheit !== zone || kosten !== e.cost) {
    throw new Error("Wegenetz: " + e.id + " weicht vom Knotennetz ab (" + [kante.kantenTyp, kante.sicherheit, kosten] + ")");
  }
  for (const g of e.enemies ?? []) if (!wegGegner[g]) throw new Error("Wegenetz: unbekannter Gegner " + g);
  daten.wegenetz.wege[e.id] = { gefahr: e.dangerChance, gegner: (e.enemies ?? []).map((g) => wegGegner[g]),
    ...(e.distance ? { entfernung: e.distance } : {}), ...(e.lengthCategory ? { laenge: e.lengthCategory } : {}),
    ...(e.targetFolk ? { ziel: e.targetFolk } : {}) };
}

const kopf = `"use strict";

// Erzeugt von quellen/nebenquests-erzeugen.cjs aus quellen/gemini/. Nicht von Hand ändern,
// sondern die Quelle oder das Skript anpassen und neu ausführen.
`;
fs.writeFileSync(path.join(root, "spiel/nebenquests-daten.js"), kopf + "const nebenquestDaten = " + JSON.stringify(daten) +
  ";\nif (typeof module !== \"undefined\") module.exports = nebenquestDaten;\n");
for (const id of ["kronreich", "orden", "haefen"]) {
  const orte = Object.values(daten[id].orte);
  console.log(id + ":", orte.length, "Orte,", orte.reduce((n, o) => n + o.auftraege.length, 0), "Aufträge");
}
