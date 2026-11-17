"use strict";

const rules = (() => {
  const version = 1;
  // Ausrüstungsplätze: rechte Hand (weapon), linke Hand (offhand), Kopf, Hals, Körper (armor), Beine, zwei Ringe.
  // Die Schlüssel weapon und armor bleiben wegen bestehender Spielstände erhalten.
  const equipmentSlots = ["weapon", "offhand", "head", "neck", "armor", "legs", "ring1", "ring2"];
  const slotKinds = { weapon: "weapon", offhand: "offhand", head: "head", neck: "neck", armor: "armor", legs: "legs",
    ring1: "ring", ring2: "ring" };
  const emptyEquipment = () => Object.fromEntries(equipmentSlots.map(slot => [slot, null]));
  const own = (obj, key) => typeof key === "string" && Object.hasOwn(obj, key);
  const intBetween = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;

  function attributes(origin, allocation = {}) {
    return Object.fromEntries(Object.keys(world.attributes).map((key) =>
      [key, 2 + (world.origins[origin].bonuses[key] || 0) + (allocation[key] || 0)]
    ));
  }

  function maxHealth(origin, allocation) {
    return 22 + 3 * attributes(origin, allocation).strength;
  }

  function maxEmber(origin, allocation) {
    return 1 + attributes(origin, allocation).will;
  }

  function validAllocation(allocation) {
    return allocation && typeof allocation === "object" && !Array.isArray(allocation) &&
      Object.entries(allocation).every(([key, value]) => own(world.attributes, key) && intBetween(value, 0, 6)) &&
      Object.values(allocation).reduce((total, value) => total + value, 0) === 6;
  }

  function create(name, origin, appearance, variant, role = "knight", allocation = null) {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 40 || !own(world.origins, origin) ||
        !["mann", "frau"].includes(appearance) || !intBetween(variant, 0, origin === "untot" ? 1 : 3) || !own(world.classes, role)) {
      throw new Error("Bitte gib einen Namen ein und wähle ein Porträt.");
    }
    if (allocation !== null && !validAllocation(allocation)) throw new Error("Verteile genau 6 Attributpunkte.");
    const weapon = world.classes[role].weapon;
    return {
      version, name: cleanName, origin, appearance, variant, role, scene: "wake",
      allocation, health: maxHealth(origin, allocation ?? undefined), ember: maxEmber(origin, allocation ?? undefined),
      balance: 0, inventory: allocation ? [weapon, "lederwams", "galgenwurz"] : [],
      equipment: { ...emptyEquipment(), weapon: allocation ? weapon : null, armor: allocation ? "lederwams" : null },
      storage: [],
      xp: 0, silver: 5, training: {}, rewards: [],
      party: [],
      relationships: {}, factionRuf: {},
      marks: [], journal: [], combat: null,
    };
  }

  function read(serialized) {
    const state = JSON.parse(serialized);
    if (!state || state.version !== version || typeof state.name !== "string") {
      throw new Error("Unbekanntes Spielstandformat.");
    }
    if (!Object.hasOwn(state, "role")) state.role = "knight";
    if (!Object.hasOwn(state, "balance")) state.balance = 0;
    if (!Object.hasOwn(state, "allocation")) state.allocation = null;
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
    state.relationships ??= {};
    state.factionRuf ??= {};
    state.storage ??= [];
    create(state.name, state.origin, state.appearance, state.variant, state.role, state.allocation);
    const combat = state.combat;
    const validList = (value, check, limit) => Array.isArray(value) && value.length <= limit && value.every(check);
    if (!own(world.scenes, state.scene) ||
        !intBetween(state.health, 0, healthLimit(state)) ||
        !intBetween(state.ember, 0, emberLimit(state)) ||
        !intBetween(state.balance, -3, 3) ||
        !intBetween(state.xp, 0, 1000000) || !intBetween(state.silver, 0, 1000000) ||
        typeof state.training !== "object" || Array.isArray(state.training) ||
        !Object.entries(state.training).every(([id, value]) => own(world.attributes, id) && intBetween(value, 0, 5)) ||
        trainingLeft(state) < 0 ||
        !validList(state.rewards, (id) => typeof id === "string" && id.length <= 50, 100) ||
        !validList(state.party, (id) => own(world.companions, id) && id !== state.role, 5) ||
        new Set(state.party).size !== state.party.length ||
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
    return state;
  }

  function validRecord(value, catalog, valid) {
    return value && typeof value === "object" && !Array.isArray(value) &&
      Object.entries(value).every(([id, entry]) => own(catalog, id) && valid(entry));
  }

  const clampRuf = score => Math.max(-100, Math.min(100, score));
  const relationship = (state, id) => state.relationships[id] ??
    { score: 0, oath: "none", talks: 0, gift: false, left: false, bond: "none" };
  const reputation = (state, id) => state.factionRuf[id] ?? 0;
  const departureThreshold = -25;

  function candidates(state) {
    if (state.combat || !state.health) return [];
    return Object.entries(world.companions).filter(([id, companion]) =>
      id !== state.role && !state.party.includes(id) && companion.scenes.includes(state.scene));
  }

  function recruitment(state, id) {
    const bond = relationship(state, id);
    const plan = world.loyalties[id];
    if (bond.left || bond.score <= departureThreshold) return "refused";
    if (bond.oath === "broken" || plan.broken?.some(mark => state.marks.includes(mark))) return "broken";
    if (bond.oath !== "none" || (plan.task && state.marks.includes(plan.task))) return "ready";
    return plan.task ? "task" : "promise";
  }

  function promise(previous, id) {
    if (!candidates(previous).some(([candidate]) => candidate === id) || recruitment(previous, id) !== "promise") return previous;
    const state = structuredClone(previous);
    const fulfilled = world.loyalties[id].proof.some(mark => state.marks.includes(mark));
    state.relationships[id] = { ...relationship(state, id), score: 30, oath: fulfilled ? "fulfilled" : "promised" };
    note(state, world.companions[id].name + (fulfilled ? " weiß, dass du den Auftrag bereits erfüllt hast." : " nimmt dein Versprechen an."));
    return state;
  }

  function recruit(previous, id) {
    if (previous.party.length >= 5 || !candidates(previous).some(([candidate]) => candidate === id) ||
        recruitment(previous, id) !== "ready") return previous;
    const state = structuredClone(previous);
    state.party.push(id);
    const bond = relationship(state, id);
    state.relationships[id] = { ...bond, score: Math.max(30, bond.score),
      oath: world.loyalties[id].task ? "fulfilled" : bond.oath };
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
  const heroAttributes = (state) => Object.fromEntries(Object.entries(attributes(state.origin, state.allocation ?? undefined))
    .map(([id, value]) => [id, value + (state.training[id] ?? 0)]));
  const healthLimit = (state) => 22 + 3 * heroAttributes(state).strength;
  const emberLimit = (state) => 1 + heroAttributes(state).will;

  function train(previous, id) {
    if (!own(world.attributes, id) || previous.combat || !previous.health || trainingLeft(previous) < 1) return previous;
    const state = structuredClone(previous);
    state.training[id] = (state.training[id] ?? 0) + 1;
    state.health += healthLimit(state) - healthLimit(previous);
    state.ember += emberLimit(state) - emberLimit(previous);
    note(state, world.attributes[id] + " dauerhaft um 1 erhöht.");
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
      (level > previousLevel ? ". Stufe " + level + " erreicht. Du hast neue Attributpunkte." : "."));
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
    if (buying ? previous.silver < price || previous.inventory.length >= 180 : index === -1) return previous;
    const state = structuredClone(previous);
    if (!buying) state.inventory.splice(index, 1);
    state.silver += buying ? -price : price;
    note(state, world.items[id] + (buying ? " gekauft" : " verkauft") + " · " + price + " Silber.");
    if (buying) receive(state, [id]);
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
    const gear = world.gear[id];
    const slot = targetSlot(previous, id, wanted);
    if (!slot || previous.combat || !previous.health || !previous.inventory.includes(id)) return previous;
    const state = structuredClone(previous);
    if (state.equipment[slot] === id) {
      state.equipment[slot] = null;
      note(state, world.items[id] + " abgelegt.");
      return state;
    }
    if (wornCount(state, id) >= state.inventory.filter(entry => entry === id).length) {
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

  // Werte des Helden mit der aktuellen oder einer probeweise geänderten Ausrüstung.
  function gearStats(state, equipment = state.equipment) {
    const preview = { ...state, equipment };
    const weaponId = weapon(preview);
    const held = world.gear[weaponId];
    const stats = heroAttributes(state);
    return {
      damage: held.power + stats[held.stat], pierce: held.pierce ?? 0, armor: gearBonus(preview, "armor"),
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

  function choose(previous, id, dice = Math.random) {
    const choice = choices(previous).find((item) => item.id === id);
    if (!choice) return previous;
    const state = structuredClone(previous);
    const stats = heroAttributes(state);
    if (choice.check) {
      const [key, target] = choice.check;
      const bonus = stats[key] + (state.marks.includes(choice.advantage) ? 2 : 0) +
        (key === "agility" ? gearBonus(state, "travel") : 0);
      const roll = 1 + Math.floor(dice() * 20);
      const passed = roll + bonus >= target;
      note(state, world.attributes[key] + " " + roll + " + " + bonus + " gegen " + target + ". " +
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
      if (left && state.party.includes(id)) {
        state.party = state.party.filter(member => member !== id);
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

  function strike(previous, action, dice = Math.random, supply = "galgenwurz", targetId, events = []) {
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
    const stats = heroAttributes(state);
    const role = world.classes[state.role];
    const turn = state.combat;
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
    }
    turn.round++;
    if (action === "flee") {
      const roll = 1 + Math.floor(dice() * 20);
      const target = 8 + Math.floor(speed / 2);
      if (roll + stats.agility >= target) {
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
      const damage = role.attack.power + stats[role.attack.stat] + (result.emberBonus ?? 0) +
        gearBonus(state, "magic");
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
      const damage = Math.max(1, equippedWeapon.power + stats[equippedWeapon.stat] + range + Math.floor(dice() * 4) -
        Math.max(0, (armor ?? 0) - pierce) - (fight.stunned ? 2 : 0));
      hit(damage);
      note(state, world.items[weaponId] + " trifft für " + damage + " Schaden.");
    } else if (action === "torch") {
      usedFire = true;
      ward = 7;
      const damage = 6 + stats.strength;
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
        hit((member.damage ?? 0) + (fight.id === "felsgreif" ? (member.airborne ?? 0) : 0), id);
        if (healing) events.push({ kind: "heal", actor: id, value: healing });
        else if (!member.damage) events.push({ kind: "cover", actor: id });
        assisted.push(member.name + " (" + member.ability + ")");
      } else {
        hit(3 + Math.floor((member.damage ?? 0) / 4), id);
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
    const defense = action === "guard" ? Math.max(6, ward) : ward;
    const damage = Math.max(guarding ? 0 : 1, leaderAttack + extraAttack + (special?.damage ?? 0) -
      Math.floor(stats.will / 2) - gearBonus(state, "armor") - defense);
    current.stunned = Boolean(special?.stuns && !guarding);
    const startsBleeding = special?.bleeds && !guarding;
    if (startsBleeding) current.bleeding = 2;
    const stolenEmber = Boolean(special?.drainsEmber && !guarding && state.ember > 0);
    if (stolenEmber) state.ember--;
    const loss = Math.min(state.health, damage + bleedingDamage);
    state.health -= loss;
    events.push({ kind: "retaliate", actor: living()[0].id, value: loss });
    note(state, (special?.name ?? "Gegenangriff") + " · " + damage + " LP verloren." +
      (current.stunned ? " Du bist benommen. Dein nächster Waffenangriff ist schwächer." : "") +
      (startsBleeding ? " Die Wunde blutet zwei Runden lang." : "") +
      (stolenEmber ? " Die Irrglut entzieht dir 1 Glut." : "") +
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
    return state.equipment?.weapon ?? (state.allocation ? "faeuste" : "speer");
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

  function buildLegacy(previous, role, allocation) {
    if (previous.allocation || previous.combat || !previous.health) return previous;
    if (!validAllocation(allocation)) throw new Error("Verteile genau 6 Attributpunkte.");
    const setup = create(previous.name, previous.origin, previous.appearance, previous.variant, role, allocation);
    const state = structuredClone(previous);
    state.role = role;
    state.party = state.party.filter(id => id !== role);
    state.allocation = allocation;
    const overflow = receive(state, setup.inventory.filter(id => !state.inventory.includes(id)), false);
    state.equipment.weapon ??= setup.equipment.weapon;
    state.equipment.armor ??= setup.equipment.armor;
    state.health += healthLimit(state) - healthLimit(previous);
    state.ember += emberLimit(state) - emberLimit(previous);
    note(state, "Klasse und Attributpunkte festgelegt. Deine bisherige Reise und Beute bleiben erhalten.");
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

  return { create, read, choices, equipmentSlots, slotKinds, targetSlot, gearStats, equipPreview, gearBonus, bagSlots, category, slotsUsed, fits, storageSite, storageOpen, canStore, canRetrieve,
    store, retrieve, isQuestItem: id => questItems.has(id), choose, route, buildLegacy, weapon, equip, use, canUse, strike, attributes, maxHealth, maxEmber,
    progression, train, trade, candidates, recruit, dismiss, targets,
    relationship, reputation, recruitment, promise, bondActions, bondWith,
    healthLimit, emberLimit, heroAttributes, ending, moorConsequences };
})();
