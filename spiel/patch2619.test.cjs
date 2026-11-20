"use strict";

// Patch 2.6.19 (Henry, 20. 11. 2026): Entscheidungen B1–B11 zur Fehler- und Logikliste (quellen/henry/v2619/).
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
const world = vm.runInContext("world", context);
const reload = (state) => rules.read(JSON.stringify(state));
const held = (faction, role, stufe, extra = {}) => {
  const s = { ...rules.create("Tala", faction, "frau", 1, role), scene: "weltknoten", knoten: "kronhall", xp: SY.epFuer(stufe),
    hauptquest: { schritt: { kronreich: 3, orden: 4, haefen: 4 }[faction], wahl: { kronreich: "kron_act1_truce", orden: "orden_act1_mercy", haefen: "haefen_act1_guild" }[faction] },
    questStufe: 1, ...extra };
  return reload({ ...s, health: rules.healthLimit(s) });
};
const bei = (s, knoten) => reload({ ...s, knoten, health: rules.healthLimit(s) });
function kaempfen(s) {
  assert.ok(s.combat, "Kampf beginnt");
  assert.ok(reload(s).combat, "Kampf ist speicherbar");
  // Der Ablauf wird geprüft, nicht die Balance: der Held kämpft mit vollen LP weiter.
  for (let i = 0; s.combat && i < 300; i++) s = rules.strike({ ...s, health: rules.healthLimit(s) }, "spear", () => 0.99);
  assert.equal(s.scene, "weltknoten", "Kampf gewonnen");
  return reload({ ...s, health: rules.healthLimit(s) });
}


const akt4Stand = { zweige: { orden: { stufe: 3, akt: 2, wahl: "good", soeldner: false }, haefen: { stufe: 3, akt: 3, wahl: "good", soeldner: false } },
  fspez: "FSPEC_SCHILDWALL_DER_KRONE", akt4: { schritt: 0, siegel: [], wahlOffen: false, wahl: null } };

test("B1: Ascherisse öffnen als Bannerjarl", () => {
  const s = held("orden", "krieger", 22, { knoten: "brandstein", questStufe: 3 });
  const grund = (x) => rules.endgameListe(x).find((e) => e.id === "ascheriss")?.grund;
  assert.equal(grund(s), "erst als Bannerjarl (nach Akt 4)");
  assert.equal(grund(reload({ ...s, questStufe: 4, marks: [...s.marks, "bannerjarl"] })), null);
});

test("B2: Stadtausbau nach abgeschlossenen Akten", () => {
  const kontor = { kronreich: { nahrung: 50, holz: 200, eisen: 200, stein: 200, runensplitter: 10 } };
  const s = (questStufe, ruf, siedlung = 0) => reload({ ...held("kronreich", "krieger", 15, { questStufe, silver: 5000, kontor,
    factionRuf: { groves: ruf }, siedlungen: siedlung ? { kronhall: siedlung } : {} }), knoten: "kronhall" });
  assert.equal(rules.siedlungInfo(s(1, 45)).ausbauGrund, "erst nach Akt 2");
  assert.notEqual(rules.siedlungInfo(s(2, 30)).ausbauGrund, null);
  assert.equal(rules.siedlungInfo(s(2, 45)).ausbauGrund, null);
  assert.equal(rules.siedlungInfo(s(2, 45, 1)).ausbauGrund, "erst nach Akt 3");
  assert.equal(rules.siedlungInfo(s(3, 45, 1)).ausbauGrund, null);
});

test("B3: Folgen der Akt-1-Wahl in Akt 2 und 3", () => {
  // Kronreich, harte Wahl: Ragnvald misstraut dem Hof (Akt 2), Preise im Kronreich +10 %, Aushang „Schatten im Rat“ in Hagenfels.
  let s = bei(held("kronreich", "krieger", 10, { hauptquest: { schritt: 3, wahl: "kron_act1_fight" }, marks: ["kron_act1_fight"] }), "perlvik");
  const preis = SY.preisFaktor(s, "kronreich", true);
  const start = rules.zweigWeiter(s, "haefen", "good");
  assert.ok(start.journal.some((t) => t.includes("Ragnvald mustert dich kalt")));
  s = kaempfen(start);
  assert.ok(s.marks.includes("ragnvald_misstraut_hof"));
  assert.equal(SY.preisFaktor(s, "kronreich", true), preis * 1.1);
  const rat = rules.aushang(bei(s, "hagenfels")).find((a) => a.id === "nq_kronreich_schatten_im_rat");
  assert.equal(rat.grund, null);
  assert.equal(rules.aushang(bei(held("kronreich", "krieger", 10), "hagenfels")).some((a) => a.id === rat.id), false);

  // Kronreich, Gnade: erst in Akt 3 tritt der Kultist als Elite hinzu und bringt 4 Runensplitter.
  let g = held("kronreich", "krieger", 15, { marks: ["kron_act1_truce"], akte: { zweige: { haefen: { stufe: 3, akt: 2, wahl: "good", soeldner: false } },
    fspez: null, akt4: { schritt: 0, siegel: [], wahlOffen: false, wahl: null } }, questStufe: 2 });
  g = bei(g, "glutberg");
  const k = rules.zweigWeiter(g, "orden", "good");
  assert.ok(k.marks.includes("kultist_unentdeckt"));
  assert.ok(k.combat.feinde.some((f) => f.name === "Aschenkultist-Infiltrator" && f.rang === "elite"));
  assert.ok(k.combat.feinde.length <= 4);
  const splitter = SY.kontor(g, "kronreich").runensplitter;
  assert.equal(SY.kontor(kaempfen(k), "kronreich").runensplitter, splitter + 4);

  // Orden: Gnade schaltet Schutz- und Heilrunen frei, Zorn die offensiven Glutrunen.
  let o = bei(held("orden", "heiler", 10, { marks: ["orden_act1_mercy"], kontor: { orden: { nahrung: 0, holz: 0, eisen: 0, stein: 0, runensplitter: 3 } } }), "kronhall");
  o = kaempfen(rules.zweigWeiter(o, "kronreich", "good"));
  assert.equal(rules.runenListe(bei(o, "glutberg")).map((r) => r.id).join(), "rune_des_lichtwalls,rune_der_mildtätigen_glut");
  o = reload(rules.runeEinpraegen(bei({ ...o, silver: 500 }, "glutberg"), "rune_des_lichtwalls"));
  assert.equal(o.runen.join(), "rune_des_lichtwalls");
  assert.equal(rules.runenListe(o)[0].grund, "schon eingeprägt");
  let w = bei(held("orden", "krieger", 10, { marks: ["orden_act1_wrath"] }), "kronhall");
  w = kaempfen(rules.zweigWeiter(w, "kronreich", "good"));
  assert.equal(rules.runenListe(bei(w, "glutberg")).map((r) => r.id).join(), "rune_des_aschenzorns,rune_der_brennenden_schneide");

  // Häfen: Gilde +15 % Zehnt (Akt 2), Schmuggler −20 % Söldner und Schiffe ohne Vertrag (Akt 3).
  let h = bei(held("haefen", "schurke", 10, { marks: ["haefen_act1_guild"] }), "kronhall");
  h = kaempfen(rules.zweigWeiter(h, "kronreich", "good"));
  assert.ok(h.marks.includes("gilden_patronat"));
  let sch = held("haefen", "schurke", 15, { marks: ["haefen_act1_shadow"], questStufe: 2,
    akte: { zweige: { kronreich: { stufe: 3, akt: 2, wahl: "good", soeldner: false } }, fspez: null, akt4: { schritt: 0, siegel: [], wahlOffen: false, wahl: null } } });
  const sold = rules.hireCost(sch, "x", 100);
  sch = kaempfen(rules.zweigWeiter(bei(sch, "glutberg"), "orden", "good"));
  assert.ok(sch.marks.includes("schmuggler_netzwerk"));
  assert.equal(rules.hireCost(sch, "x", 100), Math.round(sold * 0.8));
});

test("B3: Orden-Gnade gibt Ruf und Moral statt Glaube", () => {
  const glaube = SY.daten.v2619.B3_akt1_wahlfolgen.ersetze_ressource_glaube.neu;
  assert.equal(glaube.fraktions_ruf_orden, 10);
  assert.equal(glaube.moral, 5);
});

test("B4: Gefährten späterer Akte erst in ihrem Akt", () => {
  const s = (questStufe, ort) => reload({ ...held("kronreich", "krieger", 3, { questStufe }), knoten: ort });
  assert.equal(rules.aushang(s(0, "rosshag")).find((a) => a.id === "rosshag_q10").grund, "erst ab Akt 2 (empfohlen Stufe 6–10)");
  assert.equal(rules.aushang(s(1, "rosshag")).find((a) => a.id === "rosshag_q10").grund, null);
  assert.equal(rules.aushang(s(1, "ulfsborg")).find((a) => a.id === "ulfsborg_q10").grund, "erst ab Akt 3 (empfohlen Stufe 11–15)");
  assert.equal(rules.aushang(s(2, "ulfsborg")).find((a) => a.id === "ulfsborg_q10").grund, null);
  assert.equal(rules.aushang(s(0, "kronhall")).find((a) => a.id === "kronhall_q10").grund, null);
});

test("B5–B7: Fenris Späher, Varg der Eidlose, Akt-Stufen", () => {
  assert.equal(world.companions.fenris.klasse, "spaeher");
  const namen = Object.values(SY.daten.gegnerRegionen).flatMap((r) => r.gegner.map((g) => g.name));
  assert.ok(namen.includes("Varg der Eidlose"));
  assert.ok(!namen.includes("Wulfgar der Eidlose"));
  const reihe = vm.runInContext("nebenquests", context).reihe("kronreich");
  assert.equal(reihe.akte.filter((a) => !a.freieReihenfolge).map((a) => a.stufen).join(), "1-5,16-22,20-26");
});

test("B8: Thorvald auf Stufe 18–22 mit ±6 % LP und ±5 % Schaden je Stufe", () => {
  const t = (stufe) => rules.gegnerAufstellung("auftrag-thorvald", 2, stufe, stufe)[0];
  assert.equal(t(20).max, 148);
  assert.equal(t(20).deckel, 16);
  assert.equal(t(20).flaecheDeckel, 11);
  assert.equal(t(18).max, Math.round(148 * 0.88));
  assert.equal(t(22).deckel, Math.round(16 * 1.1));
  assert.equal(t(22).ruestung, 7);
  let s = held("kronreich", "krieger", 16, { knoten: "glutberg", akte: { ...akt4Stand, akt4: { schritt: 1, siegel: ["kronhall", "glutberg", "perlvik"], wahlOffen: false, wahl: null } } });
  assert.equal(rules.akt4Weiter(s).combat.gegnerStufe, 18);
  s = held("kronreich", "krieger", 30, { knoten: "glutberg", akte: { ...akt4Stand, akt4: { schritt: 1, siegel: ["kronhall", "glutberg", "perlvik"], wahlOffen: false, wahl: null } } });
  assert.equal(rules.akt4Weiter(s).combat.gegnerStufe, 22);
});

test("B9: Heiler und Magier höchstens 2 Heilungen, Krieger und Schurke robuster", () => {
  assert.equal(rules.ausweichIntervall(held("kronreich", "schurke", 10, { party: ["sigrid"] })), 5);
  assert.equal(rules.ausweichIntervall(held("kronreich", "krieger", 10)), 6);
  assert.equal(rules.ausweichIntervall(held("kronreich", "magier", 10, { party: ["sigrid"] })), 0);
  let s = rules.choose({ ...held("orden", "heiler", 10), scene: "toll", health: 5 }, "toll-fight");
  const heal = rules.abilities(s).find((f) => f.regel?.heilung);
  assert.ok(heal, "Heilfähigkeit");
  s = { ...s, combat: { ...s.combat, held: { ...s.combat.held, heilungen: 2 } } };
  assert.equal(rules.abilityState(s, heal.id), "höchstens 2 Heilungen je Kampf");
});

test("B10: Waffen nach Tier gestaffelt (Angriff = Waffe + 6)", () => {
  const angriff = (id) => world.gear[id].power + 6;
  assert.equal(world.gear.axt.power + 6, 12);
  assert.equal(angriff("WPN_RUNENKLINGE_T2"), 17);
  for (const g of Object.values(SY.daten.gegenstaende)) {
    if (world.gear[g.id]?.slot !== "weapon" || !g.tier) continue;
    const t = SY.daten.v2619.B10_waffen_tier_staffelung.tiers.find((x) => x.tier === g.tier);
    assert.ok(angriff(g.id) >= t.angriff.min && angriff(g.id) <= t.angriff.max, g.id + " " + angriff(g.id));
    assert.ok(g.baseBuyPrice >= t.preis_silber.min && g.baseBuyPrice <= t.preis_silber.max, g.id + " Preis " + g.baseBuyPrice);
  }
});
