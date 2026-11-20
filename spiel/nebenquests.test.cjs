"use strict";

// Nebenquests (Gemini-Ausarbeitung Kronreich, Orden der Flamme und Freie Häfen, 18. 11. 2026): Orte, Dörfer und Weg-Kennungen müssen zum Knotennetz passen.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const knoten = require("./knoten.js");
const nebenquests = require("./nebenquests.js");
const D = nebenquests.daten;

test("jede Weg-Kennung ist eine echte Kante im Knotennetz", () => {
  for (const [kennung, [a, b]] of Object.entries(D.wegKennungen)) {
    const kante = knoten.verbindung(a, b);
    assert.ok(kante, kennung + ": keine Verbindung " + a + " – " + b);
    assert.equal(knoten.verbindung(b, a)?.kantenTyp, kante.kantenTyp, kennung + " ist nicht beidseitig");
    const typ = { S: "strasse", D: "strasse", P: "pass", M: "seeweg" }[kennung[0]];
    assert.equal(kante.kantenTyp, typ, kennung + " hat den falschen Wegtyp");
  }
});

const FRAKTIONEN = { kronreich: 136, orden: 133, haefen: 133 };

test("alle 34 Orte jeder Menschen-Fraktion haben einen Aushang, die Städte je zehn Aufträge", () => {
  for (const fraktion of Object.keys(FRAKTIONEN)) {
    const orte = Object.values(knoten.alle).filter((ort) => ort.fraktion === fraktion);
    assert.equal(orte.length, 34, fraktion);
    for (const ort of orte) {
      const eintrag = nebenquests.fuerOrt(ort.id);
      assert.ok(eintrag?.auftraege.length, "kein Aushang: " + ort.name);
      if (ort.typ !== "dorf") assert.equal(eintrag.auftraege.length, 10, ort.name);
    }
    assert.equal(Object.keys(D[fraktion].orte).length, 34, fraktion);
  }
});

test("Dörfer hängen an ihrer Stadt, ihr Dorfweg und Ertrag stimmen", () => {
  for (const [id, eintrag] of Object.keys(FRAKTIONEN).flatMap((f) => Object.entries(D[f].orte))) {
    const ort = knoten.get(id);
    assert.ok(ort, "unbekannter Ort: " + id);
    if (ort.typ !== "dorf") continue;
    assert.deepEqual(D.wegKennungen[eintrag.weg], [ort.stadt, id], id + ": Dorfweg " + eintrag.weg);
    assert.equal(eintrag.ertrag, ort.ertrag, id + ": Ertrag");
  }
});

test("Auftragskennungen sind eindeutig, gehören zum Ort und alle genannten Wege sind bekannt", () => {
  for (const [fraktion, anzahl] of Object.entries(FRAKTIONEN)) {
    const ids = new Set();
    for (const [id, eintrag] of Object.entries(D[fraktion].orte)) {
      for (const auftrag of eintrag.auftraege) {
        for (const kennung of auftrag.wege ?? []) assert.ok(nebenquests.wegName(kennung), auftrag.id + ": unbekannter Weg " + kennung);
        assert.ok(!ids.has(auftrag.id), "doppelt: " + auftrag.id);
        ids.add(auftrag.id);
        assert.ok(auftrag.id.startsWith(id + "_q"), auftrag.id + " gehört nicht zu " + id);
        for (const feld of ["titel", "art", "text", "lohn"]) assert.ok(auftrag[feld], auftrag.id + " ohne " + feld);
        for (const kennung of String(auftrag.text + " " + auftrag.lohn).match(/\b[SPMD]\d\d\b/g) ?? []) {
          assert.ok(nebenquests.wegName(kennung), auftrag.id + ": unbekannter Weg " + kennung);
        }
      }
    }
    assert.equal(ids.size, anzahl, fraktion);
  }
});

test("Stille Feder bleibt geheim, der Skalde wird in Akt 4 entdeckt, Bestiariumsnamen folgen dem Kanon", () => {
  const alles = JSON.stringify(D);
  assert.ok(!alles.includes("Irrglühte"));
  assert.ok(!/Stille Feder (ist|war)/.test(alles));
  const akt4 = D.kronreich.reihe.akte.find((akt) => akt.nr === "4");
  assert.ok(akt4.schritte[0].text.includes("Bleichen Skalden selbst"));
  assert.ok(akt4.schritte[0].vermerk);
});

test("Fraktionsreihe Kronreich folgt Geminis Aufbau", () => {
  const reihe = nebenquests.reihe("kronreich");
  assert.deepEqual(reihe.akte.map((akt) => akt.nr), ["1", "2/3", "2/3", "4", "5"]);
  assert.deepEqual(reihe.akte.map((akt) => akt.titel), ["Der Thron wankt", "Die abtrünnigen Häfen", "Der Schwur am Glutberg",
    "Das Alte Reich ersteht neu", "Über das Innere Meer"]);
  assert.equal(reihe.prolog.titel, "Feuer über Westvik");
  assert.equal(reihe.spezialisierung.optionen.length, 2);
  assert.equal(nebenquests.zweigStufen("kronreich", 0), "6-10");
  assert.equal(nebenquests.zweigStufen("kronreich", 1), "11-15");
  for (const zweig of reihe.akte.filter((akt) => akt.freieReihenfolge)) assert.match(zweig.stufen, /erster Zweig/);
  const klassen = reihe.begleiter.map((begleiter) => begleiter.klasse);
  // Patch 2.6.19 (Henry, B5): Fenris ist wie Wulfgar Späher; die Regel „keine zwei Späher“ vom 18. 11. ist damit aufgehoben.
  assert.deepEqual(klassen, ["waechter", "spaeher", "spaeher"]);
  const klassenDatei = fs.readFileSync(path.join(root, "spiel/klassen.js"), "utf8");
  for (const klasse of klassen) assert.ok(new RegExp("\\b" + klasse + ": k\\(").test(klassenDatei), klasse);
  const akt5 = reihe.akte.find((akt) => akt.nr === "5");
  assert.match(akt5.schritte[2].text, /frei/);
  assert.equal(reihe.spezialisierung.zusaetzlich, "zusätzlich zur Spezialisierung der Klasse");
  for (const begleiter of reihe.begleiter) {
    assert.equal(knoten.get(begleiter.ort)?.fraktion, "kronreich", begleiter.name);
    assert.ok(D.kronreich.orte[begleiter.ort].auftraege.some((q) => q.id === begleiter.auftrag), begleiter.auftrag);
  }
  const quelle = fs.readFileSync(path.join(root, "spiel/startpunkte.js"), "utf8");
  const akte = JSON.parse(quelle.match(/akte: (\["Der Thron wankt"[^\]]*\])/)[1]);
  assert.deepEqual(akte, reihe.akte.map((akt) => akt.titel));
});

test("Fraktionsreihe Orden folgt Geminis Aufbau, mit Henrys Änderungen", () => {
  const reihe = nebenquests.reihe("orden");
  assert.deepEqual(reihe.akte.map((akt) => akt.nr), ["1", "2/3", "2/3", "4", "5"]);
  assert.equal(reihe.prolog.titel, "Die Nacht der kalten Feuer");
  assert.ok(reihe.prolog.text);
  assert.deepEqual(reihe.akte.filter((akt) => akt.freieReihenfolge).map((akt) => akt.schwester), ["Kronreich", "Freie Häfen"]);
  const akt4 = reihe.akte.find((akt) => akt.nr === "4");
  assert.match(akt4.schritte[0].text, /Erzpriester Thorvald/);
  assert.match(reihe.akte.find((akt) => akt.nr === "5").schritte[2].ort, /frei wählbar/);
  assert.equal(reihe.spezialisierung.zusaetzlich, "zusätzlich zur Spezialisierung der Klasse");
  const klassen = reihe.begleiter.map((begleiter) => begleiter.klasse);
  assert.equal(new Set(klassen).size, klassen.length, "Begleiter brauchen verschiedene Klassen");
  for (const begleiter of reihe.begleiter) {
    assert.equal(knoten.get(begleiter.ort)?.fraktion, "orden", begleiter.name);
    assert.ok(D.orden.orte[begleiter.ort].auftraege.some((q) => q.id === begleiter.auftrag), begleiter.auftrag);
  }
  const quelle = fs.readFileSync(path.join(root, "spiel/startpunkte.js"), "utf8");
  const akte = JSON.parse(quelle.match(/akte: (\["Die flackernde Flamme"[^\]]*\])/)[1]);
  assert.deepEqual(akte, reihe.akte.map((akt) => akt.titel));
  // Henrys Antworten vom 18. 11. 2026 (alle fünf Vorschläge angenommen).
  assert.equal(reihe.akte.at(-1).titel, "Über das Innere Meer");
  assert.deepEqual(reihe.begleiter.map((b) => b.name), ["Bruder Halvar Eisenrun", "Runenpriesterin Gunhild Gluthand", "Späher Malte Sturmauge"]);
  const texte = JSON.stringify([reihe.akte, Object.values(D.orden.orte).flatMap((o) => o.auftraege.map((q) => [q.titel, q.text, q.lohn]))]);
  assert.ok(!texte.includes("Bjarne Eisenrun") && !texte.includes("Solveig Gluthand"));
  const treck = reihe.akte.find((akt) => akt.id === "orden_branch_kronreich").schritte[2];
  assert.match(treck.text, /P02/);
  assert.doesNotMatch(treck.text, /S01|S04/);
  const brandstein = D.orden.orte.brandstein.auftraege.find((q) => q.id === "brandstein_q04");
  assert.deepEqual(brandstein.wege, ["S29", "S45"]);
});

test("Gebietsstufe hängt von der Fraktion des Helden ab", () => {
  assert.equal(nebenquests.stufenFuer("glutberg", "orden"), "1-5");
  assert.equal(nebenquests.stufenFuer("glutberg", "kronreich"), "6-10 oder 11-15");
  assert.equal(nebenquests.stufenFuer("kronhall", "orden"), "6-10 oder 11-15");
  assert.equal(nebenquests.stufenFuer("kronhall", "kronreich"), D.kronreich.orte.kronhall.stufen);
  assert.equal(nebenquests.stufenFuer("glutberg", "dornenklingen"), null);
});

test("Alphatiere des Ordens stammen aus dem Bestiarium und kommen je einmal vor", () => {
  const bestiarium = fs.readFileSync(path.join(root, "bestiarium/daten.js"), "utf8");
  const namen = [];
  for (const eintrag of Object.values(D.orden.orte)) {
    for (const auftrag of eintrag.auftraege.filter((q) => q.art === "Alphatier-Jagd")) {
      const name = auftrag.titel.replace("Alphatier: ", "");
      assert.ok(bestiarium.includes(name.replace("Skarn der", "Skarn, der")), auftrag.id + ": " + name);
      namen.push(name);
    }
  }
  assert.deepEqual(namen.sort(), ["Der Letzte Mammut", "Die Mutter der Tiefen", "Skarn der Weiße Bär"]);
});

// Patch Henry, 18. 11. 2026: Das Alphatier von Zollholm heißt Die Schwarze Krake (Bestiarium und Auftrag).
test("Alphatiere der Häfen stammen aus dem Bestiarium, Mutter Tiefe ist umbenannt", () => {
  const bestiarium = fs.readFileSync(path.join(root, "bestiarium/daten.js"), "utf8");
  const namen = Object.values(D.haefen.orte).flatMap((o) => o.auftraege).filter((q) => q.art === "Alphatier-Jagd").map((q) => q.titel.replace("Alphatier: ", ""));
  for (const name of namen) assert.ok(bestiarium.includes("[\"" + name + "\""), name);
  assert.deepEqual(namen.sort(), ["Der Kapitän", "Die Schwarze Krake"]);
  // Nur der Änderungsvermerk nennt den alten Namen noch.
  const ohneVermerk = JSON.stringify(D, (key, value) => key === "hinweis" ? undefined : value);
  assert.ok(!ohneVermerk.includes("Mutter Tiefe") && !bestiarium.includes("Mutter Tiefe"));
  assert.equal(D.haefen.orte.zollholm.auftraege[9].spiel.gegner, "schwarzekrake");
});

// Patch Henry, 18. 11. 2026: Kriegsrat im Haupthafen, Abfahrt aus dem echten Starthafen der Route.
test("Akt 5 aller Menschen: Kriegsrat mit Zielwahl, Seewege beginnen im Starthafen", () => {
  const kriegsrat = { kronreich: ["perlvik"], orden: ["nordwacht", "glutberg"], haefen: ["perlvik"] };
  for (const [fraktion, orte] of Object.entries(kriegsrat)) {
    const reihe = D[fraktion].reihe;
    assert.deepEqual(reihe.flotte.kriegsrat, orte, fraktion);
    const akt5 = reihe.akte.find((akt) => akt.nr === "5");
    assert.match(akt5.schritte[0].titel, /Kriegsrat/, fraktion);
    assert.deepEqual(reihe.flotte.ziele.map((z) => z.volk), ["elfen", "zwerge", "orks", "untote"]);
    for (const ziel of reihe.flotte.ziele) for (const start of ziel.starthaefen) for (const weg of start.wege) {
      assert.ok(D.wegKennungen[weg].includes(start.hafen), weg + " ab " + start.hafen);
      assert.equal(knoten.verbindung(...D.wegKennungen[weg]).kantenTyp, "seeweg", weg);
    }
  }
  const elfen = D.haefen.reihe.flotte.ziele[0].starthaefen;
  assert.deepEqual(elfen, [{ hafen: "zollholm", wege: ["M53"] }]);
});

test("die erzeugte Datei entspricht Quelle und Skript", () => {
  const datei = fs.readFileSync(path.join(root, "spiel/nebenquests-daten.js"), "utf8");
  // Umbenannt per Patch Henry (18. 11. 2026): zollholm_q10 „Mutter Tiefe“ heißt im Spiel „Die Schwarze Krake“.
  const umbenannt = new Set(["zollholm_q10"]);
  for (const name of ["kronreich-teil2-nebenquests.json", "orden-teil2a-nebenquests.json", "orden-teil2b-nebenquests.json",
    "haefen-teil2a-nebenquests.json", "haefen-teil2b-nebenquests.json"]) {
    const quelle = JSON.parse(fs.readFileSync(path.join(root, "quellen/gemini", name), "utf8"));
    const titel = quelle.cities.flatMap((stadt) => [...stadt.sideQuests, ...stadt.villages.flatMap((dorf) => dorf.quests)])
      .filter((q) => !umbenannt.has(q.id)).map((q) => q.title);
    for (const t of titel) assert.ok(datei.includes(JSON.stringify(t).slice(1, -1)), name + " fehlt: " + t);
  }
});

// Prüfkriterien der Arbeitsanweisung „Volk der Menschen“ (Henry, 18. 11. 2026).
test("je Fraktion 11 Städte mit q01 bis q10, 23 Dörfer mit Dorfweg, drei Begleiter verschiedener Klassen", () => {
  // Patch 2.6.19 (Henry, B5): Fenris ist Meister-Bogenschütze und damit Späher.
  const klassen = { kronreich: ["waechter", "spaeher", "spaeher"], orden: ["waechter", "magier", "spaeher"], haefen: ["spaeher", "schurke", "waechter"] };
  const alleIds = new Set();
  for (const fraktion of Object.keys(klassen)) {
    const orte = Object.entries(D[fraktion].orte);
    const staedte = orte.filter(([id]) => knoten.get(id).typ !== "dorf");
    const doerfer = orte.filter(([id]) => knoten.get(id).typ === "dorf");
    assert.equal(staedte.length, 11, fraktion);
    assert.equal(doerfer.length, 23, fraktion);
    for (const [id, eintrag] of staedte) {
      assert.deepEqual(eintrag.auftraege.map(q => q.id), Array.from({ length: 10 }, (_, i) => id + "_q" + String(i + 1).padStart(2, "0")), id);
    }
    for (const [id, eintrag] of doerfer) {
      assert.match(eintrag.weg, /^D\d\d$/, id);
      assert.ok(D.wegKennungen[eintrag.weg].includes(id), id + ": Dorfweg");
      assert.ok(eintrag.auftraege.length >= 1 && eintrag.auftraege.length <= 2, id);
    }
    for (const [, eintrag] of orte) for (const q of eintrag.auftraege) {
      assert.ok(!alleIds.has(q.id), "doppelte Kennung " + q.id);
      alleIds.add(q.id);
    }
    const begleiter = D[fraktion].reihe.begleiter;
    assert.deepEqual(begleiter.map(b => b.klasse), klassen[fraktion]);
    for (const b of begleiter) {
      assert.match(b.id, new RegExp("^comp_" + (fraktion === "kronreich" ? "kron" : fraktion) + "_"), b.id);
      assert.match(b.auftrag, /_q10$/);
    }
  }
  // Patch Henry, 18. 11. 2026: alle 33 Städte (und ihre Dörfer) mit Stufe 1–5 am Aushang.
  for (const fraktion of Object.keys(klassen)) {
    assert.deepEqual([...new Set(Object.values(D[fraktion].orte).map(o => o.stufen))], ["1-5"], fraktion + ": einheitlich Stufe 1–5");
  }
  assert.equal(alleIds.size, 136 + 133 + 133);
  assert.deepEqual(D.haefen.reihe.begleiter.map(b => b.id), ["comp_haefen_karen", "comp_haefen_soren", "comp_haefen_halvor"]);
  assert.deepEqual(D.haefen.reihe.begleiter.map(b => b.auftrag), ["perlvik_q10", "nebelvik_q10", "salzwacht_q10"]);
});

// Henry, 18. 11. 2026: Runen- und Glutgegenstände sind Gruppen-Relikte und kommen als Lohn ihres Quellauftrags.
test("Gruppen-Relikte stammen aus ihrem Auftrag, Rechte je Fraktion", () => {
  const { system, gegenstaende } = D.relikte;
  assert.equal(system.maxActiveRelics, 1);
  assert.deepEqual(system.factionPermissions, { kronreich: ["rune"], haefen: ["rune"], orden: ["rune", "glut"] });
  const alle = ["kronreich", "orden", "haefen"].flatMap((f) => Object.values(D[f].orte).flatMap((o) => o.auftraege));
  for (const relikt of gegenstaende) {
    const auftrag = alle.find((q) => q.id === relikt.sourceQuest);
    assert.ok(auftrag.spiel.lohn[0].gegenstaende.includes(relikt.id), relikt.id);
    assert.match(auftrag.hinweis, /Gruppen-Relikt/);
    assert.ok(!D.trophaeen["beute-" + relikt.name.toLowerCase()], relikt.name + " ist keine Trophäe mehr");
  }
});

test("Wegenetz der Menschen: 186 Wege mit Gefahr, Gegnern aus dem Spiel und passender Zone", () => {
  const { regeln, wege } = D.wegenetz;
  assert.equal(Object.keys(wege).length, 186);
  assert.match(regeln.see.text ?? JSON.stringify(regeln.see), /Akt 5/);
  for (const [kennung, weg] of Object.entries(wege)) {
    assert.ok(D.wegKennungen[kennung], kennung + " fehlt in den Weg-Kennungen");
    assert.ok(weg.gefahr > 0 && weg.gefahr < 0.8, kennung + " Gefahr");
    for (const gegner of weg.gegner) assert.match(gegner, /^(jagd|auftrag)-/, kennung);
    const [a, b] = D.wegKennungen[kennung];
    const kante = knoten.verbindung(a, b);
    if (kennung.startsWith("M")) assert.equal(kante.kantenTyp, "seeweg", kennung);
    if (/^[SD]/.test(kennung)) assert.equal(kante.sicherheit === "kernland" ? 0.1 : 0.4, weg.gefahr, kennung);
  }
  // P03 Eispass Orden–Kronreich ist Kernland mit Klippenwyrm.
  assert.equal(knoten.verbindung("eiswacht", "brandstein").sicherheit, "kernland");
  assert.deepEqual(wege.P03.gegner, ["jagd-grauwolf", "auftrag-klippenwyrm"]);
  assert.equal(wege.P03.gefahr, 0.25);
});
