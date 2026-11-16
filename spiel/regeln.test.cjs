"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ structuredClone });

for (const file of ["bestiarium/daten.js", "spiel/welt.js", "spiel/regeln.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const rules = vm.runInContext("rules", context);
const highRoll = () => 0.99;
const lowRoll = () => 0;
const hero = () => rules.create("Tala", "valmarcher", "frau", 2);
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
assert.equal(rested.health, rules.maxHealth(rested.origin));
assert.equal(rested.ember, rules.maxEmber(rested.origin));
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
  ["valmarcher", "wake-road", "ditch"],
  ["waldelf", "wake-wood", "waldspur"],
  ["bergzwerg", "wake-stone", "steinrhythmus"],
  ["gruenhaut", "wake-cart", "fuhrleute-vertrauen"],
  ["vampir", "wake-shade", "faehrwort"],
];
for (const [origin, scene, mark] of ancestry) {
  const character = rules.create("Tala", origin, "frau", 2, "priest");
  const opening = rules.choose(character, "lantern");
  assert.equal(opening.scene, scene);
  assert.deepEqual(ids(character), ["lantern"]);
  assert.ok(rules.choose(reload(opening), "prepare").marks.includes(mark));
  assert.ok(!rules.choose(opening, "move").marks.includes(mark));
}

const oldCharacter = { ...hero(), scene: "start" };
delete oldCharacter.role;
delete oldCharacter.balance;
assert.equal(reload(oldCharacter).role, "knight");
assert.equal(reload(oldCharacter).balance, 0);
assert.equal(reload(oldCharacter).scene, "start");
assert.throws(() => reload({ ...oldCharacter, role: "unknown" }));
assert.throws(() => reload({ ...oldCharacter, balance: 4 }));

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

const firstFlame = rules.strike({ ...inCombat, role: "mage" }, "ember");
assert.equal(firstFlame.balance, 2);
assert.equal(firstFlame.combat.health, 17);
const backlash = rules.strike(firstFlame, "ember");
assert.equal(backlash.balance, 3);
assert.equal(backlash.combat.health, firstFlame.combat.health);
const roots = rules.strike(firstFlame, "restore");
assert.equal(roots.balance, 0);
assert.equal(roots.combat.health, 13);
const settled = rules.strike(firstFlame, "guard");
assert.equal(settled.balance, 1);
const ward = rules.strike(inCombat, "restore");
assert.equal(ward.health, inCombat.health);
const healed = rules.strike({ ...inCombat, health: 10, role: "priest", balance: 2 }, "restore");
assert.equal(healed.balance, 0);
assert.ok(healed.health > 10);
const tooMuchHealing = rules.strike({ ...inCombat, role: "priest", balance: -2 }, "restore");
assert.equal(tooMuchHealing.balance, -3);
assert.match(tooMuchHealing.journal.at(-2), /außer Kontrolle/);
assert.equal(reload(tooMuchHealing).role, "priest");

const elf = rules.create("Tala", "waldelf", "frau", 2);
const elfStart = rules.choose(rules.choose(elf, "lantern"), "prepare");
const elfDetour = rules.choose(rules.choose(elfStart, "go"), "detour");
assert.equal(rules.choose(elfDetour, "trace", () => .2).scene, "ford");
const vampire = rules.create("Tala", "vampir", "frau", 2);
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
assert.equal(restedYard.health, rules.maxHealth(yard.origin));
assert.equal(restedYard.ember, rules.maxEmber(yard.origin));
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
assert.equal(rules.strike(troll, "spear", highRoll).combat.health, 67);
assert.equal(rules.strike(troll, "torch").combat.health, 62);

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

const attributes = { agility: 4, will: 2 };
const world = vm.runInContext("world", context);
assert.equal(Object.keys(world.classes).length, 9);
for (const [id, cls] of Object.entries(world.classes)) {
  const fresh = rules.create("Tala", "untot", "frau", 1, id, attributes);
  assert.equal(fresh.equipment.weapon, cls.weapon);
  assert.equal(reload(fresh).allocation.agility, 4);
  assert.equal(rules.emberLimit(fresh), 7);
}
assert.throws(() => rules.create("Tala", "untot", "frau", 2, "ranger", attributes));
assert.throws(() => rules.create("Tala", "untot", "frau", 1, "ranger", { will: 7 }));
assert.throws(() => rules.create("Tala", "untot", "frau", 1, "ranger", { will: 5 }));
const updated = rules.buildLegacy(yard, "ranger", attributes);
assert.equal(updated.scene, yard.scene);
assert.equal(updated.role, "ranger");
assert.ok(yard.inventory.every(item => updated.inventory.includes(item)));
assert.equal(rules.weapon(updated), "bogen");
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
const apprentice = { ...yard, xp: 75, training: {} };
assert.equal(rules.progression(apprentice).level, 2);
assert.equal(rules.progression(apprentice).points, 1);
const trained = rules.train(apprentice, "strength");
assert.equal(reload(trained).training.strength, 1);
assert.equal(rules.healthLimit(trained), rules.healthLimit(apprentice) + 3);
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

const teamLead = rules.create("Tala", "waldelf", "frau", 1, "priest", attributes);
assert.ok(!rules.candidates({ ...teamLead, scene: "arrival" }).some(([id]) => id === "priest"));
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
assert.throws(() => reload({ ...atYard, party: ["priest"] }));
assert.equal(rules.dismiss(group, "mage"), group);
assert.equal(rules.recruit(rules.promise(rules.dismiss(atYard, "mage"), "knight"), "knight").party.length, 5);

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
const nextRound = [];
rules.strike(reload(shot), "guard", highRoll, undefined, 0, nextRound);
assert.equal(nextRound.find(event => event.actor === "ranger").value, 5);
const trollWithAllies = rules.choose(rules.choose(atYard, "ravine"), "ravine-fight");
assert.ok(rules.strike(trollWithAllies, "guard").combat.supportUsed.includes("mage"));
const healerTrial = trial({ ...yard, party: ["priest"], role: "warrior" });
const healedByAlly = rules.strike({ ...healerTrial, health: 10, combat: { ...healerTrial.combat, bleeding: 2 } }, "guard");
assert.equal(healedByAlly.combat.bleeding, 0);
assert.ok(healedByAlly.health > 10);

const patrol = rules.choose(rules.choose(atYard, "toll"), "toll-fight");
assert.equal(rules.targets(patrol).length, 4);
assert.deepEqual(Array.from(rules.targets(reload(patrol)), target => target.id), [0, 1, 2, 3]);
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

const withIven = rules.recruit(rules.promise({ ...teamLead, scene: "watch-yard" }, "knight"), "knight");
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

console.log("Gefährtenaufträge, Beziehungsfolgen, Geschenke, Romanze, Fraktionsruf und Skarnheim geprüft.");
