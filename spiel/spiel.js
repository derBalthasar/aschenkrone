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
  let animating = false;
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

  function renderInventory() {
    const equipment = state.equipment;
    el("equipment").textContent = state.silver + " Silber · Waffe: " + world.items[rules.weapon(state)] +
      " · Rüstung: " + (world.items[equipment.armor] ?? "Keine");
    const inventory = el("inventory");
    inventory.replaceChildren();
    const counts = new Map();
    for (const id of state.inventory) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const [id, count] of counts) {
      const item = element("li");
      const gear = world.gear[id];
      const supply = world.supplies[id];
      const equipped = gear && equipment[gear.slot] === id;
      item.append(element("strong", world.items[id] + (count > 1 ? " ×" + count : "")));
      if (world.rarity[id]) {
        const quality = element("small", " · " + world.rarity[id]);
        quality.className = "rarity";
        quality.dataset.quality = world.rarity[id];
        item.append(quality);
      }
      if (equipped) item.append(element("small", " Ausgerüstet"));
      const details = [];
      if (gear?.power) details.push(gear.power + " Grundschaden + " + klassen.fertigkeiten[gear.skill ??
        ({ strength: "nahkampf", agility: gear.airborne ? "fernkampf" : "nahkampf", mind: "magie" })[gear.stat]].name);
      if (gear?.armor) details.push(gear.armor + " Rüstung");
      if (gear?.travel) details.push("+" + gear.travel + " auf Proben mit List unterwegs");
      if (gear?.magic) details.push("+" + gear.magic + " Glutschaden");
      if (supply?.heal) details.push("Stellt bis zu " + supply.heal + " LP wieder her");
      if (supply?.ember) details.push("Stellt bis zu " + supply.ember + " Glut wieder her");
      if (details.length) item.append(element("div", details.join(" · ")));
      if (gear?.slot) button(item, equipped ? "Ablegen" : "Ausrüsten",
        () => update(rules.equip(state, id)), { disabled: Boolean(state.combat) || !state.health });
      if (supply) button(item, "Verwenden", () => state.combat ? battleAction("herb", id) : update(rules.use(state, id)),
        { disabled: !rules.canUse(state, id) });
      inventory.append(item);
    }
    if (!counts.size) inventory.append(element("li", "Leer"));
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
      row.append(element("strong", companion.name + " · " + klassen.grundklassen[companion.klasse].name));
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
    const hero = fighterCard(state.name, rules.title(state));
    hero.dataset.actor = "hero";
    const heroMeter = element("progress");
    heroMeter.max = rules.healthLimit(state);
    heroMeter.value = state.health;
    heroMeter.setAttribute("aria-label", "Deine Lebenspunkte");
    hero.append(heroMeter);
    formation.append(hero);
    for (const id of state.party) {
      const companion = world.companions[id];
      const card = fighterCard(companion.name, klassen.grundklassen[companion.klasse].name);
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
      const abilities = world.classes[rules.profile(state.faction, state.role)];
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
        if (state.party.length === 5) {
          recruitment.append(element("p", "Deine Gruppe ist voll. Am Wachhof kannst du jemanden verabschieden."));
        }
        for (const [id, companion] of candidates) {
          const candidate = element("article");
          candidate.append(element("h4", companion.name + " · " + klassen.grundklassen[companion.klasse].name),
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
      element("p", "Ressource " + faction.ressource + ": " + data.ressource + ". Die Fraktionsressource ist noch nicht spielwirksam."),
    ];
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
      training.append(element("p", progress.points + (progress.points === 1 ? " Grundwertpunkt" : " Grundwertpunkte") + " aus Stufenaufstiegen"));
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
      " · Grundwerte " + bonusText(faction.bonus) + (faction.magie ? "" : " · keine Magie") + (faction.hinweis ? ". " + faction.hinweis : "");
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
