"use strict";

(() => {
  const key = "aschenkrone.valmarch.v1";
  const el = (id) => document.getElementById(id);
  const layoutKey = "aschenkrone.layout";
  const layoutMode = el("layout-mode");
  const narrowLayout = window.matchMedia("(max-width: 51.99rem)");
  const name = el("character-name");
  const volk = el("volk");
  const origin = el("origin");
  const role = el("class");
  const volkWahl = el("volk-wahl");
  const mapPlaces = el("map-places");
  const appearance = el("appearance");
  const variant = el("variant");
  let state = null;
  let importRequest = 0;
  let allocation = {};
  let skills = {};
  let target = null;
  let enemyTarget = null;
  let boostAbility = false;
  let animating = false;
  let lastBattleMessages = [];
  const battleStepMs = 248;
  let editingLegacy = false;
  const pointControls = new Map();
  const skillControls = new Map();
  const signed = (value) => (value > 0 ? "+" : value < 0 ? "−" : "±") + Math.abs(value);

  function element(tag, text) {
    const result = document.createElement(tag);
    if (text !== undefined) result.textContent = text;
    return result;
  }

  function list(parent, values, empty) {
    parent.replaceChildren(...(values.length ? values : [empty]).map((value) => element("li", value)));
  }

  function stats(parent, values) {
    parent.replaceChildren(...values.map(([label, value]) => {
      const block = element("div");
      block.append(element("dt", label), element("dd", value));
      return block;
    }));
  }

  function attributeValues(values) {
    return Object.entries(values).map(([stat, value]) => {
      const bonus = rules.modifier(value);
      return [world.attributes[stat], value + (bonus ? " (" + signed(bonus) + ")" : "")];
    });
  }

  // Aktuelle Auswahl im Formular als Bauplan für rules.create.
  function draftBuild() {
    const people = klassen.fraktionen[origin.value].volk;
    return { frei: { ...allocation }, wahl: klassen.voelker[people].wahl ? volkWahl.value : null,
      fertigkeiten: { ...skills }, spez: null, meister: null };
  }
  const draftAttributes = () => rules.attributes(origin.value, role.value, draftBuild(), editingLegacy ? state.training : {});

  function show(id) {
    for (const view of ["home", "creation", "prologue", "play"]) el(view).hidden = view !== id;
  }

  function applyLayout() {
    document.documentElement.dataset.layout = layoutMode.value;
    el("travel-map").open = !narrowLayout.matches && layoutMode.value !== "compact";
  }

  try {
    const savedLayout = localStorage.getItem(layoutKey);
    if (Array.from(layoutMode.options).some(option => option.value === savedLayout)) layoutMode.value = savedLayout;
  } catch {
    // The current window can still use the selected layout.
  }
  applyLayout();
  narrowLayout.addEventListener("change", applyLayout);
  layoutMode.addEventListener("change", () => {
    applyLayout();
    try {
      localStorage.setItem(layoutKey, layoutMode.value);
    } catch {
      // The current window can still use the selected layout.
    }
  });
  for (const link of document.querySelectorAll(".play-shortcuts a")) {
    link.addEventListener("click", event => {
      event.preventDefault();
      const panel = el(link.hash.slice(1));
      if (panel.id === "travel-map") panel.open = true;
      panel.scrollIntoView({ block: "start" });
      (panel.querySelector(":scope > summary") ?? panel).focus({ preventScroll: true });
    });
  }

  function setPortrait(target, data) {
    const id = data.appearance + "-0" + world.origins[data.origin].portrait;
    const result = portraits.get(id, data.variant);
    target.style.backgroundImage = 'url("profilbilder/bilder/' + result.file + '")';
    target.style.backgroundPosition = result.position;
    target.setAttribute("aria-label", result.label);
    return result.label;
  }

  function portraitPreview(reset = false) {
    if (reset) {
      const id = appearance.value + "-0" + world.origins[rules.originOf(origin.value)].portrait;
      variant.replaceChildren(...portraits.styles(id).map((label, index) => new Option(label, index)));
    }
    el("preview-caption").textContent = setPortrait(el("preview"), {
      origin: rules.originOf(origin.value), appearance: appearance.value, variant: Number(variant.value),
    });
    const problem = rules.buildProblem(origin.value, role.value, draftBuild(), editingLegacy ? state.training : {});
    el("creation-status").textContent = problem && !problem.startsWith("Verteile") ? problem : creationNote;
  }
  let creationNote = "";

  function renderPoints() {
    const freePoints = klassen.regeln.freiePunkte;
    const remaining = freePoints - Object.values(allocation).reduce((sum, value) => sum + value, 0);
    el("points-left").textContent = remaining + " von " + freePoints + " freien Punkten verfügbar · Höchstwert 20";
    const base = rules.baseAttributes(origin.value, role.value, draftBuild().wahl);
    const values = draftAttributes();
    for (const [key, controls] of pointControls) {
      const spent = allocation[key] ?? 0;
      const bonus = rules.modifier(values[key]);
      controls.base.textContent = base[key] + (editingLegacy && state.training[key] ? " + " + state.training[key] : "");
      controls.value.textContent = "+" + spent;
      controls.total.textContent = "= " + values[key] + (bonus ? " (" + signed(bonus) + ")" : "");
      controls.minus.disabled = spent === 0;
      controls.plus.disabled = remaining === 0 || values[key] >= klassen.regeln.grundwertMax;
    }
    // Sinkt ein Grundwert, sinkt auch die Grenze der Fertigkeit.
    const limits = rules.skillLimits(origin.value, values);
    for (const id of Object.keys(skills)) skills[id] = Math.min(skills[id], limits[id]);
    renderSkills();
  }

  function renderSkills() {
    const values = draftAttributes();
    const limits = rules.skillLimits(origin.value, values);
    const main = klassen.grundklassen[rules.profile(origin.value, role.value)].haupt;
    const points = klassen.regeln.fertigkeitsPunkte;
    const remaining = points - Object.values(skills).reduce((sum, value) => sum + value, 0);
    el("skills-left").textContent = remaining + " von " + points + " Punkten verfügbar · Hauptfertigkeiten mindestens 3";
    for (const [id, controls] of skillControls) {
      const skill = klassen.fertigkeiten[id];
      controls.label.textContent = skill.name + (main.includes(id) ? " ★" : "");
      controls.label.title = skill.zweck;
      controls.value.textContent = String(skills[id] ?? 0);
      controls.limit.textContent = "max " + limits[id] + " · " + world.attributes[skill.grundwert] + " " + values[skill.grundwert];
      controls.minus.disabled = !skills[id];
      controls.plus.disabled = remaining <= 0 || (skills[id] ?? 0) >= limits[id];
    }
    portraitPreview();
  }

  function controlRow(parent, label, change, extra = []) {
    const row = element("div");
    row.className = "point-row";
    const value = element("output");
    const minus = element("button", "−");
    const plus = element("button", "+");
    for (const [control, delta] of [[minus, -1], [plus, 1]]) {
      control.type = "button";
      control.className = "action";
      control.setAttribute("aria-label", label + (delta > 0 ? " erhöhen" : " senken"));
      control.addEventListener("click", () => change(delta));
    }
    const name = element("span", label);
    row.append(name, ...extra.slice(0, 1), minus, value, plus, ...extra.slice(1));
    parent.append(row);
    return { name, value, minus, plus };
  }

  for (const [key, label] of Object.entries(world.attributes)) {
    const base = element("small");
    const total = element("small");
    const controls = controlRow(el("point-controls"), label, (delta) => {
      allocation[key] = (allocation[key] ?? 0) + delta;
      if (!allocation[key]) delete allocation[key];
      renderPoints();
    }, [base, total]);
    pointControls.set(key, { ...controls, base, total });
  }
  for (const [id, skill] of Object.entries(klassen.fertigkeiten)) {
    const limit = element("small");
    const controls = controlRow(el("skill-controls"), skill.name, (delta) => {
      skills[id] = (skills[id] ?? 0) + delta;
      renderSkills();
    }, [element("span"), limit]);
    skillControls.set(id, { ...controls, label: controls.name, limit });
  }

  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(state));
      el("save-status").textContent = "Lokal gespeichert.";
    } catch {
      el("save-status").textContent = "Der Browser blockiert lokales Speichern. Du kannst den Spielstand exportieren.";
    }
  }

  function showTurnStatus(previous, next) {
    const latest = next.journal.at(-1);
    const messages = previous && latest !== previous.journal.at(-1) ? [latest] : [];
    for (const id of previous?.party ?? []) {
      if (!next.party.includes(id) && rules.relationship(next, id).left) {
        const departure = world.companions[id].name + " hat das Vertrauen in dich verloren und verlässt deine Gruppe.";
        if (departure !== latest) messages.push(departure);
      }
    }
    el("turn-status").textContent = messages.join(" ");
  }

  function update(next) {
    if (next === state) return;
    const previous = state;
    const changedScene = !previous || next.scene !== previous.scene || Boolean(next.combat) !== Boolean(previous.combat);
    state = next;
    save();
    render();
    showTurnStatus(previous, next);
    if (changedScene) el("scene-title").focus();
  }

  function showPlay(next) {
    target = null;
    enemyTarget = null;
    state = next;
    save();
    show("play");
    render();
    el("turn-status").textContent = "";
    el("scene-title").focus();
  }

  function showHome(message = "") {
    if (el("inventory-hub").open) el("inventory-hub").close();
    show("home");
    el("continue").hidden = state === null;
    el("home-status").textContent = message;
  }

  function button(parent, label, callback, options = {}) {
    const control = element("button", label);
    control.type = "button";
    control.className = "action" + (options.story ? " story-choice" : "");
    control.disabled = Boolean(options.disabled);
    control.addEventListener("click", () => {
      const index = Array.from(parent.children).indexOf(control);
      callback();
      if (document.activeElement === document.body) {
        (parent.children[index]?.disabled ? parent.querySelector("button:not(:disabled)") :
          parent.children[index])?.focus();
      }
    });
    parent.append(control);
    return control;
  }

  function creatureImage(foe) {
    const figure = element("figure");
    figure.className = "creature";
    const image = element("img");
    image.src = "bestiarium/bilder/" + foe.image;
    image.alt = foe.name;
    figure.append(image);
    return figure;
  }

  for (const [from, to] of world.routes) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const [x1, y1] = world.destinations[from].position;
    const [x2, y2] = world.destinations[to].position;
    for (const [key, value] of Object.entries({ x1, y1, x2, y2 })) line.setAttribute(key, value);
    el("map-routes").append(line);
  }

  function renderMap() {
    const current = world.scenes[state.scene].map;
    const travels = new Map();
    for (const id of Object.keys(world.destinations)) {
      const route = rules.route(state, id);
      if (route?.first) travels.set(id, route);
    }
    const plan = el("map-plan");
    const destinations = el("map-destinations");
    for (const line of el("map-routes").children) line.classList.remove("route-active");
    plan.replaceChildren();
    const selected = travels.get(target);
    if (selected) {
      const stops = selected.stops;
      for (const [index, [from, to]] of world.routes.entries()) {
        if (stops.some((stop, i) => (stop === from && stops[i + 1] === to) || (stop === to && stops[i + 1] === from))) {
          el("map-routes").children[index].classList.add("route-active");
        }
      }
      plan.append(element("p", selected.stops.map(id => world.destinations[id].name).join(" → ")));
      button(plan, "Nächste Etappe: " + world.destinations[selected.stops[1] ?? target].name,
        () => update(rules.choose(state, selected.first)));
      button(plan, "Ziel verwerfen", () => {
        const previousTarget = target;
        target = null;
        renderMap();
        destinations.querySelector('[data-destination="' + previousTarget + '"]')?.focus();
      });
    } else {
      target = null;
    }
    mapPlaces.replaceChildren();
    destinations.replaceChildren();
    const selectDestination = id => {
      target = id;
      renderMap();
      plan.querySelector("button")?.focus();
    };
    for (const [id, location] of Object.entries(world.destinations)) {
      const reachable = travels.has(id);
      const marker = element(reachable ? "button" : "span", location.name);
      marker.className = "map-marker" + (current === id ? " map-current" : "");
      marker.style.left = location.position[0] + "%";
      marker.style.top = location.position[1] + "%";
      marker.title = location.note;
      if (current === id) marker.setAttribute("aria-current", "location");
      if (reachable) {
        marker.type = "button";
        marker.dataset.destination = id;
        marker.setAttribute("aria-label", location.name + " als Ziel wählen · " + location.note);
        marker.setAttribute("aria-pressed", id === target);
        marker.addEventListener("click", () => selectDestination(id));
        const choice = element("button", location.name);
        choice.type = "button";
        choice.className = "action";
        choice.dataset.destination = id;
        choice.setAttribute("aria-pressed", id === target);
        choice.addEventListener("click", () => selectDestination(id));
        destinations.append(choice);
      }
      mapPlaces.append(marker);
    }
    const location = world.destinations[current]?.name;
    const far = world.scenes[state.scene].fern;
    el("map-status").textContent = state.combat ? "Im Kampf kannst du die Karte ansehen. Reiseoptionen öffnen sich nach der Begegnung." :
      location ? "Standort: " + location + (travels.size ? " · Wähle ein Reiseziel, um die Route zu sehen." : " · Folge den Optionen in der Szene.") :
      far ? "Standort: " + far + " · außerhalb dieser Reisekarte. Folge den Optionen in der Szene." :
      "Deine Reise ist beendet.";
  }

  const slotLabels = { weapon: "Rechte Hand", offhand: "Linke Hand", head: "Kopf", neck: "Hals", armor: "Körper",
    legs: "Beine", ring1: "Ring", ring2: "Ring" };
  const kindLabels = { weapon: "Waffe", offhand: "Schild", head: "Kopf", neck: "Hals", armor: "Körper", legs: "Beine",
    ring: "Ring", supply: "Verbrauchsgut", trophy: "Trophäe und Fund", quest: "Questgegenstand" };
  const groups = [["Waffen und Schilde", ["weapon", "offhand"]], ["Rüstung", ["head", "armor", "legs"]],
    ["Schmuck", ["neck", "ring"]], ["Verbrauchsgüter", ["supply"]], ["Trophäen und Funde", ["trophy"]],
    ["Questgegenstände", ["quest"]]];
  const statLabels = [["damage", "Schaden"], ["pierce", "Durchschlag"], ["armor", "Rüstung"], ["magic", "Glutschaden"],
    ["travel", "List unterwegs"], ["airborne", "gegen Flieger"]];
  const hub = { tab: "bag", slot: null };
  const kindOf = id => world.gear[id]?.slot ?? rules.category(id);

  function itemDetails(id) {
    const gear = world.gear[id];
    const supply = world.supplies[id];
    const details = [];
    if (gear?.power) details.push(gear.power + " Schaden + " + klassen.fertigkeiten[rules.gearSkill(gear)].name);
    if (gear?.twoHanded) details.push("Zweihändig");
    if (gear?.pierce) details.push(gear.pierce + " Durchschlag");
    if (gear?.armor) details.push(gear.armor + " Rüstung");
    if (gear?.travel) details.push("+" + gear.travel + " auf List unterwegs");
    if (gear?.magic) details.push("+" + gear.magic + " Glutschaden");
    if (gear?.airborne) details.push("+" + gear.airborne + " gegen Flieger");
    if (supply?.heal) details.push("+" + supply.heal + " LP");
    if (supply?.ember) details.push("+" + supply.ember + " Glut");
    if (world.salePrices[id]) details.push("Wert " + world.salePrices[id] + " Silber");
    if (rules.isQuestItem(id)) details.push("Für eine Aufgabe");
    return details;
  }

  function counted(ids) {
    const counts = new Map();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }

  function renderInventory() {
    const equipment = state.equipment;
    const worn = rules.equipmentSlots.filter(slot => equipment[slot]);
    el("equipment").textContent = state.silver + " Silber · Waffe: " + world.items[rules.weapon(state)] +
      (worn.filter(slot => slot !== "weapon").length ? " · " + worn.filter(slot => slot !== "weapon")
        .map(slot => slotLabels[slot] + ": " + world.items[equipment[slot]]).join(" · ") : "");
    const site = rules.storageSite(state);
    el("bag-summary").textContent = "Rucksack " + rules.slotsUsed(state) + " / " + rules.bagSlots + " Plätze · Zentrallager " +
      state.storage.length + " Gegenstände" + (site && !state.combat ? " · hier erreichbar." : "");
    const inventory = el("inventory");
    inventory.replaceChildren();
    const counts = counted(state.inventory);
    for (const [id, count] of counts) {
      const item = element("li");
      const gear = world.gear[id];
      const supply = world.supplies[id];
      const equipped = gear && rules.equipmentSlots.some(slot => equipment[slot] === id);
      item.append(element("strong", world.items[id] + (count > 1 ? " ×" + count : "")));
      if (world.rarity[id]) {
        const quality = element("small", " · " + world.rarity[id]);
        quality.className = "rarity";
        quality.dataset.quality = world.rarity[id];
        item.append(quality);
      }
      if (equipped) item.append(element("small", " Ausgerüstet"));
      const holders = state.party.filter(member => Object.values(rules.memberEquipment(state, member)).includes(id));
      if (holders.length) item.append(element("small", " · Bei " + holders.map(member => world.companions[member].name).join(", ")));
      if (gear?.slot) item.append(element("small", " · Frei: " + (count - rules.assigned(state, id))));
      const details = itemDetails(id).filter(text => !text.startsWith("Wert") && !text.startsWith("Für eine"));
      if (details.length) item.append(element("div", details.join(" · ")));
      if (gear?.slot) button(item, equipped ? "Ablegen" : "Ausrüsten", () => {
        const slot = rules.equipmentSlots.find(entry => equipment[entry] === id);
        update(rules.equip(state, id, slot ?? null));
      }, { disabled: Boolean(state.combat) || !state.health || (!equipped && rules.assigned(state, id) >= count) });
      if (supply) button(item, "Verwenden", () => state.combat ? battleAction("herb", id) : update(rules.use(state, id)),
        { disabled: !rules.canUse(state, id) });
      inventory.append(item);
    }
    if (!counts.size) inventory.append(element("li", "Leer"));
    for (const [id, recipe] of Object.entries(world.recipes)) {
      const row = element("li");
      row.append(element("strong", "Herstellen: " + world.items[id]), element("p", recipe.text));
      const enough = Object.entries(recipe.ingredients).every(([item, count]) => state.inventory.filter(entry => entry === item).length >= count);
      button(row, "Herstellen · " + Object.entries(recipe.ingredients).map(([item, count]) => count + " × " + world.items[item]).join(", "),
        () => update(rules.craft(state, id)), { disabled: Boolean(state.combat) || !state.health || !enough || state.inventory.length >= 200 });
      inventory.append(row);
    }
    if (el("inventory-hub").open) renderHub();
  }

  function openHub() {
    if (!state) return;
    hub.tab = "bag";
    hub.slot = null;
    el("hub-status").textContent = "";
    renderHub();
    el("inventory-hub").showModal();
    el("hub-close").focus();
  }

  function hubAction(next) {
    if (next === state) return;
    update(next);
    el("hub-status").textContent = state.journal.at(-1) ?? "";
  }

  function deltaChips(delta) {
    const chips = [];
    for (const [key, label] of statLabels) {
      const value = delta?.[key];
      if (!value) continue;
      const chip = element("span", (value > 0 ? "▲ +" : "▼ −") + Math.abs(value) + " " + label);
      chip.className = "hub-delta " + (value > 0 ? "hub-better" : "hub-worse");
      chips.push(chip);
    }
    return chips;
  }

  function renderStats(delta = null, label = "") {
    const values = rules.gearStats(state);
    const list = el("hub-stats");
    list.replaceChildren();
    for (const [key, name] of statLabels) {
      if (key === "airborne" && !values[key] && !delta?.[key]) continue;
      const block = element("div");
      const value = element("dd", String(values[key]));
      const change = delta?.[key];
      if (change) {
        const mark = element("span", " → " + (values[key] + change));
        mark.className = change > 0 ? "hub-better" : "hub-worse";
        value.append(mark);
        block.className = change > 0 ? "hub-stat-better" : "hub-stat-worse";
      }
      block.append(element("dt", name), value);
      list.append(block);
    }
    el("hub-compare").textContent = label;
  }

  function previewOn(control, id, slot) {
    const show = () => {
      const delta = rules.equipPreview(state, id, slot);
      const changed = delta && Object.values(delta).some(Boolean);
      renderStats(delta, changed ? "Mit " + world.items[id] + ":" : delta ? "Mit " + world.items[id] + ": keine Wertänderung" : "");
    };
    control.addEventListener("pointerenter", show);
    control.addEventListener("focus", show);
    control.addEventListener("pointerleave", () => renderStats());
    control.addEventListener("blur", () => renderStats());
  }

  // Figur: Plätze sitzen an Kopf, Hals, Brust, Händen, Fingern und Beinen einer Körpersilhouette.
  const dollSpots = { head: [50, 10], neck: [50, 28.5], armor: [50, 47], legs: [50, 81],
    weapon: [15, 47], offhand: [85, 47], ring1: [15, 74], ring2: [85, 74] };
  const svgNs = "http://www.w3.org/2000/svg";

  function figure(width, height) {
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("hub-figure");
    const add = (tag, attributes) => {
      const shape = document.createElementNS(svgNs, tag);
      for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, value);
      svg.append(shape);
    };
    const cx = width / 2;
    const unit = Math.min(width, height);
    const limb = unit * 0.075;
    const headY = height * 0.1;
    const headR = height * 0.075;
    const shoulderY = height * 0.25;
    const hipY = height * 0.62;
    const torso = Math.min(width * 0.12, unit * 0.2);
    const hip = torso * 0.78;
    const handY = height * 0.47;
    const hands = [width * 0.15, width * 0.85];
    add("line", { x1: cx, y1: headY, x2: cx, y2: shoulderY + 4, "stroke-width": headR * 0.9 });
    add("circle", { cx, cy: headY, r: headR });
    for (const [side, handX] of [[-1, hands[0]], [1, hands[1]]]) {
      add("line", { x1: cx + side * torso * 0.92, y1: shoulderY + limb * 0.5, x2: handX, y2: handY, "stroke-width": limb });
      add("circle", { cx: handX, cy: handY, r: limb * 0.85 });
      add("line", { x1: handX, y1: handY + limb, x2: handX, y2: height * 0.68, "stroke-width": 2, "stroke-dasharray": "3 5", class: "hub-figure-guide" });
      add("line", { x1: cx + side * hip * 0.5, y1: hipY, x2: cx + side * hip * 0.62, y2: height * 0.97, "stroke-width": limb * 1.3 });
    }
    add("path", { d: "M" + (cx - torso) + " " + shoulderY + " Q" + cx + " " + (shoulderY - limb) + " " + (cx + torso) + " " + shoulderY +
      " L" + (cx + hip) + " " + hipY + " L" + (cx - hip) + " " + hipY + " Z" });
    return svg;
  }

  function renderDoll() {
    const doll = el("hub-doll");
    const narrow = window.matchMedia("(max-width: 42rem)").matches;
    doll.replaceChildren(narrow ? figure(360, 470) : figure(640, 420));
    for (const slot of rules.equipmentSlots) {
      const id = state.equipment[slot];
      const shown = slot === "weapon" && !id ? rules.weapon(state) : id;
      const spot = element("div");
      spot.className = "hub-spot";
      spot.style.left = dollSpots[slot][0] + "%";
      spot.style.top = dollSpots[slot][1] + "%";
      const card = element("button");
      card.type = "button";
      card.className = "hub-slot hub-slot-" + slot + (id ? "" : " hub-slot-empty");
      if (world.rarity[id]) card.dataset.quality = world.rarity[id];
      card.setAttribute("aria-pressed", String(hub.slot === slot));
      card.append(element("small", slotLabels[slot]));
      card.append(element("strong", shown ? world.items[shown] : "Leer"));
      if (!id && slot === "offhand" && world.gear[state.equipment.weapon]?.twoHanded) card.append(element("span", "Zweihandwaffe"));
      if (id) card.title = world.items[id] + ": " + itemDetails(id).join(" · ");
      card.setAttribute("aria-label", slotLabels[slot] + ": " + (id ? world.items[id] : "leer") + ". Passende Gegenstände zeigen.");
      card.addEventListener("click", () => {
        hub.slot = hub.slot === slot ? null : slot;
        hub.tab = "bag";
        renderHub();
        doll.querySelector(".hub-slot-" + slot)?.focus();
      });
      spot.append(card);
      if (id) {
        const off = element("button", "✕");
        off.type = "button";
        off.className = "hub-unequip";
        off.title = world.items[id] + " ablegen";
        off.setAttribute("aria-label", world.items[id] + " ablegen");
        off.disabled = Boolean(state.combat) || !state.health;
        off.addEventListener("click", () => {
          hubAction(rules.unequip(state, slot));
          doll.querySelector(".hub-slot-" + slot)?.focus();
        });
        spot.append(off);
      }
      doll.append(spot);
    }
    const all = el("hub-unequip-all");
    all.disabled = Boolean(state.combat) || !state.health || !rules.equipmentSlots.some(slot => state.equipment[slot]);
  }

  function itemTile(id, count) {
    const storageTab = hub.tab === "storage";
    const gear = world.gear[id];
    const supply = world.supplies[id];
    const wornIn = rules.equipmentSlots.filter(slot => state.equipment[slot] === id);
    const entry = element("li");
    entry.className = "hub-entry";
    if (world.rarity[id]) entry.dataset.quality = world.rarity[id];
    const main = element("button");
    main.type = "button";
    main.className = "hub-item";
    main.append(element("strong", world.items[id] + (count > 1 ? " ×" + count : "")));
    const meta = element("small", [kindLabels[kindOf(id)], world.rarity[id]].filter(Boolean).join(" · "));
    meta.className = "hub-item-meta";
    main.append(meta);
    const details = itemDetails(id);
    if (details.length) main.append(element("span", details.join(" · ")));
    let label = "";
    let action = null;
    let disabled = true;
    if (storageTab) {
      label = "Herausnehmen";
      disabled = !rules.canRetrieve(state, id);
      action = () => hubAction(rules.retrieve(state, id, 1));
    } else if (gear?.slot) {
      const slot = hub.slot && rules.slotKinds[hub.slot] === gear.slot ? hub.slot : null;
      const wornHere = slot ? state.equipment[slot] === id : wornIn.length && !(gear.slot === "ring" && wornIn.length < count);
      label = wornHere ? "Ablegen" : "Anlegen";
      disabled = Boolean(state.combat) || !state.health;
      action = () => hubAction(rules.equip(state, id, slot ?? (wornHere ? wornIn[0] : null)));
      if (!disabled) previewOn(main, id, slot ?? (wornHere ? wornIn[0] : null));
      if (!wornHere) main.append(...deltaChips(rules.equipPreview(state, id, slot)));
    } else if (supply) {
      label = "Verwenden";
      disabled = !rules.canUse(state, id);
      action = () => {
        if (state.combat) {
          el("inventory-hub").close();
          battleAction("herb", id);
        } else hubAction(rules.use(state, id));
      };
    }
    if (wornIn.length && !storageTab) {
      entry.classList.add("hub-worn");
      const mark = element("span", "Angelegt");
      mark.className = "hub-equipped";
      main.append(mark);
    }
    if (label) {
      const hint = element("em", label);
      hint.className = "hub-click";
      main.append(hint);
    }
    main.disabled = !action || disabled;
    main.setAttribute("aria-label", world.items[id] + (count > 1 ? ", " + count + " Stück" : "") + (label ? ": " + label : ""));
    if (action) main.addEventListener("click", () => {
      action();
      el("hub-items").querySelector('[data-item="' + id + '"] .hub-item:not(:disabled)')?.focus();
    });
    entry.dataset.item = id;
    entry.append(main);
    const extras = element("div");
    extras.className = "hub-extras";
    const small = (text, callback, off) => {
      const control = element("button", text);
      control.type = "button";
      control.className = "hub-mini";
      control.disabled = off;
      control.addEventListener("click", callback);
      extras.append(control);
    };
    if (!storageTab && rules.storageOpen(state) && !rules.isQuestItem(id)) {
      small("Ins Lager", () => hubAction(rules.store(state, id, 1)), !rules.canStore(state, id));
      if (count > 1) small("Alle ins Lager", () => hubAction(rules.store(state, id, count)), !rules.canStore(state, id));
    }
    if (storageTab && rules.storageOpen(state)) {
      if (count > 1) small("Alle heraus", () => hubAction(rules.retrieve(state, id, count)), !rules.canRetrieve(state, id));
      if (gear?.slot) small("Heraus und anlegen", () => {
        const taken = rules.retrieve(state, id, 1);
        if (taken !== state) hubAction(rules.equip(taken, id));
      }, !rules.canRetrieve(state, id));
    }
    if (extras.children.length) entry.append(extras);
    return entry;
  }

  function renderHub() {
    const site = rules.storageSite(state);
    const open = rules.storageOpen(state);
    el("hub-place").textContent = open ? site : state.combat ? "Im Kampf" : world.scenes[state.scene].place ?? "";
    el("hub-silver").textContent = state.silver + " Silber";
    renderDoll();
    renderStats();
    const tabs = { bag: "Rucksack · " + rules.slotsUsed(state) + " / " + rules.bagSlots,
      storage: "Zentrallager · " + state.storage.length };
    for (const [tab, label] of Object.entries(tabs)) {
      const control = el("hub-tab-" + tab);
      control.textContent = label;
      control.setAttribute("aria-selected", String(hub.tab === tab));
      control.tabIndex = hub.tab === tab ? 0 : -1;
    }
    const capacity = el("hub-capacity");
    capacity.hidden = hub.tab !== "bag";
    capacity.max = rules.bagSlots;
    capacity.value = rules.slotsUsed(state);
    el("hub-hint").textContent = hub.tab === "storage"
      ? (open ? "Klick auf einen Gegenstand nimmt ihn heraus." : "Herausnehmen kannst du in jeder Stadt: Kornwik, Heidvang, Eiswacht, Glutberg.")
      : state.combat ? "Im Kampf kannst du nur Verbrauchsgüter verwenden."
        : "Klick auf Ausrüstung legt sie an. ▲ grün verbessert, ▼ rot verschlechtert deine Werte." +
          (open ? " Das Zentrallager ist hier erreichbar." : "");
    const filter = el("hub-slot-filter");
    const kind = hub.slot && rules.slotKinds[hub.slot];
    filter.hidden = !kind || hub.tab !== "bag";
    filter.replaceChildren();
    if (kind && hub.tab === "bag") {
      filter.append(element("span", "Passend für " + slotLabels[hub.slot] + (kind === "ring" ? " (" + (hub.slot === "ring1" ? "links" : "rechts") + ")" : "")));
      const current = state.equipment[hub.slot];
      if (current) button(filter, "Ablegen: " + world.items[current], () => hubAction(rules.equip(state, current, hub.slot)),
        { disabled: Boolean(state.combat) || !state.health });
      button(filter, "Alle zeigen", () => {
        hub.slot = null;
        renderHub();
        el("hub-tab-bag").focus();
      });
    }
    const counts = counted(hub.tab === "bag" ? state.inventory : state.storage);
    const container = el("hub-items");
    container.replaceChildren();
    for (const [title, kinds] of groups) {
      if (kind && !kinds.includes(kind)) continue;
      const ids = [...counts.keys()].filter(id => kind ? kindOf(id) === kind : kinds.includes(kindOf(id)))
        .sort((a, b) => kinds.indexOf(kindOf(a)) - kinds.indexOf(kindOf(b)) || world.items[a].localeCompare(world.items[b], "de"));
      if (!ids.length) continue;
      const section = element("section");
      section.className = "hub-group";
      section.append(element("h4", title + " · " + ids.length));
      const grid = element("ul");
      grid.className = "hub-grid";
      for (const id of ids) grid.append(itemTile(id, counts.get(id)));
      section.append(grid);
      container.append(section);
    }
    if (!container.children.length) container.append(element("p", kind ? "Im Rucksack liegt nichts Passendes." :
      hub.tab === "bag" ? "Dein Rucksack ist leer." : "Im Zentrallager liegt nichts."));
  }

  for (const opener of document.querySelectorAll("[data-hub-open]")) opener.addEventListener("click", openHub);
  el("hub-close").addEventListener("click", () => el("inventory-hub").close());
  el("hub-unequip-all").addEventListener("click", () => {
    hubAction(rules.unequip(state));
    el("hub-unequip-all").focus();
  });
  window.matchMedia("(max-width: 42rem)").addEventListener("change", () => {
    if (state && el("inventory-hub").open) renderDoll();
  });
  el("inventory-hub").addEventListener("click", event => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  for (const tab of ["bag", "storage"]) {
    const control = el("hub-tab-" + tab);
    control.addEventListener("click", () => {
      hub.tab = tab;
      hub.slot = null;
      renderHub();
      control.focus();
    });
    control.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      el("hub-tab-" + (tab === "bag" ? "storage" : "bag")).click();
    });
  }

  function companionEffect(companion) {
    const effects = [];
    if (companion.damage) effects.push(companion.damage + " Schaden");
    if (companion.heal) effects.push("bis zu " + companion.heal + " LP Heilung");
    if (companion.guard) effects.push("Schutz " + companion.guard);
    if (companion.cleanse) effects.push("stoppt Blutung");
    if (companion.fire) effects.push("unterbindet Trollregeneration");
    if (companion.airborne) effects.push("+" + companion.airborne + " Schaden gegen Felsgreife");
    return effects.join(" · ");
  }

  function equipmentText(member) {
    const kit = rules.memberEquipment(state, member);
    return "Waffe: " + (world.items[kit.weapon] ?? "Eigener Kampfstil") +
      " · Rüstung: " + (world.items[kit.armor] ?? "Keine") +
      " · Angriff +" + (world.gear[kit.weapon]?.power ?? 0) +
      " · Gruppenschutz +" + (world.gear[kit.armor]?.armor ?? 0);
  }

  const openEquipment = new Set();

  function renderMemberEquipment(row, member) {
    row.append(element("p", equipmentText(member)));
    const details = element("details");
    details.className = "member-equipment";
    details.open = openEquipment.has(member);
    details.addEventListener("toggle", () => {
      if (!details.isConnected) return;
      if (details.open) openEquipment.add(member);
      else openEquipment.delete(member);
    });
    details.append(element("summary", "Ausrüstung ändern"));
    const kit = rules.memberEquipment(state, member);
    for (const [slot, title] of [["weapon", "Waffe"], ["armor", "Rüstung"]]) {
      const label = element("label", title);
      const select = element("select");
      select.setAttribute("aria-label", world.companions[member].name + " · " + title);
      select.append(new Option(slot === "weapon" ? "Eigener Kampfstil" : "Keine Rüstung", ""));
      for (const id of new Set(state.inventory)) {
        if (world.gear[id]?.slot !== slot) continue;
        const free = state.inventory.filter(item => item === id).length - rules.assigned(state, id);
        const option = new Option(world.items[id] + (free === 0 && kit[slot] !== id ? " · Vergeben" : ""), id);
        option.disabled = free === 0 && kit[slot] !== id;
        select.append(option);
      }
      select.value = kit[slot] ?? "";
      select.disabled = Boolean(state.combat) || !state.health;
      select.addEventListener("change", () => {
        const id = select.value || kit[slot];
        if (id && select.value !== (kit[slot] ?? "")) {
          openEquipment.add(member);
          update(rules.equip(state, id, member));
          const label = world.companions[member].name + " · " + title;
          [...el("party-members").querySelectorAll("select")].find(control => control.getAttribute("aria-label") === label)?.focus();
        }
      });
      label.append(select);
      details.append(label);
    }
    if (state.combat) details.append(element("p", "Umrüsten ist nach dem Kampf möglich."));
    row.append(details);
  }

  let questFilter = "active";
  function renderQuestLog() {
    const entries = rules.questEntries(state);
    const counts = Object.fromEntries(["active", "done", "failed"].map(status =>
      [status, entries.filter(entry => entry.status === status).length]));
    el("questlog-summary").textContent = "Questlog · " + counts.active + " offen";
    el("quest-clock").textContent = "Spielzug " + (state.questClock ?? 0);
    const filters = el("quest-filters");
    filters.replaceChildren();
    for (const [id, title] of [["active", "Offen"], ["done", "Erfüllt"], ["failed", "Gescheitert"], ["all", "Alle"]]) {
      const control = button(filters, title + " (" + (id === "all" ? entries.length : counts[id]) + ")", () => {
        questFilter = id;
        renderQuestLog();
        [...el("quest-filters").children].find(entry => entry.dataset.filter === id)?.focus();
      });
      control.dataset.filter = id;
      control.setAttribute("aria-pressed", questFilter === id);
    }
    const list = el("companion-quests");
    list.replaceChildren();
    for (const quest of entries.filter(entry => questFilter === "all" || entry.status === questFilter)) {
      const row = element("li");
      row.className = "quest-card";
      row.dataset.status = quest.status;
      row.append(element("small", quest.type + " · " + quest.giver), element("strong", quest.title), element("p", quest.text));
      const label = { active: "Offen", done: "Erfüllt", failed: "Gescheitert" }[quest.status];
      const status = element("p", label + (quest.status === "active" ? " · Noch " + quest.remaining + (quest.remaining === 1 ? " Spielzug" : " Spielzüge") : ""));
      status.className = "quest-status";
      if (quest.status === "active" && quest.remaining <= 5) status.classList.add("quest-urgent");
      row.append(status);
      if (quest.status === "active") {
        const timer = element("progress");
        timer.max = quest.deadline - quest.started;
        timer.value = quest.remaining;
        timer.setAttribute("aria-label", "Verbleibende Spielzüge für " + quest.title);
        row.append(timer);
        if (quest.companion && rules.questReady(state, quest.companion)) row.append(element("p", "Ziel erreicht · Vor Fristablauf am Treffpunkt abgeben."));
      }
      if (quest.companion) row.append(element("small", "Abgabe: " + world.companions[quest.companion].place + " oder Wachhof von Eiswacht"));
      if (quest.reason) row.append(element("p", quest.reason));
      if (quest.salary) row.append(element("p", quest.debt ? "Offener Sold: " + quest.debt + " Silber." : "Sold inzwischen bezahlt."));
      list.append(row);
    }
    if (!list.children.length) list.append(element("li", "Keine Aufträge in dieser Ansicht."));
  }

  function renderParty() {
    el("party-count").textContent = "Gefährten · " + state.party.length + " / " + rules.partyLimit;
    const members = el("party-members");
    members.replaceChildren();
    for (const id of state.party) {
      const companion = world.companions[id];
      const row = element("li");
      row.append(element("strong", companion.name + " · " + klassen.grundklassen[companion.klasse].name));
      row.append(element("div", companion.ability + " · " + companionEffect(companion) + " · Einmal pro Kampf"));
      renderMemberEquipment(row, id);
      const debt = state.companionQuests?.[id]?.debt ?? 0;
      if (debt) button(row, "Offenen Sold bezahlen · " + debt + " Silber", () => update(rules.paySalary(state, id)),
        { disabled: Boolean(state.combat) || !state.health || state.silver < debt });
      const relation = rules.relationship(state, id);
      const oath = { none: "", promised: "Versprechen offen", fulfilled: "Versprechen gehalten", broken: "Versprechen gebrochen" };
      const bond = { none: "", romance: "Romanze", friendship: "Enge Freundschaft" };
      row.append(element("p", ["Sympathie " + relation.score, oath[relation.oath], bond[relation.bond]].filter(Boolean).join(" · ")));
      if (relation.oath === "promised") row.append(element("p", world.recruitmentQuests[id].text));
      const labels = { talk: "Am Rastplatz sprechen", gift: "Geschenk annehmen", romance: "Über Gefühle sprechen", friendship: "Freundschaft vertiefen" };
      for (const action of rules.bondActions(state, id)) {
        button(row, labels[action], () => update(rules.bondWith(state, id, action)));
      }
      if (state.scene === "watch-yard" && !state.combat) {
        button(row, companion.name + " verabschieden", () => update(rules.dismiss(state, id)));
      }
      members.append(row);
    }
    if (!state.party.length) members.append(element("li", "Du reist allein."));
    renderQuestLog();
    const leads = Object.entries(world.companions).filter(([id, companion]) => companion.klasse !== state.role && !state.party.includes(id))
      .map(([id, companion]) => companion.name + " · " + klassen.grundklassen[companion.klasse].name + " · " +
        (rules.relationship(state, id).left ? "Hat die Gruppe verlassen" : companion.place));
    list(el("party-leads"), leads, "Keine weiteren Treffpunkte.");
    list(el("faction-ruf"), Object.entries(world.factions).map(([id, label]) => {
      const score = rules.reputation(state, id);
      return label + " · " + (score > 0 ? "+" : "") + score +
        (score >= 25 ? " · Wohlgesinnt" : score <= -25 ? " · Feindselig" : " · Neutral");
    }), "Keine Fraktionen bekannt.");
  }

  const companionPortraits = {
    knight: ["mann-01", 2], mage: ["frau-01", 0], priest: ["frau-01", 2],
    ranger: ["frau-01", 1], thief: ["mann-01", 0], necromancer: ["mann-01", 3],
    paladin: ["frau-01", 3], druid: ["mann-01", 1], warrior: ["frau-01", 1],
  };

  function fighterCard(name, detail, member = null) {
    const card = element("article");
    card.className = "fighter-card ally-card";
    const portrait = element("div");
    portrait.className = "battle-portrait";
    portrait.setAttribute("aria-hidden", "true");
    if (member === null) {
      setPortrait(portrait, state);
      portrait.removeAttribute("aria-label");
    } else {
      const [id, variant] = companionPortraits[member];
      const art = portraits.get(id, variant);
      portrait.style.backgroundImage = 'url("profilbilder/bilder/' + art.file + '")';
      portrait.style.backgroundPosition = art.position;
    }
    const identity = element("div");
    identity.className = "fighter-identity";
    identity.append(element("strong", name), element("small", detail));
    const initial = element("span", name.charAt(0));
    initial.className = "portrait-initial";
    portrait.append(initial);
    card.append(portrait, identity);
    return card;
  }

  // Wer in einem Kampfereignis handelt: Held, Begleiter, beschworenes Wesen oder eine anhaltende Wirkung.
  function actorName(actor, previous) {
    if (actor === "hero") return previous.name;
    if (actor === "summon") return "Beschworenes Wesen";
    if (actor === "dot") return "Anhaltende Wirkung";
    return world.companions[actor]?.name ?? "Gruppe";
  }

  function battleMessage(event, previous) {
    const name = actorName(event.actor, previous);
    if (event.kind === "retaliate") return "Gegenangriff · " + (event.value ? "−" + event.value + " LP" : "Abgewehrt");
    if (event.kind === "heal") return name + " heilt " + previous.name + ": +" + event.value + " LP";
    if (event.kind === "cover") return name + " sichert die Gruppe.";
    const target = rules.targets(previous).find(enemy => enemy.id === event.target)?.name ?? "Gegner";
    return name + " trifft " + target + ": −" + event.value + " LP";
  }

  function renderBattle(content) {
    const battlefield = element("section");
    battlefield.className = "battlefield";
    battlefield.setAttribute("aria-label", "Kampfübersicht");
    battlefield.style.setProperty("--battle-step", battleStepMs + "ms");
    const header = element("div");
    header.className = "battle-header";
    header.append(element("strong", "Runde " + (state.combat.round + 1)), element("span", "Dein Zug"));
    const sequence = element("ol");
    sequence.className = "battle-sequence";
    sequence.setAttribute("aria-label", "Aktionsfolge einer Runde");
    for (const [id, name] of [["hero", state.name], ...state.party.map(id => [id, world.companions[id].name]), ["enemies", "Gegner"]]) {
      const chip = element("li", name);
      chip.dataset.turnActor = id;
      if (id === "hero") { chip.className = "is-current"; chip.setAttribute("aria-current", "step"); }
      sequence.append(chip);
    }
    const group = element("section");
    group.className = "battle-side battle-allies";
    group.append(element("h3", "Deine Gruppe"));
    const formation = element("div");
    formation.className = "battle-formation";
    const hero = fighterCard(state.name, rules.title(state));
    hero.dataset.actor = "hero";
    const heroMeter = element("progress");
    heroMeter.max = rules.healthLimit(state);
    heroMeter.value = state.health;
    heroMeter.setAttribute("aria-label", "Deine Lebenspunkte");
    const health = element("div");
    health.className = "fighter-vitals";
    health.append(element("small", state.health + " / " + rules.healthLimit(state) + " LP"), heroMeter);
    hero.append(health);
    formation.append(hero);
    for (const id of state.party) {
      const companion = world.companions[id];
      const card = fighterCard(companion.name, klassen.grundklassen[companion.klasse].name, id);
      card.dataset.actor = id;
      const used = (state.combat.supportUsed ?? []).includes(id);
      const badge = element("span", used ? "✓ Verbraucht" : "✦ Bereit");
      badge.className = "ability-badge" + (used ? " is-used" : "");
      badge.title = companion.ability;
      badge.setAttribute("aria-label", companion.ability + (used ? " · Verbraucht" : " · Bereit"));
      card.append(badge);
      const gear = rules.memberEquipment(state, id);
      const held = world.gear[gear.weapon];
      const damage = 3 + Math.floor((companion.damage ?? 0) / 4) + (held?.power ?? 0) +
        (state.combat.id === "felsgreif" ? held?.airborne ?? 0 : 0);
      const stats = element("small", "Angriff " + damage + " · Schutz " + (world.gear[gear.armor]?.armor ?? 0));
      stats.className = "fighter-stats";
      card.append(stats);
      const details = element("details");
      details.className = "fighter-details";
      details.append(element("summary", "Details"), element("p", companion.ability + " · " + companionEffect(companion)),
        element("p", equipmentText(id)), element("p", "Greift nach deinem Zug automatisch an. Spezialfähigkeit einmal pro Kampf."));
      card.append(details);
      formation.append(card);
    }
    for (const summon of state.combat.diener) {
      const card = fighterCard(summon.name, summon.lp + " / " + summon.max + " LP · " +
        (summon.schaden ? summon.schaden + " Schaden" : "zieht Angriffe") + " · noch " + summon.runden + (summon.runden === 1 ? " Runde" : " Runden"));
      card.dataset.actor = "summon";
      formation.append(card);
    }
    group.append(formation);
    const opponents = element("section");
    opponents.className = "battle-side";
    opponents.append(element("h3", "Gegner · Ziel wählen"));
    const enemies = element("div");
    enemies.className = "battle-enemies";
    enemies.setAttribute("role", "group");
    enemies.setAttribute("aria-label", "Angriffsziel");
    const targets = rules.targets(state);
    if (!targets.some(enemy => enemy.id === enemyTarget && enemy.health > 0)) enemyTarget = targets.find(enemy => enemy.health > 0)?.id;
    for (const enemy of targets) {
      const card = element("button");
      card.type = "button";
      card.className = "fighter-card enemy-card";
      card.dataset.enemy = enemy.id;
      card.disabled = enemy.health === 0;
      card.setAttribute("aria-pressed", enemyTarget === enemy.id);
      const art = world.creatures[state.combat.id].image;
      if (art && enemy.id === 0) {
        const img = element("img");
        img.src = "bestiarium/bilder/" + art;
        img.alt = "";
        card.append(img);
      }
      const meter = element("progress");
      meter.max = enemy.max;
      meter.value = enemy.health;
      meter.setAttribute("aria-label", enemy.name + " · Lebenspunkte");
      const rank = kampf.raenge[enemy.rang].name + " · Stufe " + enemy.stufe;
      card.append(element("strong", enemy.name), meter, element("small",
        enemy.health ? enemy.health + " / " + enemy.max + " LP · " + rank + (enemy.status ? " · " + enemy.status : "") : "Besiegt"));
      card.addEventListener("click", () => {
        if (animating) return;
        enemyTarget = enemy.id;
        for (const entry of enemies.children) entry.setAttribute("aria-pressed", Number(entry.dataset.enemy) === enemyTarget);
        summary.textContent = "Ziel: " + enemy.name;
      });
      enemies.append(card);
    }
    opponents.append(enemies);
    const summary = element("p", "Ziel: " + targets.find(enemy => enemy.id === enemyTarget)?.name);
    summary.className = "battle-target";
    summary.setAttribute("aria-live", "polite");
    const announcement = element("p", lastBattleMessages.at(-1) ?? "Wähle ein Ziel und deine Aktion. Danach handeln deine Begleiter.");
    announcement.className = "battle-announcement";
    announcement.setAttribute("role", "status");
    const log = element("details");
    log.className = "battle-round-log";
    log.append(element("summary", "Letzte Runde · " + lastBattleMessages.length + " Aktionen"));
    const messages = element("ol");
    for (const message of lastBattleMessages) messages.append(element("li", message));
    log.append(messages);
    log.hidden = !lastBattleMessages.length;
    battlefield.append(header, sequence, group, opponents, summary, announcement, log);
    content.append(battlefield);
  }

  async function battleAction(action, item) {
    if (animating || !state.combat) return;
    const previous = state;
    const events = [];
    const next = rules.strike(previous, action, Math.random, item, enemyTarget, events);
    if (next === previous) return;
    lastBattleMessages = events.map(event => battleMessage(event, previous));
    if (!events.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      update(next);
      return;
    }
    animating = true;
    // Commit the round before playing its feedback so a reload keeps the outcome.
    state = next;
    save();
    const panel = el("play");
    panel.inert = true;
    panel.setAttribute("aria-busy", "true");
    try {
      for (const event of events) {
        const retaliates = event.kind === "retaliate";
        const actor = panel.querySelector(retaliates ? '[data-enemy="' + event.actor + '"]' : '[data-actor="' + event.actor + '"]');
        const target = retaliates || event.kind === "heal" ? panel.querySelector('[data-actor="hero"]') :
          panel.querySelector('[data-enemy="' + event.target + '"]');
        for (const chip of panel.querySelectorAll("[data-turn-actor]")) {
          const current = chip.dataset.turnActor === (retaliates ? "enemies" : event.actor);
          chip.classList.toggle("is-current", current);
          if (current) chip.setAttribute("aria-current", "step"); else chip.removeAttribute("aria-current");
        }
        panel.querySelector(".battle-header span").textContent = retaliates ? "Gegnerzug" :
          actorName(event.actor, previous) + " handelt";
        panel.querySelector(".battle-announcement").textContent = battleMessage(event, previous);
        actor?.classList.add("is-acting");
        actor?.classList.add(retaliates ? "enemy-lunge" : event.kind === "cover" ? "fighter-cover" : "fighter-lunge");
        let marker;
        if (target && event.value > 0) {
          const healing = event.kind === "heal";
          if (!healing) target.classList.add("fighter-hit");
          marker = element("span", (healing ? "+" : "−") + event.value);
          marker.className = "hit-value";
          if (healing) marker.classList.add("healing-value");
          marker.setAttribute("aria-hidden", "true");
          target.append(marker);
          const meter = target.querySelector("progress");
          if (meter) meter.value = Math.min(meter.max, Math.max(0, meter.value + (healing ? event.value : -event.value)));
        }
        await new Promise(resolve => setTimeout(resolve, battleStepMs));
        actor?.classList.remove("is-acting", "enemy-lunge", "fighter-cover", "fighter-lunge");
        target?.classList.remove("fighter-hit");
        marker?.remove();
      }
    } finally {
      animating = false;
      panel.inert = false;
      panel.removeAttribute("aria-busy");
      render();
      showTurnStatus(previous, next);
      const ending = !next.combat;
      if (ending) el("scene-title").focus();
      else (el("scene-actions").querySelector("button:not(:disabled)") ?? el("scene-title")).focus();
    }
  }

  function renderScene() {
    const scene = world.scenes[state.scene];
    const combat = state.combat;
    const content = el("scene-content");
    const actions = el("scene-actions");
    actions.classList.toggle("battle-actions", Boolean(combat));
    if (!combat || combat.round === 0) lastBattleMessages = [];
    el("location").textContent = scene.place;
    const opponent = combat && (world.fights[combat.id].name ?? world.creatures[combat.id].name);
    el("scene-title").textContent = combat ? "Kampf · " + opponent : scene.title;
    content.replaceChildren();
    actions.replaceChildren();
    if (!combat && scene.creature && world.creatures[scene.creature].image) content.append(creatureImage(world.creatures[scene.creature]));
    if (!combat && scene.illustration) {
      const illustration = element("img");
      illustration.src = "spiel/prolog/" + scene.illustration;
      illustration.alt = "";
      illustration.className = "scene-illustration";
      content.append(illustration);
    }
    if (combat) {
      renderBattle(content);
      const values = rules.kampfwerte(state);
      const held = combat.held;
      const line = element("p", "Erfahrungsstufe " + values.stufe + " · Ausdauer " + values.ausdauer + " / " + values.ausdauerMax +
        (values.manaMax ? " · Mana " + values.mana + " / " + values.manaMax : "") + " · " + values.ressourceName + " " + values.ressource +
        (held.schild ? " · Schild " + held.schild : "") + (held.unsichtbar ? " · Unsichtbar" : "") +
        (held.staerkung ? " · +" + held.staerkung.wert + " Schaden" : "") + (held.naechster ? " · Nächster Angriff +" + held.naechster : ""));
      line.className = "battle-resources";
      content.append(line);
      if (combat.stunned) content.append(element("p", "Benommen · Dein nächster Angriff ist schwächer."));
      const special = world.fights[combat.id].special;
      if (combat.feinde[0].lp > 0 && combat.round % 2 === 1) content.append(element("p", special.warning + " Deckung schützt vor dem Zusatzeffekt."));
      if (combat.bleeding > 0) content.append(element("p", "Blutung · " + combat.bleeding + " Runden"));
      // Eine Aktion pro Runde: Grundangriff oder eine freigeschaltete Fähigkeit.
      const canBoost = values.ressource >= 1;
      const boost = element("label");
      boost.className = "boost-toggle";
      const boostBox = element("input");
      boostBox.type = "checkbox";
      boostBox.checked = boostAbility && canBoost;
      boostBox.disabled = !canBoost;
      boostBox.addEventListener("change", () => { boostAbility = boostBox.checked; renderScene(); });
      boost.append(boostBox, " Mit 1 " + values.ressourceName + " verstärken (+25 %)");
      for (const f of rules.abilities(state).filter((entry) => entry.frei)) {
        const reason = rules.abilityState(state, f.id);
        const boostable = boostAbility && canBoost && f.stufe >= 3 && f.stufe < 20 && f.id[0] !== "m";
        const cost = f.id === "f1" ? "Grundangriff · " + world.items[rules.weapon(state)] :
          f.kostenWert + " " + (f.zahlung === "M" ? "Mana" : "Ausdauer") + (f.ressource ? " + " + f.ressource + " " + values.ressourceName : "") +
          (boostable ? " + 1 " + values.ressourceName : "");
        const label = f.name + " · " + cost + (reason ? " · " + reason : "");
        const node = button(actions, label, () => battleAction(f.id + (boostable ? "+" : "")), { disabled: Boolean(reason) });
        if (node) node.title = f.wirkung;
        if (node && f.id === "f1") node.dataset.battleAction = "spear";
      }
      actions.append(boost);
      const abilities = world.classes[rules.profile(state.faction, state.role)];
      for (const [id, label, shift] of [
        ["ember", "Glutgabe · " + abilities.attack.name, 2],
        ["restore", "Glutgabe · " + abilities.restore.name, -2], ["guard", "Deckung und Sammlung", 0], ["flee", "Fliehen", 0],
      ]) {
        const risk = shift && Math.abs(state.balance + shift) >= 4;
        const cost = shift ? " · 1 Glut" : "";
        const control = button(actions, label + cost + (risk ? " · Rückschlag" : ""),
          () => battleAction(id), { disabled: Boolean(shift && !state.ember) });
        control.dataset.battleAction = id;
      }
      button(actions, "Gegenstand", () => openHub());
      if (world.fights[combat.id].regeneration) {
        button(actions, "Mit Fackel angreifen · schwächt den Gegenangriff und stoppt Regeneration", () => battleAction("torch"));
      }
    } else {
      enemyTarget = null;
      let sceneText = scene.text;
      if (state.scene === "watch-yard" && state.marks.includes("joren-gerettet")) {
        sceneText = "Unter der Torlaube hängt Jorens Laterne. Er sitzt mit geschientem Bein am Wachfeuer. Lene hat ihren Schal zum Trocknen über die Bank gelegt. Runa hält den Seilwagen für die Grenzwache bereit.";
      } else if (state.scene === "watch-yard" && state.marks.includes("joren-verloren")) {
        sceneText = "Jorens Haken unter der Torlaube ist leer. Der Seilwagen steht am Brunnen. Runa hält die übrigen Wege offen und lässt am Wachfeuer eine Kanne Wasser für dich stehen.";
      }
      if (state.scene === "skarn-gate" && (state.marks.includes("runen-geschuetzt") || state.marks.includes("runen-verbrannt"))) {
        sceneText = state.marks.includes("runen-geschuetzt")
          ? "Aus Naldas Esse steigt wieder Rauch. Torben hält die Laterne, während die Nachbarn ihre Säcke durch das gesicherte Tor bringen."
          : "Nalda und Torben tragen die Säcke auf den unteren Steig. Über dem eingestürzten Tor stehen die Familiennamen nur noch auf ihren Zetteln.";
      }
      content.append(element("p", sceneText));
      if (state.scene === "skarn-gate" && state.marks.includes("pass-gesperrt")) {
        content.append(element("p", "Von der Ziegenstiege siehst du unten die Schranke. Ins Kronreich gelangt die Bergwacht derzeit nur über den schmalen Umweg."));
      }
      if (state.scene === "skarn-aftermath") {
        content.append(element("p", state.marks.includes("runen-geschuetzt")
          ? "Das Runentor bleibt als Versorgungsweg erhalten."
          : "Das Tor ist eingestürzt. Die Bewohner müssen ihre Vorräte nun über den unteren Steig tragen."));
      }
      if (state.scene === "supply-post") {
        const stock = element("div");
        stock.className = "actions trade-list";
        stock.append(element("h3", "Kaufen · " + state.silver + " Silber verfügbar"));
        for (const [id, price] of Object.entries(world.shop)) {
          const gear = world.gear[id];
          const supply = world.supplies[id];
          const effect = gear?.power ? gear.power + " Grundschaden" : gear?.armor ? gear.armor + " Rüstung" :
            gear?.magic ? "+" + gear.magic + " Glutschaden" : gear?.travel ? "+" + gear.travel + " auf List unterwegs" :
            supply?.heal ? "+" + supply.heal + " LP" : "+" + supply.ember + " Glut";
          button(stock, world.items[id] + " · " + effect + " · " + price + " Silber", () => update(rules.trade(state, id, true)),
            { disabled: price > state.silver || state.inventory.length >= 180 });
        }
        const trophies = Object.entries(world.salePrices).filter(([id]) => state.inventory.includes(id));
        if (trophies.length) stock.append(element("h3", "Trophäen verkaufen"));
        for (const [id, price] of trophies) {
          button(stock, world.items[id] + " · +" + price + " Silber", () => update(rules.trade(state, id, false)));
        }
        content.append(stock);
      }
      if (state.scene === "arrival") {
        content.append(element("h3", "Folgen deiner Reise"));
        const { field, ford, delivery } = rules.ending(state);
        content.append(element("p", field), element("p", ford));
        const result = element("p", delivery
          ? "Noch vor Einbruch der Dunkelheit erreicht die Kornfuhre Heidvang."
          : "Die Warnung ist überbracht. Die Kornfuhre bleibt über Nacht in Kornwik.");
        result.className = "chapter-result";
        content.append(result);
        if (state.marks.includes("saat-erholt")) {
          content.append(element("p", "Am geretteten Acker keimt die Saat. Die Fuhrleute bitten dich, etwas Saatgut für sie zurückzulegen."));
        }
        if (state.marks.includes("saat-verbrannt")) {
          content.append(element("p", "Die Fuhrleute haben die verbrannte Saat gesehen. Sie stellen dir keine Begleitung für das Moor bei Eiswacht."));
        }
      }
      if (state.scene === "moor-end") {
        const { bridge, news, messengers } = rules.moorConsequences(state);
        content.append(element("h3", "Folgen deiner Entscheidung"), element("p", bridge), element("p", news));
        if (messengers) content.append(element("p", "Die Boten haben die Fuhrleute erreicht. Sie bleiben vorerst bei Kornwik."));
        if (state.marks.includes("saatgut-zurueckgelegt")) {
          content.append(element("p", "Die Fuhrleute bringen das zurückgelegte Saatgut nach Kornwik. Der erholte Acker kann neu bestellt werden."));
        }
      }
      if (state.scene === "watch") {
        content.append(element("p", state.marks.includes("hochweg-kurz")
          ? "Über die markierten Bohlen bist du früh angekommen. Die Fährfrau konnte deinen Bericht bestätigen. Du erhältst +2 auf die Aussage."
          : "Über den Höhenweg erreichst du das Torhaus später. Die Schreiberin muss deinen Bericht allein beurteilen."));
      }
      if (state.scene === "watch-end") {
        content.append(element("p", state.marks.includes("hochwacht-archiv")
          ? "Du darfst die Wachberichte einsehen. Einer vermerkt graue Asche auf der Südseite des Eispasses."
          : "Die Berichte bleiben unter Verschluss. Die Wache nimmt deinen Namen für eine spätere Befragung auf."));
      }
      if (state.scene === "pass-report") {
        if (state.marks.includes("joren-gerettet")) {
          content.append(element("p", "Lene legt Joren den trockenen Schal um die Schultern. Er drückt ihr die Laterne in die Hand. „Damit du sie morgen an den Haken hängst.“"));
        }
        if (state.marks.includes("joren-verloren")) {
          content.append(element("p", "Lene hört dir zu, ohne dich zu unterbrechen. Dann faltet sie den trockenen Schal zusammen und geht allein vom Hof."));
        }
        content.append(element("p", state.marks.includes("pass-gesperrt")
          ? "Die Wache sperrt die Grenzsteine. Du kannst weiterhin die Nebenwege erkunden."
          : "Eine Wache übernimmt den Übergang. Am Wachhof liegen Vorräte für dich bereit."));
      }
      if (state.scene === "return-ford") {
        content.append(element("p", rules.ending(state).delivery
          ? "Das Korn aus Kornwik liegt im Speicher."
          : "Die Fährfrau wartet noch auf die Kornfuhre aus Kornwik."));
      }
      if (state.scene === "return-moor") {
        content.append(element("p", rules.moorConsequences(state).bridge));
      }
      if (state.scene === "return-forest") {
        const pathClear = ["woelfe-besiegt", "woelfe-vertrieben"].some(mark => state.marks.includes(mark));
        content.append(element("p", pathClear ? "Der Wagenweg ist seit deiner Begegnung mit dem Rudel frei." :
          "Am Wagenweg liegen frische Wolfsspuren. Der Bachpfad bleibt schmal."));
        if (state.marks.includes("forstbuch-zurueckgegeben")) {
          content.append(element("p", "Enna hat die Karten abgenommen. Am Zaun findest du das Siegel des Fährhauses. Bis zur Klärung der Grenze dürfen die Dorfbewohner ihre Tiere weiter auf die Weide treiben."));
        }
      }
      if (state.scene === "return-field") {
        if (state.marks.includes("saat-verbrannt")) content.append(element("p", "Der Saatstreifen ist noch schwarz."));
        if (state.marks.includes("saat-erholt")) content.append(element("p", "Auf dem Saatstreifen stehen die ersten grünen Halme."));
      }
      const choices = rules.choices(state);
      for (const choice of choices) {
        const attribute = choice.check ? klassen.fertigkeiten[choice.check[0]].name : "";
        const risk = choice.emberRescue && state.balance <= -2 ? " · Rückschlag" : "";
        button(actions, choice.label + (attribute ? " · Probe auf " + attribute : "") + risk,
          () => update(rules.choose(state, choice.id)), { story: true });
      }
      const candidates = rules.candidates(state);
      if (candidates.length) {
        const recruitment = element("section");
        recruitment.className = "recruitment";
        recruitment.append(element("h3", "Gefährten vor Ort"));
        if (state.party.length >= rules.partyLimit) {
          recruitment.append(element("p", "Deine Gruppe ist voll. Am Wachhof kannst du jemanden verabschieden."));
        }
        for (const [id, companion] of candidates) {
          const candidate = element("article");
          candidate.append(element("h4", companion.name + " · " + klassen.grundklassen[companion.klasse].name),
            element("p", companion.introduction),
            element("p", companion.ability + " · " + companionEffect(companion)));
          candidate.append(element("p", "Sympathie: " + rules.relationship(state, id).score));
          const status = rules.recruitment(state, id);
          if (status === "ready") {
            button(candidate, companion.name + " mitnehmen", () => update(rules.recruit(state, id)),
              { disabled: state.party.length >= rules.partyLimit });
          } else if (status === "promise") {
            candidate.append(element("p", world.recruitmentQuests[id].text + " Frist: " + world.recruitmentQuests[id].turns + " Spielzüge ab Annahme."));
            button(candidate, "Auftrag annehmen · " + world.recruitmentQuests[id].title, () => update(rules.promise(state, id)));
          } else if (status === "task") {
            const plan = world.recruitmentQuests[id];
            candidate.append(element("p", plan.text + " Noch " + (rules.questEntries(state).find(quest => quest.id === "companion-" + id)?.remaining ?? plan.turns) + " Spielzüge."));
            if (plan.salary) {
              button(candidate, "Sold zahlen · " + plan.salary + " Silber", () => update(rules.completeQuest(state, id)),
                { disabled: state.silver < plan.salary });
              button(candidate, "Sold später zahlen · " + plan.salary + " Silber in 30 Spielzügen", () => update(rules.completeQuest(state, id, true)));
            } else {
              button(candidate, "Auftrag abschließen" + (plan.item ? " · " + world.items[plan.item] + " abgeben" : ""),
                () => update(rules.completeQuest(state, id)), { disabled: !rules.questReady(state, id) });
            }
          } else {
            candidate.append(element("p", status === "failed" ? "Der Aufnahmeauftrag ist gescheitert. Eine Aufnahme ist nicht mehr möglich." : ["blocked", "wary"].includes(status) ? world.companionAttitudes[id].reason :
              companion.name + " lehnt es ab, dich zu begleiten."));
          }
          const debt = state.companionQuests?.[id]?.debt ?? 0;
          if (debt) button(candidate, "Offenen Sold begleichen · " + debt + " Silber", () => update(rules.paySalary(state, id)),
            { disabled: state.silver < debt });
          recruitment.append(candidate);
        }
        content.append(recruitment);
      }
      if (!choices.length) button(actions, "Zum Hauptmenü", () => showHome());
    }
  }

  // Klasse, Ressource, Spezialisierung und Meisterklasse im Charakterbereich.
  function renderClassSheet() {
    const sheet = el("class-sheet");
    const faction = klassen.fraktionen[state.faction];
    const data = faction.klassen[state.role];
    const people = faction.volk;
    const master = klassen.meisterklassen[people];
    const lines = [
      element("h4", "Klasse · " + rules.title(state)),
      element("p", data.spielweise + "."),
      element("p", "Ressource " + faction.ressource + ": " + data.ressource + ". Im Kampf verstärkt 1 " + faction.ressource +
        " eine Fähigkeit ab Stufe 3 um 25 %, die Stufe-20-Fähigkeit kostet 3."),
    ];
    // Angriffe, Zauber und Techniken der Klasse (Kampfdokument, 17. 11. 2026).
    const abilityList = element("ul");
    abilityList.className = "ability-list";
    for (const f of rules.abilities(state)) {
      const item = element("li");
      const cost = f.kostenWert ? f.kostenWert + " " + f.zahlung : "kostenlos";
      const extra = [cost, f.einmal ? "1 × pro Schlacht" : f.abklingzeitWert ? "AK " + f.abklingzeitWert : "",
        f.ressource ? f.ressource + " " + faction.ressource : "", f.spezialisiert ? "Spezialisierung +50 %" : ""].filter(Boolean).join(" · ");
      item.append(element("strong", f.id[0] === "m" ? "Meister · " + f.name : "Stufe " + f.stufe + " · " + f.name),
        element("span", " " + f.wirkung + " (" + extra + ")" + (f.frei ? "" : " · noch gesperrt")));
      if (!f.frei) item.className = "locked";
      abilityList.append(item);
    }
    lines.push(element("h4", rules.kampfwerte(state).manaMax ? "Angriffe und Zauber" : "Angriffe und Techniken"), abilityList);
    if (people === "orks") lines.push(element("p", state.rausch ? "Kampfrausch bereit · +2 Schaden beim nächsten Angriff."
      : "Nach jeder gewonnenen Schlacht trägt dich eine Runde Kampfrausch."));
    const spez = state.build.spez;
    if (spez) {
      lines.push(element("p", "Spezialisierung " + data[spez.variante][0] + ": " + data[spez.variante][1] + "."));
    } else {
      lines.push(element("p", "Spezialisierung ab Quest-Stufe " + klassen.regeln.spezialisierungStufe + " (derzeit " + state.questStufe + "): " +
        data.a[0] + " oder " + data.b[0] + "."));
    }
    lines.push(element("p", state.build.meister ? "Meisterklasse " + rules.title(state) + " · " + master.faehigkeit + "."
      : "Meisterklasse nach der " + master.vereinigung + ": " + master.name + "."));
    sheet.replaceChildren(...lines);
    if (!spez && state.questStufe >= klassen.regeln.spezialisierungStufe && !state.combat && state.health) {
      const values = rules.heroAttributes(state);
      const limits = rules.heroLimits(state);
      const target = Object.keys(world.attributes).find((id) => values[id] < klassen.regeln.grundwertMax);
      const skill = Object.keys(klassen.fertigkeiten).find((id) => state.build.fertigkeiten[id] < limits[id]) ??
        Object.keys(klassen.fertigkeiten).find((id) => id !== "magie" || faction.magie);
      for (const variante of ["a", "b"]) {
        button(sheet, data[variante][0] + " werden", () => update(rules.specialize(state, variante,
          el("spez-grundwert").value || target, el("spez-fertigkeit").value || skill)));
      }
      const pick = (id, options, value) => {
        const select = element("select");
        select.id = id;
        for (const [key, label] of options) select.add(new Option(label, key));
        select.value = value;
        return select;
      };
      sheet.append(element("p", "+1 Grundwert und +1 Fertigkeitspunkt:"),
        pick("spez-grundwert", Object.entries(world.attributes), target),
        pick("spez-fertigkeit", Object.entries(klassen.fertigkeiten).map(([id, item]) => [id, item.name]), skill));
    }
  }

  function render() {
    setPortrait(el("avatar"), state);
    el("hero-name").textContent = state.name;
    el("hero-origin").textContent = klassen.voelker[klassen.fraktionen[state.faction].volk].name + " · " +
      klassen.fraktionen[state.faction].name + " · " + rules.title(state);
    const finishedRescue = state.marks.includes("joren-gerettet") || state.marks.includes("joren-verloren");
    const skarnDone = state.marks.includes("runen-geschuetzt") || state.marks.includes("runen-verbrannt");
    el("objective").textContent = state.scene === "watch-yard" && finishedRescue
      ? "Reise weiter nach Glutberg oder erkunde die übrigen Wege."
      : state.scene === "skarn-gate" && skarnDone
        ? "Der Auftrag am Runentor ist abgeschlossen."
        : world.scenes[state.scene].objective;
    const clues = [
      ["joren-zeichen", "Jorens Ausrüstung ist mit rotem Garn markiert."],
      ["runa-plan", "Zwei Lichtzeichen am Signalplatz rufen Runas Seilwagen."],
      ["joren-spur", "Jorens Spur führt zum alten Grenzhaus."],
      ["seilwagen", "Der Seilwagen ist auf dem Weg zum Grenzhaus."],
      ["joren-gerettet", "Joren ist in Sicherheit."],
      ["joren-verloren", "Joren blieb im Grenzhaus zurück."],
    ].filter(([mark]) => state.marks.includes(mark));
    const cluesList = el("quest-clues");
    cluesList.hidden = !clues.length;
    cluesList.replaceChildren(...clues.map(([, text]) => element("li", text)));
    stats(el("vitals"), [
      ["Lebenspunkte", state.health + " / " + rules.healthLimit(state)],
      ...((values) => [["Ausdauer", values.ausdauer + " / " + values.ausdauerMax],
        ...(values.manaMax ? [["Mana", values.mana + " / " + values.manaMax]] : []),
        [values.ressourceName, String(values.ressource)]])(rules.kampfwerte(state)),
      ["Glut", state.ember + " / " + rules.emberLimit(state)],
      ["Gleichgewicht", state.balance === 0 ? "0 · Im Gleichgewicht" :
        state.balance < 0 ? state.balance + " · Erneuerung" : "+" + state.balance + " · Zerstörung"],
    ]);
    stats(el("attributes"), attributeValues(rules.heroAttributes(state)));
    const limits = rules.heroLimits(state);
    stats(el("skills"), Object.entries(rules.heroSkills(state)).map(([id, value]) =>
      [klassen.fertigkeiten[id].name, value + " / " + limits[id]]));
    renderClassSheet();
    renderInventory();
    renderParty();
    const progress = rules.progression(state);
    el("level-heading").textContent = "Erfahrungsstufe " + progress.level;
    const bar = el("xp-bar");
    bar.hidden = progress.next === null;
    bar.max = (progress.next ?? progress.floor + 1) - progress.floor;
    bar.value = progress.xp - progress.floor;
    el("xp-label").textContent = progress.next === null ? progress.xp + " EP · Höchste Erfahrungsstufe" :
      progress.xp + " EP · Noch " + (progress.next - progress.xp) + " bis Stufe " + (progress.level + 1);
    const training = el("training");
    training.replaceChildren();
    if (progress.points) {
      training.append(element("p", progress.points + (progress.points === 1 ? " Grundwertpunkt" : " Grundwertpunkte") + " aus früheren Stufenaufstiegen"));
      const values = rules.heroAttributes(state);
      for (const [id, label] of Object.entries(world.attributes)) {
        button(training, "+1 " + label, () => update(rules.train(state, id)),
          { disabled: Boolean(state.combat) || !state.health || values[id] >= klassen.regeln.grundwertMax });
      }
    }
    el("legacy-build").hidden = !state.umschulung || Boolean(state.combat) || !state.health;
    list(el("journal"), [...state.journal].reverse(), "Deine Reise beginnt.");
    renderScene();
    renderMap();
  }

  for (const [id, data] of Object.entries(klassen.voelker)) volk.add(new Option(data.name, id));
  for (const [id, label] of Object.entries(world.attributes)) volkWahl.add(new Option(label, id));

  function fillFactions() {
    const allowed = Object.entries(klassen.fraktionen).filter(([id, data]) => data.volk === volk.value &&
      (!editingLegacy || rules.originOf(id) === state.origin));
    const previous = origin.value;
    origin.replaceChildren(...allowed.map(([id, data]) =>
      new Option(data.name + " · " + data.schwierigkeit + " · " + data.ressource, id)));
    if (allowed.some(([id]) => id === previous)) origin.value = previous;
    const people = klassen.voelker[volk.value];
    el("volk-description").textContent = people.text;
    el("volk-choice").hidden = !people.wahl;
    fillClasses();
  }

  function fillClasses() {
    const previous = role.value;
    role.replaceChildren(...klassen.klassenFolge.map((id) => new Option(
      rules.className(origin.value, id) + " · " + klassen.grundklassen[rules.profile(origin.value, id)].name, id)));
    if (previous) role.value = previous;
    const faction = klassen.fraktionen[origin.value];
    el("faction-description").textContent = "Ressource " + faction.ressource + " · Schwierigkeit " + faction.schwierigkeit +
      " · Grundwerte " + bonusText(faction.bonus) + (faction.magie ? "" : " · keine Magie") + " · Startort " +
      startpunkte.ort(origin.value) + " · Prolog „" + startpunkte.fraktionen[origin.value].prolog + "“" + (faction.hinweis ? ". " + faction.hinweis : "");
    if (!editingLegacy || portraitNeedsReset) portraitPreview(true);
    updateClassDescription();
  }
  let portraitNeedsReset = true;

  const bonusText = (bonus) => Object.entries(bonus).map(([id, value]) => world.attributes[id] + " " + signed(value)).join(", ");

  function updateClassDescription() {
    const data = klassen.fraktionen[origin.value].klassen[role.value];
    const profile = klassen.grundklassen[rules.profile(origin.value, role.value)];
    const kit = world.classes[rules.profile(origin.value, role.value)];
    const box = el("class-description");
    box.replaceChildren(
      element("p", data.spielweise + ". " + profile.rolle + "."),
      element("p", "Grundwerte " + bonusText(profile.bonus) + " · Hauptfertigkeiten " +
        profile.haupt.map((id) => klassen.fertigkeiten[id].name).join(" und ") + "."),
      element("p", "Nutzt " + klassen.fraktionen[origin.value].ressource + ": " + data.ressource + "."),
      element("p", "Im Kampf: " + kit.description),
      element("p", "Spezialisierung ab Quest-Stufe 3: " + data.a[0] + " (" + data.a[1] + ") oder " + data.b[0] + " (" + data.b[1] + ")."),
    );
    suggest();
  }

  // Vorschlag aus den Regeln: freie Punkte auf die Grundwerte der Hauptfertigkeiten, Fertigkeiten passend verteilt.
  function suggest(keepPoints = false) {
    const proposal = rules.defaultBuild(origin.value, role.value, keepPoints ? { ...allocation } : null, volkWahl.value);
    if (!keepPoints) allocation = { ...proposal.frei };
    if (proposal.wahl) volkWahl.value = proposal.wahl;
    skills = editingLegacy
      ? rules.suggestSkills(origin.value, role.value, { ...proposal, frei: allocation })
      : { ...proposal.fertigkeiten };
    renderPoints();
  }

  volk.addEventListener("change", fillFactions);
  origin.addEventListener("change", fillClasses);
  role.addEventListener("change", updateClassDescription);
  volkWahl.addEventListener("change", () => renderPoints());
  el("skill-suggest").addEventListener("click", () => suggest(true));
  appearance.addEventListener("change", () => portraitPreview(true));
  variant.addEventListener("change", () => portraitPreview());
  el("new-game").addEventListener("click", () => {
    editingLegacy = false;
    portraitNeedsReset = true;
    el("character-form").reset();
    for (const input of [name, volk, appearance, variant]) input.disabled = false;
    el("character-submit").textContent = "Prolog starten";
    creationNote = state ? "Beim Start des Prologs wird der bisherige lokale Spielstand ersetzt." : "";
    fillFactions();
    show("creation");
    el("creation-title").focus();
  });
  el("legacy-build").addEventListener("click", () => {
    editingLegacy = true;
    portraitNeedsReset = false;
    name.value = state.name;
    volk.value = klassen.fraktionen[state.faction].volk;
    appearance.value = state.appearance;
    fillFactions();
    origin.value = state.faction;
    role.value = state.role;
    fillClasses();
    const id = state.appearance + "-0" + world.origins[state.origin].portrait;
    variant.replaceChildren(...portraits.styles(id).map((label, index) => new Option(label, index)));
    variant.value = String(state.variant);
    for (const input of [name, volk, appearance, variant]) input.disabled = true;
    el("character-submit").textContent = "Held anpassen";
    creationNote = "Das Klassensystem ist neu. Wähle einmal Fraktion, Klasse, Grundwerte und Fertigkeiten. Reise, Beute und Stufenaufstiege bleiben erhalten.";
    portraitPreview();
    show("creation");
    el("creation-title").focus();
  });
  el("cancel").addEventListener("click", () => editingLegacy ? showPlay(state) : showHome());
  el("character-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      if (el("creation").hidden) return;
      if (editingLegacy) {
        showPlay(rules.retrain(state, origin.value, role.value, draftBuild()));
        return;
      }
      const next = rules.create(name.value, origin.value, appearance.value, Number(variant.value), role.value, draftBuild());
      state = next;
      save();
      setPortrait(el("intro-portrait"), next);
      show("prologue");
      prologue.play(next.name, next.faction, () => showPlay(next));
    } catch (error) {
      el("creation-status").textContent = error.message;
    }
  });
  el("continue").addEventListener("click", () => showPlay(state));
  el("menu").addEventListener("click", () => showHome());
  el("export").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
    const download = element("a");
    download.href = url;
    download.download = "aschenkrone-spielstand.json";
    download.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  el("save-file").addEventListener("change", async (event) => {
    const input = event.currentTarget;
    const file = input.files[0];
    input.value = "";
    if (!file) return;
    const request = ++importRequest;
    const previous = state;
    const isCurrent = () => request === importRequest && state === previous && !el("home").hidden;
    try {
      if (file.size > 64 * 1024) throw new Error("Datei zu groß");
      const imported = rules.read(await file.text());
      if (isCurrent()) showPlay(imported);
    } catch {
      if (isCurrent()) showHome("Diese Datei ist kein gültiger Aschenkrone-Spielstand.");
    }
  });

  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) state = rules.read(stored);
    showHome();
  } catch {
    showHome("Der lokale Spielstand ist nicht verfügbar. Du kannst eine Spielstanddatei laden oder neu beginnen.");
  }
})();
