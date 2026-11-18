"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const context = vm.createContext({});
for (const file of ["klassen.js", "pixelkampf.js"])
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), context);
const K = vm.runInContext("klassen", context),
  P = vm.runInContext("pixelCombat", context);
test("alle 90 Fraktionsklassen besitzen ein gültiges Volks- und Klassenbild", () => {
  const races = new Set(),
    profiles = new Set();
  let total = 0;
  for (const [faction, f] of Object.entries(K.fraktionen))
    for (const role of K.klassenFolge) {
      const look = P.appearance({ faction, role });
      assert.equal(look.name, f.klassen[role].name);
      assert.equal(look.race, f.volk);
      assert.ok(look.body.height > 0 && look.body.width > 0);
      assert.ok(look.weapon);
      races.add(look.race);
      profiles.add(look.profile);
      if (!f.magie) assert.equal(look.magic, false);
      total++;
    }
  assert.equal(total, 90);
  assert.equal(races.size, 5);
  assert.equal(profiles.size, 9);
});
test("Ausrüstung steuert den Angriff und Stabzauber verursachen keinen Hieb", () => {
  for (const [weapon, effect] of [
    ["wachschwert", "slash"],
    ["faeuste", "punch"],
    ["axt", "slash"],
    ["rostklaue", "dagger"],
    ["speer", "thrust"],
    ["grauflussbogen", "arrow"],
  ]) {
    const look = P.appearance({
      faction: "orden",
      role: "krieger",
      weapon,
      armor: "glutpanzer",
      offhand: "wachschild",
    });
    assert.equal(
      P.effectFor(look, { kind: "hit", actor: "hero" }, "f1"),
      effect,
    );
    assert.equal(look.armor, "glutpanzer");
    assert.equal(look.offhand, "wachschild");
  }
  for (const [faction, school] of [
    ["orden", "fire"],
    ["hueter", "nature"],
    ["hof", "soul"],
    ["runenschmiede", "rune"],
  ]) {
    const look = P.appearance({ faction, role: "magier", weapon: "runenstab" });
    assert.equal(P.effectFor(look, { kind: "hit", actor: "hero" }), school);
  }
});
test("nichtmagische Ersatzklassen und Heilitems erhalten eigene Wirkungen", () => {
  const bard = P.appearance({ faction: "kronreich", role: "magier" }),
    powder = P.appearance({ faction: "haefen", role: "magier" }),
    medic = P.appearance({ faction: "haefen", role: "heiler" });
  assert.equal(P.effectFor(bard, { kind: "hit" }, "f2"), "song");
  assert.equal(P.effectFor(powder, { kind: "hit" }, "f2"), "bomb");
  assert.equal(
    P.effectFor(medic, { kind: "heal", ally: "ranger" }, "f2"),
    "medicine",
  );
  const healer = P.appearance({ faction: "orden", role: "heiler" });
  assert.equal(
    P.effectFor(healer, { kind: "heal", ally: "ranger" }, "f2"),
    "heal",
  );
  assert.equal(
    P.effectFor(healer, { kind: "heal", ally: "ranger" }, "herb", "galgenwurz"),
    "medicine",
  );
  assert.equal(
    P.effectFor(healer, { kind: "revive", ally: "ranger" }, "herb"),
    "revive",
  );
  assert.equal(
    P.effectFor(healer, { kind: "cleanse", ally: "ranger" }, "herb"),
    "cleanse",
  );
  assert.equal(
    P.effectFor(healer, { kind: "retaliate", actor: 2, ally: "ranger" }),
    "claw",
  );
  assert.equal(
    P.effectFor(healer, { kind: "hit", actor: "dot", target: 1 }),
    "status",
  );
});
