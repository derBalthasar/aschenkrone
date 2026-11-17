"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ structuredClone });

for (const file of ["bestiarium/daten.js", "spiel/klassen.js", "spiel/welt.js", "spiel/regeln.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const rules = vm.runInContext("rules", context);
const world = vm.runInContext("world", context);
const plain = (value) => JSON.parse(JSON.stringify(value));
const highRoll = () => 0.99;
const lowRoll = () => 0;
// Burgvögtin des Kronreichs mit festen Werten, damit die Kampf- und Probenwerte nachvollziehbar bleiben.
const heroBuild = { frei: { strength: 2, presence: 2, will: 1 }, wahl: "presence", spez: null, meister: null,
  fertigkeiten: { nahkampf: 3, fernkampf: 2, magie: 0, verteidigung: 4, list: 2, fuehrung: 4, mut: 3 } };
const hero = () => rules.create("Tala", "kronreich", "frau", 2, "waechter", heroBuild);
assert.equal(hero().scene, "wake");
const start = () => rules.choose(rules.choose(hero(), "lantern"), "move");
assert.equal(start().scene, "start");
assert.equal(rules.read(JSON.stringify(start())).scene, "start");
const field = () => rules.choose(start(), "go", highRoll);

const detour = rules.choose(field(), "detour");
const narrowPath = rules.choose(detour, "trace", highRoll);
const clearForest = rules.choose(detour, "lead", highRoll);
const clearField = rules.choose(field(), "fire", highRoll);
assert.equal(detour.scene, "forest");
assert.equal(world.scenes[detour.scene].map, "rotwaelder");
assert.equal(world.scenes.ford.map, "kraehenfurt");
assert.equal(world.scenes.moor.map, "schwarzmoor");
assert.equal(world.scenes.watch.map, "hochwacht");
assert.equal(world.destinations[world.scenes["skarn-gate"].map].name, "Glutberg");
assert.equal(rules.ending(rules.choose(narrowPath, "scare", highRoll)).delivery, false);
assert.equal(rules.ending(rules.choose(clearForest, "scare", highRoll)).delivery, true);
assert.equal(rules.ending(rules.choose(clearField, "signal")).delivery, false);

const inCombat = rules.choose(field(), "fight");
const oldSave = JSON.parse(JSON.stringify(inCombat));
delete oldSave.combat.bleeding;
const resumed = rules.read(JSON.stringify(oldSave));
assert.equal(resumed.combat.id, "keiler");
assert.equal(rules.strike(resumed, "guard", lowRoll).combat.bleeding, 0);

let crows = rules.choose(clearForest, "cross", lowRoll);
crows = rules.strike(crows, "guard", lowRoll);
const blocked = rules.strike(crows, "guard", lowRoll);
const bleeding = rules.strike(crows, "flee", lowRoll);
assert.equal(blocked.combat.bleeding, 0);
assert.equal(bleeding.combat.bleeding, 2);

const loaded = rules.read(JSON.stringify(bleeding));
const next = rules.strike(loaded, "guard", lowRoll);
assert.equal(next.combat.bleeding, 1);
assert.equal(next.health, loaded.health - 1);
assert.throws(() => rules.read(JSON.stringify({ ...loaded, combat: { ...loaded.combat, bleeding: 3 } })));

const supplied = rules.choose(clearForest, "scare", highRoll);
const delayed = rules.choose(narrowPath, "scare", highRoll);
const ids = (state) => Array.from(rules.choices(state), (choice) => choice.id);
const reload = (state) => rules.read(JSON.stringify(state));
assert.deepEqual(ids(reload(supplied)), ["guide", "rest"]);
assert.deepEqual(ids(reload(delayed)), ["messengers", "urgent"]);
assert.equal(rules.choose(delayed, "guide"), delayed);
assert.equal(rules.choose(supplied, "messengers"), supplied);

const wounded = { ...supplied, health: 5, ember: 0 };
const guided = rules.choose(reload(wounded), "guide");
const rested = rules.choose(wounded, "rest");
assert.equal(guided.health, 15);
assert.equal(rested.health, rules.healthLimit(rested));
assert.equal(rested.ember, rules.emberLimit(rested));
assert.ok(ids(guided).includes("bank"));
assert.ok(!ids(rested).includes("bank"));
const marked = rules.choose(reload(guided), "bank");
assert.deepEqual(ids(marked), ["daylight", "close"]);
const opened = rules.choose(marked, "daylight");
assert.deepEqual(ids(reload(opened)), ["bridge", "ridge"]);
const early = rules.choose(opened, "bridge");
const late = rules.choose(opened, "ridge");
assert.ok(rules.choose(early, "testimony", () => 0.3).marks.includes("hochwacht-archiv"));
assert.ok(!rules.choose(late, "testimony", () => 0.3).marks.includes("hochwacht-archiv"));

const sent = rules.choose(delayed, "messengers");
const abandoned = rules.choose(rules.choose(sent, "return"), "close");
assert.equal(rules.moorConsequences(abandoned).messengers, true);
assert.deepEqual(ids(abandoned), ["ridge"]);
assert.equal(rules.choose(abandoned, "bridge"), abandoned);

const failedWater = rules.choose(rested, "water", lowRoll);
assert.equal(reload(failedWater).combat.id, "irrglut");
assert.ok(!failedWater.marks.includes("bohlen-markiert"));
const firstGuard = rules.strike(failedWater, "guard");
const guarded = rules.strike(firstGuard, "guard");
const exposed = rules.strike(firstGuard, "flee", lowRoll);
assert.equal(guarded.ember, firstGuard.ember);
assert.equal(exposed.ember, firstGuard.ember - 1);
const retreated = rules.strike(firstGuard, "flee", highRoll);
assert.equal(retreated.scene, "moor-report");
assert.deepEqual(ids(retreated), ["close"]);

let light = rules.choose(rested, "fight");
light = rules.strike(rules.strike(light, "spear", highRoll), "spear", highRoll);
assert.equal(light.scene, "moor-report");
assert.ok(light.inventory.includes("glutfunke"));
assert.deepEqual(ids(light), ["hand-over", "keep", "close"]);
const deliveredProof = rules.choose(light, "hand-over");
assert.ok(!deliveredProof.inventory.includes("glutfunke"));
const watchWithReport = rules.choose(reload(deliveredProof), "ridge");
assert.deepEqual(ids(watchWithReport), ["archive", "testimony", "wait"]);
assert.ok(rules.choose(watchWithReport, "archive").marks.includes("hochwacht-archiv"));
const keptProof = rules.choose(light, "keep");
const watchWithProof = rules.choose(reload(keptProof), "ridge");
assert.deepEqual(ids(watchWithProof), ["show", "testimony", "wait"]);
const shown = rules.choose(watchWithProof, "show");
assert.ok(shown.marks.includes("hochwacht-archiv"));
assert.ok(!shown.inventory.includes("glutfunke"));
assert.ok(rules.choose(watchWithProof, "wait").inventory.includes("glutfunke"));

const ancestry = [
  ["kronreich", "wake-road", "ditch"],
  ["dornenklingen", "wake-wood", "waldspur"],
  ["runenschmiede", "wake-stone", "steinrhythmus"],
  ["aschenclan", "wake-cart", "fuhrleute-vertrauen"],
  ["erinnernde", "wake-shade", "faehrwort"],
];
for (const [faction, scene, mark] of ancestry) {
  const character = rules.create("Tala", faction, "frau", 2, "heiler");
  const opening = rules.choose(character, "lantern");
  assert.equal(opening.scene, scene);
  assert.deepEqual(ids(character), ["lantern"]);
  assert.ok(rules.choose(reload(opening), "prepare").marks.includes(mark));
  assert.ok(!rules.choose(opening, "move").marks.includes(mark));
}

// Spielstand aus Version 1: noch ohne Klasse, Gleichgewicht und Attributpunkte.
const oldCharacter = { version: 1, name: "Tala", origin: "valmarcher", appearance: "frau", variant: 2, scene: "start",
  allocation: null, health: 28, ember: 4, inventory: [], equipment: { weapon: null, armor: null }, xp: 0, silver: 5,
  training: {}, rewards: [], party: [], relationships: {}, factionRuf: {}, marks: [], journal: [], combat: null };
const migrated = reload(oldCharacter);
assert.equal(migrated.version, 2);
assert.equal(migrated.role, "waechter");
assert.equal(migrated.faction, "kronreich");
assert.equal(migrated.balance, 0);
assert.equal(migrated.scene, "start");
assert.equal(migrated.umschulung, true);
assert.equal(migrated.allocation, undefined);
assert.deepEqual(Object.keys(migrated.equipment).sort(), ["armor", "head", "legs", "neck", "offhand", "ring1", "ring2", "weapon"]);
assert.deepEqual(Array.from(migrated.storage), []);
assert.equal(rules.weapon(migrated), "speer");
assert.equal(migrated.health, rules.healthLimit(migrated));
assert.equal(rules.buildProblem(migrated.faction, migrated.role, migrated.build), null);
assert.throws(() => reload({ ...oldCharacter, role: "unknown" }));
assert.throws(() => reload({ ...oldCharacter, balance: 4 }));
assert.throws(() => reload({ ...oldCharacter, version: 7 }));
// Version 1 mit Klasse, Attributpunkten, Gefährten und laufendem Kampf.
const oldRanger = { ...oldCharacter, origin: "waldelf", role: "ranger", balance: 1, allocation: { agility: 4, will: 2 },
  training: { agility: 1 }, xp: 80, health: 14, ember: 6, party: ["knight"], inventory: ["bogen", "lederwams"],
  equipment: { weapon: "bogen", armor: "lederwams" }, scene: "field", combat: { id: "keiler", health: 20, round: 1, stunned: false },
  relationships: { knight: { score: 30, oath: "promised", talks: 0, gift: false, left: false, bond: "none" } } };
const migratedRanger = reload(oldRanger);
assert.equal(migratedRanger.faction, "hueter");
assert.equal(migratedRanger.role, "spaeher");
assert.deepEqual(plain(migratedRanger.build.frei), { agility: 3, will: 2 });
assert.equal(migratedRanger.training.agility, 1);
assert.equal(migratedRanger.combat.health, 20);
assert.deepEqual(Array.from(migratedRanger.party), ["knight"]);
assert.equal(rules.weapon(migratedRanger), "bogen");
assert.ok(migratedRanger.health > 0 && migratedRanger.health < rules.healthLimit(migratedRanger));
assert.ok(migratedRanger.ember <= rules.emberLimit(migratedRanger));
assert.equal(rules.strike(migratedRanger, "guard").combat.round, 2);
assert.equal(reload(migratedRanger).version, 2);

const seeded = rules.choose(start(), "soil");
const savedSoil = rules.choose(seeded, "balance");
const scorched = rules.choose(seeded, "force");
assert.equal(savedSoil.ember, seeded.ember - 1);
assert.equal(savedSoil.balance, 0);
assert.ok(savedSoil.marks.includes("saat-erholt"));
assert.ok(scorched.marks.includes("saat-verbrannt"));
assert.equal(scorched.health, seeded.health - 6);
assert.equal(scorched.balance, 3);
assert.deepEqual(ids({ ...seeded, ember: 0 }), ["leave"]);
const getToArrival = (state) => rules.choose(rules.choose(state, "fire", highRoll), "scare", highRoll);
assert.ok(ids(getToArrival(savedSoil)).includes("seed"));
assert.ok(!ids(getToArrival(scorched)).includes("guide"));
assert.ok(ids(getToArrival(scorched)).includes("rest"));
assert.ok(rules.choose(getToArrival(savedSoil), "seed").inventory.includes("galgenwurz"));
assert.equal(rules.choose(getToArrival(scorched), "rest").balance, 0);

const fightAs = (character) =>
  rules.choose(rules.choose(rules.choose(rules.choose(character, "lantern"), "move"), "go", highRoll), "fight");
const mageCombat = fightAs(rules.create("Tala", "orden", "frau", 2, "magier"));
const firstFlame = rules.strike(mageCombat, "ember");
assert.equal(firstFlame.balance, 2);
// Flammenstoß: 11 + Magie (Intelligenz verändert den Schaden nicht).
assert.equal(firstFlame.combat.health, mageCombat.combat.health - 11 - mageCombat.build.fertigkeiten.magie);
const backlash = rules.strike(firstFlame, "ember");
assert.equal(backlash.balance, 3);
assert.equal(backlash.combat.health, firstFlame.combat.health);
const roots = rules.strike(firstFlame, "restore");
assert.equal(roots.balance, 0);
assert.equal(roots.combat.health, firstFlame.combat.health - 4);
const settled = rules.strike(firstFlame, "guard");
assert.equal(settled.balance, 1);
const ward = rules.strike(inCombat, "restore");
assert.equal(ward.health, inCombat.health);
const healerCombat = fightAs(rules.create("Tala", "orden", "frau", 2, "heiler"));
const healed = rules.strike({ ...healerCombat, health: 10, balance: 2 }, "restore");
assert.equal(healed.balance, 0);
assert.ok(healed.health > 10);
const tooMuchHealing = rules.strike({ ...healerCombat, balance: -2 }, "restore");
assert.equal(tooMuchHealing.balance, -3);
assert.match(tooMuchHealing.journal.at(-2), /außer Kontrolle/);
assert.equal(reload(tooMuchHealing).role, "heiler");

const elf = rules.create("Tala", "dornenklingen", "frau", 2, "spaeher");
const elfStart = rules.choose(rules.choose(elf, "lantern"), "prepare");
const elfDetour = rules.choose(rules.choose(elfStart, "go"), "detour");
assert.equal(rules.choose(elfDetour, "trace", () => .2).scene, "ford");
const vampire = rules.create("Tala", "erinnernde", "frau", 2, "schurke");
const vampireStart = rules.choose(rules.choose(vampire, "lantern"), "prepare");
const vampireFord = rules.choose(rules.choose(vampireStart, "go"), "fire", highRoll);
assert.ok(ids(vampireFord).includes("password"));
assert.equal(rules.ending(rules.choose(vampireFord, "password")).delivery, true);

const watchEnd = reload(rules.choose(watchWithProof, "wait"));
assert.equal(watchEnd.scene, "watch-end");
const yard = rules.choose(watchEnd, "watch-yard");
assert.equal(yard.scene, "watch-yard");
assert.deepEqual(Array.from(rules.choices(yard).filter(c => c.destination), c => c.destination),
  ["kraehenfurt", "toll", "mine", "ridge", "ravine"]);
const revisitFord = rules.choose(yard, "return-ford");
const revisitForest = rules.choose(revisitFord, "return-forest");
const revisitField = rules.choose(revisitForest, "return-field");
assert.equal(revisitField.scene, "return-field");
assert.deepEqual(Array.from(revisitField.inventory), Array.from(yard.inventory));
assert.deepEqual(Array.from(revisitField.marks), Array.from(yard.marks));
assert.equal(rules.choose(reload(revisitFord), "return-yard").scene, "watch-yard");
const reopenedYard = { ...yard, marks: [...yard.marks, "moorpassage-offen"] };
assert.ok(ids(reopenedYard).includes("return-moor"));
assert.ok(ids(rules.choose(reopenedYard, "return-moor")).includes("return-yard"));
const restedYard = rules.choose({ ...yard, health: 1, ember: 0, balance: 3 }, "camp");
assert.equal(restedYard.health, rules.healthLimit(yard));
assert.equal(restedYard.ember, rules.emberLimit(yard));
assert.equal(restedYard.balance, 0);

const mine = rules.choose(restedYard, "mine");
const bugs = rules.choose(mine, "mine-fight");
assert.deepEqual(ids(bugs), []);
assert.equal(reload(bugs).combat.id, "glutkaefer");
assert.equal(rules.strike(bugs, "flee", highRoll).scene, "watch-yard");
assert.ok(!rules.strike(bugs, "flee", highRoll).marks.includes("pass-mine"));
const cleared = rules.strike(bugs, "ember");
assert.equal(cleared.scene, "mine-cleared");
assert.equal(cleared.health, bugs.health - 3);
assert.ok(cleared.inventory.includes("glutpanzer"));
assert.ok(cleared.marks.includes("pass-mine"));
const revisited = rules.choose(rules.choose(cleared, "mine-back"), "mine-revisit");
assert.equal(revisited.scene, "mine-cleared");
assert.equal(rules.choose(revisited, "mine-fight"), revisited);
const pass = rules.choose(revisited, "mine-pass");
assert.ok(!ids(pass).includes("pass-seal"));
const shelter = rules.choose(pass, "look-shelter");
const rescued = rules.choose(shelter, "rescue-ember");
assert.ok(rescued.marks.includes("joren-gerettet"));
const sealed = rules.choose(rescued, "pass-seal");
const sealedYard = rules.choose(reload(sealed), "watch-yard");
assert.ok(!ids(sealedYard).includes("pass"));
assert.ok(ids(sealedYard).includes("ravine"));
assert.ok(!ids(rules.choose(sealedYard, "mine-revisit")).includes("mine-pass"));
const posted = rules.choose(rules.choose(rescued, "pass-post"), "watch-yard");
const suppliedWatch = rules.choose(posted, "guard-supply");
assert.equal(suppliedWatch.inventory.filter(item => item === "galgenwurz").length,
  posted.inventory.filter(item => item === "galgenwurz").length + 1);
assert.ok(!ids(suppliedWatch).includes("guard-supply"));

const ridge = rules.choose(restedYard, "ridge-trail");
const prepared = rules.choose(ridge, "ridge-net");
assert.ok(!ids(prepared).includes("ridge-net"));
const greif = rules.choose(prepared, "ridge-fight");
assert.equal(rules.strike(greif, "ember").health, greif.health);
assert.equal(rules.choose(ridge, "ridge-climb", lowRoll).combat.id, "felsgreif");
assert.equal(rules.choose(ridge, "ridge-climb", highRoll).scene, "ridge-cleared");
const troll = rules.choose(rules.choose(restedYard, "ravine"), "ravine-fight");
assert.equal(reload(troll).combat.health, 70);
// Speer 5 + Nahkampf 3 + Wurf 3 − Trollhaut: 4 Schaden. Fackel 6 + Nahkampf 3.
assert.equal(rules.strike(troll, "spear", highRoll).combat.health, 66);
assert.equal(rules.strike(troll, "torch").combat.health, 61);

const planning = rules.choose(rules.choose(restedYard, "sister"), "warden");
const clue = rules.choose(rules.choose(planning, "mine"), "inspect-mine");
assert.ok(clue.marks.includes("joren-spur"));
const readyRidge = rules.choose(rules.choose(clue, "mine-back"), "ridge-trail");
const signal = rules.choose(rules.choose(readyRidge, "ridge-climb", highRoll), "send-signal");
const ropePass = rules.choose(signal, "ridge-pass");
const ropeShelter = rules.choose(reload(ropePass), "shelter");
assert.ok(ids(ropeShelter).includes("rescue-rope"));
const ropeRescue = rules.choose(ropeShelter, "rescue-rope");
assert.ok(ropeRescue.marks.includes("joren-gerettet"));
assert.equal(ropeRescue.ember, ropeShelter.ember);
const failedRescue = rules.choose({ ...ropeShelter, balance: -2 }, "rescue-ember");
assert.equal(failedRescue.scene, "pass-shelter");
assert.ok(!failedRescue.marks.includes("joren-gerettet"));
assert.equal(rules.choose(failedRescue, "rescue-balance").balance, 0);
const abandonedRescue = rules.choose(ropeShelter, "rescue-leave");
assert.ok(abandonedRescue.marks.includes("joren-verloren"));
assert.ok(ids(abandonedRescue).includes("pass-seal"));
assert.ok(!ids(abandonedRescue).includes("shelter"));

// ---- Klassensystem ----
const K = vm.runInContext("klassen", context);
const sum = (record) => Object.values(record).reduce((total, value) => total + value, 0);
assert.equal(Object.keys(K.fraktionen).length, 15);
assert.equal(K.klassenFolge.length, 6);
for (const [id, volk] of Object.entries(K.voelker)) {
  assert.equal(sum(volk.bonus) + (volk.wahl ?? 0), 2, id);
  assert.equal(Object.values(K.fraktionen).filter(faction => faction.volk === id).length, 3, id);
}
for (const [id, klasse] of Object.entries(K.grundklassen)) assert.equal(sum(klasse.bonus), 2, id);
for (const [faction, data] of Object.entries(K.fraktionen)) {
  assert.equal(sum(data.bonus), 1, faction);
  for (const role of K.klassenFolge) {
    const entry = data.klassen[role];
    assert.ok(entry.name && entry.spielweise && entry.ressource && entry.a.length === 2 && entry.b.length === 2, faction + " " + role);
    const fresh = rules.create("Tala", faction, "frau", 1, role);
    assert.equal(fresh.equipment.weapon, world.classes[rules.profile(faction, role)].weapon);
    const values = rules.heroAttributes(fresh);
    assert.equal(sum(values), 60, faction + " " + role);
    assert.ok(Math.max(...Object.values(values)) <= 20);
    assert.equal(sum(fresh.build.fertigkeiten), 18);
    if (!data.magie) assert.equal(fresh.build.fertigkeiten.magie, 0);
    assert.equal(rules.buildProblem(faction, role, fresh.build), null);
    assert.deepEqual(plain(reload(fresh).build), plain(fresh.build));
  }
}
assert.equal(rules.profile("kronreich", "magier"), "skalde");
assert.equal(rules.profile("haefen", "magier"), "pulvermeister");
assert.equal(rules.profile("haefen", "heiler"), "feldscher");
assert.equal(rules.profile("orden", "magier"), "magier");
assert.deepEqual([7, 8, 11, 12, 15, 16, 20].map(rules.cap), [2, 3, 3, 4, 4, 5, 5]);
assert.deepEqual([8, 9, 15, 16, 19, 20].map(rules.modifier), [-1, 0, 0, 1, 1, 2]);

// Beispiel aus der Vorgabe: Sylva, Elfin der Dornenklingen, Späherin.
const sylvaBuild = { frei: { strength: 1, agility: 2, mind: 1, will: 1 }, wahl: null, spez: null, meister: null,
  fertigkeiten: { ...K.beispiel.fertigkeiten } };
const sylva = rules.create("Sylva", "dornenklingen", "frau", 1, "spaeher", sylvaBuild);
assert.deepEqual(plain(rules.heroAttributes(sylva)), { strength: 10, agility: 17, mind: 13, will: 11, presence: 9 });
assert.deepEqual(plain(rules.heroLimits(sylva)), { nahkampf: 3, fernkampf: 5, magie: 4, verteidigung: 3, list: 5, fuehrung: 3, mut: 3 });
assert.equal(rules.title(sylva), "Hirschreiter");
assert.equal(sylva.origin, "waldelf");
assert.equal(rules.skillValue(sylva, "fernkampf"), 5);
const withSkills = (changes) => ({ ...sylvaBuild, fertigkeiten: { ...sylvaBuild.fertigkeiten, ...changes } });
assert.throws(() => rules.create("Sylva", "dornenklingen", "frau", 1, "spaeher", { ...sylvaBuild, frei: { agility: 6 } }), /5 freie Punkte/);
assert.throws(() => rules.create("Sylva", "dornenklingen", "frau", 1, "spaeher", withSkills({ nahkampf: 4, magie: 0 })), /höchstens 3/);
assert.throws(() => rules.create("Sylva", "dornenklingen", "frau", 1, "spaeher", withSkills({ list: 2, mut: 4 })), /höchstens 3|mindestens 3/);
assert.throws(() => rules.create("Sylva", "dornenklingen", "frau", 1, "spaeher", withSkills({ list: 2, magie: 2 })), /List braucht mindestens 3/);
assert.throws(() => rules.create("Sylva", "dornenklingen", "frau", 1, "spaeher", withSkills({ magie: 0 })), /18 Fertigkeitspunkte/);
assert.throws(() => rules.create("Tala", "kronreich", "frau", 2, "waechter", { ...heroBuild, wahl: null }), /Menschen/);
assert.throws(() => rules.create("Tala", "kronreich", "frau", 2, "waechter",
  { ...heroBuild, fertigkeiten: { ...heroBuild.fertigkeiten, magie: 1, mut: 2 } }), /keine Magie/);
assert.equal(rules.baseAttributes("aschenclan", "krieger").strength, 16);
assert.throws(() => rules.create("Tala", "aschenclan", "frau", 2, "krieger",
  { ...rules.defaultBuild("aschenclan", "krieger"), frei: { strength: 5 } }), /über 20/);
assert.throws(() => rules.create("Tala", "untot", "frau", 1, "krieger"));
assert.throws(() => rules.create("Tala", "hof", "frau", 2, "krieger"), /Porträt/);

// Spezialisierung ab Quest-Stufe 3 und Meisterklasse nach der Vereinigung.
assert.equal(rules.specialize(sylva, "a", "agility", "fernkampf"), sylva);
const stormRider = rules.specialize({ ...sylva, questStufe: 3 }, "a", "agility", "fernkampf");
assert.equal(rules.title(stormRider), "Sturmreiter");
assert.equal(rules.heroAttributes(stormRider).agility, 18);
assert.equal(stormRider.build.fertigkeiten.fernkampf, 5);
assert.equal(sum(stormRider.build.fertigkeiten), 19);
assert.equal(reload(stormRider).build.spez.variante, "a");
assert.equal(rules.specialize(stormRider, "b", "agility", "list"), stormRider);
assert.equal(rules.specialize({ ...sylva, questStufe: 3 }, "a", "agility", "nahkampf").build.spez, null);
assert.equal(rules.ascend(stormRider, { mind: 2 }, "magie"), stormRider);
const singer = rules.ascend({ ...stormRider, vereinigt: true }, { mind: 2 }, "magie");
assert.equal(rules.title(singer), "Immergrüne Sängerin");
assert.equal(rules.heroAttributes(singer).mind, 15);
assert.equal(sum(singer.build.fertigkeiten), 20);
assert.equal(reload(singer).build.meister.grundwerte.mind, 2);
assert.throws(() => reload({ ...singer, build: { ...singer.build, spez: null } }));
assert.throws(() => reload({ ...sylva, build: { ...sylva.build, fertigkeiten: { ...sylva.build.fertigkeiten, fernkampf: 5 } } }));

// Grundwerte wirken direkt: Willenskraft ab 16 hält die Irrglut fern.
const steady = { ...failedWater, build: { ...heroBuild, wahl: "will", frei: { strength: 2, will: 3 } } };
assert.equal(rules.modifier(rules.heroAttributes(steady).will), 1);
const steadyGuard = rules.strike(steady, "guard");
assert.equal(rules.strike(steadyGuard, "flee", lowRoll).ember, steadyGuard.ember);
// Orks: Nach einem Sieg trägt der Kampfrausch den ersten Angriff der nächsten Schlacht.
const orc = fightAs(rules.create("Tala", "aschenclan", "frau", 2, "krieger"));
const orcWin = rules.strike({ ...orc, combat: { ...orc.combat, health: 1 } }, "spear", lowRoll);
assert.equal(orcWin.rausch, true);
assert.equal(reload(orcWin).rausch, true);
const raging = rules.strike({ ...orc, rausch: true }, "spear", lowRoll);
assert.equal(raging.combat.health, rules.strike(orc, "spear", lowRoll).combat.health - 2);
assert.equal(raging.rausch, false);
assert.equal(rules.strike({ ...orcWin, rausch: false }, "guard").rausch ?? false, false);

// Einmalige Umschulung alter Helden in das neue Klassensystem.
assert.equal(rules.retrain(yard, "kronreich", "spaeher", rules.defaultBuild("kronreich", "spaeher")), yard);
const legacyYard = { ...yard, umschulung: true };
assert.throws(() => rules.retrain(legacyYard, "dornenklingen", "spaeher", rules.defaultBuild("dornenklingen", "spaeher")), /Herkunft/);
assert.throws(() => rules.retrain(legacyYard, "haefen", "spaeher", { ...rules.defaultBuild("haefen", "spaeher"), frei: {} }));
const updated = rules.retrain(legacyYard, "haefen", "spaeher", rules.defaultBuild("haefen", "spaeher"));
assert.equal(updated.scene, yard.scene);
assert.equal(updated.role, "spaeher");
assert.equal(updated.faction, "haefen");
assert.equal(updated.umschulung, false);
assert.equal(rules.title(updated), "Seeschütze");
assert.ok(yard.inventory.every(item => updated.inventory.includes(item)));
assert.equal(rules.weapon(updated), "bogen");
assert.equal(reload(updated).faction, "haefen");
const unarmed = rules.equip(updated, "bogen");
assert.equal(rules.weapon(unarmed), "faeuste");
const lootArmor = { ...updated, inventory: [...updated.inventory, "glutpanzer", "glutfunke"] };
const armored = rules.equip(lootArmor, "glutpanzer");
assert.equal(reload(armored).equipment.armor, "glutpanzer");
const woundedNew = { ...armored, health: 8, ember: 0 };
assert.equal(rules.use(woundedNew, "galgenwurz").health, 18);
assert.equal(rules.use(woundedNew, "glutfunke").ember, 2);
assert.equal(rules.use(woundedNew, "glutfunke").inventory.filter(id => id === "glutfunke").length,
  woundedNew.inventory.filter(id => id === "glutfunke").length - 1);
assert.throws(() => reload({ ...armored, equipment: { weapon: "schwert", armor: "glutpanzer" } }));
const trial = state => rules.choose(rules.choose(state, "ridge-trail"), "ridge-fight");
const bowFight = trial(updated);
const fistFight = trial(unarmed);
assert.ok(rules.strike(bowFight, "spear", highRoll).combat.health <
  rules.strike(fistFight, "spear", highRoll).combat.health);
assert.ok(rules.strike(trial(armored), "spear", highRoll).health > rules.strike(bowFight, "spear", highRoll).health);
const route = rules.route(yard, "weidenkamm");
assert.deepEqual(Array.from(route.stops), ["hochwacht", "kraehenfurt", "weidenkamm"]);
assert.equal(rules.choose(yard, route.first).scene, "return-ford");
assert.equal(rules.route(bugs, "hochwacht"), null);
assert.equal(rules.route(sealedYard, "pass"), null);

const toll = rules.choose(yard, "toll");
assert.equal(rules.route(yard, "toll").first, "toll");
const bargained = rules.choose(toll, "toll-talk", highRoll);
assert.equal(bargained.scene, "toll-resolved");
assert.equal(bargained.xp, toll.xp + 30);
assert.equal(bargained.combat, null);
assert.equal(rules.choose(toll, "toll-help", highRoll).xp, toll.xp + 20);
let deserters = rules.choose(toll, "toll-talk", lowRoll);
assert.equal(deserters.combat.id, "deserteure");
deserters = rules.strike(rules.strike(rules.strike(deserters, "ember"), "guard"), "ember");
deserters = rules.strike(deserters, "spear", highRoll);
assert.equal(deserters.scene, "toll-resolved");
assert.ok(deserters.inventory.includes("rostklaue"));
assert.equal(deserters.silver, toll.silver + 14);
const ada = rules.choose(bargained, "toll-reward", lowRoll);
assert.equal(rules.recruit(bargained, "thief"), bargained);
const withTovin = rules.recruit(rules.completeQuest(rules.promise(ada, "thief"), "thief"), "thief");
assert.ok(withTovin.party.includes("thief"));
assert.equal(rules.relationship(withTovin, "thief").oath, "fulfilled");
assert.ok(ada.inventory.includes("harzverband"));
assert.equal(rules.choose(reload(ada), "toll-reward", highRoll).xp, ada.xp);
assert.equal(rules.choose(rules.choose(ada, "toll-back"), "toll-revisit").scene, "toll-resolved");
const rare = rules.choose(cleared, "search-locker", highRoll);
assert.ok(rare.inventory.includes("runenstab"));
assert.equal(rules.choose(reload(rare), "search-locker", lowRoll).inventory.length, rare.inventory.length);
assert.ok(rules.choose(signal, "search-chest", highRoll).inventory.includes("aschenwaechter"));
const rewarded = rules.choose(sealed, "reward-sword");
assert.ok(rewarded.inventory.includes("wachschwert"));
assert.equal(rules.choose(rewarded, "reward-cloak"), rewarded);
const apprentice = { ...yard, xp: 75, training: {} };
assert.equal(rules.progression(apprentice).level, 2);
assert.equal(rules.progression(apprentice).points, 1);
const trained = rules.train(apprentice, "strength");
assert.equal(reload(trained).training.strength, 1);
assert.equal(rules.healthLimit(trained), rules.healthLimit(apprentice) + 1);
assert.equal(rules.heroAttributes(trained).strength, rules.heroAttributes(apprentice).strength + 1);
const strongest = { ...apprentice, training: { strength: 1 }, xp: 410, build: { ...heroBuild, frei: { strength: 5 } } };
assert.equal(rules.heroAttributes(strongest).strength, 18);
const peak = rules.train(rules.train(strongest, "strength"), "strength");
assert.equal(rules.heroAttributes(peak).strength, 20);
assert.equal(rules.progression(peak).points, 1);
assert.equal(rules.train(peak, "strength"), peak);
assert.equal(rules.train(trained, "will"), trained);
assert.equal(rules.train({ ...apprentice, combat: bugs.combat }, "will").training.will, undefined);
const vendor = rules.choose({ ...yard, silver: 25, inventory: [...yard.inventory, "keilerhauer"] }, "supply-post");
const purchased = rules.trade(vendor, "eisenkeil", true);
assert.equal(purchased.silver, 3);
assert.ok(purchased.inventory.includes("eisenkeil"));
assert.equal(rules.trade(purchased, "eisenkeil", true), purchased);
assert.equal(rules.trade(purchased, "keilerhauer", false).silver, 8);
assert.equal(rules.trade(yard, "eisenkeil", true), yard);

const forestSearch = rules.choose(revisitForest, "forest-book");
const book = rules.choose(forestSearch, "forest-path");
assert.ok(book.inventory.includes("forstbuch"));
assert.equal(book.xp, forestSearch.xp + 20);
assert.equal(rules.choose(book, "forest-path"), book);
const paid = rules.choose(reload(book), "forest-return-book");
assert.equal(paid.scene, "return-forest");
assert.equal(paid.combat, null);
assert.ok(paid.inventory.includes("grauflussbogen"));
assert.ok(!paid.inventory.includes("forstbuch"));
assert.equal(paid.silver, book.silver + 8);
assert.equal(rules.choose(paid, "forest-book"), paid);

for (const [id, table] of Object.entries(world.lootTables)) {
  assert.equal(table.reduce((sum, row) => sum + row[0], 0), 100, id);
  assert.ok(table.every(([, items]) => items.every(item => world.items[item])), id);
}

// Eine Wächterin der Hüter: Iven ist ebenfalls Wächter und steht ihr deshalb nicht als Gefährte offen.
const teamLead = rules.create("Tala", "hueter", "frau", 1, "waechter");
assert.ok(!rules.candidates({ ...teamLead, scene: "watch-yard" }).some(([id]) => id === "knight"));
assert.ok(rules.candidates({ ...teamLead, scene: "watch-yard" }).some(([id]) => id === "paladin"));
assert.ok(!rules.candidates({ ...rules.create("Tala", "orden", "frau", 2, "krieger"), scene: "watch-yard" })
  .some(([id]) => id === "paladin"));
assert.equal(rules.recruit(teamLead, "mage"), teamLead);
let group = teamLead;
for (const [scene, id] of [["start", "druid"], ["forest", "ranger"], ["supply-post", "mage"]]) {
  group = { ...group, scene };
  assert.equal(rules.recruit(group, id), group);
  group = rules.promise(group, id);
  assert.equal(rules.recruit(group, id), group, "Ein Versprechen allein genügt nicht");
  const plan = world.recruitmentQuests[id];
  group = { ...group, marks: [...group.marks, ...(plan.marks ?? [])],
    inventory: [...group.inventory, ...(plan.item ? [plan.item] : [])] };
  group = rules.completeQuest(group, id);
  group = rules.recruit(group, id);
}
assert.equal(group.party.length, 3);
const atYard = reload({ ...group, scene: "watch-yard" });
assert.equal(rules.recruit(atYard, "knight"), atYard);
assert.throws(() => reload({ ...atYard, party: ["ranger", "ranger"] }));
assert.throws(() => reload({ ...atYard, party: ["unbekannt"] }));
assert.equal(rules.dismiss(group, "mage"), group);
const released = rules.dismiss(atYard, "mage");
const knightContract = rules.completeQuest(rules.promise({ ...released, factionRuf: { watch: 25 } }, "paladin"), "paladin");
assert.equal(rules.recruit(knightContract, "paladin").party.length, 3);

const withAllies = trial(atYard);
assert.equal(rules.recruit(withAllies, "knight"), withAllies);
assert.equal(rules.strike(withAllies, "support:knight"), withAllies);
assert.ok(withAllies.combat.health > trial(yard).combat.health);
const round = [];
const shot = rules.strike(withAllies, "guard", highRoll, undefined, 0, round);
assert.deepEqual(round.filter(event => event.kind === "hit").map(event => event.actor), Array.from(atYard.party));
assert.equal(round.find(event => event.actor === "ranger").value, 14);
assert.ok(shot.combat.health < withAllies.combat.health);
assert.equal(shot.ember, withAllies.ember);
for (const event of round.filter(event => event.kind === "hit" && event.actor !== "hero")) {
  const target = rules.targets(withAllies).find(enemy => enemy.id === event.target);
  assert.ok(shot.journal.includes(world.companions[event.actor].name + " trifft " + target.name +
    " für " + event.value + " Schaden."));
}
const nextRound = [];
const secondGroupTurn = rules.strike(reload(shot), "guard", highRoll, undefined, 0, nextRound);
assert.equal(nextRound.find(event => event.actor === "ranger").value, 5);
assert.ok(secondGroupTurn.journal.some(entry => entry.startsWith(world.companions.ranger.name + " trifft ") &&
  entry.endsWith(" für 5 Schaden.")));
const trollWithAllies = rules.choose(rules.choose(atYard, "ravine"), "ravine-fight");
assert.ok(rules.strike(trollWithAllies, "guard").combat.supportUsed.includes("mage"));
const healerTrial = trial({ ...yard, party: ["priest"], role: "krieger" });
const healedByAlly = rules.strike({ ...healerTrial, health: 10, combat: { ...healerTrial.combat, bleeding: 2 } }, "guard");
assert.equal(healedByAlly.combat.bleeding, 0);
assert.ok(healedByAlly.health > 10);

const patrol = rules.choose(rules.choose(atYard, "toll"), "toll-fight");
assert.equal(rules.targets(patrol).length, 3);
assert.deepEqual(Array.from(rules.targets(reload(patrol)), target => target.id), [0, 1, 2]);
const aimed = [];
rules.strike(patrol, "spear", highRoll, undefined, 2, aimed);
assert.equal(aimed[0].target, 2);
assert.ok(aimed.some(event => event.kind === "hit" && event.target !== 2));
assert.equal(rules.strike(patrol, "spear", highRoll, undefined, 999), patrol);
const soloGroup = rules.choose(rules.choose(yard, "toll"), "toll-fight");
assert.equal(rules.targets(soloGroup).length, 1);

const northRoad = rules.choose(posted, "skarn-briefing");
assert.equal(northRoad.scene, "skarn-briefing");
const commissioned = rules.choose(northRoad, "skarn-accept");
assert.ok(ids(commissioned).includes("skarn-road"));
assert.ok(!ids(commissioned).includes("skarn-detour"));
assert.equal(rules.route(commissioned, "skarn-gate").first, "skarn-road");
const detourNorth = rules.choose(rules.choose(sealedYard, "skarn-briefing"), "skarn-accept");
assert.equal(rules.route(detourNorth, "skarn-gate").first, "skarn-detour");
assert.ok(!ids(detourNorth).includes("skarn-road"));

const campNorth = rules.choose(reload(commissioned), "skarn-road");
const sledge = rules.choose(campNorth, "skarn-sledge");
const cliffs = rules.choose(sledge, "skarn-cliffs");
const clearCliffs = rules.choose(cliffs, "skarn-rope");
assert.equal(clearCliffs.combat, null);
assert.ok(clearCliffs.marks.includes("skarn-klippen-frei"));
const bear = rules.choose(cliffs, "skarn-calm", lowRoll);
assert.equal(reload(bear).combat.id, "frostbaer");
assert.equal(rules.strike(bear, "flee", highRoll).scene, "skarn-gate");
assert.ok(!rules.strike(bear, "flee", highRoll).marks.includes("skarn-klippen-frei"));

const torben = rules.choose(clearCliffs, "skarn-runes");
const scorchedRunes = rules.choose(torben, "skarn-burn");
const intactRunes = rules.choose({ ...torben, balance: 0, ember: 1 }, "skarn-balance");
const stalled = rules.choose({ ...torben, balance: -2, ember: 1 }, "skarn-balance");
assert.equal(stalled.scene, "skarn-runes");
assert.ok(!stalled.marks.includes("runen-geschuetzt"));
assert.ok(intactRunes.marks.includes("runen-geschuetzt"));
assert.ok(scorchedRunes.marks.includes("runen-verbrannt"));
assert.equal(rules.choose(torben, "skarn-pull").scene, "skarn-aftermath");
assert.ok(!ids(scorchedRunes).includes("skarn-reward"));
const rewardNorth = rules.choose(intactRunes, "skarn-reward");
assert.ok(rewardNorth.inventory.includes("runenbeil"));
const loadedReward = reload(rewardNorth);
assert.equal(rules.choose(loadedReward, "skarn-reward"), loadedReward);
const northernCamp = rules.choose(reload(rewardNorth), "skarn-return");
const revisitedCliffs = rules.choose(northernCamp, "skarn-cliffs-return");
assert.equal(rules.choose(revisitedCliffs, "skarn-runes-return").scene, "skarn-aftermath");
assert.ok(!ids(revisitedCliffs).includes("skarn-runes"));

const ivenLead = rules.create("Tala", "hueter", "frau", 1, "heiler");
// Bereits mitreisender Begleiter aus einem alten Spielstand mit offenem Versprechen.
const withIven = reload({ ...rules.promise({ ...ivenLead, scene: "watch-yard" }, "knight"),
  party: ["knight"], companionQuests: { knight: { status: "done", debt: 0 } },
  relationships: { knight: { score: 30, oath: "promised", talks: 0, gift: false, left: false, bond: "none" } } });
const failingRescue = rules.choose({ ...withIven, scene: "pass-shelter" }, "rescue-leave");
assert.ok(!failingRescue.party.includes("knight"));
assert.equal(rules.relationship(reload(failingRescue), "knight").left, true);
assert.equal(rules.relationship(failingRescue, "knight").oath, "broken");
assert.equal(rules.reputation(failingRescue, "watch"), -35);
const keptRescue = rules.choose({ ...withIven, scene: "pass-shelter" }, "rescue-ember");
assert.equal(rules.relationship(keptRescue, "knight").oath, "fulfilled");
assert.equal(rules.reputation(keptRescue, "watch"), 30);
assert.ok(ids({ ...keptRescue, scene: "watch-yard" }).includes("watch-trust"));
assert.ok(!ids({ ...failingRescue, scene: "watch-yard" }).includes("watch-trust"));
const earlyBond = rules.bondWith(withIven, "knight", "talk");
assert.equal(rules.bondWith(earlyBond, "knight", "talk"), earlyBond);
let closeBond = { ...keptRescue, scene: "watch-yard", rewards: ["ankunft", "moorbericht", "grenzbericht"] };
for (let i = 0; i < 4; i++) closeBond = rules.bondWith(closeBond, "knight", "talk");
assert.equal(rules.relationship(closeBond, "knight").score, 100);
const gift = rules.bondWith(closeBond, "knight", "gift");
assert.ok(gift.inventory.includes("harzverband"));
assert.equal(rules.bondWith(gift, "knight", "gift"), gift);
const romance = rules.bondWith(gift, "knight", "romance");
assert.equal(rules.relationship(reload(romance), "knight").bond, "romance");
assert.equal(rules.bondWith(romance, "knight", "friendship"), romance);
assert.equal(rules.relationship(rules.bondWith(gift, "knight", "friendship"), "knight").bond, "friendship");
assert.equal(rules.recruitment({ ...failingRescue, scene: "watch-yard" }, "knight"), "refused");
assert.equal(rules.reputation(scorchedRunes, "skarn"), rules.reputation(torben, "skarn") - 35);

console.log("Gefährtenaufträge, Beziehungsfolgen, Geschenke, Romanze, Fraktionsruf und Glutberg geprüft.");

// Inventar-Hub: Rucksack, Lager, Nebenhand und Schmuck
{
  const legacy = JSON.parse(JSON.stringify(armored));
  delete legacy.storage;
  legacy.equipment = { weapon: legacy.equipment.weapon, armor: legacy.equipment.armor };
  const loaded = reload(legacy);
  assert.equal(loaded.storage.length, 0);
  assert.equal(loaded.equipment.offhand, null);
  assert.equal(loaded.equipment.ring2, null);
  assert.equal(loaded.equipment.armor, "glutpanzer");
  assert.equal(hero().storage.length, 0);
  assert.equal(Object.keys(hero().equipment).join(), "weapon,offhand,head,neck,armor,legs,ring1,ring2");

  // Zentrallager nur in Städten und nicht im Kampf
  assert.equal(world.scenes[armored.scene].map, "hochwacht");
  assert.ok(rules.storageOpen(armored));
  assert.ok(rules.storageOpen(start()));
  const outside = { ...armored, scene: "moor", inventory: ["galgenwurz"] };
  assert.equal(rules.store(outside, "galgenwurz"), outside);
  assert.equal(rules.storageOpen(trial(armored)), false);
  assert.equal(world.storageSites[world.scenes["skarn-gate"].map], "Zentrallager · Glutberg");
  for (const city of ["weidenkamm", "kraehenfurt", "hochwacht", "skarn-gate"]) assert.ok(world.storageSites[city]);
  assert.ok(rules.storageOpen({ ...armored, scene: "arrival" }));
  assert.equal(rules.storageOpen({ ...armored, scene: "moor" }), false);

  // Einlagern legt Ausgerüstetes ab, Herausnehmen holt es zurück
  const stored = rules.store(armored, "glutpanzer");
  assert.ok(stored.storage.includes("glutpanzer"));
  assert.ok(!stored.inventory.includes("glutpanzer"));
  assert.equal(stored.equipment.armor, null);
  assert.equal(reload(stored).storage.length, 1);
  const back = rules.retrieve(stored, "glutpanzer");
  assert.ok(back.inventory.includes("glutpanzer"));
  assert.equal(back.storage.length, 0);
  assert.equal(rules.retrieve(back, "glutpanzer"), back);

  // Stapel: einzeln oder alle
  const stack = { ...armored, inventory: [...armored.inventory, "harzverband", "harzverband", "harzverband"] };
  assert.equal(rules.store(stack, "harzverband").storage.length, 1);
  const allStored = rules.store(stack, "harzverband", 3);
  assert.equal(allStored.storage.length, 3);
  assert.ok(!allStored.inventory.includes("harzverband"));
  assert.equal(rules.retrieve(allStored, "harzverband", 3).inventory.filter(id => id === "harzverband").length, 3);

  // Questgegenstände bleiben im Rucksack und belegen keinen Platz
  assert.ok(rules.isQuestItem("flusssiegel"));
  assert.ok(rules.isQuestItem("forstbuch"));
  assert.ok(!rules.isQuestItem("glutfunke"));
  const quest = { ...armored, inventory: [...armored.inventory, "flusssiegel"] };
  assert.equal(rules.store(quest, "flusssiegel"), quest);
  assert.equal(rules.slotsUsed(quest), rules.slotsUsed(armored));

  // 20 Plätze: volle Rucksäcke nehmen keine neue Art auf, Beute wandert ins Lager
  const types = Object.keys(world.items).filter(id => id !== "faeuste" && !rules.isQuestItem(id) && id !== "trollblut");
  const full = { ...armored, inventory: types.slice(0, rules.bagSlots), equipment: Object.fromEntries(rules.equipmentSlots.map(slot => [slot, null])) };
  assert.equal(rules.slotsUsed(full), 20);
  assert.equal(rules.fits(full, "trollblut"), false);
  assert.equal(rules.fits(full, types[0]), true);
  const pending = { ...full, storage: ["trollblut"] };
  assert.equal(rules.retrieve(pending, "trollblut"), pending);
  const vendorFull = rules.choose({ ...full, scene: "watch-yard", silver: 50 }, "supply-post");
  assert.equal(vendorFull.scene, "supply-post");
  const missing = Object.keys(world.shop).find(id => !vendorFull.inventory.includes(id));
  const bought = rules.trade(vendorFull, missing, true);
  assert.ok(bought.storage.includes(missing));
  assert.ok(!bought.inventory.includes(missing));
  assert.match(bought.journal.at(-1), /ins Lager gebracht/);
  assert.equal(reload(bought).storage.at(-1), missing);

  // Acht Plätze: Hände, Kopf, Hals, Körper, Beine, zwei Ringe
  assert.equal(world.gear.holzschild.slot, "offhand");
  assert.equal(world.gear.glutamulett.slot, "neck");
  assert.equal(world.gear.spurenring.slot, "ring");
  const bag = ["wachschild", "glutamulett", "spurenring", "eisenring", "eisenhelm", "kettenbeinlinge"];
  const kitted = bag.reduce((state, id) => rules.equip(state, id), { ...armored, inventory: [...armored.inventory, ...bag] });
  assert.equal(kitted.equipment.offhand, "wachschild");
  assert.equal(kitted.equipment.neck, "glutamulett");
  assert.equal(kitted.equipment.ring1, "spurenring");
  assert.equal(kitted.equipment.ring2, "eisenring");
  assert.equal(kitted.equipment.head, "eisenhelm");
  assert.equal(kitted.equipment.legs, "kettenbeinlinge");
  assert.equal(rules.gearBonus(kitted, "armor"), 3 + 2 + 1 + 2 + 2);
  assert.equal(rules.gearBonus(kitted, "magic"), 1);
  assert.equal(rules.gearBonus(kitted, "travel"), 1);
  assert.equal(rules.gearBonus(armored, "armor"), 3);
  assert.equal(reload(kitted).equipment.ring2, "eisenring");
  assert.ok(rules.strike(trial(kitted), "spear", highRoll).health >= rules.strike(trial(armored), "spear", highRoll).health);
  assert.throws(() => reload({ ...kitted, equipment: { ...kitted.equipment, offhand: "glutamulett" } }));
  assert.throws(() => reload({ ...kitted, equipment: { ...kitted.equipment, ring1: "eisenring" } }));
  // Zwei gleiche Ringe nur mit zwei Exemplaren
  const twoRings = { ...armored, inventory: [...armored.inventory, "eisenring", "eisenring"] };
  const both = rules.equip(rules.equip(twoRings, "eisenring", "ring1"), "eisenring", "ring2");
  assert.equal(both.equipment.ring1, "eisenring");
  assert.equal(both.equipment.ring2, "eisenring");
  assert.equal(reload(both).equipment.ring2, "eisenring");
  const oneRing = rules.store(both, "eisenring");
  assert.equal([oneRing.equipment.ring1, oneRing.equipment.ring2].filter(Boolean).length, 1);
  // Ring tauschen: ein Klick auf einen anderen Ring ersetzt den gewählten Platz
  const swapped = rules.equip(kitted, "eisenring", "ring1");
  assert.equal(swapped.equipment.ring1, "eisenring");
  assert.equal(swapped.equipment.ring2, null);
  // Zweihandwaffen räumen die linke Hand und umgekehrt
  assert.ok(world.gear.bogen.twoHanded && world.gear.runenstab.twoHanded && !world.gear.schwert.twoHanded);
  const archer = rules.equip(kitted, "bogen");
  assert.equal(archer.equipment.weapon, "bogen");
  assert.equal(archer.equipment.offhand, null);
  assert.match(archer.journal.at(-1), /beide Hände/);
  const shielded = rules.equip(archer, "wachschild");
  assert.equal(shielded.equipment.offhand, "wachschild");
  assert.equal(shielded.equipment.weapon, null);
  // Vergleich: Verbesserung positiv, Verschlechterung negativ
  assert.equal(rules.equipPreview(armored, "eisenhelm").armor, 2);
  assert.equal(rules.equipPreview(armored, "lederwams").armor, -2);
  assert.ok(rules.equipPreview(shielded, "bogen").armor < 0);
  // Ablegen: einzelner Platz oder alles, Gegenstände bleiben im Rucksack
  const bare = rules.unequip(kitted, "head");
  assert.equal(bare.equipment.head, null);
  assert.ok(bare.inventory.includes("eisenhelm"));
  assert.equal(rules.unequip(bare, "head"), bare);
  const naked = rules.unequip(kitted);
  assert.ok(rules.equipmentSlots.every(slot => naked.equipment[slot] === null));
  assert.equal(naked.inventory.length, kitted.inventory.length);
  assert.equal(rules.weapon(naked), "faeuste");
  assert.equal(rules.unequip(naked), naked);
  assert.equal(rules.unequip(kitted, "trinket"), kitted);
  assert.equal(rules.unequip(trial(kitted)).equipment.head, "eisenhelm");
  assert.equal(reload(naked).equipment.armor, null);
  // Frühere Vorschaustände mit "trinket" werden übernommen
  const oldPreview = JSON.parse(JSON.stringify(kitted));
  oldPreview.equipment = { weapon: kitted.equipment.weapon, armor: "glutpanzer", offhand: null, trinket: "spurenring" };
  const migrated = reload(oldPreview);
  assert.equal(migrated.equipment.ring1, "spurenring");
  assert.equal(Object.hasOwn(migrated.equipment, "trinket"), false);
  assert.throws(() => reload({ ...armored, storage: ["unbekannt"] }));
}
console.log("Inventar-Hub: Zentrallager, Stapel, Platzgrenze, Questgegenstände, acht Ausrüstungsplätze und Vergleich geprüft.");
// Getragene Exemplare sind eindeutig zugeordnet und bleiben nach dem Laden erhalten.
const gearGroup = { ...atYard, inventory: [...atYard.inventory, 'runenbeil', 'aschenwaechter'] };
const armedMember = rules.equip(gearGroup, 'runenbeil', 'ranger');
const protectedMember = rules.equip(armedMember, 'aschenwaechter', 'ranger');
assert.equal(rules.memberEquipment(reload(protectedMember), 'ranger').weapon, 'runenbeil');
assert.equal(rules.equip(protectedMember, 'runenbeil', 'mage'), protectedMember);
assert.equal(rules.equip(protectedMember, 'runenbeil'), protectedMember);
assert.equal(rules.equip(protectedMember, 'runenbeil', 'unknown'), protectedMember);
assert.equal(rules.trade({ ...protectedMember, scene: 'supply-post' }, 'runenbeil', false).inventory.length,
  protectedMember.inventory.length);
assert.throws(() => reload({ ...protectedMember, companionEquipment: {
  ...protectedMember.companionEquipment, mage: { weapon: 'runenbeil', armor: null },
} }));
assert.throws(() => reload({ ...protectedMember, companionEquipment: { ranger: { weapon: 'aschenwaechter', armor: null } } }));
const duplicateGear = rules.equip({ ...protectedMember, inventory: [...protectedMember.inventory, 'runenbeil'] }, 'runenbeil', 'mage');
assert.equal(rules.assigned(reload(duplicateGear), 'runenbeil'), 2);
const removedGear = rules.equip(protectedMember, 'runenbeil', 'ranger');
assert.equal(rules.memberEquipment(removedGear, 'ranger').weapon, null);
assert.equal(rules.memberEquipment(rules.equip(removedGear, 'runenbeil', 'mage'), 'mage').weapon, 'runenbeil');
assert.equal(rules.assigned(rules.dismiss(protectedMember, 'ranger'), 'runenbeil'), 0);
const gearFight = trial(protectedMember);
assert.equal(rules.equip(gearFight, 'runenbeil', 'ranger'), gearFight);
const plainEvents = [], gearEvents = [];
const plainRound = rules.strike(trial(gearGroup), 'guard', highRoll, undefined, 0, plainEvents);
const gearRound = rules.strike(gearFight, 'guard', highRoll, undefined, 0, gearEvents);
assert.ok(gearEvents.find(e => e.actor === 'ranger' && e.kind === 'hit').value >
  plainEvents.find(e => e.actor === 'ranger' && e.kind === 'hit').value);
assert.equal(gearRound.health, plainRound.health, "Begleiterrüstung schützt nicht länger die Spielfigur");
const legacyGroup = JSON.parse(JSON.stringify(atYard));
delete legacyGroup.companionEquipment;
assert.equal(Object.keys(reload(legacyGroup).companionEquipment).length, 0);
console.log('Gruppenausrüstung, Besitz, Kampfboni und Spielstandmigration geprüft.');

// Aufnahme erst nach angenommenem und abgegebenem Auftrag; kein mehrfacher Rufgewinn.
const questStart = { ...rules.create("Tala", "kronreich", "frau", 1, "magier"), scene: "watch-yard", silver: 30 };
for (const id of Object.keys(world.companions).filter(id => id !== questStart.role)) {
  const applicant = { ...rules.create("Tala", "kronreich", "frau", 1, world.companions[id].klasse === "waechter" ? "heiler" : "waechter"), scene: "watch-yard", silver: 30 };
  const accepted = rules.promise(applicant, id);
  assert.equal(rules.recruit(accepted, id), accepted, id + ': Auftrag noch nicht abgegeben');
  const plan = world.recruitmentQuests[id];
  const prepared = { ...accepted,
    marks: [...accepted.marks, ...(plan.marks ?? [])],
    factionRuf: plan.faction ? { [plan.faction]: plan.reputation } : {},
    inventory: [...accepted.inventory, ...(plan.item ? [plan.item] : [])],
    crafted: plan.crafted ? [plan.crafted] : [],
  };
  assert.equal(rules.questReady(prepared, id), true, id);
  const completed = rules.completeQuest(prepared, id);
  assert.equal(rules.recruitment(reload(completed), id), 'ready', id);
  assert.equal(rules.completeQuest(completed, id), completed, id + ': keine doppelte Belohnung');
  const joined = rules.recruit(completed, id);
  assert.ok(joined.party.includes(id), id);
  if (plan.item) assert.equal(joined.inventory.filter(item => item === plan.item).length,
    prepared.inventory.filter(item => item === plan.item).length - 1);
}
const capacity = { ...atYard, companionQuests: { ...atYard.companionQuests, paladin: { status: 'done', debt: 0 } } };
assert.equal(rules.recruitment(capacity, 'paladin'), 'ready');
assert.equal(rules.recruit(capacity, 'paladin'), capacity, 'Auch erfüllte Quests umgehen das Gruppenlimit nicht');
const herbalist = { ...questStart, inventory: [...questStart.inventory.filter(id => id !== 'galgenwurz'), 'galgenwurz', 'galgenwurz'] };
const craftedBandage = rules.craft(herbalist, 'harzverband');
assert.ok(craftedBandage.inventory.includes('harzverband'));
assert.ok(!craftedBandage.inventory.includes('galgenwurz'));
assert.ok(reload(craftedBandage).crafted.includes('harzverband'));
assert.equal(rules.craft(craftedBandage, 'harzverband'), craftedBandage);
assert.equal(rules.craft(inCombat, 'harzverband'), inCombat);
const priestApplicant = { ...questStart, role: 'krieger', inventory: ['harzverband'] };
const priestQuest = rules.promise(priestApplicant, 'priest');
assert.equal(rules.questReady(priestQuest, 'priest'), false, 'Nur gekaufter Verband genügt nicht');
assert.equal(rules.questReady({ ...priestQuest, crafted: ['harzverband'] }, 'priest'), true);
const soldierQuest = rules.promise({ ...questStart, silver: 0 }, 'warrior');
assert.equal(rules.completeQuest(soldierQuest, 'warrior'), soldierQuest);
const delayedSalary = rules.recruit(rules.completeQuest(soldierQuest, 'warrior', true), 'warrior');
assert.equal(reload(delayedSalary).companionQuests.warrior.debt, 15);
assert.equal(rules.paySalary(delayedSalary, 'warrior'), delayedSalary);
const settledSalary = rules.paySalary({ ...delayedSalary, silver: 20 }, 'warrior');
assert.equal(settledSalary.silver, 5);
assert.equal(settledSalary.companionQuests.warrior.debt, 0);
assert.equal(rules.paySalary(settledSalary, 'warrior'), settledSalary);
assert.equal(rules.completeQuest(soldierQuest, 'warrior', true).silver, 0);
const undeadApplicant = { ...questStart, origin: 'untot', variant: 0 };
assert.equal(rules.recruitment(undeadApplicant, 'paladin'), 'blocked');
assert.equal(rules.promise(undeadApplicant, 'paladin'), undeadApplicant);
assert.equal(rules.recruitment(undeadApplicant, 'knight'), 'wary');
assert.equal(rules.relationship(undeadApplicant, 'knight').score, -10);
assert.equal(rules.recruitment({ ...undeadApplicant, factionRuf: { watch: 25 } }, 'knight'), 'promise');
assert.equal(rules.recruitment({ ...questStart, origin: 'vampir', factionRuf: { order: 15 } }, 'paladin'), 'promise');
assert.equal(rules.recruitment({ ...questStart, origin: 'gruenhaut' }, 'ranger'), 'wary');
assert.equal(rules.recruitment({ ...questStart, origin: 'gruenhaut', factionRuf: { groves: 15 } }, 'ranger'), 'promise');
const legacyFive = { ...questStart, party: ['druid', 'ranger', 'mage', 'knight', 'warrior'],
  inventory: [...questStart.inventory, 'runenbeil'], companionEquipment: { warrior: { weapon: 'runenbeil', armor: null } } };
delete legacyFive.companionQuests;
const migratedFive = reload(legacyFive);
assert.equal(migratedFive.party.length, 3);
assert.equal(migratedFive.companionQuests.warrior.status, 'done');
assert.equal(rules.assigned(migratedFive, 'runenbeil'), 0);
assert.equal(reload(migratedFive).party.length, 3);
const migratedFight = reload(trial(legacyFive));
assert.equal(migratedFight.party.length, 3);
assert.equal(reload(migratedFight).combat.max, migratedFight.combat.max);
assert.throws(() => reload({ ...questStart, companionQuests: { mage: { status: 'done', debt: 15 } } }));
console.log('Dreierlimit, Aufnahmequests, Herstellung, Sold, Herkunftsvorbehalte und Altspeicher geprüft.');

const oldGroupBattle = rules.choose(rules.choose(legacyFive, "toll"), "toll-fight");
oldGroupBattle.combat.health = 0;
oldGroupBattle.combat.extras = [0, 0, 1];
oldGroupBattle.combat.supportUsed = ["warrior"];
const resizedBattle = reload(oldGroupBattle);
assert.ok(rules.targets(resizedBattle).some(enemy => enemy.health > 0));
assert.equal(resizedBattle.combat.supportUsed.length, 0);
assert.ok(reload(resizedBattle).combat);
const oldPromise = rules.promise({ ...ivenLead, scene: "watch-yard" }, "knight");
delete oldPromise.companionQuests;
assert.equal(reload(oldPromise).companionQuests.knight.status, "active");
assert.ok(failingRescue.journal.some(entry => entry.includes("Iven · Sympathie -65")));

// Ein gemeinsames Questlog mit gespeicherter Spielzug-Uhr und echten Fristfolgen.
const clockBase = { ...rules.create('Uhrentest', 'kronreich', 'frau', 1, 'magier'), scene: 'watch-yard' };
const clockAccepted = rules.promise(clockBase, 'priest');
assert.equal(clockAccepted.questClock, 1);
const clockQuest = clockAccepted.questLog['companion-priest'];
assert.equal(clockQuest.deadline - clockQuest.started, world.recruitmentQuests.priest.turns);
assert.equal(rules.questEntries(clockAccepted).find(q => q.id === 'companion-priest').remaining, 50);
assert.equal(rules.choose(clockAccepted, 'unknown'), clockAccepted);
assert.equal(rules.promise(clockAccepted, 'priest'), clockAccepted);
const clockArmed = rules.equip(clockAccepted, clockAccepted.equipment.weapon);
assert.equal(clockArmed.questClock, clockAccepted.questClock, 'Ausrüsten kostet keinen Spielzug');
const beforeLast = { ...clockAccepted, questClock: clockQuest.deadline - 1, crafted: ['harzverband'],
  inventory: [...clockAccepted.inventory, 'harzverband'] };
const onTime = rules.completeQuest(beforeLast, 'priest');
assert.equal(onTime.questClock, clockQuest.deadline);
assert.equal(onTime.questLog['companion-priest'].status, 'done', 'Abgabe im letzten Zug zählt');
assert.equal(rules.questEntries(reload(onTime)).find(q => q.id === 'companion-priest').status, 'done');
const clockExpired = rules.choose({ ...clockAccepted, questClock: clockQuest.deadline - 1 }, 'supply-post');
assert.equal(clockExpired.questLog['companion-priest'].status, 'failed');
assert.equal(clockExpired.companionQuests.priest.status, 'failed');
assert.equal(rules.recruitment(clockExpired, 'priest'), 'failed');
assert.equal(rules.completeQuest({ ...clockExpired, scene: 'watch-yard', crafted: ['harzverband'],
  inventory: [...clockExpired.inventory, 'harzverband'] }, 'priest').companionQuests.priest.status, 'failed');
assert.equal(reload(clockExpired).questLog['companion-priest'].deadline, clockQuest.deadline);
assert.equal(rules.relationship(reload(clockExpired), 'priest').score, rules.relationship(clockExpired, 'priest').score,
  'Laden wiederholt keinen Sympathieverlust');
const storyFromClock = clockAccepted.questLog['runa-rescue'];
assert.equal(storyFromClock.status, 'active');
const storyFailed = reload({ ...clockAccepted, questClock: storyFromClock.deadline });
assert.equal(storyFailed.questLog['runa-rescue'].status, 'failed');
assert.equal(reload({ ...clockBase, marks: ['joren-gerettet'] }).questLog['runa-rescue'].status, 'done');
assert.equal(reload({ ...clockBase, marks: ['joren-verloren'] }).questLog['runa-rescue'].status, 'failed');
const soldierClock = rules.completeQuest(rules.promise({ ...clockBase, silver: 0 }, 'warrior'), 'warrior', true);
const salaryEntry = rules.questEntries(soldierClock).find(q => q.type === 'Soldvertrag');
assert.equal(salaryEntry.remaining, 30);
const lateSoldier = reload({ ...soldierClock, questClock: salaryEntry.deadline });
assert.equal(lateSoldier.companionQuests.warrior.debt, 15);
assert.equal(lateSoldier.questLog[salaryEntry.id].status, 'failed');
const latePaid = rules.paySalary({ ...lateSoldier, silver: 20 }, 'warrior');
assert.equal(latePaid.companionQuests.warrior.debt, 0);
assert.equal(latePaid.questLog[salaryEntry.id].status, 'failed', 'Späte Zahlung tilgt Schuld, aber nicht die verpasste Frist');
const finalSalary = rules.paySalary({ ...soldierClock, questClock: salaryEntry.deadline - 1, silver: 20 }, 'warrior');
assert.equal(finalSalary.questLog[salaryEntry.id].status, 'done');
const tickingBattle = rules.strike(trial(clockAccepted), 'guard', lowRoll);
assert.equal(tickingBattle.questClock, clockAccepted.questClock + 3, 'Zwei Reiseentscheidungen und eine Kampfrunde');
const legacyClock = JSON.parse(JSON.stringify(clockAccepted));
delete legacyClock.questClock;
delete legacyClock.questLog;
const migratedClock = reload(legacyClock);
assert.equal(migratedClock.questClock, 0);
assert.equal(migratedClock.questLog['companion-priest'].deadline, 50);
assert.throws(() => reload({ ...clockBase, questClock: -1 }));
assert.throws(() => reload({ ...clockBase, questLog: { unknown: { status: 'active', started: 0, deadline: 30 } } }));
assert.throws(() => reload({ ...clockBase, questLog: { 'runa-rescue': { status: 'active', started: 5, deadline: 1 } } }));
// Zusammenspiel mit dem neuen Inventar-Hub: Lagerung gibt Begleiterausrüstung sicher frei.
const groupStored = rules.store(protectedMember, 'runenbeil');
assert.equal(rules.memberEquipment(groupStored, 'ranger').weapon, null);
assert.equal(reload(groupStored).storage.includes('runenbeil'), true);
console.log('Questlog, Fristen, letzte Abgabe, Scheitern, Soldverzug und Spielzugmigration geprüft.');

// Individuelle Begleiter-LP, gezielte Gegenstände, Ausfall und Zustände.
const medicalBase = { ...rules.create('Heiltest', 'orden', 'frau', 1, 'waechter'), scene: 'watch-yard', party: ['ranger', 'mage'],
  partyVitals: { ranger: { health: 12, status: { burn: 2, poison: 3, confused: 2 } }, mage: { health: 0, status: {} } },
  inventory: ['speer', 'lederwams', 'galgenwurz', 'lebensfunke', 'brandbalsam', 'gegengift', 'klartrank'] };
// Die Startausrüstung hängt von der gewählten Klasse ab: vollständiges gültiges Inventar verwenden.
medicalBase.inventory = [...new Set([...medicalBase.inventory, ...Object.values(medicalBase.equipment).filter(Boolean)])];
assert.equal(rules.canUse(medicalBase, 'galgenwurz', 'mage'), false);
assert.equal(rules.canUse(medicalBase, 'lebensfunke', 'ranger'), false);
assert.equal(rules.canUse(medicalBase, 'lebensfunke', 'hero'), false);
assert.equal(rules.canUse(medicalBase, 'glutfunke', 'ranger'), false);
const revivedMage = rules.use(medicalBase, 'lebensfunke', 'mage');
assert.equal(revivedMage.partyVitals.mage.health, Math.ceil(rules.memberHealthLimit('mage') * .35));
assert.ok(!revivedMage.inventory.includes('lebensfunke'));
assert.equal(rules.use(revivedMage, 'lebensfunke', 'mage'), revivedMage);
assert.equal(rules.use(medicalBase, 'galgenwurz', 'unknown'), medicalBase);
const healedNeri = rules.use(medicalBase, 'galgenwurz', 'ranger');
assert.equal(healedNeri.partyVitals.ranger.health, 22);
assert.equal(healedNeri.health, medicalBase.health);
assert.equal(medicalBase.partyVitals.ranger.health, 12, 'Vorherigen Zustand nicht mutieren');
let cleansed = medicalBase;
for (const [item, effect] of [['brandbalsam','burn'], ['gegengift','poison'], ['klartrank','confused']]) {
  cleansed = rules.use(cleansed, item, 'ranger');
  assert.equal(cleansed.partyVitals.ranger.status[effect], undefined);
  assert.equal(rules.canUse(cleansed, item, 'ranger'), false);
}
assert.equal(reload(revivedMage).partyVitals.mage.health, revivedMage.partyVitals.mage.health);
const oldVitals = JSON.parse(JSON.stringify(atYard));
delete oldVitals.partyVitals; delete oldVitals.heroStatus;
assert.equal(reload(oldVitals).partyVitals.ranger.health, rules.memberHealthLimit('ranger'));
assert.throws(() => reload({ ...medicalBase, partyVitals: { mage: { health: 10000, status: {} } } }));
assert.throws(() => reload({ ...medicalBase, heroStatus: { poison: 4 } }));
assert.throws(() => reload({ ...medicalBase, partyVitals: { mage: { health: 10, status: { unknown: 2 } } } }));
const medicalFight = rules.choose(rules.choose(medicalBase, 'ravine'), 'ravine-fight');
const revivalEvents = [];
const revivedInCombat = rules.strike(medicalFight, 'herb', lowRoll, 'lebensfunke', undefined, revivalEvents, 'mage');
assert.ok(revivalEvents.some(e => e.kind === 'revive' && e.ally === 'mage'));
assert.ok(!revivalEvents.some(e => e.kind === 'hit' && e.actor === 'mage'), 'Wiederbelebte handeln ab nächster Runde');
const fallenEvents = [];
rules.strike(medicalFight, 'guard', lowRoll, undefined, undefined, fallenEvents);
assert.ok(!fallenEvents.some(e => e.kind === 'hit' && e.actor === 'mage'));
assert.ok(fallenEvents.some(e => e.kind === 'skip' && e.actor === 'ranger'));
const poisonedNeri = rules.strike(medicalFight, 'guard', lowRoll);
assert.equal(poisonedNeri.partyVitals.ranger.health, 7, 'Brand und Gift verursachen 2+3 LP');
assert.equal(poisonedNeri.partyVitals.ranger.status.poison, 2);
const confusedHero = { ...medicalFight, heroStatus: { confused: 2 } };
const confusionEvents = [];
const confusedRound = rules.strike(confusedHero, 'ember', lowRoll, undefined, undefined, confusionEvents);
assert.ok(!confusionEvents.some(e => e.kind === 'hit' && e.actor === 'hero'));
assert.equal(confusedRound.ember, confusedHero.ember, 'Ausgesetzte Magie kostet keine Glut');
const clearHead = rules.strike({ ...confusedHero, inventory: [...confusedHero.inventory, 'klartrank'] }, 'herb', lowRoll, 'klartrank');
assert.equal(clearHead.heroStatus.confused, undefined);
const armorBase = { ...medicalBase, party: ['ranger'], inventory: [...medicalBase.inventory, 'aschenwaechter'],
  partyVitals: { ranger: { health: 28, status: {} } }, companionEquipment: {}, combat: null };
const armorFight = rules.choose(rules.choose(armorBase, 'ravine'), 'ravine-fight');
armorFight.combat.round = 1; armorFight.combat.supportUsed = ['ranger'];
const armoredFight = structuredClone(armorFight);
armoredFight.companionEquipment = { ranger: { weapon: null, armor: 'aschenwaechter' } };
const plainDamage = [], armorDamage = [];
const plainTarget = rules.strike(armorFight, 'guard', lowRoll, undefined, undefined, plainDamage);
const protectedTarget = rules.strike(armoredFight, 'guard', lowRoll, undefined, undefined, armorDamage);
assert.equal(plainDamage.find(e => e.kind === 'retaliate').ally, 'ranger');
assert.ok(protectedTarget.partyVitals.ranger.health > plainTarget.partyVitals.ranger.health);
assert.equal(protectedTarget.health, plainTarget.health, 'Rüstung wirkt nur am Träger');
const woundedPriest = { ...medicalFight, faction: 'hueter', origin: 'waldelf', role: 'heiler',
  build: rules.defaultBuild('hueter', 'heiler') };
woundedPriest.health = Math.min(woundedPriest.health, rules.healthLimit(woundedPriest));
woundedPriest.ember = Math.min(woundedPriest.ember, rules.emberLimit(woundedPriest));
const targetedHealEvents = [];
rules.strike(woundedPriest, 'restore', lowRoll, undefined, undefined, targetedHealEvents, 'ranger');
assert.ok(targetedHealEvents.some(e => e.kind === 'heal' && e.ally === 'ranger' && e.actor === 'hero'));
const koAfterCounter = rules.strike({ ...armorFight, partyVitals: { ranger: { health: 1, status: {} } } }, 'guard', lowRoll);
assert.equal(koAfterCounter.partyVitals.ranger.health, 0);
assert.equal(reload(koAfterCounter).partyVitals.ranger.health, 0);
const restKO = rules.choose({ ...koAfterCounter, combat: null, scene: 'watch-yard' }, 'rest');
assert.equal(restKO.partyVitals.ranger.health, 0, 'Rast belebt nicht wieder');
console.log('Individuelle LP, gezielte Heilung, Wiederbelebung, Zustände und persönlicher Rüstungsschutz geprüft.');
assert.ok(plainDamage.some(e => e.kind === 'afflict' && e.effect === 'poison' && e.ally === 'ranger'));
assert.equal(plainTarget.partyVitals.ranger.status.poison, 3, 'Neu verursachtes Gift tickt erst ab Folgerunde');
assert.ok(world.shop.lebensfunke > 0 && world.shop.brandbalsam > 0 && world.shop.gegengift > 0 && world.shop.klartrank > 0);
