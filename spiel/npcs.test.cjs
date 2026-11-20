"use strict";

// Gesprächsfenster: Jede Zuordnung zeigt auf eine bekannte Person und auf eine Szene oder Wahl, die es gibt.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const root = path.join(__dirname, "..");
const context = vm.createContext({ structuredClone });
for (const file of ["bestiarium/daten.js", "spiel/klassen.js", "spiel/faehigkeiten.js", "spiel/kampf.js", "spiel/startpunkte.js", "spiel/welt.js",
  "spiel/knoten-daten.js", "spiel/knoten.js", "spiel/nebenquests-daten.js", "spiel/nebenquests.js", "spiel/systeme-daten.js", "spiel/systeme.js",
  "spiel/akt-dialoge.js", "spiel/regeln.js", "spiel/npcs.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const npcs = vm.runInContext("npcs", context);
const world = vm.runInContext("world", context);
const klassen = vm.runInContext("klassen", context);

test("Personen haben Namen, bekannte Fraktion und gültigen Ruf-Schlüssel", () => {
  for (const [id, person] of Object.entries(npcs.liste)) {
    assert.ok(person.name, id);
    assert.ok(person.fraktion === null || klassen.fraktionen[person.fraktion], id + ": Fraktion " + person.fraktion);
    assert.ok(!person.ruf || world.factions[person.ruf], id + ": Ruf " + person.ruf);
  }
});

test("Szenen- und Wahlzuordnungen zeigen auf vorhandene Szenen, Wahlen und Personen", () => {
  for (const [szene, npc] of Object.entries(npcs.szenen)) {
    assert.ok(world.scenes[szene], "Szene " + szene);
    assert.ok(npcs.get(npc), "Person " + npc);
  }
  for (const [schluessel, npc] of Object.entries(npcs.wahlen)) {
    const [szene, wahl] = schluessel.split(":");
    assert.ok(world.scenes[szene]?.choices?.some((choice) => choice.id === wahl), "Wahl " + schluessel);
    assert.ok(npcs.get(npc), "Person " + npc);
  }
  for (const fraktion of ["kronreich", "orden", "haefen"]) {
    for (const schritt of [0, 1, 2]) assert.ok(npcs.get(npcs.fuerHauptquest(fraktion, schritt)), fraktion + " " + schritt);
    assert.equal(npcs.fuerHauptquest(fraktion, 1, true), npcs.anfuehrer(fraktion), "Bericht geht an die Anführerin");
  }
  assert.equal(npcs.get(npcs.fuerHauptquest("kronreich", 1)).name, "Marschall Kaelen");
  assert.equal(npcs.get(npcs.fuerHauptquest("orden", 1)).name, "Läuterin Seraphina");
  assert.equal(npcs.get(npcs.fuerHauptquest("haefen", 1)).name, "Kapitänin Mirella");
});

test("Porträt: eigenes Feld vor automatischem Pfad über die npcId", () => {
  // Fragenkatalog 10 B: Nur Dateien aus der Liste werden geladen (keine 404-Anfragen).
  assert.equal(npcs.portrait("runa"), null);
  npcs.bilder.add("runa.png");
  npcs.bilder.add("runa-alt.webp");
  assert.equal(npcs.portrait("runa"), "assets/npcs/runa.png");
  assert.equal(npcs.portrait("runa", { portrait: "assets/npcs/runa-alt.webp" }), "assets/npcs/runa-alt.webp");
  npcs.bilder.clear();
  assert.equal(npcs.portrait(null), null);
  assert.equal(npcs.fuerSzene("supply-post", world.scenes["supply-post"]), "maren");
  assert.equal(npcs.fuerSzene("x", { npc: "ada" }), "ada");
});
