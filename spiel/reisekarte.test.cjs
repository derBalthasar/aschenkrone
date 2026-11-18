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
  const [wx, wy, ww, wh] = reisekarte.welt;
  for (const ort of reisekarte.orte) {
    assert.ok(ort.x >= wx && ort.x <= wx + ww && ort.y >= wy && ort.y <= wy + wh, ort.name);
    assert.deepEqual([ort.x, ort.y], knoten.get(ort.id).punkt, ort.name + " sitzt nicht an seinem Knotenpunkt");
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

test("alle Ortsnamen sind zu sehen: Städte gedruckt, Dörfer ohne Überdeckung gedruckter Namen", () => {
  const gedruckt = new Set(reisekarte.gedruckteNamen.map(([name]) => name));
  for (const ort of reisekarte.orte.filter((entry) => entry.typ !== "dorf")) assert.ok(gedruckt.has(ort.name), ort.name + " fehlt");
  const doerfer = reisekarte.orte.filter((ort) => ort.typ === "dorf");
  assert.equal(doerfer.length, 69);
  for (const ort of doerfer) {
    const [, , anker] = reisekarte.beschriftung[ort.id];
    assert.ok(["start", "end", "middle"].includes(anker), ort.name);
  }
});

test("Weltansicht: alle fünf Völker als Sprungziel, fremde Orte nur über ihre gedruckten Namen", () => {
  assert.deepEqual(Object.keys(reisekarte.regionen).sort(), ["elfen", "menschen", "orks", "untote", "zwerge"]);
  const fremde = reisekarte.gedruckteNamen.filter(([, , , , , , id]) => id && !reisekarte.hat(id));
  assert.ok(fremde.length >= 40, "fremde Orte anklickbar: " + fremde.length);
  for (const [name, , , , , , id] of fremde) assert.equal(knoten.get(id).name, name);
});
