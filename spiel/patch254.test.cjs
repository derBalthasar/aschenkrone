"use strict";

// Patch 2.5.4 (Henry, 19. 11. 2026): Niederlage, Glut nur für den Orden, Ersatzproben, Solo- und Bossbalance, Auftragsbuch.
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
const world = vm.runInContext("world", context);
rules.setTravelDice(() => 0);
const reload = (state) => rules.read(JSON.stringify(state));
const ids = (state) => Array.from(rules.choices(state), (choice) => choice.id);
const held = (faction, role = "krieger", extra = {}) => {
  const state = rules.create("Tala", faction, "frau", 1, role);
  return { ...state, ...extra };
};
const imOrt = (faction, ort, extra = {}) => held(faction, "krieger", { scene: "weltknoten", knoten: ort, xp: 300, ...extra });
const highRoll = () => 0.99;
const lowRoll = () => 0;

test("Glut und Gleichgewicht nur für den Orden der Flamme", () => {
  const orden = held("orden");
  assert.equal(orden.ember, 5);
  assert.equal(rules.emberLimit(orden), 10);
  for (const faction of ["kronreich", "haefen"]) {
    const state = held(faction);
    assert.equal(state.ember, 0, faction);
    assert.equal(rules.emberLimit(state), 0, faction);
    assert.equal(rules.glutgabe(state), false, faction);
  }
  // Alte Spielstände des Kronreichs mit Glut und verschobenem Gleichgewicht bleiben ladbar.
  const alt = reload({ ...held("kronreich"), scene: "watch-yard", ember: 4, balance: 2 });
  assert.equal(alt.ember, 0);
  assert.equal(alt.balance, 0);
  assert.throws(() => reload({ ...held("kronreich"), balance: 4 }), /beschädigt/);
  // Andere Völker behalten ihre Glut.
  assert.ok(rules.emberLimit(held("tiefgraeber")) > 0);
});

test("Jorens Rettung: Glut für den Orden, Proben auf Stärke oder Geschick für die anderen", () => {
  const orden = { ...held("orden"), scene: "pass-shelter" };
  assert.ok(ids(orden).includes("rescue-ember"));
  assert.ok(!ids(orden).includes("rescue-strength"));
  const ember = rules.choose(orden, "rescue-ember");
  assert.ok(ember.marks.includes("joren-gerettet"));
  assert.equal(ember.balance, 1);
  assert.equal(ember.ember, 4);
  assert.equal(rules.reputation(ember, "watch"), 42);
  assert.equal(world.scenes["pass-shelter"].choices.find((c) => c.id === "rescue-ember").label, "[· 1 Glut] Die Wunde mit geweihter Flamme ausbrennen");

  for (const faction of ["kronreich", "haefen"]) {
    const state = { ...held(faction), scene: "pass-shelter" };
    assert.ok(!ids(state).includes("rescue-ember"), faction);
    assert.ok(ids(state).includes("rescue-strength") && ids(state).includes("rescue-lever"), faction);
    const stark = rules.choose(state, "rescue-strength", highRoll);
    assert.ok(stark.marks.includes("joren-gerettet"));
    assert.equal(stark.scene, "pass");
    assert.equal(rules.reputation(stark, "watch"), 42);
    assert.ok(stark.journal.some((eintrag) => eintrag.startsWith("Stärke ")), stark.journal.join(" | "));
    const fehl = rules.choose(state, "rescue-lever", lowRoll);
    assert.equal(fehl.scene, "pass-shelter");
    assert.ok(!fehl.marks.includes("joren-gerettet"));
    assert.ok(!ids(fehl).includes("rescue-lever"), "kein zweiter Versuch mit dem Hebel");
    assert.ok(ids(fehl).includes("rescue-strength"));
    assert.equal(reload(fehl).scene, "pass-shelter");
  }
});

test("Saatstreifen, Runentor und Wachfeuer ohne Glut", () => {
  const krone = held("kronreich");
  const feld = { ...krone, scene: "ash-field" };
  assert.deepEqual(ids(feld), ["soil-hands", "leave"]);
  assert.ok(rules.choose(feld, "soil-hands", highRoll).marks.includes("saat-erholt"));
  assert.deepEqual(ids({ ...held("orden"), scene: "ash-field" }), ["balance", "force", "leave"]);
  const tor = { ...krone, scene: "skarn-runes" };
  assert.ok(ids(tor).includes("skarn-wedge") && !ids(tor).includes("skarn-balance"));
  assert.equal(rules.choose(tor, "skarn-wedge", highRoll).scene, "skarn-aftermath");
  assert.ok(rules.choose(tor, "skarn-wedge", highRoll).marks.includes("runen-geschuetzt"));
  const camp = (state) => rules.choices({ ...state, scene: "watch-yard" }).find((c) => c.id === "camp");
  assert.equal(camp(krone).label, "Am Wachfeuer rasten · LP auffüllen");
  assert.equal(camp(held("orden")).label, "Am Wachfeuer rasten · LP und Glut auffüllen");
});

test("Freie Häfen: Wahl B startet mit 15 Silber, toter Link an der Zollstelle entfernt", () => {
  const wahl = { ...held("haefen"), scene: "wahl-haefen" };
  assert.equal(rules.choose(wahl, "wahl-b").silver, 15);
  assert.ok(!world.scenes.toll.choices.some((c) => c.id === "toll-revisit"));
});

test("Niederlage: aus dem Staub kriechen oder Wegpunkt laden", () => {
  // Gefallen in der Weltreise, letzte Zuflucht Heidvang.
  let state = imOrt("kronreich", "kronhall", { silver: 101, moral: 60 });
  state = { ...state, health: rules.healthLimit(state) };
  const kampf = rules.auftragAusfuehren(rules.auftragAnnehmen(state, "kronhall_q04"), "kronhall_q04");
  assert.ok(kampf.combat);
  let gefallen = { ...kampf, health: 1, combat: { ...kampf.combat, feinde: kampf.combat.feinde.map((f) => ({ ...f, schaden: 99 })) } };
  for (let i = 0; i < 5 && gefallen.scene !== "defeat"; i++) gefallen = rules.strike(gefallen, "spear", lowRoll);
  assert.equal(gefallen.scene, "defeat");
  assert.equal(gefallen.gefallenIn, "weltknoten");
  assert.equal(world.scenes.defeat.text, "Stahl und Staub schmecken nach Blut. Deine Deckung bricht, und Schwärze schlägt über dir zusammen. Doch der Tod nimmt dich heute noch nicht.");
  assert.deepEqual(ids(gefallen), ["retreat"]);
  gefallen = reload(gefallen);
  const auf = rules.choose(gefallen, "retreat");
  assert.equal(auf.health, 1);
  assert.equal(auf.silver, Math.floor(gefallen.silver * 0.75));
  assert.equal(auf.moral, gefallen.moral - 20);
  assert.equal(auf.combat, null);
  assert.equal(auf.scene, "weltknoten");
  assert.equal(auf.knoten, "kronhall", "ohne Reise ist die eigene Hauptstadt die Zuflucht");
  assert.equal(auf.weltAuftraege.kronhall_q04.status, "aktiv", "der Auftrag bleibt offen");
  assert.equal(reload(auf).health, 1);

  // Gefallen in einer Geschichte mit Weltort: Erwachen in der Zuflucht, die Geschichte wartet an ihrem Ort.
  const geschichte = { ...held("kronreich", "krieger", { zuflucht: "heidvang" }), scene: "defeat", health: 0, gefallenIn: "return-field" };
  const zurueck = rules.choose(reload(geschichte), "retreat");
  assert.equal(zurueck.scene, "weltknoten");
  assert.equal(zurueck.knoten, "heidvang");
  assert.equal(zurueck.handlung.szene, "return-field");
  assert.equal(zurueck.handlung.knoten, "kornwik");
  assert.equal(reload(zurueck).handlung.szene, "return-field");
  // Ohne Weltort (Eispass, Prolog) kommt der Held dort wieder zu sich, wo er gefallen ist.
  const pass = rules.choose(reload({ ...geschichte, gefallenIn: "pass-shelter" }), "retreat");
  assert.equal(pass.scene, "pass-shelter");
  assert.equal(pass.health, 1);

  // Reisen in eine sichere Stadt merkt die Zuflucht.
  assert.throws(() => reload({ ...geschichte, zuflucht: "nirgendwo" }), /beschädigt/);
});

test("Solo: höchstens 2 Gegner, gesetzte dritte Gegner geschwächt", () => {
  let state = imOrt("kronreich", "kronhall");
  state = { ...state, health: rules.healthLimit(state) };
  const auftrag = rules.auftragAusfuehren(rules.auftragAnnehmen(state, "kronhall_q04"), "kronhall_q04");
  assert.equal(auftrag.combat.feinde.length, 2);
  // Die Deserteure an der Zollstelle sind ein Kampf der Geschichte: der dritte kämpft geschwächt.
  const zoll = rules.choose({ ...held("kronreich"), scene: "toll", health: 30 }, "toll-fight");
  const feinde = zoll.combat.feinde;
  assert.equal(feinde.length, 3);
  assert.ok(feinde[2].name.endsWith("(geschwächt)"));
  assert.equal(feinde[2].max, Math.round(feinde[1].max * 0.5));
  assert.equal(feinde[2].schaden, Math.max(1, Math.round(feinde[1].schaden * 0.75)));
  assert.equal(reload(zoll).combat.feinde.length, 3);
});

test("Einsamer Wolf: Späher allein weichen jedem 7. Angriff aus und treffen härter", () => {
  const kampf = (role) => {
    const s = rules.choose({ ...held("kronreich", role), scene: "toll", health: 999 }, "toll-fight");
    return { ...s, health: 999, combat: { ...s.combat, feinde: s.combat.feinde.map((f) => ({ ...f, lp: 9999, max: 9999 })) } };
  };
  let spaeher = kampf("spaeher");
  for (let i = 0; i < 6; i++) spaeher = rules.strike(spaeher, "guard", lowRoll);
  assert.ok(spaeher.journal.some((e) => e.includes("Einsamer Wolf")));
  let krieger = kampf("krieger");
  for (let i = 0; i < 6; i++) krieger = rules.strike(krieger, "guard", lowRoll);
  assert.ok(!krieger.journal.some((e) => e.includes("Einsamer Wolf")));
});

test("Bosse: Skarn und der Letzte Mammut auf Stufe 11", () => {
  const skarn = rules.gegnerAufstellung("auftrag-skarn", 0, 11);
  assert.equal(skarn[0].max, 68);
  assert.equal(skarn[0].schaden, 11);
  assert.equal(skarn[0].aktionen, 2);
  const mammut = rules.gegnerAufstellung("auftrag-letztermammut", 0, 11);
  assert.equal(mammut[0].max, Math.round(83 * 0.85));
  assert.equal(mammut[0].schaden, 11);
  assert.equal(world.fights["auftrag-letztermammut"].special.name, "Trampeln");
  assert.equal(world.fights["auftrag-letztermammut"].special.deckel, 13);
});

test("Ausdauer: 15, ab Stufe 6 alle 3 Stufen +1", () => {
  const krieger = held("kronreich");
  assert.equal(rules.kraft(krieger).ausdauer, 15);
  assert.equal(rules.kraft({ ...krieger, xp: 1500 }).ausdauer, 16);
  assert.equal(rules.kraft({ ...krieger, xp: 4500 }).ausdauer, 17);
});

test("Auftragsbuch: höchstens 5 offene Aushänge, sinkender Lohn nach 10 Aufträgen", () => {
  let state = imOrt("kronreich", "kronhall");
  state = { ...state, health: rules.healthLimit(state) };
  for (const id of ["kronhall_q02", "kronhall_q03", "kronhall_q04", "kronhall_q05", "kronhall_q06"]) state = rules.auftragAnnehmen(state, id);
  assert.equal(rules.auftraege(state).length, 5);
  assert.equal(rules.auftragGrund(state, "kronhall_q07"), "Dein Auftragsbuch ist voll (max. 5 offene Aushänge). Schließe erst laufende Aufträge ab.");
  assert.equal(rules.auftragAnnehmen(state, "kronhall_q07"), state);

  // Zwölf erledigte Aufträge: der 13. bringt 91 % des Silbers.
  const erledigt = {};
  for (const ort of ["kornwik", "heidvang", "eiswacht"]) {
    for (const eintrag of rules.aushang(imOrt("kronreich", ort))) if (Object.keys(erledigt).length < 12) erledigt[eintrag.id] = { status: "erledigt", wahl: 0 };
  }
  assert.equal(Object.keys(erledigt).length, 12);
  let voll = { ...imOrt("kronreich", "kronhall"), weltAuftraege: erledigt };
  voll = { ...voll, health: rules.healthLimit(voll) };
  const fertig = rules.auftragAusfuehren(rules.auftragAnnehmen(voll, "kronhall_q01", 1), "kronhall_q01");
  assert.equal(fertig.silver, voll.silver + Math.round(55 * 0.91));
  assert.ok(reload(fertig));
});
