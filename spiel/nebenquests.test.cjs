"use strict";

// Nebenquests (Gemini-Ausarbeitung Kronreich und Orden der Flamme, 18. 11. 2026): Orte, Dörfer und Weg-Kennungen müssen zum Knotennetz passen.
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

const FRAKTIONEN = { kronreich: 136, orden: 133 };

test("alle 34 Orte von Kronreich und Orden haben einen Aushang, die Städte je zehn Aufträge", () => {
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
  assert.equal(new Set(klassen).size, klassen.length, "Begleiter brauchen verschiedene Klassen");
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

test("die erzeugte Datei entspricht Quelle und Skript", () => {
  const datei = fs.readFileSync(path.join(root, "spiel/nebenquests-daten.js"), "utf8");
  for (const name of ["kronreich-teil2-nebenquests.json", "orden-teil2a-nebenquests.json", "orden-teil2b-nebenquests.json"]) {
    const quelle = JSON.parse(fs.readFileSync(path.join(root, "quellen/gemini", name), "utf8"));
    const titel = quelle.cities.flatMap((stadt) => [...stadt.sideQuests, ...stadt.villages.flatMap((dorf) => dorf.quests)]).map((q) => q.title);
    for (const t of titel) assert.ok(datei.includes(JSON.stringify(t).slice(1, -1)), name + " fehlt: " + t);
  }
});
