"use strict";

// Erzeugt spiel/systeme-daten.js aus quellen/henry/systeme/ (Henrys Spielsysteme der Menschen, 18. 11. 2026).
// Die Nachträge 1.6.0 bis 2.2.0 gehen den Word-Dateien vor. Aufruf: node quellen/systeme-erzeugen.cjs
const fs = require("node:fs");
const path = require("node:path");

const Q = path.join(__dirname, "henry", "systeme");
const lies = (name) => JSON.parse(fs.readFileSync(path.join(Q, name + ".json"), "utf8"));
const nebenquests = require("../spiel/nebenquests.js");
const knoten = require("../spiel/knoten.js");

const p160a = lies("patch-1.6.0-teil1");
const p160b = lies("patch-1.6.0-teil2");
const p161 = lies("patch-1.6.1");
const p200 = lies("patch-2.0.0").decisions;
const p210 = { ...lies("patch-2.1.0").decisionsPart1, ...lies("patch-2.1.0").decisionsPart2 };
const p220 = lies("patch-2.2.0");
const p240 = lies("patch-2.4.0").normalizationRule;
const oekonomie = lies("oekonomie-1");
const katalog = lies("oekonomie-2");
const ressourcen = lies("ressourcen");
const ruf1 = lies("ruf-1");
const ruf2 = lies("ruf-2");
const bau = lies("bau-strategie");
const endgame = lies("endgame");
const stufen = lies("stufen-prestige");

const fehler = [];
const pruefe = (bedingung, text) => { if (!bedingung) fehler.push(text); };

// ---- Fraktionen und Städte ----
const fraktionVon = { KRONREICH: "kronreich", ORDEN_DER_FLAMME: "orden", FREIE_HAEFEN: "haefen",
  "Kronreich": "kronreich", "Orden der Flamme": "orden", "Freie Häfen": "haefen" };
const ortId = (name) => {
  const id = knoten.nachName[name];
  pruefe(id, "Ort fehlt im Knotennetz: " + name);
  return id;
};
const rohstoffVon = { nahrung: "nahrung", holz: "holz", eisen: "eisen", stein: "stein", food: "nahrung", wood: "holz",
  iron: "eisen", stone: "stein", silver: "silber", RES_NAHRUNG: "nahrung", RES_HOLZ: "holz", RES_EISEN: "eisen",
  RES_STEIN: "stein", RES_RUNENSPLITTER: "runensplitter" };
const kosten = (obj) => Object.fromEntries(Object.entries(obj ?? {}).filter(([, n]) => n).map(([k, n]) => [rohstoffVon[k] ?? k, n]));

// ---- Rohstoffe im Kontor (Patch 2.0.0 Punkt 5) ----
const rohstoffe = {};
for (const r of oekonomie.kontorResources) {
  rohstoffe[rohstoffVon[r.id]] = { id: r.id, name: r.name, kauf: r.baseBuyPrice, verkauf: r.baseSellPrice,
    buendel: r.bulkBundleSize, buendelPreis: r.bulkBuyPrice };
}

// ---- Ruf (Ruf-Datei 2.0, Preise aus der Ökonomie-Datei, Patch 2.0.0 Punkt 7, Patch 2.1.0 Punkt 3) ----
const preisRang = Object.fromEntries(oekonomie.reputationPriceModifiers.map((r) => [r.rankId.toLowerCase(), r]));
const rufRaenge = ruf1.reputationSystem.ranks.map((r) => {
  const p = preisRang[r.id];
  const e = r.effects;
  return { id: r.id, name: r.name, min: r.min, max: r.max, kauf: p.buyMultiplier, verkauf: p.sellMultiplier,
    schmiede: p.smithingCostMultiplier, handel: r.id !== "geaechtet", zehnt: e.protectorateTitheActive,
    zehntBonus: e.titheBonus ?? 0, torzoll: e.cityGateTollSilber, freieRast: e.freeCityRest,
    eisenRabatt: e.blacksmithEisenDiscount, kopfgeld: e.bountyHunterAmbushChance };
});
const rufAusloeser = Object.fromEntries(ruf1.reputationSystem.nonQuestTriggers.map((t) => [t.id, { text: t.label, ruf: t.reputationDelta }]));
rufAusloeser.complete_reconstruction.ruf = p200["7_minorNumberConflictsResolution"].villageRebuildReputationGain;
const taten = Object.fromEntries(ruf1.questMoralityLayer.choices.map((c) => [{ good_deed: "gut", pragmatic_deed: "pragmatisch", bad_deed: "boese" }[c.id],
  { name: c.alignment, text: c.prompt, ruf: c.reputationDelta, silber: c.silberMultiplier, rohstoffe: c.instantBonusResources, befreit: c.unlocksVillageProtectorate }]));

const fraktionsHandel = {};
for (const [key, r] of Object.entries(oekonomie.factionTradeRules)) {
  fraktionsHandel[fraktionVon[key]] = { glut: r.canEquipGlutItems, runen: r.canEquipRunenItems, rabatt: r.discountCategories,
    rabattFaktor: r.discountMultiplier, glutVerkauf: r.glutItemSellMultiplier };
}

// ---- Reise, Hunger, Begegnungen (Ressourcen-Datei, Gegnerdatei, Patch 2.1.0 Punkt 7/8) ----
const reiseRegeln = lies("gegner-1").travelEncounterRules;
const n = ressourcen.resources.nahrung;
const reise = {
  nahrung: { kernland: n.dailyUse.travelCoreLandCost, dorf: n.dailyUse.travelVillageCost, grenzland: n.dailyUse.travelBorderLandCost,
    pass: n.dailyUse.travelPassCost },
  rast: n.dailyUse.campRestCost,
  hunger: { moral: p160a.partyMoraleSystem.moraleTriggers.find((t) => t.event === "TRAVEL_WITH_ZERO_FOOD_ENTKRAEFTET").delta,
    ausdauerKampfstart: n.starvationPenalty.combatStartStaminaPenalty },
  minibossChance: Object.fromEntries(Object.entries(reiseRegeln.minibossSpawnChanceOnEncounter).map(([k, v]) => [k.toLowerCase(), v])),
  minibossAbklingen: reiseRegeln.minibossCooldownEdges,
  signalfeuer: -0.15, grenzstrasseGefahr: 0.10,
};

// ---- Dörfer D01–D69 und Zehnt (Ruf-Datei 2.0, Patch 2.0.0 Punkt 6, Patch 2.1.0 Punkt 4) ----
const doerfer = {};
for (const d of [...ruf1.villages, ...ruf2.villages]) {
  const ende = nebenquests.daten.wegKennungen[d.edgeId];
  pruefe(ende, "Weg fehlt: " + d.edgeId);
  if (!ende) continue;
  const [stadt, dorf] = ende;
  pruefe(knoten.get(dorf)?.name === d.village, d.edgeId + ": Dorf heißt im Knotennetz " + knoten.get(dorf)?.name + ", nicht " + d.village);
  pruefe(stadt === ortId(d.city), d.edgeId + ": falsche Stadt");
  doerfer[dorf] = { kennung: d.edgeId, name: d.village, stadt, fraktion: fraktionVon[d.faction], rohstoff: d.resource, ertrag: d.baseYield };
}
pruefe(Object.keys(doerfer).length === 69, "Es sollten 69 Dörfer sein");
const zehnt = { etappen: p200["6_villageTitheAuthoritativeRule"].intervalTravelEdges, ruf: p200["6_villageTitheAuthoritativeRule"].requiredReputation,
  befreiung: "q01", befreiendeTaten: ["gut", "pragmatisch"] };

// ---- Wiederaufbau, Stadtzustände, Kriegskasse ----
const wiederaufbau = ruf2.reconstructionProjects.map((w) => ({ id: w.id, ort: ortId(w.city), fraktion: fraktionVon[w.faction],
  titel: w.title, kosten: kosten(w.cost), silber: w.rewards.silber, ruf: w.rewards.reputation, marke: w.rewards.cityFlag, wirkung: w.narrativeEffect }));
const stadtZustand = Object.fromEntries(Object.entries(p210["6_prologCityStates"]).map(([name, z]) => [ortId(name[0] + name.slice(1).toLowerCase()), { status: z.status, text: z.notes }]));
const kriegskasse = { abAkt: ruf2.armadaGoal.unlockAct, aufbruchAkt: ruf2.armadaGoal.departureAct, titel: ruf2.armadaGoal.title,
  bedarf: kosten(p210["2_armadaMainStoryProgression"].mandatoryForAct5Passage.warChestResources),
  verstaerkung: p210["2_armadaMainStoryProgression"].optionalFleetUpgrades.effect };

// ---- Moral (Patch 1.6.0, 1.6.1) ----
const m = p160a.partyMoraleSystem;
const moral = { min: m.minMorale, max: m.maxMorale, start: m.startingMorale,
  stufen: m.moraleStates.map((s) => ({ id: s.id, name: s.label, min: s.min, max: s.max, schaden: s.combatModifiers.damagePercent,
    krit: s.combatModifiers.critChance, ruestung: s.combatModifiers.armorPercent, hinterhalt: s.travelModifiers.ambushRiskBonus })),
  ausloeser: { hunger: -15, rast: 12, sieg: 4, bossSieg: 12, gefallen: -10, gut: 6, boese: -8 },
  geaechtet: { gut: p161.outlawRunRuleDefinition.moraleOverrides.QUEST_GOOD_DEED_DELTA, boese: p161.outlawRunRuleDefinition.moraleOverrides.QUEST_EVIL_DEED_DELTA },
  ausruestung: { OFF_SKALDENHORN_T2: { basis: 10, jeSieg: 2 }, OFF_AHNENHARFE_T4: { basis: 20, hunger: 0.5 } },
  reliktUntergrenze: { RELIC_HORN_ALTES_REICH: 40 } };

// ---- Gegenstände: Materialien, Schätze, Tränke, Ausrüstung, Relikte ----
const gegenstaende = {};
const add = (g, extra = {}) => { gegenstaende[g.id] = { ...g, ...extra }; };
for (const g of oekonomie.lootAndMaterials) add(g);
for (const g of oekonomie.consumables) add(g);
for (const g of p210["10_manaSystemAndPotions"].newManaPotions) add(g);
for (const g of katalog.equipmentCatalog) add(g);
add(p161.missingCatalogItemFix);
for (const g of katalog.partyRelics) add(g, { tier: 4 });
const ausruestungsRechte = Object.fromEntries(Object.entries(oekonomie.classEquipmentPermissions).map(([k, v]) => [k, { ruestung: v.armorTypes, waffen: v.weaponTypes }]));
const handwerk = [...oekonomie.fieldCraftingRecipes, p210["10_manaSystemAndPotions"].manaPotionFieldRecipe];
const schmiede = { schrott: oekonomie.smithingSystem.smeltScrapRecipe, stufen: oekonomie.smithingSystem.upgradeLevels };
for (const r of handwerk) for (const z of [...r.ingredients.map((i) => i.id), r.outputItemId]) pruefe(gegenstaende[z] || z.startsWith("RES_"), "Rezept " + r.id + ": " + z);

// ---- Gegner (Gegnerdatei 1.5.0, Silber und Beutestufen aus Patch 1.6.0) ----
const silberStufen = Object.fromEntries(p160b.numberListsAndRangesPatch.enemySilverAndTierLookup.map((e) => [e.enemyId, e]));
const gegnerRegionen = {};
for (const nr of [4, 5, 6]) {
  const d = lies("gegner-" + nr);
  const label = lies("gegner-" + (nr - 3)).regionLabel;
  const liste = [...d.regularEnemies.map((e) => ({ ...e, miniboss: false })), ...d.randomMinibosses.map((e) => ({ ...e, miniboss: true }))];
  gegnerRegionen[fraktionVon[d.factionRegion]] = { name: label, gegner: liste.map((e) => {
    const s = silberStufen[e.id];
    pruefe(s, "Silber fehlt für " + e.id);
    return { id: e.id, name: e.name, titel: e.title ?? null, familie: e.family, schwierigkeit: e.difficulty, miniboss: e.miniboss,
      minStufe: e.minLevel, maxStufe: e.maxLevel, orte: e.spawnEdges ?? null, werte: e.stats, schwaechen: e.weaknesses, resistenzen: e.resistances,
      faehigkeiten: e.skills, beute: { ...e.loot, silverRange: undefined, equipmentTierPool: undefined, silber: [s.silverMin, s.silverMax], stufen: [s.tierMin, s.tierMax] } };
  }) };
}
const beutePools = p160a.familyMaterialPools;
for (const r of Object.values(gegnerRegionen)) for (const g of r.gegner) pruefe(beutePools[g.beute.materialPoolRef], g.id + ": Beutepool " + g.beute.materialPoolRef);

// ---- Klassen der Menschen (Patch 2.0.0 Punkte 1–3, 2.1.0 Punkte 9–11, 2.2.0) ----
const rechteSchluessel = { kr_blutritter: "BLUTRITTER", kr_bastionaer: "EISERNER_BASTIONAER", kr_daemmerungsjaeger: "DAEMMERUNGSJAEGER",
  kr_runenskalde: "RUNENSKALDE", kr_wundmeister: "WUNDMEISTER", kr_nachtklinge: "NACHTKLINGE", odf_glutpaladin: "GLUTPALADIN",
  odf_eidwaechter: "EIDWAECHTER", odf_inquisitor: "INQUISITOR", odf_pyromant: "PYROMANT", odf_kleriker: "KLERIKER_DER_FLAMME",
  odf_schattenvollstrecker: "SCHATTEN_VOLLSTRECKER", fh_sturmkorsar: "STURMKORSAR", fh_tiefenwaechter: "TIEFENWAECHTER",
  fh_schwarzschuetze: "SCHWARZSCHUETZE", fh_pulveralchemist: "PULVER_ALCHEMIST", fh_seuchenmedikus: "SEUCHENMEDIKUS",
  fh_schattenfreibeuter: "SCHATTENFREIBEUTER" };
// Hauptgrundwert für die Schadensformel (Patch 2.1.0 Punkt 9): Nahkampf Stärke, Fernkampf und Schurken Geschick,
// Magie und Gebet Willenskraft, Alchemie und Taktik Intelligenz. Kraft → Stärke, Zähigkeit und Wille → Willenskraft.
const grundwertVon = { kraft: "strength", geschick: "agility", wille: "will", zaehigkeit: "will" };
const hauptwertAusnahmen = { fh_pulveralchemist: "mind", fh_seuchenmedikus: "mind", kr_wundmeister: "mind" };
// Mana (Patch 2.1.0 Punkt 10, 2.2.0): Feuer, Heilung, Gebete und Runenzauber kosten Mana, Waffen, Schüsse,
// Schurkentechniken, Schild und Alchemie Ausdauer. Zuordnung der einzelnen Fähigkeiten: eigene Auslegung.
const manaFaehigkeiten = new Set(["gp_2", "gp_3", "gp_4", "iq_2", "py_1", "py_2", "py_3", "py_4", "kl_1", "kl_2", "kl_3", "kl_4",
  "sig_sonnenfeuer_templer", "sig_aschenkreuzritter"]);
const manaKlassen = new Set(["odf_glutpaladin", "odf_inquisitor", "odf_pyromant", "odf_kleriker"]);
const klassen = {};
for (const [datei, fraktion] of [["kronreich", "kronreich"], ["orden", "orden"], ["haefen", "haefen"]]) {
  const basis = lies("klassen-" + datei + "-1");
  const spez = lies("klassen-" + datei + "-2");
  for (const k of basis.classes) {
    const optionen = spez.classSpecializations.find((s) => s.parentClassId === k.id)?.options ?? [];
    pruefe(optionen.length === 2, k.id + ": zwei Spezialisierungen erwartet");
    const name = k.id === "kr_blutritter" ? p200["2_nameCollisionFix"].newDisplayName : k.name;
    const manaKlasse = manaKlassen.has(k.id);
    const kosten = (s) => (manaKlasse && manaFaehigkeiten.has(s.id) ? "mana" : "ausdauer");
    // Für Henrys spätere Spezialisierungs-IDs (spec_odf_…) die Signaturfähigkeit in mana/ausdauer einordnen.
    if (manaKlasse && ["odf_pyromant", "odf_kleriker"].includes(k.id)) for (const o of optionen) manaFaehigkeiten.add(o.signatureSkill.id);
    if (k.id === "odf_glutpaladin") for (const o of optionen) manaFaehigkeiten.add(o.signatureSkill.id);
    klassen[k.id] = {
      id: k.id, fraktion, rolle: k.baseClass, name, rechte: rechteSchluessel[k.id],
      hauptwert: hauptwertAusnahmen[k.id] ?? grundwertVon[k.primaryStat], mana: manaKlasse,
      werte: { lp: k.combatStats.baseHp, ausdauer: k.combatStats.baseStamina, ruestung: k.combatStats.baseArmor,
        krit: k.combatStats.baseCritChance, ausweichen: k.combatStats.baseDodgeChance, initiative: k.combatStats.initiative },
      synergie: k.worldAndResourceSynergy,
      faehigkeiten: k.skills.map((s) => ({ ...s, kosten: kosten(s) })),
      spezialisierungen: optionen.map((o) => ({ ...o, signatureSkill: { ...o.signatureSkill, kosten: kosten(o.signatureSkill) } })),
    };
  }
}
pruefe(Object.keys(klassen).length === 18, "18 Klassen erwartet");
const signaturRaenge = lies("klassen-orden-2").specializationRules.signatureSkillRankScaling;

// ---- Bau: Phasen, Siedlungsstufen, Gebäude, Garnison (Bau-Datei, Patch 1.6.0, 1.6.1, 2.1.0 Punkte 5 und 7) ----
const gebaeude = Object.fromEntries(p160b.buildingsCatalog.map((g) => [g.id, { id: g.id, name: g.name, ort: g.locationType, phase: g.unlockPhase,
  ruf: g.requiredRep, kosten: kosten(g.cost), verteidigung: g.defenseBonus, wirkung: g.effect }]));
for (const [id, v] of Object.entries(p210["7_combinedBuildingsEffects"])) gebaeude[id].wirkung = v.combinedEffects.join(" ");
const siedlungsStufen = p160b.settlementTiers.map((t) => ({ stufe: t.tier, name: t.name, phase: t.unlockPhase, akt: t.requiredAct ?? 0,
  ruf: t.requiredRep, kosten: kosten(t.upgradeCost), verteidigung: t.baseDefense, plaetze: t.buildingSlots,
  wirkung: t.tier === 3 ? t.effects.replace("Armada-Werft", "Armada-Bau in der Kriegswerft") : t.effects }));
const g = p160b.garrisonAndRaidMechanics;
const garnison = { etappen: g.checkIntervalEdges, chance: g.raidChanceOnCheck, kosten: kosten(g.defenseCalculation.garrisonRecruitCostPerUnit),
  jeTruppe: g.defenseCalculation.garrisonRecruitCostPerUnit.defenseValue,
  staerke: { 1: [g.raidStrengthByAct.ACT_1.min, g.raidStrengthByAct.ACT_1.max], 2: [g.raidStrengthByAct.ACT_2.min, g.raidStrengthByAct.ACT_2.max],
    3: [g.raidStrengthByAct.ACT_3.min, g.raidStrengthByAct.ACT_3.max], 4: [g.raidStrengthByAct.ACT_4_AND_ENDGAME.min, g.raidStrengthByAct.ACT_4_AND_ENDGAME.max] },
  beute: { silber: [20, 45], bruchmetall: [1, 2] }, reparatur: { silber: 20, holz: 3 }, pause: 6, pluenderRuf: -5 };
delete garnison.kosten.defenseValue;
const phasen = bau.builderProgressionPhases.map((p) => ({ phase: p.phase, titel: p.title, bedingung: p.unlockCondition,
  text: p.narrativeTrigger ?? p.lockedMessage, kann: p.unlockedCapabilities }));
const vorgebaut = Object.fromEntries(p210["5_startingCitySmithies"].citiesWithPreBuiltSmithy.map((s) => [ortId(s[0] + s.slice(1).toLowerCase()), ["BLD_STADTSCHMIEDE"]]));

// ---- Endgame (Endgame-Datei, Patch 1.6.0, 1.6.1) ----
const eg = p160b.numberListsAndRangesPatch.endgameActivitiesSilverAndRewards;
const egAkt = Object.fromEntries(endgame.repeatableActivities.map((a) => [a.id, a]));
const endgameAktivitaeten = {
  patrouille: { name: egAkt.act_border_patrols.name, orte: egAkt.act_border_patrols.locations.map(ortId), abklingen: 0, ep: eg.GRENZPATROUILLE.xp,
    silber: [eg.GRENZPATROUILLE.silverMin, eg.GRENZPATROUILLE.silverMax], ruf: 3, rohstoff: { chance: 0.75, menge: 2, pool: ["eisen", "holz", "nahrung"] } },
  ascheriss: { name: egAkt.act_ash_rifts.name, abklingen: 4, wellen: 3, ep: eg.ASCHERISS_DUNGEON.xp, silber: [eg.ASCHERISS_DUNGEON.silverMin, eg.ASCHERISS_DUNGEON.silverMax],
    runensplitter: [eg.ASCHERISS_DUNGEON.guaranteedRunensplitterMin, eg.ASCHERISS_DUNGEON.guaranteedRunensplitterMax], ausruestung: 0.45, relikt: 0.15,
    orte: egAkt.act_ash_rifts.sites.map((s) => ({ id: s.id, name: s.name, ort: ortId(s.city), gegner: s.enemyTheme, beute: s.lootFocus })) },
  karawane: { name: "Karawanen-Eskorte", abklingen: 2, stufe: 2, ep: eg.KARAWANEN_ESKORTE.xp, silber: [eg.KARAWANEN_ESKORTE.silverMin, eg.KARAWANEN_ESKORTE.silverMax], wahlRohstoff: 3 },
  kaperfahrt: { name: "See-Kaperfahrt", abklingen: 2, kosten: 5, gebaeude: "BLD_KRIEGSWERFT", ep: eg.SEE_KAPERFAHRT.xp, silber: [eg.SEE_KAPERFAHRT.silverMin, eg.SEE_KAPERFAHRT.silverMax], rohstoff: 3, ausruestung: 0.30 },
  turnier: { name: egAkt.act_pit_tournaments.name, abklingen: 3, ep: eg.ARENA_WAFFENGANG.xp, silber: [eg.ARENA_WAFFENGANG.silverMin, eg.ARENA_WAFFENGANG.silverMax], ruf: 5,
    orte: egAkt.act_pit_tournaments.locations.map((l) => ({ ort: ortId(l.city), name: l.name })) },
};
const meisterwerk = endgame.endgameCrafting.upgrades.map((u) => ({ id: u.id, name: u.name, kosten: kosten(u.cost), wirkung: u.effect }));

// ---- Stufen 1–30, Meister-Talente, Ahnenränge (Patch 2.0.0 Punkt 4, 2.1.0 Punkt 1, 1.6.0) ----
const schritte = p210["1_xpCurveLevels21To30"].exactStepCosts;
const aufstieg = { maxStufe: 30, schritte: Object.fromEntries(Object.entries(schritte).map(([k, v]) => [k, v])), summe30: p210["1_xpCurveLevels21To30"].totalXpAtLevel30,
  werteJeStufe: stufen.levelProgression.masterLevels.statGainPerLevel,
  aktStufen: Object.fromEntries(Object.entries(p200["4_levelCap30AndXpCurve"].actLevelRanges).map(([k, v]) => [k, [v.min, v.max]])),
  talentStufen: p160a.masterTalentSystem.unlockLevels, talentMaxRang: p160a.masterTalentSystem.maxRankPerTalent,
  talente: p160a.masterTalentSystem.talentTree, signaturRaenge: { 10: 1, 15: 2, 20: 3, 25: 4 },
  ahnen: { name: stufen.ancestralPrestigeSystem.name, epJeRang: p160a.progressionMilestonesFix.prestigeXpPerRank,
    pfade: stufen.ancestralPrestigeSystem.perkTracks.map((t) => ({ id: t.id, name: t.name, max: t.maxPoints, wirkung: t.bonusPerPoint })) } };

// ---- Kampf (Patch 2.1.0 Punkt 9, 2.2.0) ----
// Patch 2.4.0: Henrys Werte (Klassen, Gegner, Ausrüstung, Tränke) werden durch 3,5 geteilt, damit ein Kampfsystem
// (Kampfdokument 17. 11.) für alle Fraktionen gilt. Mana auf derselben Skala: 12 + Willenskraft + Int/2, +1 je Zug.
const manaTraenke = Object.fromEntries(Object.entries(p240.normalizedManaAndStaminaScale).filter(([k]) => k.startsWith("POT_MANA"))
  .map(([k, v]) => [k, parseInt(v, 10)]));
const kampfRegeln = { krit: p210["9_humanDamageFormula"].critMultiplier, ruestungsKonstante: 50, skalaTeiler: p240.scaleDivisor,
  mana: { basis: 12, wille: 1, intelligenz: 0.5, jeZug: p240.normalizedManaAndStaminaScale.manaRegenPerTurn, traenke: manaTraenke } };

// ---- Strategie-Ansicht (Bau-Datei) ----
const ansicht = { taste: bau.uiModes.toggleHotkey, modi: bau.uiModes.modes.map((m) => ({ id: m.id, name: m.label, text: m.description })) };

if (fehler.length) {
  console.error(fehler.join("\n"));
  process.exit(1);
}

const daten = { rohstoffe, rufRaenge, rufAusloeser, taten, fraktionsHandel, reise, doerfer, zehnt, wiederaufbau, stadtZustand,
  kriegskasse, moral, gegenstaende, ausruestungsRechte, handwerk, schmiede, gegnerRegionen, beutePools, klassen, signaturRaenge,
  gebaeude, siedlungsStufen, garnison, phasen, vorgebaut, endgame: endgameAktivitaeten, meisterwerk, aufstieg, kampf: kampfRegeln, ansicht };
const ziel = path.join(__dirname, "..", "spiel", "systeme-daten.js");
fs.writeFileSync(ziel, "\"use strict\";\n\n// Erzeugt von quellen/systeme-erzeugen.cjs aus quellen/henry/systeme/. Nicht von Hand ändern,\n" +
  "// sondern die Quelle oder das Skript anpassen und neu ausführen.\nconst systemDaten = " + JSON.stringify(daten) +
  ";\nif (typeof module !== \"undefined\") module.exports = systemDaten;\n");
console.log("spiel/systeme-daten.js:", Object.keys(gegenstaende).length, "Gegenstände,", Object.keys(klassen).length, "Klassen,",
  Object.values(gegnerRegionen).reduce((s, r) => s + r.gegner.length, 0), "Gegner,", Object.keys(doerfer).length, "Dörfer");
