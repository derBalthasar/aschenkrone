"use strict";

// Reisekarte der Menschenlande (Gemini, 18. 11. 2026): Jeder Ort und jeder Weg der Karte gehört zum Knotennetz.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const knoten = require("./knoten.js");
const nebenquests = require("./nebenquests.js");
const reisekarte = require("./reisekarte.js");
const menschen = ["kronreich", "orden", "haefen"];

test("alle 102 Orte der Menschen und 12 Überseehäfen liegen auf der Karte", () => {
  const eigene = Object.values(knoten.alle).filter((ort) => menschen.includes(ort.fraktion));
  assert.equal(eigene.length, 102);
  for (const ort of eigene) assert.ok(reisekarte.hat(ort.id), ort.name + " fehlt");
  const fremde = reisekarte.orte.filter((ort) => ort.uebersee);
  assert.equal(fremde.length, 12);
  for (const ort of fremde) assert.ok(ort.hafen, ort.name + " hat keinen Hafen");
  for (const ort of reisekarte.orte) {
    assert.ok(ort.x >= 0 && ort.x <= reisekarte.breite && ort.y >= 0 && ort.y <= reisekarte.hoehe, ort.name);
  }
});

test("die Karte zeigt genau die 186 Wege des Wegenetzes", () => {
  assert.equal(reisekarte.wege.length, 186);
  const wegenetz = nebenquests.daten.wegenetz.wege;
  for (const weg of reisekarte.wege) {
    assert.ok(wegenetz[weg.kennung], weg.kennung + " fehlt im Wegenetz");
    assert.deepEqual([weg.a, weg.b].sort(), [...nebenquests.daten.wegKennungen[weg.kennung]].sort(), weg.kennung);
    const kante = knoten.verbindung(weg.a, weg.b);
    assert.equal(kante.kantenTyp, { strasse: "strasse", dorfweg: "strasse", pass: "pass", seeweg: "seeweg" }[weg.art], weg.kennung);
  }
  // Von jedem Ort der Menschen sind alle Nachbarn eingezeichnet.
  for (const ort of Object.values(knoten.alle).filter((k) => menschen.includes(k.fraktion))) {
    for (const kante of ort.verbindungen) {
      if (reisekarte.hat(kante.zielId)) assert.ok(reisekarte.wegZwischen(ort.id, kante.zielId), ort.id + " – " + kante.zielId);
    }
  }
  assert.deepEqual(reisekarte.wegeVon("kronhall").map((weg) => weg.kennung).sort(),
    ["D01", "D02", "D03", "P02", "S04", "S06", "S16", "S18", "S19"]);
});

test("die erzeugte Datei entspricht Quelle und Skript", () => {
  const datei = path.join(root, "spiel/reisekarte-daten.js");
  const vorher = fs.readFileSync(datei, "utf8");
  execFileSync(process.execPath, [path.join(root, "quellen/reisekarte-erzeugen.cjs")], { stdio: "pipe" });
  assert.equal(fs.readFileSync(datei, "utf8"), vorher);
});
