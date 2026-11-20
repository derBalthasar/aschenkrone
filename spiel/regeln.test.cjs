"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ structuredClone });

for (const file of ["bestiarium/daten.js", "spiel/klassen.js", "spiel/faehigkeiten.js", "spiel/kampf.js", "spiel/startpunkte.js", "spiel/welt.js", "spiel/knoten-daten.js", "spiel/knoten.js", "spiel/nebenquests-daten.js", "spiel/nebenquests.js", "spiel/systeme-daten.js", "spiel/systeme.js", "spiel/akt-dialoge.js", "spiel/regeln.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const rules = vm.runInContext("rules", context);
// Reisebegegnungen (Errata 8) würfeln hier immer „ruhige Reise“, damit die Abläufe gleich bleiben.
rules.setTravelDice(() => 0);
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
// Wächterin mit festen Werten, damit die Kampf- und Probenwerte nachvollziehbar bleiben.
const heroBuild = { frei: { strength: 2, presence: 2, will: 1 }, wahl: "presence", spez: null, meister: null,
  fertigkeiten: { nahkampf: 3, fernkampf: 2, magie: 0, verteidigung: 4, list: 2, fuehrung: 4, mut: 3 } };
// Neue Helden des Kronreichs beginnen im Prolog in Westvik. Diese Tests laufen ab dem Erwachen bei Kornwik,
// das für bestehende Spielstände erhalten bleibt.
assert.equal(rules.create("Tala", "kronreich", "frau", 2, "waechter", heroBuild).scene, "heim-kronreich");
// Patch 2.5.4: Die Geschichte um Kornwik nutzt Glut und Gleichgewicht, deshalb spielt sie hier eine Ritterin des Ordens.
const hero = () => ({ ...rules.create("Tala", "orden", "frau", 2, "waechter", heroBuild), scene: "wake" });
const heroKronreich = () => ({ ...rules.create("Tala", "kronreich", "frau", 2, "waechter", heroBuild), scene: "wake" });
assert.equal(rules.read(JSON.stringify(hero())).scene, "wake");
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
// Ältere Spielstände stehen noch im Erwachen bei Kornwik. Die Wege je Herkunft bleiben für sie erhalten.
for (const [faction, scene, mark] of ancestry) {
  const character = reload({ ...rules.create("Tala", faction, "frau", 2, "heiler"), scene: "wake" });
  const opening = rules.choose(character, "lantern");
  assert.equal(opening.scene, scene);
  assert.deepEqual(ids(character), ["lantern"]);
  assert.ok(rules.choose(reload(opening), "prepare").marks.includes(mark));
  assert.ok(!rules.choose(opening, "move").marks.includes(mark));
}

// Nacht des Erwachens: 15 Prologe mit drei Kapiteln, Angriff und Morgengrauen im eigenen Gebiet.
const startMarks = { valmarcher: "ditch", waldelf: "waldspur", bergzwerg: "steinrhythmus", gruenhaut: "fuhrleute-vertrauen", vampir: "faehrwort" };
const nacht = vm.runInContext("startpunkte", context);
const factionIds = Object.keys(vm.runInContext("klassen", context).fraktionen);
assert.equal(factionIds.length, 15);
assert.deepEqual(Object.keys(nacht.prologe).sort(), [...factionIds].sort());
const winFight = (state) => {
  let current = state;
  for (let round = 0; current.combat && round < 40; round++) {
    // Patch 2.5.3: Kronreich und Freie Häfen haben keine Glutgabe.
    current = rules.strike(current, rules.glutgabe(current) && current.ember >= 1 && current.balance < 2 ? "ember" : "spear", highRoll);
  }
  assert.equal(current.combat, null, "Der Prologkampf muss zu gewinnen sein");
  return current;
};
const longJournal = [];
for (const faction of factionIds) {
  const character = rules.create("Tala", faction, "frau", 1, "krieger");
  const home = world.scenes[character.scene];
  assert.equal(character.scene, "heim-" + faction);
  if (faction !== "kronreich") assert.ok(!home.place.startsWith("Kornwik"), faction + " darf nicht in Kornwik beginnen");
  assert.equal(home.map, undefined);
  assert.match(home.objective, /Kapitel 1/);
  assert.ok(rules.storageOpen(character), faction + " braucht ein Zentrallager am Startort");
  assert.equal(rules.read(JSON.stringify(character)).scene, character.scene);
  assert.equal(rules.route(character, "weidenkamm"), null);
  const slides = nacht.prologe[faction];
  assert.equal(slides.length, 3);
  assert.equal(slides[0].location, "Odris · Herbst 612 n. E.");
  assert.ok(slides[2].showPortrait && slides[2].text.includes("%NAME%"));
  for (const slide of slides) assert.ok(fs.existsSync(path.join(root, "spiel/prolog", slide.image)), slide.image);
  // Kapitel 1: Heimat und Bewegung, jede Erkundung nur einmal.
  assert.deepEqual(ids(character), ["erkunden-1", "erkunden-2", "weiter"]);
  let state = rules.choose(rules.choose(character, "erkunden-1"), "erkunden-2");
  assert.deepEqual(ids(state), ["weiter"]);
  assert.equal(state.marks.length, 2);
  // Kapitel 2: Kampf.
  state = rules.choose(state, "weiter");
  assert.equal(state.scene, "kampf-" + faction);
  assert.match(world.scenes[state.scene].objective, /Kapitel 2/);
  state = rules.choose(state, "kampf");
  assert.equal(state.combat.id, "nacht-" + faction);
  assert.equal(reload(state).combat.id, "nacht-" + faction);
  state = winFight(state);
  assert.equal(state.scene, "wahl-" + faction);
  assert.ok(state.marks.includes("nacht-" + faction + "-sieg"));
  // Kapitel 3: Entscheidung mit gespeicherter Marke.
  const full = { ...state, ember: rules.emberLimit(state) };
  assert.deepEqual(ids(full), ["wahl-a", "wahl-b"]);
  const [markA, markB] = nacht.marken[faction];
  const chosenA = rules.choose(full, "wahl-a");
  const chosenB = rules.choose(full, "wahl-b");
  assert.ok(chosenA.marks.includes(markA) && !chosenA.marks.includes(markB));
  assert.ok(chosenB.marks.includes(markB) && !chosenB.marks.includes(markA));
  assert.equal(chosenA.scene, "angriff-" + faction);
  const cost = world.scenes["wahl-" + faction].choices[0].emberCost;
  if (cost) assert.equal(chosenA.ember, full.ember - cost);
  // Angriff, der den Helden vertreibt, dann Morgengrauen an der Zuflucht.
  let fled = rules.choose(reload(chosenB), "flucht");
  if (fled.combat) fled = winFight(fled);
  assert.equal(fled.scene, "morgen-" + faction);
  assert.ok(fled.rewards.includes("prolog-" + faction));
  // Kampfdokument: Prolog (300 EP) plus Kampf-EP führen auf Erfahrungsstufe 3.
  assert.equal(rules.level(fled), 3, faction + ": Stufe nach dem Prolog");
  assert.ok(rules.storageOpen(fled), faction + " braucht ein Zentrallager an der Zuflucht");
  for (const entry of fled.journal) if (entry.length > 300) longJournal.push(faction + ": " + entry);
  let sent = rules.choose(fled, "reise");
  // Die Menschen beginnen Akt 1 im Weltknoten (Kronhall, Glutberg, Zollholm). Kornwik wartet als Handlung, bis der Held dorthin reist.
  const hauptstadt = { kronreich: "kronhall", orden: "glutberg", haefen: "zollholm" }[faction];
  if (hauptstadt) {
    assert.equal(sent.scene, "weltknoten");
    assert.equal(sent.knoten, hauptstadt);
    assert.deepEqual(plain(sent.handlung), { szene: "ankunft", knoten: "kornwik" });
    assert.deepEqual(plain(reload(sent).hauptquest), { schritt: 0, wahl: null, plan: 305 });
    sent = rules.zurHandlung({ ...sent, knoten: "kornwik" });
  }
  assert.equal(sent.scene, "ankunft");
  assert.equal(rules.storageSite(sent), "Zentrallager · Kornwik");
  assert.deepEqual(ids(reload(sent)), ["prepare", "move"]);
  const prepared = rules.choose(sent, "prepare");
  assert.equal(prepared.scene, "start");
  if (startMarks[character.origin]) assert.ok(prepared.marks.includes(startMarks[character.origin]));
  else assert.ok(prepared.inventory.includes("galgenwurz"));
  assert.equal(rules.choose(sent, "move").scene, "start");
}
assert.deepEqual(longJournal, []);
// Einsteige aus der Vorschau (PR #5) mit der Marke „heimvorrat“ laden weiterhin.
assert.equal(reload({ ...rules.create("Tala", "hof", "frau", 1, "krieger"), marks: ["heimvorrat"] }).scene, "heim-hof");

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
assert.deepEqual(Object.keys(migrated.equipment).sort(), ["armor", "hands", "head", "legs", "neck", "offhand", "ring1", "ring2", "weapon"]);
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

// Kronreich erwacht in Kornwik, alle anderen Fraktionen reisen von ihrem Startort an.
const begin = (character) => character.scene === "wake" ? rules.choose(character, "lantern") : { ...character, scene: "ankunft" };
const fightAs = (character) =>
  rules.choose(rules.choose(rules.choose(begin(character), "move"), "go", highRoll), "fight");
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
const elfStart = rules.choose(begin(elf), "prepare");
const elfDetour = rules.choose(rules.choose(elfStart, "go"), "detour");
assert.equal(rules.choose(elfDetour, "trace", () => .2).scene, "ford");
const vampire = rules.create("Tala", "erinnernde", "frau", 2, "schurke");
const vampireStart = rules.choose(begin(vampire), "prepare");
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
// Patch 2.5.4: Geweihte Flamme verschiebt das Gleichgewicht um +1; bei +3 schlägt die Glut zurück.
const failedRescue = rules.choose({ ...ropeShelter, balance: 3 }, "rescue-ember");
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
assert.equal(rules.title(updated), "Schwarzschütze");
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
// Patch 2.5.4: Die Freien Häfen haben keine Glut. Der Glutfunke bleibt im Rucksack.
assert.equal(rules.emberLimit(woundedNew), 0);
assert.equal(rules.use(woundedNew, "glutfunke"), woundedNew);
assert.throws(() => reload({ ...armored, equipment: { weapon: "schwert", armor: "glutpanzer" } }));
// Ausrüstungstests starten mit vollen Helden-LP, unabhängig von Verletzungen früherer Questkämpfe.
const trial = state => rules.choose(rules.choose({ ...state, health: rules.healthLimit(state) }, "ridge-trail"), "ridge-fight");
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
// Erfahrungsstufe 2 ab 100 EP. Grundwertpunkte stammen nur noch aus alten Spielständen (stufenpunkte).
const apprentice = { ...yard, xp: 100, training: {}, stufenpunkte: 1 };
assert.equal(rules.progression(apprentice).level, 2);
assert.equal(rules.progression({ ...apprentice, xp: 99 }).level, 1);
assert.equal(rules.progression(apprentice).points, 2 + 1, "Patch 2.5.5: 2 Punkte je Stufe plus 1 alter Punkt");
const trained = rules.train(apprentice, "strength");
assert.equal(reload(trained).training.strength, 1);
// LP hängen jetzt an Rolle und Erfahrungsstufe, nicht mehr an Stärke.
assert.equal(rules.healthLimit(trained), rules.healthLimit(apprentice));
assert.equal(rules.heroAttributes(trained).strength, rules.heroAttributes(apprentice).strength + 1);
// Kronreich (+1 Stärke), damit die Grenze von 20 erreicht wird.
const strongest = { ...apprentice, faction: "kronreich", origin: rules.create("Tala", "kronreich", "frau", 2, "waechter", heroBuild).origin,
  training: { strength: 1 }, xp: 410, stufenpunkte: 3, build: { ...heroBuild, frei: { strength: 5 } } };
assert.equal(rules.heroAttributes(strongest).strength, 18);
const peak = rules.train(rules.train(strongest, "strength"), "strength");
assert.equal(rules.heroAttributes(peak).strength, 20);
assert.equal(rules.progression(peak).points, rules.progression(strongest).points - 2);
assert.equal(rules.train(peak, "strength"), peak);
const ohnePunkte = { ...trained, xp: 0, stufenpunkte: 0 };
assert.equal(rules.progression(ohnePunkte).points, 0);
assert.equal(rules.train(ohnePunkte, "will"), ohnePunkte);
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
// Verabschieden geht am Wachhof und in jeder Stadt mit Zentrallager (Errata 9), nicht unterwegs.
const awayFromTown = reload({ ...group, scene: "forest" });
assert.equal(rules.dismiss(awayFromTown, "mage"), awayFromTown);
const released = rules.dismiss(atYard, "mage");
const knightContract = rules.completeQuest(rules.promise({ ...released, factionRuf: { watch: 25 } }, "paladin"), "paladin");
assert.equal(rules.recruit(knightContract, "paladin").party.length, 3);

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
// Drei Deserteure allein, je Gefährte einer mehr, seit Patch 2.6.17 höchstens vier je Begegnung.
assert.equal(rules.targets(patrol).length, 4);
assert.deepEqual(Array.from(rules.targets(reload(patrol)), target => target.id), [0, 1, 2, 3]);
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
assert.equal(rules.reputation(keptRescue, "watch"), 30 + 12); // Patch 2.5.4: geweihte Flamme +12 Ansehen
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
  assert.equal(Object.keys(hero().equipment).join(), "weapon,offhand,head,neck,armor,hands,legs,ring1,ring2");

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

  // Wegwerfen: ein Stück, nie Questgegenstände oder angelegte Stücke (UI-Überarbeitung 19. 11. 2026)
  assert.equal(rules.wegwerfen(stack, "harzverband").inventory.filter(id => id === "harzverband").length, 2);
  assert.equal(rules.wegwerfGrund(armored, "glutpanzer"), "angelegt");
  assert.equal(rules.wegwerfen(armored, "glutpanzer"), armored);
  assert.equal(rules.wegwerfen({ ...armored, inventory: [...armored.inventory, "flusssiegel"] }, "flusssiegel").inventory.includes("flusssiegel"), true);

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
for (const id of Object.keys(world.companions).filter(id => id !== questStart.role && !world.companions[id].soeldner && !world.companions[id].auftrag && !world.companions[id].champion)) {
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
// v3.0.0: Bei vollem Trupp kommt der Gefährte in die Quartier-Reserve; erst bei voller Reserve (16) ist Schluss.
const inReserve = rules.recruit(capacity, 'paladin');
assert.equal(inReserve.party.length, rules.partyLimit, 'Auch erfüllte Quests umgehen das Gruppenlimit nicht');
assert.equal(JSON.stringify(inReserve.gefaehrtenPool), '["paladin"]', 'Überzählige Gefährten warten in der Reserve');
assert.equal(JSON.stringify(reload(inReserve).gefaehrtenPool), '["paladin"]');
const reserveVoll = { ...capacity, gefaehrtenPool: Object.keys(world.companions).filter(id => !capacity.party.includes(id) && id !== 'paladin').slice(0, rules.poolLimit) };
assert.equal(rules.poolLimit, 16);
assert.equal(rules.recruit(reserveVoll, 'paladin'), reserveVoll, 'Volle Reserve nimmt niemanden auf');
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
assert.equal(JSON.stringify(reload(migratedFight).combat.feinde), JSON.stringify(migratedFight.combat.feinde));
// Einzelgegner: +25 % LP je Begleiter, nach dem Kürzen auf drei Begleiter also +75 %.
{
  const fiveFight = trial({ ...legacyFive, party: ['druid', 'ranger', 'mage'] });
  assert.equal(migratedFight.combat.feinde[0].max, fiveFight.combat.feinde[0].max);
}
assert.throws(() => reload({ ...questStart, companionQuests: { mage: { status: 'done', debt: 15 } } }));
console.log('Dreierlimit, Aufnahmequests, Herstellung, Sold, Herkunftsvorbehalte und Altspeicher geprüft.');

const oldGroupBattle = rules.choose(rules.choose(legacyFive, "toll"), "toll-fight");
oldGroupBattle.combat.feinde.forEach((foe, index) => { foe.lp = index === oldGroupBattle.combat.feinde.length - 1 ? 1 : 0; });
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
// Charakterfenster: wirkende Effekte werden nur gelesen, der Spielstand bleibt unverändert.
{
  const effectIds = (state) => rules.effects(state).map(effect => effect.id);
  const fresh = hero();
  const before = JSON.stringify(fresh);
  assert.ok(Array.isArray(rules.effects(fresh)));
  assert.equal(JSON.stringify(fresh), before);
  assert.ok(!effectIds(fresh).includes("benommen"));
  assert.ok(!effectIds(fresh).includes("blutung"));
  const hurt = { ...fresh, combat: { id: "keiler", round: 2, stunned: true, bleeding: 2, feinde: [], diener: [], held: { schild: 0 } }, rausch: true, balance: 3, ember: 0 };
  const listed = rules.effects(hurt);
  assert.deepEqual(["benommen", "blutung", "kampfrausch", "glut-unruhig", "glut-erschoepft"].filter(id => !listed.some(e => e.id === id)), []);
  assert.equal(listed.find(e => e.id === "blutung").dauer, "Noch 2 Runden");
  assert.equal(listed.find(e => e.id === "kampfrausch").art, "gut");
  assert.equal(listed.find(e => e.id === "benommen").art, "schlecht");
  assert.ok(listed.every(e => ["gut", "schlecht", "hinweis"].includes(e.art) && e.name && e.text && e.dauer));
  assert.ok(!effectIds({ ...fresh, balance: 1 }).includes("glut-unruhig"));
  assert.ok(effectIds({ ...fresh, balance: -2 }).includes("glut-unruhig"));
  assert.ok(effectIds({ ...fresh, marks: ["steinrhythmus"] }).includes("steinrhythmus"));
  assert.ok(effectIds({ ...fresh, health: 0 }).includes("gefallen"));
  assert.ok(effectIds({ ...fresh, stufenpunkte: 1 }).includes("stufenpunkte"));
  assert.ok(effectIds({ ...fresh, umschulung: true }).includes("umschulung"));
  // Alte Spielstände (Version 1) laden weiter und liefern Effekte.
  const legacy = rules.read(JSON.stringify({ version: 1, name: "Alt", origin: "bergzwerg", appearance: "mann", variant: 0, scene: "start",
    role: "knight", allocation: { strength: 2, agility: 1, mind: 1, presence: 1, will: 1 }, health: 20, ember: 1, xp: 90, silver: 3,
    inventory: [], equipment: { weapon: null, armor: null }, marks: ["steinrhythmus"], journal: [], combat: null }));
  assert.ok(effectIds(legacy).includes("umschulung"));
  assert.ok(effectIds(legacy).includes("steinrhythmus"));
  assert.equal(rules.levelThresholds.length, 20);
  assert.equal(rules.levelThresholds[19], 19000);
}
console.log("Charakterfenster: Effekte (Benommen, Blutung, Kampfrausch, Glut, Stufenpunkte, Umschulung) und alte Spielstände geprüft.");

// ---- Errata 8–10 (Henry, 17. 11. 2026): Rucksack, Gürtel, Begleiter, Söldner und Reisebegegnungen ----
const same = (actual, expected, message) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), message);
{
  // Rucksack: 20 Plätze + Stärke-Bonus, Stapel zu 10, Ausbau auf 30/40/50.
  const base = { ...rules.create("Tala", "kronreich", "frau", 1, "krieger"), scene: "watch-yard", silver: 300 };
  const strength = rules.heroAttributes(base).strength;
  assert.equal(rules.bagLimit(base), 20 + Math.max(0, rules.modifier(strength)));
  const strong = { ...base, build: { ...base.build }, training: { strength: 20 - strength } };
  assert.equal(rules.bagLimit(strong), 22, "Stärke 20 gibt +2 Plätze");
  const herbs = { ...base, inventory: [...base.inventory.filter(id => id !== "galgenwurz"), ...Array(10).fill("galgenwurz")] };
  const before = rules.slotsUsed(herbs);
  const eleven = rules.read(JSON.stringify({ ...herbs, inventory: [...herbs.inventory, "galgenwurz"] }));
  assert.equal(rules.slotsUsed(eleven), before + 1, "Der elfte Galgenwurz beginnt einen neuen Stapel");
  assert.equal(rules.bagUpgrade(base).plaetze, 30);
  const upgraded = rules.upgradeBag(base, "silver");
  assert.equal(upgraded.rucksack, 1);
  assert.equal(upgraded.silver, 270);
  assert.equal(rules.bagLimit(upgraded), rules.bagLimit(base) + 10);
  assert.equal(rules.upgradeBag({ ...base, scene: "forest" }, "silver").rucksack, 0, "Ausbau nur in Städten mit Zentrallager");
  const pelts = { ...base, inventory: [...base.inventory, "wolfspelz", "wolfspelz"] };
  const byMaterial = rules.upgradeBag(pelts, "material");
  assert.equal(byMaterial.rucksack, 1);
  assert.ok(!byMaterial.inventory.includes("wolfspelz"));
  const second = rules.upgradeBag(upgraded, "silver");
  assert.equal(second.rucksack, 2);
  const third = rules.bagUpgrade(second);
  assert.equal(third.plaetze, 50);
  assert.equal(third.trade, false, "Stufe 3 braucht Handel mit Zwergen oder Freien Häfen");
  assert.equal(rules.upgradeBag(second, "silver"), second);
  const trader = { ...second, factionRuf: { league: 25 } };
  assert.equal(rules.upgradeBag(trader, "silver").rucksack, 3);
  assert.equal(rules.bagUpgrade(rules.upgradeBag(trader, "silver")), null);
  assert.throws(() => reload({ ...base, rucksack: 4 }));
  // Alte Spielstände ohne Ausbau und Gürtel bleiben ladbar.
  const legacyBag = JSON.parse(JSON.stringify(base));
  delete legacyBag.rucksack; delete legacyBag.guertel; delete legacyBag.companionXp;
  const loaded = reload(legacyBag);
  assert.equal(loaded.rucksack, 0);
  same(loaded.guertel, [null, null]);

  // Gürtel: 2 Ladungen. Im Kampf wirkt ein Gürtelgegenstand, ohne die Runde zu verbrauchen.
  const belted = rules.setBelt(rules.setBelt({ ...base, inventory: [...base.inventory, "harzverband"] }, 0, "galgenwurz"), 1, "harzverband");
  same(rules.belt(belted), ["galgenwurz", "harzverband"]);
  assert.equal(rules.setBelt(belted, 0, "axt"), belted, "Nur Verbrauchsgüter passen in den Gürtel");
  assert.equal(rules.setBelt(belted, 1, "galgenwurz"), belted, "Nur so viele Ladungen, wie Gegenstände vorhanden sind");
  same(reload(belted).guertel, ["galgenwurz", "harzverband"]);
  const hurt = rules.read(JSON.stringify({ ...belted, health: 5 }));
  const quick = rules.quickUse(hurt, 1);
  assert.equal(quick.health, 5 + 16);
  same(rules.belt(quick), ["galgenwurz", null]);
  assert.equal(quick.inventory.filter(id => id === "harzverband").length, 0);
  // Verbraucht man den Gegenstand anders, ist der Gürtelplatz leer.
  same(rules.belt({ ...belted, inventory: belted.inventory.filter(id => id !== "galgenwurz") }), [null, "harzverband"]);
}
console.log("Rucksack (20–50 Plätze, Stapel zu 10, Ausbau) und Gürtel geprüft.");

{
  // Söldner: 50 Silber, Charisma-Rabatt, Volksgrenzen, Begleiter-EP.
  const town = { ...rules.create("Tala", "kronreich", "frau", 1, "krieger"), scene: "watch-yard", silver: 120, xp: 400 };
  const offered = rules.candidates(town).map(([id]) => id);
  assert.ok(offered.includes("grenzbogner") && offered.includes("flammenknecht") && offered.includes("feldscherin"));
  assert.ok(!offered.includes("steppenreiter"), "Arne wartet in Kornwik und Heidvang");
  assert.equal(rules.recruitment(town, "flammenknecht"), "hire");
  assert.equal(rules.hireCost(town, "flammenknecht"), 50);
  assert.equal(rules.hireCost({ ...town, training: { presence: 16 - rules.heroAttributes(town).presence } }, "flammenknecht"), 45);
  assert.equal(rules.hireCost({ ...town, training: { presence: 20 - rules.heroAttributes(town).presence } }, "flammenknecht"), 40);
  const hired = rules.hire(town, "flammenknecht");
  assert.equal(hired.silver, 70);
  assert.ok(hired.party.includes("flammenknecht"));
  assert.equal(rules.memberLevel(hired, "flammenknecht"), rules.level(town) - 1, "Begleiter starten eine Stufe unter der Spielfigur");
  assert.equal(rules.memberHealthLimit("flammenknecht", hired), 32 + 2 * (rules.memberLevel(hired, "flammenknecht") - 1));
  assert.equal(rules.hire({ ...town, silver: 49 }, "flammenknecht").party.length, 0);
  // Gemeinsame EP nach einem Questakt.
  const awarded = rules.awardXp(hired, "test-akt");
  assert.equal(awarded.companionXp.flammenknecht, hired.companionXp.flammenknecht + 300);
  // Entlassen und kostenlos wieder aufnehmen.
  const released = rules.dismiss(hired, "flammenknecht");
  assert.equal(released.party.length, 0);
  assert.equal(rules.recruitment(released, "flammenknecht"), "ready");
  assert.equal(rules.recruit(released, "flammenknecht").silver, released.silver);
  // Untote nehmen keine lebenden Söldner auf, die Story-Gefährten bleiben erreichbar.
  const undead = { ...rules.create("Morn", "hof", "mann", 1, "magier"), scene: "watch-yard", silver: 120 };
  assert.equal(rules.recruitment(undead, "flammenknecht"), "incompatible");
  assert.equal(rules.hire(undead, "flammenknecht"), undead);
  assert.notEqual(rules.recruitment(undead, "warrior"), "incompatible");
  // Begleiter tragen alle acht Plätze, Ringe nehmen den ersten freien Ringplatz.
  const kitted = rules.read(JSON.stringify({ ...hired, inventory: [...hired.inventory, "eisenring", "eisenring", "eisenhelm", "wachschild"] }));
  let gear = rules.equip(kitted, "eisenring", "flammenknecht");
  gear = rules.equip(gear, "eisenring", "flammenknecht");
  gear = rules.equip(gear, "eisenhelm", "flammenknecht");
  gear = rules.equip(gear, "wachschild", "flammenknecht");
  const worn = rules.memberEquipment(gear, "flammenknecht");
  assert.equal(worn.ring1, "eisenring");
  assert.equal(worn.ring2, "eisenring");
  assert.equal(worn.head, "eisenhelm");
  assert.equal(worn.offhand, "wachschild");
  same(reload(gear).companionEquipment.flammenknecht, gear.companionEquipment.flammenknecht);
  assert.throws(() => reload({ ...gear, companionEquipment: { flammenknecht: { head: "eisenring" } } }));
}
console.log("Söldner, Volksgrenzen, Begleiter-EP und Begleiterausrüstung geprüft.");

{
  // Reisebegegnungen: ein Wurf pro Kante, nur auf bekannten Wegen der Reisekarte.
  const atYard = { ...rules.create("Tala", "kronreich", "frau", 1, "krieger"), scene: "watch-yard", xp: 300 };
  atYard.health = rules.healthLimit(atYard);
  const toFord = rules.choices(atYard).find(choice => choice.destination === "kraehenfurt");
  assert.ok(toFord, "Der Wachhof hat einen Weg nach Heidvang");
  assert.equal(world.edgeType("hochwacht", "kraehenfurt"), "kernland");
  assert.equal(world.edgeType("hochwacht", "ravine"), "spezial");
  const roll = (values) => { let index = 0; rules.setTravelDice(() => values[Math.min(index++, values.length - 1)]); };
  roll([0]);
  const quiet = rules.choose(atYard, toFord.id);
  assert.equal(quiet.scene, toFord.to);
  assert.equal(quiet.combat, null);
  assert.match(quiet.journal.at(-1), /Unterwegs/);
  // Kernland 95: Jäger-Hinterhalt (dritter Wert wählt den Gegner, kein Alphatier).
  roll([0.95, 0.5, 0.5]);
  const ambushed = rules.choose(atYard, toFord.id);
  assert.ok(ambushed.combat, "Hinterhalt startet einen Kampf");
  assert.ok(world.fights[ambushed.combat.id].random);
  assert.equal(ambushed.combat.weiter, toFord.to);
  same(reload(ambushed).combat.weiter, toFord.to);
  // Ausweichen ab List 3 oder als Späher/Schurke, sonst nicht.
  assert.equal(rules.canEvade(ambushed), rules.skillValue(ambushed, "list") >= 3);
  const scout = { ...rules.create("Tala", "kronreich", "frau", 1, "spaeher"), scene: "watch-yard" };
  roll([0.95, 0.5, 0.5]);
  const scoutAmbush = rules.choose(scout, toFord.id);
  const evaded = rules.strike(scoutAmbush, "evade");
  assert.equal(evaded.combat, null);
  assert.equal(evaded.scene, toFord.to);
  assert.equal(evaded.xp, scoutAmbush.xp, "Ausweichen bringt keine Kampf-EP");
  // Gewonnene Zufallskämpfe geben jedes Mal EP und setzen keine Handlungsmarken.
  rules.setTravelDice(() => 0);
  let fight = ambushed;
  for (let round = 0; fight.combat && round < 40; round++) fight = rules.strike(fight, "spear", highRoll);
  assert.equal(fight.combat, null);
  assert.equal(fight.scene, toFord.to);
  assert.ok(fight.xp > ambushed.xp);
  assert.ok(!fight.marks.includes("woelfe-besiegt"));
  assert.ok(!fight.rewards.some(id => id.startsWith("kampf-jagd")));
  // Alphatier zu 10 %: Graufang kämpft als Anführer.
  roll([0.95, 0.05, 0]);
  const alpha = rules.choose(atYard, toFord.id);
  assert.equal(alpha.combat.id, "jagd-graufang");
  assert.equal(alpha.combat.feinde[0].rang, "anfuehrer");
  // Scheue Tiere: Probe auf List oder Fernkampf, Erfolg bringt Galgenwurz.
  roll([0.75, 0.99]);
  const shy = rules.choose(atYard, toFord.id);
  assert.equal(shy.combat, null);
  assert.equal(shy.inventory.filter(id => id === "galgenwurz").length, atYard.inventory.filter(id => id === "galgenwurz").length + 1);
  rules.setTravelDice(() => 0);
}
console.log("Reisebegegnungen (ruhig, scheu, Jäger, Alphatier, Ausweichen) geprüft.");

// ---- Weltebene: Knotennetz, Weltleisten, Fraktionsvorrat und Stadt-Hub (Technische Spezifikation) ----
{
  const knoten = vm.runInContext("knoten", context);
  const alle = Object.values(knoten.alle);
  assert.equal(alle.length, 510);
  assert.equal(alle.filter(k => k.typ === "hauptstadt").length, 15);
  assert.equal(alle.filter(k => k.typ === "stadt" || k.typ === "hafenstadt").length, 150);
  assert.equal(alle.filter(k => k.typ === "dorf").length, 345);
  // Jede Hauptstadt hat 3, jede Stadt 2 Dörfer mit Namen und Ertrag aus den Völkerdokumenten.
  for (const ort of alle.filter(k => k.typ !== "dorf")) {
    const doerfer = knoten.doerfer(ort.id);
    assert.equal(doerfer.length, ort.typ === "hauptstadt" ? 3 : 2, ort.name);
    for (const id of doerfer) assert.ok(knoten.get(id).ertrag && knoten.get(id).fraktion === ort.fraktion, id);
  }
  same(knoten.doerfer("kornwik").map(id => knoten.get(id).name), ["Garbenfeld", "Hopfendal"]);
  // Kanten sind symmetrisch, und das ganze Netz hängt zusammen.
  for (const ort of alle) for (const weg of ort.verbindungen) {
    const rueck = knoten.verbindung(weg.zielId, ort.id);
    assert.ok(rueck && rueck.kantenTyp === weg.kantenTyp, ort.id + " → " + weg.zielId);
    if (weg.kantenTyp === "seeweg") assert.ok(ort.hatHafen && knoten.get(weg.zielId).hatHafen && weg.kostenGold === 15);
    if (weg.kantenTyp === "strasse") assert.equal(weg.kostenRessource, weg.sicherheit === "kernland" ? 1 : 2);
  }
  const seen = new Set(["kronhall"]);
  for (const id of seen) for (const weg of knoten.get(id).verbindungen) seen.add(weg.zielId);
  assert.equal(seen.size, 510);
  assert.equal(knoten.verbindung("stollenmund", "aschenthron").kantenTyp, "tiefer_stollen");
  assert.ok(alle.some(k => k.verbindungen.some(weg => weg.pass === "Zollpass")));
  assert.ok(knoten.verbindung("heidvang", "eiswacht") && knoten.verbindung("eiswacht", "glutberg"));
  assert.equal(knoten.get("ambossheim").hatHafen, false);

  // Neue Helden starten mit den Weltleisten und 42 Fraktionsvorrat.
  const fresh = rules.create("Tala", "kronreich", "frau", 2, "waechter", heroBuild);
  same(fresh.weltLeisten, { untote: 35, orks: 40, glut: 30, erzfieber: 45, welke: 30 });
  assert.equal(fresh.ressource, 42);
  assert.equal(fresh.knoten, null);

  // Aus der Handlung in Kornwik in die Weltreise und zurück.
  const atField = { ...heroKronreich(), scene: "return-field" };
  assert.equal(rules.aktuellerKnoten(atField), "kornwik");
  const hub = rules.betreteWelt(atField);
  assert.equal(hub.scene, "weltknoten");
  assert.equal(hub.knoten, "kornwik");
  same(hub.handlung, { szene: "return-field", knoten: "kornwik" });
  assert.equal(rules.storageSite(hub), "Zentrallager · Kornwik");
  assert.equal(rules.read(JSON.stringify(hub)).knoten, "kornwik");
  assert.equal(rules.zurHandlung(hub).scene, "return-field");
  assert.equal(rules.zurHandlung(hub).knoten, null);
  // Prologe enden an einem Zufluchtsort, auch dort öffnet sich die Weltreise.
  const dwarf = { ...rules.create("Brom", "tiefgraeber", "mann", 0, "krieger"), scene: "morgen-tiefgraeber" };
  assert.ok(rules.aktuellerKnoten(dwarf), "Zufluchtsort der Tiefgräber liegt im Knotennetz");

  // Eine Reise ist eine Runde: Kosten, Anstieg und Gegenkräfte der Weltleisten.
  const toHeidvang = rules.reise(hub, "heidvang");
  assert.equal(toHeidvang.knoten, "heidvang");
  assert.equal(toHeidvang.runde, 1);
  assert.equal(toHeidvang.ressource, 41, "Kernland kostet 1 Vorrat");
  same(toHeidvang.weltLeisten, { untote: 35, orks: 40, glut: 31, erzfieber: 46, welke: 31 });
  assert.equal(rules.zurHandlung(toHeidvang), toHeidvang, "Die Handlung wartet in Kornwik");
  assert.equal(rules.reise(hub, "glutberg"), hub, "Keine direkte Verbindung");
  const grenz = rules.reise(toHeidvang, "eiswacht");
  assert.equal(grenz.ressource, 39, "Pass kostet 2 Vorrat");
  // Gegenkräfte ab der Schwelle, Erholung unter 20.
  const hot = { ...hub, weltLeisten: { untote: 60, orks: 55, glut: 45, erzfieber: 50, welke: 10 } };
  same(rules.reise(hot, "heidvang").weltLeisten, { untote: 55, orks: 52, glut: 44, erzfieber: 48, welke: 12 });

  // Niederlage: eine Leiste auf 100 oder der Vorrat auf 0 führt zur Abschlussszene.
  const doom = rules.reise({ ...hub, weltLeisten: { ...hub.weltLeisten, glut: 99 } }, "heidvang");
  assert.equal(doom.scene, "weltende");
  assert.equal(doom.niederlage, "glut");
  assert.equal(rules.read(JSON.stringify(doom)).scene, "weltende");
  // Patch 2.3.0: Menschen verhungern nicht sofort. Bei Nahrung 0 ist die Gruppe entkräftet, jede Etappe ohne Nahrung
  // kostet 15 Moral, verloren ist erst bei Nahrung 0 und Moral 0. Essen oder Rasten beendet „Entkräftet“.
  const hunger = rules.reise({ ...hub, ressource: 1 }, "heidvang");
  assert.equal(hunger.niederlage, null);
  assert.equal(hunger.ressource, 0);
  assert.equal(hunger.entkraeftet, true);
  assert.equal(hunger.moral, 60, "Die letzte Mahlzeit reicht noch für diese Etappe");
  const hungrig = rules.reise(hunger, hub.knoten);
  assert.equal(hungrig.knoten, hub.knoten);
  assert.equal(hungrig.moral, 45, "Etappe ohne Nahrung: −15 Moral");
  assert.equal(hungrig.niederlage, null);
  const gebrochen = rules.reise({ ...hungrig, moral: 15 }, "heidvang");
  assert.equal(gebrochen.niederlage, "verhungert");
  assert.equal(gebrochen.scene, "weltende");
  assert.match(rules.niederlagen.verhungert, /Verhungert und gebrochen/);
  assert.equal(rules.rastGrund(hungrig), "zu wenig Nahrung");
  assert.throws(() => rules.read(JSON.stringify({ ...hub, scene: "weltende" })), /beschädigt/);

  // Seewege: eigener Hafen oder Handelsvertrag, 15 Silber je Überfahrt.
  // Übersee zu fremden Völkern erst nach Akt 5 (Wegenetz der Menschen, Quest-Stufe 5).
  const westvikFrueh = { ...hub, knoten: "westvik", silver: 40, questStufe: 4 };
  const seeFrueh = rules.reiseZiele(westvikFrueh).find(weg => weg.kantenTyp === "seeweg");
  assert.equal(seeFrueh.grund, "Übersee erst nach Akt 5");
  assert.equal(rules.reise(westvikFrueh, seeFrueh.zielId), westvikFrueh);
  const westvik = { ...hub, knoten: "westvik", silver: 40, questStufe: 5 };
  const see = rules.reiseZiele(westvik).find(weg => weg.kantenTyp === "seeweg");
  assert.equal(see.grund, null);
  const sailed = rules.reise(westvik, see.zielId);
  assert.equal(sailed.silver, 25);
  assert.equal(sailed.ressource, 42, "Seewege kosten Silber statt Vorrat");
  assert.equal(rules.reiseGrund({ ...westvik, silver: 10 }, see.zielId), "zu wenig Silber");
  const perlvik = { ...hub, knoten: "perlvik", silver: 40 };
  const perlSee = rules.reiseZiele(perlvik).find(weg => weg.kantenTyp === "seeweg");
  assert.match(perlSee.grund, /Handelsvertrag mit Freie Häfen/);
  assert.equal(rules.vertragGrund(perlvik), null);
  const treaty = rules.vertragSchliessen(perlvik);
  same(treaty.vertraege, ["haefen"]);
  assert.equal(treaty.ressource, 32);
  assert.equal(rules.reiseGrund(treaty, perlSee.zielId), null);
  assert.equal(rules.read(JSON.stringify(treaty)).vertraege[0], "haefen");
  // Volksgrenzen in der Diplomatie, Wirkung auf die Leisten.
  assert.equal(rules.vertragGrund({ ...hub, knoten: "eryndor" }), "Untote verhandeln nicht mit den Lebenden");
  assert.equal(rules.vertragGrund({ ...dwarf, scene: "weltknoten", knoten: "aschenthron" }), "Orks und Zwerge verhandeln nicht miteinander");
  assert.equal(rules.vertragSchliessen({ ...hub, knoten: "ambossheim" }).weltLeisten.erzfieber, 40);
  assert.equal(rules.vertragSchliessen({ ...hub, knoten: "kragmar" }).weltLeisten.orks, 35);

  // Wegenetz der Menschen: P03 Eispass hat 25 % Jäger, Grauwölfe oder den Klippenwyrm auf Gebietsstufe.
  {
    const folge = (values) => { let index = 0; rules.setTravelDice(() => values[Math.min(index++, values.length - 1)]); };
    const amPass = { ...hub, knoten: "eiswacht", health: rules.healthLimit(hub) };
    // Aufbruch und Reisekarte zeigen Kennung, Gefahr und Gegner des Weges.
    const passWeg = rules.reiseZiele(amPass).find(weg => weg.zielId === "brandstein");
    assert.equal(passWeg.kennung, "P03");
    assert.equal(passWeg.gefahr, 0.25);
    same(passWeg.gegner, ["jagd-grauwolf", "auftrag-klippenwyrm"].map(id => world.fights[id].name));
    const seeWeg = rules.reiseZiele({ ...hub, knoten: "westvik" }).find(weg => weg.kantenTyp === "seeweg");
    assert.match(seeWeg.kennung, /^M\d\d$/);
    same(seeWeg.gegner, [], "Auf See gibt es noch keine Kämpfe");
    folge([0.74]);
    assert.equal(rules.reise(amPass, "brandstein").combat, null, "74 liegt noch unter 55 ruhig + 20 scheu");
    folge([0.75, 0.5, 0.9, 0]);
    const wyrm = rules.reise(amPass, "brandstein");
    assert.equal(wyrm.combat.id, "auftrag-klippenwyrm");
    assert.equal(wyrm.combat.weiter, "weltknoten");
    folge([0.75, 0.5, 0, 0]);
    // Gewöhnliche Jäger kommen bei den Menschen aus dem Gegnerpool der Region (Patch 2.1.0 Punkt 8).
    assert.match(rules.reise(amPass, "brandstein").combat.id, /^sys-ENM_/);
    rules.setTravelDice(() => 0);
  }

  // Pässe: Der Zollpass schließt ab Erzfieber 50.
  const zoll = knoten.get("zollburg").verbindungen.find(weg => weg.pass === "Zollpass");
  const zollburg = { ...hub, knoten: "zollburg" };
  assert.equal(rules.reiseGrund(zollburg, zoll.zielId), null);
  assert.match(rules.reiseGrund({ ...zollburg, weltLeisten: { ...hub.weltLeisten, erzfieber: 50 } }, zoll.zielId), /Zollpass gesperrt/);
  // Tiefer Stollen: Probe auf Willenskraft oder Intelligenz und Glut +1.
  rules.setTravelDice(() => 0.99);
  const stollen = rules.reise({ ...hub, knoten: "stollenmund", health: 30 }, "aschenthron");
  rules.setTravelDice(() => 0);
  assert.equal(stollen.knoten, "aschenthron");
  assert.ok(stollen.health < 30 && stollen.health > 0, "Misslungene Probe kostet LP");
  assert.equal(stollen.weltLeisten.glut, 30 + 1 + 1, "Stollen +1 und Rundenanstieg +1");

  // Rast: volle LP. Menschen zahlen 3 Nahrung (nie die letzte) und gewinnen 12 Moral; als Bannerjarl
  // rasten sie in den Städten der eigenen Fraktion umsonst. Andere Völker zahlen weiter 1 Vorrat.
  const tired = { ...hub, health: 3 };
  const rested = rules.rast(tired);
  assert.equal(rested.health, rules.healthLimit(rested));
  assert.equal(rested.ressource, 39);
  assert.equal(rested.moral, 72);
  assert.equal(rules.rast({ ...tired, ressource: 3 }).health, 3);
  const jarl = rules.rast({ ...tired, factionRuf: { ...tired.factionRuf, groves: 60 } });
  assert.equal(jarl.ressource, 42, "Bannerjarl rastet umsonst");
  const zwergDorf = Object.values(vm.runInContext("knoten", context).alle).find(o => o.typ === "dorf" && o.fraktion === "tiefgraeber");
  const zwergHub = { ...dwarf, scene: "weltknoten", knoten: zwergDorf.id, runde: 0 };
  assert.equal(rules.rast({ ...zwergHub, health: 3 }).ressource, 41);
  // Dörfer liefern bei den anderen Völkern +5, danach 10 Runden Pause. Bei den Menschen liefern befreite
  // Dörfer stattdessen ihren Zehnt alle 6 Etappen ins Kontor (Patch 2.0.0 Punkt 6).
  const garbenfeld = rules.reise(hub, "garbenfeld");
  assert.match(rules.ertragGrund(garbenfeld), /Zehnt alle 6 Etappen/);
  assert.equal(rules.ertragGrund(zwergHub), null);
  const harvested = rules.ertragEinholen(zwergHub);
  assert.equal(harvested.ressource, zwergHub.ressource + 5);
  assert.match(rules.ertragGrund(harvested), /wieder bereit in 10 Etappen/);
  assert.equal(rules.read(JSON.stringify(harvested)).ertraege[zwergDorf.id], 0);
  assert.equal(rules.ertragGrund({ ...zwergHub, knoten: "perlstrand" }), "nur in Dörfern der eigenen Fraktion");
  // Zentrallager: Hauptstädte und eigene Städte, keine Dörfer.
  assert.equal(rules.storageSite({ ...hub, knoten: "eryndor" }), "Zentrallager · Eryndor");
  assert.equal(rules.storageSite({ ...hub, knoten: "salzwacht" }), null);
  assert.equal(rules.storageSite({ ...hub, knoten: "garbenfeld" }), null);
  // Söldner in Kornwik: Silber oder 15 Vorrat.
  const arne = rules.candidates(hub).find(([id]) => id === "steppenreiter");
  assert.ok(arne, "Söldner warten auch im Hub von Kornwik");
  const paid = rules.hire(hub, "steppenreiter", "vorrat");
  assert.equal(paid.ressource, 42 - rules.hireCost(hub, "steppenreiter", 15));
  assert.ok(paid.party.includes("steppenreiter"));
  assert.equal(rules.hire({ ...hub, ressource: 15 }, "steppenreiter", "vorrat").party.length, 0);

  // Hinterhalt auf einer Grenzlandkante im Kronreich: Kampf, danach zurück in den Hub.
  // P01 Heidvang–Eiswacht: 40 ruhig, 20 scheu, 40 Jäger; 70 ist ein Jäger, der dritte Wert wählt den Grauwolf.
  { let index = 0; const werte = [0.7, 0.5, 0]; rules.setTravelDice(() => werte[Math.min(index++, werte.length - 1)]); }
  const ambush = rules.reise({ ...toHeidvang, xp: 300, health: 60 }, "eiswacht");
  rules.setTravelDice(() => 0);
  // Gegnerpool des Ordens (Eiswacht), Werte aus Henrys Gegnerdatei geteilt durch 3,5 (Patch 2.4.0).
  assert.match(ambush.combat.id, /^sys-ENM_OF_/);
  const sysFeind = rules.systeme.gegnerNach[ambush.combat.id.slice(4)];
  assert.equal(ambush.combat.feinde[0].max, rules.systeme.kampfWerte(sysFeind.id, ambush.combat.feinde[0].stufe).lp);
  // Patch 2.5.1: Systemgegner tragen ihre Rüstung in den Kampf (prozentuale Minderung mit Konstante 14).
  assert.equal(ambush.combat.feinde[0].ruestung ?? 0, rules.systeme.kampfWerte(sysFeind.id, ambush.combat.feinde[0].stufe).ruestung);
  {
    const vorher = ambush.combat.feinde[0].lp;
    const nachher = rules.strike(ambush, "spear", highRoll);
    if (nachher.combat) assert.ok(vorher - nachher.combat.feinde[0].lp >= 1, "Rüstung lässt mindestens 1 Schaden durch");
  }
  assert.equal(ambush.combat.weiter, "weltknoten");
  assert.equal(rules.read(JSON.stringify(ambush)).combat.weiter, "weltknoten");
  const evaded = rules.strike(ambush, "evade");
  if (evaded !== ambush) assert.equal(evaded.scene, "weltknoten");
  let won = ambush;
  for (let turn = 0; won.combat && turn < 40; turn++) won = rules.strike(won, "spear", highRoll);
  assert.equal(won.scene, "weltknoten");
  assert.equal(won.knoten, "eiswacht");
  assert.ok(won.silver > ambush.silver, "Silber aus der Beute");
  assert.ok(won.journal.some(text => text.startsWith("Beute: ")));
  assert.equal(won.moral, ambush.moral + 4, "Sieg +4 Moral");
  // Elfenland hat noch keine Tierwerte: Ein Jäger-Wurf bleibt dort ein Hinweis ohne Kampf.
  rules.setTravelDice(() => 0.5);
  const elves = rules.reise({ ...hub, knoten: "hochdorn" }, knoten.get("hochdorn").verbindungen.find(weg => weg.sicherheit === "grenzland" && weg.kantenTyp === "strasse")?.zielId ?? "nordkap");
  rules.setTravelDice(() => 0);
  assert.equal(elves.combat, null);
}
console.log("Weltebene (Knotennetz, Weltleisten, Vorrat, Seewege, Pässe, Stollen, Rast, Ertrag, Verträge) geprüft.");

// ---- Charakter-Entwurf: mehrere Punkte auf einmal festschreiben ----
{
  const ready = { ...hero(), stufenpunkte: 2 };
  const plan = rules.entwurf(ready, { training: { strength: 1, will: 1 } });
  assert.equal(rules.progression(plan).points, 0, "Patch 2.5.5: alle Punkte verteilt");
  same(plan.training, { strength: 1, will: 1 });
  assert.equal(rules.entwurf(ready, { training: { strength: 3 } }), ready, "Zu viele Punkte: nichts wird gespeichert");
  // Menschen spezialisieren sich ab Erfahrungsstufe 10 (Patch 2.0.0 Punkt 9), Quest-Stufe 3 reicht nicht mehr.
  assert.equal(rules.spezBereit({ ...ready, questStufe: 3 }), false);
  const spez = rules.entwurf({ ...ready, xp: 4500 }, { training: { strength: 2 }, spez: { variante: "a", grundwert: "will", fertigkeit: "mut" } });
  assert.equal(spez.build.spez.variante, "a");
  assert.equal(spez.build.fertigkeiten.mut, ready.build.fertigkeiten.mut + 1);
  assert.equal(rules.entwurf(ready, { spez: { variante: "a", grundwert: "will", fertigkeit: "mut" } }), ready, "Spezialisierung erst ab Erfahrungsstufe 10");
}
console.log("Charakter-Entwurf geprüft.");

// Aufträge am Aushang und Hauptquest Akt 1 für Kronreich und Orden (Henry, 18. 11. 2026).
{
  const imOrt = (faction, ort, extra = {}) => ({ ...rules.create("Tala", faction, "frau", 1, "krieger"), scene: "weltknoten", knoten: ort,
    xp: 300, ...extra });
  const midRoll = () => 0.5;
  // Feste Würfelfolge, damit die Kämpfe wie im Spiel streuen und der Test trotzdem wiederholbar bleibt.
  let saat = 7;
  const wurf = () => ((saat = (saat * 1103515245 + 12345) % 2147483648) / 2147483648);
  // Spielt jede Runde die Aktion, die den Gegnern am meisten und dem Helden am wenigsten schadet.
  const gegnerLp = (state) => state.combat ? state.combat.feinde.reduce((sum, feind) => sum + feind.lp, 0) : 0;
  const sieg = (state) => {
    let current = state;
    for (let round = 0; current.combat && round < 60; round++) {
      const aktionen = [...rules.abilities(current).filter(f => f.frei && !rules.abilityState(current, f.id)).map(f => f.id), "spear"];
      const wert = (next) => next === current ? -Infinity : (next.combat ? 0 : 1000) + gegnerLp(current) - gegnerLp(next) -
        1.2 * (current.health - next.health) - (next.health ? 0 : 5000);
      const beste = aktionen.reduce((best, id) => wert(rules.strike(current, id, midRoll)) > wert(rules.strike(current, best, midRoll)) ? id : best, "spear");
      current = rules.strike(current, beste, wurf);
    }
    assert.equal(current.combat, null, "Der Auftragskampf muss zu gewinnen sein");
    assert.ok(current.health > 0);
    return current;
  };
  // Annehmen mit Wahl der Belohnung, Abgabe ohne Kampf, Spielstand.
  let held = imOrt("kronreich", "kronhall");
  held = { ...held, health: rules.healthLimit(held) };
  const liste = rules.aushang(held);
  assert.equal(liste.length, 10);
  assert.ok(liste.every(auftrag => auftrag.grund === null));
  assert.equal(rules.auftragAnnehmen(held, "kronhall_q01", 2), held, "nur angebotene Belohnungen");
  assert.equal(rules.auftragAnnehmen(held, "glutberg_q01"), held, "nur am Aushang des Ortes");
  let s = reload(rules.auftragAnnehmen(held, "kronhall_q01", 1));
  assert.deepEqual(plain(s.weltAuftraege), { kronhall_q01: { status: "aktiv", wahl: 1 } });
  assert.equal(rules.auftragAnnehmen(s, "kronhall_q01", 0), s, "kein zweites Annehmen");
  assert.equal(rules.ausfuehrenGrund({ ...s, knoten: "kornwik" }, "kronhall_q01"), "in Kronhall");
  s = reload(rules.auftragAusfuehren(s, "kronhall_q01"));
  assert.equal(s.weltAuftraege.kronhall_q01.status, "erledigt");
  assert.equal(s.silver, held.silver + 55);
  assert.equal(s.ressource, held.ressource - 5);
  assert.equal(s.xp, held.xp + rules.auftragEp);
  assert.equal(rules.auftragAusfuehren(s, "kronhall_q01"), s, "kein zweiter Lohn");
  assert.equal(rules.auftraege(s, "erledigt").length, 1);

  // Kampfauftrag am Ort: Gegner auf Gebietsstufe, gespeicherter Kampf, Abgabe nach dem Sieg.
  s = rules.auftragAusfuehren(rules.auftragAnnehmen(held, "kronhall_q04"), "kronhall_q04");
  assert.equal(s.combat.id, "auftrag-kultisten");
  assert.equal(s.combat.auftrag, "kronhall_q04");
  assert.equal(s.combat.gegnerStufe, rules.level(held), "Gebietsstufe 1–6 folgt der Heldenstufe");
  assert.ok(s.combat.feinde.every(feind => feind.stufe === rules.level(held)));
  assert.equal(s.combat.feinde.length, 2, "Patch 2.5.4: allein höchstens 2 Gegner");
  assert.equal(reload(s).combat.auftrag, "kronhall_q04");
  assert.throws(() => reload({ ...s, combat: { ...s.combat, auftrag: "kronhall_q05" } }), /beschädigt/);
  const untote = s.weltLeisten.untote;
  s = sieg(s);
  assert.equal(s.scene, "weltknoten");
  assert.equal(s.weltAuftraege.kronhall_q04.status, "erledigt");
  assert.equal(s.weltLeisten.untote, untote - 3);
  assert.ok(!s.journal.some(eintrag => eintrag.includes("Du nimmst  mit")));

  // Gebietsstufe: Orden-Held im Kronreich kämpft auf der Stufe seines Schwester-Zweigs (mindestens 6).
  const gast = imOrt("orden", "kronhall", { xp: 0 });
  const gastKampf = rules.auftragAusfuehren(rules.auftragAnnehmen({ ...gast, health: rules.healthLimit(gast) }, "kronhall_q04"), "kronhall_q04");
  assert.equal(gastKampf.combat.gegnerStufe, 6);
  assert.equal(rules.auftragGrund(imOrt("hof", "kronhall"), "kronhall_q01"), "nur für Helden des eigenen Volkes");

  // Wegauftrag: Die Reise über D25 löst den Kampf aus, danach ist der Auftrag erledigt.
  let pilger = imOrt("orden", "glutberg", { xp: 300 });
  pilger = rules.auftragAnnehmen({ ...pilger, health: rules.healthLimit(pilger) }, "glutberg_q01");
  assert.equal(rules.ausfuehrenGrund(pilger, "glutberg_q01"), "unterwegs auf D25");
  assert.equal(rules.reiseZiele(pilger).find(weg => weg.zielId === "kerzenhof").auftrag, "glutberg_q01");
  let unterwegs = rules.reise(pilger, "kerzenhof");
  assert.equal(unterwegs.knoten, "kerzenhof");
  assert.equal(unterwegs.combat.id, "auftrag-grauwoelfe");
  assert.equal(unterwegs.combat.hinterhalt, undefined, "Auftragskämpfe lassen sich nicht umgehen");
  unterwegs = sieg(reload(unterwegs));
  // Rückreise-Pflicht (Henry, 20. 11. 2026): erst bereit zur Abgabe, Lohn beim Auftraggeber in Glutberg.
  assert.equal(unterwegs.weltAuftraege.glutberg_q01.status, "bereit_zur_abgabe");
  assert.equal(reload(unterwegs).weltAuftraege.glutberg_q01.status, "bereit_zur_abgabe", "Status ist speicherbar");
  assert.equal(unterwegs.ressource, pilger.ressource - 1 + 1, "Reise −1, Sieg +1, Lohn noch offen");
  assert.equal(rules.abgabeGrund(unterwegs, "glutberg_q01"), "nur in Glutberg");
  assert.equal(rules.auftragGrund({ ...unterwegs, knoten: "glutberg" }, "glutberg_q01"), "bereit zur Abgabe");
  const zurueck = rules.rueckkehrZiele(unterwegs);
  assert.equal(zurueck.length, 1);
  assert.equal(zurueck[0].knopf, "Rückkehr nach Glutberg antreten");
  assert.equal(zurueck[0].route.join(), "glutberg");
  assert.equal(rules.rueckmarsch(unterwegs), true);
  let heim = rules.reise(unterwegs, "glutberg");
  assert.equal(heim.combat, null, "Wegaufträge bereit zur Abgabe lösen nichts mehr aus");
  assert.equal(heim.ressource, unterwegs.ressource - 1, "Rückmarsch verbraucht Nahrung");
  assert.equal(rules.abgabeGrund(heim, "glutberg_q01"), null);
  heim = rules.auftragAbgeben(heim, "glutberg_q01");
  assert.equal(heim.weltAuftraege.glutberg_q01.status, "erledigt");
  assert.equal(heim.ressource, unterwegs.ressource - 1 + 8, "Lohn +8 Glaube bei der Abgabe");
  assert.equal(rules.rueckmarsch(heim), false);

  // Wegrabatt: Nach „Die brennende Grenzmarke“ kostet S01 einen Vorrat weniger.
  let grenze = imOrt("kronreich", "eikmark");
  const vorher = rules.reiseZiele(grenze).find(weg => weg.zielId === "brandstein").kostenRessource;
  grenze = rules.auftragAusfuehren(rules.auftragAnnehmen(grenze, "eikmark_q10"), "eikmark_q10");
  const nachher = rules.reiseZiele(grenze).find(weg => weg.zielId === "brandstein");
  assert.equal(nachher.kostenRessource, vorher - 1);
  assert.equal(nachher.rabatt, true);
  // Ruf-Datei 2.0: Erst die Entscheidung über den Ausgang, dann geht die Reise weiter.
  assert.equal(grenze.tatOffen, "eikmark_q10");
  assert.equal(rules.reise(grenze, "brandstein"), grenze);
  assert.equal(rules.taten(grenze).length, 3);
  grenze = rules.tatWaehlen(grenze, "pragmatisch");
  assert.equal(grenze.tatOffen, null);
  assert.equal(grenze.factionRuf.groves, 3);
  assert.equal(rules.reise(grenze, "brandstein").ressource, grenze.ressource - (vorher - 1));

  // Dorfbefreiung (Patch 2.1.0 Punkt 4): q01 mit guter Tat befreit alle Dörfer der Stadt, schlechte Tat nicht.
  let korn = rules.auftragAusfuehren(rules.auftragAnnehmen(imOrt("kronreich", "kronhall"), "kronhall_q01"), "kronhall_q01");
  assert.equal(rules.taten(korn).find(t => t.id === "gut").befreit, true);
  const boese = rules.tatWaehlen(korn, "boese");
  assert.deepEqual(plain(boese.befreit), []);
  assert.equal(boese.factionRuf.groves, -18);
  assert.equal(boese.moral, 52);
  korn = rules.tatWaehlen(korn, "gut");
  assert.deepEqual(plain(korn.befreit), ["koenigsau", "muehlbach", "weizenhof"]);
  assert.equal(korn.factionRuf.groves, 12);
  assert.equal(korn.moral, 66);
  // Zehnt: ab Ruf 20 liefern befreite Dörfer alle 6 Etappen ins Kontor (Kronreich-Nahrung 6 je Dorf).
  let zehnt = { ...korn, factionRuf: { ...korn.factionRuf, groves: 20 } };
  for (let i = 0; i < 6; i++) zehnt = rules.reise(zehnt, rules.reiseZiele(zehnt).find(w => !w.grund && w.kantenTyp !== "seeweg").zielId);
  assert.equal(zehnt.etappen, 6);
  assert.ok(Object.values(plain(zehnt.kontor.kronreich)).reduce((a, b) => a + b, 0) >= 15, "Zehnt im Kontor");
  // Kontor in Kronhall: Rohstoffe kaufen und Nahrung tragen; geächtet kein Handel, Abheben bleibt erlaubt.
  let kontor = { ...imOrt("kronreich", "kronhall"), silver: 200 };
  assert.equal(rules.kontorInfo(kontor).rang.id, "fremder");
  kontor = rules.kontorHandel(kontor, "holz", 10, true);
  assert.equal(kontor.kontor.kronreich.holz, 10);
  assert.equal(kontor.silver, 200 - 54, "Bündel 10 Holz zu 54 Silber");
  kontor = rules.nahrungTragen(kontor, 20, true);
  assert.equal(kontor.kontor.kronreich.nahrung, 20);
  const acht = { ...kontor, factionRuf: { ...kontor.factionRuf, groves: -30 }, ressource: 0, entkraeftet: true };
  assert.equal(rules.kontorHandel(acht, "holz", 1, true), acht);
  const satt = rules.nahrungTragen(acht, 5, false);
  assert.equal(satt.ressource, 5);
  assert.equal(satt.entkraeftet, false, "Nahrung aufnehmen beendet Entkräftet");

  // Ausrüster der Menschen: Waren aus Henrys Ökonomie-Datei, Preise nach Ruf-Rang. Heiltrank I heilt 35 ÷ 3,5 = 10 LP.
  let markt = { ...imOrt("kronreich", "kronhall"), silver: 300 };
  const trank = rules.ausruester(markt).kaufen.find(w => w.id === "POT_HEILUNG_1");
  assert.equal(trank.preis, 18);
  markt = rules.ausruesterHandel(markt, "POT_HEILUNG_1", true);
  assert.ok(markt.inventory.includes("POT_HEILUNG_1"));
  assert.equal(markt.silver, 282);
  assert.equal(world.supplies.POT_HEILUNG_1.heal, 10);
  assert.equal(world.supplies.POT_HEILUNG_3.heal, 51);
  assert.equal(world.supplies.POT_MANA_2.mana, 21);
  assert.equal(world.gear.ARM_PLATTE_T3.armor, 7, "Rüstung 24 ÷ 3,5");
  // Waffenrechte: Ein Krieger (Blutritter der Krone) trägt den Zweihänder, aber keinen Fokusstab.
  assert.equal(rules.ausruestungGrund(markt, "WPN_ZWEIHAENDER_T2"), null);
  assert.match(rules.ausruestungGrund(markt, "WPN_EICHENSTAB_T1"), /nicht für Blutritter der Krone/);
  // Schmiede in Kronhall (vorgebaut): +1 kostet 45 Silber, 2 Eisen aus dem Kontor und 1 Wolfsfell.
  let schmied = { ...markt, inventory: [...markt.inventory, "WPN_EISENSCHWERT_T1", "MAT_WOLFSFELL"], kontor: { kronreich: { nahrung: 0, holz: 0, eisen: 3, stein: 0, runensplitter: 0 } } };
  assert.equal(rules.schmiedeInfo(schmied).stufe, 2);
  schmied = rules.schmieden(schmied, "WPN_EISENSCHWERT_T1");
  assert.equal(schmied.aufwertung.WPN_EISENSCHWERT_T1, 1);
  assert.equal(schmied.kontor.kronreich.eisen, 1);
  assert.ok(!schmied.inventory.includes("MAT_WOLFSFELL"));
  assert.equal(rules.read(JSON.stringify(schmied)).aufwertung.WPN_EISENSCHWERT_T1, 1);
  assert.match(rules.schmiedeInfo(schmied).teile.find(t => t.id === "WPN_EISENSCHWERT_T1").grund, /es fehlt/);
  // Feldhandwerk: Wundmeister rühren Gegengift aus Kräutern und Harz an, Krieger nicht.
  const heiler = { ...imOrt("kronreich", "kronhall", { inventory: ["MAT_KRAEUTER", "MAT_HARZ"] }) };
  assert.ok(rules.handwerkListe(heiler).find(r => r.id === "CRAFT_FIELD_GEGENGIFT").grund);
  const wund = { ...rules.create("Ida", "kronreich", "frau", 1, "heiler"), scene: "weltknoten", knoten: "kronhall", inventory: ["MAT_KRAEUTER", "MAT_HARZ"] };
  const gebraut = rules.handwerk(wund, "CRAFT_FIELD_GEGENGIFT");
  assert.deepEqual(plain(gebraut.inventory), ["CON_GEGENGIFT"]);

  // Trophäen sind verkäuflich, auch beim Händler einer Stadt mit Zentrallager.
  assert.equal(world.items["beute-pelz-von-graufang"], "Pelz von Graufang");
  const haendler = { ...imOrt("kronreich", "kronhall"), inventory: [...held.inventory, "beute-pelz-von-graufang"] };
  assert.equal(rules.handelOffen(haendler), true);
  assert.equal(rules.trade(haendler, "beute-pelz-von-graufang", false).silver, haendler.silver + world.salePrices["beute-pelz-von-graufang"]);
  assert.equal(rules.handelOffen({ ...haendler, knoten: "weizenhof" }), false, "kein Händler im Dorf");

  // Begleiter-Auftrag: Sigrid schließt sich nach dem Duell in Kronhall an.
  let duell = rules.auftragAusfuehren(rules.auftragAnnehmen(held, "kronhall_q10"), "kronhall_q10");
  assert.equal(duell.combat.id, "auftrag-kulthauptmann");
  assert.equal(rules.candidates(held).some(([id]) => id === "sigrid"), true);
  assert.equal(rules.recruitment(held, "sigrid"), "auftrag");
  assert.equal(rules.recruit(held, "sigrid"), held);
  duell = sieg(duell);
  assert.equal(rules.recruitment(duell, "sigrid"), "ready");
  duell = reload(rules.recruit(duell, "sigrid"));
  assert.deepEqual(plain(duell.party), ["sigrid"]);
  assert.equal(rules.memberVitals(duell, "sigrid").health, rules.memberHealthLimit("sigrid", duell));
  assert.equal(world.companions.sigrid.klasse, "waechter");
  assert.equal(rules.candidates({ ...duell, knoten: "glutberg" }).some(([id]) => id === "halvar"), false, "Orden-Begleiter nur für Orden");
  for (const id of ["sigrid", "wulfgar", "fenris", "halvar", "gunhild", "malte"]) assert.ok(world.companions[id], id);

  // Hauptquest Kronreich (v3.0.5): Valengrad/Kronhall (Gespräch) → Eisentor/Hagenfels (Gespräch, Deserteure) → Kronhall (Urteil).
  let akt = { ...held, hauptquest: { schritt: 0, wahl: null, plan: 305 } };
  assert.equal(rules.hauptquest(akt).schritt.titel, "Blut im Thronsaal");
  assert.equal(rules.hauptquest(akt).schritt.wahlen.length, 3, "drei Antworten je Szene");
  assert.equal(rules.hauptGrund(akt), "Antwort wählen");
  assert.equal(rules.hauptWeiter(akt), akt, "ohne Antwort geht es nicht weiter");
  assert.match(rules.hauptGrund({ ...akt, ressource: 1 }, "valen_s1_opfer"), /^zu wenig /);
  const opfer = reload(rules.hauptWeiter({ ...akt, ressource: 3 }, "valen_s1_opfer"));
  assert.equal(opfer.ressource, 1);
  assert.equal(opfer.hinterhaltSchutz, true);
  assert.equal(opfer.szenen["akt1:0"], "valen_s1_opfer");
  akt = reload(rules.hauptWeiter(akt, "valen_s1_direkt"));
  assert.equal(akt.hauptquest.schritt, 1);
  assert.equal(akt.moral, (held.moral ?? rules.systeme.daten.moral.start) + 4);
  assert.equal(rules.hauptGrund(akt), "weiter in Hagenfels");
  assert.equal(rules.marschVignette(akt, "hagenfels"), "Der Wind trägt den Geruch verbrannten Korns von den Höfen bei Hagenfels herüber.");
  const eisentor = { ...akt, knoten: "hagenfels", silver: 30 };
  // Silber statt Kampf: der Rädelsführer zieht ab.
  const gekauft = reload(rules.hauptWeiter(eisentor, "valen_s2_verhandlung"));
  assert.equal(gekauft.combat, null);
  assert.equal(gekauft.silver, 5);
  assert.equal(gekauft.hauptquest.schritt, 2);
  assert.equal(rules.hauptGrund({ ...eisentor, silver: 20 }, "valen_s2_verhandlung"), "zu wenig Silber");
  // Probe ohne Zufall: Stärke gegen 12. Gelingt sie, fehlt im Kampf ein Gegner.
  const probe = rules.hauptquest(eisentor).schritt.wahlen.find((w) => w.id === "valen_s2_staerke");
  assert.deepEqual(plain(probe.probe), { attribut: "strength", wert: 12 });
  const ohneProbe = rules.hauptWeiter({ ...eisentor, szenen: {} }, "valen_s2_geschick");
  akt = rules.hauptWeiter(eisentor, "valen_s2_staerke");
  assert.equal(akt.combat.id, "auftrag-deserteure");
  assert.equal(akt.combat.auftrag, "haupt");
  const staerke = rules.heroAttributes(eisentor).strength;
  if (staerke >= 12) assert.equal(akt.combat.feinde.length, Math.max(1, ohneProbe.combat.feinde.length - 1));
  else assert.equal(akt.combat.feinde.length, ohneProbe.combat.feinde.length);
  akt = sieg(reload(akt));
  assert.equal(akt.hauptquest.schritt, 2, "Kein Bericht mehr nötig: Schritt 3 ist die Rückkehr nach Valengrad");
  assert.equal(rules.hauptGrund(akt), "weiter in Kronhall");
  const thron = { ...akt, knoten: "kronhall", silver: 0, health: rules.healthLimit(akt) };
  assert.equal(rules.hauptGrund(thron), "Antwort wählen");
  const frieden = reload(rules.hauptWeiter(thron, "kron_act1_truce"));
  assert.equal(frieden.hauptquest.schritt, 3);
  assert.equal(frieden.hauptquest.wahl, "kron_act1_truce");
  assert.equal(frieden.questStufe, 1);
  assert.ok(frieden.marks.includes("kron_act1_truce") && frieden.marks.includes("valen_pfad_gnade"));
  assert.equal(frieden.kontor.kronreich.runensplitter, (thron.kontor?.kronreich?.runensplitter ?? 0) + 3);
  assert.ok(frieden.rewards.includes("akt1-kronreich"));
  assert.equal(rules.hauptquest(frieden).fertig, true);
  assert.equal(rules.hauptWeiter(frieden), frieden);
  const haerte = rules.hauptWeiter(thron, "kron_act1_fight");
  assert.equal(haerte.combat, null, "Das Urteil ist kein Kampf mehr");
  assert.equal(haerte.silver, 40);
  assert.ok(haerte.marks.includes("valen_pfad_haerte"));

  // Hauptquest Orden: Sonnenwacht/Glutberg → Aschenkloster (Kultisten) → Glutberg (Urteil).
  let orden = imOrt("orden", "glutberg");
  orden = { ...orden, health: rules.healthLimit(orden), hauptquest: { schritt: 0, wahl: null, plan: 305 } };
  orden = rules.hauptWeiter(orden, "solis_s1_direkt");
  assert.equal(rules.hauptGrund(orden), "weiter in Aschenkloster");
  const kloster = rules.hauptWeiter({ ...orden, knoten: "aschenkloster" }, "solis_s2_predigt");
  assert.equal(kloster.combat.id, "auftrag-kultisten");
  orden = sieg(kloster);
  assert.equal(orden.hauptquest.schritt, 2);
  orden = { ...orden, knoten: "glutberg" };
  const gnade = rules.hauptWeiter(orden, "orden_act1_mercy");
  assert.equal(gnade.hauptquest.wahl, "orden_act1_mercy");
  assert.ok(gnade.marks.includes("solis_pfad_bewahrung"));
  assert.equal(rules.hauptWeiter(orden, "kron_act1_truce"), orden, "nur die Wahl der eigenen Fraktion");
  assert.equal(rules.hauptquest(imOrt("hof", "kronhall")), null);
  // Alte Spielstände: Orden-Schritt 3 von 4 wird Schritt 2 von 3.
  assert.equal(reload({ ...orden, hauptquest: { schritt: 3, wahl: null } }).hauptquest.schritt, 2);

  // Hauptquest Freie Häfen: Korvath-Bucht/Perlvik → Nebelklippe/Nebelvik (Korsaren) → Perlvik (Urteil).
  let haefen = imOrt("haefen", "zollholm");
  haefen = { ...haefen, health: rules.healthLimit(haefen), hauptquest: { schritt: 0, wahl: null, plan: 305 } };
  assert.equal(rules.hauptquest(haefen).titel, "Die Zollinseln");
  assert.equal(rules.aushang(haefen).length, 10);
  assert.equal(rules.hauptGrund(haefen), "weiter in Perlvik");
  haefen = rules.hauptWeiter({ ...haefen, knoten: "perlvik" }, "korvath_s1_direkt");
  const klippe = rules.hauptWeiter({ ...haefen, knoten: "nebelvik", health: rules.healthLimit(haefen) }, "korvath_s2_geschick");
  assert.equal(klippe.combat.id, "auftrag-schmuggler");
  haefen = { ...sieg(klippe), knoten: "perlvik" };
  assert.equal(haefen.hauptquest.schritt, 2);
  const silber = haefen.silver;
  const schatten = reload(rules.hauptWeiter(haefen, "haefen_act1_shadow"));
  assert.ok(schatten.marks.includes("haefen_act1_shadow") && schatten.marks.includes("korvath_pfad_schmuggler"));
  const gilde = rules.hauptWeiter(haefen, "haefen_act1_guild");
  assert.equal(gilde.silver, silber + 45);
  assert.equal(rules.hauptWeiter(haefen, "orden_act1_mercy"), haefen, "nur die Wahl der eigenen Fraktion");
  // Begleiterin Karen Salzklinge nach perlvik_q10; Gold ist der Vorrat der Häfen.
  let karen = rules.auftragAnnehmen(haefen, "perlvik_q10");
  assert.equal(karen.weltAuftraege.perlvik_q10.status, "aktiv");
  const zoll = rules.auftragAnnehmen(imOrt("haefen", "zollholm"), "zollholm_q01");
  assert.match(zoll.journal.at(-1), /M31/);
  assert.equal(rules.auftragGrund(imOrt("kronreich", "perlvik"), "perlvik_q01"), null, "Schwesterfraktionen nehmen Häfen-Aufträge an");

  {
    // Gruppen-Relikte (Henry, 18. 11. 2026): eins aktiv, Wechsel außerhalb des Kampfes, Rechte je Fraktion.
    const basis = imOrt("haefen", "perlvik");
    let haendlerin = { ...basis, inventory: [...basis.inventory, "relic_runenwaage", "relic_runenkompass", "relic_glutlaterne", "beute-seekarte"] };
    assert.equal(rules.reliktGrund(haendlerin, "relic_glutlaterne"), "Glutrelikt: für deine Fraktion verboten");
    assert.equal(rules.setRelikt(haendlerin, "relic_glutlaterne"), haendlerin);
    const vorher = rules.preis(haendlerin, "beute-seekarte", false);
    haendlerin = rules.setRelikt(haendlerin, "relic_runenwaage");
    assert.equal(haendlerin.relikt, "relic_runenwaage");
    assert.ok(!haendlerin.inventory.includes("relic_runenwaage"));
    assert.equal(rules.preis(haendlerin, "beute-seekarte", false), Math.round(vorher * 1.15));
    assert.equal(rules.preis(haendlerin, "relic_glutlaterne", false), Math.round(55 * 1.15));
    const verkauft = rules.trade(haendlerin, "relic_glutlaterne", false);
    assert.equal(verkauft.silver, haendlerin.silver + Math.round(55 * 1.15));
    haendlerin = rules.setRelikt(haendlerin, "relic_runenkompass");
    assert.equal(haendlerin.relikt, "relic_runenkompass");
    assert.ok(haendlerin.inventory.includes("relic_runenwaage"), "das vorige Relikt kehrt in den Rucksack zurück");
    assert.equal(reload(haendlerin).relikt, "relic_runenkompass");
    assert.equal(rules.reliktStand(haendlerin).aktiv.label, "Seefahrer-Weisung");
    const abgelegt = rules.setRelikt(haendlerin, null);
    assert.equal(abgelegt.relikt, null);
    assert.ok(abgelegt.inventory.includes("relic_runenkompass"));
    assert.throws(() => reload({ ...haendlerin, relikt: "relic_glutlaterne" }), /beschädigt/);
    // Der Orden darf Glutrelikte tragen; im Kampf wird nicht gewechselt.
    const ordenBasis = imOrt("orden", "glutberg");
    let flamme = { ...ordenBasis, inventory: [...ordenBasis.inventory, "relic_glutstein_amulett"] };
    flamme = { ...flamme, health: rules.healthLimit(flamme) };
    assert.equal(rules.reliktGrund(flamme, "relic_glutstein_amulett"), null);
    const amulett = rules.setRelikt(flamme, "relic_glutstein_amulett");
    assert.equal(rules.reliktGrund({ ...amulett, combat: {} }, null), "nicht im Kampf");
    // Ältere Spielstände: Runengegenstände als Trophäe werden zum Relikt.
    assert.deepEqual(reload({ ...held, inventory: [...held.inventory, "beute-runenkompass"] }).inventory.at(-1), "relic_runenkompass");
  }

  // Beschädigte Einträge werden abgelehnt.
  assert.throws(() => reload({ ...held, weltAuftraege: { erfunden_q01: { status: "aktiv", wahl: 0 } } }), /beschädigt/);
  assert.throws(() => reload({ ...held, weltAuftraege: { kronhall_q04: { status: "aktiv", wahl: 1 } } }), /beschädigt/);
  assert.throws(() => reload({ ...held, hauptquest: { schritt: 9, wahl: null } }), /beschädigt/);
  assert.throws(() => reload({ ...imOrt("hof", "kronhall"), hauptquest: { schritt: 0, wahl: null } }), /beschädigt/);
  // Ältere Spielstände ohne die neuen Felder laden weiter.
  const alt = plain(held);
  delete alt.weltAuftraege;
  delete alt.hauptquest;
  assert.deepEqual(plain(reload(alt).weltAuftraege), {});
}
console.log("Aufträge am Aushang, Wegaufträge, Wegrabatt, Trophäen, Begleiter und Akt 1 (Kronreich, Orden) geprüft.");

// Teil 4 der Gemini-Systeme: Siedlung, Bau, Garnison, Wiederaufbau, Endgame, Stufe 30, Meister-Talente und Ahnen.
{
  const imOrt = (faction, ort, extra = {}) => ({ ...rules.create("Tala", faction, "frau", 1, "krieger"), scene: "weltknoten", knoten: ort,
    xp: 300, ...extra });
  const SY = rules.systeme;
  // Kronhall in Phase 3 mit gefülltem Kontor; Patch 2.6.19: Stufe 1 erst nach Akt 2 (Quest-Stufe 2).
  let s = imOrt("kronreich", "kronhall", { questStufe: 2, silver: 2000, ressource: 40,
    factionRuf: { groves: 45 }, kontor: { kronreich: { nahrung: 50, holz: 100, eisen: 100, stein: 100, runensplitter: 5 } } });
  let info = rules.siedlungInfo(s);
  assert.equal(info.phase.nr, 3);
  assert.equal(info.stufe.stufe, 0);
  assert.equal(info.ausbauGrund, null);
  s = reload(rules.siedlungAusbauen(s));
  assert.equal(s.siedlungen.kronhall, 1);
  assert.equal(s.silver, 2000 - 150);
  assert.equal(s.kontor.kronreich.holz, 85);
  info = rules.siedlungInfo(s);
  assert.equal(info.stufe.name, "Befestigte Marktstadt");
  assert.ok(info.gebaeude.find((g) => g.id === "BLD_STADTSCHMIEDE").steht, "Kronhall hat seine Stadtschmiede schon");
  const gilde = info.gebaeude.find((g) => g.id === "BLD_SPAEHERGILDE");
  assert.ok(gilde && !gilde.grund, "Spähergilde ab Stufe 1");
  s = reload(rules.gebaeudeBauen(s, "BLD_SPAEHERGILDE"));
  assert.ok(s.gebaeude.kronhall.includes("BLD_SPAEHERGILDE"));
  assert.equal(rules.gebaeudeBauen(s, "BLD_SPAEHERGILDE"), s, "kein zweites Mal");
  // Garnison: 25 Silber, 2 Nahrung, 1 Eisen je Truppe, +5 Verteidigung.
  const vorher = rules.siedlungInfo(s).verteidigung;
  s = reload(rules.garnisonRekrutieren(s));
  assert.equal(s.garnison.kronhall, 1);
  assert.equal(rules.siedlungInfo(s).verteidigung, vorher + 5);
  // Reparatur nach Plünderung.
  assert.equal(rules.ortReparieren(s), s, "nichts zu reparieren");
  s = reload(rules.ortReparieren({ ...s, gepluendert: ["kronhall"] }));
  assert.deepEqual(plain(s.gepluendert), []);
  // Endgame: erst nach Akt 1, Patrouille in Kronhall, Lohn nach dem Sieg.
  assert.equal(rules.endgameListe({ ...s, questStufe: 0 }).find((e) => e.id === "patrouille").grund, "erst nach Akt 1");
  const patrouille = rules.endgameListe(s).find((e) => e.id === "patrouille");
  assert.equal(patrouille.grund, null);
  rules.setTravelDice(() => 0);
  let kampf = rules.endgameStarten({ ...s, health: rules.healthLimit(s) }, "patrouille");
  assert.match(kampf.combat.id, /^sys-ENM_/);
  assert.equal(reload(kampf).combat.endgame.id, "patrouille");
  for (let zug = 0; kampf.combat && zug < 60; zug++) kampf = rules.strike(kampf, "spear", highRoll);
  assert.equal(kampf.scene, "weltknoten");
  assert.ok(kampf.journal.some((t) => t.startsWith("Grenzpatrouillen & Kopfgeld-Tafeln abgeschlossen")));
  assert.equal(kampf.endgame.patrouille, kampf.etappen ?? 0);
  // Stufe 30 für Menschen, Stufe 20 bleibt Grenze der anderen Völker.
  assert.equal(rules.progression(imOrt("kronreich", "kronhall", { xp: 57250 })).level, 30);
  assert.equal(rules.progression(imOrt("kronreich", "kronhall", { xp: 19000 })).level, 20);
  assert.equal(rules.progression(imOrt("kronreich", "kronhall", { xp: 21250 })).level, 21);
  // Meister-Talente: Patch 2.5.5 ein Punkt je Stufe 21–30. Patch 2.6.2: Ungebrochener Schildwall Rang 1 +8 LP.
  let meister = imOrt("kronreich", "kronhall", { xp: 57250 });
  meister.health = rules.healthLimit(meister);
  assert.equal(rules.aufstiegInfo(meister).talentPunkte, 10);
  const lp = rules.healthLimit(meister);
  meister = reload(rules.talentLernen(meister, "TREE_UNGEBROCHENER_SCHILDWALL"));
  assert.equal(meister.talente.TREE_UNGEBROCHENER_SCHILDWALL, 1);
  assert.equal(rules.healthLimit(meister), lp + 8);
  // Ahnen: je 5000 EP über Stufe 30 ein Punkt.
  assert.equal(rules.aufstiegInfo(meister).ahnenPunkte, 0);
  meister = reload(rules.ahnenLernen({ ...meister, xp: 62250 }, "perk_iron_blood"));
  assert.equal(meister.ahnen.perk_iron_blood, 1);
  // Signatur in Rang 4 ab Stufe 25 (Faktor 1,8).
  const zwanzig = rules.specialize(imOrt("kronreich", "kronhall", { xp: 19000 }), "a");
  const legende = { ...zwanzig, xp: 33750 };
  const sig = (st) => rules.abilities(st).find((f) => f.stufe === 20);
  if (sig(zwanzig)) {
    assert.match(sig(zwanzig).name, /Rang 3/);
    assert.match(sig(legende).name, /Rang 4/);
  }
  // Andere Völker sehen keine Siedlung der Menschen.
  assert.equal(rules.siedlungInfo(imOrt("tiefes-koenigreich", "kronhall")), null);
}
console.log("Siedlung, Bau, Garnison, Endgame, Stufe 30, Meister-Talente und Ahnen geprüft.");

// Patch 2.5.3: Kriegskasse ohne Akt 5, Resonanz-Ersatzwerte, Glutgabe nur für den Orden der Flamme.
{
  const imOrt = (faction, ort, extra = {}) => ({ ...rules.create("Tala", faction, "frau", 1, "krieger"), scene: "weltknoten", knoten: ort,
    xp: 300, ...extra });
  assert.equal(rules.kasseVollText(), "Armada-Kriegskasse gefüllt – Überfahrt nach Akt 5 folgt im nächsten Kapitel-Update.");
  assert.equal(rules.glutgabe(imOrt("kronreich", "kronhall")), false);
  assert.equal(rules.glutgabe(imOrt("haefen", "zollholm")), false);
  assert.equal(rules.glutgabe(imOrt("orden", "glutberg")), true);
  assert.equal(rules.glutgabe(imOrt("tiefes-koenigreich", "kronhall")), true, "andere Völker unverändert");
  // Glutgabe im Kampf wird für das Kronreich abgewiesen.
  rules.setTravelDice(() => 0);
  const kampf = rules.endgameStarten({ ...imOrt("kronreich", "kronhall", { questStufe: 1, ember: 3 }), health: 40 }, "patrouille");
  assert.ok(kampf.combat);
  assert.equal(rules.strike(kampf, "ember", highRoll), kampf);
  // Resonanz greift erst mit angelegtem Runen- oder Glutgegenstand.
  const runen = Object.values(rules.systeme.daten.gegenstaende).find((g) => g.magicTag === "RUNEN_ITEM" && g.slot === "RING");
  const held = imOrt("kronreich", "kronhall");
  assert.equal(rules.resonanz(held), false);
  if (runen) assert.equal(rules.resonanz({ ...held, equipment: { ...held.equipment, ring1: runen.id } }), true);
}
console.log("Patch 2.5.3 geprüft.");

// v3.0.0 (Henry, 20. 11. 2026): Gefährten-Pool, Hauptstadt-Tausch, Freischaltung und Völker-Synergien.
{
  const truppIds = ["knight", "mage", "priest"].filter((id) => world.companions[id]);
  const basis = (ort, extra = {}) => reload({ ...rules.create("Tala", "kronreich", "frau", 1, "krieger"), scene: "weltknoten", knoten: ort,
    party: truppIds, gefaehrtenPool: ["ranger"], ...extra });
  const hauptstadt = basis("kronhall");
  assert.equal(rules.tauschGrund(hauptstadt), null, "Tausch in der Hauptstadt erlaubt");
  const unterwegs = basis("hagenfels");
  assert.equal(rules.tauschGrund(unterwegs), "Nur in Hauptstädten möglich");
  assert.equal(rules.inReserve(unterwegs, truppIds[0]), unterwegs, "Unterwegs kein Auswechseln");
  assert.equal(rules.inTrupp(unterwegs, "ranger"), unterwegs, "Unterwegs kein Einwechseln");
  assert.equal(rules.inTrupp(hauptstadt, "ranger"), hauptstadt, "Trupp bleibt bei 4 Personen gedeckelt");
  const raus = rules.inReserve(hauptstadt, truppIds[0]);
  assert.equal(raus.party.length, truppIds.length - 1);
  assert.ok(raus.gefaehrtenPool.includes(truppIds[0]));
  const rein = rules.inTrupp(raus, "ranger");
  assert.ok(rein.party.includes("ranger") && !rein.gefaehrtenPool.includes("ranger"));
  assert.equal(reload(rein).party.length, truppIds.length);
  // Fremde Hauptstadt, dort geächtet: nur Söldner wechseln.
  const fremd = basis("glutberg");
  rules.systeme.rufAendern(fremd, "orden", -60);
  assert.match(rules.tauschGrund(fremd, truppIds[0]) ?? "", /geächtet/);
  // Doppelt in Trupp und Reserve ist ein beschädigter Stand.
  assert.throws(() => rules.read(JSON.stringify({ ...hauptstadt, gefaehrtenPool: [truppIds[0]] })));
  // Akt-5-Champion: Bündnismarke bringt ihn kostenlos in die Reserve, Untote bekommen keinen.
  const buendnis = reload({ ...hauptstadt, marks: [...hauptstadt.marks, "buendnis_zwerge"] });
  assert.ok(buendnis.gefaehrtenPool.includes("gef_zwerge_khaz"));
  const mitZwergin = rules.inTrupp(rules.inReserve(buendnis, truppIds[0]), "gef_zwerge_khaz");
  assert.ok(mitZwergin.party.includes("gef_zwerge_khaz"));
  const pakt = rules.synergien(mitZwergin).find((s) => s.name === "Pakt aus Stahl & Flamme");
  assert.ok(pakt.aktiv && pakt.wirkt, "Mensch + Zwerg: +1 Rüstung");
  assert.ok(!rules.synergien(hauptstadt).some((s) => s.aktiv), "Reiner Menschentrupp ohne Synergie");
  const untot = reload({ ...rules.create("Tala", "hof", "frau", 1, "krieger"), marks: ["buendnis_zwerge"] });
  assert.equal(untot.gefaehrtenPool.length, 0, "Untote schließen keine Bündnisse");
  assert.ok(rules.poolInfo(untot).champions.every((c) => /Untote/.test(c.status)));
}
// Akt 2/3: Abgesandte der geeinten Schwester-Fraktion (Orden-Gefährte für einen Kronreich-Helden).
{
  const [id, gesandt] = Object.entries(world.companions).find(([, c]) => c.auftrag && c.fraktion === "orden" && c.klasse !== "krieger");
  const vorher = reload({ ...rules.create("Tala", "kronreich", "frau", 1, "krieger"), scene: "weltknoten", knoten: gesandt.knoten });
  assert.ok(!rules.candidates(vorher).some(([c]) => c === id), "Vor dem Zweig kein Abgesandter");
  const geeint = { ...vorher, akte: { zweige: { orden: { stufe: 3, akt: 2, wahl: "good", soeldner: false } }, fspez: null,
    akt4: { schritt: 0, siegel: [], wahlOffen: false, wahl: null } } };
  assert.ok(rules.candidates(geeint).some(([c]) => c === id), "Nach dem Zweig wartet der Abgesandte");
  assert.equal(rules.recruitment(geeint, id), "ready");
  assert.ok(rules.recruit(geeint, id).party.includes(id));
}
console.log("Gefährten-Pool und Hauptstadt-Tausch geprüft.");
// Fragenkatalog v3.0.4, Antwort 3 A (Henry, 20. 11. 2026): Alle vier Völker-Synergien wirken im Kampf.
{
  const mitElfe = reload({ ...rules.create("Tala", "kronreich", "frau", 1, "krieger"), scene: "weltknoten", knoten: "kronhall",
    marks: ["buendnis_elfen"], party: ["gef_elfen_aethel"] });
  const astral = rules.synergien(mitElfe).find((s) => s.name === "Astrale Kriegsführung");
  assert.ok(astral.aktiv && astral.wirkt, "Mensch + Elf aktiv");
  assert.ok(rules.synergien(mitElfe).every((s) => s.wirkt), "Alle Synergien haben eine Wirkung");
  const auftrag = rules.aushang(mitElfe).find((x) => x.spiel.gegner && !x.spiel.weg);
  const kampf = rules.auftragAusfuehren(rules.auftragAnnehmen(mitElfe, auftrag.id), auftrag.id);
  assert.ok(kampf.combat, "Kampf beginnt");
  const max = rules.kampfwerte(kampf).ausdauerMax;
  assert.equal(kampf.combat.held.ausdauer, max + 1, "+1 Ausdauer über dem Höchstwert zu Kampfbeginn");
  assert.equal(reload(kampf).combat.held.ausdauer, max + 1, "Spielstand mit Vorsprung bleibt ladbar");
  const ohne = reload({ ...mitElfe, party: [] });
  const kampfOhne = rules.auftragAusfuehren(rules.auftragAnnehmen(ohne, auftrag.id), auftrag.id);
  assert.equal(kampfOhne.combat.held.ausdauer, rules.kampfwerte(kampfOhne).ausdauerMax, "Ohne Elf kein Vorsprung");
  const amboss = rules.synergien(reload({ ...rules.create("Tala", "tiefes-koenigreich", "frau", 1, "krieger"), marks: ["buendnis_orks"] }));
  assert.equal(amboss.find((s) => s.name === "Donner & Amboss").wert.nahkampfKrit, 1.62);
  assert.equal(amboss.find((s) => s.name === "Zorn der Alten Wildnis").wert.ausweichenFrueh, 1);
}
console.log("Völker-Synergien geprüft.");
// v3.0.5: Gastgeber-Szene vor dem ersten Kampf eines Schwester-Zweigs.
{
  const s = reload({ ...rules.create("Tala", "kronreich", "frau", 1, "krieger"), scene: "weltknoten", knoten: "glutberg",
    xp: rules.systeme.epFuer(6), hauptquest: { schritt: 3, wahl: "kron_act1_truce", plan: 305 }, questStufe: 1, silver: 100 });
  const sz = rules.szeneInfo(s, "zweig", "orden");
  assert.equal(sz.titel, "Asche, Eid und läuterndes Feuer");
  assert.equal(sz.optionen.length, 3);
  assert.match(rules.zweigGrund(s, "orden", "good") ?? "", /sprechen/);
  assert.equal(rules.zweigSzeneWaehlen(s, "orden", "zweig_solis_runen"), s, "Runensplitter fehlen");
  const nach = reload(rules.zweigSzeneWaehlen(s, "orden", "zweig_solis_soeldner"));
  assert.equal(nach.szenen["zweig:orden"], "zweig_solis_soeldner");
  assert.equal(rules.zweigGrund(nach, "orden", "good"), null);
  assert.equal(rules.zweigSzeneWaehlen(nach, "orden", "zweig_solis_probe"), nach, "nur einmal");
}
console.log("Gastgeber-Szenen geprüft.");
