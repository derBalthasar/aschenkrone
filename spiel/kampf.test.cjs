"use strict";

// Tests für das Kampfdokument (17. 11. 2026): Fähigkeiten aller 90 Klassen, Stufen, LP, Ausdauer, Mana, Gegnerwerte.
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
const kampf = vm.runInContext("kampf", context);
const F = vm.runInContext("faehigkeiten", context);
const K = vm.runInContext("klassen", context);
const highRoll = () => 0.99;
// Werte aus dem vm-Kontext vergleichbar machen.
const same = (actual, expected, message) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, message);
const reload = (state) => rules.read(JSON.stringify(state));

// ---- Daten: 15 Fraktionen × 6 Klassen × 6 Fähigkeiten ----
same(Object.keys(F.fraktionen).sort(), Object.keys(K.fraktionen).sort());
let count = 0;
for (const [faction, data] of Object.entries(F.fraktionen)) {
  same(Object.keys(data.klassen).sort(), [...K.klassenFolge].sort(), faction);
  for (const role of K.klassenFolge) {
    const list = kampf.klassenFaehigkeiten(faction, role);
    assert.equal(list.length, 6, faction + " " + role);
    same(list.map((f) => f.stufe), [1, 3, 6, 10, 15, 20]);
    // Kronreich und Freie Häfen bezahlen alles mit Ausdauer.
    if (!K.fraktionen[faction].magie) assert.ok(list.every((f) => f.zahlung === "A"), faction);
    for (const f of list) {
      count++;
      assert.ok(f.name && f.wirkung, faction + " " + role + " " + f.stufe);
      // Jede Fähigkeit hat mindestens eine Regelwirkung.
      const r = f.regel;
      assert.ok(r.schaden !== undefined || r.heilung || r.hot || r.schild || r.dot || r.diener || r.staerkung || r.naechster ||
        r.unsichtbar || r.furcht || r.betaeuben || r.verlangsamen || r.verspotten || r.schwaechen || r.verwundbar ||
        r.zielAngriff || r.todesschutz, faction + " " + role + " " + f.name + ": " + f.wirkung);
      // Menschen: Henrys Klassen (18. 11. 2026), Grundschaden 6 × Multiplikator.
      if (f.stufe === 1) assert.ok(K.fraktionen[faction].volk === "menschen" ? r.schaden >= 6 : [4, 6].includes(r.schaden), f.name);
    }
  }
}
assert.equal(count, 540);
for (const volk of Object.keys(K.voelker)) assert.equal(F.meister[volk].length, 2, volk);

// Stichproben aus dem Kampfdokument.
const ability = (faction, role, stufe) => kampf.klassenFaehigkeiten(faction, role).find((f) => f.stufe === stufe);
same(ability("faeulnisbrut", "magier", 3).regel.diener, { anzahl: 1, lp: 8, schaden: 3, runden: 2, name: "Gebundener", koeder: false });
// Menschen: neue Klassen nach Henry (Patch 2.0.0), Stufe 15/20 = Signatur der Spezialisierung.
assert.equal(K.fraktionen.kronreich.klassen.krieger.name, "Blutritter der Krone");
assert.equal(ability("kronreich", "krieger", 6).regel.ziele, "alle");
assert.equal(ability("kronreich", "krieger", 1).regel.dot.wert, 2);
assert.equal(ability("orden", "magier", 1).zahlung, "M");
assert.equal(ability("kronreich", "schurke", 10).regel.treffer, 3);
assert.equal(ability("hof", "krieger", 20).regel.todesschutz.lp, 12);
assert.equal(ability("dornenklingen", "krieger", 3).regel.treffer, 2);
assert.equal(ability("aschenclan", "magier", 3).regel.staerkung.wert, 2);

// ---- Machtbudget ----
same([1, 3, 6, 10, 15, 20].map((stufe) => kampf.budget[stufe].punkte), [6, 10, 14, 18, 24, 36]);
same([1, 3, 6, 10, 15, 20].map((stufe) => kampf.budget[stufe].kosten), [0, 3, 4, 5, 6, 8]);
same([3, 6, 10, 15].map((stufe) => kampf.budget[stufe].abklingzeit), [1, 2, 3, 4]);
assert.equal(kampf.budget[20].ressource, 3);

// ---- Erfahrungsstufen: 100 × n EP von Stufe n auf n+1, bis Stufe 20 zusammen 19.000 ----
assert.equal(kampf.epFuer(20), 19000);
assert.equal(kampf.epFuer(3), 300);
assert.equal(kampf.stufeAus(0), 1);
assert.equal(kampf.stufeAus(299), 2);
assert.equal(kampf.stufeAus(300), 3);
assert.equal(kampf.stufeAus(1000000), 20);

// ---- Lebenspunkte je Rolle ----
const lp = (profil, stufe) => kampf.lebenspunkte(profil, stufe);
same([lp("waechter", 1), lp("waechter", 20)], [40, 97]);
same([lp("krieger", 1), lp("krieger", 20)], [34, 91]);
same([lp("schurke", 1), lp("schurke", 20)], [28, 66]);
same([lp("spaeher", 1), lp("spaeher", 20)], [26, 64]);
same([lp("feldscher", 1), lp("heiler", 20)], [26, 64]);
same([lp("skalde", 1), lp("magier", 20)], [22, 60]);
// Menschen (Patch 2.4.0): Henrys Grund-LP ÷ 3,5 (Blutritter 130 → 37, Runenskalde 100 → 29), Zuwachs wie bisher.
const huskarl = rules.create("Tala", "kronreich", "frau", 1, "krieger");
assert.equal(rules.healthLimit(huskarl), 37);
assert.equal(rules.healthLimit({ ...huskarl, xp: 19000 }), 94);
assert.equal(rules.healthLimit(rules.create("Tala", "kronreich", "frau", 1, "magier")), 29);
assert.equal(rules.healthLimit(rules.create("Brom", "tiefgraeber", "mann", 0, "krieger")), 34, "andere Völker unverändert");

// ---- Ausdauer und Mana ----
// Patch 2.5.4: Menschen 15 Ausdauer, ab Stufe 6 alle 3 Stufen +1 (Stufe 20: 15 + 5).
same(rules.kraft(huskarl), { ausdauer: 15, mana: 0 });
same(rules.kraft({ ...huskarl, xp: 1500 }), { ausdauer: 16, mana: 0 });
same(rules.kraft({ ...huskarl, xp: 19000 }), { ausdauer: 20, mana: 0 });
const priest = rules.create("Tala", "orden", "frau", 1, "magier");
// Pyromant (Patch 2.4.0): 12 + Willenskraft + Intelligenz/2.
const priestWerte = rules.heroAttributes(priest);
assert.equal(rules.kraft(priest).mana, 12 + priestWerte.will + Math.floor(priestWerte.mind / 2));
assert.equal(rules.kraft(rules.create("Tala", "orden", "frau", 1, "schurke")).mana, 0, "Schatten-Vollstrecker ohne Mana");
assert.equal(rules.resourceName(priest), "Nahrung", "Menschen: Vorrat ist Nahrung (Henry, 18. 11. 2026)");
// Fraktionsressource und Kampfressource sind ein Vorrat von 0 bis 100, Start 42 (Technische Spezifikation).
assert.equal(priest.ressource, 42);

// ---- Gegnerwerte ----
const foe = (rang, stufe, helden) => ({ ...kampf.gegnerWerte(rang, stufe, helden) });
same(foe("mitlaeufer", 5), { rang: "mitlaeufer", stufe: 5, lp: 21, schaden: 5, aktionen: 1 });
same(foe("elite", 5), { rang: "elite", stufe: 5, lp: 50, schaden: 6, aktionen: 1 });
same(foe("elite", 8), { rang: "elite", stufe: 8, lp: 80, schaden: 8, aktionen: 1 });
same(foe("anfuehrer", 12), { rang: "anfuehrer", stufe: 12, lp: 360, schaden: 16, aktionen: 2 });
same(foe("endgegner", 20), { rang: "endgegner", stufe: 20, lp: 900, schaden: 24, aktionen: 2 });
assert.equal(foe("anfuehrer", 12, 5).lp, 450);
assert.equal(foe("anfuehrer", 12, 3).lp, 270);
assert.equal(kampf.morbius.phasen.reduce((sum, phase) => sum + phase.lp, 0), kampf.morbius.lp);

// ---- Kampf ----
const fightAs = (character) =>
  rules.choose(rules.choose(rules.choose(rules.choose(character, "lantern"), "move"), "go", highRoll), "fight");
// Alle Kampftests laufen an der Kornwik-Begegnung, unabhängig vom Startpunkt der Fraktion.
const hero = (faction, role, xp = 0) => ({ ...rules.create("Tala", faction, "frau", 1, role), scene: "start", xp });
const full = (state) => ({ ...state, health: rules.healthLimit(state) });
const keilerFight = (faction, role, xp = 0) => {
  const state = fightAs(full(hero(faction, role, xp)));
  return { ...state, health: rules.healthLimit(state) };
};

// Der Keiler ist eine Elite der Stufe 2: 20 LP, 5 Schaden.
const start = keilerFight("kronreich", "krieger");
assert.equal(start.combat.feinde[0].max, 20);
assert.equal(start.combat.feinde[0].schaden, 5);
assert.equal(start.combat.held.ausdauer, 15);
same(rules.abilities(start).filter((f) => f.frei).map((f) => f.id), ["f1"]);

// Grundangriff: Schaden der Stufe-1-Fähigkeit + Nahkampf + Bonus aus Stärke + Waffe (Axt 6: +1).
// Beim Blutritter der Krone ist das der Scharfrichter-Hieb (6 × 1,4 = 8).
const values = rules.heroAttributes(start);
const f1Schaden = rules.abilities(start).find((f) => f.id === "f1").regel.schaden;
assert.equal(f1Schaden, 8);
const expected = f1Schaden + start.build.fertigkeiten.nahkampf + rules.modifier(values.strength) + 1;
const basic = rules.strike(start, "spear", highRoll);
// Dazu blutet der Keiler am Rundenende für 2.
assert.equal(basic.combat.feinde[0].lp, 20 - expected - 2);
assert.equal(rules.strike(start, "f1", highRoll).combat.feinde[0].lp, 20 - expected - 2);
// Nicht freigeschaltete Fähigkeiten gehen nicht.
assert.equal(rules.strike(start, "f3"), start);

// Stufe 3: Blutrausch der Ahnen kostet 3 Ausdauer und hat 1 Runde Abklingzeit, Ausdauer füllt sich um 2.
const level3Kampf = keilerFight("kronreich", "krieger", 300);
const level3 = { ...level3Kampf, combat: { ...level3Kampf.combat, feinde: [{ ...level3Kampf.combat.feinde[0], lp: 500, max: 500 }] } };
assert.equal(rules.progression(level3).level, 3);
const shove = rules.strike(level3, "f3", highRoll);
assert.equal(rules.kraft(level3).ausdauer, 15); // Patch 2.5.4: Menschen erst ab Stufe 6 +1
assert.equal(shove.combat.held.ausdauer, 15 - 3 + 2);
assert.equal(rules.abilityState(shove, "f3"), "Abklingzeit 1");
assert.equal(rules.strike(shove, "f3"), shove);
const afterCooldown = rules.strike(shove, "guard");
assert.equal(rules.abilityState(afterCooldown, "f3"), null);
assert.ok(shove.journal.some((entry) => /Blutrausch der Ahnen: \d+ Schaden/.test(entry)));

// Verstärken mit Fraktionsressource: +25 % Wirkung für 1 Korn.
const boosted = rules.strike(level3, "f3+", highRoll);
assert.equal(boosted.ressource, level3.ressource - 1);
assert.ok(boosted.combat.feinde[0].lp < shove.combat.feinde[0].lp);
const poor = { ...level3, ressource: 0 };
assert.equal(rules.strike(poor, "f3+"), poor);
// Verstärken drückt den Vorrat nie unter 1.
const last = { ...level3, ressource: 1 };
assert.equal(rules.strike(last, "f3+"), last);
assert.equal(rules.strike({ ...level3, ressource: 2 }, "f3+", highRoll).ressource, 1);
assert.equal(rules.strike(level3, "f1+"), level3);

// Stufe 20: einmal pro Schlacht, 8 Ausdauer und 3 Fraktionsressource.
// Bei den Menschen ist Stufe 20 die Signaturfähigkeit der Spezialisierung (Rang 3), ohne Spezialisierung gesperrt.
const legendOhne = keilerFight("kronreich", "krieger", 19000);
assert.equal(rules.abilities(legendOhne).find((f) => f.id === "f20").frei, false);
const legend = { ...legendOhne, build: { ...legendOhne.build, spez: { variante: "a", grundwert: "strength" } } };
assert.equal(rules.abilities(legend).find((f) => f.id === "f20").name, "Königliches Richturteil (Rang 3)");
assert.ok(!rules.abilities(legend).some((f) => f.id === "f15"), "Rang 3 ersetzt Rang 2");
const legendStart = { ...legend, combat: { ...legend.combat, feinde: [{ ...legend.combat.feinde[0], lp: 500, max: 500 }] } };
const storm = rules.strike(legendStart, "f20", highRoll);
assert.equal(storm.ressource, legendStart.ressource - 3);
assert.equal(rules.abilityState(storm, "f20"), "schon genutzt");
assert.equal(rules.abilityState({ ...legendStart, ressource: 2 }, "f20"), "zu wenig Nahrung");
assert.equal(rules.abilityState({ ...legendStart, ressource: 3 }, "f20"), "zu wenig Nahrung");
assert.equal(rules.abilityState({ ...legendStart, ressource: 4 }, "f20"), null);
// Grundangriff steigt auf den Stufen 4, 8, 12, 16 und 20 um je +1.
assert.equal(rules.kampfwerte(legend).grundangriff, 5);

// Intelligenz-Bonus senkt die Kosten, mindestens 1.
const clever = keilerFight("runenschmiede", "magier", 300);
assert.ok(rules.modifier(rules.heroAttributes(clever).mind) >= 1);
assert.ok(rules.abilities(clever).find((f) => f.id === "f3").kostenWert < 3);

// Spezialisierung A verstärkt die Stufe-6-Fähigkeit um 50 %.
// (Bei den Menschen ersetzt die Signaturfähigkeit diese Verstärkung, deshalb hier die Schattenblüte mit dem Schlafpfeil.)
const lasso = keilerFight("schattenbluete", "spaeher", 1500);
const lassoSpez = { ...lasso, build: { ...lasso.build, spez: { variante: "a", grundwert: "agility" } } };
assert.ok(rules.abilities(lassoSpez).find((f) => f.id === "f6").spezialisiert);
assert.ok(!rules.abilities(lassoSpez).find((f) => f.id === "f10").spezialisiert);
// Kontrollwirkung: 1 Runde kürzere Abklingzeit.
assert.equal(rules.abilities(lassoSpez).find((f) => f.id === "f6").abklingzeitWert, 1);

// Betäuben: der Keiler greift nicht an, danach ist er eine Runde immun.
const tough = { ...lasso, combat: { ...lasso.combat, feinde: [{ ...lasso.combat.feinde[0], lp: 500, max: 500 }] } };
const stunned = rules.strike(tough, "f6", highRoll);
assert.equal(stunned.health, tough.health);
const recovered = rules.strike(stunned, "guard");
assert.equal(recovered.combat.feinde[0].status.immunBis, recovered.combat.round);

// Unsichtbarkeit schützt vor Angriffen und endet beim ersten Angriff.
const thief = keilerFight("kronreich", "schurke", 300);
const hidden = rules.strike(thief, "f3", highRoll);
assert.equal(hidden.health, thief.health);
assert.ok(hidden.combat.held.unsichtbar > 0);
const ambush = rules.strike(hidden, "f1", highRoll);
assert.equal(ambush.combat?.held.unsichtbar ?? 0, 0);

// Beschworene Wesen: höchstens drei gleichzeitig.
const necro = keilerFight("faeulnisbrut", "magier", 300);
const necroLong = { ...necro, combat: { ...necro.combat, feinde: [{ ...necro.combat.feinde[0], lp: 500, max: 500 }],
  held: { ...necro.combat.held, mana: 30 } } };
let raised = rules.strike(necroLong, "f3", highRoll);
assert.equal(raised.combat.diener.length, 1);
assert.equal(raised.combat.diener[0].name, "Gebundener");
raised = rules.strike(rules.strike(raised, "guard"), "guard");
assert.ok(raised.combat.diener.length <= kampf.maxDiener);

// Heilung hebt nie über die höchsten LP.
const healer = keilerFight("orden", "heiler", 300);
assert.equal(rules.strike(healer, "f3", highRoll).health <= rules.healthLimit(healer), true);
const hurt = { ...healer, health: 5 };
assert.ok(rules.strike(hurt, "f3", highRoll).health > 5);

// Schild fängt Schaden ab und verfällt nach 3 Runden.
const warden = keilerFight("tiefes-koenigreich", "waechter", 1500);
const walled = rules.strike(warden, "f6", highRoll);
assert.equal(walled.health, warden.health);
assert.ok(walled.combat.held.schild > 0);

// Initiative: wer das höhere Geschick hat, handelt zuerst. Der Eisenborstenkeiler (Geschick 12) ist schneller als ein Huskarl.
assert.ok(start.combat.gegnerZuerst);
assert.ok(start.journal.some((entry) => /greift zuerst an/.test(entry)));

// Jede Klasse kann im Kampf jede ihrer Fähigkeiten einsetzen, der Spielstand bleibt gültig.
for (const faction of Object.keys(K.fraktionen)) {
  for (const role of K.klassenFolge) {
    // Menschen mit Spezialisierung, damit auch die Signaturfähigkeit (Stufe 20) frei ist.
    let held = full(hero(faction, role, 19000));
    if (K.fraktionen[faction].volk === "menschen") {
      held = Object.keys(K.fertigkeiten).flatMap((fert) => Object.keys(K.grundwerte).map((wert) => [fert, wert]))
        .map(([fert, wert]) => rules.specialize(held, "a", wert, fert)).find((next) => next.build.spez) ?? held;
      assert.ok(held.build.spez, faction + " " + role + " Spezialisierung");
    }
    let state = fightAs(held);
    state = { ...state, health: rules.healthLimit(state), ressource: 20,
      combat: { ...state.combat, feinde: [{ ...state.combat.feinde[0], lp: 2000, max: 2000 }] } };
    const ids = rules.abilities(state).map((f) => f.id);
    for (const id of ["f20", "f15", "f10", "f6", "f3", "f1"].filter((id) => ids.includes(id))) {
      state = { ...state, health: rules.healthLimit(state), combat: { ...state.combat, held: { ...state.combat.held, abklingen: {}, heilungen: 0,
        ausdauer: rules.kraft(state).ausdauer, mana: rules.kraft(state).mana } } };
      const next = rules.strike(state, id, highRoll);
      assert.notEqual(next, state, faction + " " + role + " " + id + " " + rules.abilityState(state, id));
      assert.equal(reload(next).combat.id, "keiler", faction + " " + role + " " + id);
      state = next;
    }
  }
}

// Meisterfähigkeiten: Meister I sofort, Meister II ab Stufe 20.
const master = { ...keilerFight("hueter", "spaeher", 1500) };
master.build = { ...master.build, spez: { variante: "a", grundwert: "agility" }, meister: { grundwerte: { mind: 2 } } };
same(rules.abilities(master).filter((f) => f.meister).map((f) => [f.id, f.frei]), [["m1", true], ["m2", false]]);
assert.equal(rules.abilities(master).find((f) => f.id === "m1").name, "Dorn, Nebel und Wurzel");

// Sieg: 50 EP für die Schlacht und 10 EP je Gegnerstufe, dazu 1 Fraktionsressource.
let won = keilerFight("kronreich", "krieger");
const xpBefore = won.xp;
for (let turn = 0; turn < 20 && won.combat; turn++) won = rules.strike(won, "spear", highRoll);
assert.equal(won.scene, "ford");
assert.equal(won.xp - xpBefore, 50 + 10 * 2);
assert.equal(won.ressource, 43);

// Alte Spielstände (Version 2): EP bleiben, Stufe ergibt sich neu, offene Grundwertpunkte bleiben erhalten.
const old = { ...rules.create("Tala", "kronreich", "frau", 1, "waechter"), version: 2, xp: 410, training: { strength: 1 }, health: 20 };
delete old.stufenpunkte;
delete old.ressource;
delete old.weltLeisten;
const upgraded = reload(old);
assert.equal(upgraded.version, 3);
assert.equal(rules.progression(upgraded).level, 3);
assert.equal(upgraded.stufenpunkte, 3);
assert.equal(upgraded.ressource, 42);
same(upgraded.weltLeisten, { untote: 35, orks: 40, glut: 30, erzfieber: 45, welke: 30 });
assert.ok(upgraded.health > 0 && upgraded.health <= rules.healthLimit(upgraded));
const trained = rules.train(upgraded, "will");
// Patch 2.5.5: Menschen verbrauchen Stufenpunkte nicht mehr; frei = 2 je Stufe + alte Punkte − trainierte Grundwerte.
assert.equal(rules.progression(trained).points, rules.progression(upgraded).points - 1);
assert.equal(reload(trained).training.will, 1);


// EP-Schnittstelle für Prologe und Questakte: einmal je Kennung, Stufenaufstieg mit neuen Fähigkeiten.
{
  const start = full(hero("kronreich", "krieger"));
  const once = rules.awardXp(start, "prolog-test");
  assert.equal(once.xp, 300);
  assert.equal(rules.level(once), 3);
  assert.equal(rules.awardXp(once, "prolog-test").xp, 300);
  assert.equal(rules.awardXp(once, "prolog-test-2", 50).xp, 350);
  assert.equal(start.xp, 0);
  assert.ok(reload(once));
}
console.log("Kampftests bestanden: " + count + " Fähigkeiten geprüft.");

// Integration: neue Klassenfähigkeiten heilen das ausgewählte Gruppenmitglied.
{
  let healer = full(hero("hueter", "heiler", 1000));
  healer.party = ["ranger"];
  healer.partyVitals = { ranger: { health: 3, status: {} } };
  healer = fightAs(healer);
  healer.health = rules.healthLimit(healer);
  const spell = rules.abilities(healer).find(entry => entry.frei && entry.regel.heilung && !rules.abilityState(healer, entry.id));
  assert.ok(spell, "Verfügbare direkte Heilfähigkeit");
  const events = [];
  const healed = rules.strike(healer, spell.id, highRoll, undefined, undefined, events, "ranger");
  assert.ok(events.some(event => event.kind === "heal" && event.ally === "ranger"));
  assert.ok(reload(healed));
  const fallen = { ...healer, partyVitals: { ranger: { health: 0, status: {} } } };
  assert.equal(rules.strike(fallen, spell.id, highRoll, undefined, undefined, [], "ranger"), fallen);
}

assert.ok(rules.effects({ ...hero("orden", "waechter"), heroStatus: { burn: 2 } })
  .some(effect => effect.id === "burn" && effect.name === "Brand" && effect.dauer === "Noch 2 Runden"));

// ---- Errata 17. 11. 2026: Alphatiere ohne Werte und Tagschwäche der Vampire ----
same(kampf.alphaWerte(12), { rang: "anfuehrer", stufe: 12, lp: 360, schaden: 16, aktionen: 2 });
assert.equal(kampf.alphaWerte(12, 1).lp, 90, "Alphatier gegen einen Helden: 25 % der LP");
assert.equal(kampf.tagesWert(20, true, true), 15);
assert.equal(kampf.tagesWert(20, true, false), 20);
assert.equal(kampf.tagesWert(20, false, true), 20);
assert.match(JSON.stringify(K), /Meisterheld pro ehemaliger Fraktion gilt nur im Strategiemodus/, "Errata 7: Meisterklasse im Einzelspiel");
