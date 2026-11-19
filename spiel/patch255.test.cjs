"use strict";

// Patch 2.5.5 (Henry, 19. 11. 2026): glatter Anführer-Deckel, Magierschutz allein, spürbarer Stufenaufstieg.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ structuredClone });
for (const file of ["bestiarium/daten.js", "spiel/klassen.js", "spiel/faehigkeiten.js", "spiel/kampf.js", "spiel/startpunkte.js", "spiel/welt.js", "spiel/knoten-daten.js", "spiel/knoten.js", "spiel/nebenquests-daten.js", "spiel/nebenquests.js", "spiel/systeme-daten.js", "spiel/systeme.js", "spiel/regeln.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const rules = vm.runInContext("rules", context);
const SY = rules.systeme;
rules.setTravelDice(() => 0);
const reload = (state) => rules.read(JSON.stringify(state));
const aufStufe = (faction, role, stufe, extra = {}) => {
  const s = { ...rules.create("Tala", faction, "frau", 1, role), scene: "weltknoten", knoten: "kronhall", xp: SY.epFuer(stufe), ...extra };
  return { ...s, health: rules.healthLimit(s) };
};

test("Anführer-Deckel: max(6, Heldenstufe), ohne Sprung von Stufe 9 auf 10", () => {
  let vorher = 0;
  for (let stufe = 1; stufe <= 20; stufe++) {
    const schaden = rules.gegnerAufstellung("auftrag-skarn", 0, stufe, stufe)[0].schaden;
    assert.equal(schaden, Math.min(4 + stufe, Math.max(6, stufe)), "Stufe " + stufe);
    assert.ok(schaden >= vorher, "steigt nie ab: Stufe " + stufe);
    vorher = schaden;
  }
  // Der Deckel folgt der Heldenstufe, nicht der Gegnerstufe.
  assert.equal(rules.gegnerAufstellung("auftrag-skarn", 0, 11, 8)[0].schaden, 8);
});

test("Magierschutz: Pyromant und Kleriker der Flamme allein beginnen mit 25 % Glutschild", () => {
  for (const role of ["magier", "heiler"]) {
    const s = aufStufe("orden", role, 5, { knoten: "glutberg" });
    const a = rules.aushang(s).find((x) => x.spiel.gegner && !x.spiel.weg);
    const k = rules.auftragAusfuehren(rules.auftragAnnehmen(s, a.id), a.id);
    assert.ok(k.combat.held.magierSchutz, role);
    assert.ok(k.combat.held.schild <= Math.round(rules.healthLimit(s) * 0.25), role);
    assert.ok(reload(k).combat, role);
  }
  const krone = aufStufe("kronreich", "magier", 5);
  const a = rules.aushang(krone).find((x) => x.spiel.gegner && !x.spiel.weg);
  const k = rules.auftragAusfuehren(rules.auftragAnnehmen(krone, a.id), a.id);
  assert.ok(!k.combat.held.magierSchutz);
  // LP der Klasse bleiben gleich.
  assert.equal(rules.healthLimit(aufStufe("orden", "magier", 5)), rules.healthLimit({ ...aufStufe("orden", "magier", 5), party: [] }));
});

test("Grundwertpunkte: 2 je Stufe von 2 bis 30 (58), +1 je Ahnenrang, Grenze 20 bzw. 25", () => {
  assert.equal(rules.progression(aufStufe("kronreich", "krieger", 1)).points, 0);
  assert.equal(rules.progression(aufStufe("kronreich", "krieger", 5)).points, 8);
  assert.equal(rules.progression(aufStufe("kronreich", "krieger", 30)).points, 58);
  assert.equal(rules.progression({ ...aufStufe("kronreich", "krieger", 30), xp: SY.epFuer(30) + 10000 }).points, 60);
  assert.equal(rules.grundwertGrenze(aufStufe("kronreich", "krieger", 29)), 20);
  assert.equal(rules.grundwertGrenze(aufStufe("kronreich", "krieger", 30)), 25);
  let held = aufStufe("kronreich", "krieger", 30);
  for (let i = 0; i < 30; i++) held = rules.train(held, "strength");
  assert.equal(rules.heroAttributes(held).strength, 25);
  assert.ok(reload(held));
  const vor30 = aufStufe("kronreich", "krieger", 29);
  let begrenzt = vor30;
  for (let i = 0; i < 30; i++) begrenzt = rules.train(begrenzt, "strength");
  assert.equal(rules.heroAttributes(begrenzt).strength, 20);
  // Jeder Punkt wirkt sofort, z. B. Willenskraft auf das Mana des Pyromanten.
  const pyro = aufStufe("orden", "magier", 3);
  assert.ok(rules.kraft(rules.train(rules.train(pyro, "will"), "will")).mana > rules.kraft(pyro).mana);
  // Andere Völker behalten die alte Regel.
  assert.equal(rules.progression({ ...rules.create("Brom", "tiefgraeber", "mann", 0, "krieger"), xp: 1000 }).points, 0);
});

test("Alte Spielstände: bereits trainierte Grundwerte zählen nicht gegen die neuen Punkte", () => {
  const alt = { ...aufStufe("kronreich", "krieger", 3), training: { strength: 2 } };
  delete alt.grundwertAlt;
  const geladen = reload(alt);
  assert.equal(geladen.grundwertAlt, 2);
  assert.equal(rules.progression(geladen).points, 4);
});

test("Fähigkeitsränge: 1 Punkt je Stufe 2–20, Rang 2/3/4 ab Stufe 3/8/15, +12 % je Rang, Rang 4 kostet 1 weniger", () => {
  let held = aufStufe("kronreich", "krieger", 3);
  assert.equal(rules.faehigkeitInfo(held).punkte, 2);
  held = rules.faehigkeitSteigern(held, "f1");
  assert.equal(held.faehigkeitRaenge.f1, 2);
  assert.equal(rules.faehigkeitGrund(held, "f1"), "Rang 3 ab Stufe 8");
  assert.equal(rules.faehigkeitGrund(held, "f6"), "noch nicht freigeschaltet");
  held = rules.faehigkeitSteigern(held, "f3");
  assert.equal(rules.faehigkeitGrund(held, "f1"), "Rang 3 ab Stufe 8");
  assert.equal(rules.faehigkeitInfo({ ...held }).punkte, 0);
  assert.ok(reload(held).faehigkeitRaenge.f3 === 2);

  let meister = aufStufe("kronreich", "krieger", 15);
  const kosten = rules.abilities(meister).find((f) => f.id === "f3").kostenWert;
  for (let i = 0; i < 3; i++) meister = rules.faehigkeitSteigern(meister, "f3");
  assert.equal(meister.faehigkeitRaenge.f3, 4);
  assert.equal(rules.abilities(meister).find((f) => f.id === "f3").kostenWert, Math.max(1, kosten - 1));
  assert.equal(rules.faehigkeitGrund(meister, "f3"), "höchster Rang erreicht");
  assert.equal(rules.faehigkeitInfo(meister).punkte, 14 - 3);
  // Stufe 21–30 gehen die Punkte in Meister-Talente, nicht in Fähigkeiten.
  assert.equal(rules.faehigkeitInfo(aufStufe("kronreich", "krieger", 25)).punkte, 19);
  assert.equal(rules.aufstiegInfo(aufStufe("kronreich", "krieger", 25)).talentPunkte, 5);
  assert.throws(() => reload({ ...held, faehigkeitRaenge: { f1: 5 } }), /beschädigt/);
});

test("Fähigkeitsrang verstärkt den Schaden um 12 % je Rang", () => {
  const start = aufStufe("kronreich", "krieger", 8);
  const a = rules.aushang(start).find((x) => x.spiel.gegner && !x.spiel.weg);
  const kampf = (state) => {
    const k = rules.auftragAusfuehren(rules.auftragAnnehmen(state, a.id), a.id);
    return { ...k, combat: { ...k.combat, feinde: k.combat.feinde.map((f) => ({ ...f, lp: 999, max: 999 })) } };
  };
  const schaden = (state) => 999 - rules.strike(state, "f3", () => 0.5).combat.feinde[0].lp;
  const r1 = schaden(kampf(start));
  const r3 = schaden(kampf(rules.faehigkeitSteigern(rules.faehigkeitSteigern(start, "f3"), "f3")));
  assert.ok(r3 > r1, r1 + " → " + r3);
});

test("Patch 2.5.6: Einsamer Wolf höchstens +3 Schaden je Treffer, Schurken weichen jedem 5. Angriff aus", () => {
  const kampfVon = (role, stufe) => {
    const s = aufStufe("kronreich", role, stufe);
    const a = rules.aushang(s).find((x) => x.spiel.gegner && !x.spiel.weg);
    const k = rules.auftragAusfuehren(rules.auftragAnnehmen(s, a.id), a.id);
    return { ...k, health: 9999, combat: { ...k.combat, feinde: k.combat.feinde.map((f) => ({ ...f, lp: 9999, max: 9999 })) } };
  };
  const treffer = (state) => 9999 - rules.strike(state, "spear", () => 0.5).combat.feinde[0].lp;
  for (const stufe of [5, 30]) {
    const allein = kampfVon("spaeher", stufe);
    const mitGefaehrte = { ...allein, party: ["warrior"], partyVitals: { warrior: { health: 0, status: {} } } };
    const plus = treffer(allein) - treffer(mitGefaehrte);
    assert.ok(plus >= 1 && plus <= 3, "Stufe " + stufe + ": +" + plus);
  }
  const ausweichen = (role) => {
    let s = kampfVon(role, 10);
    let n = 0;
    for (let i = 0; i < 10; i++) {
      s = rules.strike(s, "guard", () => 0.5);
      n += /weichst (einem|\d+) Angriff/.test(s.journal.at(-1)) ? Number(/(\d+) Angriffen/.exec(s.journal.at(-1))?.[1] ?? 1) : 0;
    }
    return n;
  };
  assert.ok(ausweichen("schurke") > ausweichen("spaeher"), ausweichen("schurke") + " gegen " + ausweichen("spaeher"));
});
