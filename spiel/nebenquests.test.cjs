"use strict";

// Nebenquests (Gemini-Ausarbeitung Kronreich, 18. 11. 2026): Orte, Dörfer und Weg-Kennungen müssen zum Knotennetz passen.
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

test("alle 34 Orte des Kronreichs haben einen Aushang, die Städte je zehn Aufträge", () => {
  const orte = Object.values(knoten.alle).filter((ort) => ort.fraktion === "kronreich");
  assert.equal(orte.length, 34);
  for (const ort of orte) {
    const eintrag = nebenquests.fuerOrt(ort.id);
    assert.ok(eintrag?.auftraege.length, "kein Aushang: " + ort.name);
    if (ort.typ !== "dorf") assert.equal(eintrag.auftraege.length, 10, ort.name);
  }
  assert.equal(Object.keys(D.kronreich.orte).length, 34);
});

test("Dörfer hängen an ihrer Stadt, ihr Dorfweg und Ertrag stimmen", () => {
  for (const [id, eintrag] of Object.entries(D.kronreich.orte)) {
    const ort = knoten.get(id);
    assert.ok(ort, "unbekannter Ort: " + id);
    if (ort.typ !== "dorf") continue;
    assert.deepEqual(D.wegKennungen[eintrag.weg], [ort.stadt, id], id + ": Dorfweg " + eintrag.weg);
    assert.equal(eintrag.ertrag, ort.ertrag, id + ": Ertrag");
  }
});

test("Auftragskennungen sind eindeutig, gehören zum Ort und alle genannten Wege sind bekannt", () => {
  const ids = new Set();
  for (const [id, eintrag] of Object.entries(D.kronreich.orte)) {
    for (const auftrag of eintrag.auftraege) {
      assert.ok(!ids.has(auftrag.id), "doppelt: " + auftrag.id);
      ids.add(auftrag.id);
      assert.ok(auftrag.id.startsWith(id + "_q"), auftrag.id + " gehört nicht zu " + id);
      for (const feld of ["titel", "art", "text", "lohn"]) assert.ok(auftrag[feld], auftrag.id + " ohne " + feld);
      for (const kennung of String(auftrag.text + " " + auftrag.lohn).match(/\b[SPMD]\d\d\b/g) ?? []) {
        assert.ok(nebenquests.wegName(kennung), auftrag.id + ": unbekannter Weg " + kennung);
      }
    }
  }
  assert.equal(ids.size, 136);
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
  for (const begleiter of reihe.begleiter) {
    assert.equal(knoten.get(begleiter.ort)?.fraktion, "kronreich", begleiter.name);
    assert.ok(D.kronreich.orte[begleiter.ort].auftraege.some((q) => q.id === begleiter.auftrag), begleiter.auftrag);
  }
  const quelle = fs.readFileSync(path.join(root, "spiel/startpunkte.js"), "utf8");
  const akte = JSON.parse(quelle.match(/akte: (\["Der Thron wankt"[^\]]*\])/)[1]);
  assert.deepEqual(akte, reihe.akte.map((akt) => akt.titel));
});

test("die erzeugte Datei entspricht Quelle und Skript", () => {
  const datei = fs.readFileSync(path.join(root, "spiel/nebenquests-daten.js"), "utf8");
  const quelle = JSON.parse(fs.readFileSync(path.join(root, "quellen/gemini/kronreich-teil2-nebenquests.json"), "utf8"));
  const titel = quelle.cities.flatMap((stadt) => [...stadt.sideQuests, ...stadt.villages.flatMap((dorf) => dorf.quests)]).map((q) => q.title);
  for (const t of titel) assert.ok(datei.includes(JSON.stringify(t).slice(1, -1)), "fehlt: " + t);
});
