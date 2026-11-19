"use strict";

// Spezifikation 2.6.0–2.6.16 (Henry, 19. 11. 2026): Schwester-Zweige, Fraktions-Spezialisierung, Akt 4, Armada,
// Meister-Talentbäume, Tier-3/4-Ausrüstung mit Handschuh-Platz.
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

test("Akt 2 und 3: Schwester-Zweige, Wahl, Rohstoffe, Boss und Fraktions-Spezialisierung", () => {
  let s = held("kronreich", "krieger", 25);
  const info = rules.akteInfo(s);
  assert.equal(info.grund, null);
  assert.equal(info.zweige.map((z) => z.fraktion).join(), "orden,haefen");
  assert.equal(rules.zweigGrund(s, "haefen", "good"), "weiter in Perlvik");
  assert.equal(rules.akteInfo(held("kronreich", "krieger", 4)).grund, "ab Stufe 5");
  s = bei(s, "perlvik");
  const ruf = SY.ruf(s, "haefen");
  s = kaempfen(rules.zweigWeiter(s, "haefen", "good"));
  assert.equal(s.akte.zweige.haefen.stufe, 1);
  assert.equal(s.akte.zweige.haefen.akt, 2);
  assert.equal(SY.ruf(s, "haefen"), ruf + 12);
  assert.ok(s.marks.includes("schutzbund-haefen"));
  // Gegner auf Stufe 6–10 im ersten Zweig.
  const k = rules.zweigWeiter(s, "haefen");
  assert.equal(k.combat.gegnerStufe, 10);
  const holz = SY.kontor(s, "kronreich").holz;
  s = kaempfen(k);
  assert.equal(SY.kontor(s, "kronreich").holz, holz + 8);
  assert.match(rules.zweigGrund(bei(s, "glutberg"), "orden", "good"), /erst den Zweig/);
  s = kaempfen(rules.zweigWeiter(s, "haefen"));
  assert.ok(s.journal.some((t) => t.includes("Pilger in grauer Kutte")), "Thorvald bleibt unerkannt");
  assert.equal(rules.akteInfo(s).zweige[1].fertig, true);
  assert.equal(s.questStufe, 2);
  // Zweiter Zweig: Akt 3, Stufe 11–15.
  s = bei(s, "glutberg");
  let z = rules.zweigWeiter(s, "orden", "evil");
  assert.equal(z.combat.gegnerStufe, 15);
  s = kaempfen(z);
  assert.equal(s.akte.zweige.orden.akt, 3);
  s = kaempfen(rules.zweigWeiter(s, "orden"));
  s = kaempfen(rules.zweigWeiter(s, "orden"));
  assert.equal(s.questStufe, 3);
  const a = rules.akteInfo(s);
  assert.equal(a.fspezOffen, true);
  assert.equal(rules.fspezGrund(s, "FSPEC_SCHILDWALL_DER_KRONE"), "nicht freigeschaltet");
  s = reload(rules.fspezWaehlen(s, "FSPEC_MEISTER_DER_STURMFLUT"));
  assert.equal(s.akte.fspez, "FSPEC_MEISTER_DER_STURMFLUT");
  assert.equal(rules.ausweichIntervall(s), 9);
});

test("Geächtet: Söldnergeld statt Softlock", () => {
  let s = bei(held("kronreich", "krieger", 25), "perlvik");
  SY.rufAendern(s, "haefen", -60);
  s = reload({ ...s, silver: 100 });
  assert.match(rules.zweigGrund(s, "haefen", "good"), /150 Silber/);
  s = reload({ ...s, silver: 200 });
  const k = rules.zweigWeiter(s, "haefen", "evil");
  assert.equal(k.silver, 50);
  assert.ok(k.akte.zweige.haefen.soeldner);
});

test("Akt 4: Reichssiegel, Thorvald, Großes Thing, Kriegskasse und Tor zu Akt 5", () => {
  let s = held("orden", "krieger", 25, { knoten: "kronhall", akte: { zweige: { kronreich: { stufe: 3, akt: 2, wahl: "good", soeldner: false },
    haefen: { stufe: 3, akt: 3, wahl: "good", soeldner: false } }, fspez: null, akt4: { schritt: 0, siegel: [], wahlOffen: false, wahl: null } } });
  assert.match(rules.akt4Grund(s), /Fraktions-Spezialisierung/);
  s = reload(rules.fspezWaehlen(s, "FSPEC_SCHILDWALL_DER_KRONE"));
  for (const ort of ["kronhall", "glutberg", "perlvik"]) s = reload(rules.akt4Weiter(bei(s, ort)));
  assert.equal(s.akte.akt4.siegel.length, 3);
  s = kaempfen(rules.akt4Weiter(s));
  assert.equal(s.akte.akt4.schritt, 1);
  s = bei(s, "glutberg");
  const untote = rules.weltLeisten ? null : null;
  const vorher = s.weltLeisten?.untote ?? rules.leistenStart.untote;
  const boss = rules.akt4Weiter(s);
  assert.equal(boss.combat.gegnerStufe, 22);
  s = kaempfen(boss);
  assert.equal(s.akte.akt4.wahlOffen, true);
  assert.match(rules.akt4Grund(s), /Urteil/);
  s = reload(rules.akt4Weiter(s, "good_public_trial"));
  assert.equal(s.weltLeisten.untote, Math.max(0, vorher - 15));
  assert.ok(s.marks.includes("thorvald-entlarvt"));
  assert.match(SY.spendenGrund(s, "kronhall", "holz", 1) ?? "", /Thing|zu wenig/);
  s = reload(rules.akt4Weiter(bei(s, "kronhall")));
  assert.ok(s.marks.includes("bannerjarl"));
  assert.equal(rules.akteInfo(s).akt4.fertig, true);
  assert.equal(rules.armadaInfo(s).offen, true);
  assert.equal(rules.armadaInfo(s).tor, null);
  s = reload({ ...s, kriegskasse: { nahrung: 30, holz: 25, eisen: 25, stein: 20 } });
  assert.equal(rules.armadaInfo(s).tor.titel, "Die Segel der Armada sind gesetzt");
  void untote;
});

test("Meister-Talentbäume: alte Talente werden übernommen, Ränge wirken", () => {
  let s = held("kronreich", "krieger", 30, { talente: { MT_EISENWALL: 2, MT_KLINGENSTURM: 1 } });
  assert.equal(JSON.stringify(s.talente), JSON.stringify({ TREE_EISERNE_VORHUT: 1, TREE_UNGEBROCHENER_SCHILDWALL: 2 }));
  assert.equal(rules.ausweichIntervall(s), 9);
  s = reload(rules.talentLernen(s, "TREE_UNGEBROCHENER_SCHILDWALL"));
  const a = rules.aushang(s).find((x) => x.spiel.gegner && !x.spiel.weg);
  const k = rules.auftragAusfuehren(rules.auftragAnnehmen(s, a.id), a.id);
  assert.equal(JSON.stringify(k.combat.held.todesschutz), JSON.stringify({ lp: 1, runden: 99, schild: 0.2 }));
});

test("Tier 3/4: Handschuh-Platz, Klassenrechte, Stadtstufe beim Händler", () => {
  const g = SY.daten.gegenstaende;
  assert.equal(g.GLV_T4_RUNENGRIFF_HANDSCHUHE.slot, "HAENDE");
  let s = held("kronreich", "schurke", 20);
  s = reload({ ...s, inventory: [...s.inventory, "GLV_T4_RUNENGRIFF_HANDSCHUHE", "WPN_T4_RUNEN_REISSER", "ARM_T4_ASCHESTAHL_PLATTE"] });
  s = reload(rules.equip(s, "GLV_T4_RUNENGRIFF_HANDSCHUHE"));
  assert.equal(s.equipment.hands, "GLV_T4_RUNENGRIFF_HANDSCHUHE");
  assert.ok(rules.kritChance(s) >= 10);
  assert.equal(rules.ausruestungGrund(s, "WPN_T4_RUNEN_REISSER"), null);
  assert.match(rules.ausruestungGrund(s, "ARM_T4_ASCHESTAHL_PLATTE"), /nicht für/);
  const lp = rules.healthLimit(s);
  // Glutgegenstände bleiben dem Orden vorbehalten.
  assert.match(rules.ausruestungGrund(held("kronreich", "magier", 20), "WPN_T4_SONNENKERN_STAB") ?? "", /nicht für/);
  const laden = rules.ausruester(s);
  const t4 = laden.kaufen.find((x) => x.id === "HLM_T4_AHNENKRONE_VISIER");
  assert.equal(t4.grund, "erst ab Stadtstufe 2");
  assert.ok(lp > 0);
});
