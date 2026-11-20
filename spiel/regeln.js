"use strict";

const rules = (() => {
  const version = 3;
  const K = klassen;
  // Ausrüstungsplätze: rechte Hand (weapon), linke Hand (offhand), Kopf, Hals, Körper (armor), Beine, zwei Ringe.
  // Die Schlüssel weapon und armor bleiben wegen bestehender Spielstände erhalten.
  // Patch 2.6.5: neuer Platz „Hände“ für Handschuhe (alte Spielstände bekommen ihn leer dazu).
  const equipmentSlots = ["weapon", "offhand", "head", "neck", "armor", "hands", "legs", "ring1", "ring2"];
  const slotKinds = { weapon: "weapon", offhand: "offhand", head: "head", neck: "neck", armor: "armor", hands: "hands", legs: "legs",
    ring1: "ring", ring2: "ring" };
  const emptyEquipment = () => Object.fromEntries(equipmentSlots.map(slot => [slot, null]));
  const partyLimit = 3;
  // Errata 10: Rucksack 20 Plätze + Stärke-Bonus, ausbaubar bis 50. Stapel höchstens 10 Stück. Gürtel mit 2 Ladungen.
  const bagBase = 20;
  const itemCap = 600;
  const stackLimit = 10;
  const beltSize = 2;
  // Technische Spezifikation (17. 11. 2026): Weltleisten, Fraktionsvorrat und Knotennetz.
  const N = knoten;
  // Spielsysteme der Menschen (Henry, 18. 11. 2026): Kontor, Ruf-Ränge, Moral, Zehnt, Taten, Bau, Stufe 30.
  const SY = systeme;
  // Henry, 20. 11. 2026: Schwierigkeitsgrade (Daten aus quellen/henry/v2619/schwierigkeitsgrade.json).
  const SCHWIERIG = SY.daten.v2619schwierigkeit;
  const menschen = (state) => SY.istMensch(state.faction);
  const leistenFolge = ["untote", "orks", "glut", "erzfieber", "welke"];
  const leistenStart = { untote: 35, orks: 40, glut: 30, erzfieber: 45, welke: 30 };
  const leistenNamen = { untote: "Untoten-Bedrohung", orks: "Ork-Bedrohung", glut: "Glut des Mutterbergs",
    erzfieber: "Erzfieber", welke: "Welke" };
  // Gegenkräfte (Gleichgewicht der Welt): ab der Schwelle sinkt die Leiste jede Runde ohne Zutun des Spielers.
  const gegenkraefte = { untote: [50, 5], orks: [55, 3], glut: [45, 3], erzfieber: [50, 3], welke: [45, 3] };
  // Völkerdokumente: Glut, Welke und Erzfieber steigen „jede Runde ein wenig“.
  const leistenAnstieg = { glut: 1, welke: 1, erzfieber: 1 };
  const vorratStart = 42;
  const vorratMax = 100;
  const seewegSilber = 15;
  const vorratAnwerbung = 15;
  const vertragKosten = 10;
  const ertragMenge = 5;
  const ertragPause = 10;
  const stollenSchaden = 5;
  // Errata 8: Würfel für Reisebegegnungen. Tests und Werkzeuge können ihn austauschen.
  let travelDice = Math.random;
  const setTravelDice = (dice) => { travelDice = typeof dice === "function" ? dice : Math.random; };
  const own = (obj, key) => typeof key === "string" && Object.hasOwn(obj, key);
  const intBetween = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;
  const total = (record) => Object.values(record ?? {}).reduce((sum, value) => sum + value, 0);
  const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const keys = Object.keys(K.grundwerte);

  // ---- Klassensystem: Volk, Fraktion, Klasse, Grundwerte und Fertigkeiten ----

  const people = (faction) => K.fraktionen[faction].volk;
  function originOf(faction) {
    const volk = people(faction);
    if (volk === "untote") return faction === "erinnernde" ? "vampir" : "untot";
    return { menschen: "valmarcher", elfen: "waldelf", orks: "gruenhaut", zwerge: "bergzwerg" }[volk];
  }
  // Kronreich und Freie Häfen ersetzen Magier und Heiler durch Klassen ohne Magie.
  const profile = (faction, role) => K.fraktionen[faction].profile?.[role] ?? role;
  const kit = (state) => world.classes[profile(state.faction, state.role)];
  const className = (faction, role) => K.fraktionen[faction].klassen[role].name;
  const cap = (value) => K.regeln.grenzen.find(([max]) => value <= max)[1];
  const modifier = (value) => K.regeln.modifikatoren.find(([max]) => value <= max)[1];
  const skillPoints = (build) => K.regeln.fertigkeitsPunkte + (build?.spez ? 1 : 0) + (build?.meister ? 1 : 0);

  function baseAttributes(faction, role, choice = null) {
    const fraktion = K.fraktionen[faction];
    const volk = K.voelker[fraktion.volk];
    const klasse = K.grundklassen[profile(faction, role)];
    return Object.fromEntries(keys.map((key) => [key, K.regeln.start + (volk.bonus[key] ?? 0) +
      (fraktion.bonus[key] ?? 0) + (klasse.bonus[key] ?? 0) + (volk.wahl && choice === key ? volk.wahl : 0)]));
  }

  // Grundwerte aus Volk, Fraktion, Klasse, freien Punkten, Stufenaufstiegen, Spezialisierung und Meisterklasse.
  function attributes(faction, role, build, training = {}) {
    const base = baseAttributes(faction, role, build?.wahl ?? null);
    return Object.fromEntries(keys.map((key) => [key, base[key] + (build?.frei?.[key] ?? 0) + (training[key] ?? 0) +
      (build?.spez?.grundwert === key ? 1 : 0) + (build?.meister?.grundwerte?.[key] ?? 0)]));
  }

  function skillLimits(faction, values) {
    return Object.fromEntries(Object.entries(K.fertigkeiten).map(([id, skill]) =>
      [id, id === "magie" && !K.fraktionen[faction].magie ? 0 : cap(values[skill.grundwert])]));
  }

  // Liefert eine Fehlermeldung oder null.
  function buildProblem(faction, role, build, training = {}, grenze = K.regeln.grundwertMax) {
    if (!own(K.fraktionen, faction)) return "Wähle eine Fraktion.";
    if (!K.klassenFolge.includes(role)) return "Wähle eine Klasse.";
    if (!isRecord(build) || !isRecord(build.frei) || !isRecord(build.fertigkeiten)) return "Verteile Grundwerte und Fertigkeiten.";
    const volk = K.voelker[people(faction)];
    if (!Object.entries(build.frei).every(([key, value]) => own(K.grundwerte, key) && intBetween(value, 0, K.regeln.freiePunkte)) ||
        total(build.frei) !== K.regeln.freiePunkte) return "Verteile genau " + K.regeln.freiePunkte + " freie Punkte auf die Grundwerte.";
    if (volk.wahl ? !own(K.grundwerte, build.wahl) : (build.wahl ?? null) !== null) return "Wähle den Grundwert für den Bonus der Menschen.";
    if (build.spez !== null && build.spez !== undefined &&
        (!isRecord(build.spez) || !["a", "b"].includes(build.spez.variante) || !own(K.grundwerte, build.spez.grundwert))) {
      return "Die Spezialisierung ist ungültig.";
    }
    if (build.meister !== null && build.meister !== undefined && (!build.spez || !isRecord(build.meister) ||
        !isRecord(build.meister.grundwerte) || total(build.meister.grundwerte) !== 2 ||
        !Object.entries(build.meister.grundwerte).every(([key, value]) => own(K.grundwerte, key) && intBetween(value, 1, 2)))) {
      return "Die Meisterklasse ist ungültig.";
    }
    const values = attributes(faction, role, build, training);
    if (Object.values(values).some((value) => value > grenze)) return "Kein Grundwert darf über " + grenze + " steigen.";
    const limits = skillLimits(faction, values);
    const skills = build.fertigkeiten;
    if (!Object.keys(skills).every((id) => own(K.fertigkeiten, id)) ||
        !Object.keys(K.fertigkeiten).every((id) => intBetween(skills[id], 0, K.regeln.fertigkeitMax))) return "Die Fertigkeiten sind ungültig.";
    if (total(skills) !== skillPoints(build)) return "Verteile genau " + skillPoints(build) + " Fertigkeitspunkte.";
    for (const [id, limit] of Object.entries(limits)) {
      if (skills[id] > limit) {
        return id === "magie" && !limit ? K.fraktionen[faction].name + " wirkt keine Magie."
          : K.fertigkeiten[id].name + " darf mit " + K.grundwerte[K.fertigkeiten[id].grundwert] + " " +
            values[K.fertigkeiten[id].grundwert] + " höchstens " + limit + " sein.";
      }
    }
    const main = K.grundklassen[profile(faction, role)].haupt.find((id) => skills[id] < 3);
    if (main) return "Die Hauptfertigkeit " + K.fertigkeiten[main].name + " braucht mindestens 3.";
    return null;
  }

  // Ein gültiger Vorschlag: freie Punkte auf die Grundwerte der Hauptfertigkeiten, dann Fertigkeiten auffüllen.
  function suggestSkills(faction, role, build) {
    const limits = skillLimits(faction, attributes(faction, role, { ...build, fertigkeiten: {} }));
    const main = K.grundklassen[profile(faction, role)].haupt;
    const skills = Object.fromEntries(Object.keys(K.fertigkeiten).map((id) => [id, 0]));
    let left = skillPoints(build);
    const others = Object.keys(K.fertigkeiten).filter((id) => !main.includes(id));
    const raise = (ids, ceiling) => {
      let changed = true;
      while (left > 0 && changed) {
        changed = false;
        for (const id of ids) {
          if (left > 0 && skills[id] < Math.min(ceiling, limits[id])) {
            skills[id]++;
            left--;
            changed = true;
          }
        }
      }
    };
    raise(main, 4);
    raise(others, 2);
    raise(main, 5);
    raise(others, 3);
    raise(others, 5);
    return skills;
  }

  function defaultBuild(faction, role, frei = null, wahl = null) {
    const volk = K.voelker[people(faction)];
    const main = K.grundklassen[profile(faction, role)].haupt.map((id) => K.fertigkeiten[id].grundwert);
    const focus = [...new Set(main)];
    const choice = volk.wahl ? (own(K.grundwerte, wahl) ? wahl : focus[0]) : null;
    let points = frei;
    if (!points) {
      // Erst die Grundwerte der Hauptfertigkeiten auf 16 (volle 5), danach die schwächsten übrigen Grundwerte.
      points = {};
      const values = baseAttributes(faction, role, choice);
      for (let index = 0; index < K.regeln.freiePunkte; index++) {
        const key = focus.find((id) => values[id] < 16) ??
          keys.filter((id) => !focus.includes(id)).sort((a, b) => values[a] - values[b])[0];
        points[key] = (points[key] ?? 0) + 1;
        values[key]++;
      }
    }
    const build = { frei: points, wahl: choice, fertigkeiten: {}, spez: null, meister: null };
    build.fertigkeiten = suggestSkills(faction, role, build);
    return build;
  }

  function create(name, faction, appearance, variant, role = "krieger", build = null, training = {}, grenze = K.regeln.grundwertMax) {
    const cleanName = name.trim();
    if (!own(K.fraktionen, faction) || !K.klassenFolge.includes(role)) throw new Error("Wähle Volk, Fraktion und Klasse.");
    const origin = originOf(faction);
    if (!cleanName || cleanName.length > 40 ||
        !["mann", "frau"].includes(appearance) || !intBetween(variant, 0, origin === "untot" ? 1 : 3)) {
      throw new Error("Bitte gib einen Namen ein und wähle ein Porträt.");
    }
    const setup = build ?? defaultBuild(faction, role);
    // Patch 2.6.3: Beim Laden zählen trainierte Grundwerte für die Fertigkeitsgrenzen mit (sonst war ein Spielstand nach
    // Stufenpunkten auf Willenskraft und Spezialisierung in Mut nicht mehr ladbar; gefunden mit sim/e2e.cjs).
    const problem = buildProblem(faction, role, setup, training, grenze);
    if (problem) throw new Error(problem);
    const weapon = kit({ faction, role }).weapon;
    const state = {
      version, name: cleanName, faction, origin, appearance, variant, role, scene: startpunkte.szene(faction),
      build: structuredClone({ ...setup, spez: setup.spez ?? null, meister: setup.meister ?? null }),
      questStufe: 0, vereinigt: false, umschulung: false, rausch: false,
      health: 0, ember: 0, balance: 0, inventory: [weapon, "lederwams", "galgenwurz"],
      equipment: { ...emptyEquipment(), weapon, armor: "lederwams" },
      storage: [],
      xp: 0, silver: 5, training: {}, stufenpunkte: 0, ressource: vorratStart, rewards: [],
      weltLeisten: { ...leistenStart }, runde: 0, knoten: null, handlung: null, vertraege: [], ertraege: {}, niederlage: null,
      weltAuftraege: {}, hauptquest: null,
      moral: SY.daten.moral.start, entkraeftet: false, etappen: 0, kontor: {}, befreit: [], tatOffen: null,
      zuflucht: null, gefallenIn: null, grundwertAlt: 0, faehigkeitRaenge: {}, schwierigkeit: SCHWIERIG.standard_auswahl,
      // Porträt-Paket (20. 11. 2026): Lauf-Seed für die NPC-Porträt-Pools, bleibt im Lauf gleich, wechselt beim Neustart.
      laufSeed: Math.floor(Math.random() * 2147483647),
      party: [], companionEquipment: {}, partyVitals: {}, heroStatus: {}, companionXp: {},
      rucksack: 0, guertel: Array(beltSize).fill(null), relikt: null,
      relationships: {}, factionRuf: {}, companionQuests: {}, crafted: [], questClock: 0, questLog: {},
      marks: [], journal: [], combat: null,
    };
    state.health = healthLimit(state);
    state.ember = faction === "orden" ? glutOrden.start : emberLimit(state);
    return state;
  }

  // ---- Alte Spielstände (Version 1, neun Klassen, sechs verteilte Attributpunkte) ----

  const legacyFaction = { valmarcher: "kronreich", waldelf: "hueter", bergzwerg: "tiefes-koenigreich",
    gruenhaut: "gruene-banner", vampir: "erinnernde", untot: "hof" };
  const legacyRole = { knight: "waechter", mage: "magier", priest: "heiler", ranger: "spaeher", thief: "schurke",
    necromancer: "magier", paladin: "krieger", druid: "heiler", warrior: "krieger" };
  const legacyBonus = { valmarcher: { presence: 1, will: 1 }, waldelf: { agility: 2 }, bergzwerg: { strength: 1, will: 1 },
    gruenhaut: { strength: 2, will: 1 }, vampir: { presence: 2 }, untot: { will: 2 } };

  function migrate(old) {
    if (!own(legacyFaction, old.origin)) throw new Error("Unbekanntes Spielstandformat.");
    const faction = legacyFaction[old.origin];
    const role = legacyRole[old.role ?? "knight"];
    if (!role) throw new Error("Der Spielstand ist beschädigt.");
    const allocation = isRecord(old.allocation) ? old.allocation : null;
    const training = isRecord(old.training) ? { ...old.training } : {};
    const oldStrength = 2 + (legacyBonus[old.origin].strength ?? 0) + (allocation?.strength ?? 0) + (training.strength ?? 0);
    // Die sechs alten Punkte werden zu fünf freien Punkten: der höchste Wert gibt einen Punkt ab.
    let frei = null;
    if (allocation && Object.keys(allocation).every((key) => own(K.grundwerte, key) && Number.isInteger(allocation[key])) &&
        total(allocation) === 6) {
      frei = Object.fromEntries(Object.entries(allocation).filter(([, value]) => value > 0));
      const [highest] = Object.entries(frei).sort((a, b) => b[1] - a[1])[0];
      frei[highest]--;
      if (!frei[highest]) delete frei[highest];
    }
    let build = defaultBuild(faction, role, frei);
    if (buildProblem(faction, role, build)) build = defaultBuild(faction, role);
    for (const key of Object.keys(training)) {
      if (!own(K.grundwerte, key) || !intBetween(training[key], 0, 5)) throw new Error("Der Spielstand ist beschädigt.");
      const room = K.regeln.grundwertMax - attributes(faction, role, build)[key];
      training[key] = Math.min(training[key], Math.max(0, room));
      if (!training[key]) delete training[key];
    }
    const state = { ...old, version: 2, faction, origin: originOf(faction), role, build, training,
      questStufe: 0, vereinigt: false, umschulung: true, rausch: false };
    delete state.allocation;
    state.equipment ??= { weapon: null, armor: null };
    state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
    if (!allocation) {
      // Frühe Spielstände hatten noch keine Klasse gewählt und keine Ausrüstung.
      const weapon = kit(state).weapon;
      for (const id of [weapon, "lederwams", "galgenwurz"]) if (!state.inventory.includes(id)) state.inventory.push(id);
      state.equipment.weapon ??= weapon;
      state.equipment.armor ??= "lederwams";
    }
    const oldLimit = 22 + 3 * oldStrength;
    if (Number.isInteger(state.health) && state.health > 0) {
      state.health = Math.max(1, Math.min(legacyHealthLimit(state), Math.round(state.health / oldLimit * legacyHealthLimit(state))));
    }
    if (Number.isInteger(state.ember)) state.ember = Math.min(state.ember, emberLimit(state));
    return state;
  }

  // Spielstände vor dem Kampfdokument (Version 2): EP bleiben, die Stufe ergibt sich neu (100 × n).
  // Noch nicht verteilte Grundwertpunkte bleiben erhalten, LP werden anteilig umgerechnet, ein laufender Kampf beginnt neu.
  function upgrade(old) {
    const state = { ...old, version };
    state.training = isRecord(state.training) ? state.training : {};
    const xp = Number.isInteger(state.xp) ? state.xp : 0;
    const earned = legacyThresholds.filter(value => value <= xp).length - 1;
    state.stufenpunkte = Math.max(0, earned - total(state.training));
    state.ressource = 3;
    if (own(K.fraktionen, state.faction) && K.klassenFolge.includes(state.role) && isRecord(state.build) &&
        isRecord(state.build.fertigkeiten) && Number.isInteger(state.health) && state.health > 0) {
      try {
        const before = legacyHealthLimit(state);
        state.health = Math.max(1, Math.min(healthLimit(state), Math.round(state.health / before * healthLimit(state))));
        if (Number.isInteger(state.ember)) state.ember = Math.min(state.ember, emberLimit(state));
      } catch {
        // Beschädigte Stände fängt die Prüfung in read ab.
      }
    }
    if (state.combat && own(world.fights, state.combat.id)) {
      const id = state.combat.id;
      state.party = Array.isArray(state.party) ? state.party : [];
      try {
        startFight(state, id, false);
      } catch {
        state.combat = { id };
      }
    }
    return state;
  }

  function read(serialized) {
    let state = JSON.parse(serialized);
    if (!state || typeof state.name !== "string") throw new Error("Unbekanntes Spielstandformat.");
    if (state.version === 1) {
      if (!Object.hasOwn(state, "balance")) state.balance = 0;
      state = migrate(state);
    }
    if (state.version === 2) state = upgrade(state);
    if (state.version !== version) throw new Error("Unbekanntes Spielstandformat.");
    if (!Object.hasOwn(state, "equipment")) state.equipment = { weapon: null, armor: null };
    if (state.equipment && typeof state.equipment === "object" && !Array.isArray(state.equipment)) {
      // Vorschaustände mit dem früheren Platz "trinket" übernehmen.
      const trinket = state.equipment.trinket;
      delete state.equipment.trinket;
      for (const slot of equipmentSlots) state.equipment[slot] ??= null;
      if (trinket) {
        const target = world.gear[trinket]?.slot === "ring" ? "ring1" : "neck";
        state.equipment[target] ??= trinket;
      }
    }
    state.xp ??= 0;
    state.silver ??= 5;
    state.training ??= {};
    state.rewards ??= [];
    state.party ??= [];
    state.gefaehrtenPool ??= [];
    state.companionEquipment ??= {};
    state.partyVitals ??= {};
    state.heroStatus ??= {};
    state.relationships ??= {};
    state.factionRuf ??= {};
    // Bestehende Mitglieder behalten ihre bereits erworbene Aufnahmeberechtigung.
    state.companionQuests ??= Object.fromEntries([
      ...Object.entries(state.relationships).filter(([, bond]) => bond && bond.oath && bond.oath !== "none")
        .map(([id, bond]) => [id, { status: bond.oath === "fulfilled" ? "done" : "active", debt: 0 }]),
      ...(Array.isArray(state.party) ? state.party : []).map(id => [id, { status: "done", debt: 0 }]),
    ]);
    state.crafted ??= [];
    state.questClock ??= 0;
    state.questLog ??= {};
    state.questStufe ??= 0;
    state.runen ??= [];
    state.vereinigt ??= false;
    state.umschulung ??= false;
    state.rausch ??= false;
    state.storage ??= [];
    state.relikt ??= null;
    for (const liste of [state.inventory, state.storage]) if (Array.isArray(liste)) {
      liste.forEach((id, index) => { if (own(alteRelikte, id)) liste[index] = alteRelikte[id]; });
    }
    state.rucksack ??= 0;
    state.companionXp ??= {};
    state.guertel = Array.from({ length: beltSize }, (_, index) => {
      const id = Array.isArray(state.guertel) ? state.guertel[index] : null;
      return own(world.supplies, id) ? id : null;
    });
    // Begleiter aus älteren Spielständen starten eine Erfahrungsstufe unter der Spielfigur (Errata 9).
    if (Array.isArray(state.party)) for (const id of state.party) {
      if (own(world.companions, id) && !Number.isInteger(state.companionXp[id])) state.companionXp[id] = memberStartXp(state);
    }
    state.stufenpunkte ??= 0;
    state.ressource ??= 3;
    // Spielsysteme der Menschen (18. 11. 2026): ältere Spielstände starten mit Moral 60 und leerem Kontor.
    state.moral ??= SY.daten.moral.start;
    state.entkraeftet ??= false;
    state.etappen ??= 0;
    state.kontor ??= {};
    state.befreit ??= [];
    state.tatOffen ??= null;
    state.aufwertung ??= {};
    // Patch 2.6.0: Akte 2 bis 4 (Schwester-Zweige, Fraktions-Spezialisierung, Akt 4), Lagerfeuer und Gefährten-Szenen.
    state.akte ??= null;
    state.lagerBuff ??= null;
    state.lagerMeilenstein ??= null;
    state.gefaehrtenPerks ??= [];
    state.lagerGesehen ??= [];
    state.vorhut ??= null;
    state.lagerSzene ??= null;
    if (state.lagerSzene && !lagerSzeneDaten(state.lagerSzene)) state.lagerSzene = null;
    state.gefaehrtenEtappen ??= {};
    // Patch 2.6.2: Die fünf alten Meister-Talente werden zu den neuen Talentbäumen (gleicher Rang).
    if (isRecord(state.talente)) {
      for (const [alt, neu] of Object.entries(SY.daten.aufstieg.talentAlt ?? {})) {
        if (state.talente[alt] === undefined) continue;
        state.talente[neu] = Math.min(SY.daten.aufstieg.talentMaxRang, (state.talente[neu] ?? 0) + state.talente[alt]);
        delete state.talente[alt];
      }
    }
    // Spielstände vor der Weltebene: Fraktionsressource und Kampfressource werden ein Vorrat von 0 bis 100.
    // Der alte Kampfvorrat (Start 3) kommt auf den neuen Startwert 42 obendrauf.
    if (!isRecord(state.weltLeisten)) {
      state.weltLeisten = { ...leistenStart };
      if (Number.isInteger(state.ressource)) state.ressource = Math.max(1, Math.min(vorratMax, vorratStart + Math.max(0, state.ressource - 3)));
    }
    state.runde ??= 0;
    state.knoten ??= null;
    state.handlung ??= null;
    state.vertraege ??= [];
    state.ertraege ??= {};
    state.niederlage ??= null;
    state.weltAuftraege ??= {};
    state.hauptquest ??= null;
    // Patch 2.5.4: Glut nur für den Orden (alte Stände werden gekürzt), Zuflucht und Ort der letzten Niederlage.
    if (SY.istMensch(state.faction)) {
      if (Number.isInteger(state.ember) && state.ember >= 0) state.ember = Math.min(state.ember, emberLimit(state));
      if (state.faction !== "orden" && intBetween(state.balance, -3, 3)) state.balance = 0;
    }
    state.zuflucht ??= null;
    state.gefallenIn ??= null;
    // Henry, 20. 11. 2026: Alte Spielstände spielen auf „Leicht“ (der bisherigen Balance).
    state.schwierigkeit ??= SCHWIERIG.standard_auswahl;
    // Alte Stände bekommen einen festen Seed aus Name und Fraktion, damit die Porträts beim Laden nicht wechseln.
    state.laufSeed ??= [...String(state.name) + "|" + state.faction].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7) % 2147483647;
    // Patch 2.5.5: Bisher trainierte Grundwerte stammen aus alten Punkten und zählen nicht gegen die neuen Stufenpunkte.
    state.grundwertAlt ??= isRecord(state.training) ? total(state.training) : 0;
    state.faehigkeitRaenge ??= {};
    create(state.name, state.faction, state.appearance, state.variant, state.role, state.build,
      isRecord(state.training) ? state.training : {}, grundwertGrenze(state));
    const combat = state.combat;
    const validList = (value, check, limit) => Array.isArray(value) && value.length <= limit && value.every(check);
    if (state.origin !== originOf(state.faction) ||
        !isRecord(state.training) ||
        !Object.entries(state.training).every(([id, value]) => own(K.grundwerte, id) && intBetween(value, 0, 30)) ||
        !intBetween(state.grundwertAlt, 0, 100) ||
        (!SY.istMensch(state.faction) && !Object.values(state.training).every((value) => value <= 5)) ||
        buildProblem(state.faction, state.role, state.build, state.training, grundwertGrenze(state)) ||
        !isRecord(state.faehigkeitRaenge) || !Object.entries(state.faehigkeitRaenge).every(([id, rang]) =>
          /^[a-z0-9]{1,12}$/.test(id) && intBetween(rang, 2, aufstieg.rangMax)) ||
        !intBetween(state.questStufe, 0, 10) ||
        ![state.vereinigt, state.umschulung, state.rausch].every((flag) => typeof flag === "boolean") ||
        !own(world.scenes, state.scene) ||
        !intBetween(state.health, 0, healthLimit(state)) ||
        !intBetween(state.ember, 0, emberLimit(state)) ||
        !intBetween(state.balance, -3, 3) ||
        !intBetween(state.xp, 0, 1000000) || !intBetween(state.silver, 0, 1000000) ||
        !intBetween(state.stufenpunkte, 0, 40) || !intBetween(state.ressource, 0, vorratMax) ||
        !isRecord(state.weltLeisten) || Object.keys(state.weltLeisten).length !== leistenFolge.length ||
        !leistenFolge.every(id => intBetween(state.weltLeisten[id], 0, 100)) ||
        !intBetween(state.runde, 0, 1000000000) ||
        (state.knoten !== null && !N.get(state.knoten)) || (state.scene === "weltknoten" && state.knoten === null) ||
        (state.handlung !== null && !(isRecord(state.handlung) && own(world.scenes, state.handlung.szene) &&
          !["weltknoten", "weltende", "defeat"].includes(state.handlung.szene) && N.get(state.handlung.knoten))) ||
        !validList(state.vertraege, id => own(K.fraktionen, id) && id !== state.faction, 14) ||
        new Set(state.vertraege).size !== state.vertraege.length ||
        !isRecord(state.ertraege) || !Object.entries(state.ertraege).every(([id, runde]) => N.get(id)?.typ === "dorf" && intBetween(runde, 0, state.runde)) ||
        (state.niederlage !== null && !own(niederlagen, state.niederlage)) ||
        (state.zuflucht !== null && !N.get(state.zuflucht)) || !schwierigkeitsGrad(state.schwierigkeit) || !intBetween(state.laufSeed, 0, 2147483647) ||
        (state.gefallenIn !== null && !(own(world.scenes, state.gefallenIn) && !["defeat", "weltende"].includes(state.gefallenIn))) ||
        !validRecord(state.weltAuftraege, auftragIndex, entry => isRecord(entry) && ["aktiv", rueckkehr.status, "erledigt"].includes(entry.status) &&
          intBetween(entry.wahl, 0, 1)) ||
        !Object.entries(state.weltAuftraege).every(([id, entry]) => entry.wahl < auftragIndex[id].spiel.lohn.length) ||
        (state.hauptquest !== null && !(hauptPlan[state.faction] && isRecord(state.hauptquest) &&
          intBetween(state.hauptquest.schritt, 0, hauptPlan[state.faction].length) &&
          (state.hauptquest.wahl === null || own(wahlFolgen, state.hauptquest.wahl)) &&
          (state.hauptquest.bericht === undefined || (isRecord(state.hauptquest.bericht) && Boolean(N.get(state.hauptquest.bericht.ort)))) &&
          (state.hauptquest.schritt < hauptPlan[state.faction].length || state.hauptquest.wahl !== null))) || ((state.scene === "weltende") !== (state.niederlage !== null)) ||
        !validList(state.rewards, (id) => typeof id === "string" && id.length <= 50, 100) ||
        !validList(state.party, (id) => own(world.companions, id), 5) ||
        new Set(state.party).size !== state.party.length ||
        !validList(state.gefaehrtenPool, (id) => own(world.companions, id) && !state.party.includes(id), poolLimit) ||
        new Set(state.gefaehrtenPool).size !== state.gefaehrtenPool.length ||
        !validRecord(state.companionQuests, world.companions, quest => quest &&
          ["active", "done", "failed"].includes(quest.status) && intBetween(quest.debt, 0, world.recruitmentQuests.warrior.salary)) ||
        !Object.entries(state.companionQuests).every(([id, quest]) => !quest.debt || (id === "warrior" && quest.status === "done")) ||
        !intBetween(state.questClock, 0, 1000000000) ||
        !validRecord(state.questLog, questPlans, quest => quest && ["active", "done", "failed"].includes(quest.status) &&
          intBetween(quest.started, 0, state.questClock) && intBetween(quest.deadline, quest.started, 1000000000) &&
          (quest.reason === undefined || (typeof quest.reason === "string" && quest.reason.length <= 300))) ||
        !validList(state.crafted, id => own(world.recipes, id), 10) ||
        !validRecord(state.factionRuf, world.factions, score => intBetween(score, -100, 100)) ||
        !validRecord(state.relationships, world.companions, bond => bond && intBetween(bond.score, -100, 100) &&
          intBetween(bond.talks, 0, 4) && ["none", "promised", "fulfilled", "broken"].includes(bond.oath) &&
          typeof bond.gift === "boolean" && typeof bond.left === "boolean" &&
          ["none", "romance", "friendship"].includes(bond.bond)) ||
        !validList(state.inventory, (id) => own(world.items, id) && id !== "faeuste", itemCap) ||
        !validList(state.storage, (id) => own(world.items, id) && id !== "faeuste", storageLimit) ||
        !state.equipment || !equipmentSlots.every((slot) => {
          const id = state.equipment[slot];
          return id === null || (own(world.gear, id) && world.gear[id].slot === slotKinds[slot] &&
            wornCount(state, id) <= state.inventory.filter(entry => entry === id).length);
        }) ||
        !validRecord(state.heroStatus, world.ailments, turns => intBetween(turns, 1, 3)) ||
        !validRecord(state.partyVitals, world.companions, vitals => vitals &&
          intBetween(vitals.health, 0, 100) && validRecord(vitals.status, world.ailments, turns => intBetween(turns, 1, 3))) ||
        !Object.entries(state.partyVitals).every(([id, vitals]) => vitals.health <= memberHealthLimit(id, state)) ||
        !validRecord(state.companionEquipment, world.companions, equipment => isRecord(equipment) &&
          Object.entries(equipment).every(([slot, id]) => equipmentSlots.includes(slot) && (id === null ||
            (own(world.gear, id) && world.gear[id].slot === slotKinds[slot])))) ||
        !intBetween(state.rucksack, 0, world.bagUpgrades.length) ||
        !validRecord(state.companionXp, world.companions, xp => intBetween(xp, 0, 1000000)) ||
        !Object.keys(state.companionEquipment).every(id => state.party.includes(id)) ||
        Object.keys(world.gear).some(id => assigned(state, id) > state.inventory.filter(item => item === id).length) ||
        !validList(state.marks, (id) => typeof id === "string" && id.length <= 40, 100) ||
        (state.relikt !== null && !(own(relikte, state.relikt) && reliktErlaubt(state.faction, state.relikt))) ||
        !validList(state.journal, (entry) => typeof entry === "string" && entry.length <= 300, 16) ||
        (state.health === 0) !== (state.scene === "defeat") ||
        (combat !== null && !validCombat(state, combat))) {
      throw new Error("Der Spielstand ist beschädigt.");
    }
    if (state.party.length > partyLimit) {
      const waiting = state.party.splice(partyLimit);
      for (const id of waiting) if (state.companionEquipment) delete state.companionEquipment[id];
      if (state.combat) {
        // Die Gegnerreihe schrumpft auf die kleinere Gruppe, verlorene LP bleiben verloren.
        const fresh = lineup(state.combat.id, state.party.length, state.combat.gegnerStufe ?? null, level(state));
        state.combat.feinde = state.combat.feinde.slice(0, fresh.length).map((foe, index) =>
          ({ ...foe, max: fresh[index].max, lp: Math.min(foe.lp, fresh[index].max) }));
        // Ein entfallender Gegnerplatz darf einen laufenden Kampf nicht ohne Ziel lassen.
        if (!state.combat.feinde.some(foe => foe.lp > 0)) state.combat.feinde[state.combat.feinde.length - 1].lp = 1;
        state.combat.supportUsed = (state.combat.supportUsed ?? []).filter(id => state.party.includes(id));
      }
      const reserve = waiting.filter((id) => !state.gefaehrtenPool.includes(id)).slice(0, poolLimit - state.gefaehrtenPool.length);
      state.gefaehrtenPool.push(...reserve);
      note(state, "Maximal drei Begleiter: " + waiting.map(id => world.companions[id].name).join(", ") +
        (reserve.length ? " warten in der Quartier-Reserve." : " warten am Wachhof.") + " Ihre Ausrüstung liegt im Gruppenvorrat.");
    }
    championsAufnehmen(state);
    ensureVitals(state);
    syncQuests(state);
    return state;
  }

  const questPlans = {
    ...world.storyQuests,
    ...Object.fromEntries(Object.entries(world.recruitmentQuests).map(([id, quest]) => ["companion-" + id,
      { ...quest, giver: world.companions[id].name, type: "Begleiterauftrag", companion: id }])),
    "kelda-salary": { title: "Keldas ausstehender Sold", giver: "Kelda", type: "Soldvertrag", turns: 30,
      text: "Zahle Kelda die vereinbarten 15 Silber. Bei Fristablauf verliert sie Vertrauen; die Schuld bleibt bestehen.", salary: true },
  };

  function syncQuests(state, previousScene = null) {
    state.questClock ??= 0;
    state.questLog ??= {};
    for (const [id, plan] of Object.entries(questPlans)) {
      const contract = plan.companion && state.companionQuests?.[plan.companion];
      const debt = state.companionQuests?.warrior?.debt ?? 0;
      const success = plan.companion ? contract?.status === "done" : plan.salary ? !debt :
        plan.success?.some(mark => state.marks.includes(mark));
      const broken = plan.companion ? contract?.status === "failed" ||
        (contract?.status === "active" && recruitment(state, plan.companion) === "broken") :
        !plan.salary && plan.failure?.some(mark => state.marks.includes(mark));
      const known = plan.companion ? Boolean(contract) : plan.salary ? Boolean(debt) :
        success || broken || plan.scenes?.includes(state.scene) || plan.scenes?.includes(previousScene);
      if (!state.questLog[id] && known) state.questLog[id] = { status: "active", started: state.questClock,
        deadline: Math.min(1000000000, state.questClock + plan.turns) };
      const entry = state.questLog[id];
      if (!entry || entry.status !== "active") continue;
      if (success) { entry.status = "done"; continue; }
      const expired = state.questClock >= entry.deadline;
      if (!broken && !expired) continue;
      entry.status = "failed";
      entry.reason = broken ? "Durch deine Entscheidungen gescheitert." : "Die vereinbarte Frist ist abgelaufen.";
      if (plan.companion && contract?.status === "active") {
        contract.status = "failed";
        const bond = relationship(state, plan.companion);
        state.relationships[plan.companion] = { ...bond, oath: "broken", score: clampRuf(bond.score - 15) };
        note(state, plan.giver + " · Sympathie −15 wegen des gescheiterten Aufnahmeauftrags.");
      }
      if (plan.salary) {
        const bond = relationship(state, "warrior");
        state.relationships.warrior = { ...bond, score: clampRuf(bond.score - 20) };
        note(state, "Kelda · Sympathie −20 wegen des überfälligen Solds. Die 15 Silber bleiben offen.");
      }
      note(state, "Auftrag gescheitert: " + plan.title + " · " + entry.reason);
    }
  }

  function timedAction(previous, next) {
    if (next === previous) return previous;
    next.questClock = Math.min(1000000000, (previous.questClock ?? 0) + 1);
    syncQuests(next, previous.scene);
    nahrungErhalten(next);
    return next;
  }
  const choose = (...args) => timedAction(args[0], chooseStep(...args));
  const strike = (...args) => timedAction(args[0], strikeStep(...args));
  const promise = (...args) => timedAction(args[0], promiseStep(...args));
  const completeQuest = (...args) => timedAction(args[0], completeQuestStep(...args));
  const paySalary = (...args) => timedAction(args[0], paySalaryStep(...args));
  const craft = (...args) => timedAction(args[0], craftStep(...args));

  function questEntries(state) {
    return Object.entries(state.questLog ?? {}).map(([id, entry]) => ({ id, ...questPlans[id], ...entry,
      remaining: Math.max(0, entry.deadline - (state.questClock ?? 0)),
      debt: questPlans[id].salary ? state.companionQuests?.warrior?.debt ?? 0 : 0,
    })).sort((a, b) => ({ active: 0, failed: 1, done: 2 }[a.status] - { active: 0, failed: 1, done: 2 }[b.status]) ||
      a.remaining - b.remaining);
  }

  function validRecord(value, catalog, valid) {
    return value && typeof value === "object" && !Array.isArray(value) &&
      Object.entries(value).every(([id, entry]) => own(catalog, id) && valid(entry));
  }

  const clampRuf = score => Math.max(-100, Math.min(100, score));
  const relationship = (state, id) => state.relationships[id] ??
    { score: world.companionAttitudes[id]?.wary?.includes(state.origin) ? -10 : 0, oath: "none", talks: 0, gift: false, left: false, bond: "none" };
  const reputation = (state, id) => state.factionRuf[id] ?? 0;
  const departureThreshold = -25;

  // Söldner warten in den Städten mit Zentrallager, Story-Gefährten an ihren Treffpunkten.
  const sceneMap = (state) => state.scene === "weltknoten" ? N.knotenZuKarte(state.knoten) : world.scenes[state.scene]?.map;
  // v3.0.3: Auf der Weltreise warten die Söldner auch in den Kharos-Städten Valengrad (Kronhall) und Eisentor (Hagenfels):
  // Kornwik und Heidvang → Kronhall, Eiswacht → Hagenfels. Glutberg bleibt.
  const soeldnerStadt = { weidenkamm: "kronhall", kraehenfurt: "kronhall", hochwacht: "hagenfels", "skarn-gate": "glutberg" };
  const mercenaryHere = (state, companion) => Boolean(companion.soeldner && storageSite(state) &&
    (companion.soeldner.orte.includes(sceneMap(state)) ||
      (state.scene === "weltknoten" && companion.soeldner.orte.some((ort) => soeldnerStadt[ort] === state.knoten))));
  function candidates(state) {
    if (state.combat || !state.health) return [];
    return Object.entries(world.companions).filter(([id, companion]) =>
      companion.klasse !== state.role && !state.party.includes(id) && !pool(state).includes(id) && !companion.champion &&
      (companion.soeldner ? mercenaryHere(state, companion)
        : companion.auftrag ? state.scene === "weltknoten" && state.knoten === companion.knoten &&
          (companion.fraktion === state.faction || abgesandter(state, id))
        : companion.scenes.includes(state.scene)));
  }

  // ---- Gefährten-Pool und Hauptstadt-Tausch (Henry, v3.0.0, quellen/henry/v300/gefaehrten-pool.json) ----
  // Aktiver Trupp: Held + höchstens 3 Begleiter. Alle weiteren Gefährten warten in der Quartier-Reserve (16 Plätze).
  // Ein- und Auswechseln nur in einer der 15 Hauptstädte; wer dort geächtet ist, tauscht nur Söldner.
  const poolLimit = 16;
  const pool = (state) => state.gefaehrtenPool ?? [];
  const truppUndPoolVoll = (state) => state.party.length >= partyLimit && pool(state).length >= poolLimit;
  // Akt 2 und 3: Nach einem abgeschlossenen Schwester-Zweig schickt die geeinte Fraktion ihren Gefährten als Abgesandten.
  const abgesandter = (state, id) => {
    const c = world.companions[id];
    return Boolean(c?.auftrag && c.fraktion !== state.faction && K.fraktionen[c.fraktion]?.volk === people(state.faction) &&
      (state.akte?.zweige?.[c.fraktion]?.stufe ?? 0) >= 3);
  };
  // Völker-Synergien des aktiven Trupps. Nur „Pakt aus Stahl & Flamme“ hat schon einen Wert im Kampf; die übrigen
  // brauchen Systeme, die es noch nicht gibt (Kampfressourcen, Ausweichen nach Kampfphase, Krit-Schaden).
  const SYNERGIEN = [
    { voelker: ["menschen", "zwerge"], name: "Pakt aus Stahl & Flamme", effekt: "+1 Rüstung für die gesamte aktive Gruppe", wert: { ruestung: 1 } },
    { voelker: ["elfen", "orks"], name: "Zorn der Alten Wildnis", effekt: "+10 % Ausweichen in der ersten Kampfphase", wert: null },
    { voelker: ["menschen", "elfen"], name: "Astrale Kriegsführung", effekt: "+1 Start-Kampfressource (Flammeneifer / Astralstrom)", wert: null },
    { voelker: ["zwerge", "orks"], name: "Donner & Amboss", effekt: "+12 % kritischer Schaden im Nahkampf", wert: null },
  ];
  const truppVoelker = (state) => new Set([people(state.faction), ...state.party.map(memberPeople)]);
  function synergien(state) {
    const voelker = truppVoelker(state);
    return SYNERGIEN.map((s) => ({ ...s, aktiv: s.voelker.every((v) => voelker.has(v)), wirkt: Boolean(s.wert) }));
  }
  const synergieWert = (state, wert) => synergien(state).filter((s) => s.aktiv && s.wert).reduce((n, s) => n + (s.wert[wert] ?? 0), 0);
  // Akt 5: Elite-Champions verbündeter Völker treten kostenlos der Reserve bei (Marke „buendnis_<volk>“).
  const CHAMPIONS = [
    { id: "gef_menschen_valen", name: "Ritterhauptmann Cassian", volk: "menschen", fraktion: "kronreich", klasse: "waechter", rolle: "Schildwall", freischaltung: "buendnis_menschen" },
    { id: "gef_elfen_aethel", name: "Sternenklinge Sylas", volk: "elfen", fraktion: "dornenklingen", klasse: "magier", rolle: "Flächenmagie", freischaltung: "buendnis_elfen" },
    { id: "gef_elfen_vael", name: "Schattenweberin Nyxara", volk: "elfen", fraktion: "schattenbluete", klasse: "schurke", rolle: "Assassine", freischaltung: "buendnis_elfen" },
    { id: "gef_zwerge_khaz", name: "Runenmeisterin Dagna", volk: "zwerge", fraktion: "tiefes-koenigreich", klasse: "heiler", rolle: "Unterstützung", freischaltung: "buendnis_zwerge" },
    { id: "gef_orks_grom", name: "Kriegsrufer Nazgrel", volk: "orks", fraktion: "gruene-banner", klasse: "krieger", rolle: "Nahkampf", freischaltung: "buendnis_orks" },
  ];
  function championsAufnehmen(state) {
    if (people(state.faction) === "untote") return;
    for (const c of CHAMPIONS) {
      if (c.volk === people(state.faction) || !state.marks.includes(c.freischaltung) || state.party.includes(c.id) ||
          state.gefaehrtenPool.includes(c.id) || state.gefaehrtenPool.length >= poolLimit) continue;
      state.gefaehrtenPool.push(c.id);
      state.companionXp ??= {};
      state.companionXp[c.id] = Math.max(state.companionXp[c.id] ?? 0, memberStartXp(state));
      note(state, c.name + " (" + c.rolle + ") tritt als Elite-Champion des Bündnisses kostenlos deiner Reserve bei.");
    }
  }
  function championInfo(state) {
    const eigenes = people(state.faction);
    return CHAMPIONS.filter((c) => c.volk !== eigenes).map((c) => ({ ...c,
      status: eigenes === "untote" ? "Untote schließen keine Bündnisse"
        : state.party.includes(c.id) || pool(state).includes(c.id) ? "gewonnen"
        : "Bündnis mit den " + c.volk.charAt(0).toUpperCase() + c.volk.slice(1) + " in Akt 5" }));
  }
  function abgesandteInfo(state) {
    return Object.entries(world.companions).filter(([id, c]) => c.auftrag && c.fraktion !== state.faction &&
      K.fraktionen[c.fraktion]?.volk === people(state.faction)).map(([id, c]) => ({ id, name: c.name, fraktion: c.fraktion, ort: c.knoten,
      status: state.party.includes(id) || pool(state).includes(id) ? "gewonnen" : abgesandter(state, id) ? "wartet in " + N.get(c.knoten).name
        : "nach dem Schwester-Zweig" }));
  }
  function tauschGrund(state, id = null) {
    if (state.scene !== "weltknoten" || state.combat || !state.health) return "Nur in Hauptstädten möglich";
    const ort = N.get(state.knoten);
    if (ort?.typ !== "hauptstadt") return "Nur in Hauptstädten möglich";
    if (id && !world.companions[id]?.soeldner && ort.fraktion !== state.faction && geaechtetBei(state, ort.fraktion)) return "In " + ort.name + " geächtet: nur Söldner";
    return null;
  }
  function poolInfo(state) {
    return { trupp: state.party.length + 1, truppMax: partyLimit + 1, pool: pool(state), poolMax: poolLimit, grund: tauschGrund(state),
      synergien: synergien(state), champions: championInfo(state), abgesandte: abgesandteInfo(state) };
  }
  function inReserve(previous, id) {
    if (tauschGrund(previous, id) || !previous.party.includes(id) || pool(previous).length >= poolLimit) return previous;
    const state = structuredClone(previous);
    state.party = state.party.filter((member) => member !== id);
    (state.gefaehrtenPool ??= []).push(id);
    if (state.companionEquipment) delete state.companionEquipment[id];
    note(state, world.companions[id].name + " bezieht Quartier in der Reserve. Die Ausrüstung kommt in den Gruppenvorrat.");
    return state;
  }
  function inTrupp(previous, id) {
    if (tauschGrund(previous, id) || !pool(previous).includes(id) || previous.party.length >= partyLimit || !compatible(previous, id)) return previous;
    const state = structuredClone(previous);
    state.gefaehrtenPool = state.gefaehrtenPool.filter((member) => member !== id);
    state.party.push(id);
    ensureVitals(state);
    note(state, world.companions[id].name + " verlässt das Quartier und reiht sich in den Kampftrupp ein.");
    return state;
  }

  // Errata 9: Volksgrenzen. Untote nehmen keine Lebenden auf und umgekehrt, Orks und Zwerge reisen nie zusammen.
  // Die Story-Gefährten bleiben über ihren Schwur für alle erreichbar (Henry, 17. 11. 2026).
  const memberPeople = (id) => world.companions[id].volk ?? "menschen";
  function peopleClash(a, b) {
    return (a === "untote") !== (b === "untote") || (a === "orks" && b === "zwerge") || (a === "zwerge" && b === "orks");
  }
  function compatible(state, id) {
    const companion = world.companions[id];
    // v3.0.0: Untote nehmen nur Untote und korrumpierte Verräter auf.
    if (people(state.faction) === "untote" && memberPeople(id) !== "untote" && !companion.korrumpiert) return false;
    // Elite-Champions aus Akt-5-Bündnissen reisen trotz alter Feindschaft mit Orks und Zwergen (Empfehlung, Henry offen).
    if (companion.champion) return people(state.faction) !== "untote" && state.party.every((m) => memberPeople(m) !== "untote");
    if (!companion.soeldner && !companion.gesandter) return true;
    const volk = memberPeople(id);
    return !peopleClash(people(state.faction), volk) && state.party.every(member => !peopleClash(memberPeople(member), volk));
  }
  // Anwerbegebühr mit Charisma-Rabatt: 16–19 senkt um 10 %, 20 um 20 %.
  function hireCost(state, id, fest = null) {
    const base = fest ?? world.companions[id]?.soeldner?.kosten ?? 0;
    const presence = heroAttributes(state).presence;
    // Patch 2.6.19 (B3, Häfen-Schmuggler): Das Schmugglernetz senkt Söldnerkosten auf 80 %.
    return Math.round(base * (presence >= 20 ? 0.8 : presence >= 16 ? 0.9 : 1) * (state.marks?.includes("schmuggler_netzwerk") ? 0.8 : 1));
  }

  function attitude(state, id) {
    const view = world.companionAttitudes[id];
    if (view?.blocked?.includes(state.origin)) return "blocked";
    if (view?.wary?.includes(state.origin) && reputation(state, view.faction) < view.reputation) return "wary";
    return "open";
  }

  function recruitment(state, id) {
    if (!own(world.companions, id)) return "refused";
    if (world.companions[id].soeldner) {
      if (!compatible(state, id)) return "incompatible";
      return state.companionQuests?.[id]?.status === "done" ? "ready" : "hire";
    }
    // Begleiter aus Aufträgen am Aushang: bereit, sobald ihr Auftrag erledigt ist.
    if (world.companions[id].auftrag) {
      if (abgesandter(state, id)) return "ready";
      return state.weltAuftraege?.[world.companions[id].auftrag]?.status === "erledigt" ? "ready" : "auftrag";
    }
    const bond = relationship(state, id);
    if (attitude(state, id) !== "open") return attitude(state, id);
    if (state.companionQuests?.[id]?.status === "failed") return "failed";
    if (bond.left || bond.score <= departureThreshold) return "refused";
    if (bond.oath === "broken" || world.loyalties[id].broken?.some(mark => state.marks.includes(mark))) return "broken";
    const quest = state.companionQuests?.[id];
    if (quest?.status === "done") return "ready";
    return quest ? "task" : "promise";
  }

  function promiseStep(previous, id) {
    if (!candidates(previous).some(([candidate]) => candidate === id) || recruitment(previous, id) !== "promise") return previous;
    const state = structuredClone(previous);
    (state.companionQuests ??= {})[id] = { status: "active", debt: 0 };
    state.relationships[id] = { ...relationship(state, id), oath: "promised" };
    note(state, world.companions[id].name + ": Auftrag angenommen · " + world.recruitmentQuests[id].title + ".");
    return state;
  }

  function questReady(state, id) {
    const plan = world.recruitmentQuests[id];
    return Boolean(plan && recruitment(state, id) === "task" &&
      (!plan.marks || plan.marks.some(mark => state.marks.includes(mark))) &&
      (!plan.item || state.inventory.includes(plan.item)) &&
      (!plan.crafted || state.crafted?.includes(plan.crafted)) &&
      (!plan.faction || reputation(state, plan.faction) >= plan.reputation));
  }

  function completeQuestStep(previous, id, later = false) {
    if (!candidates(previous).some(([candidate]) => candidate === id) || !questReady(previous, id)) return previous;
    const plan = world.recruitmentQuests[id];
    if (later && !plan.salary) return previous;
    if (plan.salary && !later && previous.silver < plan.salary) return previous;
    const state = structuredClone(previous);
    if (plan.item) state.inventory.splice(state.inventory.indexOf(plan.item), 1);
    if (plan.salary && !later) state.silver -= plan.salary;
    state.companionQuests[id] = { status: "done", debt: later ? plan.salary : 0 };
    state.relationships[id] = { ...relationship(state, id), oath: "fulfilled",
      score: clampRuf(relationship(state, id).score + 30) };
    note(state, world.companions[id].name + ": Auftrag erfüllt · " + plan.title +
      (later ? ". 15 Silber Sold bleiben offen." : "."));
    return state;
  }

  function paySalaryStep(previous, id) {
    const debt = previous.companionQuests?.[id]?.debt;
    if (!debt || previous.combat || !previous.health || previous.silver < debt ||
        (!previous.party.includes(id) && !candidates(previous).some(([candidate]) => candidate === id))) return previous;
    const state = structuredClone(previous);
    state.silver -= debt;
    state.companionQuests[id].debt = 0;
    state.relationships[id] = { ...relationship(state, id), score: clampRuf(relationship(state, id).score + 10) };
    note(state, world.companions[id].name + ": Ausstehender Sold bezahlt · " + debt + " Silber.");
    return state;
  }

  function craftStep(previous, id) {
    const recipe = world.recipes[id];
    if (!own(world.recipes, id) || previous.combat || !previous.health || previous.inventory.length >= itemCap ||
        !Object.entries(recipe.ingredients).every(([item, count]) => previous.inventory.filter(entry => entry === item).length >= count)) return previous;
    const state = structuredClone(previous);
    for (const [item, count] of Object.entries(recipe.ingredients)) {
      for (let index = 0; index < count; index++) state.inventory.splice(state.inventory.indexOf(item), 1);
    }
    if (!fits(state, id)) return previous;
    state.inventory.push(id);
    if (!(state.crafted ??= []).includes(id)) state.crafted.push(id);
    note(state, world.items[id] + " hergestellt.");
    return state;
  }

  // Erfahrung eines neuen Begleiters: eine Stufe unter der Spielfigur, mindestens Stufe 1.
  function memberStartXp(state) {
    return kampf.epFuer(Math.max(1, kampf.stufeAus(state.xp ?? 0) - 1));
  }
  const memberLevel = (state, id) => kampf.stufeAus(state.companionXp?.[id] ?? memberStartXp(state));

  function join(state, id) {
    if (state.party.length >= partyLimit) {
      (state.gefaehrtenPool ??= []).push(id);
      note(state, world.companions[id].name + " wartet in der Quartier-Reserve, bis du in einer Hauptstadt den Trupp umstellst.");
    } else state.party.push(id);
    state.companionXp ??= {};
    state.companionXp[id] = Math.max(state.companionXp[id] ?? 0, memberStartXp(state));
    ensureVitals(state);
  }

  function recruit(previous, id) {
    if (truppUndPoolVoll(previous) || !candidates(previous).some(([candidate]) => candidate === id) ||
        recruitment(previous, id) !== "ready" || !compatible(previous, id)) return previous;
    const state = structuredClone(previous);
    join(state, id);
    note(state, world.companions[id].name + " schließt sich deiner Gruppe an.");
    return state;
  }

  // Söldner anwerben: einmalige Gebühr, danach warten sie in jeder Stadt mit Zentrallager auf einen Austausch.
  // Statt Silber geht auch Fraktionsvorrat (15, mit demselben Charisma-Rabatt). Der Vorrat bleibt dabei über 0.
  function hire(previous, id, zahlung = "silber") {
    const cost = zahlung === "vorrat" ? hireCost(previous, id, vorratAnwerbung) : hireCost(previous, id);
    if (truppUndPoolVoll(previous) || !candidates(previous).some(([candidate]) => candidate === id) ||
        recruitment(previous, id) !== "hire" ||
        (zahlung === "vorrat" ? previous.ressource - cost < 1 : zahlung !== "silber" || previous.silver < cost)) return previous;
    const state = structuredClone(previous);
    if (zahlung === "vorrat") state.ressource -= cost;
    else state.silver -= cost;
    (state.companionQuests ??= {})[id] = { status: "done", debt: 0 };
    join(state, id);
    note(state, world.companions[id].name + " wird für " + cost + " " + (zahlung === "vorrat" ? resourceName(state) : "Silber") +
      " angeworben und schließt sich deiner Gruppe an.");
    return state;
  }

  function bondActions(state, id) {
    if (!world.loyalties[id]) return [];
    if (!state.party.includes(id) || state.combat || !state.health ||
        !["watch-yard", "return-ford", "skarn-gate"].includes(state.scene)) return [];
    const bond = relationship(state, id);
    const completed = ["ankunft", "moorbericht", "grenzbericht"].filter(mark => state.rewards.includes(mark)).length;
    const actions = [];
    if (bond.talks < 4 && bond.talks <= completed) actions.push("talk");
    if (bond.score === 100) {
      if (!bond.gift) actions.push("gift");
      if (bond.bond === "none") actions.push("romance", "friendship");
    }
    return actions;
  }

  function bondWith(previous, id, action) {
    if (!bondActions(previous, id).includes(action)) return previous;
    const state = structuredClone(previous);
    const bond = { ...relationship(state, id) };
    state.relationships[id] = bond;
    const name = world.companions[id].name;
    if (action === "talk") {
      bond.score = clampRuf(bond.score + 18);
      note(state, world.loyalties[id].talk[bond.talks++]);
    } else if (action === "gift") {
      bond.gift = true;
      const item = world.loyalties[id].gift;
      note(state, name + " schenkt dir " + world.items[item] + ".");
      receive(state, [item]);
    } else {
      bond.bond = action;
      note(state, action === "romance"
        ? "Du sagst " + name + ", dass dir eure Nähe etwas bedeutet. Ihr beschließt, euch Zeit füreinander zu nehmen."
        : "Du sprichst mit " + name + " darüber, was dir eure Freundschaft bedeutet.");
    }
    return state;
  }

  function dismiss(previous, id) {
    if ((previous.scene !== "watch-yard" && !storageSite(previous)) || previous.combat || !previous.health || !previous.party.includes(id)) return previous;
    const state = structuredClone(previous);
    state.party = state.party.filter(member => member !== id);
    if (state.companionEquipment) delete state.companionEquipment[id];
    note(state, world.companions[id].name + (world.companions[id].soeldner
      ? " bleibt in der Stadt und wartet auf deinen nächsten Auftrag."
      : " verlässt die Gruppe und kehrt zum Treffpunkt zurück."));
    return state;
  }

  // Erfahrungsstufen 1 bis 20 (100 × n EP von Stufe n auf n+1). Die Stufe schaltet Fähigkeiten, LP und Kraft frei.
  // Grundwertpunkte gibt es nur noch aus Spielständen vor dem Kampfdokument (stufenpunkte).
  // Menschen (Patch 2.1.0 Punkt 1): Stufen bis 30, ab 21 mit Henrys festen Schritten.
  const stufeVon = (state) => menschen(state) ? SY.stufeAus(state.xp ?? 0) : kampf.stufeAus(state.xp ?? 0);
  function progression(state) {
    const stufe = stufeVon(state);
    const [max, ep] = menschen(state) ? [SY.maxStufe, SY.epFuer] : [kampf.maxStufe, kampf.epFuer];
    return { level: stufe, xp: state.xp, next: stufe < max ? ep(stufe + 1) : null,
      floor: ep(stufe), points: trainingLeft(state) };
  }
  // Patch 2.5.5 (Menschen): Jede Stufe von 2 bis 30 bringt 2 Grundwertpunkte und 1 Fertigkeits- oder Talentpunkt.
  // Stufe 2–20: Ränge der Klassen- und Spezialisierungsfähigkeiten (bis Rang 4, +12 % Schaden/Heilung je Rang,
  // Rang 4 kostet 1 Ausdauer/Mana weniger). Stufe 21–30: Meister-Talente. Jeder Ahnenrang: +1 Grundwertpunkt.
  // Grundwerte höchstens 20, nach Stufe 30 (Blut der Ahnen) höchstens 25.
  const aufstieg = { grundwertJeStufe: 2, rangMax: 4, rangStufen: { 2: 3, 3: 8, 4: 15 }, rangBonus: 0.12, rangRabatt: 1,
    faehigkeitBis: 20, grenzeAhnen: 25 };
  const grundwertPunkteGesamt = (state) => aufstieg.grundwertJeStufe * (stufeVon(state) - 1) + SY.ahnenPunkte(state.xp ?? 0) +
    (state.grundwertAlt ?? 0) + (state.stufenpunkte ?? 0);
  const trainingLeft = (state) => menschen(state)
    ? Math.max(0, grundwertPunkteGesamt(state) - total(state.training ?? {})) : state.stufenpunkte ?? 0;
  const grundwertGrenze = (state) => SY.istMensch(state.faction) && SY.stufeAus(state.xp ?? 0) >= SY.maxStufe
    ? aufstieg.grenzeAhnen : K.regeln.grundwertMax;
  const faehigkeitRang = (state, id) => state.faehigkeitRaenge?.[id] ?? 1;
  const faehigkeitPunkte = (state) => menschen(state) ? Math.max(0, Math.min(stufeVon(state), aufstieg.faehigkeitBis) - 1 -
    Object.values(state.faehigkeitRaenge ?? {}).reduce((sum, rang) => sum + rang - 1, 0)) : 0;
  const legacyThresholds = [0, 75, 175, 285, 410, 560];
  const heroAttributes = (state) => attributes(state.faction, state.role, state.build, state.training ?? {});
  const heroSkills = (state) => ({ ...state.build.fertigkeiten });
  const heroLimits = (state) => skillLimits(state.faction, heroAttributes(state));
  const modifiers = (state) => Object.fromEntries(Object.entries(heroAttributes(state)).map(([id, value]) => [id, modifier(value)]));
  // Probe und Wirkung: Fertigkeit plus Bonus oder Malus ihres Grundwerts.
  function skillValue(state, id) {
    return state.build.fertigkeiten[id] + modifier(heroAttributes(state)[K.fertigkeiten[id].grundwert]);
  }
  // Schaden: Stärke wirkt nur im Nahkampf, Geschick nur im Fernkampf.
  function damageValue(state, id) {
    return ["nahkampf", "fernkampf"].includes(id) ? skillValue(state, id) : state.build.fertigkeiten[id];
  }
  const gearSkill = (gear) => gear.skill ?? ({ strength: "nahkampf", agility: gear.airborne ? "fernkampf" : "nahkampf", mind: "magie" })[gear.stat];
  // Lebenspunkte hängen an der Rolle und der Erfahrungsstufe (Kampfdokument).
  // Menschen (Patch 2.4.0): Grund-LP aus Henrys Klassen geteilt durch 3,5, Zuwachs je Stufe wie im Kampfdokument.
  const healthLimit = (state) => {
    const neu = SY.istMensch(state.faction) && SY.daten.menschenKlassen[state.faction]?.[state.role];
    if (!neu) return kampf.lebenspunkte(profile(state.faction, state.role), kampf.stufeAus(state.xp ?? 0));
    // Patch 2.6.2: Ungebrochener Schildwall Rang 1 +8 LP. Eisernes Ahnenblut +25 LP je Rang (÷ 3,5). Patch 2.6.5: LP der Ausrüstung.
    const grund = neu.lp + kampf.lpTabelle[profile(state.faction, state.role)][1] * (SY.stufeAus(state.xp ?? 0) - 1);
    return grund + SY.talentWirkung(state, "TREE_UNGEBROCHENER_SCHILDWALL", "max_hp_bonus") + SY.skaliert(25) * (state.ahnen?.perk_iron_blood ?? 0) +
      gearStat(state, "maxHp");
  };
  // Summe eines Werts der neuen Ausrüstung (Patch 2.6.5) über alle angelegten Plätze.
  const gearStat = (state, key) => equipmentSlots.reduce((s, slot) => s + (world.gear[state.equipment?.[slot]]?.v260?.[key] ?? 0), 0);
  const legacyHealthLimit = (state) => 18 + heroAttributes(state).strength + 2 * state.build.fertigkeiten.verteidigung;
  // Patch 2.5.4: Unter den Menschen hat nur der Orden der Flamme die Glutgabe (Start 5, höchstens 10).
  // Kronreich und Freie Häfen haben keine Glut (0) und kein Gleichgewicht.
  const glutOrden = { start: 5, max: 10 };
  const emberLimit = (state) => SY.istMensch(state.faction)
    ? (state.faction === "orden" ? glutOrden.max : 0) : 1 + Math.floor(heroAttributes(state).will / 3);
  // Halten und Blocken über Verteidigung, Ausweichen über Geschick.
  const protection = (state) => Math.floor(state.build.fertigkeiten.verteidigung / 2) + modifier(heroAttributes(state).agility);

  function title(state) {
    const meister = state.build.meister && K.meisterklassen[people(state.faction)];
    if (meister) return state.appearance === "frau" && meister.weiblich ? meister.weiblich : meister.name;
    const klasse = K.fraktionen[state.faction].klassen[state.role];
    return state.build.spez ? klasse[state.build.spez.variante][0] : klasse.name;
  }

  function train(previous, id) {
    if (!own(K.grundwerte, id) || previous.combat || !previous.health || trainingLeft(previous) < 1 ||
        heroAttributes(previous)[id] >= grundwertGrenze(previous)) return previous;
    const state = structuredClone(previous);
    state.training[id] = (state.training[id] ?? 0) + 1;
    if (!menschen(state)) state.stufenpunkte--;
    state.health += healthLimit(state) - healthLimit(previous);
    state.ember += emberLimit(state) - emberLimit(previous);
    note(state, K.grundwerte[id] + " dauerhaft um 1 erhöht.");
    return state;
  }

  function faehigkeitGrund(state, id) {
    if (!menschen(state)) return "nur für die Menschen";
    if (state.combat) return "nicht im Kampf";
    const f = abilities(state).find((entry) => entry.id === id);
    if (!f || !f.frei) return "noch nicht freigeschaltet";
    const naechster = faehigkeitRang(state, id) + 1;
    if (naechster > aufstieg.rangMax) return "höchster Rang erreicht";
    if (level(state) < aufstieg.rangStufen[naechster]) return "Rang " + naechster + " ab Stufe " + aufstieg.rangStufen[naechster];
    if (faehigkeitPunkte(state) < 1) return "kein freier Fertigkeitspunkt";
    return null;
  }
  function faehigkeitSteigern(previous, id) {
    if (faehigkeitGrund(previous, id)) return previous;
    const state = structuredClone(previous);
    state.faehigkeitRaenge[id] = faehigkeitRang(state, id) + 1;
    const f = abilities(state).find((entry) => entry.id === id);
    note(state, f.name + " steigt auf Rang " + state.faehigkeitRaenge[id] + " (+" + Math.round(aufstieg.rangBonus * 100 * (state.faehigkeitRaenge[id] - 1)) +
      " % Wirkung" + (state.faehigkeitRaenge[id] === aufstieg.rangMax ? ", 1 Ausdauer oder Mana weniger" : "") + ").");
    return state;
  }
  function faehigkeitInfo(state) {
    if (!menschen(state)) return null;
    return { punkte: faehigkeitPunkte(state), rangMax: aufstieg.rangMax, rangStufen: { ...aufstieg.rangStufen },
      liste: abilities(state).filter((f) => f.frei).map((f) => ({ id: f.id, name: f.name, rang: faehigkeitRang(state, f.id),
        bonus: Math.round(aufstieg.rangBonus * 100 * (faehigkeitRang(state, f.id) - 1)), grund: faehigkeitGrund(state, f.id),
        wirkung: f.wirkung, kosten: f.kostenWert, zahlung: f.zahlung })), rangBonus: Math.round(aufstieg.rangBonus * 100) };
  }

  // Spezialisierung ab Quest-Stufe 3: Titel, +1 Fertigkeitspunkt, +1 Grundwert. Die Wahl gilt für immer.
  // Patch 2.0.0 Punkt 9: Menschen spezialisieren sich ab Erfahrungsstufe 10, die anderen Völker ab Quest-Stufe 3.
  const spezBereit = (state) => SY.istMensch(state.faction) ? level(state) >= 10 : state.questStufe >= K.regeln.spezialisierungStufe;
  const spezHinweis = (state) => SY.istMensch(state.faction) ? "ab Erfahrungsstufe 10" : "ab Quest-Stufe " + K.regeln.spezialisierungStufe;
  // Patch 2.1.0 Punkt 11: Bei den Menschen ersetzt Rang 4 der Signaturfähigkeit (Stufe 25) die Meisterklasse.
  const meisterBereit = (state) => !SY.istMensch(state.faction) && Boolean(state.build.spez) && !state.build.meister && state.vereinigt;
  function specialize(previous, variante, grundwert, fertigkeit) {
    if (previous.build.spez || !spezBereit(previous) || previous.combat || !previous.health ||
        !["a", "b"].includes(variante) || !own(K.fertigkeiten, fertigkeit)) return previous;
    const build = structuredClone(previous.build);
    build.spez = { variante, grundwert };
    build.fertigkeiten[fertigkeit]++;
    if (buildProblem(previous.faction, previous.role, build, previous.training)) return previous;
    const state = structuredClone(previous);
    state.build = build;
    state.health += healthLimit(state) - healthLimit(previous);
    state.ember += emberLimit(state) - emberLimit(previous);
    const [name, ability] = K.fraktionen[state.faction].klassen[state.role][variante];
    note(state, "Spezialisierung gewählt: " + name + ". " + ability.charAt(0).toUpperCase() + ability.slice(1) + ".");
    return state;
  }

  // Meisterklasse nach der Vereinigung des eigenen Volkes: +1 Fertigkeitspunkt und +2 Grundwerte.
  function ascend(previous, grundwerte, fertigkeit) {
    if (!meisterBereit(previous) || previous.combat || !previous.health ||
        !own(K.fertigkeiten, fertigkeit)) return previous;
    const build = structuredClone(previous.build);
    build.meister = { grundwerte: { ...grundwerte } };
    build.fertigkeiten[fertigkeit]++;
    if (buildProblem(previous.faction, previous.role, build, previous.training)) return previous;
    const state = structuredClone(previous);
    state.build = build;
    state.health += healthLimit(state) - healthLimit(previous);
    state.ember += emberLimit(state) - emberLimit(previous);
    note(state, "Du steigst zur Meisterklasse auf: " + title(state) + ".");
    return state;
  }

  function grant(state, id, xp, silver = 0, items = [], once = true) {
    if (once && state.rewards.includes(id)) return;
    const previousLevel = progression(state).level;
    if (once) state.rewards.push(id);
    // Schwierigkeitsgrad (Henry, 20. 11. 2026): EP- und Silberlohn-Faktor.
    const mod = schwierigkeitMod(state);
    xp = Math.round(xp * mod.ep_faktor);
    silver = Math.round(silver * mod.silber_lohn_faktor);
    // Menschen: Erbe der Baumeister +15 % Silber je Rang (Veteran von Odris entfällt mit Patch 2.6.2).
    if (menschen(state)) {
      silver = Math.round(silver * (1 + 0.15 * (state.ahnen?.perk_master_steward ?? 0)));
    }
    state.xp += xp;
    // Errata 9: Begleiter in der aktiven Gruppe erhalten dieselben EP wie die Spielfigur.
    if (xp) for (const member of state.party ?? []) {
      state.companionXp ??= {};
      const before = memberLevel(state, member);
      state.companionXp[member] = Math.min(1000000, (state.companionXp[member] ?? memberStartXp(state)) + xp);
      const gained = memberLevel(state, member) - before;
      if (gained > 0 && state.partyVitals?.[member]?.health > 0) {
        state.partyVitals[member].health = Math.min(memberHealthLimit(member, state), state.partyVitals[member].health + 2 * gained);
      }
    }
    state.silver += silver;
    const overflow = receive(state, items, false);
    const parts = [];
    if (xp) parts.push(xp + " EP");
    if (silver) parts.push(silver + " Silber");
    parts.push(...items.map(item => world.items[item]));
    const level = progression(state).level;
    if (level > previousLevel) state.health = Math.min(healthLimit(state), state.health + healthLimit(state) - kampf.lebenspunkte(profile(state.faction, state.role), previousLevel));
    const unlocked = level > previousLevel ? abilities(state).filter(f => f.frei && f.stufe > previousLevel).map(f => f.name) : [];
    if (parts.length) note(state, parts.join(" · ") +
      (level > previousLevel ? ". Erfahrungsstufe " + level + " erreicht" + (unlocked.length ? ". Neu: " + unlocked.join(", ") : "") + "." : "."));
    noteOverflow(state, overflow);
  }

  // EP-Schnittstelle für Prologe und Questakte: vergibt EP einmal je Kennung und gibt einen neuen Zustand zurück.
  // Ohne Angabe gilt der Wert eines Questakts aus dem Kampfdokument (300 EP).
  function awardXp(previous, id, xp = kampf.ep.questakt) {
    if (typeof id !== "string" || !id || !Number.isInteger(xp) || xp < 0) throw new Error("Ungültige EP-Vergabe.");
    const state = structuredClone(previous);
    grant(state, id, xp);
    return state;
  }

  function loot(state, id, dice) {
    const roll = Math.floor(dice() * 100);
    let total = 0;
    for (const [weight, items, silver] of world.lootTables[id]) {
      total += weight;
      if (roll < total) {
        grant(state, id, 15, silver, items);
        return;
      }
    }
  }

  // Händler: Zeugkammer von Eiswacht und jede Stadt mit Zentrallager auf der Weltebene.
  const handelOffen = (state) => Boolean(!state.combat && state.health > 0 &&
    (state.scene === "supply-post" || (state.scene === "weltknoten" && storageSite(state))));
  function trade(previous, id, buying) {
    if (!handelOffen(previous)) return previous;
    const prices = buying ? world.shop : world.salePrices;
    if (!own(prices, id)) return previous;
    const price = preis(previous, id, buying);
    const index = previous.inventory.indexOf(id);
    if (!buying && assigned(previous, id) >= previous.inventory.filter(item => item === id).length) return previous;
    if (buying ? previous.silver < price || previous.inventory.length >= itemCap - 20 : index === -1) return previous;
    const state = structuredClone(previous);
    if (!buying) state.inventory.splice(index, 1);
    state.silver += buying ? -price : price;
    note(state, world.items[id] + (buying ? " gekauft" : " verkauft") + " · " + price + " Silber.");
    if (buying) receive(state, [id]);
    return state;
  }

  // Begleiter tragen dieselben acht Plätze wie die Spielfigur (Errata 10, Henry 17. 11. 2026).
  function memberEquipment(state, member) {
    return { ...emptyEquipment(), ...(state.companionEquipment?.[member] ?? {}) };
  }

  function assigned(state, id) {
    return [state.equipment, ...Object.values(state.companionEquipment ?? {})]
      .reduce((count, equipment) => count + (equipment ? Object.values(equipment).filter(item => item === id).length : 0), 0);
  }

  // Legt einem Begleiter einen Gegenstand an oder ab. Ringe nehmen den ersten freien Ringplatz,
  // Zweihandwaffen räumen die linke Hand und umgekehrt.
  function equipMember(previous, id, member, wanted = null) {
    const gear = world.gear[id];
    if (!gear?.slot || previous.combat || !previous.health || !previous.inventory.includes(id) ||
        !previous.party.includes(member)) return previous;
    const current = memberEquipment(previous, member);
    const spare = previous.inventory.filter(item => item === id).length - assigned(previous, id);
    const empty = equipmentSlots.find(entry => slotKinds[entry] === gear.slot && !current[entry]);
    const slot = !wanted && spare > 0 && empty ? empty : targetSlot({ equipment: current }, id, wanted);
    if (!slot) return previous;
    if (current[slot] !== id && assigned(previous, id) >= previous.inventory.filter(item => item === id).length) return previous;
    const state = structuredClone(previous);
    const equipment = memberEquipment(state, member);
    (state.companionEquipment ??= {})[member] = equipment;
    equipment[slot] = equipment[slot] === id ? null : id;
    const removed = [];
    if (equipment[slot] && slot === "weapon" && gear.twoHanded && equipment.offhand) {
      removed.push(equipment.offhand);
      equipment.offhand = null;
    }
    if (equipment[slot] && slot === "offhand" && twoHanded(equipment.weapon)) {
      removed.push(equipment.weapon);
      equipment.weapon = null;
    }
    note(state, world.companions[member].name + ": " + world.items[id] + (equipment[slot] ? " ausgerüstet" : " abgelegt") +
      (removed.length ? ". " + removed.map(entry => world.items[entry]).join(", ") + " abgelegt." : "."));
    return state;
  }

  // Rüstung eines Begleiters über alle Plätze (Körper, Kopf, Beine, linke Hand, Ringe).
  const memberGearBonus = (state, member, key) =>
    Object.values(memberEquipment(state, member)).reduce((sum, id) => sum + (world.gear[id]?.[key] ?? 0), 0);

  const wornCount = (state, id) => equipmentSlots.filter(slot => state.equipment?.[slot] === id).length;
  const twoHanded = (id) => Boolean(world.gear[id]?.twoHanded);

  // Welcher Platz würde beim Anlegen belegt? Ringe nehmen den ersten freien Ringplatz, sonst den ersten.
  function targetSlot(state, id, wanted) {
    const kind = world.gear[id]?.slot;
    if (!kind) return null;
    if (ausruestungGrund(state, id)) return null;
    if (wanted) return slotKinds[wanted] === kind ? wanted : null;
    const slots = equipmentSlots.filter(slot => slotKinds[slot] === kind);
    return slots.find(slot => state.equipment[slot] === id) ?? slots.find(slot => !state.equipment[slot]) ?? slots[0];
  }

  // Legt einen Gegenstand an oder, wenn er auf dem Platz liegt, ab. Zweihandwaffen räumen die linke Hand.
  function equip(previous, id, wanted = null, memberSlot = null) {
    if (own(world.companions, wanted)) return equipMember(previous, id, wanted, memberSlot);
    const gear = world.gear[id];
    const slot = targetSlot(previous, id, wanted);
    if (!slot || previous.combat || !previous.health || !previous.inventory.includes(id)) return previous;
    const state = structuredClone(previous);
    if (state.equipment[slot] === id) {
      state.equipment[slot] = null;
      note(state, world.items[id] + " abgelegt.");
      return state;
    }
    if (assigned(state, id) >= state.inventory.filter(entry => entry === id).length) {
      const other = equipmentSlots.find(entry => entry !== slot && state.equipment[entry] === id);
      if (!other) return previous;
      state.equipment[other] = null;
    }
    const replaced = state.equipment[slot];
    state.equipment[slot] = id;
    const removed = [];
    if (slot === "weapon" && gear.twoHanded && state.equipment.offhand) {
      removed.push(state.equipment.offhand);
      state.equipment.offhand = null;
    }
    if (slot === "offhand" && twoHanded(state.equipment.weapon)) {
      removed.push(state.equipment.weapon);
      state.equipment.weapon = null;
    }
    note(state, world.items[id] + " ausgerüstet" + (replaced ? " statt " + world.items[replaced] : "") +
      (removed.length ? ". " + removed.map(entry => world.items[entry]).join(", ") + " abgelegt, beide Hände werden gebraucht." : "."));
    return state;
  }

  // Legt den Gegenstand eines Platzes ab oder, ohne Angabe, die gesamte Ausrüstung. Er bleibt im Rucksack.
  function unequip(previous, slot = null) {
    const slots = slot ? [slot] : equipmentSlots;
    if (previous.combat || !previous.health || !slots.every(entry => equipmentSlots.includes(entry)) ||
        !slots.some(entry => previous.equipment[entry])) return previous;
    const state = structuredClone(previous);
    const removed = slots.filter(entry => state.equipment[entry]).map(entry => state.equipment[entry]);
    for (const entry of slots) state.equipment[entry] = null;
    note(state, slot ? world.items[removed[0]] + " abgelegt." : "Gesamte Ausrüstung abgelegt: " + removed.map(id => world.items[id]).join(", ") + ".");
    return state;
  }

  // Wegwerfen (UI-Überarbeitung 19. 11. 2026): ein Stück aus dem Rucksack entfernen. Nicht im Kampf, keine
  // Questgegenstände und keine Stücke, die gerade der Held oder ein Begleiter trägt.
  function wegwerfGrund(state, id) {
    if (state.combat || !state.health) return "nicht im Kampf";
    if (!state.inventory.includes(id)) return "nicht im Rucksack";
    if (questItems.has(id)) return "Questgegenstand";
    if (assigned(state, id) >= state.inventory.filter(entry => entry === id).length) return "angelegt";
    return null;
  }
  function wegwerfen(previous, id) {
    if (wegwerfGrund(previous, id)) return previous;
    const state = structuredClone(previous);
    state.inventory.splice(state.inventory.lastIndexOf(id), 1);
    note(state, world.items[id] + " weggeworfen.");
    return state;
  }

  // Werte des Helden mit der aktuellen oder einer probeweise geänderten Ausrüstung.
  function gearStats(state, equipment = state.equipment) {
    const preview = { ...state, equipment };
    const weaponId = weapon(preview);
    const held = world.gear[weaponId];
    return {
      damage: aufgewertet(preview, weaponId, held.power) + damageValue(state, gearSkill(held)), pierce: held.pierce ?? 0, armor: gearBonus(preview, "armor"),
      magic: gearBonus(preview, "magic"), travel: gearBonus(preview, "travel"), airborne: held.airborne ?? 0,
    };
  }

  // Vergleich: Wie ändern sich die Werte, wenn dieser Gegenstand angelegt würde?
  function equipPreview(state, id, wanted = null) {
    const inventory = state.inventory.includes(id) ? state.inventory : [...state.inventory, id];
    const next = equip({ ...state, inventory, combat: null, health: Math.max(1, state.health) }, id, wanted);
    if (next.equipment === state.equipment) return null;
    const before = gearStats(state);
    const after = gearStats(state, next.equipment);
    return Object.fromEntries(Object.keys(before).map(key => [key, after[key] - before[key]]));
  }

  // Rucksack und Lager. Gleiche Gegenstände stapeln sich auf einem Platz, Questgegenstände belegen keinen.
  const bagSlots = bagBase;
  // Das Zentrallager ist unbegrenzt; 5000 ist nur die technische Grenze des Spielstands.
  const storageLimit = 5000;
  function bagLimit(state) {
    const strength = heroAttributes(state).strength;
    return bagBase + 10 * (state.rucksack ?? 0) + Math.max(0, modifier(strength));
  }
  const questItems = new Set(Object.values(world.scenes).flatMap(scene => (scene.choices ?? []).map(choice => choice.requiresItem))
    .filter(id => id && !own(world.supplies, id) && !own(world.gear, id)));

  function category(id) {
    const slot = world.gear[id]?.slot;
    if (slot) return slot;
    if (own(world.supplies, id)) return "supply";
    if (questItems.has(id)) return "quest";
    if (own(relikte, id)) return "relikt";
    return "trophy";
  }

  // Jeder Stapel aus bis zu 10 gleichen Gegenständen belegt einen Platz.
  function slotsUsed(state) {
    const counts = {};
    for (const id of state.inventory) if (!questItems.has(id)) counts[id] = (counts[id] ?? 0) + 1;
    return Object.values(counts).reduce((sum, count) => sum + Math.ceil(count / stackLimit), 0);
  }

  function fits(state, id) {
    const count = state.inventory.filter(entry => entry === id).length;
    return questItems.has(id) || (count > 0 && count % stackLimit !== 0) || slotsUsed(state) < bagLimit(state);
  }

  // Rucksack-Ausbau beim Sattler oder Gildenhändler einer Stadt mit Zentrallager. Bezahlt wird mit Silber oder Material.
  function bagUpgrade(state) {
    const next = world.bagUpgrades[state.rucksack ?? 0];
    if (!next) return null;
    const free = (id) => state.inventory.filter(entry => entry === id).length - assigned(state, id);
    const trade = !next.handel || people(state.faction) === "zwerge" || state.faction === "haefen" || reputation(state, "league") >= 25;
    return { ...next, stufe: (state.rucksack ?? 0) + 1, trade,
      silverReady: trade && state.silver >= next.silber,
      materialReady: trade && Object.entries(next.material).every(([id, count]) => free(id) >= count) };
  }

  function upgradeBag(previous, payment = "silver") {
    if (!storageOpen(previous)) return previous;
    const plan = bagUpgrade(previous);
    if (!plan || !(payment === "silver" ? plan.silverReady : plan.materialReady)) return previous;
    const state = structuredClone(previous);
    if (payment === "silver") state.silver -= plan.silber;
    else for (const [id, count] of Object.entries(plan.material)) {
      for (let index = 0; index < count; index++) state.inventory.splice(state.inventory.indexOf(id), 1);
    }
    state.rucksack = plan.stufe;
    note(state, plan.name + " gekauft. Dein Rucksack fasst jetzt " + bagLimit(state) + " Plätze.");
    return state;
  }

  // Gürtel: zwei Schnellzugriffsplätze für Verbrauchsgüter. Sie verweisen auf Gegenstände im Rucksack.
  function belt(state) {
    const used = {};
    return Array.from({ length: beltSize }, (_, index) => {
      const id = state.guertel?.[index] ?? null;
      if (!id) return null;
      used[id] = (used[id] ?? 0) + 1;
      return used[id] <= state.inventory.filter(entry => entry === id).length ? id : null;
    });
  }

  function setBelt(previous, index, id) {
    if (!intBetween(index, 0, beltSize - 1) || previous.combat || !previous.health ||
        (id !== null && (!own(world.supplies, id) || !previous.inventory.includes(id)))) return previous;
    const state = structuredClone(previous);
    state.guertel = belt(state);
    state.guertel[index] = id;
    if (id && belt(state)[index] !== id) return previous;
    note(state, id ? world.items[id] + " am Gürtel befestigt." : "Gürtelplatz geleert.");
    return state;
  }

  // Ein Gürtelgegenstand wirkt im Kampf ohne Ausdauer, Mana und ohne die Aktion der Runde zu verbrauchen.
  function quickUse(previous, index, targetId = "hero", events = []) {
    const id = belt(previous)[index];
    if (!id || !canUse(previous, id, targetId)) return previous;
    const state = structuredClone(previous);
    state.guertel = belt(state);
    state.guertel[index] = null;
    consume(state, id, targetId, events);
    note(state, "Griff zum Gürtel: Die Runde läuft weiter.");
    return state;
  }

  // Legt neue Gegenstände in den Rucksack. Ist er voll, bringt ein Bote sie ins Lager. Nichts geht verloren.
  function receive(state, items, announce = true) {
    const overflow = [];
    for (const id of items) {
      if (fits(state, id) && state.inventory.length < itemCap) state.inventory.push(id);
      else if (state.storage.length < storageLimit) {
        state.storage.push(id);
        overflow.push(id);
      }
    }
    if (announce) noteOverflow(state, overflow);
    return overflow;
  }

  function noteOverflow(state, overflow) {
    if (!overflow.length) return;
    note(state, "Dein Rucksack ist voll. " + [...new Set(overflow)].map(id => world.items[id]).join(", ") +
      (overflow.length > 1 ? " werden" : " wird") + " ins Lager gebracht.");
  }

  function storageSite(state) {
    // Weltebene: Zentrallager in allen Hauptstädten und in den Städten der eigenen Fraktion.
    if (state.scene === "weltknoten") {
      const ort = N.get(state.knoten);
      return ort && (ort.typ === "hauptstadt" || (ort.typ !== "dorf" && ort.fraktion === state.faction)) ? "Zentrallager · " + ort.name : null;
    }
    const scene = world.scenes[state.scene];
    return world.storageSites[scene?.map] ?? world.storageSites[scene?.lager] ?? null;
  }

  function storageOpen(state) {
    return Boolean(!state.combat && state.health > 0 && storageSite(state));
  }

  function canStore(state, id) {
    return storageOpen(state) && state.inventory.includes(id) && !questItems.has(id) && state.storage.length < storageLimit;
  }

  function canRetrieve(state, id) {
    return storageOpen(state) && state.storage.includes(id) && fits(state, id) && state.inventory.length < itemCap;
  }

  function moveCount(from, id, count) {
    const have = from.filter(entry => entry === id).length;
    return Math.max(1, Math.min(have, Number.isInteger(count) ? count : 1));
  }

  function store(previous, id, count = 1) {
    if (!canStore(previous, id)) return previous;
    const state = structuredClone(previous);
    const amount = Math.min(moveCount(state.inventory, id, count), storageLimit - state.storage.length);
    for (let index = 0; index < amount; index++) {
      state.inventory.splice(state.inventory.indexOf(id), 1);
      state.storage.push(id);
    }
    let remaining = state.inventory.filter(entry => entry === id).length;
    let unequipped = false;
    for (const slot of equipmentSlots) {
      if (state.equipment[slot] !== id) continue;
      if (remaining > 0) remaining--;
      else {
        state.equipment[slot] = null;
        unequipped = true;
      }
    }
    for (const equipment of Object.values(state.companionEquipment ?? {})) {
      for (const slot of ["weapon", "armor"]) {
        if (equipment[slot] !== id) continue;
        if (remaining > 0) remaining--;
        else { equipment[slot] = null; unequipped = true; }
      }
    }
    note(state, world.items[id] + (amount > 1 ? " ×" + amount : "") + " eingelagert" + (unequipped ? " und abgelegt." : "."));
    return state;
  }

  function retrieve(previous, id, count = 1) {
    if (!canRetrieve(previous, id)) return previous;
    const state = structuredClone(previous);
    const amount = Math.min(moveCount(state.storage, id, count), 200 - state.inventory.length);
    for (let index = 0; index < amount; index++) {
      state.storage.splice(state.storage.indexOf(id), 1);
      state.inventory.push(id);
    }
    note(state, world.items[id] + (amount > 1 ? " ×" + amount : "") + " aus dem Lager genommen.");
    return state;
  }

  const memberHealth = { knight: 32, mage: 24, priest: 26, ranger: 28, thief: 26, necromancer: 24, paladin: 34, druid: 28, warrior: 36 };
  // Begleiter wachsen mit ihrer Erfahrungsstufe: +2 LP je Stufe über 1 (Vorschlagswert, Errata 9).
  const memberHealthLimit = (id, state = null) => (memberHealth[id] ?? world.companions[id]?.health ?? 24) +
    (state ? 2 * (memberLevel(state, id) - 1) : 0);
  function memberVitals(state, id) {
    return state.partyVitals?.[id] ?? { health: memberHealthLimit(id, state), status: {} };
  }
  function ensureVitals(state) {
    state.partyVitals ??= {};
    state.heroStatus ??= {};
    for (const id of state.party) state.partyVitals[id] ??= { health: memberHealthLimit(id, state), status: {} };
  }
  function allies(state) {
    return [{ id: "hero", name: state.name, health: state.health, max: healthLimit(state), status: state.heroStatus ?? {} },
      ...state.party.map(id => ({ id, name: world.companions[id].name, health: memberVitals(state, id).health,
        max: memberHealthLimit(id, state), status: memberVitals(state, id).status }))];
  }
  function changeHealth(state, id, value) {
    ensureVitals(state);
    if (id === "hero") state.health = Math.max(0, Math.min(healthLimit(state), value));
    else {
      state.partyVitals[id].health = Math.max(0, Math.min(memberHealthLimit(id, state), value));
      if (!state.partyVitals[id].health) state.partyVitals[id].status = {};
    }
  }
  function healAlly(state, id, amount, actor, events) {
    const target = allies(state).find(ally => ally.id === id);
    if (!target?.health) return 0;
    const healing = Math.min(amount, target.max - target.health);
    changeHealth(state, id, target.health + healing);
    if (healing) events.push({ kind: "heal", actor, ally: id, value: healing });
    return healing;
  }
  function canUse(state, id, targetId = "hero") {
    const supply = world.supplies[id];
    const target = allies(state).find(ally => ally.id === targetId);
    return Boolean(supply && target && state.health > 0 && state.inventory.includes(id) &&
      (supply.revive ? targetId !== "hero" && target.health === 0 : target.health > 0 &&
      ((supply.heal && target.health < target.max) || (supply.ember && targetId === "hero" && state.ember < emberLimit(state)) ||
        // Patch 2.4.0: Mana- und Fokustränke wirken nur im Kampf und nur auf die Spielfigur.
        (supply.mana && targetId === "hero" && state.combat && state.combat.held.mana < kraft(state).mana) ||
        (supply.ausdauer && targetId === "hero" && state.combat && state.combat.held.ausdauer < kraft(state).ausdauer) ||
        (supply.cure && target.status[supply.cure]))));
  }
  function consume(state, id, targetId = "hero", events = []) {
    ensureVitals(state);
    const supply = world.supplies[id];
    const target = allies(state).find(ally => ally.id === targetId);
    state.inventory.splice(state.inventory.indexOf(id), 1);
    if (supply.revive) {
      const restored = Math.max(1, Math.ceil(target.max * supply.revive / 100));
      changeHealth(state, targetId, restored);
      events.push({ kind: "revive", actor: "hero", ally: targetId, value: restored });
    }
    // Patch 2.6.9: Hafen-Tinktur: +15 % Wirkung der Heil- und Fokustränke.
    const tinktur = (wert) => /^POT_/.test(id) && state.gefaehrtenPerks?.includes("PERK_FH_HAFEN_TINKTUR") ? Math.round(wert * 1.15) : wert;
    if (!supply.revive && supply.heal) healAlly(state, targetId, tinktur(supply.heal), "hero", events);
    if (supply.ember) state.ember = Math.min(emberLimit(state), state.ember + supply.ember);
    if (supply.mana && state.combat) state.combat.held.mana = Math.min(kraft(state).mana, state.combat.held.mana + tinktur(supply.mana));
    if (supply.ausdauer && state.combat) state.combat.held.ausdauer = Math.min(kraft(state).ausdauer, state.combat.held.ausdauer + tinktur(supply.ausdauer));
    if (supply.cure) {
      delete (targetId === "hero" ? state.heroStatus : state.partyVitals[targetId].status)[supply.cure];
      events.push({ kind: "cleanse", actor: "hero", ally: targetId });
    }
    note(state, world.items[id] + " für " + target.name + " verwendet.");
  }
  function use(previous, id, targetId = "hero") {
    if (!canUse(previous, id, targetId)) return previous;
    if (previous.combat) return strike(previous, "herb", Math.random, id, undefined, [], targetId);
    const state = structuredClone(previous);
    consume(state, id, targetId);
    return state;
  }

  function note(state, text) {
    state.journal = [...state.journal.slice(-15), text];
  }

  function cast(state, shift) {
    // Patch 2.5.4: Ohne Glutgabe gibt es weder Glut noch eine verdeckte Verschiebung des Gleichgewichts.
    if (!glutgabe(state)) return false;
    state.ember--;
    const balance = state.balance + shift;
    if (Math.abs(balance) < 4) {
      state.balance = balance;
      return true;
    }
    state.balance = Math.sign(balance) * 3;
    const recoil = Math.min(state.health, state.marks.includes("steinrhythmus") ? 3 : 6);
    state.health -= recoil;
    note(state, "Die Glut gerät außer Kontrolle. Der Rückstoß kostet " + recoil + " LP.");
    return false;
  }

  function affectSoil(state, approach) {
    if (cast(state, approach === "balanced" ? 0 : 4)) {
      markDeed(state, "saat-erholt");
      note(state, "Die Wärme dringt langsam in die Erde. Zwischen den Bohlen am Feldrand brechen die ersten grünen Spitzen durch.");
    } else {
      markDeed(state, "saat-verbrannt");
      note(state, "Die Flamme springt in die Saat. Der Boden bleibt schwarz, und die Fuhrleute sehen den Rauch.");
    }
  }

  function arrive(state, scene) {
    const changed = state.scene !== scene;
    // Patch 2.5.4: Die Niederlage merkt sich, wo der Held gefallen ist, damit er von dort weitermachen kann.
    if (scene === "defeat" && changed) state.gefallenIn = state.scene === "weltende" ? null : state.scene;
    state.scene = scene;
    state.combat = null;
    if (scene === "arrival") state.inventory.push("flusssiegel");
    if (scene === "pass-report" && !state.marks.includes("pass-gemeldet")) state.marks.push("pass-gemeldet");
    if (scene === "skarn-cliffs-open" && !state.marks.includes("skarn-klippen-frei")) state.marks.push("skarn-klippen-frei");
    if (changed && world.milestones[scene]) grant(state, ...world.milestones[scene]);
  }

  function passOpen(state) {
    return ["pass-mine", "pass-ridge", "pass-ravine"].some((mark) => state.marks.includes(mark));
  }

  function conditionMet(state, condition) {
    if (!condition) return true;
    if (condition === "pass-open") return passOpen(state) && !state.marks.includes("pass-gesperrt");
    if (condition === "report-ready") return state.marks.includes("joren-gerettet") || state.marks.includes("joren-verloren");
    if (condition === "unbalanced") return state.balance !== 0;
    if (condition === "skarn-done") return state.marks.includes("runen-geschuetzt") || state.marks.includes("runen-verbrannt");
    const tollResolved = ["zoll-verhandelt", "zoll-umgangen", "zoll-befreit"].some(mark => state.marks.includes(mark));
    if (condition === "toll-unresolved") return !tollResolved;
    if (condition === "toll-resolved") return tollResolved;
    return ending(state).delivery === (condition === "delivery");
  }

  function hasMarks(state, requirement, match) {
    if (!requirement) return false;
    const marks = Array.isArray(requirement) ? requirement : [requirement];
    return marks[match]((mark) => state.marks.includes(mark));
  }

  function choices(state) {
    if (state.combat) return [];
    const options = world.scenes[state.scene].choices ?? [];
    const gabe = glutgabe(state);
    return options.filter((choice) =>
      (!choice.origin || choice.origin === state.origin) &&
      // Patch 2.5.4: Glutkosten nur mit Glutgabe (Orden), Ersatzwahlen nur ohne sie (Kronreich, Freie Häfen).
      (!choice.emberCost || (gabe && state.ember >= choice.emberCost)) &&
      (!choice.glutlos || !gabe) &&
      (!choice.requires || hasMarks(state, choice.requires, "every")) &&
      !hasMarks(state, choice.excludes, "some") &&
      (!choice.requiresItem || state.inventory.includes(choice.requiresItem)) &&
      (!choice.faction || reputation(state, choice.faction[0]) >= choice.faction[1]) &&
      conditionMet(state, choice.condition) &&
      // Hardcore (Permadeath): keine Rettung in die Zuflucht.
      !(choice.survive && permadeath(state))
    ).map((choice) => (choice.ohneGlut && !gabe ? { ...choice, ...choice.ohneGlut } : choice));
  }

  function rufGeben(state, ruf) {
    for (const [id, delta] of Object.entries(ruf ?? {})) state.factionRuf[id] = clampRuf(reputation(state, id) + delta);
  }

  // Patch 2.5.4: Die letzte sichere Stadt (keine Siedlung, eigene Fraktion oder Vertragspartner), sonst die eigene Hauptstadt.
  const sichererOrt = (state, ort) => Boolean(ort && ort.typ !== "dorf" &&
    (ort.fraktion === state.faction || (state.vertraege ?? []).includes(ort.fraktion)));
  function zuflucht(state) {
    if (state.zuflucht && N.get(state.zuflucht)) return state.zuflucht;
    const haupt = Object.values(N.alle).find((ort) => ort.typ === "hauptstadt" && ort.fraktion === state.faction);
    return haupt?.id ?? state.knoten ?? null;
  }
  const niederlageFolgen = { silber: 0.75, moral: -20, lp: 1 };
  // Aus dem Staub kriechen: 1 LP, drei Viertel des Silbers, Moral −20, kein Kampf mehr. Wer in der Weltreise fiel,
  // erwacht in der letzten Zuflucht. Wer in einer Geschichte fiel, erwacht dort ebenfalls, und die Geschichte wartet
  // an ihrem Ort. Ohne Weltort (Prolog) erwacht der Held in der Szene, in der er gefallen ist.
  function ueberleben(state) {
    const von = state.gefallenIn;
    state.gefallenIn = null;
    state.combat = null;
    state.health = niederlageFolgen.lp;
    ensureVitals(state);
    for (const id of state.party) if (memberVitals(state, id).health <= 0) changeHealth(state, id, 1);
    const mod = schwierigkeitMod(state);
    const verlust = state.silver - Math.floor(state.silver * mod.niederlage_silber_faktor);
    state.silver -= verlust;
    if (menschen(state)) state.moral = Math.max(SY.daten.moral.min, (state.moral ?? SY.daten.moral.start) + mod.niederlage_moral_abzug);
    const ziel = zuflucht(state);
    const geschichte = von && von !== "weltknoten" ? von : null;
    const geschichtsOrt = geschichte ? aktuellerKnoten({ ...state, scene: geschichte }) : null;
    if (ziel && (!geschichte || geschichtsOrt)) {
      if (geschichte) state.handlung = { szene: geschichte, knoten: geschichtsOrt };
      state.knoten = ziel;
      state.scene = "weltknoten";
      note(state, "Du schleppst dich schwer verwundet nach " + N.get(ziel).name + "." +
        (verlust ? " " + verlust + " Silber sind verloren." : "") + (menschen(state) ? " Die Moral sinkt um " + -mod.niederlage_moral_abzug + "." : ""));
    } else {
      state.scene = geschichte ?? startpunkte.szene(state.faction);
      note(state, "Du kommst im Dreck wieder zu dir, schwer verwundet." +
        (verlust ? " " + verlust + " Silber sind verloren." : "") + (menschen(state) ? " Die Moral sinkt um " + -mod.niederlage_moral_abzug + "." : ""));
    }
  }

  function chooseStep(previous, id, dice = Math.random) {
    const choice = choices(previous).find((item) => item.id === id);
    if (!choice) return previous;
    const state = structuredClone(previous);
    if (choice.survive) {
      if (permadeath(state)) return previous;
      ueberleben(state);
      return state;
    }
    if (choice.check) {
      const [key, target] = choice.check;
      // Patch 2.5.4: Proben auf einen Grundwert (Stärke, Geschick, Intelligenz …) nutzen dessen Modifikator.
      const grundwert = own(K.grundwerte, key);
      const bonus = (grundwert ? modifier(heroAttributes(state)[key]) : skillValue(state, key)) +
        (state.marks.includes(choice.advantage) ? 2 : 0) + (key === "list" ? gearBonus(state, "travel") : 0);
      const roll = 1 + Math.floor(dice() * 20);
      const passed = roll + bonus >= target;
      note(state, (grundwert ? K.grundwerte[key] : K.fertigkeiten[key].name) + " " + roll + " + " + bonus + " gegen " + target + ". " +
        (passed ? choice.pass : choice.fail));
      if (passed && choice.item) receive(state, [choice.item]);
      if (passed && choice.mark) markDeed(state, choice.mark);
      if (passed) rufGeben(state, choice.ruf);
      if (!passed && choice.failMark) markDeed(state, choice.failMark);
      if (passed || !choice.fight) {
        arrive(state, passed ? choice.to : choice.failTo ?? choice.to);
        return state;
      }
    } else {
      if (choice.mark) markDeed(state, choice.mark);
      if (choice.ruf && !choice.emberRescue) rufGeben(state, choice.ruf);
      if (choice.silberMin) state.silver = Math.max(state.silver, choice.silberMin);
      // Glutkosten ohne eigene Glutwirkung (Prologe, spend): die Glut wird einfach verbraucht.
      if (choice.spend) state.ember -= choice.emberCost;
      if (choice.item) receive(state, [choice.item]);
      if (choice.consume) state.inventory.splice(state.inventory.indexOf(choice.consume), 1);
      if (choice.recover) {
        state.health = Math.min(healthLimit(state), state.health + choice.recover);
        ensureVitals(state);
        for (const id of state.party) if (memberVitals(state, id).health > 0) {
          changeHealth(state, id, memberVitals(state, id).health + choice.recover);
        }
      }
      if (choice.replenish) state.ember = Math.min(emberLimit(state), state.ember + choice.replenish);
      if (choice.center || (choice.id === "rest" && state.scene === "arrival")) state.balance = 0;
      if (choice.soil) affectSoil(state, choice.soil);
      if (choice.emberRescue) {
        if (cast(state, choice.balanceShift ?? -2)) {
          markDeed(state, choice.emberRescue === true ? "joren-gerettet" : choice.emberRescue);
          rufGeben(state, choice.ruf);
          note(state, choice.message);
        } else if (state.health > 0) {
          note(state, choice.emberRescue === true
            ? "Der Balken rutscht tiefer. Joren lebt noch. Du kannst deine Glut sammeln oder Hilfe holen."
            : "Glut schlägt aus der Schrift. Torben steht noch im Spalt. Sammle dich, bevor du es erneut versuchst.");
          return state;
        }
      } else if (choice.message) note(state, choice.message);
      if (choice.loot) loot(state, choice.loot, dice);
    }
    if (!state.health) {
      arrive(state, "defeat");
      return state;
    }
    if (choice.welt) {
      // Kronreich und Orden beginnen Akt 1 in ihrer Hauptstadt. Die Geschichte um Kornwik wartet dort, bis der Held hinreist.
      arrive(state, choice.to);
      state.handlung = { szene: choice.to, knoten: "kornwik" };
      state.knoten = choice.welt;
      state.scene = "weltknoten";
      state.hauptquest ??= { schritt: 0, wahl: null };
      return state;
    }
    if (choice.fight) {
      startFight(state, choice.fight);
      if (!state.health) return state;
    } else if (!travelEncounter(state, previous, choice)) {
      arrive(state, choice.to);
    }
    return state;
  }

  // Errata 8: genau ein Reisewurf pro Kantenwechsel. Er gilt für Reisen auf bekannten Wegen der Reisekarte,
  // nicht für erste Wege der Handlung und nicht für Spezialkanten mit festen Revier-Gegnern.
  function travelEncounter(state, previous, choice) {
    const from = world.scenes[previous.scene].map;
    const to = choice.destination;
    if (!to || !from || from === to || !world.travelScenes[to]?.includes(choice.to)) return false;
    const type = world.edgeType(from, to);
    const table = world.encounterTables[type];
    if (!table) return false;
    const roll = Math.floor(travelDice() * 100);
    let total = 0;
    const kind = table.find(([weight]) => roll < (total += weight))?.[1] ?? "ruhig";
    const pick = (list) => list[Math.floor(travelDice() * list.length) % list.length];
    if (kind === "ruhig") {
      note(state, "Unterwegs: " + pick(type === "grenzland" ? [...world.quietTexts, ...world.rumorTexts] : world.quietTexts));
      return false;
    }
    if (kind === "scheu") {
      // Optionale Probe auf List oder Fernkampf. Misslingt sie, flieht das Tier ohne Folgen.
      const key = skillValue(state, "fernkampf") > skillValue(state, "list") ? "fernkampf" : "list";
      const dice = 1 + Math.floor(travelDice() * 20);
      const bonus = skillValue(state, key) + reliktWert(state, "partyPerception");
      const passed = dice + bonus >= 12;
      note(state, "Unterwegs kreuzt ein Rothirsch den Weg. " + K.fertigkeiten[key].name + " " + dice + " + " + bonus + " gegen 12. " +
        (passed ? "Du sammelst am Wegrand Galgenwurz, während das Tier äst." : "Das Tier flieht ins Unterholz."));
      if (passed) receive(state, ["galgenwurz"]);
      return false;
    }
    const pool = world.encounterPools.jaeger[to] ?? world.encounterPools.jaeger[from] ?? ["jagd-grauwolf"];
    const fight = travelDice() < 0.1 ? pick(world.encounterPools.alpha) : pick(pool);
    note(state, "Hinterhalt unterwegs: " + world.fights[fight].name + "!");
    startFight(state, fight);
    if (state.combat) Object.assign(state.combat, { weiter: choice.to, hinterhalt: true });
    return true;
  }

  // Ausweichen vor Beginn eines Hinterhalts: ab List 3 oder als Späher oder Schurke. Die Kampf-EP entfallen.
  function canEvade(state) {
    const combat = state.combat;
    return Boolean(combat?.hinterhalt && combat.round === 0 &&
      (skillValue(state, "list") + reliktWert(state, "partyPerception") >= 3 || ["spaeher", "schurke"].includes(state.role)));
  }

  function markDeed(state, mark) {
    if (state.marks.includes(mark)) return;
    state.marks.push(mark);
    for (const [id, delta] of Object.entries(world.factionEffects[mark] ?? {})) {
      state.factionRuf[id] = clampRuf(reputation(state, id) + delta);
    }
    for (const [id, plan] of Object.entries(world.loyalties)) {
      const current = relationship(state, id);
      if (!state.party.includes(id) && current.oath === "none") continue;
      const delta = world.relationshipEffects[mark]?.[id] ?? 0;
      const oath = current.oath !== "promised" ? current.oath : plan.proof?.includes(mark) ? "fulfilled" :
        plan.broken?.includes(mark) ? "broken" : "promised";
      if (!delta && oath === current.oath) continue;
      const score = clampRuf(current.score + delta);
      const left = current.left || (state.party.includes(id) && score <= departureThreshold);
      state.relationships[id] = { ...current, score, oath, left, bond: left ? "none" : current.bond };
      if (delta) note(state, world.companions[id].name + " · Sympathie " + (delta > 0 ? "+" : "") + delta +
        " (jetzt " + score + ").");
      if (left && state.party.includes(id)) {
        state.party = state.party.filter(member => member !== id);
        if (state.companionEquipment) delete state.companionEquipment[id];
        note(state, world.companions[id].name + " hat das Vertrauen in dich verloren und verlässt deine Gruppe.");
      }
    }
    if (world.deeds[mark]) grant(state, mark, world.deeds[mark]);
  }

  // ---- Weltebene: Weltleisten, Fraktionsvorrat, Stadt-Hub und Knotennetz (Technische Spezifikation) ----
  // Eine Runde der Weltleisten ist eine Reise von Knoten zu Knoten (Henry, 17. 11. 2026). Die Handlung der
  // Reisekarte Kornwik bis Glutberg bleibt erhalten: Wer aus ihr in die Weltreise wechselt, hinterlegt eine
  // Rückkehrmarke (handlung) und setzt die Handlung am selben Ort fort.

  const niederlagen = {
    untote: "Die Untoten-Bedrohung erreicht 100. Die Lange Nacht kehrt zurück, und die Lebenden fallen.",
    orks: "Die Ork-Bedrohung erreicht 100. Die Clans überrennen die Küsten der Lebenden.",
    glut: "Die Glut des Mutterbergs erreicht 100. Der zweite Aschenwinter verdunkelt die Welt.",
    erzfieber: "Das Erzfieber erreicht 100. Die Häuser der Zwerge fallen übereinander her.",
    welke: "Die Welke erreicht 100. Der Weltenbaum stirbt.",
    vorrat: "Der Fraktionsvorrat ist aufgebraucht. Ohne Nachschub zerfällt deine Fraktion.",
    // Patch 2.3.0: Bei den Menschen endet das Spiel erst, wenn Nahrung und Moral beide auf 0 stehen.
    verhungert: "Verhungert und gebrochen: Ohne Nahrung und ohne jeden Rest an Moral löst sich die Gruppe in der Asche auf.",
  };

  const leiste = (state, id) => state.weltLeisten?.[id] ?? leistenStart[id];
  function weltLeisten(state) {
    return leistenFolge.map((id) => ({ id, name: leistenNamen[id], wert: leiste(state, id), schwelle: gegenkraefte[id][0] }));
  }
  const setzeLeiste = (state, id, wert) => { state.weltLeisten[id] = Math.max(0, Math.min(100, wert)); };

  // Eine Weltrunde: Anstieg, Kopplungen der Völkerdokumente, dann Gegenkräfte und Erholung unter 20.
  function weltRunde(state) {
    state.weltLeisten ??= { ...leistenStart };
    const vorher = { ...state.weltLeisten };
    for (const [id, wert] of Object.entries(leistenAnstieg)) setzeLeiste(state, id, leiste(state, id) + wert);
    if (vorher.erzfieber >= 75) setzeLeiste(state, "glut", leiste(state, "glut") + 2);
    else if (vorher.erzfieber >= 50) setzeLeiste(state, "glut", leiste(state, "glut") + 1);
    if (vorher.glut > 50) setzeLeiste(state, "welke", leiste(state, "welke") + 1);
    state.runde = (state.runde ?? 0) + 1;
    // Erreicht eine Leiste 100, greift keine Gegenkraft mehr: die Niederlage-Prüfung folgt.
    if (leistenFolge.some((id) => leiste(state, id) >= 100)) return;
    for (const id of leistenFolge) {
      const [schwelle, senkung] = gegenkraefte[id];
      const wert = leiste(state, id);
      if (wert >= schwelle) setzeLeiste(state, id, wert - senkung);
      else if (wert < 10) setzeLeiste(state, id, wert + 2);
      else if (wert < 20) setzeLeiste(state, id, wert + 1);
    }
  }

  // Niederlage-Prüfung bei jedem Rundenwechsel: eine Leiste auf 100 oder der Vorrat auf 0.
  function pruefeNiederlage(state) {
    const leer = (state.ressource ?? 0) <= 0;
    const grund = leistenFolge.find((id) => leiste(state, id) >= 100) ??
      (!leer ? null : !menschen(state) ? "vorrat" : SY.moral(state) <= 0 ? "verhungert" : null);
    if (!grund) return false;
    state.niederlage = grund;
    state.combat = null;
    state.scene = "weltende";
    note(state, niederlagen[grund]);
    return true;
  }

  // Der Knoten, an dem die Spielfigur gerade steht: in der Weltreise der aktuelle Knoten, sonst die Städte der
  // Reisekarte und die Zufluchtsorte am Ende der Prologe.
  function aktuellerKnoten(state) {
    if (state.scene === "weltknoten") return state.knoten;
    const scene = world.scenes[state.scene];
    if (!scene) return null;
    const ort = N.karteZuKnoten(scene.map);
    if (ort && world.travelScenes[scene.map]?.includes(state.scene)) return ort;
    if (state.scene.startsWith("morgen-") && scene.fern && N.nachName[scene.fern]) return N.nachName[scene.fern];
    return null;
  }

  function weltOffen(state) {
    return Boolean(!state.combat && state.health > 0 && state.scene !== "weltknoten" && aktuellerKnoten(state));
  }

  function betreteWelt(previous) {
    if (!weltOffen(previous)) return previous;
    const state = structuredClone(previous);
    const ort = aktuellerKnoten(state);
    state.handlung = { szene: state.scene, knoten: ort };
    state.knoten = ort;
    state.scene = "weltknoten";
    note(state, "Du betrittst " + N.get(ort).name + ". Die Handlung wartet hier, bis du zurückkehrst.");
    return state;
  }

  function handlungHier(state) {
    return Boolean(state.scene === "weltknoten" && state.handlung && state.handlung.knoten === state.knoten);
  }

  function zurHandlung(previous) {
    if (!handlungHier(previous) || previous.combat || !previous.health) return previous;
    const state = structuredClone(previous);
    const szene = state.handlung.szene;
    state.handlung = null;
    state.knoten = null;
    state.scene = szene;
    note(state, "Du kehrst zur Handlung zurück: " + (world.scenes[szene].place ?? world.scenes[szene].title) + ".");
    return state;
  }

  // Nach Abschluss von Akt 5 (Quest-Stufe 5) steht die Welt offen.
  const uebersee = 5;
  // Seewege brauchen einen Hafen am Abfahrtsort, der dir gehört oder einem Vertragspartner.
  function schiffBereit(state, ort) {
    // Patch 2.6.19 (B3, Häfen-Schmuggler): Schmuggler-Boote legen ohne Vertrag in jedem Hafen der Menschen ab.
    return ort.hatHafen && (ort.fraktion === state.faction || (state.vertraege ?? []).includes(ort.fraktion) ||
      (state.marks?.includes("schmuggler_netzwerk") && SY.istMensch(ort.fraktion)));
  }

  // Patch 2.6.0/2.6.9: Meister der Sturmflut halbiert die Kosten auf Seewegen, die Schmugglerpassage spart 5 Silber.
  const seeKosten = (state, weg) => weg.kantenTyp !== "seeweg" ? (weg.kostenGold ?? 0) : Math.max(0, Math.round((weg.kostenGold ?? 0) *
    (state.akte?.fspez === "FSPEC_MEISTER_DER_STURMFLUT" ? 0.5 : 1)) - (state.gefaehrtenPerks?.includes("PERK_FH_SCHMUGGLERPASSAGE") ? 5 : 0));
  function reiseGrund(state, zielId) {
    if (state.scene !== "weltknoten" || state.combat || !state.health) return "nur in der Weltreise";
    if (state.tatOffen) return "erst über den Ausgang des Auftrags entscheiden";
    const ort = N.get(state.knoten);
    const weg = N.verbindung(state.knoten, zielId);
    if (!ort || !weg) return "keine Verbindung";
    if (weg.kantenTyp === "seeweg") {
      if (!schiffBereit(state, ort)) {
        return ort.hatHafen ? "kein Schiff: Handelsvertrag mit " + K.fraktionen[ort.fraktion].name + " nötig" : "kein Hafen";
      }
      if (state.silver < seeKosten(state, weg)) return "zu wenig Silber";
      // Henry, 18. 11. 2026 (Wegenetz der Menschen): Akt 5 öffnet das nächste Kapitel und endet mit der Möglichkeit,
      // die Welt zu bereisen. Freie Übersee-Fahrten zu fremden Völkern gibt es erst danach.
      const ziel = N.get(zielId);
      if (people(state.faction) === "menschen" && people(ziel.fraktion) !== "menschen" && (state.questStufe ?? 0) < uebersee) {
        return "Übersee erst nach Akt 5";
      }
    }
    if (weg.pass === "Zollpass" && leiste(state, "erzfieber") >= 50) return "Zollpass gesperrt (Erzfieber ab 50)";
    return null;
  }

  function reiseZiele(state) {
    if (state.scene !== "weltknoten") return [];
    return N.get(state.knoten).verbindungen.map((weg) => {
      const kosten = wegKosten(state, state.knoten, weg);
      return { ...weg, kostenRessource: kosten, rabatt: kosten < weg.kostenRessource, ziel: N.get(weg.zielId),
        grund: reiseGrund(state, weg.zielId), letzterVorrat: kosten >= (state.ressource ?? 0),
        auftrag: wegAuftrag(state, state.knoten, weg.zielId), ...wegInfo(state.knoten, weg, state) };
    });
  }

  // Reisebegegnungen auf Kanten des Knotennetzes. Werte gibt es bisher nur für die Tiere der Menschenlande.
  const jaegerNachFraktion = { kronreich: ["jagd-galgenkraehe", "jagd-grauwolf"], orden: ["jagd-grauwolf"], haefen: ["jagd-galgenkraehe"] };
  // Wegenetz der Menschen (Henry, 18. 11. 2026): Jeder Weg hat seine eigene Gefahr (Anteil der Jäger-Begegnungen)
  // und seine Gegner. Scheue Tiere bleiben bei 20 %, der Rest der Reise ist ruhig.
  const wegDaten = (von, zu) => NQ?.daten.wegenetz?.wege[wegKennung(von, zu)] ?? null;
  // Patch 2.1.0 Punkt 8: Die Gefahr des Weges ist die Basis, Signalfeuer, Grenzstraße, Moral und Grenzläufer verschieben sie.
  function wegDatenFuer(state, von, zu) {
    const daten = wegDaten(von, zu);
    if (!daten || !state || !menschen(state)) return daten;
    return { ...daten, gefahr: SY.reiseGefahr(state, daten.gefahr, wegKennung(von, zu)) };
  }
  function begegnungsTabelle(weg, daten) {
    if (!daten) return world.encounterTables[weg.sicherheit === "kernland" ? "kernland" : "grenzland"];
    const jaeger = Math.round(daten.gefahr * 100);
    return [[100 - jaeger - 20, "ruhig"], [20, "scheu"], [jaeger, "jaeger"]];
  }
  // Kennung, Hinterhalt-Gefahr und Gegner eines Weges für Aufbruch und Reisekarte.
  function wegInfo(von, weg, state = null) {
    const daten = wegDatenFuer(state, von, weg.zielId);
    const gefahr = daten ? daten.gefahr : begegnungsTabelle(weg, null).find(([, art]) => art === "jaeger")[0] / 100;
    const gegner = weg.kantenTyp === "seeweg" ? [] : daten?.gegner.length ? daten.gegner : jaegerNachFraktion[N.get(weg.zielId).fraktion] ?? [];
    return { kennung: wegKennung(von, weg.zielId), gefahr, gegner: gegner.map(id => world.fights[id].name) };
  }
  function knotenBegegnung(state, weg, ziel, von = null) {
    const daten = von ? wegDatenFuer(state, von, ziel.id) : null;
    const table = hinterhaltOffset(state, begegnungsTabelle(weg, daten));
    const roll = Math.floor(travelDice() * 100);
    let summe = 0;
    let kind = table.find(([weight]) => roll < (summe += weight))?.[1] ?? "ruhig";
    // Rückreise-Pflicht: Auf dem Rückmarsch zum Auftraggeber kommt es nur zu 45 % der Ereignisse.
    if (kind !== "ruhig" && rueckmarsch(state) && travelDice() >= rueckkehr.faktor) kind = "ruhig";
    // Runenkompass: Auf Seewegen bleibt ein Teil der Gefahren aus.
    if (weg.kantenTyp === "seeweg" && kind !== "ruhig" && travelDice() < reliktWert(state, "seaDangerReduction")) {
      note(state, "Der " + relikte[state.relikt].name + " weist euch einen sicheren Kurs.");
      kind = "ruhig";
    }
    const pick = (list) => list[Math.floor(travelDice() * list.length) % list.length];
    if (kind === "ruhig") {
      note(state, "Unterwegs: " + pick(weg.sicherheit === "grenzland" ? [...world.quietTexts, ...world.rumorTexts] : world.quietTexts));
      return;
    }
    if (kind === "scheu") {
      const key = skillValue(state, "fernkampf") > skillValue(state, "list") ? "fernkampf" : "list";
      const dice = 1 + Math.floor(travelDice() * 20);
      const bonus = skillValue(state, key) + reliktWert(state, "partyPerception");
      const passed = dice + bonus >= 12;
      note(state, "Unterwegs kreuzt ein scheues Tier den Weg. " + K.fertigkeiten[key].name + " " + dice + " + " + bonus + " gegen 12. " +
        (passed ? "Du sammelst am Wegrand Galgenwurz, während es äst." : "Das Tier flieht ins Unterholz."));
      if (passed) receive(state, ["galgenwurz"]);
      return;
    }
    const pool = weg.kantenTyp === "seeweg" ? null : daten?.gegner.length ? daten.gegner : jaegerNachFraktion[ziel.fraktion];
    if (!pool) {
      note(state, weg.kantenTyp === "seeweg"
        ? "Unterwegs: Fremde Segel folgen euch bis zum Abend. Dann dreht das Schiff ab."
        : "Unterwegs: Frische Spuren eines Jägers kreuzen den Weg. Ihr umgeht sein Revier im Bogen.");
      return;
    }
    const fight = travelDice() < 0.1 ? pick(world.encounterPools.alpha) : pick(pool);
    // Patch 2.1.0 Punkt 8: In den Menschenlanden kommen die gewöhnlichen Jäger aus dem Gegnerpool der Region, mit
    // Miniboss-Chance je Wegart. Besondere Gegner des Wegenetzes (Eishauer, Klippenwyrm) bleiben an ihrem Weg.
    if (menschen(state) && fight.startsWith("jagd-") && SY.daten.gegnerRegionen[ziel.fraktion]) {
      const g = SY.begegnung(state, ziel.fraktion, SY.wegTyp(weg, von ? wegKennung(von, ziel.id) : null), gebietsStufe(state, ziel.id), travelDice);
      note(state, (g.miniboss ? "Ein gefürchteter Gegner stellt sich euch in den Weg: " : "Hinterhalt unterwegs: ") + g.name + "!");
      startFight(state, sysKampf(g.id), true, g.werte.stufe);
      if (state.combat) Object.assign(state.combat, { weiter: "weltknoten", hinterhalt: !g.miniboss });
      else if (!state.health) arrive(state, "defeat");
      return;
    }
    note(state, "Hinterhalt unterwegs: " + world.fights[fight].name + "!");
    // Einzelgegner aus dem Wegenetz (Eishauer, Klippenwyrm) kämpfen auf Gebietsstufe wie im Auftrag.
    startFight(state, fight, true, fight.startsWith("auftrag-") ? gebietsStufe(state, ziel.id) : null);
    if (state.combat) Object.assign(state.combat, { weiter: "weltknoten", hinterhalt: true });
    else if (!state.health) arrive(state, "defeat");
  }

  function reiseStep(previous, zielId) {
    if (reiseGrund(previous, zielId)) return previous;
    const state = structuredClone(previous);
    const weg = N.verbindung(state.knoten, zielId);
    const ziel = N.get(zielId);
    const von = state.knoten;
    const kosten = wegKosten(state, von, weg);
    if (menschen(state)) nahrungVerbrauchen(state, kosten);
    else state.ressource -= kosten;
    state.silver -= seeKosten(state, weg);
    if (weg.kostenGold) note(state, "Überfahrt nach " + ziel.name + " · " + seeKosten(previous, weg) + " Silber.");
    if (weg.probe) {
      // Tiefer Stollen: Probe auf den besseren von Willenskraft und Intelligenz (W20 unter dem Grundwert).
      const werte = heroAttributes(state);
      const wert = Math.max(werte.will, werte.mind);
      const wurf = 1 + Math.floor(travelDice() * 20);
      if (wurf <= wert) note(state, "Im Tiefen Stollen glüht das Gestein. Probe " + wurf + " gegen " + wert + ": Du findest den sicheren Weg.");
      else {
        const schaden = Math.min(state.health - 1, stollenSchaden);
        state.health -= schaden;
        note(state, "Im Tiefen Stollen glüht das Gestein. Probe " + wurf + " gegen " + wert + ": Heiße Asche verbrennt dich, " + schaden + " LP.");
      }
      setzeLeiste(state, "glut", leiste(state, "glut") + (weg.glut ?? 1));
    }
    // Marsch-Vignette der Hauptquest (Henry, Beispiel Hagenfels) erscheint auch in der Chronik.
    const vignette = hauptVignette(state, zielId);
    if (vignette) note(state, vignette);
    state.knoten = zielId;
    if (sichererOrt(state, ziel)) state.zuflucht = zielId;
    weltRunde(state);
    if (menschen(state)) for (const meldung of SY.etappe(state, travelDice)) note(state, meldung);
    if (pruefeNiederlage(state)) return state;
    torzoll(state, ziel);
    note(state, "Ankunft in " + ziel.name + " (" + N.typNamen[ziel.typ] + ", " + K.fraktionen[ziel.fraktion].name + ").");
    const unterwegs = wegAuftrag(state, von, zielId);
    if (unterwegs) {
      const auftrag = auftragIndex[unterwegs];
      auftragKampfStarten(state, auftrag.spiel.gegner, unterwegs, auftrag.ort, "Unterwegs auf " + auftrag.spiel.weg + " · " + auftrag.titel);
      return state;
    }
    knotenBegegnung(state, weg, ziel, von);
    return state;
  }
  const reise = (...args) => timedAction(args[0], reiseStep(...args));

  // Patch 2.3.0: Reicht die Nahrung für eine Etappe nicht, ist die Gruppe entkräftet und verliert 15 Moral je Etappe.
  function nahrungVerbrauchen(state, kosten) {
    const fehlt = kosten > (state.ressource ?? 0);
    state.ressource = Math.max(0, (state.ressource ?? 0) - kosten);
    if (state.ressource > 0) return;
    if (!state.entkraeftet) note(state, "Die Nahrung ist aufgebraucht. Die Gruppe ist entkräftet: Jede weitere Etappe ohne Nahrung kostet Moral.");
    state.entkraeftet = true;
    if (!fehlt) return;
    const delta = SY.moralAendern(state, "hunger");
    note(state, "Hunger zehrt an der Gruppe · Moral " + delta + " (jetzt " + SY.moral(state) + ").");
  }
  // Nahrung aufnehmen oder rasten beendet „Entkräftet“.
  function nahrungErhalten(state) {
    if (state.entkraeftet && (state.ressource ?? 0) > 0) {
      state.entkraeftet = false;
      note(state, "Die Gruppe hat wieder zu essen und ist nicht mehr entkräftet.");
    }
  }
  // Geächtete zahlen Torzoll an den Städten der Menschen.
  function torzoll(state, ziel) {
    if (!menschen(state) || !SY.istMensch(ziel.fraktion) || ziel.typ === "dorf") return;
    const zoll = Math.min(state.silver, SY.rufRang(SY.ruf(state, ziel.fraktion)).torzoll);
    if (!zoll) return;
    state.silver -= zoll;
    note(state, "Die Wachen von " + ziel.name + " kennen deinen Ruf. Torzoll · −" + zoll + " Silber.");
  }

  // Rast im Hub: volle LP, Glut und Zustände der Gruppe. Kostet 1 Fraktionsvorrat und darf ihn nicht aufbrauchen.
  // Menschen (Ressourcen-Datei): Rast kostet 3 Nahrung, als Bannerjarl in den Städten der eigenen Fraktion nichts.
  function rastKosten(state) {
    if (!menschen(state)) return 1;
    const ort = N.get(state.knoten);
    return ort && ort.fraktion === state.faction && ort.typ !== "dorf" && SY.rufRang(SY.ruf(state, ort.fraktion)).freieRast ? 0
      : SY.daten.reise.rast;
  }
  function rastGrund(state) {
    if (state.scene !== "weltknoten" || state.combat || !state.health) return "nur in der Weltreise";
    if (state.tatOffen) return "erst über den Ausgang des Auftrags entscheiden";
    const kosten = rastKosten(state);
    if (kosten && (state.ressource ?? 0) <= kosten) return "zu wenig " + resourceName(state);
    return null;
  }
  function rast(previous) {
    if (rastGrund(previous)) return previous;
    const state = structuredClone(previous);
    const kosten = rastKosten(state);
    state.ressource -= kosten;
    if (menschen(state)) {
      SY.moralAendern(state, "rast");
      state.entkraeftet = false;
    }
    state.health = healthLimit(state);
    state.ember = emberLimit(state);
    state.heroStatus = {};
    ensureVitals(state);
    for (const id of state.party) state.partyVitals[id] = { health: memberHealthLimit(id, state), status: {} };
    note(state, "Ihr rastet in " + N.get(state.knoten).name + ". Alle sind wieder bei Kräften" +
      (kosten ? " · −" + kosten + " " + resourceName(state) : " · als Bannerjarl ohne Kosten") +
      (menschen(state) ? " · Moral " + SY.moral(state) : "") + ".");
    if (menschen(state)) {
      // Patch 2.6.9: Lied der Wundheilung: +4 als Schild für den nächsten Kampf (nach der Rast sind alle schon geheilt).
      if (state.gefaehrtenPerks?.includes("PERK_KR_AHNENLIED")) state.lagerBuff = { ...(state.lagerBuff ?? {}),
        schild: (state.lagerBuff?.schild ?? 0) + 4, name: [state.lagerBuff?.name, "Lied der Wundheilung"].filter(Boolean).join(", ") };
      lagerSzeneWaehlen(state);
    }
    return state;
  }

  // Dörfer der eigenen Fraktion liefern ihren Ertrag. Danach braucht das Dorf 10 Runden, bis es wieder liefert.
  function ertragGrund(state) {
    if (state.scene !== "weltknoten" || state.combat || !state.health) return "nur in der Weltreise";
    const ort = N.get(state.knoten);
    if (ort.typ !== "dorf") return "nur in Dörfern";
    if (ort.fraktion !== state.faction) return "nur in Dörfern der eigenen Fraktion";
    if (menschen(state)) return "befreite Dörfer liefern ihren Zehnt alle " + SY.daten.zehnt.etappen + " Etappen ins Kontor";
    const zuletzt = state.ertraege?.[ort.id];
    if (zuletzt !== undefined && state.runde - zuletzt < ertragPause) return "wieder bereit in " + (ertragPause - (state.runde - zuletzt)) + " Etappen";
    if ((state.ressource ?? 0) >= vorratMax) return "Vorrat ist voll";
    return null;
  }
  function ertragEinholen(previous) {
    if (ertragGrund(previous)) return previous;
    const state = structuredClone(previous);
    const ort = N.get(state.knoten);
    state.ressource = Math.min(vorratMax, state.ressource + ertragMenge);
    (state.ertraege ??= {})[ort.id] = state.runde;
    note(state, ort.name + " liefert " + ort.ertrag + " an " + N.get(ort.stadt).name + " · +" + ertragMenge + " " + resourceName(state) + ".");
    return state;
  }

  // Hofstaat: Handelsvertrag in der Hauptstadt einer fremden Fraktion. Untote verhandeln nicht mit Lebenden,
  // Orks und Zwerge schließen keinen Frieden. Verträge mit Zwergen senken das Erzfieber, mit Orks die Ork-Bedrohung.
  function vertragGrund(state) {
    if (state.scene !== "weltknoten" || state.combat || !state.health) return "nur in der Weltreise";
    const ort = N.get(state.knoten);
    if (ort.typ !== "hauptstadt") return "nur in Hauptstädten";
    if (ort.fraktion === state.faction) return "eigene Fraktion";
    if ((state.vertraege ?? []).includes(ort.fraktion)) return "Vertrag besteht";
    if (peopleClash(people(state.faction), people(ort.fraktion))) {
      return people(ort.fraktion) === "untote" || people(state.faction) === "untote" ? "Untote verhandeln nicht mit den Lebenden"
        : "Orks und Zwerge verhandeln nicht miteinander";
    }
    if ((state.ressource ?? 0) - vertragKosten < 1) return "zu wenig " + resourceName(state);
    return null;
  }
  function vertragSchliessen(previous) {
    if (vertragGrund(previous)) return previous;
    const state = structuredClone(previous);
    const ort = N.get(state.knoten);
    state.ressource -= vertragKosten;
    state.vertraege = [...(state.vertraege ?? []), ort.fraktion];
    note(state, "Handelsvertrag mit " + K.fraktionen[ort.fraktion].name + " geschlossen · −" + vertragKosten + " " + resourceName(state) +
      ". Ihre Häfen stehen dir offen.");
    const eigenes = people(state.faction);
    const fremdes = people(ort.fraktion);
    if (eigenes !== fremdes && (eigenes === "zwerge" || fremdes === "zwerge") && (eigenes === "menschen" || fremdes === "menschen")) {
      setzeLeiste(state, "erzfieber", leiste(state, "erzfieber") - 5);
      note(state, "Ein fairer Handel mit den Zwergen senkt das Erzfieber um 5.");
    }
    if (eigenes !== fremdes && (eigenes === "orks" || fremdes === "orks")) {
      setzeLeiste(state, "orks", leiste(state, "orks") - 5);
      note(state, "Der Vertrag mit einem Ork-Clan senkt die Ork-Bedrohung um 5.");
    }
    return state;
  }

  // ---- Aufträge am Aushang und Hauptquest Akt 1 (Kronreich und Orden, Gemini-Ausarbeitung, Henry 18. 11. 2026) ----
  // Annehmen am Aushang des Auftragsorts, ausführen am Ort oder unterwegs auf dem genannten Weg, Abgabe sofort nach
  // Erfolg. Gegner kämpfen auf der Gebietsstufe (nebenquests.stufenFuer, auf die Heldenstufe begrenzt), die Zahl der
  // Gegner im Text ist erzählerisch. Jeder Auftrag gibt 50 EP, Akt 1 gibt 300 EP.
  const NQ = typeof nebenquests !== "undefined" ? nebenquests : null;
  const auftragEp = 50;
  const auftragIndex = {};
  if (NQ) for (const fraktion of ["kronreich", "orden", "haefen"]) {
    for (const [ort, eintrag] of Object.entries(NQ.daten[fraktion]?.orte ?? {})) {
      for (const auftrag of eintrag.auftraege) auftragIndex[auftrag.id] = { ...auftrag, ort, fraktion };
    }
  }
  // Weg-Kennung (S01, D25 …) zu beiden Endpunkten, damit Reisen Wegaufträge und Wegrabatte finden.
  const wegNachEnden = {};
  for (const [kennung, [a, b]] of Object.entries(NQ?.daten.wegKennungen ?? {})) {
    wegNachEnden[a + "|" + b] = kennung;
    wegNachEnden[b + "|" + a] = kennung;
  }
  const wegKennung = (von, zu) => wegNachEnden[von + "|" + zu] ?? null;

  // Trophäen aus Belohnungen sind verkäufliche Gegenstände. Ausrüstungswerte folgen später (Henry, Punkt 2).
  const trophaeenPreis = 10;
  for (const [id, name] of Object.entries(NQ?.daten.trophaeen ?? {})) {
    world.items[id] ??= name;
    world.salePrices[id] ??= trophaeenPreis;
  }

  // Gruppen-Relikte (Henry, 18. 11. 2026, quellen/henry/relikte.json): Höchstens ein Relikt ist aktiv und stärkt die
  // ganze Gruppe. Es liegt getrennt von der Ausrüstung, wechselt nur außerhalb des Kampfes, und das vorige Relikt
  // kehrt in den Rucksack zurück. Welche Art (Rune, Glut) eine Fraktion nutzen darf, legt factionPermissions fest;
  // alle anderen verkaufen das Relikt.
  const reliktSystem = NQ?.daten.relikte?.system ?? { factionPermissions: {} };
  const relikte = Object.fromEntries((NQ?.daten.relikte?.gegenstaende ?? []).map(relikt => [relikt.id, relikt]));
  // Patch 2.6.5: Kriegshorn des Großen Things als Gruppenrelikt der Runen (Wirkung in dealDamage, Rüstung und Moral).
  {
    const horn = SY.daten.gegenstaende.REL_T4_BANNER_DER_EINIGUNG;
    if (horn) relikte[horn.id] = { id: horn.id, name: horn.name, relicType: "rune", sellValue: horn.baseSellPrice,
      partyBuff: { label: "+8 % Schaden und +1 Rüstung für die ganze Gruppe, −15 % Moralverlust", partyDamage: 0.08, partyArmor: 1, moralLoss: 0.15 } };
  }
  for (const relikt of Object.values(relikte)) {
    world.items[relikt.id] = relikt.name;
    world.salePrices[relikt.id] = relikt.sellValue;
  }
  // Spielstände von heute Vormittag kannten die Runengegenstände noch als Trophäen.
  const alteRelikte = { "beute-runenkompass": "relic_runenkompass", "beute-runenwaage": "relic_runenwaage",
    "beute-runen-amulett": "relic_runen_amulett", "beute-runen-fokus": "relic_runen_fokus", "beute-glutlaterne": "relic_glutlaterne",
    "beute-glutstein-amulett": "relic_glutstein_amulett" };
  // Gegner, die mit Feuer oder Kälte angreifen (für Feuer- und Kälteschutz der Relikte).
  const gegnerElement = { irrglut: "feuer", glutkaefer: "feuer", "jagd-irrglut": "feuer", "nacht-tiefgraeber": "feuer",
    "auftrag-glutkaefer": "feuer", "auftrag-glutwurm": "feuer", "auftrag-irrglut": "feuer",
    frostbaer: "kaelte", "auftrag-frostbaer": "kaelte", "auftrag-eishauer": "kaelte", "auftrag-schneeschleicher": "kaelte",
    "auftrag-skarn": "kaelte" };
  const reliktErlaubt = (faction, id) => (reliktSystem.factionPermissions[faction] ?? []).includes(relikte[id]?.relicType);
  const reliktWert = (state, key) => (state.relikt && relikte[state.relikt]?.partyBuff[key]) || 0;
  // Wirkungen, für die es im Spiel noch keine Regel gibt, bleiben vermerkt und greifen später.
  const reliktWirkungen = {
    seaDangerReduction: (v) => ["Gefahr auf Seewegen −" + Math.round(v * 100) + " %", true],
    partyPerception: (v) => ["Wahrnehmung +" + v + " (Proben unterwegs, Hinterhalte erkennen)", true],
    sellPriceBonus: (v) => ["Verkaufspreise +" + Math.round(v * 100) + " %", true],
    buyPriceDiscount: (v) => ["Einkaufspreise −" + Math.round(v * 100) + " %", true],
    partyResistance: (v) => ["Rüstung der ganzen Gruppe +" + v, true],
    partyMorale: (v) => ["Moral +" + v + " (wirkt, sobald es Moral gibt)", false],
    partyMagicPower: (v) => ["Glut- und Zauberschaden der Gruppe +" + v, true],
    damageVsUndead: (v) => ["Schaden gegen Untote +" + Math.round(v * 100) + " %", true],
    fireDamage: (v) => ["Feuerschaden der Gruppe +" + v, true],
    nightAmbushImmunity: () => ["Schutz vor nächtlichen Hinterhalten (wirkt, sobald es Tag und Nacht gibt)", false],
    fireResistance: (v) => ["Feuerangriffe −" + v + " Schaden", true],
    coldDamageReduction: (v) => ["Kälteangriffe −" + Math.round(v * 100) + " % Schaden", true],
    partyDamage: (v) => ["Schaden der ganzen Gruppe +" + Math.round(v * 100) + " %", true],
    partyArmor: (v) => ["Rüstung der ganzen Gruppe +" + v, true],
    moralLoss: (v) => ["Moralverlust −" + Math.round(v * 100) + " %", true],
  };
  const reliktTexte = (id) => Object.entries(relikte[id].partyBuff).filter(([key]) => key !== "label")
    .map(([key, value]) => reliktWirkungen[key]?.(value) ?? [key + " " + value, false]);

  function reliktGrund(state, id) {
    if (state.combat) return "nicht im Kampf";
    if (!state.health) return "nur lebend";
    if (id === null) return state.relikt ? null : "kein Relikt aktiv";
    if (!own(relikte, id)) return "kein Relikt";
    if (state.relikt === id) return "schon aktiv";
    if (!state.inventory.includes(id)) return "nicht im Rucksack";
    if (!reliktErlaubt(state.faction, id)) return relikte[id].relicType === "glut" ? "Glutrelikt: für deine Fraktion verboten" : "für deine Fraktion nicht nutzbar";
    return null;
  }

  function setRelikt(previous, id) {
    if (reliktGrund(previous, id)) return previous;
    const state = structuredClone(previous);
    const vorher = state.relikt;
    if (id) state.inventory.splice(state.inventory.indexOf(id), 1);
    state.relikt = id;
    if (vorher) receive(state, [vorher]);
    note(state, id ? relikte[id].name + " ist jetzt das Relikt der Gruppe: " + relikte[id].partyBuff.label + "." +
      (vorher ? " " + relikte[vorher].name + " kehrt in den Rucksack zurück." : "")
      : relikte[vorher].name + " kehrt in den Rucksack zurück. Die Gruppe trägt kein Relikt.");
    return state;
  }

  function reliktStand(state) {
    const eintrag = (id) => ({ id, name: relikte[id].name, art: relikte[id].relicType, label: relikte[id].partyBuff.label,
      wirkungen: reliktTexte(id).map(([text, aktiv]) => ({ text, aktiv })), wert: relikte[id].sellValue,
      grund: reliktGrund(state, id) });
    return { aktiv: state.relikt ? eintrag(state.relikt) : null,
      rucksack: [...new Set(state.inventory.filter(id => own(relikte, id)))].map(eintrag) };
  }

  // Preise beim Händler, mit der Runenwaage als aktivem Relikt.
  function preis(state, id, buying) {
    const grund = (buying ? world.shop : world.salePrices)[id];
    if (grund === undefined) return null;
    return buying ? Math.max(1, Math.round(grund * (1 - reliktWert(state, "buyPriceDiscount"))))
      : Math.round(grund * (1 + reliktWert(state, "sellPriceBonus")));
  }

  // Gegner der Aufträge. Wo es den Gegner schon gibt, gelten seine Werte, sein Bild und sein Zusatzangriff.
  const auftragKampf = (typ) => "auftrag-" + typ;
  const gleicherGegner = { grauwoelfe: "grauwolf", galgenkraehen: "galgenkraehe", glutkaefer: "glutkaefer", keiler: "keiler",
    flussschnapper: "schnapper", netzweberin: "netzweberin", irrglut: "irrglut", moorschlinger: "moorschlinger",
    diealte: "moorschlinger", graufang: "grauwolf", frostbaer: "frostbaer", deserteure: "deserteure" };
  const aehnlicherGegner = { wegelagerer: "deserteure", schmuggler: "deserteure", spione: "deserteure", kultisten: "deserteure",
    kulthauptmann: "deserteure", orkvortrupp: "nacht-kronreich", urgash: "nacht-kronreich",
    feldherr: "nacht-kronreich", zelot: "deserteure", kaperkapitaen: "nacht-kronreich", thorvald: "nacht-kronreich", aschenschatten: "deserteure", aschenkraehen: "galgenkraehe",
    skarn: "frostbaer", aschenmammut: "keiler", letztermammut: "keiler", orkpiraten: "nacht-kronreich" };
  const menschenGegner = new Set(["kultisten", "schmuggler", "spione", "deserteure", "wegelagerer", "orkvortrupp", "kulthauptmann", "urgash",
    "orkpiraten", "feldherr", "zelot", "kaperkapitaen", "thorvald", "aschenschatten"]);
  // Kapitän Urgash führt nur die Vorhut der Rostsegel. Er kämpft als Elite, damit Akt 1 auch allein fair bleibt
  // (Kampfdokument: ein einzelner Held schafft 1 Elite, ein Anführer braucht eine Gruppe).
  const auftragGegner = { ...(NQ?.daten.gegnerTypen ?? {}),
    urgash: { name: "Kapitän Urgash", rang: "elite" },
    // Patch 2.6.0/2.6.1: Bosse der Schwester-Zweige und von Akt 4. Die Zweig-Bosse kämpfen wie Urgash als Elite
    // (E2E-Simulation 2.6.3: als Anführer verliert auch eine Gruppe sechs Stufen darüber), Thorvald als Anführer.
    feldherr: { name: "Abtrünniger Feldherr", rang: "elite" },
    zelot: { name: "Verderbter Zelot", rang: "elite", tags: ["untot", "ascheriss"] },
    kaperkapitaen: { name: "Abtrünniger Kaperkapitän", rang: "elite" },
    thorvald: { name: "Erzpriester Thorvald, der Bleiche Skalde", rang: "anfuehrer", tags: ["untot"] },
    aschenschatten: { name: "Ascheriss-Schatten", rang: "mitlaeufer", anzahl: 3, leader: "Schattenführer", ally: "Schatten", tags: ["ascheriss"] } };
  for (const [typ, gegner] of Object.entries(auftragGegner)) {
    const id = auftragKampf(typ);
    const gleich = gleicherGegner[typ];
    const vorlage = world.creatures[gleich ?? aehnlicherGegner[typ]];
    world.creatures[id] = { name: gegner.name, stats: [...(vorlage?.stats ?? [24, 7, 2, menschenGegner.has(typ) ? 5 : 6])],
      ...(gleich && vorlage.image ? { image: vorlage.image } : {}) };
    if (gegner.leader) world.enemyGroups[id] = { leader: gegner.leader, ally: gegner.ally };
    const special = (gleich && world.fights[gleich]?.special) ?? (menschenGegner.has(typ)
      ? { name: "Wuchtschlag", warning: (gegner.leader ?? gegner.name) + " holt zu einem schweren Schlag aus.", damage: 1 }
      : { name: "Ansprung", warning: (gegner.leader ?? gegner.name) + " duckt sich zum Sprung.", damage: 1, bleeds: true });
    world.fights[id] = { gegner: { rang: gegner.rang, stufe: 1, ...(gegner.anzahl ? { anzahl: gegner.anzahl } : {}), ...(gegner.tags ? { tags: gegner.tags } : {}) },
      name: gegner.name, loot: [], random: true, special: { ...special }, alpha: Boolean(gegner.alpha),
      victoryText: "Der Kampf ist gewonnen." };
  }
  // Patch 2.5.4: Der Letzte Mammut trampelt über die ganze Gruppe (höchstens 13 Schaden je Treffer) statt zu springen.
  // Patch 2.6.17/2.6.18: Thorvalds Klagelied trifft alle, höchstens 11, alle 2 Runden.
  if (world.fights["auftrag-thorvald"]) world.fights["auftrag-thorvald"].special = { name: "Klagelied des Bleichen Skalden",
    warning: "Thorvald hebt die knöcherne Harfe. Ein kaltes Lied schwillt an.", damage: 0, flaeche: true, deckel: 11, intervall: 2 };
  if (world.fights["auftrag-letztermammut"]) world.fights["auftrag-letztermammut"].special = { name: "Trampeln",
    warning: "Der Letzte Mammut senkt den Kopf und scharrt mit den Füßen.", damage: 2, flaeche: true, deckel: 13 };

  // ---- Gegner, Beute und Ausrüstung der Menschenlande (Henry, 18. 11. 2026, Gegner- und Ökonomie-Datei) ----
  // Patch 2.4.0: Henrys Werte rechnen 3,5-mal größer als das Kampfdokument vom 17. 11. Angriff, Rüstung und Heilwerte
  // werden durch 3,5 geteilt, damit alle 15 Fraktionen und die Gefährten ein Kampfsystem teilen.
  const sysSlots = { RECHTE_HAND: "weapon", LINKE_HAND: "offhand", KOPF: "head", HALS: "neck", KOERPER: "armor", HAENDE: "hands", BEINE: "legs",
    RING: "ring" };
  const sysSeltenheit = { 2: "Ungewöhnlich", 3: "Selten", 4: "Episch" };
  const sysWert = (wert, teiler) => Math.round((wert ?? 0) / teiler);
  const resonanzTag = (g) => ["RUNEN_ITEM", "GLUT_ITEM"].includes(g.magicTag);
  for (const g of Object.values(SY.daten.gegenstaende)) {
    world.items[g.id] = g.name;
    if (sysSeltenheit[g.tier] && g.slot) world.rarity[g.id] = sysSeltenheit[g.tier];
    const slot = sysSlots[g.slot];
    const w = g.stats ?? {};
    // Patch 2.6.5: Tier-3/4-Ausrüstung aus Henrys Datei steht schon in der Spielskala (nicht durch 3,5 geteilt).
    if (g.spielskala && slot) {
      world.gear[g.id] = { slot, ...(slot === "weapon" ? { stat: /FOKUS/.test(g.equipCategory) ? "mind" : /FERNKAMPF|SCHWARZPULVER|DOLCH/.test(g.equipCategory)
        ? "agility" : "strength", ...(g.equipCategory === "DOLCH_KLINGE" ? { skill: "nahkampf" } : {}), power: w.attack ?? 0,
        ...(/BOGEN|GEWEHR|STAB/.test(g.equipCategory) ? { twoHanded: true } : {}) } : { armor: w.armor ?? 0, ...(w.attack ? { power: w.attack } : {}) }),
        ...(resonanzTag(g) ? { resonanz: true } : {}), ...(w.critChance ? { krit: w.critChance } : {}),
        magic: sysWert(w.willpower, 3) + sysWert(w.healPct, 15), v260: w };
      continue;
    }
    if (slot === "weapon") {
      const fern = /FERNKAMPF|SCHWARZPULVER/.test(g.equipCategory);
      const fokus = /FOKUS/.test(g.equipCategory);
      world.gear[g.id] = { slot, stat: fokus ? "mind" : fern || g.equipCategory === "DOLCH_KLINGE" ? "agility" : "strength",
        ...(g.equipCategory === "DOLCH_KLINGE" ? { skill: "nahkampf" } : {}),
        power: SY.skaliert(w.attack), pierce: sysWert(w.armorPen, 10), ...(resonanzTag(g) ? { resonanz: true } : {}),
        ...(w.armorPen ? { durchdringung: w.armorPen / 100 } : {}), ...(w.critChance ? { krit: w.critChance } : {}),
        magic: sysWert(w.fireDamage, 5) + sysWert(w.willpower, 3),
        ...(/ZWEIHAND|BOGEN|GEWEHR|STAB/.test(g.equipCategory) ? { twoHanded: true } : {}) };
    } else if (slot) {
      world.gear[g.id] = { slot, armor: w.armor ? SY.skaliert(w.armor) : 0, ...(resonanzTag(g) ? { resonanz: true } : {}),
        magic: sysWert(w.fireDamage, 5) + sysWert(w.willpower, 3) + sysWert(w.healingBonus, 15) };
    }
    const heilung = /Stellt im Kampf (\d+) LP/.exec(g.effect ?? "");
    if (heilung) world.supplies[g.id] = { heal: SY.skaliert(Number(heilung[1])) };
    else if (/^POT_MANA_/.test(g.id)) world.supplies[g.id] = { mana: SY.daten.kampf.mana.traenke[g.id] };
    else if (/^POT_FOKUS_/.test(g.id)) world.supplies[g.id] = { ausdauer: SY.skaliert(Number(/(\d+) Ausdauer/.exec(g.effect)?.[1] ?? 25)) };
    else if (g.id === "CON_GEGENGIFT") world.supplies[g.id] = { cure: "poison" };
    else if (g.id === "CON_BRANDSALBE") world.supplies[g.id] = { cure: "burn" };
  }
  // Patch 2.6.19 (Henry, B10): Waffen nach Tier gestaffelt. Henrys „Angriff“ ist der Wert im Inventar einer Startfigur
  // (Waffe + 6 aus der Fertigkeit; Startaxt 12), die Waffenkraft ist also Angriff − 6. Innerhalb eines Tiers bleibt die
  // Reihenfolge der alten Werte erhalten (gleichmäßig über die Spanne verteilt), ebenso bei den Preisen (Verkauf = halber Kauf).
  // Henrys Beispiel: Ahnenrunen-Langschwert (T2) Angriff 17.
  const waffenTiers = Object.fromEntries(SY.daten.v2619.B10_waffen_tier_staffelung.tiers.map((t) => [t.tier, t]));
  const waffenFertigkeit = SY.daten.v2619.B10_waffen_tier_staffelung.startwaffe_basis - world.gear.axt.power;
  const waffenFest = { WPN_RUNENKLINGE_T2: SY.daten.v2619.B10_waffen_tier_staffelung.beispiel_korrektur.angriff_neu };
  const verteilt = (index, anzahl, { min, max }) => anzahl < 2 ? Math.round((min + max) / 2) : Math.round(min + (max - min) * index / (anzahl - 1));
  for (const [tier, t] of Object.entries(waffenTiers)) {
    const waffen = Object.values(SY.daten.gegenstaende).filter((g) => String(g.tier) === tier && world.gear[g.id]?.slot === "weapon");
    [...waffen].sort((a, b) => world.gear[a.id].power - world.gear[b.id].power || a.id.localeCompare(b.id)).forEach((g, i) => {
      const angriff = waffenFest[g.id] ?? verteilt(i, waffen.length, t.angriff);
      world.gear[g.id].power = angriff - waffenFertigkeit;
      if (world.gear[g.id].v260?.attack) world.gear[g.id].v260 = { ...world.gear[g.id].v260, attack: angriff - waffenFertigkeit };
    });
    [...waffen].sort((a, b) => (a.baseBuyPrice ?? 0) - (b.baseBuyPrice ?? 0) || a.id.localeCompare(b.id)).forEach((g, i) => {
      g.baseBuyPrice = verteilt(i, waffen.length, t.preis_silber);
      g.baseSellPrice = Math.round(g.baseBuyPrice / 2);
    });
  }
  // Ähnlicher bestehender Gegner je Familie: liefert Grundwerte für Initiative und Proben, kein Bild (Bilder folgen später).
  const sysVorlage = (g) => /wolf|keiler|bär|viper|krabbler|krähe|salamander|vurm|leviathan|troll|ursa|seeschreck|schluchtenj/i.test(g.name)
    ? (/krähe/i.test(g.name) ? "galgenkraehe" : /keiler/i.test(g.name) ? "keiler" : /troll/i.test(g.name) ? "schlundtroll" : "grauwolf")
    : "deserteure";
  const sysKampf = (id) => "sys-" + id;
  // Beute der Gegner der Menschenlande: Silber, Material, Tränke, Ausrüstung; Runensplitter gehen ins Kontor.
  function systemBeute(state, gegnerId) {
    const b = SY.beute(state, gegnerId, travelDice);
    // Patch 2.6.9: Kaperbeute: +10 % Silber aus besiegten Gegnern.
    if (b.silber && state.gefaehrtenPerks?.includes("PERK_FH_KAPERBEUTE")) b.silber = Math.round(b.silber * 1.1);
    state.silver += b.silber;
    const teile = [b.silber + " Silber"];
    const sachen = [];
    for (const { id, anzahl } of b.gegenstaende) {
      if (id.startsWith("RES_")) {
        const rohstoff = id.slice(4).toLowerCase();
        if (menschen(state) && SY.daten.rohstoffe[rohstoff]) {
          SY.kontor(state, state.faction)[rohstoff] += anzahl;
          teile.push(anzahl + " " + SY.daten.rohstoffe[rohstoff].name + " ins Kontor");
        }
        continue;
      }
      if (!own(world.items, id)) continue;
      for (let i = 0; i < anzahl; i++) sachen.push(id);
      teile.push((anzahl > 1 ? anzahl + " × " : "") + world.items[id]);
    }
    receive(state, sachen);
    note(state, "Beute: " + teile.join(", ") + ".");
  }
  for (const g of SY.gegnerListe) {
    const id = sysKampf(g.id);
    const vorlage = world.creatures[sysVorlage(g)];
    world.creatures[id] = { name: g.name, stats: [...(vorlage?.stats ?? [24, 7, 2, 5])] };
    world.fights[id] = { gegner: { rang: g.miniboss ? "elite" : "mitlaeufer", stufe: g.minStufe }, system: g.id, name: g.name, loot: [],
      random: true, alpha: g.miniboss,
      special: { name: g.miniboss ? "Wuchtschlag" : "Ansturm", warning: g.name + " holt aus.", damage: 1 },
      victoryText: g.miniboss ? g.name + " fällt. Der Weg ist für eine Weile sicherer." : "Der Hinterhalt ist abgewehrt." };
    world.battleRewards[id] = [0, 0];
  }

  // Begleiter aus den Begleiter-Aufträgen (Henry, Punkt 4): Grundwerte ihrer Klasse wie bei den bestehenden Gefährten.
  const klassenWerte = { waechter: { health: 32, guard: 11 }, spaeher: { health: 28, damage: 10, airborne: 4 },
    krieger: { health: 36, damage: 12 }, magier: { health: 24, damage: 13, fire: true }, heiler: { health: 26, heal: 12, cleanse: true },
    schurke: { health: 26, guard: 8, damage: 4 } };
  const begleiterTexte = {
    kronhall_q10: ["sigrid", "Sigrid trägt noch das Wappen der Kronwache, obwohl man sie verstoßen hat. Seit ihr Name reingewaschen ist, will sie an deiner Seite für die Krone stehen."],
    rosshag_q10: ["wulfgar", "Wulfgar führt den weißen Wildhengst, den ihr gemeinsam gezähmt habt. Er kennt jeden Pfad der Westmark."],
    ulfsborg_q10: ["fenris", "Fenris spannt schweigend seinen Bogen. Der Plünderer, der seine Familie tötete, liegt im Wolfstal. Jetzt will er weiterziehen."],
    aschenkloster_q10: ["halvar", "Bruder Halvar hat das Ordensbanner zurück. Seine Wunden sind verbunden, und auf seinem Schild glühen die Runen."],
    brandstein_q10: ["gunhild", "Gunhild klopft den Schwefelstaub aus ihrer Robe. Seit der Runenkammer schuldet sie dir ihr Leben."],
    perlvik_q10: ["karen", "Karen Salzklinge wischt das Salz von ihrer Harpune. Seit ihr den Hafen gemeinsam verteidigt habt, will sie mit dir auf See."],
    nebelvik_q10: ["soren", "Sören Nebeltritt taucht aus dem Hafenrauch auf, als hätte er schon immer neben dir gestanden. Er kennt jede Schmugglerbucht der Küste."],
    salzwacht_q10: ["halvor", "Zollhauptmann Halvor Eisentau hängt den Enterhaken an den Gürtel. Wer Salzwacht hält, sagt er, der hält auch eine Planke."],
    nordwacht_q10: ["malte", "Malte hat den Wachturm gehalten, bis du kamst. Die Signalhörner bläst er nicht mehr allein."],
  };
  const begleiterNachAuftrag = {};
  if (NQ) for (const fraktion of ["kronreich", "orden", "haefen"]) for (const begleiter of NQ.reihe(fraktion)?.begleiter ?? []) {
    const [id, introduction] = begleiterTexte[begleiter.auftrag] ?? [];
    if (!id || !auftragIndex[begleiter.auftrag]) continue;
    begleiterNachAuftrag[begleiter.auftrag] = id;
    world.companions[id] = { klasse: begleiter.klasse, name: begleiter.name, volk: "menschen", scenes: [], ...klassenWerte[begleiter.klasse],
      auftrag: begleiter.auftrag, knoten: begleiter.ort, fraktion,
      place: N.get(begleiter.ort).name + " · nach dem Auftrag „" + auftragIndex[begleiter.auftrag].titel + "“",
      introduction, ability: begleiter.faehigkeit };
  }

  for (const c of CHAMPIONS) world.companions[c.id] = { klasse: c.klasse, name: c.name, volk: c.volk, scenes: [], ...klassenWerte[c.klasse],
    champion: true, fraktion: c.fraktion, place: "Elite-Champion · Bündnis in Akt 5", introduction: c.name + " kämpft für das Bündnis.",
    ability: c.rolle };

  // ---- Rückreise-Pflicht (Henry, 20. 11. 2026, quellen/henry/v2619/marsch-und-rueckreise.json) ----
  // Ein Auftrag, der fern vom Auftraggeber erfüllt wird, ist erst „bereit zur Abgabe“. Lohn und Bericht gibt es am Ort des
  // Auftraggebers. Ausnahme „abgabe_vor_ort“: Aufträge, die im Ort des Aushangs selbst erledigt werden, und Hauptquest-
  // Schritte ohne Auftraggeber anderswo (Freie Häfen: Kette Zollholm → Möwenstad → Silberholm → Perlvik).
  const MARSCH = SY.daten.v2619marsch;
  const ORTGATE = SY.daten.v2619ortGate;

  const rueckkehr = { status: MARSCH.quest_rueckkehr_system.neuer_status,
    faktor: MARSCH.quest_rueckkehr_system["rückmarsch_regeln"].ereignis_wahrscheinlichkeit_faktor,
    banner: MARSCH.quest_rueckkehr_system["rückmarsch_regeln"].hinweis_banner_text,
    knopf: MARSCH.quest_rueckkehr_system.ui_verhalten.ziel_ort_button_label_bei_erledigt };
  const mitOrt = (text, ortId) => text.replaceAll("{auftraggeber_ort}", N.get(ortId)?.name ?? ortId);
  const marschBeispielVignetten = Object.fromEntries(MARSCH.akt1_beispiel_hagenfels.phasen.filter((p) => p.vignette)
    .map((p) => [p.phase === "hinmarsch" ? "hin" : "rueck", p.vignette]));

  // ---- Vier Schwierigkeitsgrade mit Hardcore (Henry, 20. 11. 2026, quellen/henry/v2619/schwierigkeitsgrade.json) ----
  // Leicht ist die bisherige Balance und Standard. Hardcore (Permadeath) ist erst wählbar, wenn einmal die Hauptquest bis
  // Bannerjarl (Quest-Stufe 4) geschafft ist; die Freischaltung merkt sich der Browser. Hardcore lässt sich nur bei der
  // Charaktererstellung wählen und nicht mehr wechseln; Leicht, Mittel und Schwer lassen sich in den Einstellungen tauschen.
  function schwierigkeitsGrad(id) { return SCHWIERIG.schwierigkeitsgrade.find((g) => g.id === id) ?? null; }
  const schwierigkeitMod = (state) => (schwierigkeitsGrad(state?.schwierigkeit) ?? schwierigkeitsGrad(SCHWIERIG.standard_auswahl)).modifikatoren;
  const permadeath = (state) => Boolean(schwierigkeitsGrad(state?.schwierigkeit)?.permadeath);
  function schwierigkeitLp(state, feinde) {
    const f = schwierigkeitMod(state).gegner_lp_faktor;
    if (f === 1) return feinde;
    return feinde.map((foe) => ({ ...foe, lp: Math.max(1, Math.round(foe.lp * f)), max: Math.max(1, Math.round(foe.max * f)) }));
  }
  function hinterhaltOffset(state, table) {
    const plus = Math.round(schwierigkeitMod(state).hinterhalt_chance_offset * 100);
    if (!plus || !table.some(([, art]) => art === "jaeger")) return table;
    const ruhig = table.findIndex(([, art]) => art === "ruhig");
    return table.map(([w, art], i) => [art === "jaeger" ? w + plus : i === ruhig ? Math.max(0, w - plus) : w, art]);
  }
  const hardcoreFrei = (state) => (state?.questStufe ?? 0) >= SCHWIERIG.hardcore_freischaltung.ausloeser_bedingung.min_quest_stufe;
  function schwierigkeitGrund(state, id, { neu = false, freigeschaltet = false } = {}) {
    const grad = schwierigkeitsGrad(id);
    if (!grad) return "unbekannter Schwierigkeitsgrad";
    if (state.schwierigkeit === id) return "bereits gewählt";
    if (permadeath(state) && !neu) return "Hardcore lässt sich im Spiel nicht wechseln";
    if (grad.erfordert_freischaltung && !freigeschaltet) return SCHWIERIG.hardcore_freischaltung.gesperrt_anzeige_in_ui.hinweis_text;
    if (grad.permadeath && !neu) return "nur bei der Charaktererstellung";
    return null;
  }
  function schwierigkeitWaehlen(previous, id, optionen = {}) {
    if (schwierigkeitGrund(previous, id, optionen)) return previous;
    const state = structuredClone(previous);
    state.schwierigkeit = id;
    if (!optionen.neu) note(state, "Schwierigkeitsgrad: " + schwierigkeitsGrad(id).anzeigename + ".");
    return state;
  }
  // Hardcore-Held erreicht Bannerjarl: Abschlusstitel „Der Ungebrochene“.
  function ungebrochen(state) {
    if (!permadeath(state) || !hardcoreFrei(state) || state.marks.includes("der-ungebrochene")) return;
    state.marks.push("der-ungebrochene");
    note(state, "Ein Leben, ein Schwur: Du trägst den Titel „" + schwierigkeitsGrad("hardcore").sonderregeln.abschluss_titel + "“.");
  }

  // Hauptquest Akt 1. Die Texte kommen aus der Fraktionsreihe, die Orte und Gegner legt der Plan fest.
  const hauptPlan = {
    kronreich: [
      { schritt: 0, ort: "kronhall" },
      // Henry, 20. 11. 2026 (Rückreise-Pflicht, Beispiel „Verbranntes Korn“): Bericht vor dem Thron in Kronhall.
      { schritt: 1, ort: "hagenfels", gegner: "deserteure", auftraggeber: "kronhall", vignetten: marschBeispielVignetten },
      { schritt: 2, ort: "westvik", wahl: true },
    ],
    orden: [
      { schritt: 0, ort: "glutberg" },
      { schritt: 1, ort: "lichtheim", gegner: "kultisten", auftraggeber: "glutberg", titel: "Wachs aus Lichtheim",
        text: "Im Bienental bei Lichtheim haben Kultisten das geweihte Wachs verdorben. Sie lauern noch zwischen den Stöcken." },
      { schritt: 1, ort: "brandstein", gegner: "runenfresser", auftraggeber: "glutberg", titel: "Schwefel aus Brandstein",
        text: "In der Schwefelgrube bei Brandstein frisst ein Runenfresser die geweihten Steine. Ohne Schwefel bleiben die Runenbecken kalt." },
      { schritt: 2, ort: "glutberg", wahl: true },
    ],
    // Freie Häfen: Start in Zollholm nach der Flucht aus Perlvik. Schritt 2 führt über M31 nach Möwenstad und M30 nach Silberholm,
    // Schritt 3 über M40 zurück nach Perlvik (Gemini, 18. 11. 2026). Jede Überfahrt kostet 15 Silber.
    haefen: [
      { schritt: 0, ort: "zollholm", gegner: "schmuggler" },
      { schritt: 1, ort: "moewenstad", gegner: "spione", titel: "Kuriere in Möwenstad",
        text: "Über den Seeweg M31 bist du nach Möwenstad gesegelt. Im Hafen warten Kuriere mit verschlüsselten Briefen auf ein Schiff nach Norden. Fang sie ab, bevor sie ablegen." },
      { schritt: 1, ort: "silberholm", titel: "Die Briefe der Stillen Feder",
        text: "In Silberholm wartet eine Nachricht der Stillen Feder. Wer sie schreibt, bleibt im Dunkeln. Sie entschlüsselt die Briefe: Kult-Reeder schmuggeln Knochen aus dem Norden, und einer sitzt im Hafenthing von Perlvik." },
      { schritt: 2, ort: "perlvik", wahl: true },
    ],
  };
  // Folgen der Wahl am Ende von Akt 1 (Gemini). Freischaltungen und spätere Folgen werden als Marke gespeichert.
  const wahlFolgen = {
    kron_act1_fight: { gegner: "urgash", leisten: { orks: -5 } },
    kron_act1_truce: { silber: 40 },
    // Patch 2.6.19 (Henry, B3): „+10 Glaube“ ist jetzt Orden-Ruf +10 und Moral +5.
    orden_act1_mercy: { ruf: { orden: 10 }, moral: 5 },
    orden_act1_wrath: { leisten: { untote: -5 } },
    haefen_act1_guild: { vorrat: 10 },
    haefen_act1_shadow: { silberLohn: 80 },
  };
  const hauptAkt = (fraktion) => NQ?.reihe(fraktion)?.akte[0] ?? null;
  const hauptStand = (state) => state.hauptquest ?? { schritt: 0, wahl: null };
  function hauptInfo(fraktion, index) {
    const plan = hauptPlan[fraktion]?.[index];
    const akt = hauptAkt(fraktion);
    if (!plan || !akt) return null;
    const quelle = akt.schritte[plan.schritt];
    return { ...plan, titel: plan.titel ?? quelle.titel, text: plan.text ?? quelle.text, nr: index + 1, von: hauptPlan[fraktion].length,
      wahlen: plan.wahl ? akt.wahl : [] };
  }

  // Gebietsstufe für Auftragsgegner: der Bereich des Aushangs, auf die Heldenstufe begrenzt.
  function gebietsStufe(state, ortId) {
    const held = level(state);
    const text = NQ?.stufenFuer(ortId, state.faction);
    if (!text) return held;
    const bereiche = text.split(" oder ").map(teil => teil.split("-").map(Number));
    const [min, max] = bereiche.find(([, hoch]) => held <= hoch) ?? bereiche[bereiche.length - 1];
    return Math.max(min, Math.min(max, held));
  }

  function auftragKampfStarten(state, typ, auftragId, ortId, titel) {
    const id = auftragKampf(typ);
    const stufe = gebietsStufe(state, ortId);
    note(state, titel + ": " + world.fights[id].name + " stellen sich dir · Stufe " + stufe + ".");
    startFight(state, id, true, stufe);
    if (state.combat) Object.assign(state.combat, { weiter: "weltknoten", auftrag: auftragId, gegnerStufe: stufe });
    else if (!state.health) arrive(state, "defeat");
  }

  const imHub = (state) => state.scene === "weltknoten" && !state.combat && state.health > 0;
  const auftragsLohn = (state, id) => auftragIndex[id].spiel.lohn[state.weltAuftraege?.[id]?.wahl ?? 0];

  function auftragGrund(state, id, wahl = 0) {
    const auftrag = auftragIndex[id];
    if (!auftrag) return "unbekannter Auftrag";
    if (!imHub(state)) return "nur in der Weltreise";
    if (state.tatOffen) return "erst über den Ausgang des letzten Auftrags entscheiden";
    if (state.knoten !== auftrag.ort) return "Aushang in " + N.get(auftrag.ort).name;
    if (!NQ.stufenFuer(auftrag.ort, state.faction)) return "nur für Helden des eigenen Volkes";
    if (id === schattenImRat.id && !hatMarke(state, "ragnvald_misstraut_hof")) return "noch nicht ausgeschrieben";
    const eintrag = state.weltAuftraege?.[id];
    if (eintrag) return eintrag.status === "erledigt" ? "erledigt" : eintrag.status === rueckkehr.status ? "bereit zur Abgabe" : "angenommen";
    if (!intBetween(wahl, 0, auftrag.spiel.lohn.length - 1)) return "unbekannte Belohnung";
    const bindung = gefaehrtenAkt[id];
    if (bindung && (state.questStufe ?? 0) < bindung.akt - 1) {
      return "erst ab Akt " + bindung.akt + " (empfohlen Stufe " + bindung.stufe.join("–") + ")";
    }
    if (offeneAuftraege(state) >= auftragsBuch.max) return auftragsBuch.voll;
    return null;
  }
  // Patch 2.6.19 (Henry, B4): Gefährten späterer Akte werben ihre Aufträge erst in diesem Akt an (Akt 2 heißt: Akt 1 abgeschlossen).
  const gefaehrtenAkt = { rosshag_q10: { akt: 2, stufe: [6, 10] }, brandstein_q10: { akt: 2, stufe: [6, 10] },
    ulfsborg_q10: { akt: 3, stufe: [11, 15] }, nordwacht_q10: { akt: 3, stufe: [11, 15] } };

  // Patch 2.5.4: Höchstens 5 offene Aushänge. Nach 10 erfüllten Aufträgen sinkt das Silber je weiterem Auftrag um 3 %,
  // bis auf die Hälfte. Vorrat über der Obergrenze geht ins Kontor der eigenen Fraktion statt verloren.
  const auftragsBuch = { max: 5, voll: "Dein Auftragsbuch ist voll (max. 5 offene Aushänge). Schließe erst laufende Aufträge ab.",
    vollerLohnBis: 10, abschlag: 0.03, boden: 0.5 };
  const offeneAuftraege = (state) => Object.values(state.weltAuftraege ?? {}).filter((entry) => entry.status === "aktiv" || entry.status === rueckkehr.status).length;
  const erfuellteAuftraege = (state) => Object.values(state.weltAuftraege ?? {}).filter((entry) => entry.status === "erledigt").length;
  // Anteil des Silbers für den nächsten Auftrag, wenn bereits `erfuellt` Aufträge erledigt sind.
  const lohnAnteil = (erfuellt) => Math.max(auftragsBuch.boden, 1 - auftragsBuch.abschlag * Math.max(0, erfuellt + 1 - auftragsBuch.vollerLohnBis));

  function auftragAnnehmen(previous, id, wahl = 0) {
    if (auftragGrund(previous, id, wahl)) return previous;
    const state = structuredClone(previous);
    const auftrag = auftragIndex[id];
    (state.weltAuftraege ??= {})[id] = { status: "aktiv", wahl };
    note(state, "Auftrag angenommen: " + auftrag.titel + ". " + (auftrag.spiel.weg
      ? "Reise über den Weg " + auftrag.spiel.weg + " (" + NQ.wegName(auftrag.spiel.weg) + "), um ihn zu erledigen."
      : "Erledige ihn hier in " + N.get(auftrag.ort).name + "."));
    return state;
  }

  function ausfuehrenGrund(state, id) {
    const auftrag = auftragIndex[id];
    if (!auftrag || state.weltAuftraege?.[id]?.status !== "aktiv") return "nicht angenommen";
    if (!imHub(state)) return "nur in der Weltreise";
    if (state.tatOffen) return "erst über den Ausgang des letzten Auftrags entscheiden";
    if (auftrag.spiel.weg) return "unterwegs auf " + auftrag.spiel.weg;
    if (state.knoten !== auftrag.ort) return "in " + N.get(auftrag.ort).name;
    const lohn = auftragsLohn(state, id);
    if (lohn.vorrat < 0 && state.ressource + lohn.vorrat < 1) return "zu wenig " + resourceName(state);
    return null;
  }

  function auftragAusfuehren(previous, id) {
    if (ausfuehrenGrund(previous, id)) return previous;
    const state = structuredClone(previous);
    const auftrag = auftragIndex[id];
    if (auftrag.spiel.gegner) auftragKampfStarten(state, auftrag.spiel.gegner, id, auftrag.ort, auftrag.titel);
    else {
      note(state, auftrag.titel + ": " + auftrag.text);
      auftragAbschliessen(state, id);
    }
    return state;
  }

  // Rückreise-Pflicht: Wegaufträge werden beim Auftraggeber (Ort des Aushangs) abgegeben.
  const abgabeVorOrt = (auftrag) => Boolean(auftrag.abgabe_vor_ort ?? !auftrag.spiel.weg);
  function abgabeGrund(state, id) {
    const auftrag = auftragIndex[id];
    if (!auftrag || state.weltAuftraege?.[id]?.status !== rueckkehr.status) return "nicht bereit zur Abgabe";
    if (!imHub(state)) return "nur in der Weltreise";
    if (state.tatOffen) return "erst über den Ausgang des letzten Auftrags entscheiden";
    if (state.knoten !== auftrag.ort) return "nur in " + N.get(auftrag.ort).name;
    return null;
  }
  function auftragAbgeben(previous, id) {
    if (abgabeGrund(previous, id)) return previous;
    const state = structuredClone(previous);
    note(state, "Du erstattest in " + N.get(auftragIndex[id].ort).name + " Bericht und forderst deinen Lohn ein.");
    auftragAbschliessen(state, id);
    return state;
  }
  // Alle Orte, an denen ein Bericht wartet: Aushänge „bereit zur Abgabe“ und der Hauptquest-Bericht.
  function rueckkehrZiele(state) {
    const liste = Object.entries(state.weltAuftraege ?? {}).filter(([, e]) => e.status === rueckkehr.status)
      .map(([id]) => ({ art: "aushang", id, titel: auftragIndex[id].titel, ort: auftragIndex[id].ort }));
    const bericht = state.hauptquest?.bericht;
    if (bericht) liste.unshift({ art: "haupt", id: "haupt", titel: hauptInfo(state.faction, state.hauptquest.schritt)?.titel ?? "Hauptquest", ort: bericht.ort });
    return liste.map((z) => ({ ...z, ortName: N.get(z.ort).name, knopf: mitOrt(rueckkehr.knopf, z.ort), hier: state.knoten === z.ort,
      route: state.knoten === z.ort ? [] : marschRoute(state, z.ort) }));
  }
  const rueckmarsch = (state) => Object.values(state.weltAuftraege ?? {}).some((e) => e.status === rueckkehr.status) || Boolean(state.hauptquest?.bericht);
  // Kürzeste Route (Vorrat je Etappe) im Wegenetz. Seewege nur mit Schiff, fremde Völker erst nach Akt 5.
  function marschRoute(state, zielId) {
    const start = state.knoten;
    if (!N.get(start) || !N.get(zielId)) return null;
    const kosten = { [start]: 0 };
    const vorher = {};
    const offen = new Set([start]);
    while (offen.size) {
      const id = [...offen].reduce((a, b) => (kosten[a] <= kosten[b] ? a : b));
      offen.delete(id);
      if (id === zielId) break;
      const ort = N.get(id);
      for (const weg of ort.verbindungen) {
        const ziel = N.get(weg.zielId);
        if (!ziel || people(ziel.fraktion) !== people(state.faction)) continue;
        if (weg.kantenTyp === "seeweg" && !schiffBereit(state, ort)) continue;
        const k = kosten[id] + Math.max(1, weg.kostenRessource ?? 1) + (weg.kostenGold ? 1 : 0);
        if (kosten[weg.zielId] === undefined || k < kosten[weg.zielId]) {
          kosten[weg.zielId] = k;
          vorher[weg.zielId] = id;
          offen.add(weg.zielId);
        }
      }
    }
    if (kosten[zielId] === undefined) return null;
    const route = [];
    for (let id = zielId; id !== start; id = vorher[id]) route.unshift(id);
    return route;
  }
  function hauptVignette(state, zielId) {
    const stand = state.hauptquest;
    const plan = stand && hauptPlan[state.faction]?.[stand.schritt];
    if (!plan?.vignetten) return null;
    if (stand.bericht && zielId === stand.bericht.ort) return plan.vignetten.rueck;
    if (!stand.bericht && zielId === plan.ort) return plan.vignetten.hin;
    return null;
  }
  // Globales Ort-Gate (Henry, 20. 11. 2026, quellen/henry/v2619/ort-gate.json): Gespräch, Abgabe und Aushang nur am Ort.
  // Ist der Held woanders, zeigt die Oberfläche statt des Gesprächs eine Reise zum Zielort (Route, Etappen, Sperrgrund).
  function ortReise(state, zielId) {
    const ziel = N.get(zielId);
    if (!ziel) return null;
    if (state.knoten === zielId) return { ziel: zielId, zielName: ziel.name, hier: true, route: [], grund: null, kurz: "hier" };
    const route = imHub(state) ? marschRoute(state, zielId) : null;
    const grund = !imHub(state) ? "nur in der Weltreise" : !route ? "kein Weg" : reiseGrund(state, route[0]);
    return { ziel: zielId, zielName: ziel.name, hier: false, route: route ?? [], grund,
      kurz: grund ?? (route.length + (route.length === 1 ? " Etappe" : " Etappen")) };
  }
  // Ort, an dem der nächste Schritt von Hauptquest, Schwester-Zweig oder Akt 4 wartet.
  function hauptZielOrt(state) {
    const stand = hauptStand(state);
    const plan = hauptPlan[state.faction];
    if (!plan || stand.schritt >= plan.length) return null;
    return stand.bericht?.ort ?? plan[stand.schritt].ort;
  }
  function akt4ZielOrt(state) {
    const a = akteStand(state).akt4;
    if (!a || a.schritt >= 3) return null;
    if (a.schritt === 0) {
      if (a.siegel.length >= 3) return null;
      const offen = akt4Orte.siegel.filter((o) => !a.siegel.includes(o));
      if (offen.includes(state.knoten)) return state.knoten;
      return offen.map((o) => [o, marschRoute(state, o)?.length ?? 99]).sort((x, y) => x[1] - y[1])[0][0];
    }
    return a.schritt === 1 ? akt4Orte.thorvald : akt4Orte.thing;
  }

  // Text für die Marsch-Animation: Vignette des Hauptquest-Beispiels oder der Rückreise-Hinweis.
  function marschVignette(state, zielId) {
    const haupt = hauptVignette(state, zielId);
    if (haupt) return haupt;
    const ziel = rueckkehrZiele(state).find((z) => z.ort === zielId);
    return ziel ? mitOrt(rueckkehr.banner, zielId) : null;
  }

  function auftragAbschliessen(state, id) {
    const auftrag = auftragIndex[id];
    const lohn = auftragsLohn(state, id);
    const anteil = lohnAnteil(erfuellteAuftraege(state));
    const silber = Math.round(lohn.silber * anteil);
    state.weltAuftraege[id].status = "erledigt";
    note(state, "Auftrag erfüllt: " + auftrag.titel + ".");
    const folgen = [];
    if (lohn.vorrat) {
      const ueberschuss = menschen(state) ? Math.max(0, state.ressource + lohn.vorrat - vorratMax) : 0;
      state.ressource = Math.max(1, Math.min(vorratMax, state.ressource + lohn.vorrat));
      folgen.push((lohn.vorrat > 0 ? "+" : "") + lohn.vorrat + " " + resourceName(state));
      if (ueberschuss) {
        SY.kontor(state, state.faction).nahrung += ueberschuss;
        folgen.push(ueberschuss + " davon ins Kontor von " + K.fraktionen[state.faction].name);
      }
    }
    if (silber < lohn.silber) folgen.push("Lohn " + Math.round(anteil * 100) + " % (" + silber + " statt " + lohn.silber + " Silber)");
    for (const [leisteId, wert] of Object.entries(lohn.leisten)) {
      setzeLeiste(state, leisteId, leiste(state, leisteId) + wert);
      folgen.push(leistenNamen[leisteId] + " " + (wert > 0 ? "+" : "") + wert);
    }
    if (lohn.vermerke.length) folgen.push("vermerkt: " + lohn.vermerke.join(", "));
    if (folgen.length) note(state, folgen.join(" · ") + ".");
    grant(state, "auftrag-" + id, auftragEp, silber, lohn.gegenstaende, false);
    // Ruf-Datei 2.0: Aufträge der Menschen enden mit einer Wahl: gute Tat, Söldner-Weg oder schlechte Tat.
    if (menschen(state) && SY.istMensch(auftrag.fraktion)) {
      state.tatOffen = id;
      note(state, "Wie endest du den Auftrag? Gute Tat, Söldner-Weg oder schlechte Tat entscheiden über deinen Ruf bei " +
        K.fraktionen[auftrag.fraktion].name + ".");
    }
    const begleiter = begleiterNachAuftrag[id];
    if (begleiter) {
      const companion = world.companions[begleiter];
      note(state, companion.klasse === state.role
        ? companion.name + " dankt dir. Mit dir zieht schon jemand dieser Klasse, deshalb bleibt " + companion.name + " in " + N.get(companion.knoten).name + "."
        : companion.name + " wartet in " + N.get(companion.knoten).name + " auf dich. Im Hofstaat kannst du " + companion.name + " in die Gruppe aufnehmen.");
    }
  }

  // Ausgang eines Auftrags (Ruf-Datei 2.0, Patch 2.1.0 Punkt 4): Ruf, Lohnfaktor, Moral. Gute Tat oder Söldner-Weg
  // bei q01 einer Stadt befreit alle Dörfer dieser Stadt.
  // Der Lohn der Tat folgt demselben Anteil wie der Auftrag selbst (Patch 2.5.4); der Auftrag zählt schon als erfüllt.
  const tatLohn = (state, id) => Math.round((auftragsLohn(state, id).silber ?? 0) * lohnAnteil(Math.max(0, erfuellteAuftraege(state) - 1)));
  function taten(state) {
    if (!state.tatOffen) return [];
    const lohn = tatLohn(state, state.tatOffen);
    return Object.entries(SY.daten.taten).map(([id, t]) => ({ id, name: t.name, text: t.text, ruf: t.ruf,
      silber: Math.round(lohn * (t.silber - 1)), nahrung: t.rohstoffe, befreit: t.befreit && /_q01$/.test(state.tatOffen) }));
  }
  function tatWaehlen(previous, tat) {
    if (!previous.tatOffen || !SY.daten.taten[tat]) return previous;
    const state = structuredClone(previous);
    const id = state.tatOffen;
    const auftrag = auftragIndex[id];
    const lohn = tatLohn(state, id);
    const t = SY.daten.taten[tat];
    const vorher = SY.ruf(state, auftrag.fraktion);
    SY.rufAendern(state, auftrag.fraktion, t.ruf);
    const extra = Math.round(lohn * (t.silber - 1));
    state.silver += extra;
    if (t.rohstoffe) {
      const ueberschuss = Math.max(0, (state.ressource ?? 0) + t.rohstoffe - vorratMax);
      state.ressource = Math.min(vorratMax, (state.ressource ?? 0) + t.rohstoffe);
      if (ueberschuss) SY.kontor(state, state.faction).nahrung += ueberschuss;
    }
    const moral = SY.moralAendern(state, tat === "pragmatisch" ? "keins" : tat);
    state.tatOffen = null;
    const folgen = ["Ruf bei " + K.fraktionen[auftrag.fraktion].name + " " + (t.ruf > 0 ? "+" : "") + t.ruf + " (jetzt " + SY.ruf(state, auftrag.fraktion) + ")"];
    if (extra) folgen.push("+" + extra + " Silber");
    if (t.rohstoffe) folgen.push("+" + t.rohstoffe + " " + resourceName(state));
    if (moral) folgen.push("Moral " + (moral > 0 ? "+" : "") + moral);
    note(state, t.name + ": " + folgen.join(" · ") + ".");
    const rangVorher = SY.rufRang(vorher).id;
    const rang = SY.rufRang(SY.ruf(state, auftrag.fraktion));
    if (rang.id !== rangVorher) note(state, "Dein Rang bei " + K.fraktionen[auftrag.fraktion].name + " ist jetzt: " + rang.name + ".");
    if (t.befreit && /_q01$/.test(id)) {
      const frei = SY.befreie(state, auftrag.ort);
      if (frei.length) note(state, "Die Dörfer von " + N.get(auftrag.ort).name + " sind befreit: " + frei.map((d) => N.get(d).name).join(", ") +
        ". Ab Ruf 20 liefern sie alle " + SY.daten.zehnt.etappen + " Etappen ihren Zehnt ins Kontor.");
    }
    nahrungErhalten(state);
    return state;
  }

  // ---- Kontor der Menschen (Patch 2.1.0 Punkt 3): Rohstoffe kaufen, verkaufen, Nahrung tragen, Kriegskasse ----
  function kontorInfo(state) {
    if (!menschen(state) || state.scene !== "weltknoten") return null;
    const fraktion = SY.kontorAm(state.knoten);
    if (!fraktion) return null;
    const rang = SY.rufRang(SY.ruf(state, fraktion));
    return { fraktion, name: K.fraktionen[fraktion].name, rang, ruf: SY.ruf(state, fraktion), lager: { ...SY.kontor(state, fraktion) },
      rohstoffe: SY.ROHSTOFFE.map((r) => ({ id: r, name: SY.daten.rohstoffe[r].name, menge: SY.kontor(state, fraktion)[r],
        kauf: SY.rohstoffPreis(state, fraktion, r, 1, true), kauf10: SY.rohstoffPreis(state, fraktion, r, 10, true),
        verkauf: SY.rohstoffPreis(state, fraktion, r, 1, false),
        kaufGrund: SY.handelGrund(state, state.knoten, r, 1, true), kauf10Grund: SY.handelGrund(state, state.knoten, r, 10, true),
        verkaufGrund: SY.handelGrund(state, state.knoten, r, 1, false) })),
      abhebenGrund: SY.nahrungGrund(state, state.knoten, 5, false), einlagernGrund: SY.nahrungGrund(state, state.knoten, 5, true),
      kasse: SY.kasse(state), kasseBedarf: SY.daten.kriegskasse.bedarf, kasseVoll: SY.kasseVoll(state),
      spenden: Object.keys(SY.daten.kriegskasse.bedarf).map((r) => ({ id: r, grund: SY.spendenGrund(state, state.knoten, r, 5) })) };
  }
  const kontorAktion = (fn) => (previous, ...args) => {
    if (!imHub(previous) || !menschen(previous) || previous.tatOffen) return previous;
    const state = structuredClone(previous);
    const ergebnis = fn(state, ...args);
    if (ergebnis === false || ergebnis === null) return previous;
    nahrungErhalten(state);
    return state;
  };
  const kontorHandel = kontorAktion((state, rohstoff, menge, kaufen) => {
    const preis = SY.handeln(state, state.knoten, rohstoff, menge, kaufen);
    if (preis === false) return false;
    note(state, (kaufen ? "Gekauft: " : "Verkauft: ") + menge + " " + SY.daten.rohstoffe[rohstoff].name + " · " + (kaufen ? "−" : "+") + preis + " Silber.");
    return true;
  });
  const nahrungTragen = kontorAktion((state, menge, einlagern) => {
    if (!SY.nahrungTragen(state, state.knoten, menge, einlagern)) return false;
    note(state, menge + " Nahrung " + (einlagern ? "ins Kontor gelegt." : "aus dem Kontor genommen."));
    return true;
  });
  const spenden = kontorAktion((state, rohstoff, menge) => {
    const fraktion = SY.kontorAm(state.knoten);
    if (!SY.spenden(state, state.knoten, rohstoff, menge)) return false;
    note(state, menge + " " + SY.daten.rohstoffe[rohstoff].name + " für die " + SY.daten.kriegskasse.titel + " · Ruf bei " +
      K.fraktionen[fraktion].name + " +" + SY.daten.rufAusloeser.donate_to_kontor.ruf * menge + "." +
      (SY.kasseVoll(state) ? " " + kasseVollText() : ""));
    return true;
  });
  // Patch 2.5.3: Solange Akt 5 nicht gebaut ist, öffnet die volle Kasse die Überfahrt noch nicht.
  const kasseVollText = () => SY.daten.kriegskasse.akt5Gebaut ? "Die Kriegskasse ist gefüllt: Die Armada kann auslaufen." : SY.daten.kriegskasse.vollText;
  // ---- Siedlung der Menschen (Bau-Datei, Patch 1.6.0, 2.1.0): Ausbau, Gebäude, Straßen, Garnison, Wiederaufbau ----
  function siedlungInfo(state) {
    if (!menschen(state) || state.scene !== "weltknoten") return null;
    const ort = N.get(state.knoten);
    if (!ort || !SY.istMensch(ort.fraktion)) return null;
    const stufe = SY.siedlungsStufe(state, ort.id);
    const naechste = SY.daten.siedlungsStufen[stufe + 1] ?? null;
    const phase = SY.phase(state, ort.fraktion);
    const stehend = SY.gebaeudeIn(state, ort.id);
    return {
      ort: ort.id, name: ort.name, fraktion: ort.fraktion, dorf: ort.typ === "dorf",
      phase: { nr: phase, ...SY.daten.phasen[phase - 1] },
      stufe: SY.daten.siedlungsStufen[stufe], naechste, ausbauGrund: SY.ausbauGrund(state, ort.id),
      gebaeude: Object.values(SY.daten.gebaeude).filter((g) => g.ort !== "KANTE_GRENZLAND")
        .map((g) => ({ ...g, steht: stehend.includes(g.id), grund: SY.bauGrund(state, ort.id, g.id) }))
        .filter((g) => g.steht || !/passt nicht/.test(g.grund ?? "")),
      strassen: SY.wegeAm(ort.id).map((id) => {
        const [a, b] = wegEnden(id);
        const anderer = N.get(a === ort.id ? b : a);
        return { id, ziel: anderer?.name ?? id, gepflastert: (state.strassen ?? []).includes(id), grund: SY.strasseGrund(state, ort.id, id) };
      }).filter((w) => w.gepflastert || w.grund !== "nur Grenzland-Straßen"),
      strassenKosten: SY.kostenText(SY.daten.gebaeude.BLD_GRENZSTRASSE_STEIN.kosten),
      verteidigung: SY.verteidigung(state, ort.id), garnison: state.garnison?.[ort.id] ?? 0,
      rekrutierenGrund: SY.rekrutierenGrund(state, ort.id), rekrutierenKosten: SY.kostenText(SY.daten.garnison.kosten),
      beschaedigt: (state.gepluendert ?? []).includes(ort.id) || (state.pausiert?.[ort.id] ?? 0) > (state.etappen ?? 0),
      reparierenGrund: SY.reparierenGrund(state, ort.id), reparaturKosten: SY.kostenText(SY.daten.garnison.reparatur),
      wiederaufbau: SY.daten.wiederaufbau.filter((w) => w.ort === ort.id)
        .map((w) => ({ ...w, fertig: (state.marks ?? []).includes(w.marke), grund: SY.wiederaufbauGrund(state, w.id) })),
    };
  }
  const wegEnden = (id) => (typeof nebenquests !== "undefined" ? nebenquests : require("./nebenquests.js")).daten.wegKennungen[id] ?? [];
  const siedlungAusbauen = kontorAktion((state) => {
    const ziel = SY.ausbauen(state, state.knoten);
    if (!ziel) return false;
    note(state, N.get(state.knoten).name + " ist jetzt " + ziel.name + ". " + ziel.wirkung);
    return true;
  });
  const gebaeudeBauen = kontorAktion((state, id) => {
    if (!SY.bauen(state, state.knoten, id)) return false;
    note(state, "Gebaut in " + N.get(state.knoten).name + ": " + SY.daten.gebaeude[id].name + ". " + SY.daten.gebaeude[id].wirkung);
    return true;
  });
  const strasseBauen = kontorAktion((state, wegId) => {
    if (!SY.strassePflastern(state, state.knoten, wegId)) return false;
    note(state, "Die Grenzstraße ist gepflastert. Der Weg ist sicherer · Ruf +" + SY.daten.rufAusloeser.secure_border_road.ruf + ".");
    return true;
  });
  const garnisonRekrutieren = kontorAktion((state) => {
    if (!SY.rekrutieren(state, state.knoten)) return false;
    note(state, "Eine Truppe verstärkt die Garnison von " + N.get(state.knoten).name + " (Verteidigung " + SY.verteidigung(state, state.knoten) + ").");
    return true;
  });
  const ortReparieren = kontorAktion((state) => {
    if (!SY.reparieren(state, state.knoten)) return false;
    note(state, N.get(state.knoten).name + " ist wieder aufgebaut. Der Zehnt fließt wieder.");
    return true;
  });
  const wiederaufbau = kontorAktion((state, id) => {
    const w = SY.wiederaufbauen(state, id);
    if (!w) return false;
    note(state, w.titel + ": abgeschlossen · +" + w.silber + " Silber · Ruf +" + w.ruf + ". " + w.wirkung);
    return true;
  });

  // ---- Endgame der Menschen (Endgame-Datei, Patch 1.6.0, 1.6.1): Patrouillen, Ascherisse, Eskorten, Kaperfahrten, Turniere ----
  function endgameListe(state) {
    if (!menschen(state) || state.scene !== "weltknoten") return [];
    return Object.entries(SY.daten.endgame).map(([id, a]) => {
      const ort = a.orte?.find((o) => (o.ort ?? o) === state.knoten);
      return { id, name: a.name, titel: ort?.name ?? a.name, ep: a.ep, silber: a.silber, wellen: a.wellen ?? 1,
        grund: SY.endgameGrund(state, id, state.knoten), hier: !a.orte || Boolean(ort) };
    }).filter((e) => e.hier);
  }
  function endgameStarten(previous, id) {
    if (!imHub(previous) || !menschen(previous) || previous.tatOffen || SY.endgameGrund(previous, id, previous.knoten)) return previous;
    const state = structuredClone(previous);
    endgameKampf(state, id, 1);
    return state;
  }
  function endgameKampf(state, id, welle) {
    const a = SY.daten.endgame[id];
    const ort = N.get(state.knoten);
    const region = SY.daten.gegnerRegionen[ort.fraktion] ? ort.fraktion : state.faction;
    const stufe = Math.max(gebietsStufe(state, ort.id), level(state));
    const g = SY.begegnung(state, region, id === "kaperfahrt" ? "seeweg" : "strasse", stufe, travelDice);
    note(state, a.name + (a.wellen ? " · Welle " + welle + " von " + a.wellen : "") + ": " + g.name + " stellt sich euch!");
    startFight(state, sysKampf(g.id), true, g.werte.stufe);
    if (state.combat) Object.assign(state.combat, { weiter: "weltknoten", endgame: { id, welle, ort: ort.id } });
    else if (!state.health) arrive(state, "defeat");
  }
  function endgameSieg(state, e) {
    const a = SY.daten.endgame[e.id];
    if (a.wellen && e.welle < a.wellen) {
      endgameKampf(state, e.id, e.welle + 1);
      return;
    }
    const lohn = SY.endgameLohn(state, e.id, e.ort, travelDice);
    const roh = Object.entries(lohn.rohstoffe).map(([r, n]) => n + " " + SY.daten.rohstoffe[r].name.replace(/ \(.*\)/, "") + " ins Kontor");
    note(state, a.name + " abgeschlossen: +" + lohn.silber + " Silber" + (roh.length ? ", " + roh.join(", ") : "") + (a.ruf ? ", Ruf +" + a.ruf : "") + ".");
    grant(state, "endgame-" + e.id, lohn.ep, 0, [], false);
  }

  // ---- Meister-Talente (Stufe 22–30) und Blut der Ahnen (ab Stufe 30) ----
  function aufstiegInfo(state) {
    if (!menschen(state)) return null;
    const stufe = level(state);
    const vergeben = Object.values(state.talente ?? {}).reduce((s, n) => s + n, 0);
    const ahnenVergeben = Object.values(state.ahnen ?? {}).reduce((s, n) => s + n, 0);
    return { stufe, maxStufe: SY.maxStufe, signaturRang: SY.signaturRang(stufe),
      talentPunkte: SY.talentPunkte(stufe) - vergeben, talentStufen: SY.talentStufen,
      talente: SY.daten.aufstieg.talente.map((t) => ({ ...t, rang: SY.talentRang(state, t.id), max: SY.daten.aufstieg.talentMaxRang,
        grund: SY.talentGrund(state, t.id, stufe) })),
      ahnenPunkte: SY.ahnenPunkte(state.xp ?? 0) - ahnenVergeben,
      ahnen: SY.daten.aufstieg.ahnen.pfade.map((p) => ({ ...p, rang: state.ahnen?.[p.id] ?? 0, grund: SY.ahnenGrund(state, p.id, state.xp ?? 0) })) };
  }
  function talentLernen(previous, id) {
    if (!menschen(previous) || previous.combat || SY.talentGrund(previous, id, level(previous))) return previous;
    const state = structuredClone(previous);
    const lp = healthLimit(state);
    SY.talentLernen(state, id, level(state));
    state.health += healthLimit(state) - lp;
    note(state, "Meister-Talent gelernt: " + SY.daten.aufstieg.talente.find((t) => t.id === id).name + " (Rang " + SY.talentRang(state, id) + ").");
    return state;
  }
  function ahnenLernen(previous, pfad) {
    if (!menschen(previous) || previous.combat || SY.ahnenGrund(previous, pfad, previous.xp ?? 0)) return previous;
    const state = structuredClone(previous);
    const lp = healthLimit(state);
    SY.ahnenLernen(state, pfad, state.xp ?? 0);
    state.health += healthLimit(state) - lp;
    note(state, "Blut der Ahnen: " + SY.daten.aufstieg.ahnen.pfade.find((p) => p.id === pfad).name + " (Rang " + state.ahnen[pfad] + ").");
    return state;
  }

  // Moral, Rang und Zustand für die Anzeige.
  function lage(state) {
    if (!menschen(state)) return null;
    const stufe = SY.moralStufe(state);
    return { moral: SY.moral(state), moralStufe: stufe, entkraeftet: Boolean(state.entkraeftet), etappen: state.etappen ?? 0,
      naechsterZehnt: SY.daten.zehnt.etappen - ((state.etappen ?? 0) % SY.daten.zehnt.etappen),
      naechsterUeberfall: SY.daten.garnison.etappen - ((state.etappen ?? 0) % SY.daten.garnison.etappen),
      kontor: { ...SY.kontor(state, state.faction) }, klasse: SY.klasseVon(state.faction, state.role),
      befreit: (state.befreit ?? []).length, rang: SY.rufRang(SY.ruf(state, state.faction)), ruf: SY.ruf(state, state.faction),
      geaechtet: SY.geaechtet(state) };
  }

  // ---- Ausrüster, Handwerk und Schmiede der Menschen (Ökonomie-Datei, Patch 2.1.0 Punkt 5) ----
  const menschenKlasse = (state) => menschen(state) ? SY.klasseVon(state.faction, state.role) : null;
  // Patch 2.5.3: Resonanz-Boni greifen, sobald mindestens ein Runen- oder Glutgegenstand angelegt ist.
  const resonanz = (state) => equipmentSlots.some((slot) => world.gear[state.equipment?.[slot]]?.resonanz);
  // Patch 2.5.3: Glutgabe im Kampf unter den Menschen nur für den Orden der Flamme (Glut-Leiste).
  const glutgabe = (state) => !menschen(state) || state.faction === "orden";
  // Patch 2.5.4: Einsamer Wolf. Späher, Schurken und Heiler ohne Gefährten: +15 % Schaden, 15 % Ausweichen
  // (ohne Zufall: ein Zähler steigt je Angriff um 15, bei 100 geht der Angriff ins Leere).
  // Patch 2.5.6: Der Zusatzschaden wächst nach Stufe 15 nicht weiter (höchstens 3 je Treffer, so viel wie ein typischer
  // Treffer auf Stufe 15 erhält), damit Gefährten im Spätspiel der stärkere Weg bleiben. Schurken weichen jedem 5. statt
  // jedem 7. Angriff aus (Zähler +20 statt +15).
  const einsamerWolfWerte = { rollen: ["spaeher", "schurke", "heiler"], schaden: 0.15, schadenDeckel: 3, ausweichen: 15,
    ausweichenSchurke: 20 };
  const einsamerWolf = (state) => state.party.length === 0 && einsamerWolfWerte.rollen.includes(state.role);
  // Ausweich-Intervall des Helden (jeder n-te Angriff geht ins Leere). Einsamer Wolf: jeder 7., Schurken jeder 5.
  // Patch 2.6.x: Ungebrochener Schildwall Rang 2, Ausrüstung mit Ausweich-Bonus und Meister der Sturmflut verkürzen es um je 1.
  // Auslegung: Ohne Einsamen Wolf beginnt das Intervall bei 10, sobald etwas es verkürzt. Kürzestes Intervall 2.
  function ausweichIntervall(state) {
    const wolf = einsamerWolf(state) ? Math.round(100 / (state.role === "schurke" ? einsamerWolfWerte.ausweichenSchurke : einsamerWolfWerte.ausweichen)) : 0;
    if (!menschen(state)) return wolf;
    const klasse = klassenBalance.ausweichen[state.role] ?? 0;
    const basis = wolf && klasse ? Math.min(wolf, klasse) : wolf || klasse;
    const kuerzer = -SY.talentWirkung(state, "TREE_UNGEBROCHENER_SCHILDWALL", "evasion_interval_delta") - gearStat(state, "evasionInterval") +
      (state.akte?.fspez === "FSPEC_MEISTER_DER_STURMFLUT" ? 1 : 0);
    if (!basis && !kuerzer) return 0;
    return Math.max(2, (basis || 10) - kuerzer);
  }
  // Kritchance in Prozentpunkten (Zähler ohne Zufall): alle angelegten Stücke, Schattenpfad Rang 1, Lagerfeuer und Gefährten.
  const kritChance = (state) => equipmentSlots.reduce((s, slot) => s + (world.gear[state.equipment?.[slot]]?.krit ?? 0), 0) +
    SY.talentWirkung(state, "TREE_SCHATTENPFAD_UND_LIST", "crit_chance_bonus_pct") + (state.combat?.held?.lagerBuff?.crit_chance_bonus_pct ?? 0) +
    (state.gefaehrtenPerks?.includes("PERK_KR_WINTERJAEGER") ? 6 : 0);
  // Weitere Schadensboni des Helden aus Spezialisierung, Relikt, Lagerfeuer und Gefährten-Szenen (Patch 2.6.0–2.6.9).
  function v260Bonus(state, foe) {
    const held = state.combat?.held ?? {};
    const untot = foe.tags.includes("untot") || foe.tags.includes("ascheriss");
    return (state.akte?.fspez === "FSPEC_EID_DER_EWIGEN_GLUT" && untot ? 0.15 : 0) + v260GruppenBonus(state) +
      runenWert(state, "schaden") + (untot ? runenWert(state, "untot") : 0) +
      (held.lagerBuff?.damage_bonus_pct ?? 0) / 100 + (held.lagerBuff?.skill_damage_bonus_pct ?? 0) / 100 +
      (held.lagerBuff?.party_all_stats_pct ?? 0) / 100 +
      (state.gefaehrtenPerks?.includes("PERK_OR_LAEUTERUNG") && untot ? 0.1 : 0) +
      (state.gefaehrtenPerks?.includes("PERK_OR_SCHATTENURTEIL") && (state.combat?.round ?? 0) <= 1 ? 0.12 : 0) +
      (state.gefaehrtenPerks?.includes("PERK_OR_WACHSAMES_AUGE") && /Kult|Anführer|Hauptmann|Kapitän|Feldherr|Zelot/.test(foe.name) ? 0.08 : 0) +
      (state.gefaehrtenPerks?.includes("PERK_OR_FEUERATEM") && state.faction === "orden" ? 0.06 : 0) +
      (state.gefaehrtenPerks?.includes("PERK_FH_AETZPULVER") && ["PULVER_ALCHEMIST", "SCHWARZSCHUETZE", "SEUCHENMEDIKUS"].includes(menschenKlasse(state)?.id) ? 0.08 : 0);
  }
  // Kriegshorn des Großen Things (Gruppenrelikt, Patch 2.6.5): +8 % Schaden für die ganze Gruppe.
  const v260GruppenBonus = (state) => state.relikt === "REL_T4_BANNER_DER_EINIGUNG" ? SY.daten.gegenstaende.REL_T4_BANNER_DER_EINIGUNG.stats.partyDamagePct / 100 : 0;
  // Patch 2.5.5: Schutz für Pyromant und Kleriker der Flamme ohne Gefährten (LP der Klasse bleiben gleich):
  // Glutschild 25 % der LP zu Kampfbeginn, jeder weitere Treffer derselben Gegnerphase halbiert.
  // Patch 2.6.19 (Henry, B9): Glutschild 12 % der LP, jeder weitere Treffer derselben Gegnerphase 35 % schwächer.
  const magierSchutzWerte = { faction: "orden", rollen: ["magier", "heiler"], schild: 0.12, weitererTreffer: 0.65 };
  // Patch 2.6.19 (Henry, B9): Heiler und Magier der Menschen heilen höchstens zweimal je Kampf, die zweite Heilung wirkt zu 70 %.
  // Krieger und Schurken bekommen +2 Rüstung; Schurken weichen jedem 5., Krieger jedem 6. Angriff aus.
  const klassenBalance = { heilRollen: ["magier"], heilungen: 2, zweiteHeilung: 0.7, nahkampf: ["krieger", "schurke"],
    nahkampfRuestung: 2, ausweichen: { schurke: 5, krieger: 6 } };
  const heilDeckel = (state) => menschen(state) && klassenBalance.heilRollen.includes(state.role);
  const magierSchutz = (state) => state.party.length === 0 && state.faction === magierSchutzWerte.faction &&
    magierSchutzWerte.rollen.includes(state.role);
  // Waffen- und Rüstungsrechte der Klasse, Glut- und Runengegenstände je Fraktion.
  function ausruestungGrund(state, id) {
    const klasse = menschenKlasse(state);
    if (!klasse || !SY.daten.gegenstaende[id]) return null;
    return SY.ausruestungErlaubt(state.faction, klasse.id, id) ? null : "nicht für " + klasse.name;
  }
  const kaufWaren = Object.values(SY.daten.gegenstaende).filter((g) => g.source?.includes("KAUF") && g.baseBuyPrice);
  // Patch 2.6.6: Trankbeschreibungen in der Spielskala (÷ 3,5). Henrys vier Texte wörtlich, die übrigen nach demselben Muster.
  const trankTexte = { POT_HEILUNG_1: "POT_HEAL_1", POT_HEILUNG_2: "POT_HEAL_2", POT_HEILUNG_3: "POT_HEAL_3", POT_FOKUS_1: "POT_FOCUS_1" };
  function effektText(id) {
    const g = SY.daten.gegenstaende[id];
    if (!g?.effect) return null;
    const henry = V260.handelUi?.trade_tab_fixes?.potion_descriptions_3_5_scale?.[trankTexte[id]];
    if (henry) return henry;
    if (!/^POT_/.test(id)) return g.effect;
    const vorrat = world.supplies[id] ?? {};
    const text = g.effect.replace(/(\d+) LP/, (m, n) => (vorrat.heal ?? SY.skaliert(Number(n))) + " LP")
      .replace(/(\d+) Ausdauer/, (m, n) => (vorrat.ausdauer ?? SY.skaliert(Number(n))) + " Ausdauer")
      .replace(/(\d+) Mana/, (m, n) => (vorrat.mana ?? SY.skaliert(Number(n))) + " Mana");
    return (g.tier ? "Tier " + g.tier + " · " : "") + text;
  }
  function ausruester(state) {
    if (!imHub(state) || !menschen(state) || !SY.kontorAm(state.knoten)) return null;
    const rang = SY.rufRang(SY.ruf(state, SY.kontorAm(state.knoten)));
    return {
      kaufen: kaufWaren.map((g) => ({ id: g.id, name: g.name, tier: g.tier, effekt: effektText(g.id), preis: SY.gegenstandPreis(state, state.knoten, g.id, true),
        grund: ausruesterGrund(state, g.id, true), passt: !world.gear[g.id] || !ausruestungGrund(state, g.id) })),
      verkaufen: [...new Set(state.inventory.filter((id) => SY.daten.gegenstaende[id]?.baseSellPrice))].map((id) => ({ id, name: world.items[id],
        anzahl: state.inventory.filter((x) => x === id).length, preis: SY.gegenstandPreis(state, state.knoten, id, false),
        grund: ausruesterGrund(state, id, false) })),
      handel: rang.handel,
    };
  }
  function ausruesterGrund(state, id, kaufen) {
    if (!imHub(state) || !menschen(state)) return "nur in der Weltreise";
    const fraktion = SY.kontorAm(state.knoten);
    if (!fraktion) return "nur in Städten der Menschen";
    if (!SY.rufRang(SY.ruf(state, fraktion)).handel) return "geächtet: kein Handel";
    const preis = SY.gegenstandPreis(state, state.knoten, id, kaufen);
    if (!preis) return "nicht im Handel";
    // Patch 2.6.5: Tier 3 ab Befestigter Marktstadt (Stadtstufe 1), Tier 4 ab Bollwerksstadt (Stadtstufe 2).
    const stadtStufe = SY.daten.gegenstaende[id]?.stadtStufe;
    if (kaufen && stadtStufe && SY.siedlungsStufe(state, state.knoten) < stadtStufe) return "erst ab Stadtstufe " + stadtStufe;
    if (kaufen) return state.silver < preis ? "zu wenig Silber" : state.inventory.length >= itemCap - 20 ? "Rucksack voll" : null;
    return assigned(state, id) >= state.inventory.filter((x) => x === id).length ? "angelegt" : null;
  }
  function ausruesterHandel(previous, id, kaufen) {
    if (ausruesterGrund(previous, id, kaufen)) return previous;
    const state = structuredClone(previous);
    const preis = SY.gegenstandPreis(state, state.knoten, id, kaufen);
    state.silver += kaufen ? -preis : preis;
    if (kaufen) receive(state, [id]);
    else state.inventory.splice(state.inventory.indexOf(id), 1);
    note(state, world.items[id] + (kaufen ? " gekauft · −" : " verkauft · +") + preis + " Silber.");
    return state;
  }
  // Feldhandwerk: Rezepte je Klasse, Zutaten aus dem Rucksack.
  function handwerkListe(state) {
    const klasse = menschenKlasse(state);
    if (!klasse) return [];
    return SY.daten.handwerk.map((r) => ({ id: r.id, name: r.name, ergebnis: SY.daten.gegenstaende[r.outputItemId]?.name ?? r.outputItemId,
      anzahl: r.outputCount, zutaten: r.ingredients.map((i) => i.count + " × " + (world.items[i.id] ?? i.id)).join(", "),
      grund: handwerkGrund(state, r.id) }));
  }
  function handwerkGrund(state, rezeptId) {
    if (state.combat || !state.health) return "nicht im Kampf";
    const klasse = menschenKlasse(state);
    if (!klasse) return "nur für Helden der Menschen";
    return SY.handwerkGrund(state, rezeptId, klasse.id, (id) => state.inventory.filter((x) => x === id).length - assigned(state, id));
  }
  function handwerk(previous, rezeptId) {
    if (handwerkGrund(previous, rezeptId)) return previous;
    const state = structuredClone(previous);
    const r = SY.daten.handwerk.find((x) => x.id === rezeptId);
    for (const i of r.ingredients) for (let n = 0; n < i.count; n++) state.inventory.splice(state.inventory.indexOf(i.id), 1);
    if (r.outputItemId === "RES_NAHRUNG") state.ressource = Math.min(vorratMax, state.ressource + r.outputCount);
    else receive(state, Array(r.outputCount).fill(r.outputItemId));
    note(state, r.name + ": " + r.outputCount + " × " + (r.outputItemId === "RES_NAHRUNG" ? "Nahrung" : world.items[r.outputItemId]) + ".");
    nahrungErhalten(state);
    return state;
  }
  // Schmiede: Ausrüstung um eine Stufe aufwerten. Eisen und Runensplitter aus dem Kontor, Material aus dem Rucksack.
  // Patch 2.6.19 (B3, Orden): Runen der Schmiedepriester in einer Schmiede der Menschen einprägen (wirkt dauerhaft).
  function runenListe(state) {
    if (!imHub(state) || !menschen(state)) return [];
    return aktFolgen.filter((k) => k.effekt.schmiede_rezepte && hatMarke(state, k.effekt.flag)).flatMap((k) => k.effekt.schmiede_rezepte)
      .map((id) => ({ id, ...runen[id], preis: runenPreis, grund: runeGrund(state, id) }));
  }
  function runeGrund(state, id) {
    if (!runen[id] || !aktFolgen.some((k) => k.effekt.schmiede_rezepte?.includes(id) && hatMarke(state, k.effekt.flag))) return "nicht freigeschaltet";
    if ((state.runen ?? []).includes(id)) return "schon eingeprägt";
    const fraktion = imHub(state) && SY.kontorAm(state.knoten);
    if (!fraktion) return "nur in Städten der Menschen";
    if (!SY.schmiedeStufe(state, state.knoten)) return "keine Schmiede in dieser Stadt";
    if (state.silver < runenPreis.silber) return "zu wenig Silber";
    if (SY.kontor(state, fraktion).runensplitter < runenPreis.runensplitter) return "es fehlt Runensplitter im Kontor";
    return null;
  }
  function runeEinpraegen(previous, id) {
    if (runeGrund(previous, id)) return previous;
    const state = structuredClone(previous);
    state.silver -= runenPreis.silber;
    SY.kontor(state, SY.kontorAm(state.knoten)).runensplitter -= runenPreis.runensplitter;
    (state.runen ??= []).push(id);
    note(state, "Die Schmiedepriester prägen „" + runen[id].name + "“ ein (" + runen[id].text + ") · −" + runenPreis.silber + " Silber, −" +
      runenPreis.runensplitter + " Runensplitter.");
    return state;
  }
  function schmiedeInfo(state) {
    if (!imHub(state) || !menschen(state) || !SY.kontorAm(state.knoten)) return null;
    const stufe = SY.schmiedeStufe(state, state.knoten);
    const teile = [...new Set(state.inventory.filter((id) => world.gear[id]?.slot))];
    return { stufe, teile: teile.map((id) => {
      const ziel = (state.aufwertung?.[id] ?? 0) + 1;
      const kosten = SY.aufwertKosten(state, state.knoten, ziel);
      return { id, name: world.items[id], stufe: ziel - 1, ziel, kosten: kosten && { silber: kosten.silber,
        material: kosten.material.map((m) => m.count + " × " + (m.id.startsWith("RES_") ? SY.daten.rohstoffe[m.id.slice(4).toLowerCase()].name : world.items[m.id])).join(", "),
        bonus: kosten.bonus }, grund: schmiedeGrund(state, id) };
    }) };
  }
  function schmiedeGrund(state, id) {
    if (!imHub(state) || !menschen(state)) return "nur in der Weltreise";
    const fraktion = SY.kontorAm(state.knoten);
    if (!fraktion) return "nur in Städten der Menschen";
    if (!world.gear[id]?.slot || !state.inventory.includes(id)) return "keine Ausrüstung";
    const ziel = (state.aufwertung?.[id] ?? 0) + 1;
    if (ziel > 4) return "höchste Stufe";
    const stufe = SY.schmiedeStufe(state, state.knoten);
    if (!stufe) return "keine Schmiede in dieser Stadt";
    if (ziel > stufe) return "+" + ziel + " braucht eine " + ["", "", "Stadtschmiede", "Meisterschmiede", "Runenschmiede"][ziel];
    const k = SY.aufwertKosten(state, state.knoten, ziel);
    if (state.silver < k.silber) return "zu wenig Silber";
    for (const m of k.material) {
      const vorrat = m.id.startsWith("RES_") ? SY.kontor(state, fraktion)[m.id.slice(4).toLowerCase()] : state.inventory.filter((x) => x === m.id).length;
      if (vorrat < m.count) return "es fehlt " + (m.id.startsWith("RES_") ? SY.daten.rohstoffe[m.id.slice(4).toLowerCase()].name : world.items[m.id]);
    }
    return null;
  }
  function schmieden(previous, id) {
    if (schmiedeGrund(previous, id)) return previous;
    const state = structuredClone(previous);
    const fraktion = SY.kontorAm(state.knoten);
    const ziel = (state.aufwertung?.[id] ?? 0) + 1;
    const k = SY.aufwertKosten(state, state.knoten, ziel);
    state.silver -= k.silber;
    for (const m of k.material) {
      if (m.id.startsWith("RES_")) SY.kontor(state, fraktion)[m.id.slice(4).toLowerCase()] -= m.count;
      else for (let n = 0; n < m.count; n++) state.inventory.splice(state.inventory.indexOf(m.id), 1);
    }
    (state.aufwertung ??= {})[id] = ziel;
    note(state, world.items[id] + " ist jetzt +" + ziel + " (" + SY.daten.schmiede.stufen[ziel - 1].label.replace(/^\+\d+ /, "") + ", +" + k.bonus + " %) · −" + k.silber + " Silber.");
    return state;
  }

  // Wegaufträge: Wer über den Weg reist, trifft auf die Gegner. Ein Auftrag je Reise, vor der Zufallsbegegnung.
  function wegAuftrag(state, von, zu) {
    const kennung = wegKennung(von, zu);
    if (!kennung) return null;
    return Object.entries(state.weltAuftraege ?? {}).find(([id, eintrag]) => eintrag.status === "aktiv" &&
      auftragIndex[id].spiel.weg === kennung)?.[0] ?? null;
  }
  // Erledigte Aufträge mit Wegrabatt senken die Reisekosten dieses Weges um 1 Vorrat.
  function wegKosten(state, von, weg) {
    const kennung = wegKennung(von, weg.zielId);
    const rabatt = kennung && Object.keys(state.weltAuftraege ?? {}).some(id => state.weltAuftraege[id].status === "erledigt" &&
      auftragsLohn(state, id).wegRabatt === kennung);
    return Math.max(0, weg.kostenRessource - (rabatt ? 1 : 0));
  }

  function aushang(state) {
    if (state.scene !== "weltknoten" || !NQ) return [];
    const extra = state.knoten === schattenImRat.ort && hatMarke(state, "ragnvald_misstraut_hof") ? [schattenImRat] : [];
    return [...(NQ.fuerOrt(state.knoten)?.auftraege ?? []), ...extra].map(auftrag => ({ ...auftragIndex[auftrag.id],
      status: state.weltAuftraege?.[auftrag.id]?.status ?? null, wahl: state.weltAuftraege?.[auftrag.id]?.wahl ?? null,
      grund: auftragGrund(state, auftrag.id), ausfuehren: ausfuehrenGrund(state, auftrag.id),
      begleiter: begleiterNachAuftrag[auftrag.id] ?? null }));
  }
  function auftraege(state, status = "aktiv") {
    return Object.entries(state.weltAuftraege ?? {}).filter(([, eintrag]) => eintrag.status === status)
      .map(([id, eintrag]) => ({ ...auftragIndex[id], wahl: eintrag.wahl, status, ausfuehren: ausfuehrenGrund(state, id),
        abgabe: status === rueckkehr.status ? abgabeGrund(state, id) : null }));
  }

  function hauptquest(state) {
    if (!hauptPlan[state.faction] || !hauptAkt(state.faction)) return null;
    const stand = hauptStand(state);
    const akt = hauptAkt(state.faction);
    const fertig = stand.schritt >= hauptPlan[state.faction].length;
    return { akt: akt.nr, titel: akt.titel, stufen: akt.stufen, fertig, wahl: stand.wahl,
      schritt: fertig ? null : hauptInfo(state.faction, stand.schritt), grund: fertig ? "abgeschlossen" : hauptGrund(state),
      bericht: stand.bericht ? { ort: stand.bericht.ort, ortName: N.get(stand.bericht.ort).name } : null,
      zielOrt: fertig ? null : hauptZielOrt(state) };
  }

  function hauptGrund(state, wahlId = null) {
    const plan = hauptPlan[state.faction];
    if (!plan || !hauptAkt(state.faction)) return "keine Hauptquest";
    if (!imHub(state)) return "nur in der Weltreise";
    const stand = hauptStand(state);
    if (stand.schritt >= plan.length) return "abgeschlossen";
    if (stand.bericht) {
      if (state.knoten !== stand.bericht.ort) return "Bericht in " + N.get(stand.bericht.ort).name + " erstatten";
      return wahlId ? "keine Wahl" : null;
    }
    const schritt = plan[stand.schritt];
    if (state.knoten !== schritt.ort) return "weiter in " + N.get(schritt.ort).name;
    if (!schritt.wahl) return wahlId ? "keine Wahl" : null;
    if (!hauptAkt(state.faction).wahl.some(option => option.id === wahlId) || !own(wahlFolgen, wahlId)) return "Wahl fehlt";
    if (wahlFolgen[wahlId].silber && state.silver < wahlFolgen[wahlId].silber) return "zu wenig Silber";
    return null;
  }

  function hauptWeiter(previous, wahlId = null) {
    if (hauptGrund(previous, wahlId)) return previous;
    const state = structuredClone(previous);
    const stand = state.hauptquest ??= { schritt: 0, wahl: null };
    const info = hauptInfo(state.faction, stand.schritt);
    if (stand.bericht) {
      note(state, "Bericht erstattet in " + N.get(stand.bericht.ort).name + " · " + info.titel + ".");
      delete stand.bericht;
      hauptVoran(state);
      return state;
    }
    note(state, "Akt " + hauptAkt(state.faction).nr + " · " + info.titel + ": " + info.text);
    if (info.gegner) {
      auftragKampfStarten(state, info.gegner, "haupt", info.ort, info.titel);
      return state;
    }
    if (info.wahl) {
      stand.wahl = wahlId;
      if (wahlFolgen[wahlId].gegner) auftragKampfStarten(state, wahlFolgen[wahlId].gegner, "haupt", info.ort, info.titel);
      else aktAbschliessen(state);
      return state;
    }
    hauptVoran(state);
    return state;
  }

  function hauptVoran(state) {
    const stand = state.hauptquest;
    stand.schritt++;
    const next = hauptInfo(state.faction, stand.schritt);
    if (next) note(state, "Nächster Schritt: " + next.titel + " in " + N.get(next.ort).name + ".");
  }

  function aktAbschliessen(state) {
    const stand = state.hauptquest;
    const folge = wahlFolgen[stand.wahl];
    const option = hauptAkt(state.faction).wahl.find(entry => entry.id === stand.wahl);
    if (folge.silber) state.silver -= folge.silber;
    if (folge.silberLohn) state.silver += folge.silberLohn;
    if (folge.vorrat) state.ressource = Math.min(vorratMax, state.ressource + folge.vorrat);
    for (const [leisteId, wert] of Object.entries(folge.leisten ?? {})) setzeLeiste(state, leisteId, leiste(state, leisteId) + wert);
    for (const [fraktion, wert] of Object.entries(folge.ruf ?? {})) SY.rufAendern(state, fraktion, wert);
    if (folge.moral) state.moral = Math.min(SY.daten.moral.max, (state.moral ?? SY.daten.moral.start) + folge.moral);
    note(state, option.label + ": " + option.folge);
    if (!state.marks.includes(stand.wahl)) state.marks.push(stand.wahl);
    stand.schritt = hauptPlan[state.faction].length;
    state.questStufe = Math.max(state.questStufe, 1);
    note(state, "Akt " + hauptAkt(state.faction).nr + ", „" + hauptAkt(state.faction).titel + "“, ist abgeschlossen. Ab Stufe " +
      V260.rahmen.unlock_conditions.min_hero_level + " öffnen die Schwester-Zweige (Akt 2 und 3).");
    grant(state, "akt1-" + state.faction, kampf.ep.questakt);
  }

  // ---- Akt 2 bis 4 und Armada (Henry, Spezifikation 2.6.0/2.6.1, 19. 11. 2026) ----
  // Nach Akt 1 und ab Stufe 5 wählt der Held frei einen der zwei Schwester-Zweige der anderen Menschen-Fraktionen (Akt 2,
  // Stufe 6–10), danach den zweiten (Akt 3, 11–15). Jeder Zweig hat drei Stufen in der Hauptstadt des Gastgebers: Stufe 1
  // mit Wahl (gut, Söldner, böse) und Kampf, Stufe 2 mit Kampf und Rohstoffen fürs Kontor, Stufe 3 mit dem Boss des Zweigs.
  // Geächtete (Ruf ≤ −25 beim Gastgeber) kommen für 150 Silber als Söldner hinein. Nach beiden Zweigen wählt der Held eine
  // der zwei Fraktions-Spezialisierungen der besuchten Fraktionen (Henry: Rückfrage 1 und 2). Akt 4 (16–22): Das Alte Reich,
  // Die Maske des Bleichen Skalden, Das Große Thing. Das Thing öffnet die Armada-Kriegskasse, die volle Kasse das Tor zu Akt 5.
  const V260 = {
    rahmen: SY.daten.v260.ASCHENKRONE_ACT2_ACT3_FRAMEWORK,
    zweige: SY.daten.v260.ASCHENKRONE_ACT2_ACT3_BRANCH_DATA.sister_branches,
    akt4: SY.daten.v260.ASCHENKRONE_ACT4_MAIN_STORY,
    armada: SY.daten.v260.ASCHENKRONE_ARMADA_AND_ACT5_GATE,
    handelUi: SY.daten.v260.ASCHENKRONE_UI_MASTER_V2616_PART_3,
    lager: SY.daten.v260.ASCHENKRONE_V268_CAMP_COMPANION_DIALOGUES,
  };
  const zweigFraktion = { KRONREICH: "kronreich", ORDEN_DER_FLAMME: "orden", FREIE_HAEFEN: "haefen" };
  // Patch 2.6.18 (Henry, Zielwert 55–75 % Rest-LP): Gegner der Akte 2–4 ab Stufe 6 mit 118 % LP und 112 % Schaden.
  // Zweig-Bosse statt dessen 125 % LP und Schaden höchstens aufgerundet Heldenstufe × 1,15. Thorvald hat feste Werte.
  const aktSkalierung = { abStufe: 6, lp: 1.18, schaden: 1.12, bossLp: 1.25, bossDeckel: 1.15 };
  function aktGegnerSkalieren(state, boss) {
    const heldStufe = level(state);
    for (const [index, foe] of state.combat.feinde.entries()) {
      if (foe.stufe < aktSkalierung.abStufe) continue;
      const istBoss = boss && index === 0;
      foe.lp = foe.max = Math.max(1, Math.round(foe.lp * (istBoss ? aktSkalierung.bossLp : aktSkalierung.lp)));
      foe.schaden = Math.max(1, Math.round(foe.schaden * aktSkalierung.schaden));
      if (istBoss) foe.schaden = Math.min(foe.schaden, Math.ceil(heldStufe * aktSkalierung.bossDeckel));
    }
  }
  const zweigHub = { kronreich: "kronhall", orden: "glutberg", haefen: "perlvik" };
  // Patch 2.6.19 (Henry, B3): Die Wahl am Ende von Akt 1 wirkt in Akt 2 bzw. 3 nach. Sie greift, sobald der erste (Akt 2)
  // bzw. zweite (Akt 3) Schwester-Zweig beginnt, und setzt eine Marke (flag). Henrys Wahl-Kennungen → Kennungen im Spiel.
  const wahlKennung = { kronreich_wahl_a_strenge: "kron_act1_fight", kronreich_wahl_b_gnade: "kron_act1_truce",
    orden_wahl_a_bewahrung: "orden_act1_mercy", orden_wahl_b_reinigung: "orden_act1_wrath",
    haefen_wahl_a_gilde: "haefen_act1_guild", haefen_wahl_b_schmuggler: "haefen_act1_shadow" };
  const aktFolgen = SY.daten.v2619.B3_akt1_wahlfolgen.fraktions_konsequenzen.map((k) => ({ ...k, wahl: wahlKennung[k.wahl_id] }));
  const hatMarke = (state, marke) => (state.marks ?? []).includes(marke);
  // Runen der Schmiedepriester (Orden): Henry nennt nur die Namen, Wirkung und Preis sind Claudes Vorschlag.
  const runen = {
    rune_des_lichtwalls: { name: "Rune des Lichtwalls", text: "+1 Rüstung", ruestung: 1 },
    "rune_der_mildtätigen_glut": { name: "Rune der mildtätigen Glut", text: "+10 % Heilung", heilung: 0.1 },
    rune_des_aschenzorns: { name: "Rune des Aschenzorns", text: "+10 % Schaden gegen Untote und Ascheriss", untot: 0.1 },
    rune_der_brennenden_schneide: { name: "Rune der brennenden Schneide", text: "+5 % Schaden", schaden: 0.05 },
  };
  const runenPreis = { silber: 60, runensplitter: 1 };
  const runenWert = (state, key) => (state.runen ?? []).reduce((s, id) => s + (runen[id]?.[key] ?? 0), 0);
  const kultistWerte = { name: "Aschenkultist-Infiltrator", rang: "elite" };
  function aktFolgenAnwenden(state, akt) {
    const neu = [];
    for (const k of aktFolgen) {
      if (k.akt_trigger > akt || !hatMarke(state, k.wahl) || hatMarke(state, k.effekt.flag)) continue;
      state.marks.push(k.effekt.flag);
      note(state, k.effekt.text);
      if (k.effekt.schmiede_rezepte) note(state, "In jeder Stadtschmiede der Menschen kannst du jetzt " +
        k.effekt.schmiede_rezepte.map((id) => "„" + runen[id].name + "“ (" + runen[id].text + ")").join(" und ") + " einprägen lassen.");
      if (k.effekt.freischaltung_nebenquest) note(state, "Neuer Aushang in " + N.get(schattenImRat.ort).name + ": „" + schattenImRat.titel + "“.");
      neu.push(k.effekt);
    }
    return neu;
  }
  // Nebenquest „Schatten im Rat“ (Henry nennt nur die Kennung; Text, Gegner und Lohn sind Claudes Vorschlag).
  const schattenImRat = { id: "nq_kronreich_schatten_im_rat", titel: "Schatten im Rat", art: "Fraktion (Folge aus Akt 1)", ort: "hagenfels",
    fraktion: "kronreich", text: "Jarl Ragnvald traut dem Hof nicht mehr. Ein Schreiber aus Kronhall schickt nachts Boten über die Westmark. " +
      "Fang sie ab und finde heraus, wer im Kronrat die Briefe diktiert.", lohn: "70 Silber, Spur zum Kronrat",
    spiel: { gegner: "spione", lohn: [{ silber: 70, vorrat: 0, leisten: {}, gegenstaende: [], vermerke: ["Spur zum Kronrat"] }] } };
  auftragIndex[schattenImRat.id] = schattenImRat;
  const zweigGegner = { kronreich: ["deserteure", "wegelagerer", "feldherr"], orden: ["kultisten", "kultisten", "zelot"],
    haefen: ["orkpiraten", "schmuggler", "kaperkapitaen"] };
  // EP je Stufe des Zweigs (Vorschlag, damit der erste Zweig von 6 auf etwa 10 und der zweite auf etwa 15 führt).
  const zweigEp = { 2: [500, 600, 900], 3: [800, 900, 1400] };
  const zweigSilber = { 2: 60, 3: 100 };
  const rohstoffKey = { RES_NAHRUNG: "nahrung", RES_HOLZ: "holz", RES_EISEN: "eisen", RES_STEIN: "stein", RES_RUNENSPLITTER: "runensplitter" };
  const zweigDaten = (fraktion) => V260.zweige.find((z) => zweigFraktion[z.faction_id] === fraktion);
  const akteStand = (state) => state.akte ?? { zweige: {}, fspez: null, akt4: { schritt: 0, siegel: [], wahlOffen: false, wahl: null } };
  const zweigeFertig = (state) => Object.values(akteStand(state).zweige).filter((z) => z.stufe >= 3).length;
  const akt1Fertig = (state) => Boolean(hauptPlan[state.faction] && hauptStand(state).schritt >= hauptPlan[state.faction].length);
  const geaechtetBei = (state, fraktion) => SY.ruf(state, fraktion) <= V260.rahmen.outlaw_run_compatibility.allow_mercenary_bypass_if_reputation_below - 1;
  function zweigStufen(akt) {
    const r = V260.rahmen.branch_selection_rules[akt === 2 ? "first_chosen_branch_act" : "second_chosen_branch_act"].target_level_range;
    return [r.min, r.max];
  }
  const klemme = (wert, [min, max]) => Math.max(min, Math.min(max, wert));
  function akteGrund(state) {
    if (!menschen(state) || !hauptPlan[state.faction]) return "nur für die Menschen";
    if (!akt1Fertig(state)) return "erst Akt 1 abschließen";
    if (level(state) < V260.rahmen.unlock_conditions.min_hero_level) return "ab Stufe " + V260.rahmen.unlock_conditions.min_hero_level;
    return null;
  }
  function zweigGrund(state, fraktion, wahl = null) {
    const grund = akteGrund(state);
    if (grund) return grund;
    if (!imHub(state)) return "nur in der Weltreise";
    if (fraktion === state.faction || !zweigDaten(fraktion)) return "kein Schwester-Zweig";
    const stand = akteStand(state);
    const zweig = stand.zweige[fraktion];
    if (zweig?.stufe >= 3) return "abgeschlossen";
    const anderer = Object.entries(stand.zweige).find(([id, z]) => id !== fraktion && z.stufe > 0 && z.stufe < 3);
    if (anderer) return "erst den Zweig „" + zweigDaten(anderer[0]).title + "“ beenden";
    if (state.knoten !== zweigHub[fraktion]) return "weiter in " + N.get(zweigHub[fraktion]).name;
    const stufe = zweig?.stufe ?? 0;
    if (stufe === 0) {
      if (!["good", "mercenary", "evil"].includes(wahl)) return "Weg wählen";
      if (geaechtetBei(state, fraktion) && !zweig?.soeldner && state.silver < V260.rahmen.outlaw_run_compatibility.mercenary_entry_silver_cost) {
        return "geächtet: " + V260.rahmen.outlaw_run_compatibility.mercenary_entry_silver_cost + " Silber Söldnergeld nötig";
      }
    }
    return null;
  }
  function zweigInfo(state, fraktion) {
    const daten = zweigDaten(fraktion);
    const zweig = akteStand(state).zweige[fraktion] ?? { stufe: 0 };
    const akt = zweig.akt ?? zweigeFertig(state) + 2;
    const stufe = daten.stages[Math.min(2, zweig.stufe)];
    return { fraktion, id: daten.branch_id, titel: daten.title, hub: zweigHub[fraktion], text: daten.summary, akt: Math.min(3, akt),
      stufen: zweigStufen(Math.min(3, akt)).join("-"), fortschritt: zweig.stufe, fertig: zweig.stufe >= 3, wahl: zweig.wahl ?? null,
      soeldner: Boolean(zweig.soeldner), geaechtet: geaechtetBei(state, fraktion),
      schritt: zweig.stufe >= 3 ? null : { nr: zweig.stufe + 1, id: stufe.stage_id, titel: stufe.title, text: stufe.objective,
        wahlen: stufe.three_way_options ? Object.entries(stufe.three_way_options).map(([id, o]) => ({ id, label: zweigWahlLabel[id], folge: zweigWahlText(o) })) : [],
        boss: Boolean(stufe.boss_template), rohstoffe: stufe.reward_resources ?? null },
      spez: daten.faction_specialization_unlock, grund: zweigGrund(state, fraktion, zweig.stufe === 0 ? "good" : null),
      zielOrt: zweig.stufe >= 3 ? null : zweigHub[fraktion] };
  }
  const zweigWahlLabel = { good: "Gute Tat: Dörfer und Wege schützen", mercenary: "Söldnerweg: gegen Silber", evil: "Schlechte Tat: plündern und erpressen" };
  const zweigWahlText = (o) => [o.reputation_delta ? "Ruf " + (o.reputation_delta > 0 ? "+" : "") + o.reputation_delta : "",
    o.silver_bonus_pct ? "+" + o.silver_bonus_pct + " % Silber" : "", o.bonus_resources ? "+" + o.bonus_resources + " Rohstoffe" : "",
    o.unlocks_protectorate ? "Schutzbund" : ""].filter(Boolean).join(", ");
  function akteInfo(state) {
    if (!menschen(state) || !hauptPlan[state.faction]) return null;
    const stand = akteStand(state);
    const zweige = Object.values(zweigFraktion).filter((f) => f !== state.faction).map((f) => zweigInfo(state, f));
    const fspezOffen = zweigeFertig(state) >= 2 && !stand.fspez;
    return { grund: akteGrund(state), zweige, fspez: stand.fspez, fspezOffen,
      fspezOptionen: zweige.map((z) => z.spez), akt4: akt4Info(state), armada: armadaInfo(state) };
  }
  function zweigWeiter(previous, fraktion, wahl = null) {
    const stufe = akteStand(previous).zweige[fraktion]?.stufe ?? 0;
    if (zweigGrund(previous, fraktion, stufe === 0 ? wahl : null)) return previous;
    const state = structuredClone(previous);
    state.akte = akteStand(state);
    const zweig = state.akte.zweige[fraktion] ??= { stufe: 0, akt: zweigeFertig(state) + 2, wahl: null, soeldner: false };
    const daten = zweigDaten(fraktion);
    const schritt = daten.stages[zweig.stufe];
    if (zweig.stufe === 0) {
      zweig.wahl = wahl;
      if (geaechtetBei(state, fraktion) && !zweig.soeldner) {
        state.silver -= V260.rahmen.outlaw_run_compatibility.mercenary_entry_silver_cost;
        zweig.soeldner = true;
        note(state, "Als Geächteter kaufst du dich für " + V260.rahmen.outlaw_run_compatibility.mercenary_entry_silver_cost +
          " Silber als Söldner in den Zweig ein.");
      }
      note(state, "Akt " + zweig.akt + " · „" + daten.title + "“ beginnt. " + daten.summary);
    }
    const folgen = zweig.stufe === 0 ? aktFolgenAnwenden(state, zweig.akt) : [];
    note(state, "Stufe " + (zweig.stufe + 1) + " · " + schritt.title + ": " + schritt.objective);
    if (schritt.boss_template && schritt.thorvald_cameo_allowed) {
      note(state, "Am Rand der Menge steht ein hagerer Pilger in grauer Kutte. Er beobachtet dich und ist verschwunden, bevor du ihn ansprechen kannst.");
    }
    const typ = zweigGegner[fraktion][zweig.stufe];
    const stufeGegner = klemme(level(state), zweigStufen(zweig.akt));
    note(state, schritt.title + ": " + world.fights[auftragKampf(typ)].name + " stellen sich dir · Stufe " + stufeGegner + ".");
    startFight(state, auftragKampf(typ), true, stufeGegner);
    if (state.combat) Object.assign(state.combat, { weiter: "weltknoten", auftrag: "zweig:" + fraktion, gegnerStufe: stufeGegner });
    // Patch 2.6.19 (B3, Kronreich-Gnade): Der unentdeckte Kultist greift im ersten Kampf von Akt 3 als Elite mit an.
    const kultist = folgen.find((e) => e.zusatz_gegner_id);
    if (state.combat && kultist) {
      const w = kampf.gegnerWerte(kultistWerte.rang, stufeGegner, 1);
      const foe = { name: kultistWerte.name, rang: kultistWerte.rang, stufe: stufeGegner, lp: w.lp, max: w.lp, schaden: w.schaden,
        aktionen: w.aktionen, geschick: state.combat.feinde[0].geschick, tags: ["kult"], status: {} };
      if (state.combat.feinde.length >= gruppenSkalierung.hoechstens) state.combat.feinde[state.combat.feinde.length - 1] = foe;
      else state.combat.feinde.push(foe);
      state.combat.kultistBeute = kultist.bonus_beute_runensplitter;
    }
    if (state.combat) aktGegnerSkalieren(state, ["feldherr", "zelot", "kaperkapitaen"].includes(typ));
    else if (!state.health) arrive(state, "defeat");
    return state;
  }
  function kontorGeben(state, rohstoffe) {
    const k = SY.kontor(state, state.faction);
    for (const [id, n] of Object.entries(rohstoffe)) if (rohstoffKey[id]) k[rohstoffKey[id]] += n;
    return Object.entries(rohstoffe).map(([id, n]) => n + " " + (SY.daten.rohstoffe[rohstoffKey[id]]?.name ?? id)).join(", ");
  }
  function aktSieg(state, auftrag, turn = state.combat) {
    const [art, fraktion] = auftrag.split(":");
    if (turn?.kultistBeute) note(state, "Der Kultist trug Ascheriss-Splitter bei sich: " +
      kontorGeben(state, { RES_RUNENSPLITTER: turn.kultistBeute }) + " ins Kontor.");
    if (art === "akt4") return akt4Sieg(state);
    const zweig = state.akte.zweige[fraktion];
    const daten = zweigDaten(fraktion);
    const schritt = daten.stages[zweig.stufe];
    const ep = zweigEp[zweig.akt][zweig.stufe];
    if (zweig.stufe === 0) {
      const o = schritt.three_way_options[zweig.wahl];
      const silber = Math.round(zweigSilber[zweig.akt] * (1 + (o.silver_bonus_pct ?? 0) / 100));
      SY.rufAendern(state, fraktion, o.reputation_delta);
      state.silver += silber;
      let text = zweigWahlLabel[zweig.wahl] + ": Ruf bei " + K.fraktionen[fraktion].name + " " + (o.reputation_delta > 0 ? "+" : "") +
        o.reputation_delta + ", +" + silber + " Silber";
      if (o.bonus_resources) text += ", +" + kontorGeben(state, { RES_EISEN: o.bonus_resources }) + " ins Kontor";
      if (o.unlocks_protectorate && !state.marks.includes("schutzbund-" + fraktion)) {
        state.marks.push("schutzbund-" + fraktion);
        text += ". " + K.fraktionen[fraktion].name + " nimmt dich in den Schutzbund auf";
      }
      SY.moralAendern(state, zweig.wahl === "good" ? "gut" : zweig.wahl === "evil" ? "boese" : "keins");
      note(state, text + ".");
    } else if (schritt.reward_resources) {
      note(state, schritt.title + " geschafft: " + kontorGeben(state, schritt.reward_resources) + " ins Kontor.");
    }
    grant(state, "zweig-" + fraktion + "-" + zweig.stufe, ep);
    zweig.stufe++;
    if (zweig.stufe < 3) {
      note(state, "Nächste Stufe des Zweigs: " + daten.stages[zweig.stufe].title + " in " + N.get(zweigHub[fraktion]).name + ".");
      return;
    }
    const upgrade = V260.rahmen.branch_selection_rules[zweig.akt === 2 ? "first_chosen_branch_act" : "second_chosen_branch_act"].city_upgrade_unlock;
    state.questStufe = Math.max(state.questStufe, zweig.akt);
    note(state, "Akt " + zweig.akt + ", „" + daten.title + "“, ist abgeschlossen. Städte können jetzt bis Stufe " + upgrade.target_tier +
      " ausgebaut werden (ab Ruf " + upgrade.required_reputation + ").");
    if (zweigeFertig(state) >= 2) {
      note(state, "Beide Schwester-Zweige sind abgeschlossen. Wähle deine Fraktions-Spezialisierung; danach beginnt Akt 4, „" +
        V260.akt4.act4_questline[0].title + "“.");
      if (!state.marks.includes("lager-schwesterreiche")) state.lagerMeilenstein = "CAMP_MILESTONE_SISTER_REALMS";
    }
  }
  function fspezGrund(state, id) {
    const stand = akteStand(state);
    if (stand.fspez) return "schon gewählt";
    if (zweigeFertig(state) < 2) return "erst beide Schwester-Zweige abschließen";
    const erlaubt = Object.keys(stand.zweige).map((f) => zweigDaten(f).faction_specialization_unlock.spec_id);
    return erlaubt.includes(id) ? null : "nicht freigeschaltet";
  }
  function fspezWaehlen(previous, id) {
    if (fspezGrund(previous, id)) return previous;
    const state = structuredClone(previous);
    state.akte.fspez = id;
    const spez = V260.zweige.map((z) => z.faction_specialization_unlock).find((x) => x.spec_id === id);
    note(state, "Fraktions-Spezialisierung „" + spez.name + "“ gewählt. Sie wirkt zusätzlich zur Spezialisierung der Klasse.");
    return state;
  }
  const fspezText = {
    FSPEC_SCHILDWALL_DER_KRONE: "+2 Rüstung, −20 % Moralverlust der Gruppe",
    FSPEC_EID_DER_EWIGEN_GLUT: "+15 % Schaden gegen Untote und Ascheriss, +10 % Heilung und Manaregeneration",
    FSPEC_MEISTER_DER_STURMFLUT: "−50 % Kosten auf Seewegen, Ausweich-Intervall −1",
  };

  // Akt 4: Schritt 0 Reichssiegel in Kronhall, Glutberg und Perlvik, danach Hinterhalt; Schritt 1 Thorvald in Glutberg, danach
  // Urteil; Schritt 2 das Große Thing in Kronhall; Schritt 3 fertig.
  const akt4Orte = { siegel: ["kronhall", "glutberg", "perlvik"], thorvald: "glutberg", thing: "kronhall" };
  const akt4Stufen = () => [V260.akt4.unlock_conditions.recommended_level_range.min, V260.akt4.unlock_conditions.recommended_level_range.max];
  const akt4Wahlen = () => V260.akt4.act4_questline[1].three_way_resolution;
  function akt4Grund(state, wahl = null) {
    const grund = akteGrund(state);
    if (grund) return grund;
    const stand = akteStand(state);
    if (zweigeFertig(state) < 2) return "erst beide Schwester-Zweige abschließen";
    if (!stand.fspez) return "erst die Fraktions-Spezialisierung wählen";
    if (!imHub(state)) return "nur in der Weltreise";
    const a = stand.akt4;
    if (a.schritt >= 3) return "abgeschlossen";
    if (a.schritt === 0) {
      if (a.siegel.length < 3) return akt4Orte.siegel.includes(state.knoten) && !a.siegel.includes(state.knoten) ? null
        : "Siegel in " + akt4Orte.siegel.filter((o) => !a.siegel.includes(o)).map((o) => N.get(o).name).join(", ");
      return SY.kontorAm(state.knoten) ? null : "in einer Stadt der Menschen";
    }
    if (a.schritt === 1) {
      if (state.knoten !== akt4Orte.thorvald) return "weiter in " + N.get(akt4Orte.thorvald).name;
      if (a.wahlOffen) return own(akt4Wahlen(), wahl) ? null : "Urteil wählen";
      return null;
    }
    return state.knoten === akt4Orte.thing ? null : "weiter in " + N.get(akt4Orte.thing).name;
  }
  function akt4Info(state) {
    const stand = akteStand(state);
    const a = stand.akt4;
    const q = V260.akt4.act4_questline[Math.min(2, a.schritt)];
    const outlaw = geaechtetBei(state, state.faction);
    return { offen: zweigeFertig(state) >= 2 && Boolean(stand.fspez), stufen: akt4Stufen().join("-"), schritt: a.schritt, fertig: a.schritt >= 3,
      siegel: a.siegel, wahlOffen: a.wahlOffen, wahl: a.wahl, titel: q.title, text: q.summary, ziele: q.objectives ?? [],
      wahlen: a.schritt === 1 && a.wahlOffen ? Object.entries(akt4Wahlen()).map(([id, w]) => ({ id, label: w.label, folge: akt4WahlText(w) })) : [],
      thingLabel: a.schritt === 2 ? (outlaw ? q.outlaw_compatibility.alternate_path_label : "Vor das Große Thing treten") : null,
      grund: akt4Grund(state, a.wahlOffen ? Object.keys(akt4Wahlen())[0] : null), zielOrt: akt4ZielOrt(state) };
  }
  const akt4WahlText = (w) => ["Ruf aller Menschen " + (w.reputation_delta_all_human_factions > 0 ? "+" : "") + w.reputation_delta_all_human_factions,
    w.silver_bonus ? "+" + w.silver_bonus + " Silber" : "", w.bonus_resources ? "+" + w.bonus_resources.RES_RUNENSPLITTER + " Runensplitter" : "",
    "Untoten-Bedrohung " + w.undead_threat_delta].filter(Boolean).join(", ");
  function akt4Kampf(state, typ, stufe, titel) {
    note(state, titel + ": " + world.fights[auftragKampf(typ)].name + " stellen sich dir · Stufe " + stufe + ".");
    startFight(state, auftragKampf(typ), true, stufe);
    if (state.combat) Object.assign(state.combat, { weiter: "weltknoten", auftrag: "akt4:" + state.akte.akt4.schritt, gegnerStufe: stufe });
    if (state.combat && state.combat.id !== "auftrag-thorvald") aktGegnerSkalieren(state, false);
    else if (!state.health) arrive(state, "defeat");
  }
  function akt4Weiter(previous, wahl = null) {
    if (akt4Grund(previous, wahl)) return previous;
    const state = structuredClone(previous);
    const a = state.akte.akt4;
    const quests = V260.akt4.act4_questline;
    const stufe = klemme(level(state), akt4Stufen());
    if (a.schritt === 0 && a.siegel.length < 3) {
      if (!a.siegel.length) note(state, "Akt 4 · „" + quests[0].title + "“: " + quests[0].summary);
      a.siegel.push(state.knoten);
      note(state, "Reichssiegel von " + N.get(state.knoten).name + " geborgen (" + a.siegel.length + " von 3).");
      return state;
    }
    if (a.schritt === 0) {
      akt4Kampf(state, "aschenschatten", stufe, "Hinterhalt auf der Reichsstraße");
      return state;
    }
    if (a.schritt === 1 && !a.wahlOffen) {
      note(state, "Akt 4 · „" + quests[1].title + "“: " + quests[1].summary);
      akt4Kampf(state, "thorvald", bossWerte["auftrag-thorvald"].stufe(level(state)), "Die Maske fällt");
      return state;
    }
    if (a.schritt === 1) {
      const w = akt4Wahlen()[wahl];
      a.wahl = wahl;
      a.wahlOffen = false;
      for (const f of Object.values(zweigFraktion)) SY.rufAendern(state, f, w.reputation_delta_all_human_factions);
      if (w.silver_bonus) state.silver += w.silver_bonus;
      if (w.bonus_resources) kontorGeben(state, w.bonus_resources);
      setzeLeiste(state, "untote", leiste(state, "untote") + w.undead_threat_delta);
      if (!state.marks.includes("thorvald-entlarvt")) state.marks.push("thorvald-entlarvt");
      note(state, w.label + ": " + akt4WahlText(w) + ".");
      a.schritt = 2;
      note(state, "Nächster Schritt: „" + quests[2].title + "“ in " + N.get(akt4Orte.thing).name + ".");
      return state;
    }
    // Das Große Thing
    const q = quests[2];
    note(state, "Akt 4 · „" + q.title + "“: " + q.summary);
    if (geaechtetBei(state, state.faction)) note(state, q.outlaw_compatibility.alternate_path_label + ".");
    if (!state.marks.includes("bannerjarl")) state.marks.push("bannerjarl");
    if (!state.marks.includes("grosses-thing")) state.marks.push("grosses-thing");
    a.schritt = 3;
    state.questStufe = Math.max(state.questStufe, 4);
    ungebrochen(state);
    grant(state, "akt4-thing", q.rewards.xp);
    note(state, "Du trägst jetzt den Titel Bannerjarl. Die Menschenreiche stehen unter einem Banner, und die Armada-Kriegskasse ist geöffnet.");
    state.lagerMeilenstein = "CAMP_MILESTONE_BANNERJARL";
    return state;
  }
  function akt4Sieg(state) {
    const a = state.akte.akt4;
    const quests = V260.akt4.act4_questline;
    if (a.schritt === 0) {
      const r = quests[0].rewards;
      state.silver += r.silver;
      note(state, "„" + quests[0].title + "“ abgeschlossen: +" + r.silver + " Silber, " + kontorGeben(state, r.resources) + " ins Kontor.");
      grant(state, "akt4-altes-reich", r.xp);
      a.schritt = 1;
      note(state, "Nächster Schritt: „" + quests[1].title + "“ in " + N.get(akt4Orte.thorvald).name + ".");
    } else if (a.schritt === 1) {
      a.wahlOffen = true;
      grant(state, "akt4-thorvald", 3500);
      note(state, "Thorvald liegt besiegt vor der Ewigen Flamme. Entscheide, was mit ihm geschieht.");
    }
  }
  // Armada-Kriegskasse und Tor zu Akt 5 (2.6.1): Die Kasse öffnet mit dem Großen Thing, die volle Kasse zeigt das Tor.
  const kasseOffen = (state) => state.marks?.includes("grosses-thing") ?? false;
  function armadaInfo(state) {
    const gate = V260.armada.act5_feature_gate;
    return { offen: kasseOffen(state), voll: SY.kasseVoll(state), bedarf: SY.daten.kriegskasse.bedarf, kasse: SY.kasse(state),
      tor: kasseOffen(state) && SY.kasseVoll(state) ? { titel: gate.gate_ui_title, text: gate.gate_ui_message,
        ziele: gate.planned_continents_preview } : null };
  }

  // ---- Patch 2.6.8 / 2.6.9: Lagerfeuer-Szenen und persönliche Gefährten-Szenen bei der Rast (Menschen) ----
  // Bei jeder Rast mit mindestens einem Gefährten: zuerst ein offener Akt-Meilenstein, dann eine fällige persönliche Szene
  // (nach 4 gemeinsamen Etappen), sonst mit 65 % eine Lagerszene nach dem Archetyp eines Gefährten, ohne Wiederholung,
  // bis der Vorrat erschöpft ist. Thorvalds Tarnung und die Identität der Stillen Feder bleiben gewahrt (keine Szene verrät sie).
  const lagerRegeln = () => V260.lager.camp_event_rules;
  const lagerSzenen = () => V260.lager.camp_scenes_by_companion_archetype;
  const lagerMeilensteine = () => V260.lager.act_specific_camp_milestones;
  const personModule = { kronreich: "ASCHENKRONE_V269_COMPANION_SCENES_KRONREICH", orden: "ASCHENKRONE_V269_COMPANION_SCENES_ORDEN",
    haefen: "ASCHENKRONE_V269_COMPANION_SCENES_HAEFEN" };
  const personSzenen = (fraktion) => SY.daten.v260[personModule[fraktion]]?.companion_personal_scenes ?? [];
  const lagerArchetyp = (klasse) => ["krieger", "waechter"].includes(klasse) ? "KRIEGER_WAECHTER"
    : ["spaeher", "schurke"].includes(klasse) ? "SPAEHER_SCHURKE" : "MAGIER_HEILER";
  // Archetyp der persönlichen Szene: Platz 1 Front, Platz 2 Späher/Schatten, Platz 3 Unterstützung.
  const personArchetyp = (slot) => /_COMP_1_/.test(slot) ? "KRIEGER_WAECHTER" : /_COMP_2_/.test(slot) ? "SPAEHER_SCHURKE" : "MAGIER_HEILER";
  // Zuordnung Szene → Gefährte der Fraktionsreihe: erst nach passendem Archetyp, dann der übrige Gefährte.
  function personZuordnung(fraktion) {
    const frei = (NQ?.reihe(fraktion)?.begleiter ?? []).map((b) => begleiterNachAuftrag[b.auftrag]).filter(Boolean);
    const zuordnung = {};
    const szenen = personSzenen(fraktion);
    for (const s of szenen) {
      const id = frei.find((c) => lagerArchetyp(world.companions[c].klasse) === personArchetyp(s.companion_slot));
      if (id) { zuordnung[s.scene_id] = id; frei.splice(frei.indexOf(id), 1); }
    }
    for (const s of szenen) if (!zuordnung[s.scene_id] && frei.length) zuordnung[s.scene_id] = frei.shift();
    return zuordnung;
  }
  const personZuordnungen = Object.fromEntries(["kronreich", "orden", "haefen"].map((f) => [f, personZuordnung(f)]));
  function personSzeneFaellig(state) {
    for (const fraktion of ["kronreich", "orden", "haefen"]) {
      for (const s of personSzenen(fraktion)) {
        const id = personZuordnungen[fraktion][s.scene_id];
        if (!id || !state.party.includes(id) || state.lagerGesehen.includes(s.scene_id)) continue;
        if (personSzenen(fraktion).some((x) => x !== s && personZuordnungen[fraktion][x.scene_id] === id && state.lagerGesehen.includes(x.scene_id))) continue;
        if ((state.gefaehrtenEtappen?.[id] ?? 0) >= s.trigger_condition.min_stages_together) return { id: s.scene_id, art: "person", begleiter: id };
      }
    }
    return null;
  }
  function lagerSzeneWaehlen(state) {
    state.lagerSzene = null;
    state.lagerGesehen ??= [];
    state.gefaehrtenPerks ??= [];
    if (!state.party.length) return;
    if (state.lagerMeilenstein) {
      state.lagerSzene = { id: state.lagerMeilenstein, art: "meilenstein", begleiter: state.party[0] };
      state.lagerMeilenstein = null;
      return;
    }
    const person = personSzeneFaellig(state);
    if (person) { state.lagerSzene = person; return; }
    if (Math.floor(travelDice() * 100) >= lagerRegeln().trigger_chance_pct) return;
    const passend = state.party.flatMap((id) => lagerSzenen().filter((s) => s.archetype === lagerArchetyp(world.companions[id].klasse))
      .map((s) => ({ s, id })));
    if (!passend.length) return;
    let offen = passend.filter(({ s }) => !state.lagerGesehen.includes(s.scene_id));
    if (!offen.length) {
      // Vorrat erschöpft: die Lagerszenen dieser Gruppe dürfen wieder erscheinen.
      state.lagerGesehen = state.lagerGesehen.filter((id) => !passend.some(({ s }) => s.scene_id === id));
      offen = passend;
    }
    const wahl = offen[Math.floor(travelDice() * offen.length) % offen.length];
    state.lagerSzene = { id: wahl.s.scene_id, art: "lager", begleiter: wahl.id };
  }
  const lagerBuffNamen = { BUFF_EISERNE_ENTSCHLOSSENHEIT: "Eiserne Entschlossenheit (+1 Rüstung)", BUFF_SOELDNER_BLUTDURST: "Söldner-Blutdurst (+8 % Schaden)",
    BUFF_ERSTSCHLAG_LAUER: "Erstschlag aus der Lauer (+12 % Krit)", BUFF_ASCHERISS_FOKUS: "Ascheriss-Fokus (+10 % Fähigkeitsschaden)" };
  function lagerFolgeText(e) {
    const teile = [];
    if (e.moral_delta) teile.push("Moral +" + e.moral_delta);
    if (e.next_combat_buff) teile.push("nächster Kampf: " + (lagerBuffNamen[e.next_combat_buff.buff_id] ?? e.next_combat_buff.buff_id));
    if (e.companion_heal_bonus_hp) teile.push("nächster Kampf: Schild " + e.companion_heal_bonus_hp);
    if (e.party_heal_bonus_hp) teile.push("nächster Kampf: Schild " + e.party_heal_bonus_hp);
    if (e.party_mana_and_stamina_restore) teile.push("nächster Kampf: +" + e.party_mana_and_stamina_restore + " Mana und Ausdauer");
    if (e.next_stages_ambush_reduction_pct) teile.push("−" + e.next_stages_ambush_reduction_pct + " % Hinterhalt für " + e.duration_stages + " Etappen");
    if (e.party_all_stats_next_combat_pct) teile.push("nächster Kampf: +" + e.party_all_stats_next_combat_pct + " % Schaden");
    if (e.unlock_companion_perk) teile.push("Vorteil " + e.unlock_companion_perk.name + ": " + e.unlock_companion_perk.bonus);
    return teile.join(" · ");
  }
  function lagerSzeneDaten(szene) {
    if (!szene) return null;
    if (szene.art === "meilenstein") {
      const m = lagerMeilensteine().find((x) => x.scene_id === szene.id);
      return m && { regie: "Das Lagerfeuer brennt hoch, und alle rücken näher zusammen.", text: m.dialogue,
        antworten: [{ id: "WEITER", label: "Schweigend nicken und den Becher heben", effects: m.effects }] };
    }
    if (szene.art === "person") {
      const s = ["kronreich", "orden", "haefen"].flatMap(personSzenen).find((x) => x.scene_id === szene.id);
      return s && { regie: s.stage_direction, text: s.dialogue, antworten: s.choices.map((c) => ({ id: c.choice_id, label: c.label, effects: c.effects })) };
    }
    const s = lagerSzenen().find((x) => x.scene_id === szene.id);
    return s && { regie: s.stage_direction, text: s.dialogue, antworten: s.player_responses.map((r) => ({ id: r.response_id, label: r.label, effects: r.effects })) };
  }
  function lagerSzeneInfo(state) {
    const daten = lagerSzeneDaten(state.lagerSzene);
    if (!daten) return null;
    return { ...state.lagerSzene, sprecher: world.companions[state.lagerSzene.begleiter]?.name ?? "Deine Gefährten",
      persoenlich: state.lagerSzene.art === "person", meilenstein: state.lagerSzene.art === "meilenstein",
      regie: daten.regie, text: daten.text, antworten: daten.antworten.map((a) => ({ id: a.id, label: a.label, folge: lagerFolgeText(a.effects) })) };
  }
  function lagerAntwort(previous, antwortId) {
    const daten = lagerSzeneDaten(previous.lagerSzene);
    const antwort = daten?.antworten.find((a) => a.id === antwortId);
    if (!antwort || previous.combat) return previous;
    const state = structuredClone(previous);
    const e = antwort.effects ?? {};
    if (e.moral_delta) state.moral = Math.min(SY.daten.moral.max, (state.moral ?? SY.daten.moral.start) + e.moral_delta);
    const buff = { ...(state.lagerBuff ?? {}) };
    const namen = buff.name ? [buff.name] : [];
    if (e.next_combat_buff) {
      const { buff_id, duration_combats, ...werte } = e.next_combat_buff;
      for (const [k, v] of Object.entries(werte)) buff[k] = (buff[k] ?? 0) + v;
      namen.push(lagerBuffNamen[buff_id] ?? buff_id);
    }
    const schild = (e.companion_heal_bonus_hp ?? 0) + (e.party_heal_bonus_hp ?? 0);
    if (schild) { buff.schild = (buff.schild ?? 0) + schild; namen.push("Schild " + schild); }
    if (e.party_mana_and_stamina_restore) { buff.ressource = (buff.ressource ?? 0) + e.party_mana_and_stamina_restore; namen.push("+" + e.party_mana_and_stamina_restore + " Mana und Ausdauer"); }
    if (e.party_all_stats_next_combat_pct) { buff.party_all_stats_pct = (buff.party_all_stats_pct ?? 0) + e.party_all_stats_next_combat_pct; namen.push("+" + e.party_all_stats_next_combat_pct + " % Schaden"); }
    if (namen.length > (buff.name ? 1 : 0) || Object.keys(buff).length) state.lagerBuff = Object.keys(buff).length ? { ...buff, name: [...new Set(namen)].join(", ") } : null;
    if (e.next_stages_ambush_reduction_pct) state.vorhut = { prozent: e.next_stages_ambush_reduction_pct, etappen: e.duration_stages ?? 3 };
    state.gefaehrtenPerks ??= [];
    state.lagerGesehen ??= [];
    if (e.unlock_companion_perk && !state.gefaehrtenPerks.includes(e.unlock_companion_perk.perk_id)) state.gefaehrtenPerks.push(e.unlock_companion_perk.perk_id);
    state.lagerGesehen = [...new Set([...state.lagerGesehen, state.lagerSzene.id])];
    note(state, "Am Lagerfeuer: " + antwort.label + (lagerFolgeText(e) ? " · " + lagerFolgeText(e) : "") + ".");
    state.lagerSzene = null;
    return state;
  }
  const lagerVorteile = (state) => (state.gefaehrtenPerks ?? []).map((id) => ["kronreich", "orden", "haefen"].flatMap(personSzenen)
    .flatMap((s) => s.choices).map((c) => c.effects.unlock_companion_perk).find((p) => p?.perk_id === id)).filter(Boolean)
    .map((p) => ({ id: p.perk_id, name: p.name, bonus: p.bonus }));

  // Sieg in einem Auftrags- oder Hauptquestkampf.
  function auftragSieg(state, auftrag, turn = state.combat) {
    if (/^(?:zweig|akt4):/.test(auftrag)) aktSieg(state, auftrag, turn);
    else if (auftrag === "haupt") {
      const stand = state.hauptquest;
      const plan = hauptPlan[state.faction]?.[stand.schritt];
      if (plan?.wahl) aktAbschliessen(state);
      else if (plan?.auftraggeber && plan.auftraggeber !== state.knoten) {
        stand.bericht = { ort: plan.auftraggeber };
        note(state, mitOrt(rueckkehr.banner, plan.auftraggeber));
      } else hauptVoran(state);
    } else if (state.weltAuftraege?.[auftrag]?.status === "aktiv") {
      if (abgabeVorOrt(auftragIndex[auftrag])) auftragAbschliessen(state, auftrag);
      else {
        state.weltAuftraege[auftrag].status = rueckkehr.status;
        note(state, "Auftrag erfüllt: " + auftragIndex[auftrag].titel + ". " + mitOrt(rueckkehr.banner, auftragIndex[auftrag].ort).replace(/^Auftrag erfüllt\. /, ""));
      }
    }
  }

  // Charakter-Entwurf: Stufenpunkte, Spezialisierung und Meisterklasse in einem Schritt festschreiben.
  // plan = { training: { grundwert: n }, spez: { variante, grundwert, fertigkeit } | null,
  //          meister: { grundwerte: { grundwert: n }, fertigkeit } | null }
  function entwurf(previous, plan) {
    if (!isRecord(plan) || previous.combat || !previous.health) return previous;
    let state = previous;
    for (const [id, count] of Object.entries(plan.training ?? {})) {
      if (!intBetween(count, 0, 40)) return previous;
      for (let index = 0; index < count; index++) {
        const next = train(state, id);
        if (next === state) return previous;
        state = next;
      }
    }
    if (plan.spez) {
      const next = specialize(state, plan.spez.variante, plan.spez.grundwert, plan.spez.fertigkeit);
      if (next === state) return previous;
      state = next;
    }
    if (plan.meister) {
      const next = ascend(state, plan.meister.grundwerte, plan.meister.fertigkeit);
      if (next === state) return previous;
      state = next;
    }
    return state;
  }

  // ---- Kampf nach dem Kampfdokument (17. 11. 2026): Runden, Initiative, Ausdauer, Mana und Fähigkeiten ----
  // Ohne Kampfraster: Fläche trifft alle Feinde, Verlangsamen und Zurückstoßen senken den Schaden des Ziels um 1.

  const level = (state) => stufeVon(state);
  const kraft = (state) => {
    const stufe = level(state);
    const extra = Math.floor((stufe - 1) / 2);
    // Patch 2.5.4: Ausdauer der Menschen 15, ab Stufe 6 alle 3 Stufen +1 (6, 9, 12 …).
    const ausdauerMenschen = 15 + (stufe >= 6 ? Math.floor((stufe - 6) / 3) + 1 : 0);
    const magie = K.fraktionen[state.faction].magie ? state.build.fertigkeiten.magie : 0;
    // Menschen (Patch 2.1.0 Punkt 10, 2.4.0): Mana nur für Pyromant, Kleriker der Flamme, Glutpaladin und Inquisitor,
    // 12 + Willenskraft + Intelligenz/2.
    const klasse = menschenKlasse(state);
    if (klasse) {
      const werte = heroAttributes(state);
      // Patch 2.6.2: Resonanz Rang 2 +4 Mana bzw. Ausdauer. Patch 2.6.5: Mana und Ausdauer der Ausrüstung.
      const extraRes = SY.talentWirkung(state, "TREE_RUNEN_UND_GLUTRESONANZ", "max_resource_bonus");
      return { ausdauer: ausdauerMenschen + SY.skaliert(10) * (state.ahnen?.perk_iron_blood ?? 0) + extraRes + gearStat(state, "maxStamina"),
        mana: klasse.mana ? SY.maxMana(werte.will, werte.mind) + extraRes + gearStat(state, "maxMana") +
          (state.gefaehrtenPerks?.includes("PERK_OR_RUHIGE_GLUT") ? 3 : 0) : 0 };
    }
    return { ausdauer: 10 + extra, mana: magie > 0 ? 2 * magie + extra : 0 };
  };
  const resourceName = (state) => K.fraktionen[state.faction].ressource;
  const intelligenzRabatt = (state) => Math.max(0, modifier(heroAttributes(state).mind));

  // Die Fertigkeit, die Schaden einer Klasse trägt, und die, die ihre Heilung trägt.
  function combatSkill(state, zahlung) {
    const role = profile(state.faction, state.role);
    if (zahlung === "M") return "magie";
    if (["spaeher", "pulvermeister"].includes(role)) return "fernkampf";
    if (role === "skalde") return "fuehrung";
    return "nahkampf";
  }
  const healSkill = (state) => profile(state.faction, state.role) === "feldscher" ? "fuehrung" : "magie";

  // Alle Fähigkeiten des Helden mit Freischaltung, Kosten und Verstärkung durch die Spezialisierung.
  function abilities(state) {
    const stufe = level(state);
    const spez = state.build.spez?.variante;
    const signatur = SY.istMensch(state.faction) ? faehigkeiten.fraktionen[state.faction].klassen[state.role].signatur : null;
    let list = kampf.klassenFaehigkeiten(state.faction, state.role).map((f) => ({
      ...f, frei: stufe >= f.stufe,
      spezialisiert: !signatur && ((spez === "a" && f.stufe === 6) || (spez === "b" && f.stufe === 10)),
    }));
    if (signatur) {
      // Stufe 15 und 20: Signaturfähigkeit der gewählten Spezialisierung in Rang 2 und 3; Rang 3 ersetzt Rang 2.
      list = list.map((f) => {
        if (f.stufe < 15) return f;
        const [name, wirkung, zahlung] = signatur[spez ?? "a"][f.stufe === 15 ? 0 : stufe >= 25 ? 2 : 1];
        return { ...f, name, wirkung, zahlung, regel: kampf.lies(wirkung), frei: f.frei && Boolean(spez), signatur: true };
      }).filter((f) => !(f.stufe === 15 && stufe >= 20 && spez));
    }
    if (state.build.meister) {
      for (const f of kampf.meisterFaehigkeiten(state.faction, state.role)) list.push({ ...f, frei: stufe >= f.stufe, spezialisiert: false });
    }
    return list.map((f) => ({
      ...f,
      kostenWert: f.kosten ? Math.max(1, f.kosten - intelligenzRabatt(state) -
        (faehigkeitRang(state, f.id) >= aufstieg.rangMax ? aufstieg.rangRabatt : 0)) : 0,
      rang: faehigkeitRang(state, f.id),
      abklingzeitWert: Math.max(0, f.abklingzeit - (f.spezialisiert && hasControl(f.regel) ? 1 : 0)),
    }));
  }
  const hasControl = (r) => Boolean(r.betaeuben || r.furcht || r.schweigen || r.verlangsamen || r.verspotten);

  // Werte für Charakterbogen und Kampfanzeige.
  function kampfwerte(state) {
    const max = kraft(state);
    const held = state.combat?.held;
    return {
      stufe: level(state), lp: state.health, lpMax: healthLimit(state),
      ausdauer: held ? held.ausdauer : max.ausdauer, ausdauerMax: max.ausdauer,
      mana: held ? held.mana : max.mana, manaMax: max.mana,
      ressource: state.ressource ?? 0, ressourceName: resourceName(state),
      schild: held?.schild ?? 0, grundangriff: basicBonus(state),
    };
  }

  // Grundangriff: +1 auf den Stufen 4, 8, 12, 16 und 20.
  const basicBonus = (state) => Math.floor(level(state) / 4);
  function weaponBonus(state) {
    const id = weapon(state);
    return id === "faeuste" ? -3 : Math.max(0, (world.gear[id].power ?? 0) - 5);
  }

  function abilityState(state, id) {
    const f = abilities(state).find((entry) => entry.id === id);
    if (!f || !f.frei) return { f, reason: "noch nicht freigeschaltet" };
    const held = state.combat.held;
    if (f.einmal && held.genutzt.includes(f.id)) return { f, reason: "schon genutzt" };
    if ((held.abklingen[f.id] ?? 0) > 0) return { f, reason: "Abklingzeit " + held.abklingen[f.id] };
    if ((f.regel?.heilung || f.regel?.hot) && heilDeckel(state) && (held.heilungen ?? 0) >= klassenBalance.heilungen) {
      return { f, reason: "höchstens " + klassenBalance.heilungen + " Heilungen je Kampf" };
    }
    const pool = f.zahlung === "M" ? held.mana : held.ausdauer;
    if (pool < f.kostenWert) return { f, reason: "zu wenig " + (f.zahlung === "M" ? "Mana" : "Ausdauer") };
    // Der Fraktionsvorrat sinkt im Kampf nie unter 1 (Henry, 17. 11. 2026).
    if ((f.ressource ?? 0) && (state.ressource ?? 0) - f.ressource < 1) return { f, reason: "zu wenig " + resourceName(state) };
    return { f, reason: null };
  }

  // Gegnerstufe und Rang einer Begegnung. Gruppen erhalten je Gefährte einen Mitläufer mehr,
  // Einzelgegner 25 % mehr LP je Gefährte.
  // Patch 2.5.4 (Solo und Bosse): Kämpfe aus Szenen der Geschichte (Wahl mit fight) gelten als gesetzt.
  let szenenKaempfe = null;
  const szenenKampf = (id) => (szenenKaempfe ??= new Set(Object.values(world.scenes)
    .flatMap((scene) => (scene.choices ?? []).map((choice) => choice.fight).filter(Boolean)))).has(id);
  const solo = { maxGegner: 2, mitlaeuferLp: 0.5, mitlaeuferSchaden: 0.75 };
  // Patch 2.5.5: Anführer treffen auf jeder Stufe höchstens mit max(6, Heldenstufe) je Treffer (kein Sprung von Stufe 9 auf 10).
  const anfuehrerDeckel = (heldStufe) => Math.max(6, heldStufe);
  const bossAnpassung = { "auftrag-skarn": { lp: 0.82 }, "auftrag-letztermammut": { lp: 0.85 } };
  // Patch 2.6.17 (Henry): Gegnerzahl nach aktiver Gruppengröße (Held + Gefährten), höchstens 4 je Begegnung.
  // Gruppe 2–3: zusätzliche Gegner mit 90 % LP und Schaden; Gruppe 4: der vierte Gegner mit 75 %.
  // Szenenkämpfe behalten ihre festgelegte Zahl, aber ebenfalls höchstens 4.
  const gruppenSkalierung = { hoechstens: 4, stufen: { 1: { min: 1, max: 2, extra: 1 }, 2: { min: 2, max: 2, extra: 0.9 },
    3: { min: 2, max: 3, extra: 0.9 }, 4: { min: 3, max: 4, extra: 1, vierter: 0.75 } }, gefaehrtenSchutz: 0.08 };
  // Patch 2.6.17: Thorvald, der Bleiche Skalde (Bezug Stufe 20): feste Werte und höchstens zwei schwache Akolythen.
  // Patch 2.6.18: 148 LP, Rüstung 7, Treffer höchstens 16, Akolythen 45 LP und höchstens 9.
  // Patch 2.6.19 (Henry, B8): Thorvald kämpft auf Stufe min(22, max(18, Heldenstufe)); die Werte gelten für Stufe 20,
  // je Stufe Abweichung LP ±6 % und Schaden (Einzel- und Flächendeckel) ±5 %. Rüstung und Akolythen bleiben gleich.
  // Patch 2.6.19a (Henry, Entscheidungskarte 20. 11.): Heilungsdeckel nur noch für Magier. Der Heiler bekommt gegen
  // Thorvald das „Gegenlied“: Schild aus einem Teil seiner LP zu Kampfbeginn, Thorvalds Treffer auf ihn schwächer.
  const thorvaldHilfe = { rollen: ["heiler"], schild: 0.05, schaden: 0.9, name: "Gegenlied" };
  const thorvaldHilfeAktiv = (state) => menschen(state) && state.combat?.id === "auftrag-thorvald" && thorvaldHilfe.rollen.includes(state.role);
  const bossWerte = { "auftrag-thorvald": { lp: 148, ruestung: 7, deckel: 16, flaecheDeckel: 11, bezug: 20, lpJeStufe: 0.06, schadenJeStufe: 0.05,
    stufe: (held) => Math.min(22, Math.max(18, held)), adds: { anzahl: 2, name: "Untoter Akolyth", lp: 45, deckel: 9 } } };

  function lineup(id, size, stufe = null, heldStufe = null) {
    const fight = world.fights[id];
    const spec = stufe ? { ...fight.gegner, stufe } : fight.gegner;
    const group = world.enemyGroups[id];
    const creature = world.creatures[id];
    const geschick = 8 + (creature.stats[3] ?? 5);
    const boss = bossWerte[id];
    if (boss) {
      const basis = kampf.gegnerWerte(spec.rang, spec.stufe, 1 + size);
      const add = kampf.gegnerWerte("mitlaeufer", spec.stufe, 1);
      const abweichung = boss.bezug ? spec.stufe - boss.bezug : 0;
      const lp = Math.round(boss.lp * (1 + (boss.lpJeStufe ?? 0) * abweichung));
      const deckel = Math.round(boss.deckel * (1 + (boss.schadenJeStufe ?? 0) * abweichung));
      return [{ name: fight.name ?? creature.name, rang: spec.rang, stufe: spec.stufe, lp, max: lp,
        schaden: Math.min(basis.schaden, deckel), deckel, aktionen: basis.aktionen, geschick, tags: spec.tags ?? [],
        status: {}, ruestung: boss.ruestung,
        ...(boss.flaecheDeckel ? { flaecheDeckel: Math.round(boss.flaecheDeckel * (1 + (boss.schadenJeStufe ?? 0) * abweichung)) } : {}) },
      ...Array.from({ length: boss.adds.anzahl }, (_, i) => ({ name: boss.adds.name + " " + (i + 1), rang: "mitlaeufer", stufe: spec.stufe,
        lp: boss.adds.lp, max: boss.adds.lp, schaden: Math.min(add.schaden, boss.adds.deckel), deckel: boss.adds.deckel, aktionen: 1,
        geschick, tags: spec.tags ?? [], status: {} }))];
    }
    let count = (spec.anzahl ?? 1) + (group ? Math.min(size, 6 - (spec.anzahl ?? 1)) : 0);
    // Allein (ohne Gefährten) höchstens 2 Gegner in Begegnungen und Aufträgen. Erzwingt eine Szene einen dritten,
    // kämpft jeder weitere als geschwächter Mitläufer (halbe LP, drei Viertel Schaden).
    const allein = size === 0;
    const szene = szenenKampf(id);
    if (allein && !szene) count = Math.min(count, solo.maxGegner);
    const skala = gruppenSkalierung.stufen[Math.min(4, size + 1)];
    if (group && !szene) count = Math.max(skala.min, Math.min(skala.max, count));
    count = Math.min(count, gruppenSkalierung.hoechstens);
    const anpassung = bossAnpassung[id];
    return Array.from({ length: count }, (_, index) => {
      const values = fight.system ? SY.kampfWerte(fight.system, spec.stufe) : kampf.gegnerWerte(spec.rang, spec.stufe, 1 + size);
      let lp = group ? values.lp : Math.round(values.lp * (1 + 0.25 * size));
      let schaden = values.schaden;
      if (anpassung && index === 0) lp = Math.max(1, Math.round(lp * anpassung.lp));
      if (!fight.system && index === 0 && spec.rang === "anfuehrer") schaden = Math.min(schaden, anfuehrerDeckel(heldStufe ?? spec.stufe));
      // Patch 2.6.17: Zusatzgegner je Gruppengröße schwächer.
      const faktor = szene || index === 0 ? 1 : index === 3 && skala.vierter ? skala.vierter : skala.extra;
      if (faktor !== 1) {
        lp = Math.max(1, Math.round(lp * faktor));
        schaden = Math.max(1, Math.round(schaden * faktor));
      }
      const geschwaecht = allein && index >= solo.maxGegner;
      if (geschwaecht) {
        lp = Math.max(1, Math.round(lp * solo.mitlaeuferLp));
        schaden = Math.max(1, Math.round(schaden * solo.mitlaeuferSchaden));
      }
      const name = (index === 0 ? (group?.leader ?? fight.name ?? creature.name) : group.ally + " " + index) + (geschwaecht ? " (geschwächt)" : "");
      return { name, rang: spec.rang, stufe: spec.stufe, lp, max: lp, schaden, aktionen: values.aktionen,
        geschick, tags: spec.tags ?? [], status: {}, ...(fight.system && values.ruestung ? { ruestung: values.ruestung } : {}) };
    });
  }

  function startFight(state, id, opening = true, stufe = null) {
    const max = kraft(state);
    const combat = {
      id, round: 0, stunned: false, bleeding: 0, supportUsed: [],
      feinde: schwierigkeitLp(state, lineup(id, state.party.length, stufe, level(state))), diener: [],
      held: { ausdauer: max.ausdauer, mana: max.mana, schild: 0, schildRunden: 0, unsichtbar: 0, naechster: 0,
        staerkung: null, hot: null, todesschutz: null, abklingen: {}, genutzt: [], mine: false, bekehren: 0 },
    };
    state.combat = combat;
    // Patch 2.5.5: Pyromant und Kleriker der Flamme allein beginnen mit einem Glutschild von 25 % ihrer LP.
    if (magierSchutz(state)) {
      combat.held.schild = Math.round(healthLimit(state) * magierSchutzWerte.schild);
      combat.held.magierSchutz = true;
    }
    if (thorvaldHilfeAktiv(state)) {
      combat.held.schild += Math.round(healthLimit(state) * thorvaldHilfe.schild);
      note(state, thorvaldHilfe.name + ": Dein Gebet hält gegen das Klagelied des Skalden.");
    }
    // Patch 2.6.2: Ungebrochener Schildwall Rang 3: einmal je Kampf mit 1 LP überleben und 20 % LP als Schild erhalten.
    if (menschen(state) && SY.talentRang(state, "TREE_UNGEBROCHENER_SCHILDWALL") >= 3 && !combat.held.todesschutz) {
      combat.held.todesschutz = { lp: 1, runden: 99, schild: 0.2 };
    }
    // Patch 2.6.5: Reliquienstab von Glutberg: Glutschild von 10 % der LP zu Kampfbeginn.
    if (gearStat(state, "emberShieldPct")) combat.held.schild += Math.round(healthLimit(state) * gearStat(state, "emberShieldPct") / 100);
    // Patch 2.6.9: Takt der Schildbrecher: +1 Ausdauer zu Kampfbeginn.
    if (state.gefaehrtenPerks?.includes("PERK_KR_SCHILDBRECHER_TAKT")) combat.held.ausdauer = Math.min(kraft(state).ausdauer, combat.held.ausdauer + 1);
    // Patch 2.6.8: Stärkung vom Lagerfeuer für den nächsten Kampf.
    if (state.lagerBuff) {
      combat.held.lagerBuff = state.lagerBuff;
      combat.held.schild += state.lagerBuff.schild ?? 0;
      if (state.lagerBuff.ressource) {
        combat.held.mana = Math.min(kraft(state).mana, combat.held.mana + state.lagerBuff.ressource);
        combat.held.ausdauer = Math.min(kraft(state).ausdauer, combat.held.ausdauer + state.lagerBuff.ressource);
      }
      note(state, "Vom Lagerfeuer gestärkt: " + state.lagerBuff.name + ".");
      state.lagerBuff = null;
    }
    // Wer das höhere Geschick hat, handelt zuerst.
    const fastest = Math.max(...combat.feinde.map((foe) => foe.geschick));
    if (opening && fastest > heroAttributes(state).agility) {
      combat.gegnerZuerst = true;
      note(state, combat.feinde[0].name + " ist schneller (Geschick " + fastest + ") und greift zuerst an.");
      enemyPhase(state, { guarding: false, ward: 0, events: [], usedFire: false });
      if (!state.health) arrive(state, "defeat");
    }
  }

  function targets(state) {
    const fight = state.combat;
    if (!fight) return [];
    return fight.feinde.map((foe, id) => ({ id, name: foe.name, health: foe.lp, max: foe.max, rang: foe.rang, stufe: foe.stufe,
      schaden: foe.schaden, status: statusText(foe.status) }));
  }

  function statusText(status) {
    const parts = [];
    if (status.betaeubt) parts.push("betäubt");
    if (status.furcht) parts.push("Furcht");
    if (status.schweigen) parts.push("Schweigen");
    if (status.langsam) parts.push("verlangsamt");
    if (status.schwach) parts.push("−" + status.schwach.wert + " Schaden");
    if (status.verwundbar) parts.push("verwundbar +" + status.verwundbar.wert);
    if (status.dot) parts.push(status.dot.wert + " je Runde");
    return parts.join(", ");
  }

  const actionIds = ["spear", "ember", "restore", "guard", "herb", "flee", "torch", "evade"];
  // Aktion: Grundangriff (spear oder f1), eine Fähigkeit (f3 … f20, m1, m2, mit + für Verstärkung durch Ressource),
  // Glutgabe (ember, restore), Deckung, Verbrauchsgut, Flucht oder Fackel.
  function strikeStep(previous, action, dice = Math.random, supply = "galgenwurz", targetId, events = [], allyId = "hero") {
    const fight = previous.combat;
    if (!fight || typeof action !== "string") return previous;
    const boosted = action.endsWith("+");
    const abilityId = action === "spear" ? "f1" : action.replace(/\+$/, "");
    const isAbility = /^(?:f\d+|m[12])$/.test(abilityId);
    if (!isAbility && !actionIds.includes(action)) return previous;
    if (action === "evade") {
      if (!canEvade(previous)) return previous;
      const state = structuredClone(previous);
      note(state, "Du weichst dem Hinterhalt aus und setzt deinen Weg fort. Ohne Kampf gibt es keine Kampf-EP.");
      arrive(state, previous.combat.weiter);
      return state;
    }
    if ((action === "torch" && !world.fights[fight.id].regeneration) ||
        (["ember", "restore"].includes(action) && (previous.ember < 1 || !glutgabe(previous)))) return previous;
    let ability = null;
    if (isAbility) {
      const check = abilityState(previous, abilityId);
      if (check.reason) return previous;
      ability = check.f;
      if (boosted && (ability.stufe < 3 || ability.stufe === 20 || ability.meister ||
        (previous.ressource ?? 0) - (ability.ressource ?? 0) - 1 < 1)) return previous;
    }
    const available = targets(previous).filter(enemy => enemy.health > 0);
    const selected = targetId === undefined ? available[0] : available.find(enemy => enemy.id === targetId);
    if (!selected) return previous;
    const chosenAlly = allies(previous).find(ally => ally.id === allyId);
    if (!chosenAlly || (action === "herb" && !canUse(previous, supply, allyId)) ||
        ((action === "restore" && kit(previous).restore.heal || ability?.regel.heilung || ability?.regel.hot) && chosenAlly.health === 0)) return previous;
    const state = structuredClone(previous);
    ensureVitals(state);
    const confused = Boolean(state.heroStatus.confused);
    const revived = action === "herb" && world.supplies[supply]?.revive ? allyId : null;
    const previousStatuses = Object.fromEntries(allies(state).map(ally => [ally.id, { ...ally.status }]));
    const result = world.fights[fight.id];
    const turn = state.combat;
    const held = turn.held;
    const round = { usedFire: false, ward: 0, guarding: false, events, fire: false, revived, allyId, previousStatuses };
    // Orks: Nach einer gewonnenen Schlacht trägt sie der Kampfrausch durch den ersten Angriff der nächsten.
    let rage = 0;
    if (!confused && state.rausch && (isAbility || ["ember", "torch"].includes(action))) {
      rage = 2;
      state.rausch = false;
      note(state, "Kampfrausch: +2 Schaden.");
    }
    turn.round++;
    let stabilized = false;
    if (confused && (isAbility || ["ember", "restore", "torch"].includes(action))) {
      note(state, state.name + " ist verwirrt und setzt die Aktion aus.");
      events.push({ kind: "skip", actor: "hero" });
    } else if (action === "flee") {
      const roll = 1 + Math.floor(dice() * 20);
      const target = 8 + Math.floor((world.creatures[fight.id].stats[3] ?? 5) / 2);
      if (roll + skillValue(state, "list") >= target) {
        note(state, "Du entkommst und setzt deinen Weg fort.");
        if (result.escape && !state.marks.includes(result.escape)) state.marks.push(result.escape);
        arrive(state, turn.weiter ?? result.retreatTo ?? result.to);
        return state;
      }
      note(state, "Der Fluchtversuch scheitert.");
    } else if (action === "herb") {
      consume(state, supply, allyId, events);
    } else if (action === "ember" && cast(state, 2)) {
      round.usedFire = true;
      const role = kit(state);
      const damage = role.attack.power + damageValue(state, role.attack.skill) + (result.emberBonus ?? 0) + gearBonus(state, "magic") + reliktWert(state, "partyMagicPower") + rage;
      dealDamage(state, selected.id, damage, { fire: true, round });
      note(state, role.attack.name + " verursacht " + damage + " Schaden.");
    } else if (action === "restore" && cast(state, -2)) {
      const role = kit(state);
      round.ward = role.restore.guard ?? 0;
      if (role.restore.heal) {
        const before = allies(state).find(ally => ally.id === allyId).health;
        healAlly(state, allyId, role.restore.heal, "hero", events);
        note(state, role.restore.name + " stellt für " + chosenAlly.name + " " +
          (allies(state).find(ally => ally.id === allyId).health - before) + " LP wieder her.");
      } else {
        dealDamage(state, selected.id, role.restore.hinder ?? 0, { round });
        note(state, role.restore.name + " schwächt den Gegenangriff.");
      }
    } else if (action === "torch") {
      round.usedFire = true;
      round.ward = 7;
      const damage = 6 + damageValue(state, "nahkampf") + rage;
      dealDamage(state, selected.id, damage, { fire: true, round });
      note(state, "Die Fackel verursacht " + damage + " Schaden. Der Troll weicht vor dem Feuer zurück und heilt in dieser Runde nicht.");
    } else if (action === "guard") {
      round.guarding = true;
      stabilized = state.balance !== 0;
      state.balance -= Math.sign(state.balance);
    } else if (ability) {
      useAbility(state, ability, selected.id, boosted, rage, round);
    }

    if (!state.health) {
      arrive(state, "defeat");
      return state;
    }
    if (!events.some(event => event.actor === "hero")) events.push({ kind: "cover", actor: "hero" });
    companionsAct(state, selected.id, round);
    summonsAct(state, selected.id, round);
    tickAllyStatus(state, previousStatuses, revived, events);
    if (!state.health) { arrive(state, "defeat"); return state; }
    if (finishIfWon(state, result)) return state;
    if (result.regeneration && !round.usedFire && turn.feinde[0].lp > 0) {
      const recovered = Math.min(result.regeneration, turn.feinde[0].max - turn.feinde[0].lp);
      turn.feinde[0].lp += recovered;
      if (recovered) note(state, "Die Wunden des Trolls schließen sich. Er gewinnt " + recovered + " LP zurück.");
    }
    if (turn.round === 1 && result.preparation && state.marks.includes(result.preparation)) {
      note(state, "Der Greif verfängt sich im Netz. Du gewinnst Zeit für den nächsten Zug.");
      upkeep(state);
      return state;
    }
    enemyPhase(state, round, stabilized);
    if (finishIfWon(state, result)) return state;
    if (!state.health) {
      arrive(state, "defeat");
      return state;
    }
    upkeep(state);
    return state;
  }

  // Schaden an einem Feind. Liefert den tatsächlichen Schaden.
  function dealDamage(state, id, amount, { fire = false, round, actor = "hero" } = {}) {
    const foe = state.combat.feinde[id];
    if (!foe || foe.lp <= 0 || amount <= 0) return 0;
    // Relikte der Gruppe: Feuerschaden und Schaden gegen Untote.
    if (fire) amount += reliktWert(state, "fireDamage");
    if (foe.tags.includes("untot")) amount = Math.round(amount * (1 + reliktWert(state, "damageVsUndead")));
    // Patch 2.2.0/2.5.1: Kritische Treffer (×1,5) nach Kritchance der Waffe, ohne Zufall über einen Zähler,
    // und Rüstung der Systemgegner als prozentuale Minderung mit Konstante 14, gesenkt durch Durchschlag.
    let kritisch = false;
    if (actor === "hero" && menschen(state)) {
      // Patch 2.6.2: Eiserne Vorhut Rang 1 +6 %, Runen- & Glutresonanz Rang 1 +6 % (mit Runen- oder Glutausrüstung),
      // Schattenpfad Rang 2 +15 % gegen Ziele unter halben LP, Rang 3 +25 % nach eigenem Ausweichen. Zorn der Alten Könige +5 % je Rang.
      // Patch 2.6.5: Schadensboni der Ausrüstung. Fraktions-Spezialisierung Eid der Ewigen Glut +15 % gegen Untote und Ascheriss.
      const held = state.combat.held;
      const plus = SY.talentWirkung(state, "TREE_EISERNE_VORHUT", "damage_bonus_pct") / 100 + 0.05 * (state.ahnen?.perk_ancestral_might ?? 0) +
        (resonanz(state) ? SY.talentWirkung(state, "TREE_RUNEN_UND_GLUTRESONANZ", "damage_bonus_pct") / 100 + 0.04 * (state.ahnen?.perk_relic_resonance ?? 0) : 0) +
        (foe.lp * 2 < foe.max ? SY.talentWirkung(state, "TREE_SCHATTENPFAD_UND_LIST", "execute_damage_bonus_pct") / 100 : 0) +
        (held.nachAusweichen ? SY.talentWirkung(state, "TREE_SCHATTENPFAD_UND_LIST", "post_evasion_next_attack_bonus_pct") / 100 : 0) +
        gearStat(state, "damagePct") / 100 + v260Bonus(state, foe);
      held.nachAusweichen = false;
      if (plus) amount = Math.round(amount * (1 + plus));
      // Kritische Treffer: Zähler aus der Kritchance aller angelegten Stücke, Schattenpfad Rang 1 und Lagerfeuer-Stärkung.
      const krit = kritChance(state);
      if (krit) {
        held.kritZaehler = (held.kritZaehler ?? 0) + krit;
        if (held.kritZaehler >= 100) {
          held.kritZaehler -= 100;
          const mult = SY.talentRang(state, "TREE_EISERNE_VORHUT") >= 2 ? 1.65 : SY.daten.kampf.krit;
          amount = Math.floor(amount * mult);
          kritisch = true;
          note(state, "Kritischer Treffer gegen " + foe.name + " (×" + String(mult).replace(".", ",") + ").");
        }
      }
    }
    if (own(world.companions, actor) && menschen(state)) {
      // Patch 2.6.2: Bannerjarl Rang 1 +5 %, Rang 3 +8 % in den ersten 3 Runden; Kriegshorn des Großen Things +8 % (alle).
      const runde = state.combat.round ?? 0;
      const plus = SY.talentWirkung(state, "TREE_BANNERJARL", "companion_damage_bonus_pct") / 100 +
        (runde <= 3 ? SY.talentWirkung(state, "TREE_BANNERJARL", "companion_all_stats_bonus_pct") / 100 : 0) + v260GruppenBonus(state) +
        (state.gefaehrtenPerks?.includes("PERK_KR_SOELDNERSTAHL") ? 0.08 : 0);
      if (plus) amount = Math.round(amount * (1 + plus));
    }
    if (actor === "hero" && einsamerWolf(state)) amount += Math.min(einsamerWolfWerte.schadenDeckel, Math.round(amount * einsamerWolfWerte.schaden));
    if (foe.ruestung) {
      // Patch 2.6.2/2.6.5: Rüstungsdurchdringung der neuen Ausrüstung (feste Punkte), Eiserne Vorhut Rang 3 −3 Rüstung beim ersten Angriff.
      let flach = 0;
      if (actor === "hero") {
        flach = gearStat(state, "armorPenFlat");
        if (!state.combat.held.ersterAngriff) flach += SY.talentWirkung(state, "TREE_EISERNE_VORHUT", "first_strike_armor_penetration") +
          (state.gefaehrtenPerks?.includes("PERK_FH_NEBELSCHUETZE") ? 2 : 0);
      }
      amount = SY.schaden(amount, Math.max(0, foe.ruestung - flach), actor === "hero" ? world.gear[weapon(state)]?.durchdringung ?? 0 : 0);
    }
    if (actor === "hero" && state.combat) state.combat.held.ersterAngriff = true;
    const value = Math.min(foe.lp, amount + (foe.status.verwundbar?.wert ?? 0));
    foe.lp -= value;
    if (fire && round) round.usedFire = true;
    // Kampf-Paket 20. 11. 2026: Krit und Glut-Treffer nur als Anzeigehinweis für die Kampfanimation.
    round?.events.push({ kind: "hit", actor, target: id, value, ...(kritisch ? { krit: true } : {}), ...(fire ? { glut: true } : {}) });
    if (own(world.companions, actor)) note(state, world.companions[actor].name + " trifft " + foe.name + " für " + value + " Schaden.");
    if (foe.lp <= 0) foeFalls(state, id, fire);
    return value;
  }

  function foeFalls(state, id, fire) {
    const turn = state.combat;
    const foe = turn.feinde[id];
    // Gebundene stehen einmal mit halben LP wieder auf, außer sie fielen durch Feuer oder Dornholz.
    if (foe.tags.includes("gebunden") && !foe.status.erhoben && !fire && state.faction !== "dornenklingen") {
      foe.status = { erhoben: true };
      foe.lp = Math.floor(foe.max / 2);
      note(state, foe.name + " erhebt sich noch einmal.");
      return;
    }
    if (turn.held.bekehren > 0 && turn.diener.length < kampf.maxDiener) {
      turn.diener.push({ name: "Gebundener", lp: 10, max: 10, schaden: 3, runden: 2, koeder: false });
      note(state, foe.name + " steht als Gebundener auf eurer Seite auf.");
    }
  }

  function healHero(state, amount, events, actor = "hero") {
    // Patch 2.6.2: Runen- & Glutresonanz Rang 1 +10 % Heilung beim Tragen von Runen- oder Glutausrüstung; Patch 2.6.5 Heilboni der Ausrüstung.
    if (menschen(state)) amount = Math.round(amount * (1 + (resonanz(state) ? SY.talentWirkung(state, "TREE_RUNEN_UND_GLUTRESONANZ", "heal_and_mana_regen_pct") / 100 : 0) +
      gearStat(state, "healPct") / 100 + (state.akte?.fspez === "FSPEC_EID_DER_EWIGEN_GLUT" ? 0.1 : 0) +
      (state.gefaehrtenPerks?.includes("PERK_OR_LEBENDIGE_FLAMME") ? 0.1 : 0) + runenWert(state, "heilung")));
    const healing = Math.max(0, Math.min(amount, healthLimit(state) - state.health));
    state.health += healing;
    if (healing) events.push({ kind: "heal", actor, value: healing });
    return healing;
  }

  // Grundwert mal Verstärkung (Spezialisierung +50 %, Ressource +25 %), gerundet.
  const scaled = (value, factor) => Math.round(value * factor);

  function conditionHolds(state, ability, target, invisibleBefore) {
    const text = ability.regel.bedingung ?? "";
    const foe = state.combat.feinde[target];
    if (/unter halben LP/.test(text)) return foe.lp * 2 < foe.max;
    if (/schon getroffen/.test(text)) return foe.lp < foe.max;
    if (/betäubten|ahnungslos/.test(text)) return Boolean(foe.status.betaeubt) || state.combat.round === 1 || invisibleBefore;
    if (/enttarnt/.test(text)) return Boolean(foe.status.enttarnt || foe.status.furcht || foe.status.verwundbar);
    if (/Untote|Späher|Schurken/.test(text)) return foe.tags.some((tag) => text.includes({ untot: "Untote", spaeher: "Späher", schurke: "Schurken" }[tag] ?? "§"));
    return invisibleBefore || state.combat.round === 1;
  }

  function useAbility(state, ability, selectedId, boosted, rage, round) {
    const turn = state.combat;
    const held = turn.held;
    const r = ability.regel;
    const events = round.events;
    // Bezahlen: Ausdauer oder Mana, Stufe 20 und Meister II zusätzlich Fraktionsressource, Verstärkung 1 Ressource.
    if (ability.zahlung === "M") held.mana -= ability.kostenWert;
    else held.ausdauer -= ability.kostenWert;
    // Patch 2.6.2: Runen- & Glutresonanz Rang 3: Fertigkeiten heilen beim Wirken um 10 % ihrer Kosten (mindestens 1).
    if (menschen(state) && SY.talentRang(state, "TREE_RUNEN_UND_GLUTRESONANZ") >= 3 && ability.kostenWert) {
      healHero(state, Math.max(1, Math.round(ability.kostenWert * 0.1)), events);
    }
    const resourceCost = (ability.ressource ?? 0) + (boosted ? 1 : 0);
    state.ressource = (state.ressource ?? 0) - resourceCost;
    if (ability.einmal) held.genutzt.push(ability.id);
    if (ability.abklingzeitWert) held.abklingen[ability.id] = ability.abklingzeitWert + 1;
    const factor = (ability.spezialisiert ? 1 + kampf.spezVerstaerkung : 1) * (boosted ? 1 + kampf.ressourceVerstaerkung : 1) *
      (1 + aufstieg.rangBonus * ((ability.rang ?? 1) - 1));
    const invisibleBefore = held.unsichtbar > 0;
    const skill = combatSkill(state, ability.zahlung);
    const bonus = skillValue(state, skill) + (ability.zahlung === "M" ? gearBonus(state, "magic") + reliktWert(state, "partyMagicPower") : 0);
    const living = turn.feinde.map((foe, id) => ({ foe, id })).filter(({ foe }) => foe.lp > 0);
    const order = [...living.filter(({ id }) => id === selectedId), ...living.filter(({ id }) => id !== selectedId)].map(({ id }) => id);
    const count = r.ziele === "alle" ? order.length : r.ziele ?? 1;
    const group = order.slice(0, count);
    const damageTargets = r.schadenEinzeln ? order.slice(0, 1) : group;
    const parts = [];
    let firstHit = true;
    let dealt = 0;
    const flat = (amount) => {
      let value = amount + (held.staerkung?.wert ?? 0) + rage - (turn.stunned ? 2 : 0);
      if (firstHit) {
        value += held.naechster;
        if (held.naechster) held.naechster = 0;
        firstHit = false;
      }
      return value;
    };

    // Schaden.
    let base = r.schaden;
    if (ability.id === "f1") {
      base = r.schaden + basicBonus(state) + weaponBonus(state) + (turn.id === "felsgreif" ? world.gear[weapon(state)].airborne ?? 0 : 0);
    }
    if (r.zielAngriff) base = turn.feinde[selectedId].schaden + r.zielAngriff;
    if (base !== undefined) {
      const hits = r.treffer ?? 1;
      for (const target of damageTargets) {
        let amount = r.sonst !== undefined && !conditionHolds(state, ability, target, invisibleBefore) ? r.sonst : base;
        amount = ability.id === "f1" ? amount : scaled(amount, factor);
        if (r.feuer && state.faction === "orden" && turn.feinde[target].tags.includes("untot")) amount += 2;
        if (r.gegenUntote && turn.feinde[target].tags.includes("untot")) amount += r.gegenUntote;
        for (let hit = 0; hit < hits; hit++) {
          const goal = turn.feinde[target].lp > 0 ? target : order.find((id) => turn.feinde[id].lp > 0);
          if (goal === undefined) break;
          const value = Math.max(1, flat(amount + (hit === 0 ? bonus : 0)));
          const done = dealDamage(state, goal, value, { fire: Boolean(r.feuer), round });
          dealt += done;
          if (held.staerkung?.heilung) healHero(state, held.staerkung.heilung, events);
          if (r.heilJeZiel && hit === 0) healHero(state, r.heilJeZiel, events);
        }
      }
      parts.push(dealt + " Schaden");
      if (r.zusatzGrundangriff) {
        const goal = order.find((id) => turn.feinde[id].lp > 0);
        if (goal !== undefined) dealt += dealDamage(state, goal, flat(6 + r.zusatzGrundangriff + bonus), { round });
      }
      // Unsichtbarkeit endet beim ersten Angriff.
      held.unsichtbar = 0;
    }
    if (r.lebensraub && dealt) parts.push(healHero(state, dealt, events) + " LP geheilt");

    // Gift, Blutung, Brand und Felder mit Schaden über mehrere Runden.
    if (r.dot) {
      const dotTargets = r.dotAlle || r.ziele === "alle" ? order : group;
      for (const target of dotTargets) {
        turn.feinde[target].status.dot = { wert: scaled(r.dot.wert, factor) + (base === undefined && target === dotTargets[0] ? Math.max(0, bonus) : 0),
          runden: r.dot.runden, feuer: Boolean(r.dot.feuer) };
      }
      if (r.dot.feuer) round.usedFire = true;
      parts.push(r.dot.runden + " Runden je " + scaled(r.dot.wert, factor));
      if (base === undefined) held.unsichtbar = r.unsichtbar ? held.unsichtbar : 0;
    }

    // Kontrolle.
    const affect = (key, apply) => {
      const scope = r[key]?.alle || (r.ziele === "alle") ? order : group;
      for (const target of scope) {
        const foe = turn.feinde[target];
        if (foe.lp > 0) apply(foe.status, foe);
      }
    };
    if (r.betaeuben && !(r.mineBedingung && !held.mine)) {
      affect("betaeuben", (status) => {
        if ((status.immunBis ?? -1) >= turn.round) return;
        status.betaeubt = Math.max(status.betaeubt ?? 0, r.betaeuben);
      });
      parts.push("betäubt");
    } else if (r.verlangsamen) {
      affect("verlangsamen", (status) => { status.langsam = Math.max(status.langsam ?? 0, r.verlangsamen); });
      parts.push("verlangsamt");
    }
    if (r.furcht) {
      affect("furcht", (status) => { status.furcht = Math.max(status.furcht ?? 0, r.furcht.runden); });
      parts.push("Furcht");
    }
    if (r.schweigen) {
      affect("schweigen", (status) => { status.schweigen = Math.max(status.schweigen ?? 0, r.schweigen.runden); });
      parts.push("Schweigen");
    }
    if (r.schwaechen) {
      affect("schwaechen", (status) => { status.schwach = { wert: r.schwaechen.wert, runden: r.schwaechen.runden }; });
      parts.push("Feinde −" + r.schwaechen.wert + " Schaden");
    }
    if (r.verwundbar) {
      const foe = turn.feinde[order[0]];
      if (foe) foe.status.verwundbar = { ...r.verwundbar };
      parts.push("Ziel nimmt +" + r.verwundbar.wert);
    }
    if (r.aufdecken) affect("aufdecken", (status) => { status.enttarnt = true; });
    if (/Mine/.test(ability.wirkung) && !r.mineBedingung) held.mine = true;

    // Direkte Heilung trifft das gewählte Gruppenziel; persönliche Schild- und Stärkungseffekte bleiben beim Helden.
    const heilFaktor = (r.heilung || r.hot) && heilDeckel(state) ? ((held.heilungen = (held.heilungen ?? 0) + 1) > 1 ? klassenBalance.zweiteHeilung : 1) : 1;
    if (r.heilung) {
      const amount = Math.round((scaled(r.heilung, factor) + Math.max(0, skillValue(state, healSkill(state)))) * heilFaktor);
      parts.push(healAlly(state, round.allyId ?? "hero", amount, "hero", events) + " LP geheilt");
    }
    if (r.hot) {
      held.hot = { wert: Math.round(scaled(r.hot.wert, factor) * heilFaktor), runden: r.hot.runden, ally: round.allyId ?? "hero" };
      parts.push("heilt " + r.hot.runden + " Runden je " + held.hot.wert);
    }
    if (r.reinigen) {
      const target = round.allyId ?? "hero";
      if (target === "hero") { turn.bleeding = 0; state.heroStatus = {}; }
      else state.partyVitals[target].status = {};
    }
    if (r.selbstBenommen) turn.selbstBenommen = true;
    if (r.schild) {
      held.schild += scaled(r.schild, factor);
      held.schildRunden = kampf.schildDauer;
      events.push({ kind: "cover", actor: "hero" });
      parts.push(scaled(r.schild, factor) + " Schild");
    }
    if (r.staerkung) {
      held.staerkung = { wert: r.staerkung.wert, runden: r.staerkung.runden + 1, heilung: r.staerkung.heilung ?? 0 };
      parts.push("+" + r.staerkung.wert + " Schaden für " + r.staerkung.runden + (r.staerkung.runden === 1 ? " Runde" : " Runden"));
    }
    if (r.naechster) held.naechster = r.naechster;
    if (r.unsichtbar) {
      held.unsichtbar = r.unsichtbar + 1;
      parts.push("unsichtbar");
    }
    if (r.todesschutz) held.todesschutz = { ...r.todesschutz };
    if (r.mana) held.mana = Math.min(kraft(state).mana, held.mana + r.mana);
    if (r.bekehren) held.bekehren = r.bekehren.runden + 1;
    if (r.glut) state.balance = Math.min(3, state.balance + r.glut);
    if (r.diener) {
      const room = kampf.maxDiener - turn.diener.length;
      const amount = Math.min(room, r.diener.anzahl);
      for (let index = 0; index < amount; index++) {
        turn.diener.push({ name: r.diener.name, lp: r.diener.lp, max: r.diener.lp, schaden: scaled(r.diener.schaden, factor),
          runden: r.diener.runden, koeder: r.diener.koeder });
      }
      parts.push(amount ? amount + " × " + r.diener.name : "schon 3 beschworene Wesen");
      if (!amount && !parts.length) parts.push("ohne Wirkung");
    }
    if (r.verspotten && !parts.length) parts.push("zieht die Angriffe auf sich");
    // Was geschieht, wenn das Hauptziel fällt.
    if (r.beimFall && turn.feinde[selectedId].lp <= 0) {
      const rider = r.beimFall;
      if (rider.springt && r.dot) {
        const next = order.find((id) => turn.feinde[id].lp > 0);
        if (next !== undefined) turn.feinde[next].status.dot = { wert: scaled(r.dot.wert, factor), runden: r.dot.runden, feuer: false };
      }
      if (rider.ressource) state.ressource = Math.min(vorratMax, (state.ressource ?? 0) + rider.ressource);
      if (rider.heilung) healHero(state, rider.heilung, events);
      if (rider.unsichtbar) held.unsichtbar = rider.unsichtbar + 1;
      if (rider.diener && turn.diener.length < kampf.maxDiener) {
        turn.diener.push({ name: rider.diener.name, lp: rider.diener.lp, max: rider.diener.lp, schaden: rider.diener.schaden,
          runden: rider.diener.runden, koeder: false });
      }
    }
    if (!events.some((event) => event.actor === "hero")) events.push({ kind: "cover", actor: "hero" });
    note(state, ability.name + (ability.spezialisiert ? " (Spezialisierung)" : "") + (boosted ? " (verstärkt)" : "") +
      ": " + (parts.length ? parts.join(", ") : "wirkt") + ".");
  }

  function companionsAct(state, selectedId, round) {
    const turn = state.combat;
    const assisted = [];
    const living = () => turn.feinde.map((foe, id) => ({ foe, id })).filter(({ foe }) => foe.lp > 0);
    const goal = () => (living().find(({ id }) => id === selectedId) ?? living()[0])?.id;
    const extra = turn.held.staerkung?.wert ?? 0;
    for (const id of state.party) {
      if (!living().length) break;
      if (!memberVitals(state, id).health || id === round.revived) continue;
      if (memberVitals(state, id).status.confused) {
        round.events.push({ kind: "skip", actor: id });
        continue;
      }
      const member = world.companions[id];
      const equipment = memberEquipment(state, id);
      const weaponGear = world.gear[equipment.weapon];
      const ready = !(turn.supportUsed ?? []).includes(id);
      const patient = allies(state).filter(ally => ally.health > 0)
        .sort((a, b) => a.health / a.max - b.health / b.max)[0];
      const wounded = patient.health <= patient.max - (member.heal ?? 0) || (member.cleanse && turn.bleeding > 0);
      const special = ready && (member.heal ? wounded : member.guard ? turn.round % 2 === 0 : true);
      if (special) {
        turn.supportUsed.push(id);
        round.ward = Math.max(round.ward, member.guard ?? 0);
        if (member.fire) round.usedFire = true;
        const healing = healAlly(state, patient.id, member.heal ?? 0, id, round.events);
        if (member.cleanse) turn.bleeding = 0;
        const damage = (member.damage ? member.damage + (weaponGear?.power ?? 0) + (weaponGear?.magic ?? 0) +
          (member.fire ? reliktWert(state, "partyMagicPower") : 0) : 0) +
          (turn.id === "felsgreif" ? (member.airborne ?? 0) : 0);
        if (damage) dealDamage(state, goal(), damage + extra, { fire: Boolean(member.fire), round, actor: id });
        else if (!healing) round.events.push({ kind: "cover", actor: id });
        assisted.push(member.name + " (" + member.ability + ")");
      } else {
        dealDamage(state, goal(), 3 + Math.floor((member.damage ?? 0) / 4) + (weaponGear?.power ?? 0) +
          (turn.id === "felsgreif" ? (weaponGear?.airborne ?? 0) : 0) + extra, { round, actor: id });
      }
    }
    if (assisted.length) note(state, "Unterstützung: " + assisted.join(", ") + ".");
  }

  function tickAllyStatus(state, previousStatuses, revived, events) {
    for (const ally of allies(state)) {
      if (!ally.health || ally.id === revived) continue;
      for (const effect of Object.keys(previousStatuses[ally.id] ?? {})) {
        const status = ally.id === "hero" ? state.heroStatus : state.partyVitals[ally.id].status;
        if (!status[effect]) continue;
        const current = allies(state).find(entry => entry.id === ally.id);
        const loss = Math.min(current.health, world.ailments[effect].damage);
        if (loss) {
          changeHealth(state, ally.id, current.health - loss);
          events.push({ kind: "status", actor: ally.id, ally: ally.id, value: loss });
          note(state, ally.name + " · " + world.ailments[effect].name + " kostet " + loss + " LP.");
        }
        if (--status[effect] <= 0) delete status[effect];
      }
    }
  }

  // Beschworene Wesen greifen an und verschwinden nach ihren Runden.
  function summonsAct(state, selectedId, round) {
    const turn = state.combat;
    for (const summon of turn.diener) {
      if (!summon.schaden) continue;
      const living = turn.feinde.map((foe, id) => ({ foe, id })).filter(({ foe }) => foe.lp > 0);
      const goal = (living.find(({ id }) => id === selectedId) ?? living[0])?.id;
      if (goal === undefined) break;
      dealDamage(state, goal, summon.schaden, { round, actor: "summon" });
    }
  }

  function finishIfWon(state, result) {
    const turn = state.combat;
    if (!turn || turn.feinde.some((foe) => foe.lp > 0)) return false;
    // Fallen Held und letzter Gegner in derselben Gegnerphase (Vergeltung, Dornen), zählt es als Niederlage.
    // Früher endete der Kampf als Sieg mit 0 LP, und der Spielstand ließ sich nicht mehr laden (Simulation 2.5.4).
    if (!state.health) {
      arrive(state, "defeat");
      return true;
    }
    if (result.deathBurst) {
      const damage = Math.min(state.health, result.deathBurst);
      state.health -= damage;
      note(state, "Die Glutkäfer bersten. Die Glutwolke kostet " + damage + " LP.");
      if (!state.health) {
        arrive(state, "defeat");
        return true;
      }
    }
    const fightId = turn.id;
    const foes = turn.feinde;
    if (result.victory) markDeed(state, result.victory);
    if (people(state.faction) === "orks") state.rausch = true;
    if (result.unlock) markDeed(state, result.unlock);
    state.ressource = Math.min(vorratMax, (state.ressource ?? 0) + 1);
    if (menschen(state)) SY.moralAendern(state, result.alpha || foes.some((foe) => ["anfuehrer", "endgegner"].includes(foe.rang)) ? "bossSieg" : "sieg");
    if (result.system) systemBeute(state, result.system);
    note(state, (result.victoryText ?? "Die Begegnung ist gewonnen.") + (result.loot.length ? " Du nimmst " +
      result.loot.map((id) => world.items[id]).join(" und ") + " mit." : "") + " +1 " + resourceName(state) + ".");
    // 50 EP für die gewonnene Schlacht und 10 EP je Stufe jedes besiegten Gegners.
    const xp = kampf.ep.schlacht + foes.reduce((sum, foe) => sum + kampf.ep.gegnerJeStufe * foe.stufe, 0);
    // Zufallskämpfe können sich wiederholen. Ihre EP zählen jedes Mal.
    grant(state, "kampf-" + fightId, xp, world.battleRewards[fightId]?.[1] ?? 0, result.loot, !result.random);
    arrive(state, turn.weiter ?? result.to);
    if (turn.auftrag) auftragSieg(state, turn.auftrag, turn);
    if (turn.endgame) endgameSieg(state, turn.endgame);
    return true;
  }

  // Die Gegner handeln. Rüstung und Schutz senken jeden Treffer um die Hälfte ihres Werts, Schild fängt zuerst ab.
  function enemyPhase(state, round, stabilized = false) {
    ensureVitals(state);
    const turn = state.combat;
    const held = turn.held;
    const result = world.fights[turn.id];
    const events = round.events;
    let heroHit = false;
    let heroGuarded = false;
    let victimCursor = Math.max(0, turn.round - 1);
    const leader = turn.feinde[0];
    const special = leader.lp > 0 && turn.round > 0 && turn.round % (result.special?.intervall ?? 2) === 0 && !leader.status.schweigen && !leader.status.betaeubt &&
      !leader.status.furcht ? result.special : null;
    let lost = 0;
    let sparedByStealth = false;
    let dodged = 0;
    let treffer = 0;
    let bleedingNow = turn.bleeding > 0 ? 1 : 0;
    turn.bleeding = Math.max(0, (turn.bleeding ?? 0) - 1);
    for (const [index, foe] of turn.feinde.entries()) {
      if (foe.lp <= 0) continue;
      const status = foe.status;
      if (status.dot) {
        const tick = Math.min(foe.lp, status.dot.wert);
        foe.lp -= tick;
        events.push({ kind: "hit", actor: "dot", target: index, value: tick });
        status.dot.runden--;
        const fire = status.dot.feuer;
        if (status.dot.runden <= 0) delete status.dot;
        if (foe.lp <= 0) {
          foeFalls(state, index, fire);
          continue;
        }
      }
      let skip = false;
      if (status.betaeubt) {
        status.betaeubt--;
        if (!status.betaeubt) {
          delete status.betaeubt;
          status.immunBis = turn.round + 1;
        }
        skip = true;
      } else if (status.furcht) {
        status.furcht--;
        if (!status.furcht) delete status.furcht;
        skip = true;
      }
      if (!skip) {
        for (let action = 0; action < foe.aktionen; action++) {
          const sonder = index === 0 && action === 0 ? special : null;
          let damage = foe.schaden - (status.langsam ? 1 : 0) - (status.schwach?.wert ?? 0) + (sonder?.damage ?? 0);
          if (sonder?.deckel) damage = Math.min(damage, foe.flaecheDeckel ?? sonder.deckel);
          else if (foe.deckel) damage = Math.min(damage, foe.deckel);
          // Relikte der Gruppe: Schutz vor Feuer- und Kälteangriffen.
          if (gegnerElement[turn.id] === "feuer") damage -= reliktWert(state, "fireResistance");
          if (gegnerElement[turn.id] === "kaelte") damage = Math.round(damage * (1 - reliktWert(state, "coldDamageReduction")));
          damage = Math.max(0, Math.round(damage * schwierigkeitMod(state).gegner_schaden_faktor));
          // Köder und Wälle ziehen die Angriffe auf sich, Unsichtbare werden nicht angegriffen.
          const decoy = turn.diener.find((summon) => summon.koeder && summon.lp > 0);
          const summon = decoy ?? (held.unsichtbar > 0 || index % 2 === 1 ? turn.diener.find((entry) => entry.lp > 0) : null);
          if (summon) {
            summon.lp = Math.max(0, summon.lp - damage);
            continue;
          }
          const active = allies(state).filter(ally => ally.health > 0 && (ally.id !== "hero" || held.unsichtbar <= 0));
          if (!active.length) { sparedByStealth = true; continue; }
          // Flächenangriffe (Trampeln) treffen alle, sonst einer nach dem anderen.
          for (const victim of sonder?.flaeche ? active : [active[victimCursor++ % active.length]]) {
            const heroTarget = victim.id === "hero";
            const intervall = heroTarget && damage > 0 ? ausweichIntervall(state) : 0;
            if (intervall) {
              // Ausweichen ohne Zufall: jeder n-te Angriff auf den Helden geht ins Leere (Einsamer Wolf jeder 7., Schurken jeder 5.,
              // Patch 2.6.x: Talente, Ausrüstung und Spezialisierung verkürzen das Intervall).
              held.ausweichSchlaege = (held.ausweichSchlaege ?? 0) + 1;
              if (held.ausweichSchlaege >= intervall) {
                held.ausweichSchlaege = 0;
                held.nachAusweichen = true;
                dodged++;
                events.push({ kind: "retaliate", actor: index, ally: "hero", value: 0, ausgewichen: true });
                continue;
              }
            }
            const armor = (heroTarget ? gearBonus(state, "armor") : memberGearBonus(state, victim.id, "armor")) + reliktWert(state, "partyResistance") +
              synergieWert(state, "ruestung");
            const defense = heroTarget && round.guarding ? Math.max(6, round.ward) : round.ward;
            const guarding = defense > 0;
            let hit;
            let schildBlock = null;
            if (menschen(state)) {
              // Patch 2.2.0/2.5.1: Rüstung mindert prozentual (Konstante 14); Klassenrüstung zählt beim Helden mit.
              // Patch 2.6.2: Ungebrochener Schildwall Rang 1 +2 Rüstung; Schildwall der Krone +2; Kriegshorn des Großen Things +1 (alle).
              const klassenRuestung = (heroTarget ? (SY.daten.menschenKlassen[state.faction]?.[state.role]?.ruestung ?? 0) +
                SY.talentWirkung(state, "TREE_UNGEBROCHENER_SCHILDWALL", "armor_bonus") + (state.akte?.fspez === "FSPEC_SCHILDWALL_DER_KRONE" ? 2 : 0) +
                (klassenBalance.nahkampf.includes(state.role) ? klassenBalance.nahkampfRuestung : 0) + runenWert(state, "ruestung") +
                (held.lagerBuff?.armor_bonus ?? 0) : 2) + (state.relikt === "REL_T4_BANNER_DER_EINIGUNG" ? 1 : 0) +
                (state.gefaehrtenPerks?.includes("PERK_KR_SCHILDTREUE") ? 1 : 0);
              // Patch 2.5.3: Runen-Resonanz der Ahnen +4 % Rüstung je Rang beim Tragen von Runen- oder Glutausrüstung.
              const gesamt = (klassenRuestung + armor) * (heroTarget && resonanz(state) ? 1 + 0.04 * (state.ahnen?.perk_relic_resonance ?? 0) : 1);
              hit = damage > 0 ? Math.max(guarding ? 0 : 1, SY.schaden(damage, gesamt) - defense) : 0;
            } else {
              const reduction = Math.floor(((heroTarget ? protection(state) : 2) + armor) / 2);
              hit = Math.max(guarding ? 0 : 1, damage - reduction - defense);
            }
            // Patch 2.6.17/2.6.18: Gefährten nehmen 8 % weniger Schaden.
            if (!heroTarget && hit > 0) hit = Math.max(1, Math.round(hit * (1 - gruppenSkalierung.gefaehrtenSchutz)));
            if (heroTarget) {
              if (index === 0 && action === 0) { heroHit = true; heroGuarded = guarding; }
              if (hit > 0 && magierSchutz(state) && treffer++ > 0) hit = Math.round(hit * magierSchutzWerte.weitererTreffer);
              if (hit > 0 && thorvaldHilfeAktiv(state)) hit = Math.max(1, Math.round(hit * thorvaldHilfe.schaden));
              const absorbed = Math.min(held.schild, hit);
              held.schild -= absorbed; hit -= absorbed;
              if (absorbed) schildBlock = { schild: absorbed, rest: held.schild };
              if (hit >= state.health && held.todesschutz) {
                hit = Math.max(0, state.health - Math.max(1, held.todesschutz.lp));
                // Patch 2.6.2: Ungebrochener Schildwall Rang 3 gibt danach einen Schild von 20 % der LP.
                if (held.todesschutz.schild) held.schild += Math.round(healthLimit(state) * held.todesschutz.schild);
                held.todesschutz = null;
                note(state, "Todesschutz bewahrt dich vor dem tödlichen Treffer.");
              }
            }
            const loss = Math.min(victim.health, hit);
            changeHealth(state, victim.id, victim.health - loss);
            lost += loss;
            events.push({ kind: "retaliate", actor: index, ally: victim.id, value: loss, ...(heroTarget && schildBlock ? schildBlock : {}) });
            schildBlock = null;
            const ailment = world.enemyAilments[turn.id];
            if (ailment && !round.previousStatuses?.[victim.id]?.[ailment] && index === 0 && action === 0 && turn.round > 0 && turn.round % 2 === 0 && !guarding && victim.health - loss > 0) {
              const effects = heroTarget ? state.heroStatus : state.partyVitals[victim.id].status;
              effects[ailment] = ailment === "confused" ? 2 : 3;
              events.push({ kind: "afflict", actor: index, ally: victim.id, effect: ailment });
            }
            if (!state.health) break;
          }
          if (!state.health) break;
        }
      }
      if (status.langsam && !--status.langsam) delete status.langsam;
      if (status.schweigen && !--status.schweigen) delete status.schweigen;
      if (status.schwach && !--status.schwach.runden) delete status.schwach;
      if (status.verwundbar && !--status.verwundbar.runden) delete status.verwundbar;
    }
    turn.diener = turn.diener.filter((summon) => summon.lp > 0);
    const guarding = heroGuarded;
    const applied = special && heroHit;
    const stuns = Boolean(applied && special.stuns && !guarding);
    turn.stunned = stuns || Boolean(turn.selbstBenommen);
    delete turn.selbstBenommen;
    const startsBleeding = applied && special.bleeds && !guarding;
    if (startsBleeding) turn.bleeding = 2;
    // Willenskraft ab 16 widersteht dem Fluch der Irrglut.
    const resisted = Boolean(applied && special.drainsEmber && !guarding && modifier(heroAttributes(state).will) > 0);
    const stolenEmber = Boolean(applied && special.drainsEmber && !guarding && !resisted && state.ember > 0);
    if (stolenEmber) state.ember--;
    const bleedingLoss = Math.min(state.health, bleedingNow);
    state.health -= bleedingLoss;
    if (bleedingLoss) events.push({ kind: "status", actor: "hero", ally: "hero", value: bleedingLoss });
    const loss = lost + bleedingLoss;
    note(state, (special?.name ?? "Gegenangriff") + " · " + loss + " LP verloren." +
      (sparedByStealth ? " Unsichtbar entgehst du einem Angriff." : "") +
      (dodged ? (einsamerWolf(state) ? " Einsamer Wolf: Du weichst " : " Du weichst ") + (dodged === 1 ? "einem Angriff" : dodged + " Angriffen") + " aus." : "") +
      (stuns ? " Du bist benommen. Dein nächster Angriff ist schwächer." : "") +
      (startsBleeding ? " Die Wunde blutet zwei Runden lang." : "") +
      (stolenEmber ? " Die Irrglut entzieht dir 1 Glut." : "") +
      (resisted ? " Deine Willenskraft hält die Irrglut fern." : "") +
      (stabilized ? " Du bringst deine Glut näher ans Gleichgewicht." : "") +
      (bleedingNow ? " Die Blutung kostet 1 LP." : ""));
  }

  // Rundenende: Ausdauer und Mana füllen sich um 2, Abklingzeiten, Schild und Wirkungen laufen ab.
  function upkeep(state) {
    const turn = state.combat;
    if (!turn) return;
    const held = turn.held;
    const max = kraft(state);
    held.ausdauer = Math.min(max.ausdauer, held.ausdauer + 2);
    if (menschen(state)) {
      // Patch 2.5.3: Runen- & Glutresonanz +10 % Manaregeneration je Rang; Bruchteile sammeln sich über die Züge.
      // Patch 2.6.2: Resonanz Rang 1 +10 % (mit Runen-/Glutausrüstung), Rang 2 +1 je Zug; Eid der Ewigen Glut +10 %.
      held.ausdauer = Math.min(max.ausdauer, held.ausdauer + SY.talentWirkung(state, "TREE_RUNEN_UND_GLUTRESONANZ", "resource_regen_per_turn_bonus"));
      const regen = SY.daten.kampf.mana.jeZug * (1 + (resonanz(state) ? SY.talentWirkung(state, "TREE_RUNEN_UND_GLUTRESONANZ", "heal_and_mana_regen_pct") / 100 : 0) +
        (state.akte?.fspez === "FSPEC_EID_DER_EWIGEN_GLUT" ? 0.1 : 0)) +
        SY.talentWirkung(state, "TREE_RUNEN_UND_GLUTRESONANZ", "resource_regen_per_turn_bonus") + (held.manaRest ?? 0);
      held.manaRest = Math.round((regen - Math.floor(regen)) * 100) / 100;
      held.mana = Math.min(max.mana, held.mana + Math.floor(regen));
    } else held.mana = Math.min(max.mana, held.mana + 2);
    for (const id of Object.keys(held.abklingen)) {
      if (--held.abklingen[id] <= 0) delete held.abklingen[id];
    }
    if (held.hot) {
      healAlly(state, held.hot.ally ?? "hero", held.hot.wert, "hero", []);
      if (!--held.hot.runden) held.hot = null;
    }
    if (held.schildRunden && !--held.schildRunden) held.schild = 0;
    if (held.staerkung && !--held.staerkung.runden) held.staerkung = null;
    if (held.unsichtbar) held.unsichtbar--;
    if (held.todesschutz && held.todesschutz.runden < 99 && !--held.todesschutz.runden) held.todesschutz = null;
    if (held.bekehren) held.bekehren--;
    for (const summon of turn.diener) summon.runden--;
    turn.diener = turn.diener.filter((summon) => summon.runden > 0 && summon.lp > 0);
  }

  function validCombat(state, combat) {
    const fight = world.fights[combat?.id];
    const ambush = fight?.random && own(world.scenes, combat.weiter) && typeof (combat.hinterhalt ?? false) === "boolean";
    if (!fight || (!ambush && world.scenes[state.scene].creature !== combat.id)) return false;
    if (combat.auftrag !== undefined && !(combat.auftrag === "haupt" ? state.hauptquest
      : /^(?:zweig|akt4):/.test(combat.auftrag) ? isRecord(state.akte)
      : state.weltAuftraege?.[combat.auftrag]?.status === "aktiv")) return false;
    if (combat.gegnerStufe !== undefined && !intBetween(combat.gegnerStufe, 1, 30)) return false;
    const held = combat.held;
    const max = kraft(state);
    const status = (value) => isRecord(value);
    return intBetween(combat.round, 0, Number.MAX_SAFE_INTEGER) && typeof combat.stunned === "boolean" &&
      intBetween(combat.bleeding ?? 0, 0, 2) &&
      Array.isArray(combat.supportUsed) && combat.supportUsed.every((id) => state.party.includes(id)) &&
      new Set(combat.supportUsed).size === combat.supportUsed.length &&
      Array.isArray(combat.feinde) && combat.feinde.length >= 1 && combat.feinde.length <= 6 &&
      combat.feinde.every((foe) => isRecord(foe) && typeof foe.name === "string" && own(kampf.raenge, foe.rang) &&
        intBetween(foe.stufe, 1, 30) && intBetween(foe.max, 1, 10000) && intBetween(foe.lp, 0, foe.max) &&
        intBetween(foe.schaden, 0, 100) && intBetween(foe.aktionen, 1, 3) && Array.isArray(foe.tags) && status(foe.status)) &&
      combat.feinde.some((foe) => foe.lp > 0) &&
      Array.isArray(combat.diener) && combat.diener.length <= kampf.maxDiener &&
      combat.diener.every((summon) => isRecord(summon) && intBetween(summon.lp, 0, 100) && intBetween(summon.runden, 0, 10)) &&
      isRecord(held) && intBetween(held.ausdauer, 0, max.ausdauer) && intBetween(held.mana, 0, max.mana) &&
      intBetween(held.schild, 0, 1000) && isRecord(held.abklingen) && Array.isArray(held.genutzt);
  }

  // Summiert einen Ausrüstungswert über alle belegten Plätze (Waffe, Rüstung, Nebenhand, Schmuck).
  function gearBonus(state, key) {
    return equipmentSlots.reduce((total, slot) => total + aufgewertet(state, state.equipment?.[slot], world.gear[state.equipment?.[slot]]?.[key] ?? 0), 0);
  }
  // Schmiede (Ökonomie-Datei): +1 bis +4 erhöhen Schaden und Rüstung um 15/30/50/75 %.
  function aufgewertet(state, id, wert) {
    const stufe = state.aufwertung?.[id] ?? 0;
    return stufe && wert ? Math.round(wert * (1 + SY.daten.schmiede.stufen[stufe - 1].statBonusPercent / 100)) : wert;
  }

  function weapon(state) {
    return state.equipment?.weapon ?? "faeuste";
  }

  function route(state, target) {
    if (state.combat || !state.health || !own(world.destinations, target)) return null;
    const current = world.scenes[state.scene].map;
    const queue = [{ scene: state.scene, stops: [current], first: null }];
    const seen = new Set([state.scene]);
    for (const step of queue) {
      if (step.stops.at(-1) === target) return step;
      for (const option of choices({ ...state, scene: step.scene })) {
        if (!option.destination || seen.has(option.to)) continue;
        // Before Eiswacht, only offer the next in-story leg. Do not plan through unresolved quests.
        if (step.first && !world.travelScenes[step.stops.at(-1)]?.includes(step.scene)) continue;
        seen.add(option.to);
        const stops = step.stops.at(-1) === option.destination ? step.stops : [...step.stops, option.destination];
        queue.push({ scene: option.to, stops, first: step.first ?? option.id });
      }
    }
    return null;
  }

  // Einmalige Umschulung für Spielstände aus der Zeit vor dem Klassensystem.
  // Volk und Herkunft bleiben, Fraktion, Klasse, Grundwerte und Fertigkeiten werden neu gewählt.
  function retrain(previous, faction, role, build) {
    if (!previous.umschulung || previous.combat || !previous.health) return previous;
    if (!own(K.fraktionen, faction) || originOf(faction) !== previous.origin) throw new Error("Die Fraktion muss zu deiner Herkunft passen.");
    const setup = { ...structuredClone(build), spez: null, meister: null };
    const problem = buildProblem(faction, role, setup, previous.training);
    if (problem) throw new Error(problem);
    const state = structuredClone(previous);
    Object.assign(state, { faction, role, build: setup, umschulung: false });
    const weapon = kit(state).weapon;
    const overflow = state.inventory.includes(weapon) ? [] : receive(state, [weapon], false);
    // Die Startwaffe der alten Klasse weicht der Startwaffe der neuen. Gefundene Waffen bleiben angelegt.
    if (state.inventory.includes(weapon) &&
        (!state.equipment.weapon || state.equipment.weapon === kit(previous).weapon)) state.equipment.weapon = weapon;
    state.health = Math.max(1, Math.min(healthLimit(state), state.health + healthLimit(state) - healthLimit(previous)));
    state.ember = Math.min(emberLimit(state), Math.max(0, state.ember + emberLimit(state) - emberLimit(previous)));
    note(state, "Du bist nun " + title(state) + " (" + K.fraktionen[faction].name + "). Deine bisherige Reise und Beute bleiben erhalten.");
    noteOverflow(state, overflow);
    return state;
  }

  function ending(state) {
    const roadClear = state.marks.includes("keiler-erlegt") || state.marks.includes("keiler-vertrieben");
    const forestClear = state.marks.includes("woelfe-besiegt") || state.marks.includes("woelfe-vertrieben");
    const fordClear = state.marks.includes("kraehen-besiegt") || state.marks.includes("kraehen-vertrieben");
    let field = roadClear
      ? "Der Ackerweg ist frei. Die Fuhrleute können das Korn auf dem direkten Weg zur Furt bringen."
      : "Der Keiler hält den Ackerweg. Die Fuhrleute warten auf einen sicheren Umweg.";
    if (forestClear) {
      field = "Der Keiler bleibt auf dem Acker. Die Fuhrleute können den freien Wagenweg durch den Eichenwald bei Heidvang nehmen.";
    }
    const ford = fordClear
      ? "Die Fährfrau öffnet die Furt wieder."
      : "Die Krähen sind noch am Ufer. Die Fährfrau hält den Übergang geschlossen.";
    const delivery = (roadClear || forestClear) && fordClear;
    return { field, ford, delivery };
  }

  // Wirkende Effekte für das Charakterfenster. Liest nur den Spielstand und ändert keine Regel.
  // art: "gut" (Vorteil), "schlecht" (Nachteil) oder "hinweis"; dauer beschreibt, wie lange er anhält.
  function effects(state) {
    const list = [];
    const add = (id, name, art, text, dauer) => list.push({ id, name, art, text, dauer });
    const fight = state.combat;
    for (const [id, turns] of Object.entries(state.heroStatus ?? {})) {
      const effect = world.ailments[id];
      add(id, effect.name, "schlecht", effect.damage ? effect.damage + " LP Schaden je Kampfrunde." :
        "Angriffs- und Zauberaktionen setzen aus. Klartrank entfernt den Effekt.",
        "Noch " + turns + (turns === 1 ? " Runde" : " Runden"));
    }
    if (!state.health) add("gefallen", "Gefallen", "schlecht", "Deine Lebenspunkte sind aufgebraucht.", "Bis zum Neubeginn");
    if (fight?.stunned) add("benommen", "Benommen", "schlecht", "Dein nächster Waffenangriff verursacht 2 Schaden weniger.", "Nächster Zug");
    if (fight?.bleeding > 0) {
      add("blutung", "Blutung", "schlecht", "Jede Runde kostet 1 LP. Ein Gefährte mit Wundpflege kann sie stoppen.",
        fight.bleeding === 1 ? "Noch 1 Runde" : "Noch " + fight.bleeding + " Runden");
    }
    if (fight?.held?.schild) add("schild", "Schild", "gut", "Fängt " + fight.held.schild + " Schaden ab.", "Noch " + fight.held.schildRunden + " Runden");
    if (fight?.held?.unsichtbar) add("unsichtbar", "Unsichtbar", "gut", "Gegner greifen dich nicht an. Endet mit deinem ersten Angriff.", "Noch " + fight.held.unsichtbar + " Runden");
    if (fight?.held?.staerkung) add("staerkung", "Gestärkt", "gut", "+" + fight.held.staerkung.wert + " Schaden.", "Noch " + fight.held.staerkung.runden + " Runden");
    if (state.rausch) add("kampfrausch", "Kampfrausch", "gut", "+2 Schaden beim nächsten Angriff.", "Nächster Angriff");
    if (Math.abs(state.balance) >= 2) {
      const richtung = state.balance > 0 ? "Zerstörung (Angriffszauber)" : "Erneuerung (Schützen, Binden, Heilen)";
      add("glut-unruhig", "Unruhige Glut", "schlecht", "Der nächste Zauber Richtung " + richtung + " löst einen Rückstoß aus. Deckung beruhigt die Glut.",
        "Bis die Glut zur Mitte findet");
    }
    // Patch 2.6.13: „Glut erschöpft“ nur für Helden mit Glutgabe (Kronreich und Freie Häfen haben Glut 0, aber keine Gabe).
    if (glutgabe(state) && state.ember < 1) add("glut-erschoepft", "Glut erschöpft", "schlecht", "Ohne Glut sind keine Glutfähigkeiten möglich. Glutfunken und Glutampullen füllen sie auf.", "Bis zur Auffüllung");
    if (state.marks.includes("steinrhythmus")) {
      add("steinrhythmus", "Rhythmus der Glut", "gut", "Ein Rückstoß der Glut kostet nur 3 statt 6 LP.", "Dauerhaft");
    }
    if (modifier(heroAttributes(state).will) > 0) {
      add("fester-wille", "Fester Wille", "gut", "Deine Willenskraft widersteht dem Glutentzug der Irrglut.", "Dauerhaft");
    }
    const gear = gearStats(state);
    const parts = [["armor", "Rüstung"], ["magic", "Glutschaden"], ["travel", "List unterwegs"], ["pierce", "Durchschlag"],
      ["airborne", "gegen Flieger"]].filter(([key]) => gear[key]).map(([key, label]) => "+" + gear[key] + " " + label);
    if (parts.length) add("ausruestung", "Ausrüstung", "gut", parts.join(" · ") + ".", "Solange angelegt");
    const points = trainingLeft(state);
    if (points > 0) add("stufenpunkte", "Stufenaufstieg", "hinweis", points + (points === 1 ? " Grundwertpunkt" : " Grundwertpunkte") + " zu verteilen.", "Bis verteilt");
    if (state.umschulung) add("umschulung", "Umschulung offen", "hinweis", "Dein Held kann einmal an das neue Klassensystem angepasst werden.", "Einmalig");
    return list;
  }

  function moorConsequences(state) {
    const marks = state.marks;
    const bridge = marks.includes("moorpassage-offen")
      ? "Die Fährfrau gibt den markierten Bohlenweg bei Tageslicht frei."
      : "Der Bohlenweg bleibt gesperrt. Reisende müssen den trockenen Umweg nehmen.";
    let news = "Die Wache in Eiswacht erhält eine Warnung über die Lichter am Bohlenweg.";
    if (marks.includes("beleg-uebergeben")) {
      news = "Der Glutfunke liegt dem Bericht bei. In Eiswacht soll ihn die Wache untersuchen.";
    } else if (marks.includes("beleg-behalten")) {
      news = "Der Glutfunke ist in deinem Inventar. Eiswacht erhält zunächst deinen Bericht.";
    }
    return { bridge, news, messengers: marks.includes("boten-unterwegs") };
  }

  return { awardXp, abilities, abilityState: (state, id) => state.combat ? abilityState(state, id).reason : "nur im Kampf", kampfwerte, kraft,
    gegnerAufstellung: lineup, faehigkeitSteigern, faehigkeitGrund, faehigkeitInfo, grundwertGrenze,
    level, resourceName, combatSkill, create, read, setRelikt, reliktGrund, reliktStand, preis, choices, unequip, wegwerfen, wegwerfGrund, equipmentSlots, slotKinds, targetSlot, gearStats, equipPreview, gearBonus, bagSlots, category, slotsUsed, fits, storageSite, storageOpen, canStore, canRetrieve,
    store, retrieve, isQuestItem: id => questItems.has(id), bagLimit, bagUpgrade, upgradeBag, belt, setBelt, quickUse, beltSize,
    stackLimit, itemCap, hire, hireCost, compatible, memberLevel, setTravelDice, canEvade, travelEncounter, choose, route, retrain, specialize, ascend, weapon, equip, use, canUse, strike,
    attributes, baseAttributes, defaultBuild, suggestSkills, buildProblem, skillLimits, skillPoints, cap, modifier, originOf, profile,
    className, title, gearSkill, heroSkills, heroLimits, modifiers, skillValue, protection,
    memberHealthLimit, memberVitals, allies, memberEquipment, assigned, progression, train, trade, candidates, recruit, dismiss, targets,
    questEntries, questPlans, partyLimit, poolLimit, poolInfo, inReserve, inTrupp, tauschGrund, synergien, attitude, questReady, completeQuest, paySalary, craft, relationship, reputation, recruitment, promise, bondActions, bondWith,
    healthLimit, startFight, emberLimit, heroAttributes, ending, moorConsequences, effects,
    weltLeisten, leistenNamen, leistenStart, gegenkraefte, niederlagen, vorratMax, vorratStart, seewegSilber, vorratAnwerbung,
    vertragKosten, ertragMenge, ertragPause, weltRunde, aktuellerKnoten, weltOffen, betreteWelt, handlungHier, zurHandlung,
    reiseGrund, reiseZiele, reise, rastGrund, rastKosten, handelOffen,
    spezBereit, spezHinweis, meisterBereit, taten, tatWaehlen, ausruester, ausruesterHandel, ausruestungGrund, handwerkListe, handwerk, schmiedeInfo, schmieden, runenListe, runeEinpraegen, kontorInfo, kontorHandel, nahrungTragen, spenden, lage, systeme: SY, glutgabe, resonanz, kasseVollText,
    siedlungInfo, siedlungAusbauen, gebaeudeBauen, strasseBauen, garnisonRekrutieren, ortReparieren, wiederaufbau,
    endgameListe, endgameStarten, aufstiegInfo, talentLernen, ahnenLernen,
    akteInfo, zweigWeiter, zweigGrund, fspezWaehlen, fspezGrund, fspezText, akt4Weiter, akt4Grund, armadaInfo, ausweichIntervall, kritChance, effektText, lagerSzeneInfo, lagerAntwort, lagerVorteile,
    auftragGrund, auftragAnnehmen, ausfuehrenGrund, auftragAusfuehren, abgabeGrund, auftragAbgeben, rueckkehrZiele, marschRoute,
    marschVignette, rueckmarsch, marschDaten: MARSCH, ortReise, ortGate: ORTGATE,
    schwierigkeitsGrad, schwierigkeitGrund, schwierigkeitWaehlen, permadeath, hardcoreFrei, schwierigkeitDaten: SCHWIERIG, aushang, auftraege, hauptquest, hauptGrund, hauptWeiter, auftragEp, rast, ertragGrund, ertragEinholen, vertragGrund, vertragSchliessen, entwurf,
    levelThresholds: Array.from({ length: kampf.maxStufe }, (_, index) => kampf.epFuer(index + 1)) };
})();
