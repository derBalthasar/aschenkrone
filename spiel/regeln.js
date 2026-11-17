"use strict";

const rules = (() => {
  const version = 2;
  const K = klassen;
  // Ausrüstungsplätze: rechte Hand (weapon), linke Hand (offhand), Kopf, Hals, Körper (armor), Beine, zwei Ringe.
  // Die Schlüssel weapon und armor bleiben wegen bestehender Spielstände erhalten.
  const equipmentSlots = ["weapon", "offhand", "head", "neck", "armor", "legs", "ring1", "ring2"];
  const slotKinds = { weapon: "weapon", offhand: "offhand", head: "head", neck: "neck", armor: "armor", legs: "legs",
    ring1: "ring", ring2: "ring" };
  const emptyEquipment = () => Object.fromEntries(equipmentSlots.map(slot => [slot, null]));
  const partyLimit = 3;
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
      version, name: cleanName, faction, origin, appearance, variant, role, scene: "wake",
      build: structuredClone({ ...setup, spez: setup.spez ?? null, meister: setup.meister ?? null }),
      questStufe: 0, vereinigt: false, umschulung: false, rausch: false,
      health: 0, ember: 0, balance: 0, inventory: [weapon, "lederwams", "galgenwurz"],
      equipment: { ...emptyEquipment(), weapon, armor: "lederwams" },
      storage: [],
      xp: 0, silver: 5, training: {}, rewards: [],
      party: [], companionEquipment: {},
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
    const state = { ...old, version, faction, origin: originOf(faction), role, build, training,
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
      state.health = Math.max(1, Math.min(healthLimit(state), Math.round(state.health / oldLimit * healthLimit(state))));
    }
    if (Number.isInteger(state.ember)) state.ember = Math.min(state.ember, emberLimit(state));
    return state;
  }

  function read(serialized) {
    let state = JSON.parse(serialized);
    if (!state || typeof state.name !== "string") throw new Error("Unbekanntes Spielstandformat.");
    if (state.version === 1) {
      if (!Object.hasOwn(state, "balance")) state.balance = 0;
      state = migrate(state);
    }
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
        trainingLeft(state) < 0 ||
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
        !validList(state.inventory, (id) => own(world.items, id) && id !== "faeuste", 200) ||
        !validList(state.storage, (id) => own(world.items, id) && id !== "faeuste", storageLimit) ||
        !state.equipment || !equipmentSlots.every((slot) => {
          const id = state.equipment[slot];
          return id === null || (own(world.gear, id) && world.gear[id].slot === slotKinds[slot] &&
            wornCount(state, id) <= state.inventory.filter(entry => entry === id).length);
        }) ||
        !validRecord(state.companionEquipment, world.companions, equipment => equipment &&
          ["weapon", "armor"].every(slot => equipment[slot] === null ||
            (own(world.gear, equipment[slot]) && world.gear[equipment[slot]].slot === slot))) ||
        !Object.keys(state.companionEquipment).every(id => state.party.includes(id)) ||
        Object.keys(world.gear).some(id => assigned(state, id) > state.inventory.filter(item => item === id).length) ||
        !validList(state.marks, (id) => typeof id === "string" && id.length <= 40, 100) ||
        !validList(state.journal, (entry) => typeof entry === "string" && entry.length <= 300, 16) ||
        (state.health === 0) !== (state.scene === "defeat") ||
        (combat !== null && (!own(world.fights, combat?.id) ||
          world.scenes[state.scene].creature !== combat.id ||
          !validFormation(combat, state.party.length) ||
          !intBetween(combat.round, 0, Number.MAX_SAFE_INTEGER) ||
          !intBetween(combat.bleeding ?? 0, 0, 2) ||
          !validList(combat.supportUsed ?? [], (id) => state.party.includes(id), 5) ||
          new Set(combat.supportUsed ?? []).size !== (combat.supportUsed ?? []).length ||
          typeof combat.stunned !== "boolean"))) {
      throw new Error("Der Spielstand ist beschädigt.");
    }
    if (state.party.length > partyLimit) {
      const waiting = state.party.splice(partyLimit);
      for (const id of waiting) if (state.companionEquipment) delete state.companionEquipment[id];
      if (state.combat) {
        const lineup = formation(state.combat.id, partyLimit);
        if (state.combat.max !== undefined) {
          state.combat.health = Math.min(state.combat.health, lineup.max);
          state.combat.max = lineup.max;
          state.combat.extras = lineup.extras.map((hp, index) => Math.min(hp, state.combat.extras[index] ?? 0));
          // Ein entfallender Gegnerplatz darf einen laufenden Kampf nicht ohne Ziel lassen.
          if (!state.combat.health && !state.combat.extras.some(hp => hp > 0)) {
            state.combat.extras[state.combat.extras.length - 1] = 1;
          }
        }
        state.combat.supportUsed = (state.combat.supportUsed ?? []).filter(id => state.party.includes(id));
      }
      note(state, "Maximal drei Begleiter: " + waiting.map(id => world.companions[id].name).join(", ") +
        " warten am Wachhof. Ihre Ausrüstung liegt im Gruppenvorrat.");
    }
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

  function candidates(state) {
    if (state.combat || !state.health) return [];
    return Object.entries(world.companions).filter(([id, companion]) =>
      companion.klasse !== state.role && !state.party.includes(id) && companion.scenes.includes(state.scene));
  }

  function attitude(state, id) {
    const view = world.companionAttitudes[id];
    if (view?.blocked?.includes(state.origin)) return "blocked";
    if (view?.wary?.includes(state.origin) && reputation(state, view.faction) < view.reputation) return "wary";
    return "open";
  }

  function recruitment(state, id) {
    if (!own(world.companions, id)) return "refused";
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
    if (!own(world.recipes, id) || previous.combat || !previous.health || previous.inventory.length >= 200 ||
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

  function recruit(previous, id) {
    if (previous.party.length >= partyLimit || !candidates(previous).some(([candidate]) => candidate === id) ||
        recruitment(previous, id) !== "ready") return previous;
    const state = structuredClone(previous);
    state.party.push(id);
    note(state, world.companions[id].name + " schließt sich deiner Gruppe an.");
    return state;
  }

  function bondActions(state, id) {
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
    if (previous.scene !== "watch-yard" || previous.combat || !previous.health || !previous.party.includes(id)) return previous;
    const state = structuredClone(previous);
    state.party = state.party.filter(member => member !== id);
    if (state.companionEquipment) delete state.companionEquipment[id];
    note(state, world.companions[id].name + " verlässt die Gruppe und kehrt zum Treffpunkt zurück.");
    return state;
  }

  const thresholds = [0, 75, 175, 285, 410, 560];
  function progression(state) {
    const level = thresholds.filter(value => value <= state.xp).length;
    return { level, xp: state.xp, next: thresholds[level] ?? null, floor: thresholds[level - 1], points: trainingLeft(state) };
  }
  function trainingLeft(state) {
    const earned = thresholds.filter(value => value <= state.xp).length - 1;
    return earned - Object.values(state.training).reduce((total, value) => total + value, 0);
  }
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
  const healthLimit = (state) => 18 + heroAttributes(state).strength + 2 * state.build.fertigkeiten.verteidigung;
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

  function grant(state, id, xp, silver = 0, items = []) {
    if (state.rewards.includes(id)) return;
    const previousLevel = progression(state).level;
    state.rewards.push(id);
    state.xp += xp;
    state.silver += silver;
    const overflow = receive(state, items, false);
    const parts = [];
    if (xp) parts.push(xp + " EP");
    if (silver) parts.push(silver + " Silber");
    parts.push(...items.map(item => world.items[item]));
    const level = progression(state).level;
    if (parts.length) note(state, parts.join(" · ") +
      (level > previousLevel ? ". Stufe " + level + " erreicht. Du kannst einen Grundwert steigern." : "."));
    noteOverflow(state, overflow);
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

  function trade(previous, id, buying) {
    if (previous.scene !== "supply-post" || previous.combat || !previous.health) return previous;
    const prices = buying ? world.shop : world.salePrices;
    if (!own(prices, id)) return previous;
    const price = prices[id];
    const index = previous.inventory.indexOf(id);
    if (!buying && assigned(previous, id) >= previous.inventory.filter(item => item === id).length) return previous;
    if (buying ? previous.silver < price || previous.inventory.length >= 180 : index === -1) return previous;
    const state = structuredClone(previous);
    if (!buying) state.inventory.splice(index, 1);
    state.silver += buying ? -price : price;
    note(state, world.items[id] + (buying ? " gekauft" : " verkauft") + " · " + price + " Silber.");
    if (buying) receive(state, [id]);
    return state;
  }

  function memberEquipment(state, member) {
    return state.companionEquipment?.[member] ?? { weapon: null, armor: null };
  }

  function assigned(state, id) {
    return [state.equipment, ...Object.values(state.companionEquipment ?? {})]
      .reduce((count, equipment) => count + (equipment ? Object.values(equipment).filter(item => item === id).length : 0), 0);
  }

  function equipMember(previous, id, member) {
    const gear = world.gear[id];
    if (!gear?.slot || previous.combat || !previous.health || !previous.inventory.includes(id) ||
        (member !== null && !previous.party.includes(member))) return previous;
    const current = member === null ? previous.equipment : memberEquipment(previous, member);
    if (current[gear.slot] !== id && assigned(previous, id) >= previous.inventory.filter(item => item === id).length) return previous;
    const state = structuredClone(previous);
    const equipment = member === null ? state.equipment :
      ((state.companionEquipment ??= {})[member] ??= { weapon: null, armor: null });
    equipment[gear.slot] = equipment[gear.slot] === id ? null : id;
    note(state, (member === null ? state.name : world.companions[member].name) + ": " + world.items[id] +
      (equipment[gear.slot] ? " ausgerüstet." : " abgelegt."));
    return state;
  }

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
  function equip(previous, id, wanted = null) {
    if (own(world.companions, wanted)) return equipMember(previous, id, wanted);
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
  const bagSlots = 20;
  const storageLimit = 400;
  const questItems = new Set(Object.values(world.scenes).flatMap(scene => (scene.choices ?? []).map(choice => choice.requiresItem))
    .filter(id => id && !own(world.supplies, id) && !own(world.gear, id)));

  function category(id) {
    const slot = world.gear[id]?.slot;
    if (slot) return slot;
    if (own(world.supplies, id)) return "supply";
    if (questItems.has(id)) return "quest";
    return "trophy";
  }

  function slotsUsed(state) {
    return new Set(state.inventory.filter(id => !questItems.has(id))).size;
  }

  function fits(state, id) {
    return questItems.has(id) || state.inventory.includes(id) || slotsUsed(state) < bagSlots;
  }

  // Legt neue Gegenstände in den Rucksack. Ist er voll, bringt ein Bote sie ins Lager. Nichts geht verloren.
  function receive(state, items, announce = true) {
    const overflow = [];
    for (const id of items) {
      if (fits(state, id) && state.inventory.length < 200) state.inventory.push(id);
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
    return world.storageSites[world.scenes[state.scene]?.map] ?? null;
  }

  function storageOpen(state) {
    return Boolean(!state.combat && state.health > 0 && storageSite(state));
  }

  function canStore(state, id) {
    return storageOpen(state) && state.inventory.includes(id) && !questItems.has(id) && state.storage.length < storageLimit;
  }

  function canRetrieve(state, id) {
    return storageOpen(state) && state.storage.includes(id) && fits(state, id) && state.inventory.length < 200;
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

  function canUse(state, id) {
    const supply = world.supplies[id];
    return Boolean(supply && state.health > 0 && state.inventory.includes(id) &&
      ((supply.heal && state.health < healthLimit(state)) || (supply.ember && state.ember < emberLimit(state))));
  }

  function consume(state, id) {
    const supply = world.supplies[id];
    state.inventory.splice(state.inventory.indexOf(id), 1);
    if (supply.heal) state.health = Math.min(healthLimit(state), state.health + supply.heal);
    if (supply.ember) state.ember = Math.min(emberLimit(state), state.ember + supply.ember);
    note(state, world.items[id] + " verwendet.");
  }

  function use(previous, id) {
    if (!canUse(previous, id)) return previous;
    if (previous.combat) return strike(previous, "herb", Math.random, id);
    const state = structuredClone(previous);
    consume(state, id);
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
      if (choice.item) receive(state, [choice.item]);
      if (choice.consume) state.inventory.splice(state.inventory.indexOf(choice.consume), 1);
      if (choice.recover) state.health = Math.min(healthLimit(state), state.health + choice.recover);
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
    if (choice.fight) {
      const lineup = formation(choice.fight, state.party.length);
      state.combat = { id: choice.fight, health: world.creatures[choice.fight].stats[0],
        round: 0, stunned: false, bleeding: 0 };
      if (state.party.length) Object.assign(state.combat, { health: lineup.max, ...lineup });
    } else {
      arrive(state, choice.to);
    }
    return state;
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

  function formation(id, size) {
    const group = world.enemyGroups[id];
    const base = world.creatures[id].stats[0];
    return {
      max: Math.ceil(base * (1 + size * (group ? .12 : .32))),
      extras: Array.from({ length: group && size ? Math.min(3, 1 + Math.floor(size / 2)) : 0 },
        () => group.health + Math.floor(size / 2)),
    };
  }

  function validFormation(combat, size) {
    const expected = formation(combat.id, size);
    if (combat.extras === undefined && combat.max === undefined) {
      return intBetween(combat.health, 1, world.creatures[combat.id].stats[0]);
    }
    return combat.max === expected.max && Array.isArray(combat.extras) &&
      combat.extras.length === expected.extras.length &&
      combat.extras.every((hp, index) => intBetween(hp, 0, expected.extras[index])) &&
      intBetween(combat.health, 0, combat.max) && (combat.health > 0 || combat.extras.some(hp => hp > 0));
  }

  function targets(state) {
    const fight = state.combat;
    if (!fight) return [];
    const foe = world.creatures[fight.id];
    const group = world.enemyGroups[fight.id];
    const extraMax = formation(fight.id, state.party.length).extras;
    return [
      { id: 0, name: group?.leader ?? world.fights[fight.id].name ?? foe.name, health: fight.health, max: fight.max ?? foe.stats[0] },
      ...(fight.extras ?? []).map((health, index) =>
        ({ id: index + 1, name: group.ally + " " + (index + 1), health, max: extraMax[index] })),
    ];
  }

  function strikeStep(previous, action, dice = Math.random, supply = "galgenwurz", targetId, events = []) {
    const fight = previous.combat;
    if (!fight || !["spear", "ember", "restore", "guard", "herb", "flee", "torch"].includes(action) ||
        (action === "torch" && !world.fights[fight.id].regeneration) ||
        (["ember", "restore"].includes(action) && previous.ember < 1)) return previous;
    const available = targets(previous).filter(enemy => enemy.health > 0);
    const selected = targetId === undefined ? available[0] : available.find(enemy => enemy.id === targetId);
    if (!selected) return previous;
    const state = structuredClone(previous);
    const foe = world.creatures[fight.id];
    const result = world.fights[fight.id];
    const [, attack, armor, speed] = foe.stats;
    const role = kit(state);
    const turn = state.combat;
    // Orks: Nach einer gewonnenen Schlacht trägt sie der Kampfrausch durch den ersten Angriff der nächsten.
    const rage = state.rausch && ["spear", "ember", "torch"].includes(action) ? 2 : 0;
    if (rage) {
      state.rausch = false;
      note(state, "Kampfrausch: +2 Schaden.");
    }
    let ward = 0;
    let stabilized = false;
    let usedFire = false;
    const living = () => targets(state).filter(enemy => enemy.health > 0);
    function hit(amount, actor = "hero") {
      if (amount <= 0) return;
      const enemies = living();
      const enemy = enemies.find(entry => entry.id === selected.id) ?? enemies[0];
      if (!enemy) {
        events.push({ kind: "cover", actor });
        return;
      }
      const damage = Math.min(enemy.health, amount);
      if (enemy.id === 0) turn.health -= damage;
      else turn.extras[enemy.id - 1] -= damage;
      events.push({ kind: "hit", actor, target: enemy.id, value: damage });
      if (actor !== "hero") {
        note(state, world.companions[actor].name + " trifft " + enemy.name + " für " + damage + " Schaden.");
      }
    }
    turn.round++;
    if (action === "flee") {
      const roll = 1 + Math.floor(dice() * 20);
      const target = 8 + Math.floor(speed / 2);
      if (roll + skillValue(state, "list") >= target) {
        note(state, "Du entkommst und setzt deinen Weg fort.");
        if (result.escape && !state.marks.includes(result.escape)) state.marks.push(result.escape);
        arrive(state, result.retreatTo ?? result.to);
        return state;
      }
      note(state, "Der Fluchtversuch scheitert.");
    } else if (action === "herb") {
      if (!canUse(state, supply)) return previous;
      const before = state.health;
      consume(state, supply);
      if (state.health > before) events.push({ kind: "heal", actor: "hero", value: state.health - before });
    } else if (action === "ember" && cast(state, 2)) {
      usedFire = true;
      const damage = role.attack.power + damageValue(state, role.attack.skill) + (result.emberBonus ?? 0) +
        gearBonus(state, "magic") + rage;
      hit(damage);
      note(state, role.attack.name + " verursacht " + damage + " Schaden.");
    } else if (action === "restore" && cast(state, -2)) {
      ward = role.restore.guard ?? 0;
      if (role.restore.heal) {
        const healing = Math.min(role.restore.heal, healthLimit(state) - state.health);
        state.health += healing;
        if (healing) events.push({ kind: "heal", actor: "hero", value: healing });
        note(state, role.restore.name + " stellt " + healing + " LP wieder her.");
      } else {
        hit(role.restore.hinder ?? 0);
        note(state, role.restore.name + " schwächt den Gegenangriff.");
      }
    } else if (action === "spear") {
      const weaponId = weapon(state);
      const equippedWeapon = world.gear[weaponId];
      const pierce = weaponId === "speer" ? (result.spearPierce ?? 0) : (equippedWeapon.pierce ?? 0);
      const range = fight.id === "felsgreif" ? (equippedWeapon.airborne ?? 0) : 0;
      const damage = Math.max(1, equippedWeapon.power + damageValue(state, gearSkill(equippedWeapon)) + range + rage +
        Math.floor(dice() * 4) -
        Math.max(0, (armor ?? 0) - pierce) - (fight.stunned ? 2 : 0));
      hit(damage);
      note(state, world.items[weaponId] + " trifft für " + damage + " Schaden.");
    } else if (action === "torch") {
      usedFire = true;
      ward = 7;
      const damage = 6 + damageValue(state, "nahkampf") + rage;
      hit(damage);
      note(state, "Die Fackel verursacht " + damage + " Schaden. Der Troll weicht vor dem Feuer zurück und heilt in dieser Runde nicht.");
    } else if (action === "guard") {
      stabilized = state.balance !== 0;
      state.balance -= Math.sign(state.balance);
    }

    if (!state.health) {
      arrive(state, "defeat");
      return state;
    }
    if (!events.some(event => event.actor === "hero")) {
      events.push({ kind: "cover", actor: "hero" });
    }
    const assisted = [];
    for (const id of state.party) {
      const member = world.companions[id];
      const equipment = memberEquipment(state, id);
      const weaponGear = world.gear[equipment.weapon];
      const ready = !(turn.supportUsed ?? []).includes(id);
      const wounded = state.health <= healthLimit(state) - (member.heal ?? 0) || (member.cleanse && turn.bleeding > 0);
      const special = ready && (member.heal ? wounded : member.guard ? turn.round % 2 === 0 : true);
      if (special && living().length) {
        (turn.supportUsed ??= []).push(id);
        ward = Math.max(ward, member.guard ?? 0);
        usedFire ||= Boolean(member.fire);
        const healing = Math.min(healthLimit(state) - state.health, member.heal ?? 0);
        state.health += healing;
        if (member.cleanse) turn.bleeding = 0;
        hit((member.damage ? member.damage + (weaponGear?.power ?? 0) + (weaponGear?.magic ?? 0) : 0) + (fight.id === "felsgreif" ? (member.airborne ?? 0) : 0), id);
        if (healing) events.push({ kind: "heal", actor: id, value: healing });
        else if (!member.damage) events.push({ kind: "cover", actor: id });
        assisted.push(member.name + " (" + member.ability + ")");
      } else {
        hit(3 + Math.floor((member.damage ?? 0) / 4) + (weaponGear?.power ?? 0) +
          (fight.id === "felsgreif" ? (weaponGear?.airborne ?? 0) : 0), id);
      }
    }
    if (assisted.length) note(state, "Unterstützung: " + assisted.join(", ") + ".");
    const current = state.combat;
    if (!living().length) {
      if (result.deathBurst) {
        const damage = Math.min(state.health, result.deathBurst);
        state.health -= damage;
        note(state, "Die Glutkäfer bersten. Die Glutwolke kostet " + damage + " LP.");
        if (!state.health) {
          arrive(state, "defeat");
          return state;
        }
      }
      markDeed(state, result.victory);
      if (people(state.faction) === "orks") state.rausch = true;
      if (result.unlock) markDeed(state, result.unlock);
      note(state, (result.victoryText ?? "Die Begegnung ist gewonnen.") + " Du nimmst " +
        result.loot.map((id) => world.items[id]).join(" und ") + " mit.");
      const [xp, silver] = world.battleRewards[fight.id];
      grant(state, "kampf-" + fight.id, xp, silver, result.loot);
      arrive(state, result.to);
      return state;
    }
    if (result.regeneration && !usedFire && current.health > 0) {
      const recovered = Math.min(result.regeneration, (current.max ?? foe.stats[0]) - current.health);
      current.health += recovered;
      if (recovered) note(state, "Die Wunden des Trolls schließen sich. Er gewinnt " + recovered + " LP zurück.");
    }
    if (current.round === 1 && result.preparation && state.marks.includes(result.preparation)) {
      note(state, "Der Greif verfängt sich im Netz. Du gewinnst Zeit für den nächsten Zug.");
      return state;
    }
    const guarding = action === "guard" || ward > 0;
    const special = current.health > 0 && current.round % 2 === 0 ? result.special : null;
    const bleedingDamage = current.bleeding > 0 ? 1 : 0;
    current.bleeding = Math.max(0, (current.bleeding ?? 0) - 1);
    const extraAttack = (current.extras ?? []).filter(hp => hp > 0).length * (world.enemyGroups[fight.id]?.attack ?? 0);
    const leaderAttack = current.health > 0 ? attack + (current.max ? Math.floor(state.party.length / 2) : 0) : 0;
    const groupArmor = state.party.reduce((total, id) => total +
      (world.gear[memberEquipment(state, id).armor]?.armor ?? 0), 0);
    const defense = action === "guard" ? Math.max(6, ward) : ward;
    const damage = Math.max(guarding ? 0 : 1, leaderAttack + extraAttack + (special?.damage ?? 0) -
      protection(state) - gearBonus(state, "armor") - defense - groupArmor);
    current.stunned = Boolean(special?.stuns && !guarding);
    const startsBleeding = special?.bleeds && !guarding;
    if (startsBleeding) current.bleeding = 2;
    // Willenskraft ab 16 widersteht dem Fluch der Irrglut.
    const resisted = Boolean(special?.drainsEmber && !guarding && modifier(heroAttributes(state).will) > 0);
    const stolenEmber = Boolean(special?.drainsEmber && !guarding && !resisted && state.ember > 0);
    if (stolenEmber) state.ember--;
    const loss = Math.min(state.health, damage + bleedingDamage);
    state.health -= loss;
    events.push({ kind: "retaliate", actor: living()[0].id, value: loss });
    note(state, (special?.name ?? "Gegenangriff") + " · " + damage + " LP verloren." +
      (current.stunned ? " Du bist benommen. Dein nächster Waffenangriff ist schwächer." : "") +
      (startsBleeding ? " Die Wunde blutet zwei Runden lang." : "") +
      (stolenEmber ? " Die Irrglut entzieht dir 1 Glut." : "") +
      (resisted ? " Deine Willenskraft hält die Irrglut fern." : "") +
      (stabilized ? " Du bringst deine Glut näher ans Gleichgewicht." : "") +
      (bleedingDamage ? " Die Blutung kostet 1 LP." : ""));
    if (!state.health) arrive(state, "defeat");
    return state;
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

  return { create, read, choices, unequip, equipmentSlots, slotKinds, targetSlot, gearStats, equipPreview, gearBonus, bagSlots, category, slotsUsed, fits, storageSite, storageOpen, canStore, canRetrieve,
    store, retrieve, isQuestItem: id => questItems.has(id), choose, route, retrain, specialize, ascend, weapon, equip, use, canUse, strike,
    attributes, baseAttributes, defaultBuild, suggestSkills, buildProblem, skillLimits, skillPoints, cap, modifier, originOf, profile,
    className, title, gearSkill, heroSkills, heroLimits, modifiers, skillValue, protection,
    memberEquipment, assigned, progression, train, trade, candidates, recruit, dismiss, targets,
    questEntries, questPlans, partyLimit, attitude, questReady, completeQuest, paySalary, craft, relationship, reputation, recruitment, promise, bondActions, bondWith,
    healthLimit, emberLimit, heroAttributes, ending, moorConsequences };
})();
