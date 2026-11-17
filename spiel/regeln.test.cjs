"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ structuredClone });

for (const file of ["bestiarium/daten.js", "spiel/klassen.js", "spiel/faehigkeiten.js", "spiel/kampf.js", "spiel/welt.js", "spiel/regeln.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const rules = vm.runInContext("rules", context);
const world = vm.runInContext("world", context);
const plain = (value) => JSON.parse(JSON.stringify(value));
const highRoll = () => 0.99;
const lowRoll = () => 0;
// Lebenspunkte eines Gegners und ein Kampf bis zum Ende (höchstens 40 Runden).
const foeHp = (state, index = 0) => state.combat.feinde[index].lp;
const fightOut = (state, action = "spear") => {
  for (let turn = 0; turn < 40 && state.combat; turn++) state = rules.strike(state, action, highRoll);
  return state;
};
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
light = fightOut(light);
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
assert.equal(migrated.version, 3);
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
// Ein laufender Kampf beginnt nach der Umstellung auf das Kampfdokument neu (Keiler: Elite, Stufe 2, 20 LP).
assert.equal(foeHp(migratedRanger), 25); // 20 LP, +25 % für Iven in der Gruppe
assert.deepEqual(Array.from(migratedRanger.party), ["knight"]);
assert.equal(rules.weapon(migratedRanger), "bogen");
assert.ok(migratedRanger.health > 0 && migratedRanger.health < rules.healthLimit(migratedRanger));
assert.ok(migratedRanger.ember <= rules.emberLimit(migratedRanger));
assert.equal(rules.strike(migratedRanger, "guard").combat.round, 1);
assert.equal(reload(migratedRanger).version, 3);

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
assert.equal(foeHp(firstFlame), foeHp(mageCombat) - 11 - mageCombat.build.fertigkeiten.magie);
const backlash = rules.strike(firstFlame, "ember");
assert.equal(backlash.balance, 3);
assert.equal(foeHp(backlash), foeHp(firstFlame));
const roots = rules.strike(firstFlame, "restore");
assert.equal(roots.balance, 0);
assert.equal(foeHp(roots), foeHp(firstFlame) - 4);
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
// Drei Glutkäfer (Mitläufer, Stufe 2). Beim Sieg bersten sie.
assert.equal(rules.targets(bugs).length, 3);
const cleared = fightOut(bugs);
assert.equal(cleared.scene, "mine-cleared");
assert.ok(cleared.journal.some(entry => /Glutwolke kostet 3 LP/.test(entry)));
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
// Schlundtroll: Elite der Stufe 4 (40 LP). Grundangriff 6 + Nahkampf 3, danach Regeneration 4. Fackel 6 + Nahkampf 3 stoppt sie.
assert.equal(foeHp(reload(troll)), 40);
assert.equal(foeHp(rules.strike(troll, "spear", highRoll)), 35);
assert.equal(foeHp(rules.strike(troll, "torch")), 31);

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
const orcWin = rules.strike({ ...orc, combat: { ...orc.combat, feinde: [{ ...orc.combat.feinde[0], lp: 1 }] } }, "spear", lowRoll);
assert.equal(orcWin.rausch, true);
assert.equal(reload(orcWin).rausch, true);
const raging = rules.strike({ ...orc, rausch: true }, "spear", lowRoll);
assert.equal(foeHp(raging), foeHp(rules.strike(orc, "spear", lowRoll)) - 2);
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
assert.ok(foeHp(rules.strike(bowFight, "spear", highRoll)) < foeHp(rules.strike(fistFight, "spear", highRoll)));
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
// Drei Deserteure (Mitläufer, Stufe 3) gegen eine ausgeruhte Burgvögtin der Stufe 2.
deserters = fightOut({ ...deserters, health: rules.healthLimit(deserters) });
assert.equal(deserters.scene, "toll-resolved");
assert.ok(deserters.inventory.includes("rostklaue"));
assert.equal(deserters.silver, toll.silver + 14);
const ada = rules.choose(bargained, "toll-reward", lowRoll);
assert.equal(rules.recruit(bargained, "thief"), bargained);
const withTovin = rules.recruit(ada, "thief");
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
// Erfahrungsstufe 2 ab 100 EP. Grundwertpunkte stammen nur noch aus alten Spielständen (stufenpunkte).
const apprentice = { ...yard, xp: 100, training: {}, stufenpunkte: 1 };
assert.equal(rules.progression(apprentice).level, 2);
assert.equal(rules.progression({ ...apprentice, xp: 99 }).level, 1);
assert.equal(rules.progression(apprentice).points, 1);
const trained = rules.train(apprentice, "strength");
assert.equal(reload(trained).training.strength, 1);
// LP hängen jetzt an Rolle und Erfahrungsstufe, nicht mehr an Stärke.
assert.equal(rules.healthLimit(trained), rules.healthLimit(apprentice));
assert.equal(rules.heroAttributes(trained).strength, rules.heroAttributes(apprentice).strength + 1);
const strongest = { ...apprentice, training: { strength: 1 }, xp: 410, stufenpunkte: 3, build: { ...heroBuild, frei: { strength: 5 } } };
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
for (const [scene, id] of [
  ["start", "druid"], ["forest", "ranger"], ["watch-yard", "paladin"],
  ["supply-post", "mage"], ["toll-resolved", "thief"],
]) {
  group = { ...group, scene };
  if (id === "thief") {
    assert.equal(rules.recruit(group, id), group);
    group = { ...group, marks: [...group.marks, "haendlerin-geholfen"] };
  } else {
    assert.equal(rules.recruit(group, id), group);
    group = rules.promise(group, id);
  }
  group = rules.recruit(group, id);
}
assert.equal(group.party.length, 5);
const atYard = reload({ ...group, scene: "watch-yard" });
assert.equal(rules.recruit(atYard, "knight"), atYard);
assert.throws(() => reload({ ...atYard, party: [...atYard.party, "knight"] }));
assert.throws(() => reload({ ...atYard, party: ["ranger", "ranger"] }));
assert.throws(() => reload({ ...atYard, party: ["unbekannt"] }));
assert.equal(rules.dismiss(group, "mage"), group);
const atFord = { ...rules.dismiss(atYard, "mage"), scene: "return-ford" };
assert.equal(rules.recruit(rules.promise(atFord, "priest"), "priest").party.length, 5);

const withAllies = trial(atYard);
assert.equal(rules.recruit(withAllies, "knight"), withAllies);
assert.equal(rules.strike(withAllies, "support:knight"), withAllies);
assert.ok(foeHp(withAllies) > foeHp(trial(yard)));
const round = [];
const shot = rules.strike(withAllies, "guard", highRoll, undefined, 0, round);
assert.deepEqual(round.filter(event => event.kind === "hit").map(event => event.actor), Array.from(atYard.party));
assert.equal(round.find(event => event.actor === "ranger").value, 14);
assert.ok(foeHp(shot) < foeHp(withAllies));
assert.equal(shot.ember, withAllies.ember);
const nextRound = [];
rules.strike(reload(shot), "guard", highRoll, undefined, 0, nextRound);
assert.equal(nextRound.find(event => event.actor === "ranger").value, 5);
const trollWithAllies = rules.choose(rules.choose(atYard, "ravine"), "ravine-fight");
assert.ok(rules.strike(trollWithAllies, "guard").combat.supportUsed.includes("mage"));
const healerTrial = trial({ ...yard, party: ["priest"], role: "krieger" });
const healedByAlly = rules.strike({ ...healerTrial, health: 10, combat: { ...healerTrial.combat, bleeding: 2 } }, "guard");
assert.equal(healedByAlly.combat.bleeding, 0);
assert.ok(healedByAlly.health > 10);

const patrol = rules.choose(rules.choose(atYard, "toll"), "toll-fight");
// Drei Deserteure allein, je Gefährte einer mehr, höchstens sechs.
assert.equal(rules.targets(patrol).length, 6);
assert.deepEqual(Array.from(rules.targets(reload(patrol)), target => target.id), [0, 1, 2, 3, 4, 5]);
const aimed = [];
rules.strike(patrol, "spear", highRoll, undefined, 2, aimed);
assert.equal(aimed[0].target, 2);
assert.ok(aimed.some(event => event.kind === "hit" && event.target !== 2));
assert.equal(rules.strike(patrol, "spear", highRoll, undefined, 999), patrol);
const soloGroup = rules.choose(rules.choose(yard, "toll"), "toll-fight");
assert.equal(rules.targets(soloGroup).length, 3);

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
const withIven = rules.recruit(rules.promise({ ...ivenLead, scene: "watch-yard" }, "knight"), "knight");
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
