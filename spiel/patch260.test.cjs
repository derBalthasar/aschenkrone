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
for (const file of ["bestiarium/daten.js", "spiel/klassen.js", "spiel/faehigkeiten.js", "spiel/kampf.js", "spiel/startpunkte.js", "spiel/welt.js", "spiel/knoten-daten.js", "spiel/knoten.js", "spiel/nebenquests-daten.js", "spiel/nebenquests.js", "spiel/systeme-daten.js", "spiel/systeme.js", "spiel/akt-dialoge.js", "spiel/regeln.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const rules = vm.runInContext("rules", context);
const SY = rules.systeme;
rules.setTravelDice(() => 0);
const reload = (state) => rules.read(JSON.stringify(state));
const held = (faction, role, stufe, extra = {}) => {
  const s = { ...rules.create("Tala", faction, "frau", 1, role), scene: "weltknoten", knoten: "kronhall", xp: SY.epFuer(stufe),
    hauptquest: { schritt: { kronreich: 3, orden: 4, haefen: 4 }[faction], wahl: { kronreich: "kron_act1_truce", orden: "orden_act1_mercy", haefen: "haefen_act1_guild" }[faction] },
    // v3.0.5: Die Gastgeber-Gespräche und die Szene am Sternenanker gelten hier als geführt (eigene Tests in regeln.test.cjs).
    szenen: { "zweig:kronreich": "test", "zweig:orden": "test", "zweig:haefen": "test", "akt4:malakor": "malakor_sturmangriff" },
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
  const bossStart = rules.zweigWeiter(s, "haefen");
  assert.ok(bossStart.journal.some((t) => t.includes("Pilger in grauer Kutte")), "Thorvald bleibt unerkannt");
  assert.equal(bossStart.combat.feinde[0].rang, "elite");
  s = kaempfen(bossStart);
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
  assert.equal(rules.ausweichIntervall(s), 5); // Patch 2.6.19: Krieger jeder 6., Sturmflut −1
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
  s = reload(rules.akt4Weiter(bei(s, "kronhall"), "kriegsrat_annehmen"));
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
  assert.equal(rules.ausweichIntervall(s), 5); // Patch 2.6.19: Krieger jeder 6., Schildwall −1
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

test("Lagerfeuer: Meilenstein, persönliche Szene nach 4 Etappen, Lagerszene mit Stärkung", () => {
  let s = held("kronreich", "krieger", 12, { party: ["sigrid"], lagerMeilenstein: "CAMP_MILESTONE_SISTER_REALMS", ressource: 40 });
  s = reload(rules.rast(s));
  assert.equal(rules.lagerSzeneInfo(s).meilenstein, true);
  const moral = SY.moral(s);
  s = reload(rules.lagerAntwort(s, "WEITER"));
  assert.equal(SY.moral(s), Math.min(SY.daten.moral.max, moral + 8));
  assert.equal(s.lagerSzene, null);
  // Persönliche Szene: Sigrid (Platz 1, Front) nach 4 gemeinsamen Etappen.
  s = reload({ ...s, gefaehrtenEtappen: { sigrid: 4 } });
  s = reload(rules.rast(s));
  const p = rules.lagerSzeneInfo(s);
  assert.equal(p.id, "PSCENE_KR_BROKEN_BANNER");
  s = reload(rules.lagerAntwort(s, "KR_C1_HONOR"));
  assert.ok(s.gefaehrtenPerks.includes("PERK_KR_SCHILDTREUE"));
  assert.equal(rules.lagerVorteile(s)[0].name, "Schildtreue der Mark");
  // Lagerszene (Würfel 0 → 65 %-Probe gelingt): Krieger/Wächter am Schleifstein, Stärkung für den nächsten Kampf.
  s = reload(rules.rast(s));
  assert.equal(rules.lagerSzeneInfo(s).id, "CAMP_WARRIOR_WHETSTONE");
  s = reload(rules.lagerAntwort(s, "RESP_WARRIOR_COIN"));
  assert.equal(s.lagerBuff.damage_bonus_pct, 8);
  const a = rules.aushang(s).find((x) => x.spiel.gegner && !x.spiel.weg);
  const k = rules.auftragAusfuehren(rules.auftragAnnehmen(s, a.id), a.id);
  assert.equal(k.combat.held.lagerBuff.damage_bonus_pct, 8);
  assert.equal(k.lagerBuff, null);
});

test("Spielstand mit trainierter Willenskraft und Spezialisierung in Mut bleibt ladbar", () => {
  let s = held("kronreich", "krieger", 10);
  for (let i = 0; i < 6; i++) s = rules.train(s, "will");
  const spez = rules.specialize(s, "a", "mind", "mut");
  assert.notEqual(spez, s);
  assert.doesNotThrow(() => reload(spez));
});

test("Tränke zeigen Werte in der Spielskala", () => {
  assert.equal(rules.effektText("POT_HEILUNG_1"), "Tier 1 · Stellt im Kampf 10 LP wieder her.");
  assert.equal(rules.effektText("POT_HEILUNG_2"), "Tier 2 · Stellt im Kampf 24 LP wieder her und entfernt Blutung.");
  assert.match(rules.effektText("POT_MANA_1"), /^Tier 1 · Stellt im Kampf \d+ Mana/);
});

test("Patch 2.6.17/2.6.18: Gegnerzahl nach Gruppengröße, Thorvald, Akt-Skalierung", () => {
  const anzahl = (party) => rules.gegnerAufstellung("auftrag-deserteure", party, 10, 10);
  assert.equal(anzahl(0).length, 2);
  assert.equal(anzahl(1).length, 2);
  assert.ok(anzahl(2).length >= 2 && anzahl(2).length <= 3);
  assert.ok(anzahl(3).length >= 3 && anzahl(3).length <= 4);
  const zwei = anzahl(1);
  assert.equal(zwei[1].lp, Math.round(zwei[0].lp * 0.9));
  const vier = anzahl(3);
  if (vier.length === 4) assert.equal(vier[3].lp, Math.round(vier[0].lp * 0.75));
  const t = rules.gegnerAufstellung("auftrag-thorvald", 2, 20, 20);
  assert.equal(t.length, 3);
  assert.equal(t[0].lp, 148);
  assert.equal(t[0].ruestung, 7);
  assert.ok(t[0].schaden <= 16);
  assert.equal(t[1].lp, 45);
  assert.ok(t[1].schaden <= 9);
  // Zweig-Boss: 125 % LP, Schaden höchstens aufgerundet Heldenstufe × 1,15.
  let s = bei(reload({ ...held("kronreich", "krieger", 15), akte: { zweige: { haefen: { stufe: 2, akt: 2, wahl: "good", soeldner: false } },
    fspez: null, akt4: { schritt: 0, siegel: [], wahlOffen: false, wahl: null } } }), "perlvik");
  const k = rules.zweigWeiter(s, "haefen");
  const roh = rules.gegnerAufstellung("auftrag-kaperkapitaen", s.party.length, k.combat.gegnerStufe, rules.level(s))[0];
  assert.equal(k.combat.feinde[0].lp, Math.round(roh.lp * 1.25));
  assert.ok(k.combat.feinde[0].schaden <= Math.ceil(rules.level(s) * 1.15));
});
