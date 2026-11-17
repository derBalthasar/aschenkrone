"use strict";

(() => {
  const key = "aschenkrone.valmarch.v1";
  const el = (id) => document.getElementById(id);
  const layoutKey = "aschenkrone.layout";
  const layoutMode = el("layout-mode");
  const narrowLayout = window.matchMedia("(max-width: 51.99rem)");
  const name = el("character-name");
  const origin = el("origin");
  const role = el("class");
  const mapPlaces = el("map-places");
  const appearance = el("appearance");
  const variant = el("variant");
  let state = null;
  let importRequest = 0;
  let allocation = {};
  let target = null;
  let enemyTarget = null;
  let animating = false;
  const battleStepMs = 248;
  let editingLegacy = false;
  const pointControls = new Map();

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

  function attributeValues(id, points) {
    return Object.entries(rules.attributes(id, points)).map(([stat, value]) => [world.attributes[stat], value]);
  }

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
      const id = appearance.value + "-0" + world.origins[origin.value].portrait;
      variant.replaceChildren(...portraits.styles(id).map((label, index) => new Option(label, index)));
    }
    el("preview-caption").textContent = setPortrait(el("preview"), {
      origin: origin.value, appearance: appearance.value, variant: Number(variant.value),
    });
    stats(el("preview-stats"), attributeValues(origin.value, allocation));
  }

  function renderPoints() {
    const remaining = 6 - Object.values(allocation).reduce((sum, value) => sum + value, 0);
    el("points-left").textContent = remaining + " von 6 Punkten verfügbar";
    for (const [key, controls] of pointControls) {
      const spent = allocation[key] ?? 0;
      controls.value.textContent = "+" + spent;
      controls.minus.disabled = spent === 0;
      controls.plus.disabled = remaining === 0;
    }
    portraitPreview();
  }

  for (const [key, label] of Object.entries(world.attributes)) {
    const row = element("div");
    row.className = "point-row";
    const value = element("output");
    const minus = element("button", "−");
    const plus = element("button", "+");
    for (const [control, change] of [[minus, -1], [plus, 1]]) {
      control.type = "button";
      control.className = "action";
      control.setAttribute("aria-label", label + (change > 0 ? " erhöhen" : " senken"));
      control.addEventListener("click", () => {
        allocation[key] = (allocation[key] ?? 0) + change;
        renderPoints();
      });
    }
    row.append(element("span", label), minus, value, plus);
    el("point-controls").append(row);
    pointControls.set(key, { value, minus, plus });
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
    el("map-status").textContent = state.combat ? "Im Kampf kannst du die Karte ansehen. Reiseoptionen öffnen sich nach der Begegnung." :
      location ? "Standort: " + location + (travels.size ? " · Wähle ein Reiseziel, um die Route zu sehen." : " · Folge den Optionen in der Szene.") :
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
    ["travel", "Geschick unterwegs"], ["airborne", "gegen Flieger"]];
  const hub = { tab: "bag", slot: null };
  const kindOf = id => world.gear[id]?.slot ?? rules.category(id);

  function itemDetails(id) {
    const gear = world.gear[id];
    const supply = world.supplies[id];
    const details = [];
    if (gear?.power) details.push(gear.power + " Schaden + " + world.attributes[gear.stat]);
    if (gear?.twoHanded) details.push("Zweihändig");
    if (gear?.pierce) details.push(gear.pierce + " Durchschlag");
    if (gear?.armor) details.push(gear.armor + " Rüstung");
    if (gear?.travel) details.push("+" + gear.travel + " Geschick unterwegs");
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
      const details = itemDetails(id).filter(text => !text.startsWith("Wert") && !text.startsWith("Für eine"));
      if (details.length) item.append(element("div", details.join(" · ")));
      if (gear?.slot) button(item, equipped ? "Ablegen" : "Ausrüsten", () => {
        const slot = rules.equipmentSlots.find(entry => equipment[entry] === id);
        update(rules.equip(state, id, slot ?? null));
      }, { disabled: Boolean(state.combat) || !state.health });
      if (supply) button(item, "Verwenden", () => state.combat ? battleAction("herb", id) : update(rules.use(state, id)),
        { disabled: !rules.canUse(state, id) });
      inventory.append(item);
    }
    if (!counts.size) inventory.append(element("li", "Leer"));
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

  function renderParty() {
    el("party-count").textContent = "Gefährten · " + state.party.length + " / 5";
    const members = el("party-members");
    members.replaceChildren();
    for (const id of state.party) {
      const companion = world.companions[id];
      const row = element("li");
      row.append(element("strong", companion.name + " · " + world.classes[id].name));
      row.append(element("div", companion.ability + " · " + companionEffect(companion) + " · Einmal pro Kampf"));
      const relation = rules.relationship(state, id);
      const oath = { none: "", promised: "Versprechen offen", fulfilled: "Versprechen gehalten", broken: "Versprechen gebrochen" };
      const bond = { none: "", romance: "Romanze", friendship: "Enge Freundschaft" };
      row.append(element("p", ["Persönlicher Ruf " + relation.score + " %", oath[relation.oath], bond[relation.bond]].filter(Boolean).join(" · ")));
      if (relation.oath === "promised") row.append(element("p", world.loyalties[id].request + "."));
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
    const leads = Object.entries(world.companions).filter(([id]) => id !== state.role && !state.party.includes(id))
      .map(([id, companion]) => companion.name + " · " + world.classes[id].name + " · " +
        (rules.relationship(state, id).left ? "Hat die Gruppe verlassen" : companion.place));
    list(el("party-leads"), leads, "Keine weiteren Treffpunkte.");
    list(el("faction-ruf"), Object.entries(world.factions).map(([id, label]) => {
      const score = rules.reputation(state, id);
      return label + " · " + (score > 0 ? "+" : "") + score +
        (score >= 25 ? " · Wohlgesinnt" : score <= -25 ? " · Feindselig" : " · Neutral");
    }), "Keine Fraktionen bekannt.");
  }

  function fighterCard(name, detail) {
    const card = element("div");
    card.className = "fighter-card";
    card.append(element("strong", name), element("small", detail));
    return card;
  }

  function renderBattle(content) {
    const battlefield = element("section");
    battlefield.className = "battlefield";
    battlefield.style.setProperty("--battle-step", battleStepMs + "ms");
    const formation = element("div");
    formation.className = "battle-formation";
    const hero = fighterCard(state.name, world.classes[state.role].name);
    hero.dataset.actor = "hero";
    const heroMeter = element("progress");
    heroMeter.max = rules.healthLimit(state);
    heroMeter.value = state.health;
    heroMeter.setAttribute("aria-label", "Deine Lebenspunkte");
    hero.append(heroMeter);
    formation.append(hero);
    for (const id of state.party) {
      const companion = world.companions[id];
      const card = fighterCard(companion.name, world.classes[id].name);
      card.dataset.actor = id;
      formation.append(card);
    }
    const enemies = element("div");
    enemies.className = "battle-enemies";
    enemies.setAttribute("role", "group");
    enemies.setAttribute("aria-label", "Angriffsziel");
    const targets = rules.targets(state);
    if (!targets.some(enemy => enemy.id === enemyTarget && enemy.health > 0)) {
      enemyTarget = targets.find(enemy => enemy.health > 0)?.id;
    }
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
      meter.setAttribute("aria-label", "Lebenspunkte");
      card.append(element("strong", enemy.name), meter, element("small",
        enemy.health ? enemy.health + " / " + enemy.max + " LP" : "Besiegt"));
      card.addEventListener("click", () => {
        if (animating) return;
        enemyTarget = enemy.id;
        for (const entry of enemies.children) {
          entry.setAttribute("aria-pressed", Number(entry.dataset.enemy) === enemyTarget);
        }
        summary.textContent = "Ziel: " + enemy.name;
      });
      enemies.append(card);
    }
    const summary = element("p", "Ziel: " + targets.find(enemy => enemy.id === enemyTarget)?.name);
    summary.className = "battle-target";
    summary.setAttribute("aria-live", "polite");
    battlefield.append(formation, enemies, summary);
    content.append(battlefield);
  }

  async function battleAction(action, item) {
    if (animating || !state.combat) return;
    const previous = state;
    const events = [];
    const next = rules.strike(previous, action, Math.random, item, enemyTarget, events);
    if (next === previous) return;
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
        actor?.classList.remove("enemy-lunge", "fighter-cover", "fighter-lunge");
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
      if (combat.stunned) content.append(element("p", "Benommen · Dein nächster Waffenangriff ist schwächer."));
      const special = world.fights[combat.id].special;
      if (combat.health > 0 && combat.round % 2 === 1) content.append(element("p", special.warning + " Deckung schützt vor dem Zusatzeffekt."));
      if (combat.bleeding > 0) content.append(element("p", "Blutung · " + combat.bleeding + " Runden"));
      const abilities = world.classes[state.role];
      for (const [id, label, shift] of [
        ["spear", "Angriff · " + world.items[rules.weapon(state)], 0], ["ember", abilities.attack.name, 2],
        ["restore", abilities.restore.name, -2], ["guard", "Deckung und Sammlung", 0], ["flee", "Fliehen", 0],
      ]) {
        const risk = shift && Math.abs(state.balance + shift) >= 4;
        const cost = shift ? " · 1 Glut" : "";
        button(actions, label + cost + (risk ? " · Rückschlag" : ""),
          () => battleAction(id), { disabled: Boolean(shift && !state.ember) });
      }
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
            gear?.magic ? "+" + gear.magic + " Glutschaden" : gear?.travel ? "+" + gear.travel + " Geschick unterwegs" :
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
        const attribute = choice.check ? world.attributes[choice.check[0]] : "";
        const risk = choice.emberRescue && state.balance <= -2 ? " · Rückschlag" : "";
        button(actions, choice.label + (attribute ? " · Probe auf " + attribute : "") + risk,
          () => update(rules.choose(state, choice.id)), { story: true });
      }
      const candidates = rules.candidates(state);
      if (candidates.length) {
        const recruitment = element("section");
        recruitment.className = "recruitment";
        recruitment.append(element("h3", "Gefährten vor Ort"));
        if (state.party.length === 5) {
          recruitment.append(element("p", "Deine Gruppe ist voll. Am Wachhof kannst du jemanden verabschieden."));
        }
        for (const [id, companion] of candidates) {
          const candidate = element("article");
          candidate.append(element("h4", companion.name + " · " + world.classes[id].name),
            element("p", companion.introduction),
            element("p", companion.ability + " · " + companionEffect(companion)));
          const status = rules.recruitment(state, id);
          if (status === "ready") {
            button(candidate, companion.name + " mitnehmen", () => update(rules.recruit(state, id)),
              { disabled: state.party.length === 5 });
          } else if (status === "promise") {
            button(candidate, world.loyalties[id].request, () => update(rules.promise(state, id)));
          } else {
            candidate.append(element("p", status === "task" ? world.loyalties[id].request :
              companion.name + " lehnt es ab, dich zu begleiten."));
          }
          recruitment.append(candidate);
        }
        content.append(recruitment);
      }
      if (!choices.length) button(actions, "Zum Hauptmenü", () => showHome());
    }
  }

  function render() {
    setPortrait(el("avatar"), state);
    el("hero-name").textContent = state.name;
    el("hero-origin").textContent = world.origins[state.origin].name + " · " + world.classes[state.role].name;
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
      ["Glut", state.ember + " / " + rules.emberLimit(state)],
      ["Gleichgewicht", state.balance === 0 ? "0 · Im Gleichgewicht" :
        state.balance < 0 ? state.balance + " · Erneuerung" : "+" + state.balance + " · Zerstörung"],
    ]);
    stats(el("attributes"), attributeValues(state.origin, state.allocation ?? undefined));
    renderInventory();
    renderParty();
    const progress = rules.progression(state);
    el("level-heading").textContent = "Stufe " + progress.level;
    const bar = el("xp-bar");
    bar.hidden = progress.next === null;
    bar.max = (progress.next ?? progress.floor + 1) - progress.floor;
    bar.value = progress.xp - progress.floor;
    el("xp-label").textContent = progress.next === null ? progress.xp + " EP · Höchststufe dieses Abschnitts" :
      progress.xp + " EP · Noch " + (progress.next - progress.xp) + " bis Stufe " + (progress.level + 1);
    const training = el("training");
    training.replaceChildren();
    if (progress.points) {
      training.append(element("p", progress.points + " freie Attributpunkte"));
      for (const [id, label] of Object.entries(world.attributes)) {
        button(training, "+1 " + label, () => update(rules.train(state, id)), { disabled: Boolean(state.combat) || !state.health });
      }
    }
    el("legacy-build").hidden = Boolean(state.allocation) || Boolean(state.combat) || !state.health;
    list(el("journal"), [...state.journal].reverse(), "Deine Reise beginnt.");
    renderScene();
    renderMap();
  }

  for (const [id, data] of Object.entries(world.origins)) origin.add(new Option(data.name, id));
  for (const [id, data] of Object.entries(world.classes)) role.add(new Option(data.name, id));
  function updateClassDescription() {
    el("class-description").textContent = world.classes[role.value].description;
  }
  role.addEventListener("change", updateClassDescription);
  origin.addEventListener("change", () => portraitPreview(true));
  appearance.addEventListener("change", () => portraitPreview(true));
  variant.addEventListener("change", () => portraitPreview());
  el("new-game").addEventListener("click", () => {
    editingLegacy = false;
    el("character-form").reset();
    for (const input of [name, origin, appearance, variant]) input.disabled = false;
    el("character-submit").textContent = "Prolog starten";
    allocation = {};
    el("creation-status").textContent = state ? "Beim Start des Prologs wird der bisherige lokale Spielstand ersetzt." : "";
    portraitPreview(true);
    renderPoints();
    updateClassDescription();
    show("creation");
    el("creation-title").focus();
  });
  el("legacy-build").addEventListener("click", () => {
    editingLegacy = true;
    allocation = {};
    name.value = state.name;
    origin.value = state.origin;
    appearance.value = state.appearance;
    role.value = state.role;
    portraitPreview(true);
    variant.value = String(state.variant);
    renderPoints();
    for (const input of [name, origin, appearance, variant]) input.disabled = true;
    el("character-submit").textContent = "Charakter aktualisieren";
    el("creation-status").textContent = "Verteile 6 Punkte. Dein Spielstand wird an derselben Stelle fortgesetzt.";
    updateClassDescription();
    show("creation");
    el("creation-title").focus();
  });
  el("cancel").addEventListener("click", () => editingLegacy ? showPlay(state) : showHome());
  el("character-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      if (el("creation").hidden) return;
      if (editingLegacy) {
        showPlay(rules.buildLegacy(state, role.value, allocation));
        return;
      }
      const next = rules.create(name.value, origin.value, appearance.value, Number(variant.value), role.value, allocation);
      state = next;
      save();
      setPortrait(el("intro-portrait"), next);
      show("prologue");
      prologue.play(next.name, () => showPlay(next));
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
