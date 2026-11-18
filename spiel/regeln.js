"use strict";

const rules = (() => {
  const version = 3;
  const K = klassen;
  // Ausrüstungsplätze: rechte Hand (weapon), linke Hand (offhand), Kopf, Hals, Körper (armor), Beine, zwei Ringe.
  // Die Schlüssel weapon und armor bleiben wegen bestehender Spielstände erhalten.
  const equipmentSlots = ["weapon", "offhand", "head", "neck", "armor", "legs", "ring1", "ring2"];
  const slotKinds = { weapon: "weapon", offhand: "offhand", head: "head", neck: "neck", armor: "armor", legs: "legs",
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
  function buildProblem(faction, role, build, training = {}) {
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
    if (Object.values(values).some((value) => value > K.regeln.grundwertMax)) return "Kein Grundwert darf über 20 steigen.";
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

  function create(name, faction, appearance, variant, role = "krieger", build = null) {
    const cleanName = name.trim();
    if (!own(K.fraktionen, faction) || !K.klassenFolge.includes(role)) throw new Error("Wähle Volk, Fraktion und Klasse.");
    const origin = originOf(faction);
    if (!cleanName || cleanName.length > 40 ||
        !["mann", "frau"].includes(appearance) || !intBetween(variant, 0, origin === "untot" ? 1 : 3)) {
      throw new Error("Bitte gib einen Namen ein und wähle ein Porträt.");
    }
    const setup = build ?? defaultBuild(faction, role);
    const problem = buildProblem(faction, role, setup);
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
      party: [], companionEquipment: {}, partyVitals: {}, heroStatus: {}, companionXp: {},
      rucksack: 0, guertel: Array(beltSize).fill(null),
      relationships: {}, factionRuf: {}, companionQuests: {}, crafted: [], questClock: 0, questLog: {},
      marks: [], journal: [], combat: null,
    };
    state.health = healthLimit(state);
    state.ember = emberLimit(state);
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
    state.vereinigt ??= false;
    state.umschulung ??= false;
    state.rausch ??= false;
    state.storage ??= [];
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
    create(state.name, state.faction, state.appearance, state.variant, state.role, state.build);
    const combat = state.combat;
    const validList = (value, check, limit) => Array.isArray(value) && value.length <= limit && value.every(check);
    if (state.origin !== originOf(state.faction) ||
        !isRecord(state.training) ||
        !Object.entries(state.training).every(([id, value]) => own(K.grundwerte, id) && intBetween(value, 0, 5)) ||
        buildProblem(state.faction, state.role, state.build, state.training) ||
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
        !validRecord(state.weltAuftraege, auftragIndex, entry => isRecord(entry) && ["aktiv", "erledigt"].includes(entry.status) &&
          intBetween(entry.wahl, 0, 1)) ||
        !Object.entries(state.weltAuftraege).every(([id, entry]) => entry.wahl < auftragIndex[id].spiel.lohn.length) ||
        (state.hauptquest !== null && !(hauptPlan[state.faction] && isRecord(state.hauptquest) &&
          intBetween(state.hauptquest.schritt, 0, hauptPlan[state.faction].length) &&
          (state.hauptquest.wahl === null || own(wahlFolgen, state.hauptquest.wahl)) &&
          (state.hauptquest.schritt < hauptPlan[state.faction].length || state.hauptquest.wahl !== null))) || ((state.scene === "weltende") !== (state.niederlage !== null)) ||
        !validList(state.rewards, (id) => typeof id === "string" && id.length <= 50, 100) ||
        !validList(state.party, (id) => own(world.companions, id), 5) ||
        new Set(state.party).size !== state.party.length ||
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
        const fresh = lineup(state.combat.id, state.party.length, state.combat.gegnerStufe ?? null);
        state.combat.feinde = state.combat.feinde.slice(0, fresh.length).map((foe, index) =>
          ({ ...foe, max: fresh[index].max, lp: Math.min(foe.lp, fresh[index].max) }));
        // Ein entfallender Gegnerplatz darf einen laufenden Kampf nicht ohne Ziel lassen.
        if (!state.combat.feinde.some(foe => foe.lp > 0)) state.combat.feinde[state.combat.feinde.length - 1].lp = 1;
        state.combat.supportUsed = (state.combat.supportUsed ?? []).filter(id => state.party.includes(id));
      }
      note(state, "Maximal drei Begleiter: " + waiting.map(id => world.companions[id].name).join(", ") +
        " warten am Wachhof. Ihre Ausrüstung liegt im Gruppenvorrat.");
    }
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
  const mercenaryHere = (state, companion) => Boolean(companion.soeldner && storageSite(state) &&
    companion.soeldner.orte.includes(sceneMap(state)));
  function candidates(state) {
    if (state.combat || !state.health) return [];
    return Object.entries(world.companions).filter(([id, companion]) =>
      companion.klasse !== state.role && !state.party.includes(id) &&
      (companion.soeldner ? mercenaryHere(state, companion)
        : companion.auftrag ? state.scene === "weltknoten" && state.knoten === companion.knoten && companion.fraktion === state.faction
        : companion.scenes.includes(state.scene)));
  }

  // Errata 9: Volksgrenzen. Untote nehmen keine Lebenden auf und umgekehrt, Orks und Zwerge reisen nie zusammen.
  // Die Story-Gefährten bleiben über ihren Schwur für alle erreichbar (Henry, 17. 11. 2026).
  const memberPeople = (id) => world.companions[id].volk ?? "menschen";
  function peopleClash(a, b) {
    return (a === "untote") !== (b === "untote") || (a === "orks" && b === "zwerge") || (a === "zwerge" && b === "orks");
  }
  function compatible(state, id) {
    const companion = world.companions[id];
    if (!companion.soeldner && !companion.gesandter) return true;
    const volk = memberPeople(id);
    return !peopleClash(people(state.faction), volk) && state.party.every(member => !peopleClash(memberPeople(member), volk));
  }
  // Anwerbegebühr mit Charisma-Rabatt: 16–19 senkt um 10 %, 20 um 20 %.
  function hireCost(state, id, fest = null) {
    const base = fest ?? world.companions[id]?.soeldner?.kosten ?? 0;
    const presence = heroAttributes(state).presence;
    return Math.round(base * (presence >= 20 ? 0.8 : presence >= 16 ? 0.9 : 1));
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
    state.party.push(id);
    state.companionXp ??= {};
    state.companionXp[id] = Math.max(state.companionXp[id] ?? 0, memberStartXp(state));
    ensureVitals(state);
  }

  function recruit(previous, id) {
    if (previous.party.length >= partyLimit || !candidates(previous).some(([candidate]) => candidate === id) ||
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
    if (previous.party.length >= partyLimit || !candidates(previous).some(([candidate]) => candidate === id) ||
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
  function progression(state) {
    const stufe = kampf.stufeAus(state.xp);
    return { level: stufe, xp: state.xp, next: stufe < kampf.maxStufe ? kampf.epFuer(stufe + 1) : null,
      floor: kampf.epFuer(stufe), points: trainingLeft(state) };
  }
  const trainingLeft = (state) => state.stufenpunkte ?? 0;
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
  const healthLimit = (state) => kampf.lebenspunkte(profile(state.faction, state.role), kampf.stufeAus(state.xp ?? 0));
  const legacyHealthLimit = (state) => 18 + heroAttributes(state).strength + 2 * state.build.fertigkeiten.verteidigung;
  const emberLimit = (state) => 1 + Math.floor(heroAttributes(state).will / 3);
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
        heroAttributes(previous)[id] >= K.regeln.grundwertMax) return previous;
    const state = structuredClone(previous);
    state.training[id] = (state.training[id] ?? 0) + 1;
    state.stufenpunkte--;
    state.health += healthLimit(state) - healthLimit(previous);
    state.ember += emberLimit(state) - emberLimit(previous);
    note(state, K.grundwerte[id] + " dauerhaft um 1 erhöht.");
    return state;
  }

  // Spezialisierung ab Quest-Stufe 3: Titel, +1 Fertigkeitspunkt, +1 Grundwert. Die Wahl gilt für immer.
  function specialize(previous, variante, grundwert, fertigkeit) {
    if (previous.build.spez || previous.questStufe < K.regeln.spezialisierungStufe || previous.combat || !previous.health ||
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
    if (!previous.build.spez || previous.build.meister || !previous.vereinigt || previous.combat || !previous.health ||
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
    const price = prices[id];
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

  // Werte des Helden mit der aktuellen oder einer probeweise geänderten Ausrüstung.
  function gearStats(state, equipment = state.equipment) {
    const preview = { ...state, equipment };
    const weaponId = weapon(preview);
    const held = world.gear[weaponId];
    return {
      damage: held.power + damageValue(state, gearSkill(held)), pierce: held.pierce ?? 0, armor: gearBonus(preview, "armor"),
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
    } else if (supply.heal) healAlly(state, targetId, supply.heal, "hero", events);
    if (supply.ember) state.ember = Math.min(emberLimit(state), state.ember + supply.ember);
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
    return options.filter((choice) =>
      (!choice.origin || choice.origin === state.origin) &&
      (!choice.emberCost || state.ember >= choice.emberCost) &&
      (!choice.requires || hasMarks(state, choice.requires, "every")) &&
      !hasMarks(state, choice.excludes, "some") &&
      (!choice.requiresItem || state.inventory.includes(choice.requiresItem)) &&
      (!choice.faction || reputation(state, choice.faction[0]) >= choice.faction[1]) &&
      conditionMet(state, choice.condition)
    );
  }

  function chooseStep(previous, id, dice = Math.random) {
    const choice = choices(previous).find((item) => item.id === id);
    if (!choice) return previous;
    const state = structuredClone(previous);
    if (choice.check) {
      const [key, target] = choice.check;
      const bonus = skillValue(state, key) + (state.marks.includes(choice.advantage) ? 2 : 0) +
        (key === "list" ? gearBonus(state, "travel") : 0);
      const roll = 1 + Math.floor(dice() * 20);
      const passed = roll + bonus >= target;
      note(state, K.fertigkeiten[key].name + " " + roll + " + " + bonus + " gegen " + target + ". " +
        (passed ? choice.pass : choice.fail));
      if (passed && choice.item) receive(state, [choice.item]);
      if (passed && choice.mark) markDeed(state, choice.mark);
      if (passed || !choice.fight) {
        arrive(state, choice.to);
        return state;
      }
    } else {
      if (choice.mark) markDeed(state, choice.mark);
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
        if (cast(state, -2)) {
          markDeed(state, choice.emberRescue === true ? "joren-gerettet" : choice.emberRescue);
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
      const bonus = skillValue(state, key);
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
      (skillValue(state, "list") >= 3 || ["spaeher", "schurke"].includes(state.role)));
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
    const grund = leistenFolge.find((id) => leiste(state, id) >= 100) ?? ((state.ressource ?? 0) <= 0 ? "vorrat" : null);
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

  // Seewege brauchen einen Hafen am Abfahrtsort, der dir gehört oder einem Vertragspartner.
  function schiffBereit(state, ort) {
    return ort.hatHafen && (ort.fraktion === state.faction || (state.vertraege ?? []).includes(ort.fraktion));
  }

  function reiseGrund(state, zielId) {
    if (state.scene !== "weltknoten" || state.combat || !state.health) return "nur in der Weltreise";
    const ort = N.get(state.knoten);
    const weg = N.verbindung(state.knoten, zielId);
    if (!ort || !weg) return "keine Verbindung";
    if (weg.kantenTyp === "seeweg") {
      if (!schiffBereit(state, ort)) {
        return ort.hatHafen ? "kein Schiff: Handelsvertrag mit " + K.fraktionen[ort.fraktion].name + " nötig" : "kein Hafen";
      }
      if (state.silver < weg.kostenGold) return "zu wenig Silber";
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
        auftrag: wegAuftrag(state, state.knoten, weg.zielId) };
    });
  }

  // Reisebegegnungen auf Kanten des Knotennetzes. Werte gibt es bisher nur für die Tiere der Menschenlande.
  const jaegerNachFraktion = { kronreich: ["jagd-galgenkraehe", "jagd-grauwolf"], orden: ["jagd-grauwolf"], haefen: ["jagd-galgenkraehe"] };
  function knotenBegegnung(state, weg, ziel) {
    const table = world.encounterTables[weg.sicherheit === "kernland" ? "kernland" : "grenzland"];
    const roll = Math.floor(travelDice() * 100);
    let summe = 0;
    const kind = table.find(([weight]) => roll < (summe += weight))?.[1] ?? "ruhig";
    const pick = (list) => list[Math.floor(travelDice() * list.length) % list.length];
    if (kind === "ruhig") {
      note(state, "Unterwegs: " + pick(weg.sicherheit === "grenzland" ? [...world.quietTexts, ...world.rumorTexts] : world.quietTexts));
      return;
    }
    if (kind === "scheu") {
      const key = skillValue(state, "fernkampf") > skillValue(state, "list") ? "fernkampf" : "list";
      const dice = 1 + Math.floor(travelDice() * 20);
      const bonus = skillValue(state, key);
      const passed = dice + bonus >= 12;
      note(state, "Unterwegs kreuzt ein scheues Tier den Weg. " + K.fertigkeiten[key].name + " " + dice + " + " + bonus + " gegen 12. " +
        (passed ? "Du sammelst am Wegrand Galgenwurz, während es äst." : "Das Tier flieht ins Unterholz."));
      if (passed) receive(state, ["galgenwurz"]);
      return;
    }
    const pool = weg.kantenTyp === "seeweg" ? null : jaegerNachFraktion[ziel.fraktion];
    if (!pool) {
      note(state, weg.kantenTyp === "seeweg"
        ? "Unterwegs: Fremde Segel folgen euch bis zum Abend. Dann dreht das Schiff ab."
        : "Unterwegs: Frische Spuren eines Jägers kreuzen den Weg. Ihr umgeht sein Revier im Bogen.");
      return;
    }
    const fight = travelDice() < 0.1 ? pick(world.encounterPools.alpha) : pick(pool);
    note(state, "Hinterhalt unterwegs: " + world.fights[fight].name + "!");
    startFight(state, fight);
    if (state.combat) Object.assign(state.combat, { weiter: "weltknoten", hinterhalt: true });
    else if (!state.health) arrive(state, "defeat");
  }

  function reiseStep(previous, zielId) {
    if (reiseGrund(previous, zielId)) return previous;
    const state = structuredClone(previous);
    const weg = N.verbindung(state.knoten, zielId);
    const ziel = N.get(zielId);
    const von = state.knoten;
    state.ressource -= wegKosten(state, von, weg);
    state.silver -= weg.kostenGold;
    if (weg.kostenGold) note(state, "Überfahrt nach " + ziel.name + " · " + weg.kostenGold + " Silber.");
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
    state.knoten = zielId;
    weltRunde(state);
    if (pruefeNiederlage(state)) return state;
    note(state, "Ankunft in " + ziel.name + " (" + N.typNamen[ziel.typ] + ", " + K.fraktionen[ziel.fraktion].name + ").");
    const unterwegs = wegAuftrag(state, von, zielId);
    if (unterwegs) {
      const auftrag = auftragIndex[unterwegs];
      auftragKampfStarten(state, auftrag.spiel.gegner, unterwegs, auftrag.ort, "Unterwegs auf " + auftrag.spiel.weg + " · " + auftrag.titel);
      return state;
    }
    knotenBegegnung(state, weg, ziel);
    return state;
  }
  const reise = (...args) => timedAction(args[0], reiseStep(...args));

  // Rast im Hub: volle LP, Glut und Zustände der Gruppe. Kostet 1 Fraktionsvorrat und darf ihn nicht aufbrauchen.
  function rastGrund(state) {
    if (state.scene !== "weltknoten" || state.combat || !state.health) return "nur in der Weltreise";
    if ((state.ressource ?? 0) <= 1) return "zu wenig " + resourceName(state);
    return null;
  }
  function rast(previous) {
    if (rastGrund(previous)) return previous;
    const state = structuredClone(previous);
    state.ressource -= 1;
    state.health = healthLimit(state);
    state.ember = emberLimit(state);
    state.heroStatus = {};
    ensureVitals(state);
    for (const id of state.party) state.partyVitals[id] = { health: memberHealthLimit(id, state), status: {} };
    note(state, "Ihr rastet in " + N.get(state.knoten).name + ". Alle sind wieder bei Kräften · −1 " + resourceName(state) + ".");
    return state;
  }

  // Dörfer der eigenen Fraktion liefern ihren Ertrag. Danach braucht das Dorf 10 Runden, bis es wieder liefert.
  function ertragGrund(state) {
    if (state.scene !== "weltknoten" || state.combat || !state.health) return "nur in der Weltreise";
    const ort = N.get(state.knoten);
    if (ort.typ !== "dorf") return "nur in Dörfern";
    if (ort.fraktion !== state.faction) return "nur in Dörfern der eigenen Fraktion";
    const zuletzt = state.ertraege?.[ort.id];
    if (zuletzt !== undefined && state.runde - zuletzt < ertragPause) return "wieder bereit in " + (ertragPause - (state.runde - zuletzt)) + " Runden";
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
  if (NQ) for (const fraktion of ["kronreich", "orden"]) {
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

  // Gegner der Aufträge. Wo es den Gegner schon gibt, gelten seine Werte, sein Bild und sein Zusatzangriff.
  const auftragKampf = (typ) => "auftrag-" + typ;
  const gleicherGegner = { grauwoelfe: "grauwolf", galgenkraehen: "galgenkraehe", glutkaefer: "glutkaefer", keiler: "keiler",
    flussschnapper: "schnapper", netzweberin: "netzweberin", irrglut: "irrglut", moorschlinger: "moorschlinger",
    diealte: "moorschlinger", graufang: "grauwolf", frostbaer: "frostbaer", deserteure: "deserteure" };
  const aehnlicherGegner = { wegelagerer: "deserteure", schmuggler: "deserteure", spione: "deserteure", kultisten: "deserteure",
    kulthauptmann: "deserteure", orkvortrupp: "nacht-kronreich", urgash: "nacht-kronreich", aschenkraehen: "galgenkraehe",
    skarn: "frostbaer", aschenmammut: "keiler", letztermammut: "keiler" };
  const menschenGegner = new Set(["kultisten", "schmuggler", "spione", "deserteure", "wegelagerer", "orkvortrupp", "kulthauptmann", "urgash"]);
  // Kapitän Urgash führt nur die Vorhut der Rostsegel. Er kämpft als Elite, damit Akt 1 auch allein fair bleibt
  // (Kampfdokument: ein einzelner Held schafft 1 Elite, ein Anführer braucht eine Gruppe).
  const auftragGegner = { ...(NQ?.daten.gegnerTypen ?? {}),
    urgash: { name: "Kapitän Urgash", rang: "elite" } };
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
    world.fights[id] = { gegner: { rang: gegner.rang, stufe: 1, ...(gegner.anzahl ? { anzahl: gegner.anzahl } : {}) },
      name: gegner.name, loot: [], random: true, special: { ...special }, alpha: Boolean(gegner.alpha),
      victoryText: "Der Kampf ist gewonnen." };
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
    nordwacht_q10: ["malte", "Malte hat den Wachturm gehalten, bis du kamst. Die Signalhörner bläst er nicht mehr allein."],
  };
  const begleiterNachAuftrag = {};
  if (NQ) for (const fraktion of ["kronreich", "orden"]) for (const begleiter of NQ.reihe(fraktion)?.begleiter ?? []) {
    const [id, introduction] = begleiterTexte[begleiter.auftrag] ?? [];
    if (!id || !auftragIndex[begleiter.auftrag]) continue;
    begleiterNachAuftrag[begleiter.auftrag] = id;
    world.companions[id] = { klasse: begleiter.klasse, name: begleiter.name, volk: "menschen", scenes: [], ...klassenWerte[begleiter.klasse],
      auftrag: begleiter.auftrag, knoten: begleiter.ort, fraktion,
      place: N.get(begleiter.ort).name + " · nach dem Auftrag „" + auftragIndex[begleiter.auftrag].titel + "“",
      introduction, ability: begleiter.faehigkeit };
  }

  // Hauptquest Akt 1. Die Texte kommen aus der Fraktionsreihe, die Orte und Gegner legt der Plan fest.
  const hauptPlan = {
    kronreich: [
      { schritt: 0, ort: "kronhall" },
      { schritt: 1, ort: "hagenfels", gegner: "deserteure" },
      { schritt: 2, ort: "westvik", wahl: true },
    ],
    orden: [
      { schritt: 0, ort: "glutberg" },
      { schritt: 1, ort: "lichtheim", gegner: "kultisten", titel: "Wachs aus Lichtheim",
        text: "Im Bienental bei Lichtheim haben Kultisten das geweihte Wachs verdorben. Sie lauern noch zwischen den Stöcken." },
      { schritt: 1, ort: "brandstein", gegner: "runenfresser", titel: "Schwefel aus Brandstein",
        text: "In der Schwefelgrube bei Brandstein frisst ein Runenfresser die geweihten Steine. Ohne Schwefel bleiben die Runenbecken kalt." },
      { schritt: 2, ort: "glutberg", wahl: true },
    ],
  };
  // Folgen der Wahl am Ende von Akt 1 (Gemini). Freischaltungen und spätere Folgen werden als Marke gespeichert.
  const wahlFolgen = {
    kron_act1_fight: { gegner: "urgash", leisten: { orks: -5 } },
    kron_act1_truce: { silber: 40 },
    orden_act1_mercy: { vorrat: 10 },
    orden_act1_wrath: { leisten: { untote: -5 } },
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
    if (state.knoten !== auftrag.ort) return "Aushang in " + N.get(auftrag.ort).name;
    if (!NQ.stufenFuer(auftrag.ort, state.faction)) return "nur für Helden des eigenen Volkes";
    const eintrag = state.weltAuftraege?.[id];
    if (eintrag) return eintrag.status === "erledigt" ? "erledigt" : "angenommen";
    if (!intBetween(wahl, 0, auftrag.spiel.lohn.length - 1)) return "unbekannte Belohnung";
    return null;
  }

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

  function auftragAbschliessen(state, id) {
    const auftrag = auftragIndex[id];
    const lohn = auftragsLohn(state, id);
    state.weltAuftraege[id].status = "erledigt";
    note(state, "Auftrag erfüllt: " + auftrag.titel + ".");
    const folgen = [];
    if (lohn.vorrat) {
      state.ressource = Math.max(1, Math.min(vorratMax, state.ressource + lohn.vorrat));
      folgen.push((lohn.vorrat > 0 ? "+" : "") + lohn.vorrat + " " + resourceName(state));
    }
    for (const [leisteId, wert] of Object.entries(lohn.leisten)) {
      setzeLeiste(state, leisteId, leiste(state, leisteId) + wert);
      folgen.push(leistenNamen[leisteId] + " " + (wert > 0 ? "+" : "") + wert);
    }
    if (lohn.vermerke.length) folgen.push("vermerkt: " + lohn.vermerke.join(", "));
    if (folgen.length) note(state, folgen.join(" · ") + ".");
    grant(state, "auftrag-" + id, auftragEp, lohn.silber, lohn.gegenstaende, false);
    const begleiter = begleiterNachAuftrag[id];
    if (begleiter) {
      const companion = world.companions[begleiter];
      note(state, companion.klasse === state.role
        ? companion.name + " dankt dir. Mit dir zieht schon jemand dieser Klasse, deshalb bleibt " + companion.name + " in " + N.get(companion.knoten).name + "."
        : companion.name + " wartet in " + N.get(companion.knoten).name + " auf dich. Im Hofstaat kannst du " + companion.name + " in die Gruppe aufnehmen.");
    }
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
    return (NQ.fuerOrt(state.knoten)?.auftraege ?? []).map(auftrag => ({ ...auftragIndex[auftrag.id],
      status: state.weltAuftraege?.[auftrag.id]?.status ?? null, wahl: state.weltAuftraege?.[auftrag.id]?.wahl ?? null,
      grund: auftragGrund(state, auftrag.id), ausfuehren: ausfuehrenGrund(state, auftrag.id),
      begleiter: begleiterNachAuftrag[auftrag.id] ?? null }));
  }
  function auftraege(state, status = "aktiv") {
    return Object.entries(state.weltAuftraege ?? {}).filter(([, eintrag]) => eintrag.status === status)
      .map(([id, eintrag]) => ({ ...auftragIndex[id], wahl: eintrag.wahl, status, ausfuehren: ausfuehrenGrund(state, id) }));
  }

  function hauptquest(state) {
    if (!hauptPlan[state.faction] || !hauptAkt(state.faction)) return null;
    const stand = hauptStand(state);
    const akt = hauptAkt(state.faction);
    const fertig = stand.schritt >= hauptPlan[state.faction].length;
    return { akt: akt.nr, titel: akt.titel, stufen: akt.stufen, fertig, wahl: stand.wahl,
      schritt: fertig ? null : hauptInfo(state.faction, stand.schritt), grund: fertig ? "abgeschlossen" : hauptGrund(state) };
  }

  function hauptGrund(state, wahlId = null) {
    const plan = hauptPlan[state.faction];
    if (!plan || !hauptAkt(state.faction)) return "keine Hauptquest";
    if (!imHub(state)) return "nur in der Weltreise";
    const stand = hauptStand(state);
    if (stand.schritt >= plan.length) return "abgeschlossen";
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
    if (folge.vorrat) state.ressource = Math.min(vorratMax, state.ressource + folge.vorrat);
    for (const [leisteId, wert] of Object.entries(folge.leisten ?? {})) setzeLeiste(state, leisteId, leiste(state, leisteId) + wert);
    note(state, option.label + ": " + option.folge);
    if (!state.marks.includes(stand.wahl)) state.marks.push(stand.wahl);
    stand.schritt = hauptPlan[state.faction].length;
    state.questStufe = Math.max(state.questStufe, 1);
    note(state, "Akt " + hauptAkt(state.faction).nr + ", „" + hauptAkt(state.faction).titel + "“, ist abgeschlossen. Akt 2 wird noch gebaut.");
    grant(state, "akt1-" + state.faction, kampf.ep.questakt);
  }

  // Sieg in einem Auftrags- oder Hauptquestkampf.
  function auftragSieg(state, auftrag) {
    if (auftrag === "haupt") {
      const stand = state.hauptquest;
      if (hauptPlan[state.faction]?.[stand.schritt]?.wahl) aktAbschliessen(state);
      else hauptVoran(state);
    } else if (state.weltAuftraege?.[auftrag]?.status === "aktiv") auftragAbschliessen(state, auftrag);
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

  const level = (state) => kampf.stufeAus(state.xp);
  const kraft = (state) => {
    const stufe = level(state);
    const extra = Math.floor((stufe - 1) / 2);
    const magie = K.fraktionen[state.faction].magie ? state.build.fertigkeiten.magie : 0;
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
    const list = kampf.klassenFaehigkeiten(state.faction, state.role).map((f) => ({
      ...f, frei: stufe >= f.stufe,
      spezialisiert: (spez === "a" && f.stufe === 6) || (spez === "b" && f.stufe === 10),
    }));
    if (state.build.meister) {
      for (const f of kampf.meisterFaehigkeiten(state.faction, state.role)) list.push({ ...f, frei: stufe >= f.stufe, spezialisiert: false });
    }
    return list.map((f) => ({
      ...f,
      kostenWert: f.kosten ? Math.max(1, f.kosten - intelligenzRabatt(state)) : 0,
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
    const pool = f.zahlung === "M" ? held.mana : held.ausdauer;
    if (pool < f.kostenWert) return { f, reason: "zu wenig " + (f.zahlung === "M" ? "Mana" : "Ausdauer") };
    // Der Fraktionsvorrat sinkt im Kampf nie unter 1 (Henry, 17. 11. 2026).
    if ((f.ressource ?? 0) && (state.ressource ?? 0) - f.ressource < 1) return { f, reason: "zu wenig " + resourceName(state) };
    return { f, reason: null };
  }

  // Gegnerstufe und Rang einer Begegnung. Gruppen erhalten je Gefährte einen Mitläufer mehr,
  // Einzelgegner 25 % mehr LP je Gefährte.
  function lineup(id, size, stufe = null) {
    const fight = world.fights[id];
    const spec = stufe ? { ...fight.gegner, stufe } : fight.gegner;
    const group = world.enemyGroups[id];
    const creature = world.creatures[id];
    const geschick = 8 + (creature.stats[3] ?? 5);
    const count = (spec.anzahl ?? 1) + (group ? Math.min(size, 6 - (spec.anzahl ?? 1)) : 0);
    return Array.from({ length: count }, (_, index) => {
      const values = kampf.gegnerWerte(spec.rang, spec.stufe, 1 + size);
      const lp = group ? values.lp : Math.round(values.lp * (1 + 0.25 * size));
      const name = index === 0 ? (group?.leader ?? fight.name ?? creature.name) : group.ally + " " + index;
      return { name, rang: spec.rang, stufe: spec.stufe, lp, max: lp, schaden: values.schaden, aktionen: values.aktionen,
        geschick, tags: spec.tags ?? [], status: {} };
    });
  }

  function startFight(state, id, opening = true, stufe = null) {
    const max = kraft(state);
    const combat = {
      id, round: 0, stunned: false, bleeding: 0, supportUsed: [],
      feinde: lineup(id, state.party.length, stufe), diener: [],
      held: { ausdauer: max.ausdauer, mana: max.mana, schild: 0, schildRunden: 0, unsichtbar: 0, naechster: 0,
        staerkung: null, hot: null, todesschutz: null, abklingen: {}, genutzt: [], mine: false, bekehren: 0 },
    };
    state.combat = combat;
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
        (["ember", "restore"].includes(action) && previous.ember < 1)) return previous;
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
      const damage = role.attack.power + damageValue(state, role.attack.skill) + (result.emberBonus ?? 0) + gearBonus(state, "magic") + rage;
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
    const value = Math.min(foe.lp, amount + (foe.status.verwundbar?.wert ?? 0));
    foe.lp -= value;
    if (fire && round) round.usedFire = true;
    round?.events.push({ kind: "hit", actor, target: id, value });
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
    const resourceCost = (ability.ressource ?? 0) + (boosted ? 1 : 0);
    state.ressource = (state.ressource ?? 0) - resourceCost;
    if (ability.einmal) held.genutzt.push(ability.id);
    if (ability.abklingzeitWert) held.abklingen[ability.id] = ability.abklingzeitWert + 1;
    const factor = (ability.spezialisiert ? 1 + kampf.spezVerstaerkung : 1) * (boosted ? 1 + kampf.ressourceVerstaerkung : 1);
    const invisibleBefore = held.unsichtbar > 0;
    const skill = combatSkill(state, ability.zahlung);
    const bonus = skillValue(state, skill) + (ability.zahlung === "M" ? gearBonus(state, "magic") : 0);
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
    if (r.heilung) {
      const amount = scaled(r.heilung, factor) + Math.max(0, skillValue(state, healSkill(state)));
      parts.push(healAlly(state, round.allyId ?? "hero", amount, "hero", events) + " LP geheilt");
    }
    if (r.hot) {
      held.hot = { wert: scaled(r.hot.wert, factor), runden: r.hot.runden, ally: round.allyId ?? "hero" };
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
        const damage = (member.damage ? member.damage + (weaponGear?.power ?? 0) + (weaponGear?.magic ?? 0) : 0) +
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
    note(state, (result.victoryText ?? "Die Begegnung ist gewonnen.") + (result.loot.length ? " Du nimmst " +
      result.loot.map((id) => world.items[id]).join(" und ") + " mit." : "") + " +1 " + resourceName(state) + ".");
    // 50 EP für die gewonnene Schlacht und 10 EP je Stufe jedes besiegten Gegners.
    const xp = kampf.ep.schlacht + foes.reduce((sum, foe) => sum + kampf.ep.gegnerJeStufe * foe.stufe, 0);
    // Zufallskämpfe können sich wiederholen. Ihre EP zählen jedes Mal.
    grant(state, "kampf-" + fightId, xp, world.battleRewards[fightId]?.[1] ?? 0, result.loot, !result.random);
    arrive(state, turn.weiter ?? result.to);
    if (turn.auftrag) auftragSieg(state, turn.auftrag);
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
    const special = leader.lp > 0 && turn.round > 0 && turn.round % 2 === 0 && !leader.status.schweigen && !leader.status.betaeubt &&
      !leader.status.furcht ? result.special : null;
    let lost = 0;
    let sparedByStealth = false;
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
          let damage = foe.schaden - (status.langsam ? 1 : 0) - (status.schwach?.wert ?? 0) +
            (index === 0 && action === 0 ? special?.damage ?? 0 : 0);
          damage = Math.max(0, damage);
          // Köder und Wälle ziehen die Angriffe auf sich, Unsichtbare werden nicht angegriffen.
          const decoy = turn.diener.find((summon) => summon.koeder && summon.lp > 0);
          const summon = decoy ?? (held.unsichtbar > 0 || index % 2 === 1 ? turn.diener.find((entry) => entry.lp > 0) : null);
          if (summon) {
            summon.lp = Math.max(0, summon.lp - damage);
            continue;
          }
          const active = allies(state).filter(ally => ally.health > 0 && (ally.id !== "hero" || held.unsichtbar <= 0));
          if (!active.length) { sparedByStealth = true; continue; }
          const victim = active[victimCursor++ % active.length];
          const heroTarget = victim.id === "hero";
          const armor = heroTarget ? gearBonus(state, "armor") : memberGearBonus(state, victim.id, "armor");
          const reduction = Math.floor(((heroTarget ? protection(state) : 2) + armor) / 2);
          const defense = heroTarget && round.guarding ? Math.max(6, round.ward) : round.ward;
          const guarding = defense > 0;
          let hit = Math.max(guarding ? 0 : 1, damage - reduction - defense);
          if (heroTarget) {
            if (index === 0 && action === 0) { heroHit = true; heroGuarded = guarding; }
            const absorbed = Math.min(held.schild, hit);
            held.schild -= absorbed; hit -= absorbed;
            if (hit >= state.health && held.todesschutz) {
              hit = Math.max(0, state.health - Math.max(1, held.todesschutz.lp));
              held.todesschutz = null;
              note(state, "Todesschutz bewahrt dich vor dem tödlichen Treffer.");
            }
          }
          const loss = Math.min(victim.health, hit);
          changeHealth(state, victim.id, victim.health - loss);
          lost += loss;
          events.push({ kind: "retaliate", actor: index, ally: victim.id, value: loss });
          const ailment = world.enemyAilments[turn.id];
          if (ailment && !round.previousStatuses?.[victim.id]?.[ailment] && index === 0 && action === 0 && turn.round > 0 && turn.round % 2 === 0 && !guarding && victim.health - loss > 0) {
            const effects = heroTarget ? state.heroStatus : state.partyVitals[victim.id].status;
            effects[ailment] = ailment === "confused" ? 2 : 3;
            events.push({ kind: "afflict", actor: index, ally: victim.id, effect: ailment });
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
      (sparedByStealth ? " Unsichtbar entgehst du den Angriffen." : "") +
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
    held.mana = Math.min(max.mana, held.mana + 2);
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
      : state.weltAuftraege?.[combat.auftrag]?.status === "aktiv")) return false;
    if (combat.gegnerStufe !== undefined && !intBetween(combat.gegnerStufe, 1, 20)) return false;
    const held = combat.held;
    const max = kraft(state);
    const status = (value) => isRecord(value);
    return intBetween(combat.round, 0, Number.MAX_SAFE_INTEGER) && typeof combat.stunned === "boolean" &&
      intBetween(combat.bleeding ?? 0, 0, 2) &&
      Array.isArray(combat.supportUsed) && combat.supportUsed.every((id) => state.party.includes(id)) &&
      new Set(combat.supportUsed).size === combat.supportUsed.length &&
      Array.isArray(combat.feinde) && combat.feinde.length >= 1 && combat.feinde.length <= 6 &&
      combat.feinde.every((foe) => isRecord(foe) && typeof foe.name === "string" && own(kampf.raenge, foe.rang) &&
        intBetween(foe.stufe, 1, 20) && intBetween(foe.max, 1, 10000) && intBetween(foe.lp, 0, foe.max) &&
        intBetween(foe.schaden, 0, 100) && intBetween(foe.aktionen, 1, 3) && Array.isArray(foe.tags) && status(foe.status)) &&
      combat.feinde.some((foe) => foe.lp > 0) &&
      Array.isArray(combat.diener) && combat.diener.length <= kampf.maxDiener &&
      combat.diener.every((summon) => isRecord(summon) && intBetween(summon.lp, 0, 100) && intBetween(summon.runden, 0, 10)) &&
      isRecord(held) && intBetween(held.ausdauer, 0, max.ausdauer) && intBetween(held.mana, 0, max.mana) &&
      intBetween(held.schild, 0, 1000) && isRecord(held.abklingen) && Array.isArray(held.genutzt);
  }

  // Summiert einen Ausrüstungswert über alle belegten Plätze (Waffe, Rüstung, Nebenhand, Schmuck).
  function gearBonus(state, key) {
    return equipmentSlots.reduce((total, slot) => total + (world.gear[state.equipment?.[slot]]?.[key] ?? 0), 0);
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
    if (state.ember < 1) add("glut-erschoepft", "Glut erschöpft", "schlecht", "Ohne Glut sind keine Glutfähigkeiten möglich. Glutfunken und Glutampullen füllen sie auf.", "Bis zur Auffüllung");
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
    level, resourceName, combatSkill, create, read, choices, unequip, equipmentSlots, slotKinds, targetSlot, gearStats, equipPreview, gearBonus, bagSlots, category, slotsUsed, fits, storageSite, storageOpen, canStore, canRetrieve,
    store, retrieve, isQuestItem: id => questItems.has(id), bagLimit, bagUpgrade, upgradeBag, belt, setBelt, quickUse, beltSize,
    stackLimit, itemCap, hire, hireCost, compatible, memberLevel, setTravelDice, canEvade, travelEncounter, choose, route, retrain, specialize, ascend, weapon, equip, use, canUse, strike,
    attributes, baseAttributes, defaultBuild, suggestSkills, buildProblem, skillLimits, skillPoints, cap, modifier, originOf, profile,
    className, title, gearSkill, heroSkills, heroLimits, modifiers, skillValue, protection,
    memberHealthLimit, memberVitals, allies, memberEquipment, assigned, progression, train, trade, candidates, recruit, dismiss, targets,
    questEntries, questPlans, partyLimit, attitude, questReady, completeQuest, paySalary, craft, relationship, reputation, recruitment, promise, bondActions, bondWith,
    healthLimit, emberLimit, heroAttributes, ending, moorConsequences, effects,
    weltLeisten, leistenNamen, leistenStart, gegenkraefte, niederlagen, vorratMax, vorratStart, seewegSilber, vorratAnwerbung,
    vertragKosten, ertragMenge, ertragPause, weltRunde, aktuellerKnoten, weltOffen, betreteWelt, handlungHier, zurHandlung,
    reiseGrund, reiseZiele, reise, rastGrund, handelOffen,
    auftragGrund, auftragAnnehmen, ausfuehrenGrund, auftragAusfuehren, aushang, auftraege, hauptquest, hauptGrund, hauptWeiter, auftragEp, rast, ertragGrund, ertragEinholen, vertragGrund, vertragSchliessen, entwurf,
    levelThresholds: Array.from({ length: kampf.maxStufe }, (_, index) => kampf.epFuer(index + 1)) };
})();
