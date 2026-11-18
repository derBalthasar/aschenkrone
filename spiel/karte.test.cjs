"use strict";

// Karte in drei Stufen: Jeder Ort, an dem ein Held stehen kann, muss auf der Weltkarte von Odris liegen.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const root = path.join(__dirname, "..");
const context = vm.createContext({ structuredClone });
for (const file of ["bestiarium/daten.js", "spiel/klassen.js", "spiel/faehigkeiten.js", "spiel/kampf.js", "spiel/startpunkte.js",
  "spiel/welt.js", "spiel/knoten-daten.js", "spiel/knoten.js", "spiel/nebenquests-daten.js", "spiel/nebenquests.js", "spiel/regeln.js", "spiel/karte-daten.js", "spiel/karte.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const [world, karte, klassen, startpunkte] = ["world", "karte", "klassen", "startpunkte"].map(name => vm.runInContext(name, context));
const D = karte.daten;

test("jede Szene außer der Niederlage hat einen Standort auf der Karte", () => {
  for (const [id, scene] of Object.entries(world.scenes)) {
    if (["defeat", "weltende", "weltknoten"].includes(id)) continue;
    assert.ok(karte.lage(scene, world.destinations), "Szene ohne Kartenpunkt: " + id);
  }
  assert.equal(karte.lage(world.scenes.defeat, world.destinations), null);
});

test("Reiseziele liegen im Gebiet ihrer Fraktion und im Kartenbild", () => {
  for (const id of Object.keys(world.destinations)) {
    assert.ok(D.reise[id], "Reiseziel ohne Kartenpunkt: " + id);
    assert.ok(klassen.fraktionen[D.reise[id].f], id);
  }
  assert.equal(karte.lage(world.scenes["watch-yard"], world.destinations).name, "Eiswacht");
  assert.equal(karte.lage(world.scenes["watch-yard"], world.destinations).fraktion, "orden");
  assert.equal(karte.lage(world.scenes.wake, world.destinations).fraktion, "kronreich");
});

test("jede Fraktion hat Gebiet, Heimatort und ein Kartenbild ihres Volks", () => {
  for (const [id, fraktion] of Object.entries(klassen.fraktionen)) {
    const gebiet = D.fraktionen[id];
    assert.ok(gebiet, id);
    assert.equal(gebiet.volk, fraktion.volk, id);
    assert.ok(D.orte[startpunkte.fraktionen[id].ort], "Heimatort fehlt: " + id);
    const start = karte.lage(world.scenes[startpunkte.szene(id)], world.destinations);
    // Die Fäulnisbrut beginnt in Nachtquell, im Land der Erinnernden. Alle anderen Prologe beginnen im eigenen Gebiet.
    assert.equal(start.fraktion, id === "faeulnisbrut" ? "erinnernde" : id, "Prolog beginnt woanders: " + id);
    for (const stufe of karte.stufen) {
      const view = karte.ansicht(stufe, start, id);
      assert.ok(karte.prozent(view.rect, start.punkt), stufe + " zeigt den Standort nicht: " + id);
      const bild = karte.bild(view.rect);
      assert.ok(fs.existsSync(path.join(root, bild.src)), bild.src);
    }
    assert.equal(karte.bild(karte.ansicht("fraktion", start, id).rect).src, "spiel/karte/" + fraktion.volk + ".jpg");
  }
});

test("ohne Standort zeigt die Karte das Gebiet der eigenen Fraktion", () => {
  assert.deepEqual(karte.ansicht("gebiet", null, "hueter").rect, D.fraktionen.hueter.rect);
  assert.deepEqual(karte.ansicht("welt", null, undefined).rect, D.rand);
  assert.deepEqual(karte.ansicht("fraktion", null, "unbekannt").rect, D.rand);
});
