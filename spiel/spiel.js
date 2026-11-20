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
  const appearance = el("appearance");
  const variant = el("variant");
  let state = null;
  let importRequest = 0;
  let allocation = {};
  let skills = {};
  let target = null;
  let enemyTarget = null;
  let allyTarget = "hero";
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
    el("turn-badge").hidden = id !== "play";
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

  // Patch 2.5.4: Beim Kampfbeginn wird der Stand unmittelbar davor in einem eigenen Platz gesichert.
  // In der Niederlage-Szene speichert das Spiel nicht automatisch; der Stand vor dem letzten Treffer bleibt erhalten.
  const vorKampfKey = key + ".vorKampf";
  function vorKampfSichern(vorher) {
    // Hardcore (Permadeath): kein Wegpunkt vor der Schlacht.
    if (rules.permadeath(vorher)) return;
    try {
      localStorage.setItem(vorKampfKey, JSON.stringify(vorher));
    } catch {
      // Ohne lokalen Speicher gibt es keinen Wegpunkt vor der Schlacht.
    }
  }
  function vorKampfStand() {
    try {
      const gespeichert = localStorage.getItem(vorKampfKey);
      return gespeichert === null ? null : rules.read(gespeichert);
    } catch {
      return null;
    }
  }

  // ---- Schwierigkeitsgrade (Henry, 20. 11. 2026) ----
  const hardcoreKey = rules.schwierigkeitDaten.hardcore_freischaltung.storage_key;
  const ruhmKey = "aschenkrone_ruhmeshalle";
  const hardcoreFreigeschaltet = () => { try { return localStorage.getItem(hardcoreKey) === "1"; } catch { return false; } };
  function ruhmeshalle() { try { return JSON.parse(localStorage.getItem(ruhmKey) ?? "[]"); } catch { return []; } }
  function ruhmEintragen(s, ausgang) {
    try {
      const liste = ruhmeshalle();
      liste.unshift({ name: s.name, fraktion: klassen.fraktionen[s.faction].name, klasse: rules.title(s), stufe: rules.level(s),
        akt: s.questStufe ?? 0, ausgang, datum: new Date().toLocaleDateString("de-DE") });
      localStorage.setItem(ruhmKey, JSON.stringify(liste.slice(0, 20)));
    } catch { /* Ohne Speicher keine Ruhmeshalle. */ }
  }
  // Permadeath: Der Spielstand wird beim Tod gelöscht, die Chronik kommt in die Ruhmeshalle.
  function permadeathPruefen() {
    if (state?.scene !== "defeat" || !rules.permadeath(state) || state.hardcoreBeendet) return false;
    state.hardcoreBeendet = true;
    ruhmEintragen(state, "Gefallen");
    try { localStorage.removeItem(key); localStorage.removeItem(vorKampfKey); } catch { /* nichts zu löschen */ }
    el("save-status").textContent = "Hardcore: Deine Geschichte endet hier. Der Spielstand ist gelöscht.";
    return true;
  }
  function schwierigkeitOptionen(select, aktuell, { neu }) {
    select.replaceChildren();
    for (const g of rules.schwierigkeitDaten.schwierigkeitsgrade) {
      const option = element("option", g.anzeigename + (g.permadeath && !hardcoreFreigeschaltet() ? " · gesperrt" : ""));
      option.value = g.id;
      option.disabled = g.id !== aktuell && Boolean(rules.schwierigkeitGrund(state && !neu ? state : { schwierigkeit: null }, g.id,
        { neu, freigeschaltet: hardcoreFreigeschaltet() }));
      select.append(option);
    }
    select.value = aktuell;
  }
  function renderSchwierigkeit() {
    if (!state) return;
    schwierigkeitOptionen(el("opt-schwierigkeit"), state.schwierigkeit, { neu: false });
    el("opt-schwierigkeit").disabled = rules.permadeath(state);
    const grad = rules.schwierigkeitsGrad(state.schwierigkeit);
    el("opt-schwierigkeit-hinweis").textContent = grad.kurzbeschreibung + (rules.permadeath(state) ? " Hardcore lässt sich nicht wechseln." :
      hardcoreFreigeschaltet() ? "" : " " + rules.schwierigkeitDaten.hardcore_freischaltung.gesperrt_anzeige_in_ui.hinweis_text);
    const halle = el("ruhmeshalle");
    halle.replaceChildren();
    const liste = ruhmeshalle();
    if (liste.length) {
      halle.append(element("h4", "Ruhmeshalle"));
      const ul = element("ul");
      for (const e of liste) ul.append(element("li", e.name + " · " + e.fraktion + " · " + e.klasse + " · Stufe " + e.stufe + " · " + e.ausgang + " (" + e.datum + ")"));
      halle.append(ul);
    }
  }

  function save() {
    if (permadeathPruefen()) return;
    if (state?.scene === "defeat") {
      el("save-status").textContent = "Nicht gespeichert: Du bist gefallen.";
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
      // Patch 2.6.10: Zeitpunkt der letzten Speicherung im Einstellungs-Reiter.
      el("save-status").textContent = "Lokal gespeichert · " + new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
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
    if (previous && !previous.combat && next.combat) vorKampfSichern(previous);
    state = next;
    if (rules.hardcoreFrei(state) && !hardcoreFreigeschaltet()) {
      try { localStorage.setItem(hardcoreKey, "1"); } catch { /* ohne Speicher keine Freischaltung */ }
      if (rules.permadeath(state)) ruhmEintragen(state, "Der Ungebrochene");
    }
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
    if (el("character-sheet").open) el("character-sheet").close();
    if (el("reisekarte").open) el("reisekarte").close();
    if (el("npc-dialog").open) el("npc-dialog").close();
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

  // Kartenreiter (Henry, 18. 11. 2026): Die Bildkarte in drei Stufen ist entfallen, die Welt zeigt die Reisekarte als
  // Pop-up. Hier bleiben Standort, Reiseziele der Handlung und die nächste Etappe.
  function renderMap() {
    const scene = world.scenes[state.scene];
    const current = scene.map;
    const travels = new Map();
    for (const id of Object.keys(world.destinations)) {
      const route = rules.route(state, id);
      if (route?.first) travels.set(id, route);
    }
    const plan = el("map-plan");
    const destinations = el("map-destinations");
    plan.replaceChildren();
    const selected = travels.get(target);
    if (selected) {
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

    const node = state.scene === "weltknoten" ? knoten.get(state.knoten) : null;
    destinations.replaceChildren();
    // UI-Überarbeitung 19. 11. 2026: Im Stadt-Hub zeigt der Kartenreiter die Nachbarorte als Schnellauswahl.
    if (node && !state.combat) {
      const liste = element("ul");
      liste.className = "wegweiser-liste wegweiser-kompakt";
      for (const weg of reiseZieleSortiert()) liste.append(wegweiser(weg, true));
      destinations.append(liste);
      if (rules.lage(state)) {
        const strategie = element("button", "Reichs- und Strategiekarte (M)");
        strategie.type = "button";
        strategie.className = "action";
        strategie.addEventListener("click", () => { welt.modus = "strategie"; renderScene(); el("scene-title").focus(); });
        destinations.append(strategie);
      }
    }
    for (const [id, location] of Object.entries(node ? {} : world.destinations)) {
      if (!travels.has(id)) continue;
      const choice = element("button", location.name);
      choice.type = "button";
      choice.className = "action";
      choice.dataset.destination = id;
      choice.title = location.note;
      choice.setAttribute("aria-pressed", id === target);
      choice.addEventListener("click", () => {
        target = id;
        renderMap();
        plan.querySelector("button")?.focus();
      });
      destinations.append(choice);
    }

    const location = world.destinations[current]?.name;
    const far = scene.fern;
    el("map-status").textContent = state.combat ? "Im Kampf kannst du die Karte ansehen. Reiseoptionen öffnen sich nach der Begegnung." :
      node ? "Standort: " + node.name + " · Nachbarorte, ein Klick bricht auf:" :
      location ? "Standort: " + location + (travels.size ? " · Wähle ein Reiseziel, um die Route zu sehen." : " · Folge den Optionen in der Szene.") :
      far ? "Standort: " + far + " · Folge den Optionen in der Szene." :
      state.scene === "defeat" ? "Du liegst am Boden. Wähle in der Szene, wie es weitergeht." : "Deine Reise ist beendet.";
  }


  const slotLabels = { weapon: "Rechte Hand", offhand: "Linke Hand", head: "Kopf", neck: "Hals", armor: "Körper",
    hands: "Hände", legs: "Beine", ring1: "Ring", ring2: "Ring" };
  const kindLabels = { weapon: "Waffe", offhand: "Schild", head: "Kopf", neck: "Hals", armor: "Körper", hands: "Handschuhe", legs: "Beine",
    ring: "Ring", supply: "Verbrauchsgut", trophy: "Trophäe und Fund", quest: "Questgegenstand", relikt: "Gruppen-Relikt" };
  const groups = [["Waffen und Schilde", ["weapon", "offhand"]], ["Rüstung", ["head", "armor", "hands", "legs"]],
    ["Schmuck", ["neck", "ring"]], ["Verbrauchsgüter", ["supply"]], ["Gruppen-Relikte", ["relikt"]], ["Trophäen und Funde", ["trophy"]],
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
    if (supply?.revive) details.push("Belebt einen Begleiter mit " + supply.revive + " % LP wieder");
    if (supply?.cure) details.push("Entfernt " + world.ailments[supply.cure].name);
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

  function selectedAlly() {
    if (!rules.allies(state).some(ally => ally.id === allyTarget)) allyTarget = "hero";
    return allyTarget;
  }
  function allyPicker(context) {
    const label = element("label", "Ziel für Heilung und Items");
    label.className = "ally-picker";
    const select = element("select");
    select.setAttribute("aria-label", "Heilziel · " + context);
    for (const ally of rules.allies(state)) select.append(new Option(ally.name + " · " + ally.health + "/" + ally.max + " LP" +
      (!ally.health ? " · Kampfunfähig" : ""), ally.id));
    select.value = selectedAlly();
    select.addEventListener("change", () => {
      allyTarget = select.value;
      render();
      document.querySelector('select[aria-label="Heilziel · ' + context + '"]')?.focus();
    });
    label.append(select);
    return label;
  }
  function allyCondition(parent, id) {
    const ally = rules.allies(state).find(ally => ally.id === id);
    if (id !== "hero") {
      const health = element("div");
      health.className = "fighter-vitals";
      const meter = element("progress"); meter.max = ally.max; meter.value = ally.health;
      meter.setAttribute("aria-label", ally.name + " · Lebenspunkte");
      health.append(element("small", ally.health + " / " + ally.max + " LP"), meter);
      parent.append(health);
    }
    const status = element("p", !ally.health ? "Kampfunfähig · Lebensfunke benötigt" : Object.entries(ally.status)
      .map(([key, turns]) => world.ailments[key].name + " · " + turns + " Rd.").join(" · "));
    status.className = "ally-status";
    parent.classList.toggle("is-fallen", !ally.health);
    if (status.textContent) parent.append(status);
  }

  function renderInventory() {
    const equipment = state.equipment;
    const worn = rules.equipmentSlots.filter(slot => equipment[slot]);
    el("equipment").textContent = state.silver + " Silber · Waffe: " + world.items[rules.weapon(state)] +
      (worn.filter(slot => slot !== "weapon").length ? " · " + worn.filter(slot => slot !== "weapon")
        .map(slot => slotLabels[slot] + ": " + world.items[equipment[slot]]).join(" · ") : "");
    const site = rules.storageSite(state);
    el("bag-summary").textContent = "Rucksack " + rules.slotsUsed(state) + " / " + rules.bagLimit(state) + " Plätze · Zentrallager " +
      state.storage.length + " Gegenstände" + (site && !state.combat ? " · hier erreichbar." : "");
    el("side-tab-beutel").querySelector(".side-tab-label").textContent =
      "Beutel (" + rules.slotsUsed(state) + "/" + rules.bagLimit(state) + ")";
    const inventory = el("inventory");
    inventory.replaceChildren();
    // Das Heilziel erscheint nur, wenn es eine Wahl gibt: Gefährten in der Gruppe und Verbrauchsgüter im Rucksack.
    if (rules.allies(state).length > 1 && state.inventory.some(id => world.supplies[id])) {
      const picker = element("li"); picker.append(allyPicker("Vorrat")); inventory.append(picker);
    }
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
      if (supply) button(item, "Verwenden", () => state.combat ? battleAction("herb", id) : update(rules.use(state, id, selectedAlly())),
        { disabled: !rules.canUse(state, id, selectedAlly()) });
      inventory.append(item);
    }
    if (!counts.size) inventory.append(element("li", "Leer"));
    for (const [id, recipe] of Object.entries(world.recipes)) {
      const row = element("li");
      row.append(element("strong", "Herstellen: " + world.items[id]), element("p", recipe.text));
      const enough = Object.entries(recipe.ingredients).every(([item, count]) => state.inventory.filter(entry => entry === item).length >= count);
      button(row, "Herstellen · " + Object.entries(recipe.ingredients).map(([item, count]) => count + " × " + world.items[item]).join(", "),
        () => update(rules.craft(state, id)), { disabled: Boolean(state.combat) || !state.health || !enough || state.inventory.length >= rules.itemCap });
      inventory.append(row);
    }
    if (el("inventory-hub").open) renderHub();
  }

  function openHub(tab = "bag") {
    if (!state) return;
    if (el("character-sheet").open) el("character-sheet").close();
    hub.tab = ["bag", "storage", "trade"].includes(tab) ? tab : "bag";
    hub.slot = null;
    hub.zielFuer = null;
    hub.offen = null;
    hub.wegwerfen = null;
    hub.filter = "alle";
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

  // ---- Inventar (UI-Überarbeitung 19. 11. 2026): links Gruppe, Ausrüstung und vier Kampfwerte, rechts Rucksack,
  // Kontor-Lager und Handel. Alle Aktionen laufen weiter über dieselben Regeln (equip, use, store, trade …). ----
  const hubMitglied = () => hub.member && state.party.includes(hub.member) ? hub.member : "hero";
  const hubTrage = (member, id) => member === "hero"
    ? rules.equipmentSlots.filter(slot => state.equipment[slot] === id)
    : rules.equipmentSlots.filter(slot => rules.memberEquipment(state, member)[slot] === id);

  // Die vier wichtigsten Kampfwerte des gewählten Gruppenmitglieds. Beim Helden mit Vorschau beim Überfahren.
  function kampfwerteFuer(member) {
    if (member === "hero") {
      const werte = rules.gearStats(state);
      const krit = rules.kritChance(state);
      const intervall = rules.ausweichIntervall(state);
      return [["damage", "Angriff", werte.damage, "Grundschaden deiner Waffe mit Fertigkeit"],
        ["armor", "Rüstung", werte.armor, "Rüstung aus allen getragenen Teilen"],
        ["ausweichen", "Ausweichen", intervall ? "jeder " + intervall + "." : rules.protection(state),
          intervall ? "Jeder " + intervall + ". Angriff verfehlt dich; Abwehr " + rules.protection(state) : "Abwehr: Verteidigung ÷ 2 plus Geschick-Bonus"],
        ["krit", "Krit", krit ? krit + " %" : "—", krit ? "Kritische Treffer über einen Zähler, ohne Zufall" : "Keine Kritchance aus der Ausrüstung"]];
    }
    const begleiter = world.companions[member];
    const kit = rules.memberEquipment(state, member);
    const waffe = world.gear[kit.weapon];
    const ruestung = Object.values(kit).reduce((sum, id) => sum + (world.gear[id]?.armor ?? 0), 0);
    return [["damage", "Angriff", begleiter.damage ? begleiter.damage + (waffe?.power ?? 0) + (waffe?.magic ?? 0) : begleiter.heal ? "heilt " + begleiter.heal : "—",
        begleiter.ability ?? ""],
      ["armor", "Rüstung", ruestung, "Rüstung aus allen getragenen Teilen"],
      ["ausweichen", "Ausweichen", begleiter.guard ? "Schutz " + begleiter.guard : "—", "Begleiter weichen nicht aus; Beschützer geben Schutz"],
      ["krit", "Krit", "—", "Kritische Treffer gibt es nur für den Helden"]];
  }

  function renderStats(delta = null, label = "") {
    const member = hubMitglied();
    const list = el("hub-stats");
    list.replaceChildren();
    for (const [key, name, wert, hinweis] of kampfwerteFuer(member)) {
      const block = element("div");
      block.title = hinweis;
      const value = element("dd", String(wert));
      const change = member === "hero" ? delta?.[key] : null;
      if (change) {
        const mark = element("span", " → " + (wert + change));
        mark.className = change > 0 ? "hub-better" : "hub-worse";
        value.append(mark);
        block.className = change > 0 ? "hub-stat-better" : "hub-stat-worse";
      }
      block.append(element("dt", name), value);
      list.append(block);
    }
    const weitere = [];
    if (member === "hero") {
      const werte = rules.gearStats(state);
      for (const [key, name] of statLabels) {
        if (["damage", "armor"].includes(key) || (!werte[key] && !delta?.[key])) continue;
        weitere.push(name + " " + werte[key] + (delta?.[key] ? " → " + (werte[key] + delta[key]) : ""));
      }
    }
    el("hub-compare").textContent = [label, weitere.length ? "Weitere: " + weitere.join(" · ") : ""].filter(Boolean).join(" ");
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

  // Gruppenumschalter: Held und bis zu drei Begleiter.
  function renderMember() {
    const box = el("hub-member");
    box.replaceChildren();
    const member = hubMitglied();
    box.hidden = !state.party.length;
    for (const id of ["hero", ...state.party]) {
      const name = id === "hero" ? state.name : world.companions[id].name;
      const knopf = element("button", name);
      knopf.type = "button";
      knopf.className = "inv-member-knopf";
      knopf.setAttribute("aria-pressed", String(member === id));
      knopf.title = id === "hero" ? "Deine Ausrüstung" : "Ausrüstung von " + name;
      knopf.addEventListener("click", () => {
        hub.member = id;
        hub.slot = null;
        hub.zielFuer = null;
        renderHub();
        el("hub-member").querySelector('[aria-pressed="true"]')?.focus();
      });
      box.append(knopf);
    }
  }

  // Kompakte Ausrüstungsplätze: Waffe, Nebenhand, Rüstung (Körper, Beine), Kopf, Schmuck (Hals, Ringe).
  const slotGruppen = [["Waffe", ["weapon"]], ["Nebenhand", ["offhand"]], ["Rüstung", ["armor", "hands", "legs"]], ["Kopf", ["head"]],
    ["Schmuck", ["neck", "ring1", "ring2"]]];
  const slotKurz = { weapon: "Waffe", offhand: "Nebenhand", armor: "Körper", hands: "Hände", legs: "Beine", head: "Kopf", neck: "Hals", ring1: "Ring", ring2: "Ring" };

  function renderSlots() {
    const box = el("hub-slots");
    box.replaceChildren();
    const member = hubMitglied();
    const kit = member === "hero" ? state.equipment : rules.memberEquipment(state, member);
    const gesperrt = Boolean(state.combat) || !state.health;
    for (const [gruppe, slots] of slotGruppen) {
      const zeile = element("li");
      zeile.className = "inv-slot-gruppe";
      zeile.append(element("span", gruppe));
      const plaetze = element("div");
      plaetze.className = "inv-slot-plaetze";
      for (const slot of slots) {
        const id = kit[slot];
        const shown = member === "hero" && slot === "weapon" && !id ? rules.weapon(state) : id;
        const platz = element("div");
        platz.className = "inv-slot" + (id ? "" : " inv-slot-leer");
        if (world.rarity[id]) platz.dataset.quality = world.rarity[id];
        const knopf = element("button");
        knopf.type = "button";
        knopf.className = "inv-slot-knopf hub-slot-" + slot;
        knopf.setAttribute("aria-pressed", String(hub.slot === slot));
        if (slots.length > 1) knopf.append(element("small", slotKurz[slot]));
        knopf.append(element("strong", shown ? world.items[shown] : member !== "hero" && slot === "weapon" ? "Eigener Kampfstil" : "Leer"));
        if (!id && slot === "offhand" && world.gear[kit.weapon]?.twoHanded) knopf.append(element("small", "Zweihandwaffe"));
        if (id) knopf.title = world.items[id] + ": " + itemDetails(id).join(" · ");
        knopf.setAttribute("aria-label", slotLabels[slot] + ": " + (id ? world.items[id] : "leer") + ". Passende Gegenstände zeigen.");
        knopf.addEventListener("click", () => {
          hub.slot = hub.slot === slot ? null : slot;
          hub.tab = "bag";
          hub.filter = "alle";
          renderHub();
          el("hub-slots").querySelector(".hub-slot-" + slot)?.focus();
        });
        platz.append(knopf);
        if (id) {
          const off = element("button", "✕");
          off.type = "button";
          off.className = "hub-unequip";
          off.title = world.items[id] + " ablegen";
          off.setAttribute("aria-label", world.items[id] + " ablegen");
          off.disabled = gesperrt;
          off.addEventListener("click", () => {
            hubAction(member === "hero" ? rules.unequip(state, slot) : rules.equip(state, id, member, slot));
            el("hub-slots").querySelector(".hub-slot-" + slot)?.focus();
          });
          platz.append(off);
        }
        plaetze.append(platz);
      }
      zeile.append(plaetze);
      box.append(zeile);
    }
    const all = el("hub-unequip-all");
    all.hidden = member !== "hero";
    all.disabled = gesperrt || !rules.equipmentSlots.some(slot => state.equipment[slot]);
  }

  // Gürtel: zwei Schnellzugriffsplätze für Verbrauchsgüter (Errata 10).
  function renderBelt() {
    const box = el("hub-belt");
    box.replaceChildren(element("h4", "Gürtel · 2 Ladungen"));
    const slots = element("div");
    slots.className = "hub-belt-slots";
    const belt = rules.belt(state);
    belt.forEach((id, index) => {
      const slot = element("div");
      slot.className = "hub-belt-slot";
      slot.append(element("strong", id ? world.items[id] : "Leer"));
      if (state.combat) {
        if (id) button(slot, "Sofort verwenden", () => {
          el("inventory-hub").close();
          quickUse(index);
        }, { disabled: !rules.canUse(state, id, selectedAlly()) });
      } else {
        const select = element("select");
        select.setAttribute("aria-label", "Gürtelplatz " + (index + 1));
        select.append(new Option("Leer", ""));
        for (const supply of new Set(state.inventory)) {
          if (world.supplies[supply]) select.append(new Option(world.items[supply], supply));
        }
        select.value = id ?? "";
        select.disabled = !state.health;
        select.addEventListener("change", () => {
          hubAction(rules.setBelt(state, index, select.value || null));
          el("hub-belt").querySelectorAll("select")[index]?.focus();
        });
        slot.append(select);
      }
      slots.append(slot);
    });
    box.append(slots, element("p", "Gürtelgegenstände wirken im Kampf, ohne deine Aktion zu verbrauchen."));
  }

  // Gruppen-Relikt (Henry, 18. 11. 2026): ein aktives Relikt für die ganze Gruppe, getrennt von der Ausrüstung.
  function renderRelikt() {
    const box = el("hub-relikt");
    const stand = rules.reliktStand(state);
    box.hidden = !stand.aktiv && !stand.rucksack.length;
    box.replaceChildren();
    if (box.hidden) return;
    box.append(element("h4", "Gruppen-Relikt"));
    const wirkung = (relikt) => {
      const list = element("ul");
      for (const w of relikt.wirkungen) {
        const item = element("li", w.text);
        if (!w.aktiv) item.className = "hub-relikt-spaeter";
        list.append(item);
      }
      return list;
    };
    const aktiv = element("div");
    aktiv.className = "hub-relikt-aktiv";
    if (stand.aktiv) {
      aktiv.append(element("strong", stand.aktiv.name + " · " + stand.aktiv.label), wirkung(stand.aktiv));
      button(aktiv, "Ablegen", () => hubAction(rules.setRelikt(state, null)), { disabled: Boolean(rules.reliktGrund(state, null)) });
    } else aktiv.append(element("strong", "Kein Relikt aktiv"));
    box.append(aktiv);
    for (const relikt of stand.rucksack) {
      const row = element("div");
      row.className = "hub-relikt-wahl";
      row.append(element("strong", relikt.name + " · " + relikt.label), wirkung(relikt));
      button(row, relikt.grund ? relikt.grund + " · Wert " + relikt.wert + " Silber" : (stand.aktiv ? "Wechseln" : "Aktivieren"),
        () => hubAction(rules.setRelikt(state, relikt.id)), { disabled: Boolean(relikt.grund) });
      box.append(row);
    }
    box.append(element("p", "Nur ein Relikt wirkt, für die ganze Gruppe. Wechsel nur außerhalb des Kampfes; das vorige Relikt kehrt in den Rucksack zurück."));
  }

  function renderBagUpgrade(box = element("div")) {
    box.className = "hub-bag-upgrade";
    const plan = rules.bagUpgrade(state);
    box.hidden = hub.tab !== "bag" || !plan;
    box.replaceChildren();
    if (box.hidden) return;
    const material = Object.entries(plan.material).map(([id, count]) => count + "× " + world.items[id]).join(", ");
    box.append(element("p", "Rucksack-Ausbau " + plan.stufe + ": " + plan.name + " · " + plan.plaetze + " Plätze" +
      (plan.trade ? "" : " · nur mit Handel mit Zwergen oder den Freien Häfen (25 Ruf)") +
      (rules.storageOpen(state) ? "" : " · beim Sattler einer Stadt mit Zentrallager")));
    const open = rules.storageOpen(state);
    button(box, plan.silber + " Silber", () => hubAction(rules.upgradeBag(state, "silver")), { disabled: !open || !plan.silverReady });
    button(box, material, () => hubAction(rules.upgradeBag(state, "material")), { disabled: !open || !plan.materialReady });
  }

  async function quickUse(index) {
    const next = rules.quickUse(state, index, selectedAlly());
    if (next !== state) update(next);
  }

  // Kennwert einer Item-Zeile: der eine Wert, der beim Vergleichen zählt.
  function kennwert(id) {
    const gear = world.gear[id];
    const supply = world.supplies[id];
    if (gear?.power) return "+" + gear.power + " Ang";
    if (gear?.armor) return "+" + gear.armor + " Rüst";
    if (gear?.magic) return "+" + gear.magic + " Glut";
    if (gear?.travel) return "+" + gear.travel + " List";
    if (supply?.heal) return "+" + supply.heal + " LP";
    if (supply?.ember) return "+" + supply.ember + " Glut";
    if (supply?.revive) return "belebt";
    if (supply?.cure) return "heilt";
    if (world.salePrices[id]) return world.salePrices[id] + " Silber";
    const sys = rules.systeme.daten.gegenstaende[id];
    if (sys?.baseSellPrice) return sys.baseSellPrice + " Silber";
    return "";
  }
  const filterArten = [["alle", "Alle"], ["ausruestung", "Ausrüstung"], ["verbrauch", "Verbrauch"], ["material", "Material/Quest"]];
  const filterVon = (id) => world.gear[id]?.slot ? "ausruestung" : world.supplies[id] ? "verbrauch" : "material";
  const tierText = (id) => {
    const sys = rules.systeme.daten.gegenstaende[id];
    return [kindLabels[kindOf(id)], sys?.tier ? "Tier " + sys.tier : world.rarity[id]].filter(Boolean).join(" · ");
  };

  // Schlanke Zeile: Farbpunkt, Name, Kategorie, Kennwert und genau ein Primär-Knopf. Ein Klick auf die Zeile
  // klappt Details, Vergleich, Gürtel, Lager und „Wegwerfen“ auf.
  function itemZeile(id, count, primaer, extras = null) {
    const entry = element("li");
    entry.className = "inv-row";
    entry.dataset.item = id;
    if (world.rarity[id]) entry.dataset.quality = world.rarity[id];
    const offen = hub.offen === id;
    const kopf = element("div");
    kopf.className = "inv-row-kopf";
    const auf = element("button");
    auf.type = "button";
    auf.className = "inv-row-auf";
    auf.setAttribute("aria-expanded", String(offen));
    const punkt = element("span");
    punkt.className = "inv-punkt";
    punkt.setAttribute("aria-hidden", "true");
    const name = element("span");
    name.className = "inv-row-name";
    name.append(element("strong", world.items[id] + (count > 1 ? " ×" + count : "")), element("small", tierText(id)));
    const wert = element("span", kennwert(id));
    wert.className = "inv-kennwert";
    auf.append(punkt, name, wert);
    auf.setAttribute("aria-label", world.items[id] + (count > 1 ? ", " + count + " Stück" : "") + ". Details " + (offen ? "schließen" : "zeigen"));
    auf.addEventListener("click", () => {
      hub.offen = offen ? null : id;
      hub.wegwerfen = null;
      renderHub();
      el("hub-items").querySelector('[data-item="' + CSS.escape(id) + '"] .inv-row-auf')?.focus();
    });
    kopf.append(auf);
    if (primaer) kopf.append(primaer);
    entry.append(kopf);
    if (offen) {
      const details = element("div");
      details.className = "inv-row-details";
      const text = itemDetails(id);
      const sys = rules.systeme.daten.gegenstaende[id];
      if (sys?.effect) text.push(rules.effektText(id));
      if (sys?.usage) text.push(sys.usage);
      if (text.length) details.append(element("p", text.join(" · ")));
      if (extras) extras(details);
      entry.append(details);
    }
    return entry;
  }

  function primaerKnopf(text, aktion, aus = false, titel = "") {
    const knopf = element("button", text);
    knopf.type = "button";
    knopf.className = "inv-primaer";
    knopf.disabled = aus;
    if (titel) knopf.title = titel;
    knopf.addEventListener("click", event => {
      event.stopPropagation();
      aktion();
    });
    return knopf;
  }
  function miniKnopf(parent, text, aktion, aus = false) {
    const knopf = element("button", text);
    knopf.type = "button";
    knopf.className = "hub-mini";
    knopf.disabled = aus;
    knopf.addEventListener("click", aktion);
    parent.append(knopf);
    return knopf;
  }

  function nutzen(id, ziel) {
    allyTarget = ziel;
    hub.zielFuer = null;
    if (state.combat) {
      el("inventory-hub").close();
      battleAction("herb", id);
    } else hubAction(rules.use(state, id, ziel));
  }

  // Rucksack: Filter, Ausbau, Belegung und Zeilen.
  function rucksackZeile(id, count) {
    const member = hubMitglied();
    const gear = world.gear[id];
    const supply = world.supplies[id];
    const gesperrt = Boolean(state.combat) || !state.health;
    let primaer = null;
    if (gear?.slot) {
      const slot = hub.slot && rules.slotKinds[hub.slot] === gear.slot ? hub.slot : null;
      const traegt = hubTrage(member, id);
      const ab = slot ? traegt.includes(slot) : traegt.length > 0 && !(gear.slot === "ring" && traegt.length < count);
      const frei = count - rules.assigned(state, id);
      const aktion = member === "hero"
        ? () => hubAction(rules.equip(state, id, slot ?? (ab ? traegt[0] : null)))
        : () => hubAction(rules.equip(state, id, member, slot ?? (ab ? traegt[0] : null)));
      const grund = member === "hero" ? null : !ab && frei <= 0 ? "Alle Stücke sind vergeben" : null;
      primaer = primaerKnopf(ab ? "Ablegen" : "Anlegen", aktion, gesperrt || Boolean(grund), grund ?? "");
      if (member === "hero" && !gesperrt) previewOn(primaer, id, slot ?? (ab ? traegt[0] : null));
    } else if (supply) {
      const ziele = rules.allies(state);
      const moeglich = ziele.some(ally => rules.canUse(state, id, ally.id));
      primaer = primaerKnopf("Nutzen", () => {
        if (ziele.length > 1) {
          hub.zielFuer = hub.zielFuer === id ? null : id;
          renderHub();
          el("hub-items").querySelector('[data-item="' + CSS.escape(id) + '"] .inv-ziel button')?.focus();
        } else nutzen(id, "hero");
      }, !moeglich);
    } else if (rules.category(id) === "relikt") {
      primaer = primaerKnopf("Aktivieren", () => hubAction(rules.setRelikt(state, id)), Boolean(rules.reliktGrund(state, id)),
        rules.reliktGrund(state, id) ?? "");
    }
    const zeile = itemZeile(id, count, primaer, details => {
      if (gear?.slot && member === "hero") {
        const chips = deltaChips(rules.equipPreview(state, id, hub.slot && rules.slotKinds[hub.slot] === gear.slot ? hub.slot : null));
        if (chips.length) {
          const vergleich = element("p");
          vergleich.className = "inv-vergleich";
          vergleich.append(...chips);
          details.append(vergleich);
        }
      }
      const leiste = element("div");
      leiste.className = "inv-row-aktionen";
      if (supply && !state.combat) {
        const frei = rules.belt(state).indexOf(null);
        miniKnopf(leiste, "An den Gürtel", () => hubAction(rules.setBelt(state, frei, id)), frei < 0 || !state.health ||
          rules.belt(state).filter(entry => entry === id).length >= count);
      }
      if (rules.storageOpen(state) && !rules.isQuestItem(id)) {
        miniKnopf(leiste, "Ins Lager", () => hubAction(rules.store(state, id, 1)), !rules.canStore(state, id));
      }
      const grund = rules.wegwerfGrund(state, id);
      if (hub.wegwerfen === id) {
        miniKnopf(leiste, "Wirklich wegwerfen?", () => { hub.wegwerfen = null; hubAction(rules.wegwerfen(state, id)); }).classList.add("inv-gefahr");
        miniKnopf(leiste, "Behalten", () => { hub.wegwerfen = null; renderHub(); });
      } else if (!rules.isQuestItem(id)) {
        const knopf = miniKnopf(leiste, "Wegwerfen", () => { hub.wegwerfen = id; renderHub(); }, Boolean(grund));
        if (grund) knopf.title = grund;
      }
      if (leiste.children.length) details.append(leiste);
    });
    if (supply && hub.zielFuer === id) {
      const ziel = element("div");
      ziel.className = "inv-ziel";
      ziel.setAttribute("role", "group");
      ziel.setAttribute("aria-label", "Ziel für " + world.items[id]);
      ziel.append(element("span", "Ziel:"));
      for (const ally of rules.allies(state)) {
        miniKnopf(ziel, ally.name + " · " + ally.health + "/" + ally.max + " LP", () => nutzen(id, ally.id), !rules.canUse(state, id, ally.id));
      }
      miniKnopf(ziel, "Abbrechen", () => { hub.zielFuer = null; renderHub(); });
      zeile.append(ziel);
    }
    return zeile;
  }

  function renderRucksack(container) {
    const filter = element("div");
    filter.className = "inv-filter";
    filter.setAttribute("role", "group");
    filter.setAttribute("aria-label", "Rucksack filtern");
    for (const [id, text] of filterArten) {
      const knopf = element("button", text);
      knopf.type = "button";
      knopf.setAttribute("aria-pressed", String((hub.filter ?? "alle") === id && !hub.slot));
      knopf.addEventListener("click", () => {
        hub.filter = id;
        hub.slot = null;
        renderHub();
        el("hub-items").querySelector('.inv-filter [aria-pressed="true"]')?.focus();
      });
      filter.append(knopf);
    }
    container.append(filter);
    const bar = element("div");
    bar.className = "hub-bar";
    const kapazitaet = element("progress");
    kapazitaet.max = rules.bagLimit(state);
    kapazitaet.value = rules.slotsUsed(state);
    kapazitaet.setAttribute("aria-label", "Belegte Rucksackplätze");
    const hinweis = element("p", "Rucksack " + rules.slotsUsed(state) + " / " + rules.bagLimit(state) + " Plätze" +
      (state.combat ? " · Im Kampf kannst du nur Verbrauchsgüter nutzen." : " · Klick auf eine Zeile zeigt Details."));
    hinweis.className = "hub-hint";
    bar.append(kapazitaet, hinweis);
    container.append(bar);
    const ausbau = element("div");
    renderBagUpgrade(ausbau);
    if (!ausbau.hidden) container.append(ausbau);
    const kind = hub.slot && rules.slotKinds[hub.slot];
    if (kind) {
      const slotFilter = element("div");
      slotFilter.className = "hub-slot-filter";
      slotFilter.append(element("span", "Passend für " + slotLabels[hub.slot] + (kind === "ring" ? " (" + (hub.slot === "ring1" ? "links" : "rechts") + ")" : "")));
      button(slotFilter, "Alle zeigen", () => { hub.slot = null; renderHub(); });
      container.append(slotFilter);
    }
    const counts = counted(state.inventory);
    const ids = [...counts.keys()].filter(id => kind ? kindOf(id) === kind : (hub.filter ?? "alle") === "alle" || filterVon(id) === hub.filter)
      .sort((a, b) => {
        const rang = (id) => groups.findIndex(([, kinds]) => kinds.includes(kindOf(id)));
        return rang(a) - rang(b) || world.items[a].localeCompare(world.items[b], "de");
      });
    const liste = element("ul");
    liste.className = "inv-list";
    for (const id of ids) liste.append(rucksackZeile(id, counts.get(id)));
    container.append(liste);
    if (!ids.length) container.append(element("p", kind ? "Im Rucksack liegt nichts Passendes." : state.inventory.length ? "Nichts in dieser Auswahl." : "Dein Rucksack ist leer."));
  }

  // Kontor-Lager: Zentrallager (Ein- und Auslagern) und die Rohstoffe des Kontors. Nur in Siedlungen nutzbar.
  const lagerOffen = () => Boolean(rules.storageOpen(state) || rules.kontorInfo(state));
  const handelJetzt = () => Boolean(rules.handelOffen(state) || rules.ausruester(state) || rules.kontorInfo(state));

  function handelZeile(id, text, preis, primaer, extras = null) {
    const entry = element("li");
    entry.className = "inv-row inv-row-handel";
    if (id && world.rarity[id]) entry.dataset.quality = world.rarity[id];
    const kopf = element("div");
    kopf.className = "inv-row-kopf";
    const name = element("span");
    name.className = "inv-row-name";
    name.append(element("strong", text[0]), element("small", text[1] ?? ""));
    const punkt = element("span");
    punkt.className = "inv-punkt";
    punkt.setAttribute("aria-hidden", "true");
    const links = element("span");
    links.className = "inv-row-auf inv-row-statisch";
    const wert = element("span", preis);
    wert.className = "inv-kennwert";
    links.append(punkt, name, wert);
    kopf.append(links, ...(Array.isArray(primaer) ? primaer : [primaer]).filter(Boolean));
    entry.append(kopf);
    if (extras) extras(entry);
    return entry;
  }

  function abschnitt(container, titel, ...inhalt) {
    const box = element("section");
    box.className = "inv-abschnitt";
    box.append(element("h4", titel), ...inhalt);
    container.append(box);
    return box;
  }

  let einlagernFrage = null;
  const handelFilter = [["alle", "Alle"], ["tragbar", "Für deine Klasse"], ["waffe", "Waffen"], ["ruestung", "Rüstung"], ["verbrauch", "Tränke & Gürtel"]];
  function renderLager(container) {
    if (!lagerOffen()) {
      const hinweis = element("p", "Das Kontor-Lager ist nur in Siedlungen nutzbar: Zentrallager in allen Hauptstädten und in den Städten deiner Fraktion, " +
        "das Kontor in den Städten der Menschen. Im Lager liegen zurzeit " + state.storage.length + " Gegenstände.");
      hinweis.className = "inv-hinweis";
      container.append(hinweis);
      return;
    }
    const info = rules.kontorInfo(state);
    if (info) {
      // Patch 2.6.11: fünf gleich breite Rohstoffkarten (große Zahl, kurzer Name) und eine Proviantleiste in einer Zeile.
      const kurz = { nahrung: "Nahrung", holz: "Bauholz", eisen: "Roheisen", stein: "Bruchstein", runensplitter: "Splitter" };
      const karten = element("ul");
      karten.className = "kontor-karten";
      for (const r of info.rohstoffe) {
        const karte = element("li");
        karte.title = r.name;
        karte.append(element("strong", String(r.menge)), element("span", kurz[r.id] ?? r.name));
        karten.append(karte);
      }
      const nahrung = element("div");
      nahrung.className = "kontor-proviant";
      nahrung.append(element("span", "Proviant im Gepäck: " + state.ressource + " Nahrung"));
      const gruppe = element("span");
      gruppe.className = "kontor-proviant-knoepfe";
      const grundEins = rules.systeme.nahrungGrund(state, state.knoten, 1, false);
      miniKnopf(gruppe, "−1", () => hubAction(rules.nahrungTragen(state, 1, false)), Boolean(grundEins))
        .title = grundEins ?? "1 Nahrung aus dem Kontor ins Gepäck";
      miniKnopf(gruppe, "−5 ins Gepäck", () => hubAction(rules.nahrungTragen(state, 5, false)), Boolean(info.abhebenGrund))
        .title = info.abhebenGrund ?? "5 Nahrung aus dem Kontor ins Gepäck";
      miniKnopf(gruppe, "+5 ins Kontor", () => hubAction(rules.nahrungTragen(state, 5, true)), Boolean(info.einlagernGrund))
        .title = info.einlagernGrund ?? "5 Nahrung aus dem Gepäck ins Kontor";
      nahrung.append(gruppe);
      abschnitt(container, "Kontor · " + info.name, karten, nahrung);
      // Armada-Kriegskasse ab Akt 2 sichtbar, in Akt 4 aufgeklappt.
      const akte = rules.akteInfo(state);
      if (akte && !akte.grund && akte.armada) {
        const a = akte.armada;
        const box = element("details");
        box.className = "kontor-kasse";
        box.open = Boolean(a.offen || akte.akt4?.offen);
        box.append(element("summary", "Armada-Kriegskasse (Überfahrt)" + (a.voll ? " · gefüllt" : "")));
        const liste = element("ul");
        for (const [r, n] of Object.entries(a.bedarf)) {
          const zeile = element("li");
          const balken = element("progress");
          balken.max = n;
          balken.value = Math.min(n, a.kasse[r] ?? 0);
          zeile.append(element("span", kurz[r] ?? r), balken, element("small", (a.kasse[r] ?? 0) + " / " + n));
          liste.append(zeile);
        }
        box.append(liste, element("p", a.offen ? "Einzahlen in der Stadtansicht unter Kontor." : "Einzahlungen öffnen sich mit dem Großen Thing in Akt 4."));
        container.append(box);
      }
    }
    const site = rules.storageSite(state);
    if (!rules.storageOpen(state)) {
      const p = element("p", "Kein Zentrallager an diesem Ort. Es steht in allen Hauptstädten und in den Städten deiner Fraktion.");
      p.className = "inv-hinweis";
      abschnitt(container, "Zentrallager", p);
      return;
    }
    const imLager = element("ul");
    imLager.className = "inv-list";
    for (const [id, count] of counted(state.storage)) {
      imLager.append(handelZeile(id, [world.items[id] + (count > 1 ? " ×" + count : ""), tierText(id)], kennwert(id), [
        primaerKnopf("Auslagern", () => hubAction(rules.retrieve(state, id, 1)), !rules.canRetrieve(state, id)),
        ...(count > 1 ? [primaerKnopf("Alle", () => hubAction(rules.retrieve(state, id, count)), !rules.canRetrieve(state, id), "Alle auslagern")] : []),
      ]));
    }
    if (!imLager.children.length) {
      const leer = element("p", "Keine eingelagerten Gegenstände in " + (site ?? "diesem Lager") + ".");
      leer.className = "kontor-leer";
      imLager.append(leer);
    }
    abschnitt(container, (site ?? "Zentrallager") + " · " + state.storage.length + " Gegenstände", imLager);
    const einlagern = element("ul");
    einlagern.className = "inv-list";
    for (const [id, count] of counted(state.inventory)) {
      if (rules.isQuestItem(id)) continue;
      const angelegt = rules.equipmentSlots.some((slot) => state.equipment[slot] === id);
      // Patch 2.6.11: Angelegte Ausrüstung erst nach Rückfrage einlagern.
      const einlagernJetzt = (n) => {
        if (angelegt && einlagernFrage !== id) { einlagernFrage = id; renderHub(); return; }
        einlagernFrage = null;
        hubAction(rules.store(state, id, n));
      };
      einlagern.append(handelZeile(id, [world.items[id] + (count > 1 ? " ×" + count : "") + (angelegt ? " · angelegt" : ""), tierText(id)], kennwert(id), [
        primaerKnopf(einlagernFrage === id ? "Wirklich einlagern?" : "Einlagern", () => einlagernJetzt(1), !rules.canStore(state, id),
          angelegt ? "Angelegt: wird beim Einlagern abgelegt" : ""),
        ...(count > 1 ? [primaerKnopf("Alle", () => einlagernJetzt(count), !rules.canStore(state, id), "Alle einlagern")] : []),
      ]));
    }
    if (!einlagern.children.length) einlagern.append(element("p", "Nichts zum Einlagern."));
    abschnitt(container, "Aus dem Rucksack einlagern", einlagern);
  }

  // Handel: Kontor-Rohstoffe und Ausrüster mit Ruf-Modifikator, Händler für Vorräte und Trophäen.
  function renderHandel(container) {
    if (!handelJetzt()) {
      const hinweis = element("p", "Hier ist kein Händler. Handel gibt es in Städten mit Zentrallager oder Kontor und an der Zeugkammer von Eiswacht.");
      hinweis.className = "inv-hinweis";
      container.append(hinweis);
      return;
    }
    const info = rules.kontorInfo(state);
    if (info) {
      const mod = element("p", "Ruf " + signed(info.ruf) + " (" + info.rang.name + ") bei " + info.name + " · Kauf ×" +
        String(info.rang.kauf).replace(".", ",") + " · Verkauf ×" + String(info.rang.verkauf).replace(".", ",") +
        (info.rang.handel ? "" : " · geächtet: kein Handel"));
      mod.className = "inv-hinweis";
      // Patch 2.6.6: festes Raster (Name, Bestand, Preise, Knöpfe) mit kurzen Namen ohne Umbruch.
      const kurzNamen = { nahrung: "Pökelfleisch & Brot", holz: "Asch-Bauholz", eisen: "Roheisenbarren", stein: "Bruchstein", runensplitter: "Runensplitter" };
      const liste = element("ul");
      liste.className = "inv-list rohstoff-raster";
      for (const r of info.rohstoffe) {
        liste.append(handelZeile(null, [kurzNamen[r.id] ?? r.name, r.menge + " im Kontor"], r.kauf + " / +" + r.verkauf, [
          primaerKnopf("Kauf 1", () => hubAction(rules.kontorHandel(state, r.id, 1, true)), Boolean(r.kaufGrund), r.kaufGrund ?? r.kauf + " Silber"),
          primaerKnopf("Kauf 10", () => hubAction(rules.kontorHandel(state, r.id, 10, true)), Boolean(r.kauf10Grund), r.kauf10Grund ?? r.kauf10 + " Silber"),
          primaerKnopf("Verkauf 1", () => hubAction(rules.kontorHandel(state, r.id, 1, false)), Boolean(r.verkaufGrund), r.verkaufGrund ?? "+" + r.verkauf + " Silber"),
        ]));
      }
      abschnitt(container, "Kontor-Rohstoffe · Preis Kauf / Verkauf", mod, liste);
    }
    const markt = rules.ausruester(state);
    if (markt) {
      const kaufen = element("ul");
      kaufen.className = "inv-list";
      // Patch 2.6.6: Filterleiste (Standard: für deine Klasse tragbar) und Wertvergleich zur angelegten Ausrüstung.
      const filter = element("div");
      filter.className = "handel-filter";
      filter.setAttribute("role", "group");
      filter.setAttribute("aria-label", "Ausrüster filtern");
      const aktiv = hub.handelFilter ?? "tragbar";
      for (const [id, label] of handelFilter) {
        const knopf = miniKnopf(filter, label, () => { hub.handelFilter = id; renderHub(); });
        knopf.setAttribute("aria-pressed", String(aktiv === id));
      }
      const statName = Object.fromEntries(statLabels);
      for (const w of markt.kaufen) {
        const gear = world.gear[w.id];
        const art = !gear ? "verbrauch" : gear.slot === "weapon" ? "waffe" : "ruestung";
        if (aktiv === "tragbar" && !w.passt) continue;
        if (aktiv !== "alle" && aktiv !== "tragbar" && art !== aktiv) continue;
        const delta = gear && w.passt ? rules.equipPreview(state, w.id) : null;
        const diff = delta ? Object.entries(delta).filter(([, v]) => v).map(([k, v]) => (statName[k] ?? k) + " " + signed(v)).join(", ") : "";
        kaufen.append(handelZeile(w.id, [w.name, [w.tier && !/^Tier/.test(w.effekt ?? "") ? "Tier " + w.tier : "", w.passt ? "" : "nicht für deine Klasse",
          diff ? "statt angelegt: " + diff : "", w.effekt ?? ""].filter(Boolean).join(" · ")],
          w.preis + " Silber", primaerKnopf("Kaufen", () => hubAction(rules.ausruesterHandel(state, w.id, true)), Boolean(w.grund), w.grund ?? "")));
      }
      if (!kaufen.children.length) kaufen.append(element("p", "Keine Waren in diesem Filter."));
      abschnitt(container, "Ausrüster · kaufen", filter, kaufen);
      if (markt.verkaufen.length) {
        const verkaufen = element("ul");
        verkaufen.className = "inv-list";
        for (const w of markt.verkaufen) {
          verkaufen.append(handelZeile(w.id, [w.name + (w.anzahl > 1 ? " ×" + w.anzahl : ""), tierText(w.id)], "+" + w.preis + " Silber",
            primaerKnopf("Verkaufen", () => hubAction(rules.ausruesterHandel(state, w.id, false)), Boolean(w.grund), w.grund ?? "")));
        }
        abschnitt(container, "Ausrüster · verkaufen", verkaufen);
      }
    }
    if (rules.handelOffen(state)) {
      const kaufen = element("ul");
      kaufen.className = "inv-list";
      for (const id of Object.keys(world.shop)) {
        const preis = rules.preis(state, id, true);
        kaufen.append(handelZeile(id, [world.items[id], tierText(id)], preis + " Silber",
          primaerKnopf("Kaufen", () => hubAction(rules.trade(state, id, true)), preis > state.silver || state.inventory.length >= rules.itemCap - 20)));
      }
      abschnitt(container, "Händler · Vorräte", kaufen);
      const trophaeen = Object.keys(world.salePrices).filter(id => state.inventory.includes(id));
      if (trophaeen.length) {
        const verkaufen = element("ul");
        verkaufen.className = "inv-list";
        for (const id of trophaeen) {
          const anzahl = state.inventory.filter(entry => entry === id).length;
          verkaufen.append(handelZeile(id, [world.items[id] + (anzahl > 1 ? " ×" + anzahl : ""), tierText(id)], "+" + rules.preis(state, id, false) + " Silber",
            primaerKnopf("Verkaufen", () => hubAction(rules.trade(state, id, false)))));
        }
        abschnitt(container, "Händler · Trophäen verkaufen", verkaufen);
      }
    }
  }

  const hubTabs = [["bag", "Rucksack"], ["storage", "Kontor-Lager"], ["trade", "Handel"]];

  function renderHub() {
    const member = hubMitglied();
    if (hub.zielFuer && !state.inventory.includes(hub.zielFuer)) hub.zielFuer = null;
    if (hub.offen && !state.inventory.includes(hub.offen)) hub.offen = null;
    const site = rules.storageSite(state);
    el("hub-place").textContent = rules.storageOpen(state) ? site : state.combat ? "Im Kampf" : world.scenes[state.scene].place ?? "";
    el("hub-silver").textContent = state.silver + " Silber";
    renderMember();
    renderSlots();
    renderStats();
    renderBelt();
    renderRelikt();
    el("hub-belt").hidden = member !== "hero";
    el("hub-gear-title").textContent = member === "hero" ? "Ausrüstung" : "Ausrüstung · " + world.companions[member].name;
    const frei = { bag: true, storage: lagerOffen(), trade: handelJetzt() };
    for (const [tab, text] of hubTabs) {
      const control = el("hub-tab-" + tab);
      control.textContent = tab === "bag" ? text + " · " + rules.slotsUsed(state) + "/" + rules.bagLimit(state) : text;
      control.setAttribute("aria-selected", String(hub.tab === tab));
      control.setAttribute("aria-disabled", String(!frei[tab]));
      control.title = frei[tab] ? "" : tab === "storage" ? "Nur in Siedlungen nutzbar" : "Nur bei einem Händler nutzbar";
      control.tabIndex = hub.tab === tab ? 0 : -1;
    }
    const container = el("hub-items");
    container.replaceChildren();
    ({ bag: renderRucksack, storage: renderLager, trade: renderHandel })[hub.tab](container);
  }

  // ---- Reisekarte als Pop-up: die ganze Weltkarte mit stufenlosem Zoom (Henry, 18. 11. 2026). ----
  // Mausrad, Ziehen, zwei Finger, Doppelklick und Tasten zoomen und verschieben die Karte. Weit draußen zeigt sie nur
  // das Kartenbild mit den Städten der Menschen, nah dran Dörfer, Wege und Dorfnamen. Ein Klick auf einen Ort der
  // Menschen zeigt Weg, Kosten, Gefahr und Gegner, Nachbarorte lassen sich direkt bereisen. Fremde Orte zeigen nur
  // Typ, Volk und Fraktion.
  const rk = { ansicht: null, auswahl: null, gezogen: false,
    zeigen: { strasse: true, pass: true, dorfweg: true, seeweg: true, doerfer: true, namen: true } };
  const rkFilterNamen = { ...reisekarte.wegArtNamen, doerfer: "Dorfnamen", namen: "Stadtnamen" };
  const rkVolkNamen = { orks: "Orks", untote: "Untote", elfen: "Elfen", zwerge: "Zwerge", menschen: "Menschen" };
  // Kartenpixel je Bildschirmpixel: unter dieser Grenze erscheinen Dörfer und Wege, darunter wird nicht weiter gezoomt.
  const rkNah = 1.8;
  const rkNaechster = 0.35;
  // Ortsmarken: Bildschirmpixel je Markeneinheit (nah dran; in der Weltansicht kleiner).
  const rkMarkenGroesse = 1.8;
  let rkMarken = [];

  const svgNs = "http://www.w3.org/2000/svg";
  function svgElement(tag, attributes, parent) {
    const node = document.createElementNS(svgNs, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent?.append(node);
    return node;
  }

  function rkPercent(value) {
    return Math.round(value * 100) + " %";
  }

  function rkWaehlen(id) {
    rk.auswahl = id;
    renderReisekarte();
    el("rk-svg").querySelector('[data-ort="' + id + '"]')?.focus();
  }

  function renderReisekarte() {
    if (!state) return;
    const hier = rules.aktuellerKnoten(state);
    const ziele = new Map(rules.reiseZiele(state).map(weg => [weg.zielId, weg]));
    const hierKnoten = hier ? knoten.get(hier) : null;
    el("rk-place").textContent = "Odris · " + (hierKnoten ? "Du bist in " + hierKnoten.name : "Du bist unterwegs in der Handlung");

    const filter = el("rk-filter");
    filter.replaceChildren();
    for (const [key, label] of Object.entries(rkFilterNamen)) {
      const control = element("button", label);
      control.type = "button";
      control.className = "rk-toggle rk-toggle-" + key;
      control.setAttribute("aria-pressed", rk.zeigen[key]);
      control.addEventListener("click", () => {
        rk.zeigen[key] = !rk.zeigen[key];
        renderReisekarte();
        filter.querySelector(".rk-toggle-" + key)?.focus();
      });
      filter.append(control);
    }

    const [wx, wy, ww, wh] = reisekarte.welt;
    const board = el("rk-svg");
    board.replaceChildren();
    svgElement("rect", { class: "rk-meer", x: wx, y: wy, width: ww, height: wh }, board);
    // Hintergrund ist die verbindliche Weltkarte. Städte und ihre Namen sind dort schon eingezeichnet.
    const land = svgElement("g", { class: "rk-land", "aria-hidden": "true" }, board);
    for (const bild of reisekarte.bilder) {
      svgElement("image", { href: bild.src, x: bild.x, y: bild.y, width: bild.breite, height: bild.hoehe, preserveAspectRatio: "none" }, land);
    }

    const aktivNach = (weg) => hier && (weg.a === hier || weg.b === hier) && ziele.has(weg.a === hier ? weg.b : weg.a);
    const wegGruppe = svgElement("g", { class: "rk-wege", "aria-hidden": "true" }, board);
    for (const weg of reisekarte.wege) {
      const aktiv = aktivNach(weg);
      if (!rk.zeigen[weg.art] && !aktiv) continue;
      const [x1, y1] = reisekarte.lage(weg.a);
      const [x2, y2] = reisekarte.lage(weg.b);
      const linie = svgElement("line", { x1, y1, x2, y2,
        class: "rk-weg rk-" + weg.art + " rk-" + weg.sicherheit + (aktiv ? " rk-aktiv" : "") }, wegGruppe);
      svgElement("title", {}, linie).textContent = weg.kennung;
    }

    // Dorfnamen wachsen mit der Karte, ihre Lage weicht den gedruckten Namen aus.
    if (rk.zeigen.doerfer) {
      const dorfNamen = svgElement("g", { class: "rk-dorfnamen", "aria-hidden": "true" }, board);
      for (const ort of reisekarte.orte.filter(entry => entry.typ === "dorf")) {
        const [dx, dy, anker] = reisekarte.beschriftung[ort.id];
        const name = svgElement("text", { x: ort.x + dx, y: ort.y + dy, "text-anchor": anker, "font-size": reisekarte.dorfSchrift,
          class: "rk-name-dorf" + (ort.id === hier ? " rk-name-hier" : "") }, dorfNamen);
        name.textContent = ort.name;
      }
    }
    // Ortsmarken der Menschen und Überseehäfen: feste Größe auf dem Bildschirm, wie Stecknadeln.
    const orteGruppe = svgElement("g", { class: "rk-orte" }, board);
    rkMarken = [];
    const abgabeOrte = new Set(rules.rueckkehrZiele(state).map(z => z.ort));
    for (const ort of [...reisekarte.orte].reverse()) {
      const weg = ziele.get(ort.id);
      const wichtig = ort.id === hier || weg || ort.id === rk.auswahl;
      const klassenListe = ["rk-ort", "rk-typ-" + ort.typ, "rk-volk-" + ort.volk];
      if (ort.hafen) klassenListe.push("rk-hafen");
      if (ort.uebersee) klassenListe.push("rk-uebersee");
      if (wichtig) klassenListe.push("rk-wichtig");
      if (ort.id === hier) klassenListe.push("rk-hier");
      if (weg) klassenListe.push(weg.grund ? "rk-gesperrt" : "rk-ziel");
      if (ort.id === rk.auswahl) klassenListe.push("rk-gewaehlt");
      const gruppe = svgElement("g", { class: klassenListe.join(" "), role: "button", tabindex: 0, "data-ort": ort.id,
        "aria-label": ort.name + " · " + knoten.typNamen[ort.typ] + (ort.id === hier ? " · Du bist hier" : weg ? " · erreichbar" : "") }, orteGruppe);
      gruppe.dataset.x = ort.x;
      gruppe.dataset.y = ort.y;
      if (ort.id === hier) svgElement("circle", { r: 11, class: "rk-puls" }, gruppe);
      if (ort.id === rk.auswahl) svgElement("circle", { r: 9, class: "rk-ring" }, gruppe);
      if (weg) svgElement("circle", { r: 7.5, class: "rk-zielring" }, gruppe);
      // Rückreise-Pflicht: Orte, an denen ein Bericht wartet, tragen einen Zielmarker (Henry: #d97706).
      if (abgabeOrte.has(ort.id)) {
        gruppe.classList.add("rk-abgabe");
        svgElement("circle", { r: 10.5, class: "rk-abgabering" }, gruppe);
      }
      if (ort.uebersee) svgElement("rect", { x: -4, y: -4, width: 8, height: 8, transform: "rotate(45)", class: "rk-punkt" }, gruppe);
      else svgElement("circle", { r: ort.typ === "dorf" ? 2.6 : ort.typ === "hauptstadt" ? 5 : 3.8, class: "rk-punkt" }, gruppe);
      if (ort.typ === "hauptstadt") svgElement("circle", { r: 2, class: "rk-kern" }, gruppe);
      // Größere Trefferfläche für Finger und Maus.
      svgElement("circle", { r: ort.typ === "dorf" ? 6 : 9, class: "rk-treffer" }, gruppe);
      gruppe.addEventListener("click", () => rkWaehlen(ort.id));
      gruppe.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        rkWaehlen(ort.id);
      });
      rkMarken.push(gruppe);
    }
    // Gedruckte Namen der ganzen Welt deckungsgleich über Wegen und Marken. Orte im Knotennetz sind anklickbar.
    const namen = svgElement("g", { class: "rk-gedruckt" + (rk.zeigen.namen ? "" : " rk-gedruckt-leer") }, board);
    for (const [text, x, y, breite, groesse, haupt, id] of reisekarte.gedruckteNamen) {
      const name = svgElement("text", { x, y, textLength: breite, lengthAdjust: "spacingAndGlyphs", "font-size": groesse,
        class: (haupt ? "rk-gedruckt-haupt" : "") + (id ? " rk-klickbar" : "") + (id && id === rk.auswahl ? " rk-gewaehlt-name" : "") }, namen);
      name.textContent = text;
      if (id && !reisekarte.hat(id)) {
        name.setAttribute("role", "button");
        name.setAttribute("tabindex", "0");
        name.dataset.ort = id;
        name.addEventListener("click", () => rkWaehlen(id));
        name.addEventListener("keydown", event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          rkWaehlen(id);
        });
      }
    }

    if (rk.marsch) marschZeichnen(board);
    rkAnwenden();
    renderReisekarteInfo(hier, ziele);
  }

  // ---- Ansicht: Ausschnitt der Welt in Kartenpixeln. Die Höhe folgt dem Seitenverhältnis des Fensters. ----
  function rkRahmen() {
    const box = el("rk-scroll");
    return [Math.max(1, box.clientWidth), Math.max(1, box.clientHeight)];
  }

  function rkGanzeWelt() {
    const [cw, ch] = rkRahmen();
    const [wx, wy, ww, wh] = reisekarte.welt;
    return Math.max(ww, wh * cw / ch);
  }

  function rkAnwenden() {
    if (!rk.ansicht) return;
    const [cw, ch] = rkRahmen();
    const [wx, wy, ww, wh] = reisekarte.welt;
    const ansicht = rk.ansicht;
    ansicht.w = Math.min(rkGanzeWelt(), Math.max(cw * rkNaechster, ansicht.w));
    const h = ansicht.w * ch / cw;
    // Die Welt bleibt im Bild: kleiner als das Fenster wird sie mittig gehalten.
    ansicht.x = ansicht.w >= ww ? wx + (ww - ansicht.w) / 2 : Math.min(wx + ww - ansicht.w, Math.max(wx, ansicht.x));
    ansicht.y = h >= wh ? wy + (wh - h) / 2 : Math.min(wy + wh - h, Math.max(wy, ansicht.y));
    const board = el("rk-svg");
    board.setAttribute("viewBox", [ansicht.x, ansicht.y, ansicht.w, h].map(v => Math.round(v * 10) / 10).join(" "));
    const k = ansicht.w / cw;
    board.classList.toggle("rk-nah", k <= rkNah);
    for (const marke of rkMarken) {
      marke.setAttribute("transform", "translate(" + marke.dataset.x + " " + marke.dataset.y + ") scale(" + (k * (k <= rkNah ? rkMarkenGroesse : 1)).toFixed(4) + ")");
    }
    for (const control of document.querySelectorAll("[data-rk-zoom]")) {
      const rein = control.dataset.rkZoom === "1";
      control.disabled = rein ? ansicht.w <= cw * rkNaechster + 0.5 : ansicht.w >= rkGanzeWelt() - 0.5;
    }
  }

  // Um einen Bildschirmpunkt (Pixel im Fenster) zoomen: Der Kartenpunkt darunter bleibt stehen.
  function rkZoom(faktor, sx, sy) {
    const [cw, ch] = rkRahmen();
    const ansicht = rk.ansicht;
    sx ??= cw / 2;
    sy ??= ch / 2;
    const k = ansicht.w / cw;
    const px = ansicht.x + sx * k;
    const py = ansicht.y + sy * k;
    ansicht.w = Math.min(rkGanzeWelt(), Math.max(cw * rkNaechster, ansicht.w / faktor));
    const k2 = ansicht.w / cw;
    ansicht.x = px - sx * k2;
    ansicht.y = py - sy * k2;
    rkAnwenden();
  }

  function rkVerschieben(dx, dy) {
    const [cw] = rkRahmen();
    const k = rk.ansicht.w / cw;
    rk.ansicht.x -= dx * k;
    rk.ansicht.y -= dy * k;
    rkAnwenden();
  }

  // Einen Kartenpunkt mit gegebener Breite des Ausschnitts in die Mitte rücken.
  function rkZeigen([px, py], breite) {
    const [cw, ch] = rkRahmen();
    const h = breite * ch / cw;
    rk.ansicht = { x: px - breite / 2, y: py - h / 2, w: breite };
    rkAnwenden();
  }

  function rkZuMir() {
    const hier = rules.aktuellerKnoten(state);
    const punkt = hier && reisekarte.lage(hier);
    const [cw] = rkRahmen();
    if (punkt) rkZeigen(punkt, cw * 1.1);
    else rkZeigenGebiet(reisekarte.welt);
  }

  function rkZeigenGebiet([x, y, w, h]) {
    const [cw, ch] = rkRahmen();
    rkZeigen([x + w / 2, y + h / 2], Math.max(w, h * cw / ch) * 1.04);
  }

  // ---- Marsch-Animation (Henry, 20. 11. 2026, quellen/henry/v2619/marsch-und-rueckreise.json) ----
  // Die Karte zoomt auf die Route (Faktor 1,28, Schwenk 800 ms), der Pfad zeichnet sich gestrichelt (6, 6), das Banner
  // zieht je Etappe 1200 ms mit ease-in-out. Rand-Vignette 65 %, Wetter je Weg (Asche Westmark, Regen Norden, Schnee am
  // Pass), Text blendet in 450 ms ein. Jede Etappe ist eine echte Reise (Nahrung, Begegnung); ein Kampf beendet den Marsch.
  const MARSCH = rules.marschDaten.marsch_animation;
  const marschWetter = Object.fromEntries(MARSCH.atmosphaere_layer.wetter_effekte.map(w => [w.id, w]));
  const marschRuhig = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const warte = ms => new Promise(fertig => setTimeout(fertig, ms));
  const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function rkAnimieren(dauer, schritt) {
    if (!dauer || rk.marsch?.ueberspringen) { schritt(1); return Promise.resolve(); }
    return new Promise(fertig => {
      const start = performance.now();
      const frame = jetzt => {
        const t = Math.min(1, (jetzt - start) / dauer);
        schritt(rk.marsch?.ueberspringen ? 1 : t);
        if (t < 1 && !rk.marsch?.ueberspringen) requestAnimationFrame(frame);
        else fertig();
      };
      requestAnimationFrame(frame);
    });
  }
  // Kamera sanft auf einen Ausschnitt schwenken.
  function rkSchwenk([px, py], breite, dauer) {
    const [cw, ch] = rkRahmen();
    const von = { ...rk.ansicht };
    const nach = { x: px - breite / 2, y: py - breite * ch / cw / 2, w: breite };
    return rkAnimieren(dauer, t => {
      const e = easeInOut(t);
      rk.ansicht = { x: von.x + (nach.x - von.x) * e, y: von.y + (nach.y - von.y) * e, w: von.w + (nach.w - von.w) * e };
      rkAnwenden();
    });
  }
  // Wetter einer Etappe: Schnee am Pass, Asche in der Westmark (Hagenfels und seine Dörfer), Regen im Norden der Menschenlande.
  function marschWetterFuer(von, nach) {
    const weg = knoten.verbindung(von, nach);
    if (weg?.kantenTyp === "pass") return marschWetter.schnee_pass;
    const westmark = new Set(["hagenfels", ...knoten.doerfer("hagenfels")]);
    if (westmark.has(von) || westmark.has(nach)) return marschWetter.rauch_westmark;
    const [, ry, , rh] = reisekarte.regionen.menschen ?? [0, 0, 0, 1];
    const y = (reisekarte.lage(von)[1] + reisekarte.lage(nach)[1]) / 2;
    return y < ry + rh * 0.35 ? marschWetter.regen_nord : null;
  }
  function marschAtmosphaere(wetter, text) {
    const box = el("rk-scroll");
    let schicht = box.querySelector(".rk-atmo");
    if (!schicht) {
      schicht = element("div");
      schicht.className = "rk-atmo";
      schicht.setAttribute("aria-hidden", "true");
      schicht.style.setProperty("--rk-vignette", MARSCH.atmosphaere_layer.vignette_rand_dunkelheit);
      schicht.append(element("div"), element("div"));
      schicht.children[0].className = "rk-wetter";
      schicht.children[1].className = "rk-vignette";
      box.append(schicht);
      const zeile = element("p");
      zeile.className = "rk-marsch-text";
      zeile.setAttribute("role", "status");
      zeile.style.setProperty("--rk-fade", MARSCH.atmosphaere_layer.text_fade_ms + "ms");
      box.append(zeile);
    }
    const feld = schicht.querySelector(".rk-wetter");
    if (feld.dataset.wetter !== (wetter?.id ?? "")) {
      feld.dataset.wetter = wetter?.id ?? "";
      feld.className = "rk-wetter" + (wetter ? " " + wetter.css_klasse : "");
      feld.replaceChildren();
      for (let i = 0; wetter && !marschRuhig() && i < wetter.partikel_anzahl; i++) {
        const teil = element("i");
        teil.style.setProperty("--x", ((i * 37) % 100) + "%");
        teil.style.setProperty("--y", ((i * 53) % 60) + "%");
        teil.style.setProperty("--d", (i * 0.23 % 2.4).toFixed(2) + "s");
        teil.style.setProperty("--s", (0.7 + (i * 13 % 7) / 10).toFixed(2));
        feld.append(teil);
      }
    }
    const zeile = box.querySelector(".rk-marsch-text");
    if (text !== undefined && zeile.textContent !== (text ?? "")) {
      zeile.classList.remove("rk-sichtbar");
      setTimeout(() => {
        zeile.textContent = text ?? "";
        if (text) zeile.classList.add("rk-sichtbar");
      }, zeile.textContent ? MARSCH.atmosphaere_layer.text_fade_ms : 0);
    }
  }
  function marschAufraeumen() {
    el("rk-scroll").querySelector(".rk-atmo")?.remove();
    el("rk-scroll").querySelector(".rk-marsch-text")?.remove();
    el("reisekarte").classList.remove("rk-marschiert");
    rk.marsch = null;
  }
  // Gezeichnete Etappen und Banner überstehen das Neuzeichnen der Karte nach jeder Etappe.
  function marschZeichnen(board) {
    const m = rk.marsch;
    const schicht = svgElement("g", { class: "rk-marsch", "aria-hidden": "true" }, board);
    for (const [a, b, anteil] of m.pfade) {
      const [x1, y1] = reisekarte.lage(a);
      const [x2, y2] = reisekarte.lage(b);
      svgElement("line", { x1, y1, x2: x1 + (x2 - x1) * anteil, y2: y1 + (y2 - y1) * anteil, class: "rk-marsch-pfad",
        "stroke-dasharray": MARSCH.pfad_stil.svg_stroke_dasharray }, schicht);
    }
    const banner = svgElement("g", { class: "rk-marsch-banner" }, schicht);
    svgElement("line", { x1: 0, y1: 0, x2: 0, y2: -20, class: "rk-banner-stange" }, banner);
    svgElement("path", { d: "M0 -20 L15 -16.5 L11 -13.5 L15 -10.5 L0 -10 Z", class: "rk-banner-tuch" }, banner);
    svgElement("circle", { r: 2.6, class: "rk-banner-fuss" }, banner);
    banner.dataset.x = m.banner[0];
    banner.dataset.y = m.banner[1];
    rkMarken.push(banner);
  }
  function marschSetzen() {
    const board = el("rk-svg");
    const m = rk.marsch;
    const schicht = board.querySelector(".rk-marsch");
    if (!schicht) return;
    const linien = schicht.querySelectorAll(".rk-marsch-pfad");
    const letzte = m.pfade[m.pfade.length - 1];
    if (letzte && linien[m.pfade.length - 1]) {
      const [x1, y1] = reisekarte.lage(letzte[0]);
      const [x2, y2] = reisekarte.lage(letzte[1]);
      linien[m.pfade.length - 1].setAttribute("x2", x1 + (x2 - x1) * letzte[2]);
      linien[m.pfade.length - 1].setAttribute("y2", y1 + (y2 - y1) * letzte[2]);
    }
    const banner = schicht.querySelector(".rk-marsch-banner");
    banner.dataset.x = m.banner[0];
    banner.dataset.y = m.banner[1];
    rkAnwenden();
  }

  // Marsch über eine Route (Liste von Zielorten ab dem Standort). Ohne Animation (reduzierte Bewegung) reist er sofort.
  async function marschieren(route, { offenLassen = false, text = undefined } = {}) {
    if (rk.marsch || !route?.length || !state || state.scene !== "weltknoten" || state.combat) return;
    const karteWarOffen = el("reisekarte").open;
    // Henry wünscht die Animation ausdrücklich: Auch bei „Bewegung reduzieren“ (z. B. Windows ohne Animationseffekte)
    // läuft der Marsch, nur die Wetterteilchen entfallen. „Marsch überspringen“ beendet ihn sofort.
    rk.marsch = { pfade: [], banner: reisekarte.lage(rules.aktuellerKnoten(state)) ?? [0, 0], ueberspringen: false };
    if (!karteWarOffen) {
      if (el("inventory-hub").open) el("inventory-hub").close();
      if (el("character-sheet").open) el("character-sheet").close();
      rk.auswahl = null;
      el("reisekarte").showModal();
      if (!rk.ansicht) rkZuMir();
    }
    el("reisekarte").classList.add("rk-marschiert");
    renderReisekarte();
    el("rk-marsch-weiter")?.focus();
    // Kamera: Ausschnitt um die ganze Route, um den Faktor 1,28 näher.
    const punkte = [rules.aktuellerKnoten(state), ...route].map(id => reisekarte.lage(id));
    const xs = punkte.map(p => p[0]);
    const ys = punkte.map(p => p[1]);
    const [cw, ch] = rkRahmen();
    const breite = Math.max(cw * 0.6, (Math.max(...xs) - Math.min(...xs)) * 1.6, (Math.max(...ys) - Math.min(...ys)) * 1.6 * cw / ch) / MARSCH.kamera_zoom_faktor;
    marschAtmosphaere(marschWetterFuer(rules.aktuellerKnoten(state), route[0]));
    await rkSchwenk([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2], breite, MARSCH.kamera_pan_transition_ms);
    let ok = true;
    for (const ziel of route) {
      const von = rules.aktuellerKnoten(state);
      const grund = rules.reiseGrund(state, ziel);
      if (grund) {
        marschAtmosphaere(null, "Der Marsch stockt in " + knoten.get(von).name + ": " + grund + ".");
        ok = false;
        break;
      }
      marschAtmosphaere(marschWetterFuer(von, ziel), text ?? rules.marschVignette(state, ziel) ??
        "Unterwegs nach " + knoten.get(ziel).name + " · " + knoten.kantenNamen[knoten.verbindung(von, ziel).kantenTyp] + ".");
      const [x1, y1] = reisekarte.lage(von);
      const [x2, y2] = reisekarte.lage(ziel);
      const etappe = [von, ziel, 0];
      rk.marsch.pfade.push(etappe);
      renderReisekarte();
      await rkAnimieren(MARSCH.etappen_dauer_ms, t => {
        const e = easeInOut(t);
        etappe[2] = MARSCH.pfad_stil.animierte_pfad_zeichnung ? e : 1;
        rk.marsch.banner = [x1 + (x2 - x1) * e, y1 + (y2 - y1) * e];
        marschSetzen();
      });
      update(rules.reise(state, ziel));
      if (state.combat || state.scene !== "weltknoten" || rules.aktuellerKnoten(state) !== ziel) { ok = false; break; }
    }
    const kampf = state.combat || state.scene !== "weltknoten";
    if (!kampf && ok && !rk.marsch.ueberspringen) await warte(MARSCH.atmosphaere_layer.text_fade_ms);
    marschAufraeumen();
    // Ein Hinterhalt oder eine Szene der Handlung braucht das Hauptfenster.
    if (kampf || (!offenLassen && !karteWarOffen)) el("reisekarte").close();
    else { renderReisekarte(); el("rk-scroll").focus(); }
  }

  // Rückkehr zum Auftraggeber: Marsch über die kürzeste Route.
  function rueckkehrAntreten(ziel) {
    if (ziel.route?.length) marschieren(ziel.route, { offenLassen: el("reisekarte").open, text: rules.marschVignette(state, ziel.ort) });
  }

  function renderReisekarteInfo(hier, ziele) {
    const info = el("rk-info");
    info.replaceChildren();
    const reisen = state.scene === "weltknoten" && !state.combat && state.health > 0;
    const id = rk.auswahl ?? (hier && knoten.alle[hier] ? hier : null);
    if (!id) {
      info.append(element("p", "Wähle einen Ort auf der Karte. Mit Mausrad oder zwei Fingern zoomst du, durch Ziehen verschiebst du die Karte."));
      return;
    }
    const ort = knoten.get(id);
    const volk = klassen.fraktionen[ort.fraktion]?.volk;
    info.append(element("h3", ort.name));
    const herkunft = element("dl");
    herkunft.className = "rk-daten";
    herkunft.append(element("dt", "Ort"), element("dd", knoten.typNamen[ort.typ] + (ort.hatHafen && ort.typ !== "hafenstadt" ? " mit Hafen" : "")),
      element("dt", "Volk"), element("dd", klassen.voelker[volk]?.name ?? rkVolkNamen[reisekarte.volkVon[ort.fraktion]] ?? "unbekannt"),
      element("dt", "Fraktion"), element("dd", klassen.fraktionen[ort.fraktion]?.name ?? ort.fraktion));
    info.append(herkunft);
    if (id === hier) info.append(element("p", "Du bist hier."));
    for (const ziel of rules.rueckkehrZiele(state).filter(z => z.ort === id)) {
      const hinweis = element("p", "Bericht erwartet: " + ziel.titel + ".");
      hinweis.className = "rk-abgabe-hinweis";
      info.append(hinweis);
    }
    // Fremde Völker: nur das Grundlegende, ihr Wegenetz entsteht noch.
    if (!reisekarte.hat(id)) {
      const hinweis = element("p", "Die Wege dieses Volkes werden noch ausgearbeitet.");
      hinweis.className = "rk-herkunft";
      info.append(hinweis);
      return;
    }

    const weg = ziele.get(id);
    if (weg) {
      const daten = element("dl");
      daten.className = "rk-daten";
      const zeile = (label, wert) => daten.append(element("dt", label), element("dd", wert));
      const kosten = [weg.kostenRessource ? weg.kostenRessource + " " + rules.resourceName(state) : "",
        weg.kostenGold ? weg.kostenGold + " Silber" : ""].filter(Boolean).join(" + ") || "frei";
      zeile("Weg", (weg.kennung ? weg.kennung + " · " : "") + knoten.kantenNamen[weg.kantenTyp] + (weg.pass ? " (" + weg.pass + ")" : ""));
      zeile("Zone", knoten.sicherheitNamen[weg.sicherheit]);
      zeile("Kosten", kosten + (weg.rabatt ? " (Auftrag: 1 günstiger)" : ""));
      zeile("Hinterhalt", rkPercent(weg.gefahr));
      zeile("Gegner", weg.kantenTyp === "seeweg" ? "noch keine Kämpfe auf See" : weg.gegner.join(", ") || "keine");
      info.append(daten);
      if (weg.auftrag) {
        const auftrag = rules.auftraege(state).find(entry => entry.id === weg.auftrag);
        const hinweis = element("p", "Auftrag unterwegs: " + auftrag.titel + ".");
        hinweis.className = "welt-aushang-hinweis";
        info.append(hinweis);
      }
      if (weg.letzterVorrat && !weg.grund) {
        const warn = element("p", "Achtung: Diese Reise braucht deinen letzten Vorrat.");
        warn.className = "welt-alarm";
        info.append(warn);
      }
      const reise = element("div");
      reise.className = "actions";
      button(reise, "Reise nach " + ort.name + (weg.grund ? " · " + weg.grund : ""), () => {
        rk.auswahl = null;
        welt.tab = "aufbruch";
        marschieren([id], { offenLassen: true });
      }, { disabled: !reisen || Boolean(weg.grund) || Boolean(rk.marsch), story: true });
      info.append(reise);
    } else if (id !== hier) {
      info.append(element("p", hier && reisekarte.hat(hier) ? "Kein direkter Weg von deinem Standort. Reisen geht nur von Ort zu Ort, jede Etappe einzeln." :
        "Reisen kannst du von der Weltreise aus."));
    }
    if (id === hier && !reisen) {
      info.append(element("p", state.combat ? "Im Kampf kannst du die Karte nur ansehen." :
        state.scene === "weltknoten" ? "Ohne Lebenspunkte kannst du nicht reisen." : "Reisen kannst du, sobald du in der Weltreise bist."));
    }

    const wege = reisekarte.wegeVon(id);
    if (wege.length) {
      info.append(element("h4", "Wege von " + ort.name));
      const liste = element("ul");
      liste.className = "rk-wegliste";
      for (const eintrag of wege) {
        const anderer = eintrag.a === id ? eintrag.b : eintrag.a;
        const item = element("li");
        const wahl = element("button", knoten.get(anderer).name);
        wahl.type = "button";
        wahl.className = "rk-link" + (ziele.has(anderer) && id === hier ? " rk-link-ziel" : "");
        wahl.addEventListener("click", () => {
          rk.auswahl = anderer;
          renderReisekarte();
          rkZeigen(reisekarte.lage(anderer), rk.ansicht.w);
          el("rk-info").querySelector("h3")?.setAttribute("tabindex", "-1");
          el("rk-info").querySelector("h3")?.focus();
        });
        item.append(element("span", eintrag.kennung), wahl);
        liste.append(item);
      }
      info.append(liste);
    }
  }

  function openReisekarte() {
    if (!state) return;
    if (el("inventory-hub").open) el("inventory-hub").close();
    if (el("character-sheet").open) el("character-sheet").close();
    rk.auswahl = null;
    el("reisekarte").showModal();
    renderReisekarte();
    if (!rk.ansicht) rkZuMir();
    el("rk-close").focus();
  }

  for (const opener of document.querySelectorAll("[data-reisekarte-open]")) opener.addEventListener("click", openReisekarte);
  el("rk-close").addEventListener("click", () => el("reisekarte").close());
  el("rk-marsch-weiter").addEventListener("click", () => { if (rk.marsch) rk.marsch.ueberspringen = true; });
  el("reisekarte").addEventListener("close", () => { if (rk.marsch) rk.marsch.ueberspringen = true; });
  el("reisekarte").addEventListener("click", event => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  for (const control of document.querySelectorAll("[data-rk-zoom]")) {
    control.addEventListener("click", () => rkZoom(control.dataset.rkZoom === "1" ? 1.6 : 1 / 1.6));
  }
  el("rk-zu-mir").addEventListener("click", rkZuMir);
  el("rk-region").addEventListener("change", event => {
    const wahl = event.target.value;
    if (wahl === "welt") rkZeigenGebiet(reisekarte.welt);
    else if (reisekarte.regionen[wahl]) rkZeigenGebiet(reisekarte.regionen[wahl]);
    event.target.value = "";
  });

  // Zoomen und Verschieben mit Maus, Fingern und Tasten.
  {
    const box = el("rk-scroll");
    const zeiger = new Map();
    let start = null;
    const punktIm = (event) => {
      const rect = box.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };
    box.addEventListener("wheel", event => {
      if (!rk.ansicht) return;
      event.preventDefault();
      const schritt = event.deltaMode === 1 ? 0.05 : event.deltaMode === 2 ? 0.5 : 0.0015;
      rkZoom(Math.exp(-event.deltaY * schritt), ...punktIm(event));
    }, { passive: false });
    box.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      zeiger.set(event.pointerId, punktIm(event));
      start = { weg: 0 };
      rk.gezogen = false;
    });
    window.addEventListener("pointermove", event => {
      if (!zeiger.has(event.pointerId) || !rk.ansicht) return;
      const vorher = zeiger.get(event.pointerId);
      const jetzt = punktIm(event);
      if (zeiger.size === 1) {
        start.weg += Math.hypot(jetzt[0] - vorher[0], jetzt[1] - vorher[1]);
        if (start.weg > 5) rk.gezogen = true;
        if (rk.gezogen) rkVerschieben(jetzt[0] - vorher[0], jetzt[1] - vorher[1]);
      } else if (zeiger.size === 2) {
        // Zwei Finger: Abstand zoomt, die Mitte verschiebt.
        const [anderer] = [...zeiger.entries()].filter(([id]) => id !== event.pointerId).map(([, p]) => p);
        const mitteVorher = [(vorher[0] + anderer[0]) / 2, (vorher[1] + anderer[1]) / 2];
        const mitteJetzt = [(jetzt[0] + anderer[0]) / 2, (jetzt[1] + anderer[1]) / 2];
        const abstandVorher = Math.hypot(vorher[0] - anderer[0], vorher[1] - anderer[1]);
        const abstandJetzt = Math.hypot(jetzt[0] - anderer[0], jetzt[1] - anderer[1]);
        rk.gezogen = true;
        if (abstandVorher > 0) rkZoom(abstandJetzt / abstandVorher, ...mitteJetzt);
        rkVerschieben(mitteJetzt[0] - mitteVorher[0], mitteJetzt[1] - mitteVorher[1]);
      }
      zeiger.set(event.pointerId, jetzt);
    });
    const loslassen = event => zeiger.delete(event.pointerId);
    window.addEventListener("pointerup", loslassen);
    window.addEventListener("pointercancel", loslassen);
    // Nach dem Ziehen löst das Loslassen keinen Klick auf einen Ort aus.
    box.addEventListener("click", event => {
      if (!rk.gezogen) return;
      event.stopPropagation();
      event.preventDefault();
      rk.gezogen = false;
    }, true);
    box.addEventListener("dblclick", event => {
      event.preventDefault();
      rkZoom(2, ...punktIm(event));
    });
    box.addEventListener("keydown", event => {
      if (event.target !== box) return;
      const [cw, ch] = rkRahmen();
      const schritte = { ArrowLeft: [cw * 0.15, 0], ArrowRight: [-cw * 0.15, 0], ArrowUp: [0, ch * 0.15], ArrowDown: [0, -ch * 0.15] };
      if (schritte[event.key]) rkVerschieben(...schritte[event.key]);
      else if (event.key === "+" || event.key === "=") rkZoom(1.6);
      else if (event.key === "-") rkZoom(1 / 1.6);
      else return;
      event.preventDefault();
    });
    window.addEventListener("resize", () => {
      if (el("reisekarte").open) rkAnwenden();
    });
  }

  for (const opener of document.querySelectorAll("[data-hub-open]")) opener.addEventListener("click", () => openHub());
  el("hub-close").addEventListener("click", () => el("inventory-hub").close());
  el("hub-unequip-all").addEventListener("click", () => {
    hubAction(rules.unequip(state));
    el("hub-unequip-all").focus();
  });
  el("inventory-hub").addEventListener("click", event => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  const hubTabIds = ["bag", "storage", "trade"];
  hubTabIds.forEach((tab, index) => {
    const control = el("hub-tab-" + tab);
    // Deaktivierte Reiter bleiben anklickbar und zeigen, wo sie nutzbar sind.
    control.addEventListener("click", () => {
      hub.tab = tab;
      hub.slot = null;
      hub.zielFuer = null;
      renderHub();
      control.focus();
    });
    control.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      el("hub-tab-" + hubTabIds[(index + (event.key === "ArrowRight" ? 1 : hubTabIds.length - 1)) % hubTabIds.length]).click();
    });
  });

  // Charakterfenster: Stand (Erfahrung, Lebenspunkte, Glut), Werte und wirkende Effekte als Reiter in einem Pop-up.
  const sheet = { tab: "stand" };
  const sheetTabs = ["stand", "werte", "aufstieg", "effekte"];

  function sheetMeter(id, value, max) {
    const meter = el("sheet-" + id);
    meter.max = Math.max(1, max);
    meter.value = Math.max(0, Math.min(value, max));
  }

  function sheetSection(title, ...children) {
    const section = element("section");
    section.className = "sheet-section";
    section.append(element("h3", title), ...children);
    return section;
  }

  function sheetStats(values) {
    const dl = element("dl");
    dl.className = "hub-stats sheet-stats";
    stats(dl, values);
    return dl;
  }

  function sheetBalance() {
    const scale = element("div");
    scale.className = "sheet-balance";
    scale.setAttribute("role", "img");
    scale.setAttribute("aria-label", "Glutgleichgewicht " + signed(state.balance) + " · Rückstoß ab ±4");
    for (let step = -3; step <= 3; step++) {
      const cell = element("span", step === 0 ? "0" : signed(step));
      cell.className = "sheet-balance-step" + (step === state.balance ? " sheet-balance-now" : "") +
        (Math.abs(step) >= 2 ? " sheet-balance-edge" : "");
      scale.append(cell);
    }
    const legend = element("p");
    legend.className = "sheet-note";
    legend.textContent = "← Erneuerung · Zerstörung → · Bei ±4 schlägt die Glut zurück.";
    return [scale, legend];
  }

  function renderSheetStand(panel) {
    const progress = rules.progression(state);
    // UI-Überarbeitung 19. 11. 2026: EP-Fortschrittsbalken statt Stufenraster, die Stufentabelle liegt im Klappmenü.
    const xp = element("div");
    xp.className = "sheet-xp-line";
    const xpText = element("p");
    xpText.className = "sheet-big";
    xpText.textContent = progress.next === null ? "Stufe " + progress.level + " · " + progress.xp + " EP · Höchste Erfahrungsstufe"
      : "Stufe " + progress.level + " · " + progress.xp + " / " + progress.next + " EP";
    const xpBar = element("progress");
    xpBar.className = "sheet-xp-bar";
    xpBar.max = progress.next === null ? 1 : progress.next - progress.floor;
    xpBar.value = progress.next === null ? 1 : progress.xp - progress.floor;
    xpBar.setAttribute("aria-label", "Erfahrung bis Stufe " + (progress.level + 1));
    const xpRest = element("p", progress.next === null ? "" : "Noch " + (progress.next - progress.xp) + " EP bis Stufe " + (progress.level + 1) + ".");
    xpRest.className = "sheet-note";
    xp.append(xpText, xpBar, xpRest);
    const table = element("details");
    table.className = "sheet-ladder-box";
    table.append(element("summary", "Stufentabelle"));
    const ladder = element("ol");
    ladder.className = "sheet-ladder";
    rules.levelThresholds.forEach((value, index) => {
      const step = element("li", "Stufe " + (index + 1) + " · " + value + " EP");
      if (index + 1 < progress.level) step.className = "sheet-done";
      if (index + 1 === progress.level) { step.className = "sheet-now"; step.setAttribute("aria-current", "step"); }
      ladder.append(step);
    });
    table.append(ladder);
    const training = element("div");
    training.className = "actions sheet-training";
    if (progress.points) {
      training.append(element("p", progress.points + (progress.points === 1 ? " Grundwertpunkt" : " Grundwertpunkte") + " aus früheren Stufenaufstiegen zu verteilen."));
      button(training, "Im Entwurf verteilen", () => { sheet.tab = "aufstieg"; renderSheet(); el("sheet-tab-aufstieg").focus(); });
    }
    const fight = state.combat ? rules.targets(state).filter(enemy => enemy.health > 0) : [];
    panel.append(
      sheetSection("Erfahrungsstufe " + progress.level, xp, table, training),
      sheetSection(glutSichtbar() ? "Lebenspunkte, Kraft und Glut" : "Lebenspunkte und Kraft", sheetStats([
        ["Lebenspunkte", state.health + " / " + rules.healthLimit(state)],
        ...((values) => [["Ausdauer", values.ausdauer + " / " + values.ausdauerMax],
          ...(values.manaMax ? [["Mana", values.mana + " / " + values.manaMax]] : []),
          [values.ressourceName, rules.lage(state) ? values.ressource + " (Proviant)" : values.ressource + " / " + rules.vorratMax]])(rules.kampfwerte(state)),
        ...(glutSichtbar() ? [["Glut", state.ember + " / " + rules.emberLimit(state)]] : []),
        ["Schutz im Kampf", String(rules.protection(state) + rules.gearBonus(state, "armor"))],
        ["Silber", String(state.silver)],
      ])),
      ...(glutSichtbar() ? [sheetSection("Glutgleichgewicht", ...sheetBalance())] : []),
      sheetSection("Gleichgewicht der Welt · Etappe " + etappeJetzt(), weltLeistenBlock()),
      sheetSection("Lage", sheetStats([
        ["Ort", world.scenes[state.scene].place ?? "Unterwegs"],
        ["Kampf", fight.length ? "Gegen " + fight.map(enemy => enemy.name + " (" + enemy.health + " LP)").join(", ") : "Kein Kampf"],
        ["Gefährten", state.party.length + " / " + rules.partyLimit],
        ["Quest-Stufe", String(state.questStufe)],
      ])),
    );
  }

  function renderSheetWerte(panel) {
    const faction = klassen.fraktionen[state.faction];
    const klasse = faction.klassen[state.role];
    const limits = rules.heroLimits(state);
    const gear = rules.gearStats(state);
    const intro = element("p", klasse.spielweise + ".");
    intro.className = "sheet-note";
    panel.append(
      sheetSection("Klasse · " + rules.title(state), sheetStats([
        ["Volk", klassen.voelker[faction.volk].name],
        ["Fraktion", faction.name],
        ["Grundklasse", klassen.grundklassen[rules.profile(state.faction, state.role)].name],
        ["Spezialisierung", state.build.spez ? klasse[state.build.spez.variante][0] : rules.spezHinweis(state)],
        ["Magie", faction.magie ? "Ja" : "Keine Magie"],
      ]), intro),
      sheetSection("Grundwerte", sheetStats(attributeValues(rules.heroAttributes(state)))),
      sheetSection("Fertigkeiten", sheetStats(Object.entries(rules.heroSkills(state)).map(([id, value]) =>
        [klassen.fertigkeiten[id].name, value + " / " + limits[id]]))),
      sheetSection("Kampfwerte mit Ausrüstung", sheetStats([
        ["Waffe", world.items[rules.weapon(state)] ?? "—"],
        ...statLabels.map(([key, label]) => [label, String(gear[key])]),
        ["Abwehr", String(rules.protection(state))],
        ["Grundangriff", "+" + rules.kampfwerte(state).grundangriff + " ab Stufe 4, 8, 12, 16, 20"],
      ])),
      sheetSection(rules.kampfwerte(state).manaMax ? "Angriffe und Zauber" : "Angriffe und Techniken", abilityListing()),
    );
  }

  function renderSheetEffekte(panel) {
    const all = rules.effects(state);
    const groupsOf = [["gut", "Vorteile"], ["schlecht", "Nachteile und Zustände"], ["hinweis", "Hinweise"]];
    for (const [art, title] of groupsOf) {
      const entries = all.filter(effect => effect.art === art);
      if (!entries.length) continue;
      const listing = element("ul");
      listing.className = "sheet-effects";
      for (const effect of entries) {
        const item = element("li");
        item.className = "sheet-effect sheet-effect-" + art;
        item.dataset.effect = effect.id;
        const head = element("div");
        head.className = "sheet-effect-head";
        head.append(element("strong", effect.name), element("span", effect.dauer));
        item.append(head, element("p", effect.text));
        listing.append(item);
      }
      panel.append(sheetSection(title, listing));
    }
    if (state.party.length) {
      const listing = element("ul");
      listing.className = "sheet-effects";
      for (const id of state.party) {
        const companion = world.companions[id];
        const item = element("li");
        item.className = "sheet-effect sheet-effect-gut";
        const head = element("div");
        head.className = "sheet-effect-head";
        head.append(element("strong", companion.name), element("span", "In der Gruppe"));
        item.append(head, element("p", companionEffect(companion) || "Kämpft an deiner Seite."));
        listing.append(item);
      }
      panel.append(sheetSection("Unterstützung durch Gefährten", listing));
    }
    if (!panel.children.length) {
      const empty = element("p", "Zurzeit wirkt kein besonderer Effekt auf dich.");
      empty.className = "sheet-note";
      panel.append(empty);
    }
  }

  // ---- Aufstieg im Entwurfsmodus (Technische Spezifikation, Abschnitt 4) ----
  // Die Plus- und Minus-Knöpfe ändern nur den Entwurf. Erst „Änderungen speichern“ schreibt die Punkte fest.
  const entwurf = { quelle: "stufe", training: {}, spez: null, meister: null };
  function entwurfLeeren() {
    Object.assign(entwurf, { quelle: "stufe", training: {}, spez: null, meister: null });
  }
  const entwurfSumme = (record) => Object.values(record ?? {}).reduce((sum, value) => sum + value, 0);
  function entwurfQuellen() {
    const quellen = [];
    // Patch 2.5.5: Menschen erhalten 2 Grundwertpunkte je Stufe; die Regeln zählen die freien Punkte.
    if (rules.progression(state).points) quellen.push(["stufe", "Grundwertpunkte"]);
    if (!state.build.spez && rules.spezBereit(state)) quellen.push(["spez", "Spezialisierung"]);
    if (rules.meisterBereit(state)) quellen.push(["meister", "Meisterklasse"]);
    return quellen;
  }
  // Build und Training so, wie sie nach dem Speichern wären.
  function entwurfStand() {
    const build = structuredClone(state.build);
    const training = { ...state.training };
    for (const [id, count] of Object.entries(entwurf.training)) training[id] = (training[id] ?? 0) + count;
    if (entwurf.spez?.variante) {
      build.spez = { variante: entwurf.spez.variante, grundwert: entwurf.spez.grundwert ?? null };
      if (entwurf.spez.fertigkeit) build.fertigkeiten[entwurf.spez.fertigkeit]++;
    }
    if (entwurf.meister) {
      build.meister = { grundwerte: { ...entwurf.meister.grundwerte } };
      if (entwurf.meister.fertigkeit) build.fertigkeiten[entwurf.meister.fertigkeit]++;
    }
    const values = rules.attributes(state.faction, state.role, build, training);
    return { build, training, values, limits: rules.skillLimits(state.faction, values) };
  }
  function entwurfPlan() {
    const plan = { training: { ...entwurf.training } };
    const spez = entwurf.spez;
    if (spez && (spez.variante || spez.grundwert || spez.fertigkeit)) {
      if (!spez.variante) return { fehlt: "Wähle Spezialisierung A oder B." };
      if (!spez.grundwert || !spez.fertigkeit) return { fehlt: "Die Spezialisierung bringt +1 Grundwert und +1 Fertigkeit. Verteile beide." };
      plan.spez = { ...spez };
    }
    const meister = entwurf.meister;
    if (meister && (entwurfSumme(meister.grundwerte) || meister.fertigkeit)) {
      if (entwurfSumme(meister.grundwerte) !== 2 || !meister.fertigkeit) return { fehlt: "Die Meisterklasse bringt +2 Grundwerte und +1 Fertigkeit. Verteile alle." };
      plan.meister = { grundwerte: { ...meister.grundwerte }, fertigkeit: meister.fertigkeit };
    }
    if (!entwurfSumme(plan.training) && !plan.spez && !plan.meister) return { fehlt: "Noch keine Änderung im Entwurf." };
    return { plan };
  }

  function entwurfGrundwert(id, delta) {
    const { values } = entwurfStand();
    if (delta > 0 && values[id] >= rules.grundwertGrenze(state)) return;
    if (entwurf.quelle === "stufe") {
      const next = (entwurf.training[id] ?? 0) + delta;
      if (next < 0 || (delta > 0 && entwurfSumme(entwurf.training) >= rules.progression(state).points)) return;
      if (next) entwurf.training[id] = next; else delete entwurf.training[id];
    } else if (entwurf.quelle === "spez") {
      entwurf.spez ??= { variante: null, grundwert: null, fertigkeit: null };
      if (delta > 0) entwurf.spez.grundwert = id;
      else if (entwurf.spez.grundwert === id) entwurf.spez.grundwert = null;
    } else {
      entwurf.meister ??= { grundwerte: {}, fertigkeit: null };
      const next = (entwurf.meister.grundwerte[id] ?? 0) + delta;
      if (next < 0 || next > 2 || (delta > 0 && entwurfSumme(entwurf.meister.grundwerte) >= 2)) return;
      if (next) entwurf.meister.grundwerte[id] = next; else delete entwurf.meister.grundwerte[id];
    }
  }
  function entwurfFertigkeit(id, delta) {
    const key = entwurf.quelle === "spez" ? "spez" : "meister";
    entwurf[key] ??= key === "spez" ? { variante: null, grundwert: null, fertigkeit: null } : { grundwerte: {}, fertigkeit: null };
    if (delta > 0) entwurf[key].fertigkeit = id;
    else if (entwurf[key].fertigkeit === id) entwurf[key].fertigkeit = null;
  }

  // Patch 2.5.5: Fähigkeitsränge (1 Punkt je Stufe 2–20, Rang 2/3/4 ab Stufe 3/8/15) im Charakterfenster und im Stadt-Hub.
  // Patch 2.6.14: Fähigkeitsränge als Karten (zwei Spalten) mit Punkte-Abzeichen, Regel im Tooltip, Rangleiste und Meilensteinen.
  const aufstiegTooltip = "Jede Stufe gewährt +2 Grundwertpunkte und +1 Fertigkeitspunkt (ab Stufe 21 Meister-Talentpunkte). " +
    "Jeder Fertigkeitsrang erhöht Schaden oder Heilung um +12 %; Rang 4 senkt zusätzlich die Kosten um 1.";
  const aufstiegMeilensteine = [[6, "3. Grundfähigkeit"], [10, "4. Grundfähigkeit & Klassen-Spezialisierung"],
    [15, "Signaturfähigkeit & Rang 4"], [21, "Meister-Talente (5 Bäume)"]];
  function faehigkeitsRaenge(panel, kopf, nachher = () => {}) {
    const fi = rules.faehigkeitInfo(state);
    if (!fi || !fi.liste.length) return;
    kopf.textContent = "Fähigkeitsränge";
    panel.append(kopf);
    const leiste = element("div");
    leiste.className = "aufstieg-abzeichen";
    const offenGrund = rules.progression(state).points;
    const offenTalent = fi.punkte + (rules.aufstiegInfo(state)?.talentPunkte ?? 0);
    for (const [label, wert] of [["Grundwertpunkte", offenGrund], ["Fertigkeits- / Talentpunkte", offenTalent]]) {
      const b = element("span", label + " ");
      b.append(element("strong", String(wert)));
      b.className = "abzeichen" + (wert > 0 ? " abzeichen-offen" : "");
      leiste.append(b);
    }
    const info = element("span", "?");
    info.className = "abzeichen-info";
    info.title = aufstiegTooltip;
    info.tabIndex = 0;
    info.setAttribute("aria-label", aufstiegTooltip);
    leiste.append(info);
    panel.append(leiste);
    const raster = element("div");
    raster.className = "faehigkeit-karten";
    for (const f of fi.liste) {
      const karte = element("article");
      karte.className = "faehigkeit-karte";
      const kopfzeile = element("div");
      kopfzeile.className = "faehigkeit-kopf";
      kopfzeile.append(element("strong", f.name));
      const pips = element("span");
      pips.className = "rang-pips";
      pips.setAttribute("aria-label", "Rang " + f.rang + " von " + fi.rangMax);
      for (let i = 1; i <= fi.rangMax; i++) {
        const pip = element("i");
        if (i <= f.rang) pip.className = "voll";
        pips.append(pip);
      }
      kopfzeile.append(pips);
      if (f.kosten) {
        const pille = element("span", f.kosten + " " + (f.zahlung === "M" ? "Mana" : "Ausdauer"));
        pille.className = "kosten-pille";
        kopfzeile.append(pille);
      }
      karte.append(kopfzeile, element("p", f.wirkung || "Verursacht Waffenschaden."));
      const fuss = element("p", "Aktuell (Rang " + f.rang + "/" + fi.rangMax + "): +" + f.bonus + " % Wirkung" +
        (f.rang < fi.rangMax ? " · Rang " + (f.rang + 1) + ": +" + (f.bonus + fi.rangBonus) + " % Wirkung (freigeschaltet ab Stufe " +
          fi.rangStufen[f.rang + 1] + ")" : ""));
      fuss.className = "faehigkeit-fuss";
      karte.append(fuss);
      if (f.rang < fi.rangMax) {
        button(karte, f.grund ? f.grund : "Rang steigern (1 Punkt)", () => { update(rules.faehigkeitSteigern(state, f.id)); nachher(); },
          { disabled: Boolean(f.grund) || Boolean(state.combat) });
      }
      raster.append(karte);
    }
    panel.append(raster);
    const stufe = rules.level(state);
    const strip = element("ol");
    strip.className = "meilenstein-leiste";
    strip.setAttribute("aria-label", "Nächste Meilensteine");
    for (const [lv, label] of aufstiegMeilensteine) {
      const li = element("li");
      li.append(element("strong", "Stufe " + lv), element("span", label));
      if (stufe >= lv) li.className = "erreicht";
      strip.append(li);
    }
    panel.append(strip);
  }

  function renderSheetAufstieg(panel) {
    if (rules.faehigkeitInfo(state)) faehigkeitsRaenge(panel, element("h3"), () => renderSheet());
    const quellen = entwurfQuellen();
    if (!quellen.length) {
      const note = element("p", "Zurzeit ist nichts zu verteilen. Grundwertpunkte aus früheren Stufenaufstiegen, die Spezialisierung " +
        rules.spezHinweis(state) + (rules.systeme.istMensch(state.faction) ? " (derzeit Stufe " + rules.level(state) + ") erscheinen hier."
          : " (derzeit " + state.questStufe + ") und die Meisterklasse nach der Vereinigung deines Volkes erscheinen hier."));
      note.className = "sheet-note";
      panel.append(note);
      return;
    }
    if (!quellen.some(([id]) => id === entwurf.quelle)) entwurf.quelle = quellen[0][0];
    const locked = Boolean(state.combat) || !state.health;
    const rerender = (focus) => { renderSheet(); if (focus) el("sheet-panel").querySelector(focus)?.focus(); };
    const stand = entwurfStand();
    const faction = klassen.fraktionen[state.faction];
    const klasse = faction.klassen[state.role];

    // Herkunft der Punkte
    const pick = element("div");
    pick.className = "entwurf-quellen actions";
    pick.setAttribute("role", "group");
    pick.setAttribute("aria-label", "Punkte verteilen aus");
    for (const [id, label] of quellen) {
      const rest = id === "stufe" ? rules.progression(state).points - entwurfSumme(entwurf.training) :
        id === "spez" ? (entwurf.spez?.grundwert ? 0 : 1) + (entwurf.spez?.fertigkeit ? 0 : 1) :
        2 - entwurfSumme(entwurf.meister?.grundwerte) + (entwurf.meister?.fertigkeit ? 0 : 1);
      const control = button(pick, label + " · " + rest + " offen", () => { entwurf.quelle = id; rerender('[data-quelle="' + id + '"]'); });
      control.dataset.quelle = id;
      control.setAttribute("aria-pressed", String(entwurf.quelle === id));
    }
    const intro = element("p", entwurf.quelle === "stufe" ? "Jeder Punkt erhöht einen Grundwert sofort um 1 (höchstens " + rules.grundwertGrenze(state) +
      "). Menschen erhalten 2 Punkte je Stufe und 1 je Ahnenrang." :
      entwurf.quelle === "spez" ? "Spezialisierung: Wähle A oder B. Sie bringt +1 Grundwert und +1 Fertigkeitspunkt." :
      "Meisterklasse " + klassen.meisterklassen[faction.volk].name + ": +2 Grundwerte und +1 Fertigkeitspunkt.");
    intro.className = "sheet-note";
    panel.append(sheetSection("Punkte verteilen", pick, intro));

    if (entwurf.quelle === "spez") {
      const varianten = element("div");
      varianten.className = "entwurf-varianten actions";
      for (const variante of ["a", "b"]) {
        const [name, text] = klasse[variante];
        const control = button(varianten, (variante === "a" ? "A · " : "B · ") + name + " · " + text, () => {
          entwurf.spez ??= { variante: null, grundwert: null, fertigkeit: null };
          entwurf.spez.variante = variante;
          rerender('[data-variante="' + variante + '"]');
        }, { disabled: locked });
        control.dataset.variante = variante;
        control.setAttribute("aria-pressed", String(entwurf.spez?.variante === variante));
      }
      panel.append(sheetSection("Spezialisierung", varianten));
    }

    // Grundwerte mit Live-Werten
    const rows = element("div");
    rows.className = "entwurf-rows";
    const before = rules.heroAttributes(state);
    for (const [id, label] of Object.entries(world.attributes)) {
      const row = element("div");
      row.className = "entwurf-row";
      const value = stand.values[id];
      const change = value - before[id];
      const bonus = rules.modifier(value);
      const name = element("span", label);
      const shown = element("strong", value + (bonus ? " (" + signed(bonus) + ")" : ""));
      if (change) shown.append(element("em", " " + signed(change)));
      const own = entwurf.quelle === "stufe" ? entwurf.training[id] ?? 0 : entwurf.quelle === "spez" ? (entwurf.spez?.grundwert === id ? 1 : 0)
        : entwurf.meister?.grundwerte?.[id] ?? 0;
      const minus = button(row, "−", () => { entwurfGrundwert(id, -1); rerender('[data-minus="' + id + '"]'); }, { disabled: locked || !own });
      minus.dataset.minus = id;
      minus.setAttribute("aria-label", label + " im Entwurf senken");
      const plus = button(row, "+", () => { entwurfGrundwert(id, 1); rerender('[data-plus="' + id + '"]'); }, { disabled: locked || value >= klassen.regeln.grundwertMax });
      plus.dataset.plus = id;
      plus.setAttribute("aria-label", label + " im Entwurf erhöhen");
      row.prepend(name, shown);
      rows.append(row);
    }
    panel.append(sheetSection("Grundwerte", rows));

    // Fertigkeiten mit Grenzen durch den Grundwert (Magie bleibt ohne Magie der Fraktion bei 0)
    const skills = element("div");
    skills.className = "entwurf-rows";
    const skillSource = entwurf.quelle !== "stufe";
    for (const [id, skill] of Object.entries(klassen.fertigkeiten)) {
      const row = element("div");
      row.className = "entwurf-row";
      const value = stand.build.fertigkeiten[id];
      const change = value - state.build.fertigkeiten[id];
      const shown = element("strong", value + " / " + stand.limits[id]);
      if (change) shown.append(element("em", " +" + change));
      if (value > stand.limits[id]) shown.className = "entwurf-over";
      row.append(element("span", skill.name), shown);
      if (skillSource) {
        const key = entwurf.quelle;
        const chosen = entwurf[key]?.fertigkeit === id;
        const minus = button(row, "−", () => { entwurfFertigkeit(id, -1); rerender('[data-skill-minus="' + id + '"]'); }, { disabled: locked || !chosen });
        minus.dataset.skillMinus = id;
        minus.setAttribute("aria-label", skill.name + " im Entwurf senken");
        const plus = button(row, "+", () => { entwurfFertigkeit(id, 1); rerender('[data-skill-plus="' + id + '"]'); },
          { disabled: locked || chosen || value >= stand.limits[id] });
        plus.dataset.skillPlus = id;
        plus.setAttribute("aria-label", skill.name + " im Entwurf erhöhen");
      }
      skills.append(row);
    }
    panel.append(sheetSection("Fertigkeiten", skills));

    // Prüfen, speichern, zurücksetzen
    const result = entwurfPlan();
    const preview = result.plan ? rules.entwurf(state, result.plan) : state;
    const message = result.fehlt ?? (preview === state
      ? rules.buildProblem(state.faction, state.role, stand.build, stand.training) ?? "Der Entwurf ist so nicht gültig."
      : "Der Entwurf ist gültig. Speichere ihn, um die Punkte festzuschreiben.");
    const status = element("p", locked ? "Im Kampf und ohne Lebenspunkte kannst du nichts festschreiben." : message);
    status.className = "sheet-note entwurf-status";
    status.setAttribute("role", "status");
    const footer = element("div");
    footer.className = "actions entwurf-actions";
    const save = button(footer, "Änderungen speichern", () => {
      if (preview === state) return;
      entwurfLeeren();
      update(preview);
      el("sheet-panel").querySelector(".entwurf-actions button")?.focus();
    }, { disabled: locked || preview === state });
    save.classList.add("primary");
    button(footer, "Zurücksetzen", () => { entwurfLeeren(); rerender(".entwurf-actions button:last-child"); });
    panel.append(sheetSection("Entwurf", status, footer));
  }

  function renderSheet() {
    setPortrait(el("sheet-avatar"), state);
    el("sheet-title").textContent = state.name;
    el("sheet-origin").textContent = klassen.fraktionen[state.faction].name + " · " + rules.title(state);
    const progress = rules.progression(state);
    el("sheet-level").textContent = "Stufe " + progress.level;
    el("sheet-xp-text").textContent = progress.next === null ? progress.xp + " EP" : (progress.xp - progress.floor) + " / " + (progress.next - progress.floor) + " EP";
    sheetMeter("xp", progress.next === null ? 1 : progress.xp - progress.floor, progress.next === null ? 1 : progress.next - progress.floor);
    el("sheet-hp-text").textContent = state.health + " / " + rules.healthLimit(state);
    sheetMeter("hp", state.health, rules.healthLimit(state));
    el("sheet-hp").classList.toggle("sheet-low", state.health <= rules.healthLimit(state) / 4);
    el("sheet-ember-text").textContent = state.ember + " / " + rules.emberLimit(state);
    sheetMeter("ember", state.ember, rules.emberLimit(state));
    document.querySelector(".sheet-meter-ember").hidden = !glutSichtbar();
    document.querySelector(".sheet-vitals").classList.toggle("sheet-vitals-zwei", !glutSichtbar());
    const count = rules.effects(state).filter(effect => effect.art !== "hinweis").length + state.party.length;
    for (const tab of sheetTabs) {
      const control = el("sheet-tab-" + tab);
      control.setAttribute("aria-selected", String(sheet.tab === tab));
      control.tabIndex = sheet.tab === tab ? 0 : -1;
    }
    el("sheet-tab-effekte").textContent = "Effekte" + (count ? " (" + count + ")" : "");
    const panel = el("sheet-panel");
    panel.setAttribute("aria-labelledby", "sheet-tab-" + sheet.tab);
    panel.replaceChildren();
    const offen = entwurfQuellen().length + (rules.faehigkeitInfo(state)?.liste.some((f) => !f.grund) ? 1 : 0);
    el("sheet-tab-aufstieg").textContent = "Aufstieg" + (offen ? " (" + offen + ")" : "");
    ({ stand: renderSheetStand, werte: renderSheetWerte, aufstieg: renderSheetAufstieg, effekte: renderSheetEffekte })[sheet.tab](panel);
  }

  function openSheet(tab = "stand") {
    if (!state) return;
    if (el("inventory-hub").open) el("inventory-hub").close();
    sheet.tab = tab;
    entwurfLeeren();
    renderSheet();
    el("character-sheet").showModal();
    el("sheet-close").focus();
  }

  for (const opener of document.querySelectorAll("[data-sheet-open]")) opener.addEventListener("click", () => openSheet());
  el("sheet-close").addEventListener("click", () => el("character-sheet").close());
  el("character-sheet").addEventListener("click", event => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  sheetTabs.forEach((tab, index) => {
    const control = el("sheet-tab-" + tab);
    control.addEventListener("click", () => {
      sheet.tab = tab;
      renderSheet();
      control.focus();
    });
    control.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      el("sheet-tab-" + sheetTabs[(index + (event.key === "ArrowRight" ? 1 : sheetTabs.length - 1)) % sheetTabs.length]).click();
    });
  });

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
    const armor = Object.values(kit).reduce((sum, id) => sum + (world.gear[id]?.armor ?? 0), 0);
    const worn = rules.equipmentSlots.filter(slot => slot !== "weapon" && kit[slot]).map(slot => slotLabels[slot] + ": " + world.items[kit[slot]]);
    return "Waffe: " + (world.items[kit.weapon] ?? "Eigener Kampfstil") + (worn.length ? " · " + worn.join(" · ") : "") +
      " · Angriff +" + (world.gear[kit.weapon]?.power ?? 0) + " · Eigener Schutz +" + armor;
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
    for (const [slot, title] of rules.equipmentSlots.map(entry => [entry, slotLabels[entry]])) {
      const label = element("label", title);
      const select = element("select");
      select.setAttribute("aria-label", world.companions[member].name + " · " + title);
      select.append(new Option(slot === "weapon" ? "Eigener Kampfstil" : "Leer", ""));
      for (const id of new Set(state.inventory)) {
        if (world.gear[id]?.slot !== rules.slotKinds[slot]) continue;
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
          update(rules.equip(state, id, member, slot));
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

  // Patch 2.6.12: Reisejournal als Zeitleiste, neueste zuerst, mit Wertmarken (EP, Silber, Nahrung, Ruf, Moral).
  const journalMarken = [[/([+−-]?\d+) EP/, "EP"], [/([+−-]?\d+) Silber/, "Silber"], [/([+−-]?\d+) Nahrung/, "Nahrung"],
    [/Ruf[^.]*?([+−-]\d+)/, "Ruf"], [/Moral[^.]*?([+−-]?\d+)/, "Moral"]];
  function journalZeitleiste() {
    const liste = el("journal");
    liste.className = "journal-zeitleiste";
    const eintraege = [...state.journal].reverse();
    liste.replaceChildren(...(eintraege.length ? eintraege : ["Deine Reise beginnt."]).map((text, index) => {
      const li = element("li");
      if (index === 0) li.append(element("small", "Etappe " + etappeJetzt() + " · " + ortJetzt()));
      li.append(element("p", text));
      const marken = journalMarken.map(([muster, name]) => [name, muster.exec(text)?.[1]]).filter(([, wert]) => wert);
      if (marken.length) {
        const zeile = element("span");
        zeile.className = "journal-marken";
        for (const [name, wert] of marken) zeile.append(element("span", wert + " " + name));
        li.append(zeile);
      }
      return li;
    }));
  }
  const ortJetzt = () => state.scene === "weltknoten" ? knoten.get(state.knoten)?.name ?? "" : world.scenes[state.scene]?.place ?? "";

  function aktTitel() {
    const akte = rules.akteInfo(state);
    if (akte && !akte.grund) {
      if (akte.akt4?.offen && !akte.akt4.fertig) return "Akt 4 · " + akte.akt4.titel;
      if (akte.akt4?.fertig) return "Akt 4 abgeschlossen · Armada";
      const z = akte.zweige.find((zweig) => !zweig.fertig);
      return z ? "Akt " + z.akt + " · Schwester-Zweige" : "Fraktions-Spezialisierung wählen";
    }
    const hq = rules.hauptquest(state);
    return hq && !hq.fertig ? "Akt " + hq.akt + " · " + hq.titel : "";
  }
  let questFilter = "active";
  // Patch 2.6.12: Aushänge (Weltaufträge) erscheinen in der Chronik und zählen bei Offen und Erfüllt mit.
  function chronikEintraege() {
    const aushaenge = ["aktiv", "bereit_zur_abgabe", "erledigt"].flatMap((status) => rules.auftraege(state, status).map((a) => ({
      id: a.id, aushang: true, status: status === "erledigt" ? "done" : "active",
      type: "Aushang · " + a.art + (status === "bereit_zur_abgabe" ? " · bereit zur Abgabe in " + (knoten.get(a.ort)?.name ?? a.ort) : ""),
      giver: knoten.get(a.ort)?.name ?? a.ort, title: a.titel, text: a.text, lohn: a.lohn,
      wahlText: a.spiel.lohn.length > 1 ? (a.wahl === 0 ? "Erster Weg gewählt" : "Zweiter Weg gewählt") : "",
    })));
    return [...aushaenge.filter((a) => a.status === "active"), ...rules.questEntries(state), ...aushaenge.filter((a) => a.status !== "active")];
  }
  function renderQuestLog() {
    const entries = chronikEintraege();
    const counts = Object.fromEntries(["active", "done", "failed"].map(status =>
      [status, entries.filter(entry => entry.status === status).length]));
    el("questlog-summary").textContent = "Questlog · " + counts.active + " offen";
    el("quest-clock").textContent = "Reisestand · Etappe " + etappeJetzt();
    // Patch 2.5.0: Bei den Menschen zählt die Etappe, mit Countdown bis Zehnt und Überfallprüfung.
    const etappe = rules.lage(state);
    el("turn-badge").textContent = etappe ? "Etappe " + etappe.etappen + " · Zehnt in " + etappe.naechsterZehnt + " · Überfall in " + etappe.naechsterUeberfall
      : "Etappe " + etappeJetzt();
    const filters = el("quest-filters");
    filters.replaceChildren();
    const offeneAushaenge = entries.filter((e) => e.aushang && e.status === "active").length;
    for (const [id, title] of [["active", "Offen"], ["done", "Erfüllt"], ["failed", "Gescheitert"], ["all", "Alle"]]) {
      const zahl = id === "all" ? entries.length : id === "active" ? offeneAushaenge + "/5" + (counts.active > offeneAushaenge ? " +" + (counts.active - offeneAushaenge) : "") : counts[id];
      const control = button(filters, title + " (" + zahl + ")", () => {
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
      if (quest.aushang) {
        if (quest.lohn) row.append(element("p", "Lohn: " + quest.lohn));
        const marke = element("p", label + (quest.wahlText ? " · " + quest.wahlText : ""));
        marke.className = "quest-status quest-marke-" + quest.status;
        row.append(marke);
        list.append(row);
        continue;
      }
      const status = element("p", label + (quest.status === "active" ? " · Noch " + quest.remaining + (quest.remaining === 1 ? " Schritt" : " Schritte") : ""));
      status.className = "quest-status";
      if (quest.status === "active" && quest.remaining <= 5) status.classList.add("quest-urgent");
      row.append(status);
      if (quest.status === "active") {
        const timer = element("progress");
        timer.max = quest.deadline - quest.started;
        timer.value = quest.remaining;
        timer.setAttribute("aria-label", "Verbleibende Schritte für " + quest.title);
        row.append(timer);
        if (quest.companion && rules.questReady(state, quest.companion)) row.append(element("p", "Ziel erreicht · Vor Fristablauf am Treffpunkt abgeben."));
      }
      if (quest.companion) row.append(element("small", "Abgabe: " + world.companions[quest.companion].place + " oder Wachhof von Eiswacht"));
      if (quest.reason) row.append(element("p", quest.reason));
      if (quest.salary) row.append(element("p", quest.debt ? "Offener Sold: " + quest.debt + " Silber." : "Sold inzwischen bezahlt."));
      list.append(row);
    }
    if (!list.children.length) list.append(element("li", "Keine Einträge in dieser Kategorie."));
  }

  function renderParty() {
    el("party-count").textContent = "Gefährten · " + state.party.length + " / " + rules.partyLimit;
    const vorteile = rules.lagerVorteile(state);
    let vorteilBox = el("party-vorteile");
    if (!vorteilBox) {
      vorteilBox = element("p");
      vorteilBox.id = "party-vorteile";
      vorteilBox.className = "party-vorteile";
      el("party-members").before(vorteilBox);
    }
    vorteilBox.textContent = vorteile.length ? "Gefährten-Vorteile: " + vorteile.map((v) => v.name + " (" + v.bonus + ")").join(" · ") : "";
    vorteilBox.hidden = !vorteile.length;
    const members = el("party-members");
    members.replaceChildren();
    for (const id of state.party) {
      const companion = world.companions[id];
      const row = element("li");
      row.append(element("strong", companion.name + " · " + klassen.grundklassen[companion.klasse].name +
        " · Stufe " + rules.memberLevel(state, id) + (companion.soeldner ? " · Söldner" : "")));
      row.append(element("div", companion.ability + " · " + companionEffect(companion) + " · Einmal pro Kampf"));
      allyCondition(row, id);
      renderMemberEquipment(row, id);
      const debt = state.companionQuests?.[id]?.debt ?? 0;
      if (debt) button(row, "Offenen Sold bezahlen · " + debt + " Silber", () => update(rules.paySalary(state, id)),
        { disabled: Boolean(state.combat) || !state.health || state.silver < debt });
      const relation = rules.relationship(state, id);
      const oath = { none: "", promised: "Versprechen offen", fulfilled: "Versprechen gehalten", broken: "Versprechen gebrochen" };
      const bond = { none: "", romance: "Romanze", friendship: "Enge Freundschaft" };
      if (!companion.soeldner) row.append(element("p", ["Sympathie " + relation.score, oath[relation.oath], bond[relation.bond]].filter(Boolean).join(" · ")));
      if (relation.oath === "promised") row.append(element("p", world.recruitmentQuests[id].text));
      const labels = { talk: "Am Rastplatz sprechen", gift: "Geschenk annehmen", romance: "Über Gefühle sprechen", friendship: "Freundschaft vertiefen" };
      for (const action of rules.bondActions(state, id)) {
        button(row, labels[action], () => update(rules.bondWith(state, id, action)));
      }
      if ((state.scene === "watch-yard" || rules.storageSite(state)) && !state.combat) {
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
    steppenreiter: ["mann-01", 1], grenzbogner: ["frau-01", 2], flammenknecht: ["mann-01", 2], feldscherin: ["frau-01", 0],
  };
  const volkPortraits = { menschen: "mann-01", elfen: "mann-02", zwerge: "mann-03", orks: "mann-04", untote: "mann-06" };
  // Begleiter ohne eigenes Porträt (z. B. neue Söldner oder Gesandte) bekommen das Grundporträt ihres Volkes.
  const companionPortrait = (member) => companionPortraits[member] ??
    [volkPortraits[world.companions[member]?.volk] ?? "mann-01", 0];

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
      const [id, variant] = companionPortrait(member);
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
    const ally = event.ally === "hero" || !event.ally ? previous.name : world.companions[event.ally].name;
    if (event.kind === "retaliate") return "Gegenangriff auf " + ally + " · " + (event.value ? "−" + event.value + " LP" : "Abgewehrt");
    if (event.kind === "heal") return name + " heilt " + ally + ": +" + event.value + " LP";
    if (event.kind === "revive") return ally + " wird wiederbelebt: +" + event.value + " LP";
    if (event.kind === "cleanse") return ally + " wird von einem Statuseffekt befreit.";
    if (event.kind === "afflict") return ally + " leidet unter " + world.ailments[event.effect].name + ".";
    if (event.kind === "status") return ally + " · Statusschaden: −" + event.value + " LP";
    if (event.kind === "skip") return name + " ist verwirrt und setzt aus.";
    if (event.kind === "cover") return name + " sichert die Gruppe.";
    const target = rules.targets(previous).find(enemy => enemy.id === event.target)?.name ?? "Gegner";
    return name + " trifft " + target + ": −" + event.value + " LP";
  }


  // ---- Kampf-Paket (Henry, 20. 11. 2026): 2D-Arena, Bühnen nach Region, Treffer-Feedback ----
  const KAMPFANIM = rules.systeme.daten.v2619kampf.animationen;
  const KAMPFBUEHNEN = rules.systeme.daten.v2619kampf.buehnen;
  // Headless-Simulator (Playwright setzt navigator.webdriver): keine Wartezeiten, außer eine Prüfung schaltet sie ausdrücklich an.
  const kampfSchnell = () => {
    if (!KAMPFANIM.kampf_sequenz_timing.fast_mode_in_simulator || !navigator.webdriver) return false;
    try { return localStorage.getItem("aschenkrone.animationen") !== "an"; } catch { return true; }
  };
  const klassenSilhouette = { krieger: "krieger_blutritter", waechter: "krieger_blutritter", skalde: "krieger_blutritter",
    spaeher: "schurke_spaeher", schurke: "schurke_spaeher", pulvermeister: "schurke_spaeher",
    magier: "pyromant_kleriker", heiler: "pyromant_kleriker", feldscher: "pyromant_kleriker" };
  const klassenAngriff = { spaeher: ["fern", "pfeil_bolzen"], pulvermeister: ["fern", "pfeil_bolzen"], magier: ["fern", "runen_blitz"],
    heiler: ["fern", "runen_blitz"], feldscher: ["fern", "runen_blitz"] };
  const bestienMuster = /wolf|wölfe|keiler|krähe|bär|troll|käfer|greif|krabb|hai|wyrm|wurm|mammut|krake|rochen|salamander|jäger der|vurm|drache|viper|ratte|schnapper|schleicher|kriecher|hauer|fresser|leviathan|koloss|schrecken|schlinger|weberin|irrglut|mutter der tiefen|bestie|ursa|hyäne|graufang|schluchtenjäger/i;
  const fernkampfMuster = /schütze|pulver|armbrust|hexer|zelot|ketzer|priester|thorvald|alchemist|quacksalber|spione|skalde/i;
  function gegnerFigur(enemy, combatId) {
    const creature = world.creatures[combatId];
    const thorvald = /thorvald/.test(combatId);
    const name = enemy.name + " " + (world.fights[combatId]?.name ?? creature?.name ?? "");
    const typ = thorvald && enemy.id === 0 ? "boss_thorvald" : bestienMuster.test(name) ? "bestie" :
      /zelot|ketzer|priester|hexer|pilger|kult|draugr|wiedergänger|geist|schatten|gebundene/i.test(name) ? "pyromant_kleriker" :
      /schütze|späher|spione|wilderer|jäger/i.test(name) ? "schurke_spaeher" : "deserteur_pluenderer";
    const skala = typ === "boss_thorvald" ? kampfArena.daten().arena.klassen_und_gegner_silhouetten.find((x) => x.typ === "boss_thorvald").skalierung :
      ["anfuehrer", "endgegner"].includes(enemy.rang) ? 1.18 : 1;
    return { id: enemy.id, name: enemy.name, lp: enemy.health, max: enemy.max, typ, skala,
      bild: enemy.id === 0 && creature?.image ? creature.image : null, akzent: "#78716c",
      angriff: typ === "bestie" ? "nah" : fernkampfMuster.test(name) ? "fern" : "nah",
      projektil: /schütze|pulver|armbrust|spione/i.test(name) ? "pfeil_bolzen" : "glut_kugel" };
  }
  // Bühne nach Region (Henrys Katalog, auf die Orte des Spiels übertragen).
  function kampfBuehne(s) {
    const id = s.combat?.id ?? "";
    if (/thorvald/.test(id)) return { buehne: KAMPFBUEHNEN.boss_sonderbeleuchtung.erzpriester_thorvald.ueberschreibe_buehne, aura: true };
    if (/aschenschatten|runenfresser|mutterdertiefen|stollenkriecher/.test(id) || s.akte?.akt4?.siegelKampf) return { buehne: "altes_reich_ruinen" };
    const hier = rules.aktuellerKnoten(s) ?? s.knoten;
    const k = hier ? knoten.get(hier) : null;
    if (k) {
      const nordFraktionen = ["hof", "erinnernde", "faeulnisbrut"];
      if (nordFraktionen.includes(k.fraktion) || ["eiswacht", "nordwacht"].includes(k.id) || /pass/.test(k.typ ?? "")) return { buehne: "eispass_und_norden" };
      if (k.fraktion === "orden") return { buehne: "glutberg_und_aschland" };
      if (k.typ === "hafenstadt" || k.fraktion === "haefen" || k.hatHafen) return { buehne: "salzklippen_und_kueste" };
      if (["dornenklingen", "hueter", "schattenbluete"].includes(k.fraktion) || /wald|forst|grenz/i.test(k.name)) return { buehne: "duesterwald_und_grenzhaus" };
      return { buehne: KAMPFBUEHNEN.standard_buehne };
    }
    const ort = (world.scenes[s.scene]?.place ?? "") + " " + (world.fights[id]?.name ?? "");
    if (/pass|eis|frost|schnee|nord/i.test(ort)) return { buehne: "eispass_und_norden" };
    if (/glut|asche|kloster|flamme|kreuzgang/i.test(ort)) return { buehne: "glutberg_und_aschland" };
    if (/hafen|küste|kai|riff|wrack|bucht|see|insel/i.test(ort)) return { buehne: "salzklippen_und_kueste" };
    if (/ruine|tor|gewölbe|tiefe|stollen|runen/i.test(ort)) return { buehne: "altes_reich_ruinen" };
    if (/wald|forst|grenz|moor|dorn/i.test(ort)) return { buehne: "duesterwald_und_grenzhaus" };
    return { buehne: KAMPFBUEHNEN.standard_buehne };
  }
  function arenaBeschreibung(s) {
    const gruppe = [{ id: "hero", name: s.name, typ: klassenSilhouette[s.role] ?? "krieger_blutritter", lp: s.health, max: rules.healthLimit(s) },
      ...s.party.map((id) => ({ id, name: world.companions[id].name, typ: klassenSilhouette[world.companions[id].klasse] ?? "krieger_blutritter",
        lp: rules.memberVitals(s, id).health, max: rules.memberVitals(s, id).max ?? 1 }))];
    return { ...kampfBuehne(s), gruppe, gegner: rules.targets(s).map((enemy) => gegnerFigur(enemy, s.combat.id)) };
  }
  // Ein Kampfereignis in eine Arena-Aktion übersetzen.
  // lp: laufender LP-Stand je Arena-Figur während der Runde (Gegner „gegner-0“, Gruppe „hero“/Gefährten-ID).
  function arenaAktion(event, previous, lp) {
    const vorherFeinde = rules.targets(previous);
    if (event.kind === "hit") {
      const rolle = event.actor === "hero" ? previous.role : world.companions[event.actor]?.klasse;
      const [art, proj] = event.glut ? ["fern", "glut_kugel"] : klassenAngriff[rolle] ?? ["nah"];
      const key = "gegner-" + event.target;
      lp[key] = (lp[key] ?? 0) - (event.value ?? 0);
      const besiegt = lp[key] <= 0;
      return { von: ["summon", "dot"].includes(event.actor) ? null : event.actor, ziel: "gegner-" + event.target, art: event.actor === "dot" ? "keine" : art,
        projektil: proj, krit: event.krit, besiegt, effekt: event.glut ? "glut_stoss" : event.krit ? "blutrausch_klaue" : "hieb_stahl",
        text: { art: event.krit ? "kritischer_treffer" : "normaler_treffer", schaden: event.value } };
    }
    if (event.kind === "retaliate") {
      const feind = gegnerFigur(vorherFeinde.find((f) => f.id === event.actor) ?? vorherFeinde[0], previous.combat.id);
      const ally = event.ally ?? "hero";
      lp[ally] = (lp[ally] ?? 0) - (event.value ?? 0);
      const aktion = { von: "gegner-" + event.actor, ziel: ally, art: feind.angriff, projektil: feind.projektil, besiegt: lp[ally] <= 0 };
      if (event.ausgewichen) return { ...aktion, ausweichen: true, text: { art: "ausgewichen" } };
      if (event.schild) return { ...aktion, effekt: "schild_block", text: event.value ? { art: "normaler_treffer", schaden: event.value } : { art: "glutschild_block", rest: event.rest } };
      if (!event.value) return { ...aktion, effekt: "schild_block", text: { art: "glutschild_block", rest: 0 } };
      return { ...aktion, effekt: feind.typ === "bestie" ? "blutrausch_klaue" : "hieb_stahl", text: { art: "normaler_treffer", schaden: event.value } };
    }
    if (event.kind === "heal" || event.kind === "revive") lp[event.ally ?? "hero"] = (lp[event.ally ?? "hero"] ?? 0) + (event.value ?? 0);
    if (event.kind === "status") lp[event.ally] = (lp[event.ally] ?? 0) - (event.value ?? 0);
    if (event.kind === "heal" || event.kind === "revive") return { von: event.actor === "summon" ? null : event.actor, ziel: event.ally ?? "hero", art: "heilung", text: { art: "heilung", wert: event.value } };
    if (event.kind === "status") return { ziel: event.ally, art: "keine", text: { art: "normaler_treffer", schaden: event.value } };
    if (event.kind === "cover") return { von: event.actor, art: "deckung" };
    return null;
  }
  // LP-Balken mit Nachzieh-Effekt: der verlorene Teil leuchtet gelb nach und schrumpft verzögert.
  function lpNachziehen(meter, vorher, nachher) {
    const n = KAMPFANIM.visuelle_effekte.lp_balken_nachzieh_effekt;
    if (!n.aktiv || !meter || nachher >= vorher || !meter.max) return;
    const huelle = meter.parentElement;
    huelle.classList.add("lp-huelle");
    const geist = element("span");
    geist.className = "lp-nachzug";
    geist.setAttribute("aria-hidden", "true");
    geist.style.background = n.verzoegerungs_balken_farbe;
    geist.style.left = (meter.offsetLeft + meter.offsetWidth * Math.max(0, nachher) / meter.max) + "px";
    geist.style.top = meter.offsetTop + "px";
    geist.style.height = meter.offsetHeight + "px";
    geist.style.width = (meter.offsetWidth * (vorher - Math.max(0, nachher)) / meter.max) + "px";
    geist.style.transition = "width " + n.transition_ms + "ms ease-in " + n.verzoegerung_ms + "ms";
    huelle.append(geist);
    requestAnimationFrame(() => requestAnimationFrame(() => { geist.style.width = "0px"; }));
    setTimeout(() => geist.remove(), n.verzoegerung_ms + n.transition_ms + 80);
  }
  // Schwebender Kampftext über einer Karte (gleiche Vorlagen wie in der Arena).
  function kartenText(karte, text) {
    const stil = text && KAMPFANIM.visuelle_effekte.floating_combat_text.stile[text.art];
    if (!karte || !stil) return null;
    const marker = element("span", stil.vorlage.replace("{schaden}", text.schaden).replace("{wert}", text.wert).replace("{rest}", text.rest));
    marker.className = "hit-value fct-" + text.art;
    marker.style.color = stil.farbe;
    marker.style.setProperty("--fct-skala", stil.skalierung ?? 1);
    marker.setAttribute("aria-hidden", "true");
    karte.append(marker);
    return marker;
  }

  function renderBattle(content) {
    const battlefield = element("section");
    battlefield.className = "battlefield";
    battlefield.setAttribute("aria-label", "Kampfübersicht");
    battlefield.style.setProperty("--battle-step", battleStepMs + "ms");
    const ausfall = KAMPFANIM.visuelle_effekte.karten_ausfallschritt;
    const reaktion = KAMPFANIM.visuelle_effekte.treffer_reaktion;
    battlefield.style.setProperty("--ausfall", ausfall.spieler_angriff_translate_y_px + "px");
    battlefield.style.setProperty("--ausfall-gegner", ausfall.gegner_angriff_translate_y_px + "px");
    battlefield.style.setProperty("--ausfall-dauer", ausfall.dauer_ms + "ms");
    battlefield.style.setProperty("--treffer-shake", reaktion.ziel_karte_shake_px + "px");
    battlefield.style.setProperty("--treffer-flash", reaktion.ziel_karte_flash_farbe);
    const header = element("div");
    header.className = "battle-header";
    header.append(element("strong", "Runde " + (state.combat.round + 1)), element("span", "Dein Zug"));
    const sequence = element("ol");
    sequence.className = "battle-sequence";
    sequence.setAttribute("aria-label", "Aktionsfolge einer Runde");
    for (const [id, name] of [["hero", state.name], ...state.party.filter(id => rules.memberVitals(state, id).health > 0).map(id => [id, world.companions[id].name]), ["enemies", "Gegner"]]) {
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
    allyCondition(hero, "hero");
    formation.append(hero);
    for (const id of state.party) {
      const companion = world.companions[id];
      const card = fighterCard(companion.name, klassen.grundklassen[companion.klasse].name, id);
      card.dataset.actor = id;
      allyCondition(card, id);
      const used = (state.combat.supportUsed ?? []).includes(id);
      const badge = element("span", !rules.memberVitals(state, id).health ? "Kampfunfähig" : used ? "✓ Verbraucht" : "✦ Bereit");
      badge.className = "ability-badge" + (used ? " is-used" : "");
      badge.title = companion.ability;
      badge.setAttribute("aria-label", companion.ability + (!rules.memberVitals(state, id).health ? " · Kampfunfähig" : used ? " · Verbraucht" : " · Bereit"));
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
    const arena = kampfArena.bauen(arenaBeschreibung(state));
    battlefield.append(arena, header, sequence, allyPicker("Kampf"), group, opponents, summary, announcement, log);
    content.append(battlefield);
  }

  async function battleAction(action, item) {
    if (animating || !state.combat) return;
    const previous = state;
    const events = [];
    const next = rules.strike(previous, action, Math.random, item, enemyTarget, events, selectedAlly());
    if (next === previous) return;
    lastBattleMessages = events.map(event => battleMessage(event, previous));
    // Kampf-Paket: Die Kampfanimation läuft immer (auch bei reduzierter Bewegung, wie der Marsch), nur der Headless-Simulator überspringt sie.
    if (!events.length || kampfSchnell()) {
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
    const takt = KAMPFANIM.kampf_sequenz_timing;
    const arena = panel.querySelector(".kampf-arena");
    const laufendeLp = Object.fromEntries([...rules.targets(previous).map((f) => ["gegner-" + f.id, f.health]),
      ["hero", previous.health], ...previous.party.map((id) => [id, rules.memberVitals(previous, id).health])]);
    try {
      for (const event of events) {
        const retaliates = ["retaliate", "afflict"].includes(event.kind);
        const actor = panel.querySelector(retaliates ? '[data-enemy="' + event.actor + '"]' : '[data-actor="' + event.actor + '"]');
        const target = event.ally ? panel.querySelector('[data-actor="' + event.ally + '"]') : event.kind === "heal" ? panel.querySelector('[data-actor="hero"]') :
          panel.querySelector('[data-enemy="' + event.target + '"]');
        for (const chip of panel.querySelectorAll("[data-turn-actor]")) {
          const current = chip.dataset.turnActor === (retaliates ? "enemies" : event.actor);
          chip.classList.toggle("is-current", current);
          if (current) chip.setAttribute("aria-current", "step"); else chip.removeAttribute("aria-current");
        }
        panel.querySelector(".battle-header span").textContent = retaliates ? "Gegnerzug" :
          actorName(event.actor, previous) + " handelt";
        panel.querySelector(".battle-announcement").textContent = battleMessage(event, previous);
        const aktion = arenaAktion(event, previous, laufendeLp);
        // Taktung nach Henrys Vorgabe: Held 420 ms, Gefährten 360 ms, Gegnerphase 400 ms.
        const pause = retaliates ? takt.gegner_phase_pause_ms : event.actor === "hero" ? takt.spieler_aktion_dauer_ms : takt.gefaehrten_aktion_pause_ms;
        actor?.classList.add("is-acting");
        actor?.classList.add(retaliates ? "enemy-lunge" : event.kind === "cover" ? "fighter-cover" : "fighter-lunge");
        const arenaLauf = aktion ? kampfArena.abspielen(arena, aktion) : Promise.resolve();
        await arenaLauf;
        let marker;
        if (target && (event.value > 0 || aktion?.text)) {
          const healing = ["heal", "revive"].includes(event.kind);
          if (!healing && event.value > 0) target.classList.add("fighter-hit");
          if (aktion?.ausweichen) target.classList.add("fighter-dodge");
          marker = kartenText(target, aktion?.text ?? { art: healing ? "heilung" : "normaler_treffer", schaden: event.value, wert: event.value });
          const meter = target.querySelector("progress");
          if (meter && event.value > 0) {
            const vorher = meter.value;
            meter.value = Math.min(meter.max, Math.max(0, meter.value + (healing ? event.value : -event.value)));
            if (!healing) lpNachziehen(meter, vorher, meter.value);
          }
        }
        await new Promise(resolve => setTimeout(resolve, pause));
        actor?.classList.remove("is-acting", "enemy-lunge", "fighter-cover", "fighter-lunge");
        target?.classList.remove("fighter-hit", "fighter-dodge");
        marker?.remove();
      }
      // Gefallene Gegner zerfallen zu Asche, bevor das Bild neu aufgebaut wird.
      if (arena?.querySelector(".rig-collapse-ash:not(.war-besiegt)")) await new Promise(resolve => setTimeout(resolve,
        kampfArena.daten().arena["2d_modell_generator"].animationen.besiegt.dauer_ms));
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

  // Szenentext mit den Varianten nach Spielstand (auch für das Gesprächsfenster).
  function szenenText() {
    let sceneText = world.scenes[state.scene].text;
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
    return sceneText;
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
      if (combat.feinde[0].lp > 0 && (combat.round + 1) % (special.intervall ?? 2) === 0) content.append(element("p", special.warning + " Deckung schützt vor dem Zusatzeffekt."));
      if (combat.bleeding > 0) content.append(element("p", "Blutung · " + combat.bleeding + " Runden"));
      // Eine Aktion pro Runde: Grundangriff oder eine freigeschaltete Fähigkeit.
      const canBoost = values.ressource >= 2;
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
        const node = button(actions, label, () => battleAction(f.id + (boostable ? "+" : "")), { disabled: Boolean(reason) || Boolean((f.regel.heilung || f.regel.hot) && !rules.allies(state).find(ally => ally.id === selectedAlly()).health) });
        if (node) node.title = f.wirkung;
        if (node && f.id === "f1") node.dataset.battleAction = "spear";
      }
      actions.append(boost);
      const abilities = world.classes[rules.profile(state.faction, state.role)];
      // Patch 2.5.3: Kronreich und Freie Häfen haben keine Glutgabe.
      for (const [id, label, shift] of [
        ...(rules.glutgabe(state) ? [["ember", "Glutgabe · " + abilities.attack.name, 2], ["restore", "Glutgabe · " + abilities.restore.name, -2]] : []),
        ["guard", "Deckung und Sammlung", 0], ["flee", "Fliehen", 0],
      ]) {
        const risk = shift && Math.abs(state.balance + shift) >= 4;
        const cost = shift ? " · 1 Glut" : "";
        const control = button(actions, label + cost + (risk ? " · Rückschlag" : ""),
          () => battleAction(id), { disabled: Boolean(shift && !state.ember) || (id === "restore" && abilities.restore.heal && !rules.allies(state).find(ally => ally.id === selectedAlly()).health) });
        control.dataset.battleAction = id;
      }
      button(actions, "Gegenstand", () => openHub());
      if (rules.canEvade(state)) {
        const evade = button(actions, "Dem Hinterhalt ausweichen · ohne Kampf-EP", () => battleAction("evade"));
        evade.dataset.battleAction = "evade";
      }
      rules.belt(state).forEach((id, index) => {
        if (!id) return;
        button(actions, "Gürtel · " + world.items[id] + " · ohne Aktion", () => quickUse(index),
          { disabled: !rules.canUse(state, id, selectedAlly()) });
      });
      if (world.fights[combat.id].regeneration) {
        button(actions, "Mit Fackel angreifen · schwächt den Gegenangriff und stoppt Regeneration", () => battleAction("torch"));
      }
    } else {
      enemyTarget = null;
      if (state.scene === "weltknoten") {
        renderWeltHub(content, actions);
        return;
      }
      const sceneText = szenenText();
      content.append(element("p", sceneText));
      if (state.scene === "weltende" && state.niederlage) {
        const reason = element("p", rules.niederlagen[state.niederlage]);
        reason.className = "chapter-result";
        content.append(reason, weltLeistenBlock());
      }
      if (state.scene === "skarn-gate" && state.marks.includes("pass-gesperrt")) {
        content.append(element("p", "Von der Ziegenstiege siehst du unten die Schranke. Ins Kronreich gelangt die Bergwacht derzeit nur über den schmalen Umweg."));
      }
      if (state.scene === "skarn-aftermath") {
        content.append(element("p", state.marks.includes("runen-geschuetzt")
          ? "Das Runentor bleibt als Versorgungsweg erhalten."
          : "Das Tor ist eingestürzt. Die Bewohner müssen ihre Vorräte nun über den unteren Steig tragen."));
      }
      if (state.scene === "supply-post") button(content, "Handel in der Zeugkammer öffnen", () => openHub("trade"));
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
      // Gesprächsszenen öffnen beim Betreten das Gesprächsfenster; die Wahlen bleiben auch hier im Hauptbildschirm.
      const sprecher = npcs.fuerSzene(state.scene, scene);
      if (sprecher && choices.length) {
        const start = button(actions, "Gespräch mit " + npcPerson(sprecher).name + " öffnen", () => szenenGespraech());
        start.classList.add("primary", "npc-start");
        if (gespraech.auto !== state.scene && !gespraech.laeuft) {
          gespraech.auto = state.scene;
          queueMicrotask(() => { if (state && !state.combat && npcs.fuerSzene(state.scene, world.scenes[state.scene])) szenenGespraech(); });
        }
      } else if (!gespraech.laeuft) gespraech.auto = null;
      for (const choice of choices) {
        // Grundwert-Proben (Patch 2.5.4) nennen den Wert schon in eckigen Klammern im Text.
        const attribute = choice.check && klassen.fertigkeiten[choice.check[0]] ? klassen.fertigkeiten[choice.check[0]].name : "";
        const risk = choice.emberRescue && state.balance <= -2 ? " · Rückschlag" : "";
        const wer = !sprecher && npcs.fuerWahl(state.scene, choice);
        const knopf = button(actions, choice.label + (attribute ? " · Probe auf " + attribute : "") + risk,
          wer ? () => wahlGespraech(wer, choice.id) : () => update(rules.choose(state, choice.id)), { story: true });
        if (choice.hint) knopf.title = choice.hint;
      }
      // Patch 2.5.4: Niederlage. Wegpunkt vor der Schlacht laden (nur wenn gesichert) oder die Chronik beenden.
      if (state.scene === "defeat") {
        const wegpunkt = rules.permadeath(state) ? null : vorKampfStand();
        if (rules.permadeath(state)) {
          const ende = element("p", "Hardcore · Aschenchronik: Deine Geschichte endet hier unwiderruflich. Dein Name steht in der Ruhmeshalle.");
          ende.className = "welt-alarm";
          actions.append(ende);
        }
        if (wegpunkt) {
          const laden = button(actions, "Letzten Wegpunkt vor der Schlacht laden", () => {
            const stand = vorKampfStand();
            if (stand) showPlay(stand);
          }, { story: true });
          laden.title = "Kehrt zum Moment unmittelbar vor dem Gefecht zurück.";
        }
        const ende = button(actions, "Den Run beenden (Neues Spiel)", () => {
          try {
            localStorage.removeItem(key);
            localStorage.removeItem(vorKampfKey);
          } catch {
            // Ohne lokalen Speicher gibt es nichts zu löschen.
          }
          state = null;
          showHome("Diese Chronik ist beendet. Beginne ein neues Spiel.");
        }, { story: true });
        ende.title = "Akzeptiere das Ende dieser Chronik.";
      }
      renderCandidates(content);
      if (rules.weltOffen(state)) {
        const ort = knoten.get(rules.aktuellerKnoten(state));
        button(actions, "Stadt-Hub von " + ort.name + " öffnen · Weltreise", () => {
          welt.tab = "aufbruch";
          update(rules.betreteWelt(state));
        });
      }
      if (!choices.length) button(actions, "Zum Hauptmenü", () => showHome());
    }
  }

  // ---- Gesprächsfenster (NPC-Dialog, 19. 11. 2026) ----
  // Gespräche, Auftragsannahmen und Hauptquest-Schritte laufen in einem eigenen Pergament-Fenster. Beim Wechsel zwischen
  // Gesprächsschritten tauscht das Fenster nur Text und Antworten aus, es rollt nicht neu auf. Personen: spiel/npcs.js.
  const gespraech = { auto: null, laeuft: false, art: null, npc: null, wahlNpc: null, kopf: null };
  const portraitStatus = new Map();
  const kapuze = '<svg viewBox="0 0 100 120" role="presentation" focusable="false">' +
    '<defs><radialGradient id="npc-glut" cx="50%" cy="38%" r="60%"><stop offset="0" stop-color="#5a3a24"/><stop offset="1" stop-color="#1d1813"/></radialGradient></defs>' +
    '<rect width="100" height="120" fill="url(#npc-glut)"/>' +
    '<path d="M50 14c-17 0-29 15-29 34 0 9 2 16 5 21-9 6-16 17-19 31-1 6 0 20 0 20h86s1-14 0-20c-3-14-10-25-19-31 3-5 5-12 5-21 0-19-12-34-29-34z" fill="#0f0c09" stroke="#8d6947" stroke-width="1.5"/>' +
    '<path d="M50 30c-10 0-17 9-17 20 0 9 5 16 11 19h12c6-3 11-10 11-19 0-11-7-20-17-20z" fill="#050403"/>' +
    '<circle cx="44" cy="50" r="1.6" fill="#d4a857" opacity=".75"/><circle cx="56" cy="50" r="1.6" fill="#d4a857" opacity=".75"/>' +
    '<path d="M30 92l20 10 20-10" fill="none" stroke="#8d6947" stroke-width="1.5" opacity=".7"/></svg>';

  const npcPerson = (id, extra = null) => ({ name: "Unbekannt", titel: "", fraktion: null, ...(npcs.get(id) ?? {}), ...(extra ?? {}) });

  // Kopfzeile: Fraktion mit Ruf-Rang der Menschen (Fremder, Schutzherr, Geächtet …) und örtliches Ansehen.
  function npcStand(person) {
    const teile = [];
    const fraktion = person.fraktion && klassen.fraktionen[person.fraktion];
    if (fraktion) {
      if (rules.lage(state) && rules.systeme.istMensch(person.fraktion)) {
        const wert = rules.systeme.ruf(state, person.fraktion);
        teile.push([fraktion.name + " · " + rules.systeme.rufRang(wert).name + " (" + signed(wert) + ")",
          wert >= 20 ? "gut" : wert <= -25 ? "schlecht" : ""]);
      } else teile.push([fraktion.name + (person.fraktion === state.faction ? " · eigene Fraktion" : ""), ""]);
    }
    if (person.ruf && world.factions[person.ruf]) {
      const wert = rules.reputation(state, person.ruf);
      teile.push([world.factions[person.ruf] + " · " + (wert >= 25 ? "Wohlgesinnt" : wert <= -25 ? "Feindselig" : "Neutral") +
        " (" + signed(wert) + ")", wert >= 25 ? "gut" : wert <= -25 ? "schlecht" : ""]);
    }
    if (!teile.length) teile.push(["Keiner Fraktion verpflichtet", ""]);
    return teile;
  }

  // Porträt: erst der Platzhalter, das Bild ersetzt ihn erst, wenn es wirklich geladen ist (kein kaputtes Bildsymbol).
  function npcPortrait(id, quelle) {
    const box = el("npc-portrait");
    const url = npcs.portrait(id, quelle) ?? "";
    if (box.dataset.url === url && box.firstChild) return;
    box.dataset.url = url;
    // Porträt-Paket: Hauptfiguren und Pool-Figuren zeigen ihr Porträt aus assets/portraits/ oder als SVG.
    const eintrag = state && npcPortraets.fuerNpc(id, state.laufSeed, state.knoten ?? "");
    delete box.dataset.portraet;
    if (eintrag) {
      npcPortraets.zeigen(box, eintrag);
      if (url && portraitStatus.get(url) !== "fehlt") {
        const eigenes = new Image();
        eigenes.onload = () => { portraitStatus.set(url, "ok"); if (box.dataset.url === url) { delete box.dataset.portraet; box.replaceChildren(eigenes); } };
        eigenes.onerror = () => portraitStatus.set(url, "fehlt");
        eigenes.alt = "";
        eigenes.src = url;
      }
      return;
    }
    box.innerHTML = kapuze;
    if (!url || portraitStatus.get(url) === "fehlt") return;
    const bild = new Image();
    bild.alt = "";
    bild.decoding = "async";
    bild.onload = () => {
      portraitStatus.set(url, "ok");
      if (box.dataset.url === url) box.replaceChildren(bild);
    };
    bild.onerror = () => portraitStatus.set(url, "fehlt");
    bild.src = url;
  }

  // Rede in „…“ bleibt gerade, Erzähltext dazwischen wird zur kursiven Regieanweisung.
  function redeAbsatz({ text, art = "" }) {
    const absatz = element("p");
    if (art) absatz.className = "npc-" + art;
    const teile = String(text).split(/(„[^“]*“)/);
    if (art === "regie" || teile.length === 1) absatz.textContent = text;
    else for (const teil of teile.filter(Boolean)) {
      if (teil.startsWith("„")) absatz.append(teil);
      else {
        const regie = element("em", teil);
        regie.className = "npc-regie";
        absatz.append(regie);
      }
    }
    return absatz;
  }

  // Patch 2.6.7: Gesprächsaufbau der Menschen: Regieanweisung nach Rolle, Begrüßung nach Ruf, Kern des Gesprächs,
  // gelegentlicher Einwurf eines Gefährten, bis zu zwei Fragen zur Lage (schließen das Gespräch nicht) und die Antworten.
  const dialogDaten = () => rules.systeme.daten.v260.ASCHENKRONE_V267_DYNAMIC_NPC_DIALOGUES.dialogue_assembly_pipeline;
  const waehle = (liste, schluessel) => liste[[...String(schluessel)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % liste.length];
  function npcRolle(person) {
    const t = (person.titel ?? "") + " " + (person.name ?? "");
    if (/Schmied/i.test(t)) return "SCHMIED";
    if (/Hauptmann|Hauptfrau|Wache|Wacht|Kommandant|Jarl|Feldherr/i.test(t)) return "HAUPTMANN_WACHE";
    if (/Kontor|Verwalter|Händler|Quartiermeister|Zoll|Schreiber/i.test(t)) return "KONTOR_VERWALTER";
    if (/Priester|Gelehrt|Bruder|Schwester|Abt|Skalde|Mönch|Ordens/i.test(t)) return "PRIESTER_GELEHRTER";
    return null;
  }
  function npcStufe(person) {
    if (state.marks.includes("bannerjarl")) return "BANNERJARL";
    const fraktion = person.fraktion && rules.systeme.istMensch(person.fraktion) ? person.fraktion : state.faction;
    const wert = rules.systeme.ruf(state, fraktion);
    return wert <= -25 ? "GEAECHTET" : wert >= 20 ? "SCHUTZHERR" : "FREMDER";
  }
  function aktSchluessel() {
    const akte = rules.akteInfo(state);
    if (!akte || akte.grund) return "ACT_1";
    return akte.akt4?.offen ? "ACT_4" : "ACT_2_3";
  }
  function stadtLage() {
    const ort = knoten.get(state.knoten);
    const lage = rules.lage(state);
    return "„" + (ort?.name ?? "Die Stadt") + " hält sich" + (lage ? ", die Moral auf den Straßen steht bei " + rules.systeme.moral(state) : "") +
      ". Aber jede Etappe ohne Nachschub macht die Leute dünner und die Wachen nervöser.“";
  }
  const einwurfChance = () => (dialogDaten().companion_interjections.trigger_chance_pct / 100) *
    ({ "HÄUFIG": 1.5, NORMAL: 1, SELTEN: 0.5 }[window.aschenkroneOptionen?.einwuerfe] ?? 1);
  function dialogAnreichern(inhalt, neu) {
    const d = dialogDaten();
    const person = npcPerson(inhalt.npc, inhalt.person);
    const vorne = [];
    const hinten = [];
    if (neu) {
      gespraech.lore = { npc: inhalt.npc, gefragt: [] };
      const rolle = npcRolle(person);
      if (rolle) vorne.push({ text: waehle(d.stage_directions_by_npc_role[rolle], inhalt.npc + state.etappen), art: "regie" });
      vorne.push({ text: waehle(d.greetings_by_reputation_tier[npcStufe(person)], inhalt.npc + (state.etappen ?? 0)) });
      const begleiter = state.party.map((id) => world.companions[id]).find(Boolean);
      if (begleiter && Math.random() < einwurfChance()) {
        const typ = ["krieger", "waechter"].includes(begleiter.klasse) ? "KRIEGER_WAECHTER"
          : ["spaeher", "schurke"].includes(begleiter.klasse) ? "SPAEHER_SCHURKE" : "MAGIER_HEILER";
        hinten.push({ text: begleiter.name + " raunt dir zu: " + d.companion_interjections.templates_by_companion_archetype[typ], art: "einwurf" });
      }
    }
    const absaetze = [...vorne, ...inhalt.absaetze, ...hinten];
    const lore = gespraech.lore?.npc === inhalt.npc ? gespraech.lore : (gespraech.lore = { npc: inhalt.npc, gefragt: [] });
    const fragen = d.optional_lore_questions.topics_by_act[aktSchluessel()] ?? [];
    const loreOptionen = lore.gefragt.length >= d.optional_lore_questions.max_questions_per_dialogue ? [] :
      fragen.filter((f) => !lore.gefragt.includes(f.question)).map((f) => ({
        label: f.question, badges: [["Frage", ""]], aktion: () => {
          lore.gefragt.push(f.question);
          const antwort = f.answer_uses_city_state ? stadtLage() : waehle(f.answer_pool, inhalt.npc);
          gespraechZeigen({ ...inhalt, absaetze: [...absaetze, { text: f.question, art: "frage" }, { text: antwort, art: "antwort" }], weiter: true });
        } }));
    return { ...inhalt, absaetze, optionen: [...loreOptionen, ...inhalt.optionen] };
  }

  // inhalt: { npc, person?, quelle?, ort, absaetze: [{ text, art }], optionen: [{ label, badges, hinweis, disabled, aktion }] }
  function gespraechZeigen(inhalt) {
    const dialog = el("npc-dialog");
    const offen = dialog.open;
    const neuePerson = gespraech.npc !== inhalt.npc;
    if (rules.lage(state) && inhalt.npc && !inhalt.ohneZusatz) inhalt = dialogAnreichern(inhalt, !inhalt.weiter && (!offen || neuePerson));
    const person = npcPerson(inhalt.npc, inhalt.person);
    gespraech.npc = inhalt.npc;
    gespraech.kopf = { npc: inhalt.npc, person: inhalt.person, quelle: inhalt.quelle, ort: inhalt.ort };
    el("npc-ort").textContent = inhalt.ort ?? "";
    el("npc-name").textContent = person.name;
    el("npc-titel").textContent = person.titel ?? "";
    el("npc-titel").hidden = !person.titel;
    el("npc-stand").replaceChildren(...npcStand(person).map(([text, ton]) => {
      const marke = element("span", text);
      if (ton) marke.className = "npc-rang-" + ton;
      return marke;
    }));
    npcPortrait(inhalt.npc, inhalt.quelle ?? inhalt.person);
    el("npc-text").replaceChildren(...inhalt.absaetze.filter(a => a?.text).map(redeAbsatz));
    el("npc-optionen").replaceChildren(...inhalt.optionen.slice(0, 9).map((option, index) => {
      const li = element("li");
      const knopf = element("button");
      knopf.type = "button";
      knopf.className = "npc-option";
      knopf.disabled = Boolean(option.disabled);
      knopf.dataset.taste = String(index + 1);
      const taste = element("span", String(index + 1));
      taste.className = "npc-taste";
      taste.setAttribute("aria-hidden", "true");
      const text = element("span");
      text.className = "npc-option-text";
      text.append(option.label);
      if (option.badges?.length) {
        const badges = element("span");
        badges.className = "npc-badges";
        for (const [label, ton] of option.badges) {
          const badge = element("span", "[" + label + "]");
          badge.className = "npc-badge" + (ton ? " npc-badge-" + ton : "");
          badges.append(badge);
        }
        text.append(" ", badges);
      }
      knopf.append(taste, text);
      if (option.hinweis) {
        const hinweis = element("span", option.hinweis);
        hinweis.className = "npc-option-hinweis";
        knopf.append(hinweis);
      }
      knopf.addEventListener("click", () => option.aktion());
      li.append(knopf);
      return li;
    }));
    if (offen) {
      for (const teil of neuePerson ? [el("npc-body"), dialog.querySelector(".npc-kopf")] : [el("npc-body")]) {
        teil.classList.remove("npc-wechsel");
        void teil.offsetWidth;
        teil.classList.add("npc-wechsel");
      }
      dialog.scrollTop = 0;
    } else {
      for (const id of ["inventory-hub", "character-sheet", "reisekarte"]) if (el(id).open) el(id).close();
      dialog.showModal();
    }
    (el("npc-optionen").querySelector("button:not(:disabled)") ?? el("npc-close")).focus();
  }

  function gespraechEnde() {
    if (el("npc-dialog").open) el("npc-dialog").close();
  }

  function abschluss(text) {
    gespraech.art = "ende";
    gespraechZeigen({ ...gespraech.kopf, absaetze: [{ text, art: "antwort" }], ohneZusatz: true,
      optionen: [{ label: "Weiter", badges: [["Gespräch beenden", "ende"]], aktion: gespraechEnde }] });
  }

  function wahlBadges(choice) {
    const badges = [];
    if (choice.check) badges.push([klassen.fertigkeiten[choice.check[0]].name + " / Probe " + choice.check[1], "probe"]);
    if (choice.fight) badges.push([choice.check ? "Kampf bei Misserfolg" : "Kampf", "kampf"]);
    if (/annehmen/i.test(choice.label)) badges.push(["Annehmen", "gut"]);
    else if (choice.item || choice.reward) badges.push(["Belohnung", "gut"]);
    if (choice.emberCost) badges.push([choice.emberCost + " Glut", ""]);
    if (choice.destination && choice.to !== state.scene) badges.push(["Reise", "ende"]);
    return badges;
  }
  const wahlOption = (choice, aktion) => ({ label: choice.label, badges: wahlBadges(choice), aktion });

  // Nach jeder Antwort: Kampf schließt das Fenster, ein Gesprächsschritt tauscht den Inhalt, sonst folgt der letzte Satz mit „Weiter“.
  function gespraechWahl(schritt) {
    const vorher = state;
    const art = gespraech.art;
    gespraech.laeuft = true;
    try { update(schritt()); } finally { gespraech.laeuft = false; }
    const sprecher = state.scene !== "weltknoten" && npcs.fuerSzene(state.scene, world.scenes[state.scene]);
    gespraech.auto = sprecher ? state.scene : null;
    if (state === vorher) return;
    const neu = vorher.journal.at(-1) !== state.journal.at(-1) ? state.journal.at(-1) : null;
    if (state.combat || state.health <= 0 || ["defeat", "weltende"].includes(state.scene)) return gespraechEnde();
    if (art === "haupt") return hauptGespraech(neu);
    if (art === "aushang") return abschluss(neu ?? "Abgemacht. Der Auftrag steht jetzt in deinem Questlog.");
    if (sprecher) return szenenGespraech(neu);
    if (art === "wahl" && state.scene === vorher.scene) return wahlFolge(gespraech.wahlNpc, neu);
    if (neu) return abschluss(neu);
    gespraechEnde();
  }

  function szenenGespraech(nachricht = null) {
    const scene = world.scenes[state.scene];
    const npc = npcs.fuerSzene(state.scene, scene);
    if (!npc || state.combat) return gespraechEnde();
    gespraech.art = "szene";
    const optionen = rules.choices(state).map(choice => wahlOption(choice, () => gespraechWahl(() => rules.choose(state, choice.id))));
    if (state.scene === "supply-post") {
      optionen.unshift({ label: "Zeig mir, was du hast.", badges: [["Handel öffnen", "gut"]], aktion: () => { gespraechEnde(); openHub("trade"); } });
    }
    optionen.push({ label: "Gespräch beenden", badges: [["Verabschieden", "ende"]], aktion: gespraechEnde });
    gespraechZeigen({ npc, quelle: scene, ort: scene.place, absaetze: [{ text: nachricht, art: "antwort" }, { text: szenenText() }], optionen });
  }

  // Einzelne Gesprächswahlen in offenen Szenen (z. B. Lene und Runa im Wachhof).
  function wahlGespraech(npc, wahlId) {
    gespraech.art = "wahl";
    gespraech.wahlNpc = npc;
    gespraechWahl(() => rules.choose(state, wahlId));
  }
  function wahlFolge(npc, nachricht) {
    const scene = world.scenes[state.scene];
    const weitere = rules.choices(state).filter(choice => npcs.fuerWahl(state.scene, choice) === npc);
    gespraechZeigen({ npc, quelle: scene, ort: scene.place,
      absaetze: [nachricht ? { text: nachricht } : { text: szenenText(), art: "regie" }],
      optionen: [...weitere.map(choice => wahlOption(choice, () => wahlGespraech(npc, choice.id))),
        { label: "Verabschieden", badges: [["Gespräch beenden", "ende"]], aktion: gespraechEnde }] });
  }

  // Aushang: Auftrag im Gespräch mit dem Ausrufer annehmen.
  function aushangGespraech(ort, auftrag, spiel) {
    gespraech.art = "aushang";
    const person = { name: "Ausrufer von " + ort.name, titel: "Liest die Aufträge am Aushang vor", fraktion: ort.fraktion,
      portrait: "assets/npcs/ausrufer-" + ort.fraktion + ".png" };
    const absaetze = [{ text: auftrag.titel + " · " + auftrag.art, art: "regie" }, { text: auftrag.text }, { text: "Lohn: " + auftrag.lohn, art: "folge" }];
    if (auftrag.hinweis) absaetze.push({ text: auftrag.hinweis, art: "regie" });
    const optionen = spiel.spiel.lohn.map((_, index) => ({
      label: "Ich übernehme den Auftrag" + (spiel.spiel.lohn.length > 1 ? " · " + lohnText(spiel, index) : "") + ".",
      badges: [["Annehmen", "gut"], ...(spiel.spiel.gegner ? [["Kampf", "kampf"]] : [])],
      hinweis: auftragOrt(spiel) + " · " + rules.auftragEp + " EP",
      aktion: () => gespraechWahl(() => rules.auftragAnnehmen(state, auftrag.id, index)),
    }));
    optionen.push({ label: "Vielleicht später.", badges: [["Gespräch beenden", "ende"]], aktion: gespraechEnde });
    gespraechZeigen({ npc: "ausrufer-" + ort.id, person, quelle: person, ort: ort.name + " · Aushang", absaetze, optionen });
  }

  // Hauptquest: Schritte und Entscheidungen im Gespräch mit der Auftraggeberin der Fraktionsreihe.
  function hauptGespraech(nachricht = null) {
    const haupt = rules.hauptquest(state);
    const npc = npcs.fuerHauptquest(state.faction);
    if (!haupt || !npc) return nachricht ? abschluss(nachricht) : gespraechEnde();
    gespraech.art = "haupt";
    const absaetze = [{ text: nachricht, art: "antwort" }];
    let optionen;
    if (haupt.fertig) {
      absaetze.push({ text: "Akt " + haupt.akt + " ist abgeschlossen. Die Schwester-Zweige (Akt 2 und 3) beginnen in den Hauptstädten der anderen Reiche.", art: "regie" });
      optionen = [{ label: "Weiter", badges: [["Gespräch beenden", "ende"]], aktion: gespraechEnde }];
    } else {
      const schritt = haupt.schritt;
      absaetze.push({ text: "Schritt " + schritt.nr + " von " + schritt.von + " · " + schritt.titel + " · " + knoten.get(schritt.ort).name, art: "regie" },
        { text: schritt.text });
      if (haupt.bericht) absaetze.push({ text: "Du kommst aus " + knoten.get(schritt.ort).name + " zurück und erstattest Bericht.", art: "regie" });
      optionen = haupt.bericht
        ? [{ label: "Bericht erstatten · " + schritt.titel, badges: [], hinweis: haupt.grund ?? "", disabled: Boolean(haupt.grund),
          aktion: () => gespraechWahl(() => rules.hauptWeiter(state)) }]
        : schritt.wahl
        ? schritt.wahlen.map(option => {
          const grund = rules.hauptGrund(state, option.id);
          return { label: option.label, badges: [["Entscheidung", "probe"]], hinweis: option.folge + (grund ? " · " + grund : ""),
            disabled: Boolean(grund), aktion: () => gespraechWahl(() => rules.hauptWeiter(state, option.id)) };
        })
        : [{ label: (schritt.gegner ? "Kämpfen · " : "Weiter · ") + schritt.titel, badges: schritt.gegner ? [["Kampf", "kampf"]] : [],
          hinweis: haupt.grund ?? "", disabled: Boolean(haupt.grund), aktion: () => gespraechWahl(() => rules.hauptWeiter(state)) }];
      optionen.push({ label: "Später", badges: [["Gespräch beenden", "ende"]], aktion: gespraechEnde });
    }
    gespraechZeigen({ npc, ort: "Hauptquest · Akt " + haupt.akt + " · „" + haupt.titel + "“", absaetze, optionen });
  }

  el("npc-close").addEventListener("click", gespraechEnde);
  el("npc-dialog").addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || !/^[1-9]$/.test(event.key)) return;
    const knopf = el("npc-optionen").querySelector('[data-taste="' + event.key + '"]:not(:disabled)');
    if (!knopf) return;
    event.preventDefault();
    knopf.click();
  });
  el("npc-dialog").addEventListener("close", () => {
    gespraech.npc = null;
    gespraech.art = null;
  });

  // ---- Stadt-Hub (Technische Spezifikation, Abschnitt 2): Statusleiste, Krise und Aufhänger, vier Bereiche ----
  const welt = { tab: "aufbruch" };
  const weltTabsAlt = [["hofstaat", "A · Hofstaat"], ["lager", "B · Rast und Lager"], ["held", "C · Held"], ["aufbruch", "D · Aufbruch"]];
  // Patch 2.5.0: Stadt-Hub der Menschen mit fünf Bereichen und Tasten A bis E.
  const weltTabsMenschen = () => [["hofstaat", "A · Hofstaat & Aushang"], ["kontor", "B · Kontor, Händler & Schmiede"],
    ["lager", "C · Rast und Lager (" + (rules.rastKosten(state) ? rules.rastKosten(state) + " Nahrung" : "frei") + ")"],
    ["held", "D · Held, Gefährten & Relikt"], ["aufbruch", "E · Aufbruch (Reisekarte)"]];
  const weltTabsJetzt = () => rules.lage(state) ? weltTabsMenschen() : weltTabsAlt;

  // Tasten A bis E für die Bereiche des Stadt-Hubs und M für die Strategiekarte (Patch 2.5.0).
  document.addEventListener("keydown", event => {
    if (!state || state.scene !== "weltknoten" || !rules.lage(state) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest?.("input, textarea, select, dialog[open]") || document.querySelector("dialog[open]")) return;
    const taste = event.key.toLowerCase();
    if (taste === "m") {
      welt.modus = welt.modus === "strategie" ? "abenteuer" : "strategie";
      renderScene();
      return;
    }
    const index = ["a", "b", "c", "d", "e"].indexOf(taste);
    const tabs = weltTabsMenschen();
    if (index < 0 || !tabs[index]) return;
    welt.modus = "abenteuer";
    welt.tab = tabs[index][0];
    renderScene();
    el("welt-tab-" + welt.tab)?.focus();
  });

  function weltMeter(name, wert, max, schwelle = null) {
    const row = element("div");
    row.className = "welt-meter" + (schwelle !== null && wert >= schwelle ? " welt-warn" : "") + (schwelle !== null && wert >= 80 ? " welt-danger" : "");
    const head = element("div");
    head.className = "welt-meter-head";
    head.append(element("span", name), element("strong", wert + " / " + max));
    const bar = element("progress");
    bar.max = max;
    bar.value = wert;
    bar.setAttribute("aria-label", name);
    row.append(head, bar);
    if (schwelle !== null) row.title = "Gegenkraft ab " + schwelle;
    return row;
  }

  function weltLeistenBlock() {
    const box = element("div");
    box.className = "welt-meters";
    for (const leiste of rules.weltLeisten(state)) box.append(weltMeter(leiste.name, leiste.wert, 100, leiste.schwelle));
    return box;
  }

  // Die fünf Weltleisten als Akkordeon: eingeklappt nennt die Zeile nur die höchste Gefahr (UI-Überarbeitung 19. 11. 2026).
  function weltLageAkkordeon() {
    const leisten = rules.weltLeisten(state);
    const hoechste = leisten.reduce((best, leiste) => leiste.wert > best.wert ? leiste : best, leisten[0]);
    const box = element("details");
    box.className = "welt-lage" + (hoechste.wert >= hoechste.schwelle ? " welt-warn" : "") + (hoechste.wert >= 80 ? " welt-danger" : "");
    box.open = Boolean(welt.lageOffen);
    box.addEventListener("toggle", () => { welt.lageOffen = box.open; });
    const summary = element("summary");
    summary.append(element("span", "Weltlage: "), element("strong", "Höchste Gefahr " + hoechste.name + " (" + hoechste.wert + "/100)"));
    box.append(summary, weltLeistenBlock());
    return box;
  }

  function weltKrisen() {
    const lines = [];
    const wert = Object.fromEntries(rules.weltLeisten(state).map(leiste => [leiste.id, leiste.wert]));
    if (wert.erzfieber >= 50) lines.push("Erzfieber " + wert.erzfieber + ": Der Zollpass ist gesperrt, und die Glut steigt jede Etappe schneller.");
    if (wert.glut >= 50) lines.push("Glut " + wert.glut + ": Ascheregen fällt über die Länder der Lebenden.");
    if (wert.welke >= 50) lines.push("Welke " + wert.welke + ": Der Weltenbaum wirft sein Laub.");
    if (wert.untote >= 50) lines.push("Untoten-Bedrohung " + wert.untote + ": Der Kult breitet sich aus.");
    if (wert.orks >= 55) lines.push("Ork-Bedrohung " + wert.orks + ": Raubzüge an den Küsten.");
    const lage = rules.lage(state);
    if (lage?.entkraeftet) lines.push("Entkräftet: Jede Etappe ohne Nahrung kostet 15 Moral. Bei Nahrung 0 und Moral 0 zerfällt die Gruppe. Hol Nahrung aus dem Kontor oder kaufe welche.");
    else if (lage && state.ressource <= 5) lines.push("Nahrung fast aufgebraucht: Ohne Nahrung wird die Gruppe entkräftet und verliert Moral. Hol Nahrung aus dem Kontor.");
    else if (state.ressource <= 5) lines.push(rules.resourceName(state) + " fast aufgebraucht: Bei 0 zerfällt deine Fraktion. Hol Ertrag aus deinen Dörfern.");
    if (lage?.geaechtet) lines.push("Geächtet bei deiner eigenen Fraktion: kein Handel im Kontor, kein Zehnt, Torzoll an den Stadttoren.");
    return lines;
  }

  function renderWeltHub(content, actions) {
    const ort = knoten.get(state.knoten);
    const fraktion = klassen.fraktionen[ort.fraktion];
    // UI-Überarbeitung 19. 11. 2026: Typ, Fraktion und Ruf stehen in der Ortszeile über dem Namen.
    const rufHier = rules.lage(state) && rules.systeme.istMensch(ort.fraktion) ? rules.systeme.ruf(state, ort.fraktion) : null;
    el("location").textContent = [knoten.typNamen[ort.typ] + (ort.hatHafen && ort.typ !== "hafenstadt" ? " mit Hafen" : ""), fraktion.name,
      rufHier !== null ? "Ruf " + signed(rufHier) + " (" + rules.systeme.rufRang(rufHier).name + ")"
        : ort.fraktion === state.faction ? "eigene Fraktion" : (state.vertraege ?? []).includes(ort.fraktion) ? "Vertragspartner" : null]
      .filter(Boolean).join(" · ");
    el("scene-title").textContent = ort.name;
    // Patch 2.5.0: Umschalter zwischen Abenteuer-Ansicht und Reichs- und Strategiekarte (Taste M).
    if (rules.lage(state)) {
      const modus = element("div");
      modus.className = "welt-modus";
      modus.setAttribute("role", "group");
      modus.setAttribute("aria-label", "Ansicht der Weltreise");
      for (const [id, label] of [["abenteuer", "Abenteuer-Ansicht"], ["strategie", "Reichs- und Strategiekarte (M)"]]) {
        const knopf = button(modus, label, () => { welt.modus = id; renderScene(); });
        knopf.setAttribute("aria-pressed", String((welt.modus ?? "abenteuer") === id));
      }
      content.append(modus);
      if (welt.modus === "strategie") {
        content.append(weltStrategie());
        return;
      }
    }

    // Statusleiste
    const status = element("section");
    status.className = "welt-status";
    status.setAttribute("aria-label", "Statusleiste");
    const facts = element("dl");
    facts.className = "welt-facts";
    // Ort, Typ, Fraktion und Ruf stehen in der Ortszeile, Silber in der Ressourcen-Leiste, der Zehnt-Countdown oben rechts.
    for (const [label, value] of [["Zeit", "Herbst 612 n. E. · Etappe " + etappeJetzt()],
      ...(rules.lage(state) ? [["Dörfer", rules.lage(state).befreit + " befreit"]] : [["Silber", String(state.silver)]]),
      ["Marken", state.marks.length ? String(state.marks.length) : "keine"]]) {
      const item = element("div");
      item.append(element("dt", label), element("dd", value));
      facts.append(item);
    }
    status.append(facts);
    const lageJetzt = rules.lage(state);
    if (lageJetzt) {
      // Rohstoffleiste: Silber, Nahrung im Gepäck, dazu Holz, Eisen, Stein und Runensplitter im Kontor der eigenen Fraktion.
      const strip = element("ul");
      strip.className = "welt-rohstoffe";
      strip.setAttribute("aria-label", "Silber und Rohstoffe");
      for (const [id, name, wert, extra] of [["silber", "Silber", state.silver], ["nahrung", "Nahrung", state.ressource, "+" + lageJetzt.kontor.nahrung + " Kontor"],
        ["holz", "Holz", lageJetzt.kontor.holz], ["eisen", "Eisen", lageJetzt.kontor.eisen], ["stein", "Stein", lageJetzt.kontor.stein],
        ["runen", "Runensplitter", lageJetzt.kontor.runensplitter]]) {
        const item = element("li");
        item.className = "welt-rohstoff-" + id;
        item.title = id === "nahrung" ? "Nahrung im Gepäck, dazu " + lageJetzt.kontor.nahrung + " im Kontor" : id === "silber" ? "Silber im Beutel" : name + " im Kontor deiner Fraktion";
        item.append(element("span", name), element("strong", String(wert)));
        if (extra) {
          const small = element("small", extra);
          item.append(small);
        }
        strip.append(item);
      }
      status.append(strip);
    }
    status.append(weltLageAkkordeon());
    if (!rules.lage(state)) status.append(weltMeter(rules.resourceName(state) + " (Vorrat)", state.ressource, rules.vorratMax));
    if (state.marks.length) {
      const marks = element("details");
      marks.className = "welt-marks";
      marks.append(element("summary", "Aktive Marken"), element("p", state.marks.join(", ")));
      status.append(marks);
    }
    content.append(status);

    // Krise und Aufhänger
    const krise = element("section");
    krise.className = "welt-krise";
    krise.append(element("h3", "Krise und Aufhänger"));
    const reihe = startpunkte.fraktionen[state.faction];
    const haupt = weltHauptquest();
    if (haupt) krise.append(haupt);
    const akte = weltAkte();
    if (akte) krise.append(akte);
    else if (reihe) krise.append(element("p", "Fraktionsreihe „" + reihe.motto + "“ · Akt 1, „" + reihe.akte[0] + "“ · Die Akte werden noch gebaut."));
    const plan = weltReihe(state.faction);
    if (plan) krise.append(plan);
    for (const line of weltKrisen()) {
      const warn = element("p", line);
      warn.className = "welt-alarm";
      krise.append(warn);
    }
    const volk = klassen.fraktionen[ort.fraktion].volk;
    const hooks = knoten.aufhaenger[volk] ?? [];
    const seed = [...ort.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const local = element("ul");
    local.className = "welt-hooks";
    for (let index = 0; index < Math.min(2, hooks.length); index++) {
      const [title, text] = hooks[(seed + index * 3) % hooks.length];
      const item = element("li");
      item.append(element("strong", title + ": "), text);
      local.append(item);
    }
    if (hooks.length) krise.append(local);
    if (state.handlung) {
      const back = knoten.get(state.handlung.knoten);
      krise.append(element("p", rules.handlungHier(state) ? "Hier wartet die Handlung auf dich." : "Die Handlung wartet in " + back.name + "."));
      if (rules.handlungHier(state)) button(krise, "Zur Handlung zurückkehren", () => update(rules.zurHandlung(state)), { story: true });
    }
    content.append(krise);
    const rueck = weltRueckkehr();
    if (rueck) krise.before(rueck);
    const tat = weltTat();
    if (tat) content.append(tat);
    const offen = weltAuftraege();
    if (offen) content.append(offen);
    const aushang = rules.lage(state) ? null : weltAushang(ort);
    if (aushang) content.append(aushang);

    // Bereiche A bis D
    const tabs = element("div");
    tabs.className = "welt-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Stadt-Hub");
    const panel = element("section");
    panel.className = "welt-panel";
    panel.setAttribute("role", "tabpanel");
    panel.id = "welt-panel";
    const weltTabs = weltTabsJetzt();
    if (!weltTabs.some(([id]) => id === welt.tab)) welt.tab = "aufbruch";
    weltTabs.forEach(([id, label], index) => {
      const tab = element("button", label);
      if (id === "aufbruch" && rules.lage(state)) tab.classList.add("welt-tab-primary");
      tab.type = "button";
      tab.id = "welt-tab-" + id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(welt.tab === id));
      tab.setAttribute("aria-controls", "welt-panel");
      tab.tabIndex = welt.tab === id ? 0 : -1;
      tab.addEventListener("click", () => { welt.tab = id; renderScene(); el("welt-tab-" + id)?.focus(); });
      tab.addEventListener("keydown", event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const next = weltTabs[(index + (event.key === "ArrowRight" ? 1 : weltTabs.length - 1)) % weltTabs.length][0];
        welt.tab = next;
        renderScene();
        el("welt-tab-" + next)?.focus();
      });
      tabs.append(tab);
    });
    panel.setAttribute("aria-labelledby", "welt-tab-" + welt.tab);
    lagerfeuer(panel);
    ({ hofstaat: weltHofstaat, kontor: weltKontorTab, lager: weltLager, held: weltHeld, aufbruch: weltAufbruch })[welt.tab](panel, ort);
    content.append(tabs, panel);
  }

  // Fraktionsreihe als Plan (Gemini-Aufbau, spiel/nebenquests.js). Nur lesbar, die Akte sind noch nicht spielbar.
  function weltReihe(fraktion) {
    const reihe = typeof nebenquests !== "undefined" ? nebenquests.reihe(fraktion) : null;
    if (!reihe) return null;
    const box = element("details");
    box.className = "welt-aushang welt-reihe";
    box.append(element("summary", "Hauptquest · Kapitel " + reihe.kapitel + " · " + reihe.akte.length + " Akte"));
    box.append(element("p", "Prolog „" + reihe.prolog.titel + "“: " + reihe.prolog.text));
    const liste = element("ul");
    for (const akt of reihe.akte) {
      const item = element("li");
      const kopf = element("p");
      kopf.append(element("strong", "Akt " + akt.nr + " · " + akt.titel), " · Stufe " + akt.stufen +
        (akt.freieReihenfolge ? " · freie Reihenfolge (empfohlen als " + akt.empfohlen + "., mit " + akt.schwester + ")" : ""));
      item.append(kopf, element("p", akt.ort + (akt.volksquest ? " · enthält " + akt.volksquest : "")));
      if (akt.vermerk) {
        const vermerk = element("p", akt.vermerk);
        vermerk.className = "welt-aushang-hinweis";
        item.append(vermerk);
      }
      const schritte = element("ol");
      for (const schritt of akt.schritte) {
        const zeile = element("li");
        zeile.append(element("strong", schritt.titel), " (" + schritt.ort + "): " + schritt.text);
        if (schritt.vermerk) {
          const vermerk = element("p", schritt.vermerk);
          vermerk.className = "welt-aushang-hinweis";
          zeile.append(vermerk);
        }
        schritte.append(zeile);
      }
      item.append(schritte);
      for (const option of akt.wahl) item.append(element("p", "Wahl: " + option.label + " → " + option.folge));
      liste.append(item);
    }
    box.append(liste);
    box.append(element("p", "Fraktions-Spezialisierung (" + reihe.spezialisierung.ausloeser + ", " + reihe.spezialisierung.zusaetzlich + "): " +
      reihe.spezialisierung.optionen.map(o => o.name + " – " + o.bonus).join(" · ")));
    box.append(element("p", "Begleiter: " + reihe.begleiter.map(b => b.name + " (" + b.rolle + ", " +
      (klassen.fraktionen[fraktion]?.klassen[b.klasse]?.name ?? b.klasse) + ", " + knoten.get(b.ort).name +
      ", Akt " + b.akt + ")").join(", ")));
    const stand = element("p", "Plan der Hauptquest. " + (rules.hauptquest(state) ? "Akt 1 ist spielbar, ab Akt 2 folgen die Akte noch." : "Die Akte werden noch gebaut."));
    stand.className = "welt-aushang-stand";
    box.append(stand);
    return box;
  }

  // Globales Ort-Gate (Henry, 20. 11. 2026): Ist der Held nicht am Zielort, zeigt der Abschnitt einen Hinweis und einen
  // Reise-Knopf „Nach … reisen (…)“, der den Marsch über die kürzeste Route startet. Liefert true, wenn gesperrt.
  const ORTGATE = rules.ortGate.globale_ort_regeln.ui_verhalten_bei_ort_abweichung;
  function ortGate(parent, zielId, wer = null) {
    if (!zielId || !state || state.knoten === zielId) return false;
    const reise = rules.ortReise(state, zielId);
    if (!reise) return false;
    const hier = knoten.get(state.knoten)?.name ?? "der Fremde";
    const hinweis = element("p", wer
      ? ORTGATE.hinweis_vorlage.replace("{aktueller_ort_name}", hier).replace("{ziel_ort_name}", reise.zielName).replace("{npc_name}", wer)
      : "Du bist in " + hier + ". Reise nach " + reise.zielName + ", um weiterzumachen.");
    hinweis.className = "ort-gate-hinweis";
    parent.append(hinweis);
    if (ORTGATE.zeige_reise_button) {
      const knopf = button(parent, ORTGATE.reise_button_vorlage.replace("{ziel_ort_name}", reise.zielName).replace("{grund_kurz}", reise.kurz),
        () => (ORTGATE.starte_marsch_animation ? marschieren(reise.route) : update(rules.reise(state, reise.route[0]))),
        { disabled: Boolean(reise.grund), story: true });
      knopf.classList.add("ort-gate-reise");
    }
    return true;
  }

  // Hauptquest Akt 1 (Kronreich und Orden): aktueller Schritt, Ausführen am richtigen Ort, Wahl am Ende des Akts.
  function weltHauptquest() {
    const haupt = rules.hauptquest(state);
    if (!haupt) return null;
    const box = element("div");
    box.className = "welt-hauptquest";
    box.append(element("h4", "Hauptquest · Akt " + haupt.akt + ", „" + haupt.titel + "“ · Stufe " + haupt.stufen));
    if (haupt.fertig) {
      const wahl = nebenquests.reihe(state.faction).akte[0].wahl.find(option => option.id === haupt.wahl);
      box.append(element("p", "Abgeschlossen" + (wahl ? ": " + wahl.label + "." : ".")));
      return box;
    }
    const schritt = haupt.schritt;
    const kopf = element("p");
    kopf.append(element("strong", "Schritt " + schritt.nr + " von " + schritt.von + " · " + schritt.titel), " · " + knoten.get(schritt.ort).name);
    box.append(kopf, element("p", schritt.text));
    if (haupt.bericht) {
      box.append(element("p", "Erfüllt. Bericht erwartet in " + haupt.bericht.ortName + " (siehe oben)."));
      return box;
    }
    const auftraggeber = npcs.fuerHauptquest(state.faction);
    if (auftraggeber) {
      // Gesprächsfenster: Schritte und Entscheidungen laufen im Dialog mit der Auftraggeberin – nur an ihrem Ort.
      if (schritt.wahl) box.append(element("p", "Entscheidung: " + schritt.wahlen.map(option => option.label + " → " + option.folge).join(" · ")));
      const name = npcPerson(auftraggeber).name;
      const gesperrt = state.knoten !== haupt.zielOrt;
      const knopf = button(box, "Mit " + name + " sprechen · Schritt " + schritt.nr +
        (gesperrt ? " · in " + knoten.get(haupt.zielOrt).name : haupt.grund && !schritt.wahl ? " · " + haupt.grund : ""), () => hauptGespraech(),
        { disabled: gesperrt && ORTGATE.sperre_gespraechs_button });
      knopf.classList.add("primary", "npc-start");
      if (gesperrt) ortGate(box, haupt.zielOrt, name);
      return box;
    }
    if (ortGate(box, haupt.zielOrt)) return box;
    if (schritt.wahl) {
      if (state.knoten === schritt.ort) box.append(element("p", "Entscheide, wie Akt " + haupt.akt + " endet:"));
      for (const option of schritt.wahlen) {
        const grund = rules.hauptGrund(state, option.id);
        box.append(element("p", option.label + " → " + option.folge));
        button(box, option.label + (grund ? " · " + grund : ""), () => update(rules.hauptWeiter(state, option.id)),
          { disabled: Boolean(grund), story: true });
      }
    } else {
      button(box, (schritt.gegner ? "Kämpfen · " : "Weiter · ") + schritt.titel + (haupt.grund ? " · " + haupt.grund : ""),
        () => update(rules.hauptWeiter(state)), { disabled: Boolean(haupt.grund), story: true });
    }
    return box;
  }

  // Akt 2 bis 4 (Spezifikation 2.6.0/2.6.1): Schwester-Zweige, Fraktions-Spezialisierung, Akt 4 und das Tor zu Akt 5.
  function weltAkte() {
    const info = rules.akteInfo(state);
    if (!info) return null;
    const box = element("div");
    box.className = "welt-hauptquest welt-akte";
    if (info.grund) {
      box.append(element("h4", "Akt 2 und 3 · Schwester-Zweige"), element("p", "Noch gesperrt: " + info.grund + "."));
      return box;
    }
    const a4 = info.akt4;
    // Patch 2.6.10: Erinnerung an ungenutzte Aufstiegspunkte vor Bosskämpfen (abschaltbar in den Einstellungen).
    const bossNah = info.zweige.some((z) => z.schritt?.boss) || (a4.offen && a4.schritt === 1);
    const offenePunkte = (rules.progression(state).points ?? 0) + (rules.faehigkeitInfo(state)?.punkte ?? 0) + (rules.aufstiegInfo(state)?.talentPunkte ?? 0);
    if (bossNah && offenePunkte > 0 && window.aschenkroneOptionen?.punkte !== false) {
      const warn = element("p", "Erinnerung: Du hast noch " + offenePunkte + " ungenutzte Aufstiegspunkte. Verteile sie im Charakterfenster, bevor du den Boss stellst.");
      warn.className = "welt-alarm";
      box.append(warn);
    }
    if (!a4.offen) {
      box.append(element("h4", "Akt 2 und 3 · Schwester-Zweige (freie Reihenfolge)"));
      for (const z of info.zweige) {
        const teil = element("div");
        teil.className = "akt-zweig" + (z.fertig ? " fertig" : "");
        teil.append(element("p", ""));
        teil.firstChild.append(element("strong", "„" + z.titel + "“"), " · " + klassen.fraktionen[z.fraktion].name + " · " +
          knoten.get(z.hub).name + " · " + (z.fertig ? "abgeschlossen" : "Akt " + z.akt + ", Stufe " + z.stufen + " · " + z.fortschritt + " von 3"));
        if (!z.fertig) {
          if (!z.fortschritt) teil.append(element("p", z.text));
          const sch = z.schritt;
          teil.append(element("p", "Stufe " + sch.nr + " · " + sch.titel + ": " + sch.text + (sch.boss ? " (Boss)" : "") +
            (sch.rohstoffe ? " · Lohn: " + Object.entries(sch.rohstoffe).map(([id, n]) => n + " " + id.replace("RES_", "").toLowerCase()).join(", ") : "")));
          if (z.geaechtet && !z.soeldner) teil.append(element("p", "Du bist hier geächtet: Als Söldner kommst du für 150 Silber hinein."));
          const anderer = info.zweige.some((x) => x !== z && x.fortschritt > 0 && !x.fertig);
          if (!anderer && ortGate(teil, z.zielOrt)) { box.append(teil); continue; }
          if (sch.wahlen.length) {
            for (const w of sch.wahlen) {
              const grund = rules.zweigGrund(state, z.fraktion, w.id);
              button(teil, "Kämpfen · " + w.label + " (" + w.folge + ")" + (grund ? " · " + grund : ""),
                () => update(rules.zweigWeiter(state, z.fraktion, w.id)), { disabled: Boolean(grund), story: true });
            }
          } else {
            const grund = rules.zweigGrund(state, z.fraktion);
            button(teil, "Kämpfen · " + sch.titel + (grund ? " · " + grund : ""), () => update(rules.zweigWeiter(state, z.fraktion)),
              { disabled: Boolean(grund), story: true });
          }
        }
        box.append(teil);
      }
      if (info.fspezOffen) {
        box.append(element("h4", "Fraktions-Spezialisierung (zusätzlich zur Klasse)"));
        for (const o of info.fspezOptionen) {
          const grund = rules.fspezGrund(state, o.spec_id);
          button(box, o.name + " · " + rules.fspezText[o.spec_id] + (grund ? " · " + grund : ""), () => update(rules.fspezWaehlen(state, o.spec_id)),
            { disabled: Boolean(grund), story: true });
        }
      }
      return box;
    }
    const fspez = info.zweige.map((z) => z.spez).find((x) => x.spec_id === info.fspez);
    if (fspez) box.append(element("p", "Fraktions-Spezialisierung: " + fspez.name + " · " + rules.fspezText[fspez.spec_id] + "."));
    box.append(element("h4", "Akt 4 · „" + a4.titel + "“ · Stufe " + a4.stufen));
    if (!a4.fertig) {
      box.append(element("p", a4.text));
      if (a4.schritt === 0) box.append(element("p", "Reichssiegel: " + (a4.siegel.length ? a4.siegel.map((o) => knoten.get(o).name).join(", ") : "noch keins") +
        " (" + a4.siegel.length + " von 3)" + (a4.siegel.length >= 3 ? ". Danach wartet ein Hinterhalt auf der Reichsstraße." : ".")));
      const gesperrt4 = Boolean(a4.zielOrt) && ortGate(box, a4.zielOrt);
      if (gesperrt4) { /* Ort-Gate: erst zum Zielort reisen. */ }
      else if (a4.wahlen.length) {
        for (const w of a4.wahlen) {
          const grund = rules.akt4Grund(state, w.id);
          button(box, w.label + " (" + w.folge + ")" + (grund ? " · " + grund : ""), () => update(rules.akt4Weiter(state, w.id)),
            { disabled: Boolean(grund), story: true });
        }
      } else {
        const label = a4.schritt === 0 ? (a4.siegel.length < 3 ? "Reichssiegel bergen" : "Kämpfen · Hinterhalt auf der Reichsstraße")
          : a4.schritt === 1 ? "Kämpfen · Thorvald stellen" : a4.thingLabel;
        button(box, label + (a4.grund ? " · " + a4.grund : ""), () => update(rules.akt4Weiter(state)), { disabled: Boolean(a4.grund), story: true });
      }
    } else box.append(element("p", "Abgeschlossen. Du bist Bannerjarl der vereinten Menschenreiche."));
    const arm = info.armada;
    if (arm.offen) {
      box.append(element("p", "Armada-Kriegskasse: " + Object.entries(arm.bedarf).map(([r, n]) => r + " " + arm.kasse[r] + "/" + n).join(" · ")));
      if (arm.tor) {
        const tor = element("div");
        tor.className = "akt5-tor";
        tor.append(element("h4", arm.tor.titel), element("p", arm.tor.text));
        box.append(tor);
      }
    }
    return box;
  }

  const lohnText = (auftrag, index) => {
    const [haupt, oder] = auftrag.lohn.split(/\s*\(oder\s*/);
    return index ? oder.replace(/\)$/, "") : haupt;
  };
  const auftragOrt = (auftrag) => auftrag.spiel.weg ? "unterwegs auf " + auftrag.spiel.weg + " " + nebenquests.wegName(auftrag.spiel.weg)
    : "in " + knoten.get(auftrag.ort).name;

  // Rückreise-Pflicht (Henry, 20. 11. 2026): Hinweis-Banner und Knopf „Rückkehr nach … antreten“; die Abgabe
  // ist nur am Ort des Auftraggebers aktiv.
  function rueckkehrKnopf(parent, ziel) {
    if (ziel.hier) {
      const grund = ziel.art === "haupt" ? rules.hauptGrund(state) : rules.abgabeGrund(state, ziel.id);
      const knopf = button(parent, "Bericht erstatten · " + ziel.titel + (grund ? " · " + grund : ""),
        () => ziel.art === "haupt" && npcs.fuerHauptquest(state.faction) ? hauptGespraech()
          : update(ziel.art === "haupt" ? rules.hauptWeiter(state) : rules.auftragAbgeben(state, ziel.id)),
        { disabled: Boolean(grund), story: true });
      knopf.classList.add("primary");
      return knopf;
    }
    const erster = ziel.route?.[0];
    const grund = !ziel.route ? "kein Weg" : rules.reiseGrund(state, erster);
    return button(parent, ziel.knopf + (ziel.route ? " · " + ziel.route.length + (ziel.route.length === 1 ? " Etappe" : " Etappen") : "") +
      (grund ? " · " + grund : ""), () => rueckkehrAntreten(ziel), { disabled: Boolean(grund), story: true });
  }
  function weltRueckkehr() {
    const ziele = rules.rueckkehrZiele(state);
    if (!ziele.length) return null;
    const box = element("section");
    box.className = "rueckkehr-banner";
    box.setAttribute("aria-label", "Bericht erstatten");
    for (const ziel of ziele) {
      const zeile = element("p");
      zeile.append(element("strong", ziel.titel + ": "), ziel.hier ? "Du bist in " + ziel.ortName + ". Erstatte Bericht und fordere deinen Lohn ein."
        : "Auftrag erfüllt. Reise zurück nach " + ziel.ortName + ", um Bericht zu erstatten und deinen Lohn einzufordern.");
      box.append(zeile);
      const knoepfe = element("div");
      knoepfe.className = "actions";
      rueckkehrKnopf(knoepfe, ziel);
      box.append(knoepfe);
    }
    return box;
  }

  // Angenommene Aufträge an allen Orten, mit Ausführen-Knopf am richtigen Ort.
  function weltAuftraege() {
    const offen = rules.auftraege(state, "aktiv");
    const bereit = rules.auftraege(state, "bereit_zur_abgabe");
    const erledigt = rules.auftraege(state, "erledigt");
    if (!offen.length && !erledigt.length && !bereit.length) return null;
    const box = element("details");
    box.className = "welt-aushang welt-auftraege";
    box.open = offen.length + bereit.length > 0;
    box.append(element("summary", "Deine Aufträge · " + offen.length + " offen" + (bereit.length ? " · " + bereit.length + " bereit zur Abgabe" : "") +
      " · " + erledigt.length + " erledigt"));
    const liste = element("ul");
    for (const auftrag of bereit) {
      const item = element("li");
      item.className = "auftrag-bereit";
      const kopf = element("p");
      kopf.append(element("strong", auftrag.titel), " · bereit zur Abgabe in " + knoten.get(auftrag.ort).name);
      item.append(kopf, element("p", "Lohn: " + lohnText(auftrag, auftrag.wahl)));
      liste.append(item);
    }
    for (const auftrag of offen) {
      const item = element("li");
      const kopf = element("p");
      kopf.append(element("strong", auftrag.titel), " · " + auftragOrt(auftrag));
      item.append(kopf, element("p", auftrag.text), element("p", "Lohn: " + lohnText(auftrag, auftrag.wahl)));
      if (auftrag.spiel.weg) item.append(element("p", "Reise über diesen Weg, dann stellen sich dir die Gegner."));
      else button(item, (auftrag.spiel.gegner ? "Auftrag ausführen · Kampf" : "Auftrag ausführen") +
        (auftrag.ausfuehren ? " · " + auftrag.ausfuehren : ""), () => update(rules.auftragAusfuehren(state, auftrag.id)),
        { disabled: Boolean(auftrag.ausfuehren), story: true });
      liste.append(item);
    }
    if (!offen.length) liste.append(element("li", "Keine offenen Aufträge."));
    box.append(liste);
    if (erledigt.length) box.append(element("p", "Erledigt: " + erledigt.map(auftrag => auftrag.titel).join(", ") + "."));
    return box;
  }

  // Aushang: Nebenquests des Ortes (Gemini-Ausarbeitung, spiel/nebenquests.js). Kronreich- und Orden-Helden nehmen sie an.
  function weltAushang(ort) {
    const eintrag = typeof nebenquests !== "undefined" ? nebenquests.fuerOrt(ort.id) : null;
    if (!eintrag?.auftraege.length) return null;
    const spielbar = Object.fromEntries(rules.aushang(state).map(auftrag => [auftrag.id, auftrag]));
    const box = element("details");
    box.className = "welt-aushang";
    const stufen = nebenquests.stufenFuer(ort.id, state.faction);
    box.append(element("summary", "Aushang in " + ort.name + " · " + eintrag.auftraege.length + " Aufträge" + (stufen ? " · Stufe " + stufen : "")));
    const stand = element("p", eintrag.stand + (eintrag.weg ? " Dorfweg " + eintrag.weg + ": " + nebenquests.wegName(eintrag.weg) + "." : ""));
    stand.className = "welt-aushang-stand";
    box.append(stand);
    const liste = element("ul");
    for (const auftrag of eintrag.auftraege) {
      const item = element("li");
      const kopf = element("p");
      kopf.append(element("strong", auftrag.titel), " · " + auftrag.art);
      item.append(kopf, element("p", auftrag.text), element("p", "Lohn: " + auftrag.lohn));
      const wege = nebenquests.wegeImText(auftrag.text + " " + auftrag.lohn);
      if (wege.length) item.append(element("p", "Wege: " + wege.map(k => k + " " + nebenquests.wegName(k)).join(", ")));
      if (auftrag.hinweis) {
        const hinweis = element("p", auftrag.hinweis);
        hinweis.className = "welt-aushang-hinweis";
        item.append(hinweis);
      }
      const spiel = spielbar[auftrag.id];
      if (spiel?.status) {
        const stand = element("p", spiel.status === "erledigt" ? "✓ Erledigt" : "Angenommen · " + auftragOrt(spiel));
        stand.className = "welt-auftrag-stand";
        item.append(stand);
      } else if (spiel && !spiel.grund) {
        item.append(element("p", (spiel.spiel.gegner ? "Kampf auf Stufe " + (nebenquests.stufenFuer(ort.id, state.faction) ?? "") + " · " : "Ohne Kampf · ") +
          auftragOrt(spiel) + " · " + rules.auftragEp + " EP"));
        button(item, "Auftrag besprechen und annehmen", () => aushangGespraech(ort, auftrag, spiel)).classList.add("npc-start");
      }
      liste.append(item);
    }
    box.append(liste);
    return box;
  }

  // Ausgang eines Auftrags der Menschen: gute Tat, Söldner-Weg, schlechte Tat (Ruf-Datei 2.0).
  function weltTat() {
    const wahl = rules.taten(state);
    if (!wahl.length) return null;
    const box = element("section");
    box.className = "welt-krise welt-tat";
    box.append(element("h3", "Wie endest du den Auftrag?"));
    for (const t of wahl) {
      const folgen = ["Ruf " + (t.ruf > 0 ? "+" : "") + t.ruf, t.silber ? "+" + t.silber + " Silber" : "",
        t.nahrung ? "+" + t.nahrung + " Nahrung" : "", t.befreit ? "befreit die Dörfer der Stadt" : ""].filter(Boolean).join(" · ");
      button(box, t.name + " · " + folgen, () => update(rules.tatWaehlen(state, t.id)), { story: true });
      box.append(element("p", t.text));
    }
    return box;
  }

  // Kontor der Menschen: gemeinsames Rohstofflager aller Städte einer Fraktion.
  // Kontor und Handel liegen im Inventar (Reiter „Kontor-Lager“ und „Handel“, UI-Überarbeitung 19. 11. 2026).
  // Im Stadt-Hub bleiben ein kurzer Überblick, die Knöpfe dorthin und die Kriegskasse.
  function handelKnoepfe(panel) {
    const knoepfe = element("div");
    knoepfe.className = "actions";
    button(knoepfe, "Kontor-Lager öffnen", () => openHub("storage"));
    button(knoepfe, "Handel öffnen", () => openHub("trade"));
    panel.append(knoepfe);
  }
  function weltKontor(panel) {
    const info = rules.kontorInfo(state);
    if (!info) return;
    panel.append(element("h3", "Kontor · " + info.name + " · Rang " + info.rang.name + " (Ruf " + info.ruf + ")"));
    panel.append(element("p", info.rohstoffe.map(r => r.name + " " + r.menge).join(" · ") + ". Ein- und Auslagern, Kauf und Verkauf " +
      "(Kauf ×" + info.rang.kauf + ", Verkauf ×" + info.rang.verkauf + ") findest du im Inventar."));
    handelKnoepfe(panel);
    panel.append(element("h3", rules.systeme.daten.kriegskasse.titel));
    panel.append(element("p", Object.entries(info.kasseBedarf).map(([r, n]) => rules.systeme.daten.rohstoffe[r].name + " " + info.kasse[r] + " / " + n).join(" · ") +
      (info.kasseVoll ? ". " + rules.kasseVollText() : ". Die gefüllte Kasse bringt die Armada in Akt 5 über das Meer. Jede Spende +2 Ruf je Einheit.")));
    const kasse = element("div");
    kasse.className = "actions";
    for (const sp of info.spenden) {
      button(kasse, "5 " + rules.systeme.daten.rohstoffe[sp.id].name + " spenden" + (sp.grund ? " · " + sp.grund : ""),
        () => update(rules.spenden(state, sp.id, 5)), { disabled: Boolean(sp.grund) });
    }
    panel.append(kasse);
  }

  function weltSchmiede(panel) {
    const info = rules.schmiedeInfo(state);
    if (!info) return;
    const box = element("details");
    box.append(element("summary", "Schmiede · " + (info.stufe ? "Aufwerten bis +" + info.stufe : "keine Schmiede in dieser Stadt")));
    const liste = element("div");
    liste.className = "actions";
    for (const t of info.teile) {
      button(liste, t.name + (t.stufe ? " +" + t.stufe : "") + (t.kosten ? " → +" + t.ziel + " (+" + t.kosten.bonus + " %) · " + t.kosten.silber + " Silber, " +
        t.kosten.material : "") + (t.grund ? " · " + t.grund : ""), () => update(rules.schmieden(state, t.id)), { disabled: Boolean(t.grund) });
    }
    if (!info.teile.length) liste.append(element("p", "Keine Ausrüstung im Rucksack."));
    box.append(liste);
    // Patch 2.6.19: Runen der Schmiedepriester (Folge der Akt-1-Wahl des Ordens).
    const runen = rules.runenListe(state);
    if (runen.length) {
      box.append(element("h4", "Runen der Schmiedepriester"));
      const runenKnoepfe = element("div");
      runenKnoepfe.className = "actions";
      for (const r of runen) {
        button(runenKnoepfe, r.name + " · " + r.text + (r.grund === "schon eingeprägt" ? " · eingeprägt" : " · " + r.preis.silber + " Silber, " +
          r.preis.runensplitter + " Runensplitter" + (r.grund ? " · " + r.grund : "")), () => update(rules.runeEinpraegen(state, r.id)), { disabled: Boolean(r.grund) });
      }
      box.append(runenKnoepfe);
      if (runen.some((r) => !r.grund)) box.open = true;
    }
    panel.append(box);
  }
  function weltHandwerk(panel) {
    const rezepte = rules.handwerkListe(state);
    if (!rezepte.length) return;
    const box = element("details");
    box.append(element("summary", "Feldhandwerk"));
    const liste = element("div");
    liste.className = "actions";
    for (const r of rezepte) {
      button(liste, r.name + " · " + r.anzahl + " × " + r.ergebnis + " aus " + r.zutaten + (r.grund ? " · " + r.grund : ""),
        () => update(rules.handwerk(state, r.id)), { disabled: Boolean(r.grund) });
    }
    box.append(liste);
    panel.append(box);
  }

  // Reichs- und Strategiekarte: Ruf, Rang und Kontor der drei Menschen-Fraktionen, befreite Dörfer, Kriegskasse.
  function weltStrategie() {
    const S = rules.systeme;
    const box = element("section");
    box.className = "welt-strategie";
    const lage = rules.lage(state);
    box.append(element("h3", "Reich und Strategie"), element("p", "Moral " + lage.moral + " (" + lage.moralStufe.name + "). Etappe, Zehnt und Überfallprüfung zählt die Kopfleiste oben rechts."));
    const tabelle = element("table");
    const kopf = element("tr");
    for (const t of ["Fraktion", "Ruf", "Rang", "Dörfer befreit", "Nahrung", "Holz", "Eisen", "Stein", "Runensplitter"]) kopf.append(element("th", t));
    tabelle.append(kopf);
    for (const f of S.MENSCHEN) {
      const zeile = element("tr");
      const k = S.kontor({ ...state, kontor: structuredClone(state.kontor ?? {}) }, f);
      const doerfer = Object.values(S.daten.doerfer).filter(d => d.fraktion === f).length;
      for (const wert of [klassen.fraktionen[f].name + (f === state.faction ? " (eigene)" : ""), S.ruf(state, f), S.rufRang(S.ruf(state, f)).name,
        S.befreiteDoerfer(state, f).length + " / " + doerfer, k.nahrung, k.holz, k.eisen, k.stein, k.runensplitter]) zeile.append(element("td", String(wert)));
      tabelle.append(zeile);
    }
    const rahmen = element("div");
    rahmen.className = "welt-tabelle";
    rahmen.append(tabelle);
    box.append(rahmen);
    const kasse = S.kasse(state);
    box.append(element("h4", S.daten.kriegskasse.titel), element("p", Object.entries(S.daten.kriegskasse.bedarf)
      .map(([r, n]) => S.daten.rohstoffe[r].name.replace(/ \(.*\)/, "") + " " + kasse[r] + " / " + n).join(" · ") +
      (S.kasseVoll(state) ? ". " + rules.kasseVollText() : ". Spenden öffnen in Akt " + S.daten.kriegskasse.abAkt + ".")));
    const befreit = state.befreit ?? [];
    box.append(element("h4", "Befreite Dörfer"), element("p", befreit.length ? befreit.map(id => knoten.get(id).name).join(", ")
      : "Noch keine. Der erste Auftrag (q01) einer Stadt befreit mit guter Tat oder Söldner-Weg ihre Dörfer."));
    return box;
  }

  // Bereich B der Menschen: Kontor, Ausrüster, Händler und Schmiede.
  // Porträt-Paket: Bewohner des Ortes aus den Welt-Pools (Variante je Lauf fest, bei Neustart neu).
  function ortsBewohner(panel, ort, archetypen) {
    const leiste = element("ul");
    leiste.className = "orts-bewohner";
    leiste.setAttribute("aria-label", "Leute in " + ort.name);
    for (const archetyp of archetypen) {
      const eintrag = npcPortraets.pool(archetyp, state.laufSeed, ort.id);
      if (!eintrag) continue;
      const li = element("li");
      const bild = element("div");
      bild.className = "orts-bewohner-bild";
      bild.setAttribute("aria-hidden", "true");
      npcPortraets.zeigen(bild, eintrag);
      li.append(bild, element("span", eintrag.name));
      leiste.append(li);
    }
    panel.append(leiste);
  }

  function weltKontorTab(panel) {
    if (!rules.kontorInfo(state)) {
      panel.append(element("h3", "Kontor, Händler & Schmiede"),
        element("p", "Kontor, Ausrüster und Schmiede gibt es in den Städten der Menschen. Dörfer haben keins."));
      return;
    }
    const hier = knoten.get(state.knoten);
    if (hier) ortsBewohner(panel, hier, ["kontor_verwalter", "schmied", "kraeuterheilerin"]);
    weltKontor(panel);
    weltSchmiede(panel);
  }

  function weltHofstaat(panel, ort) {
    if (rules.lage(state)) {
      ortsBewohner(panel, ort, rules.kontorInfo(state) ? ["wachhauptmann_aushang", "schankwirt", "soeldner_anwerber"] : ["bauer_und_dorfbewohner", "schankwirt"]);
      const aushang = weltAushang(ort);
      if (aushang) {
        aushang.open = true;
        panel.append(aushang);
      }
    }
    const siedlung = weltSiedlung();
    if (siedlung) panel.append(siedlung);
    const endgame = weltEndgame();
    if (endgame) panel.append(endgame);
    panel.append(element("h3", "Hofstaat und Diplomatie"));
    const vertraege = (state.vertraege ?? []).map(id => klassen.fraktionen[id].name);
    panel.append(element("p", "Handelsverträge: " + (vertraege.length ? vertraege.join(", ") : "noch keine") +
      ". Ein Vertrag öffnet die Häfen des Partners für deine Überfahrten."));
    if (ort.typ === "hauptstadt" && ort.fraktion !== state.faction) {
      const grund = rules.vertragGrund(state);
      button(panel, "Handelsvertrag mit " + klassen.fraktionen[ort.fraktion].name + " schließen · " + rules.vertragKosten + " " +
        rules.resourceName(state) + (grund ? " · " + grund : ""), () => update(rules.vertragSchliessen(state)), { disabled: Boolean(grund) });
    } else if (ort.fraktion !== state.faction) {
      panel.append(element("p", "Verträge schließt du am Hof der Hauptstadt " + karte.daten.fraktionen[ort.fraktion].hauptstadt + "."));
    }
    panel.append(element("p", "Bündnisse, Vasallen und Eroberung folgen in den nächsten Bauschritten."));
    panel.append(element("h3", "Rekrutierung"));
    panel.append(element("p", "Gruppe: " + (state.party.length + 1) + " von " + (rules.partyLimit + 1) + " Helden. " +
      "Untote und Lebende reisen nicht zusammen, Orks und Zwerge ebenso wenig."));
    if (!renderCandidates(panel)) {
      panel.append(element("p", "Hier wartet niemand auf Anwerbung. Söldner warten in Kornwik, Heidvang, Eiswacht und Glutberg."));
    }
  }

  // Siedlung der Menschen (Bau-Datei): Phase, Ausbau, Gebäude, Grenzstraßen, Garnison, Reparatur und Wiederaufbau.
  function weltSiedlung() {
    const info = rules.siedlungInfo(state);
    if (!info) return null;
    const box = element("details");
    box.className = "welt-siedlung";
    box.open = true;
    box.append(element("summary", "Siedlung und Bau · " + info.name));
    box.append(element("p", "Phase " + info.phase.nr + ": " + info.phase.titel + ". " + info.phase.text));
    if (!info.dorf) {
      box.append(element("p", "Stufe " + info.stufe.stufe + ": " + info.stufe.name + " · Verteidigung " + info.verteidigung +
        " · Garnison " + info.garnison + " · Bauplätze " + info.stufe.plaetze + "."));
      if (info.naechste) {
        button(box, "Ausbauen zu " + info.naechste.name + " · " + rules.systeme.kostenText(info.naechste.kosten) +
          (info.ausbauGrund ? " · " + info.ausbauGrund : ""), () => update(rules.siedlungAusbauen(state)), { disabled: Boolean(info.ausbauGrund) });
      }
      button(box, "Truppe für die Garnison anwerben · " + info.rekrutierenKosten + (info.rekrutierenGrund ? " · " + info.rekrutierenGrund : ""),
        () => update(rules.garnisonRekrutieren(state)), { disabled: Boolean(info.rekrutierenGrund) });
    }
    if (info.beschaedigt) {
      button(box, "Wieder aufbauen · " + info.reparaturKosten + (info.reparierenGrund ? " · " + info.reparierenGrund : ""),
        () => update(rules.ortReparieren(state)), { disabled: Boolean(info.reparierenGrund) });
    }
    const liste = element("ul");
    liste.className = "welt-bauten";
    for (const g of info.gebaeude) {
      const zeile = element("li");
      zeile.append(element("strong", g.name), element("span", " · " + g.wirkung));
      if (g.steht) zeile.append(element("em", " · steht"));
      else button(zeile, "Bauen · " + rules.systeme.kostenText(g.kosten) + (g.grund ? " · " + g.grund : ""),
        () => update(rules.gebaeudeBauen(state, g.id)), { disabled: Boolean(g.grund) });
      liste.append(zeile);
    }
    if (info.gebaeude.length) box.append(element("h4", "Gebäude"), liste);
    if (info.strassen.length) {
      box.append(element("h4", "Grenzstraßen pflastern · " + info.strassenKosten));
      for (const w of info.strassen) {
        if (w.gepflastert) box.append(element("p", "Straße nach " + w.ziel + ": gepflastert."));
        else button(box, "Straße nach " + w.ziel + " pflastern" + (w.grund ? " · " + w.grund : ""), () => update(rules.strasseBauen(state, w.id)), { disabled: Boolean(w.grund) });
      }
    }
    for (const w of info.wiederaufbau) {
      box.append(element("h4", "Wiederaufbau: " + w.titel));
      box.append(element("p", w.wirkung + " Lohn: " + w.silber + " Silber, Ruf +" + w.ruf + "."));
      if (!w.fertig) button(box, "Wiederaufbau beginnen · " + rules.systeme.kostenText(w.kosten) + (w.grund ? " · " + w.grund : ""),
        () => update(rules.wiederaufbau(state, w.id)), { disabled: Boolean(w.grund) });
    }
    return box;
  }

  // Endgame der Menschen: wiederholbare Aufgaben mit Abklingzeit in Etappen.
  function weltEndgame() {
    const liste = rules.endgameListe(state);
    if (!liste.length) return null;
    const box = element("details");
    box.className = "welt-endgame";
    box.append(element("summary", "Ruhmestaten (" + liste.filter(e => !e.grund).length + " bereit)"));
    for (const e of liste) {
      button(box, e.titel + " · " + e.ep + " EP, " + e.silber[0] + "–" + e.silber[1] + " Silber" + (e.wellen > 1 ? " · " + e.wellen + " Wellen" : "") +
        (e.grund ? " · " + e.grund : ""), () => update(rules.endgameStarten(state, e.id)), { disabled: Boolean(e.grund) });
    }
    return box;
  }

  // Händler: Zeugkammer von Eiswacht und Städte mit Zentrallager auf der Weltebene (rules.handelOffen).
  // Patch 2.6.8/2.6.9: Szene am Lagerfeuer nach der Rast (Regieanweisung, Rede des Gefährten, Antworten mit Folgen).
  function lagerfeuer(panel) {
    const szene = rules.lagerSzeneInfo(state);
    if (!szene) return;
    const box = element("section");
    box.className = "lagerfeuer" + (szene.persoenlich ? " lagerfeuer-persoenlich" : "");
    box.setAttribute("aria-label", "Am Lagerfeuer");
    box.append(element("h3", szene.meilenstein ? "Am Lagerfeuer · Meilenstein" : szene.persoenlich ? "Am Lagerfeuer · " + szene.sprecher + " erzählt" : "Am Lagerfeuer"));
    const regie = element("p", szene.regie);
    regie.className = "lagerfeuer-regie";
    const rede = element("p");
    rede.append(element("strong", szene.sprecher + ": "), szene.text);
    box.append(regie, rede);
    const knoepfe = element("div");
    knoepfe.className = "actions lagerfeuer-antworten";
    for (const a of szene.antworten) {
      const knopf = button(knoepfe, a.label, () => update(rules.lagerAntwort(state, a.id)), { disabled: Boolean(state.combat) });
      if (a.folge) knopf.append(element("small", a.folge));
    }
    box.append(knoepfe);
    panel.append(box);
  }

  function weltLager(panel, ort) {
    panel.append(element("h3", "Rasten"));
    const rastGrund = rules.rastGrund(state);
    panel.append(element("p", "LP " + state.health + " / " + rules.healthLimit(state) + (glutSichtbar() ? " · Glut " + state.ember + " / " + rules.emberLimit(state) : "") +
      ". Die Rast stellt die ganze Gruppe wieder her."));
    const rastKosten = rules.rastKosten(state);
    button(panel, "Rasten · " + (rastKosten ? rastKosten + " " + rules.resourceName(state) : "frei") + (rastGrund ? " · " + rastGrund : ""), () => update(rules.rast(state)),
      { disabled: Boolean(rastGrund) });
    if (!rules.lage(state)) weltKontor(panel);
    if (ort.typ === "dorf" && rules.lage(state)) {
      const frei = (state.befreit ?? []).includes(ort.id);
      panel.append(element("h3", "Dorf und Zehnt"), element("p", ort.name + " liefert " + ort.ertrag + " an " + knoten.get(ort.stadt).name + ". " +
        (frei ? "Das Dorf ist befreit und liefert ab Ruf 20 alle " + rules.systeme.daten.zehnt.etappen + " Etappen seinen Zehnt ins Kontor."
          : "Befreie es über den ersten Auftrag (q01) von " + knoten.get(ort.stadt).name + " mit guter Tat oder Söldner-Weg.")));
    } else if (ort.typ === "dorf") {
      panel.append(element("h3", "Ertrag des Dorfes"));
      panel.append(element("p", ort.name + " liefert " + ort.ertrag + " an " + knoten.get(ort.stadt).name + "."));
      const grund = rules.ertragGrund(state);
      button(panel, "Ertrag einholen · +" + rules.ertragMenge + " " + rules.resourceName(state) + (grund ? " · " + grund : ""),
        () => update(rules.ertragEinholen(state)), { disabled: Boolean(grund) });
    } else {
      const doerfer = knoten.doerfer(ort.id).map(id => knoten.get(id));
      panel.append(element("h3", "Dörfer"), element("p", doerfer.map(dorf => dorf.name + " (" + dorf.ertrag + ")").join(", ") +
        (rules.lage(state) ? ". Befreite Dörfer liefern ab Ruf 20 alle " + rules.systeme.daten.zehnt.etappen + " Etappen ihren Zehnt ins Kontor." :
        ort.fraktion === state.faction ? ". Dörfer deiner Fraktion liefern alle " + rules.ertragPause + " Etappen +" + rules.ertragMenge + " " +
          rules.resourceName(state) + "." : ".")));
    }
    panel.append(element("h3", "Zentrallager und Rucksack"));
    const lager = rules.storageSite(state);
    panel.append(element("p", lager ? lager + ". Hier kannst du Gegenstände einlagern und den Rucksack ausbauen."
      : "Kein Zentrallager. Es steht in allen Hauptstädten und in den Städten deiner Fraktion."));
    button(panel, lager ? "Kontor-Lager öffnen" : "Rucksack öffnen", () => openHub(lager ? "storage" : "bag"));
    if (rules.lage(state)) {
      weltHandwerk(panel);
    } else {
      if (rules.handelOffen(state)) button(panel, "Handel öffnen", () => openHub("trade"));
      panel.append(element("h3", "Schmied und Heiler"));
      panel.append(element("p", "Handwerk aus Trophäen und Flora folgt mit der Flora-und-Fauna-Ausarbeitung für alle Gebiete."));
    }
  }

  function weltHeld(panel) {
    const progress = rules.progression(state);
    panel.append(element("h3", "Held und Stufenaufstieg"));
    panel.append(element("p", rules.title(state) + " · Erfahrungsstufe " + progress.level + " · " + progress.xp + " EP"));
    const open = [];
    if (progress.points) open.push(progress.points + " Grundwertpunkte");
    const offeneRaenge = rules.faehigkeitInfo(state)?.punkte ?? 0;
    if (offeneRaenge && rules.faehigkeitInfo(state).liste.some((f) => !f.grund)) open.push(offeneRaenge + " Fähigkeitspunkte");
    if (!state.build.spez && rules.spezBereit(state)) open.push("Spezialisierung");
    if (rules.meisterBereit(state)) open.push("Meisterklasse");
    panel.append(element("p", open.length ? "Offen: " + open.join(", ") + "." : "Zurzeit ist nichts zu verteilen."));
    button(panel, "Charakterfenster öffnen", () => openSheet(open.length ? "aufstieg" : "werte"));
    // Menschen: Stufe 30, Signatur-Rang, Meister-Talente (Stufe 22–30) und Blut der Ahnen (je 5000 EP über Stufe 30).
    const auf = rules.aufstiegInfo(state);
    if (!auf) return;
    // Patch 2.5.5: Fähigkeitsränge (1 Punkt je Stufe 2–20, Rang 2/3/4 ab Stufe 3/8/15).
    faehigkeitsRaenge(panel, element("h4"));
    panel.append(element("p", "Stufe " + auf.stufe + " von " + auf.maxStufe + " · Signatur-Rang " + auf.signaturRang +
      " · Meister-Talentpunkte frei: " + auf.talentPunkte + " (je einer auf Stufe 21 bis 30)."));
    if (auf.stufe >= auf.talentStufen[0] || Object.keys(state.talente ?? {}).length) {
      // Patch 2.6.2: fünf Talentbäume, jeder Rang mit eigener Wirkung.
      panel.append(element("h4", "Meister-Talente · 5 Pfade, je 3 Ränge"));
      for (const t of auf.talente) {
        const naechster = t.raenge?.[t.rang];
        const erreicht = (t.raenge ?? []).slice(0, t.rang).map((r) => "Rang " + r.rang + ": " + r.text).join(" ");
        if (erreicht) panel.append(element("p", t.name + " · " + erreicht));
        button(panel, t.name + " · Rang " + t.rang + "/" + t.max + (naechster ? " → Rang " + naechster.rang + ": " + naechster.text : " · voll") +
          (t.grund && naechster ? " · " + t.grund : ""), () => update(rules.talentLernen(state, t.id)), { disabled: Boolean(t.grund) });
      }
    }
    if (auf.stufe >= auf.maxStufe) {
      panel.append(element("h4", "Blut der Ahnen · freie Punkte " + auf.ahnenPunkte));
      for (const p of auf.ahnen) {
        button(panel, p.name + " · Rang " + p.rang + "/" + p.max + " · " + p.wirkung + (p.grund ? " · " + p.grund : ""),
          () => update(rules.ahnenLernen(state, p.id)), { disabled: Boolean(p.grund) });
      }
    }
  }

  // Reiseziele als Wegweiser-Zeilen (UI-Überarbeitung 19. 11. 2026): links Ziel, Mitte Weg und Gefahr, rechts die Kosten.
  // Ein Klick auf die Zeile bricht auf. Ab erhöhter Gefahr (Hinterhalt ab 30 %) fragt die Zeile einmal nach.
  const wegweiserGefahr = 0.3;
  const wegweiserNachfrage = { ziel: null };
  const reiseZieleSortiert = () => rules.reiseZiele(state)
    .sort((a, b) => (a.ziel.typ === "dorf") - (b.ziel.typ === "dorf") || a.ziel.name.localeCompare(b.ziel.name, "de"));

  function wegweiser(weg, kompakt = false) {
    const item = element("li");
    item.className = "wegweiser welt-" + weg.sicherheit + (weg.gefahr >= wegweiserGefahr ? " wegweiser-gefahr" : "");
    const knopf = element("button");
    knopf.type = "button";
    knopf.className = "wegweiser-knopf";
    knopf.dataset.ziel = weg.zielId;
    knopf.disabled = Boolean(weg.grund);
    const links = element("span");
    links.className = "wegweiser-ziel";
    const typ = element("small", knoten.typNamen[weg.ziel.typ] + " · " + klassen.fraktionen[weg.ziel.fraktion].name);
    links.append(element("strong", weg.ziel.name), typ);
    const mitte = element("span");
    mitte.className = "wegweiser-weg";
    const gefahr = element("em", "Hinterhalt " + rkPercent(weg.gefahr));
    mitte.append(element("span", knoten.kantenNamen[weg.kantenTyp] + (weg.pass ? " (" + weg.pass + ")" : "") + " · " +
      knoten.sicherheitNamen[weg.sicherheit] + " · "), gefahr);
    if (!kompakt && weg.gegner.length) {
      const gegner = element("small", weg.gegner.join(", "));
      gegner.className = "wegweiser-gegner";
      mitte.append(gegner);
    }
    const kosten = element("span");
    kosten.className = "wegweiser-kosten";
    for (const text of [weg.kostenRessource ? weg.kostenRessource + " " + rules.resourceName(state) : "", weg.kostenGold ? weg.kostenGold + " Silber" : ""].filter(Boolean)) {
      kosten.append(element("span", text));
    }
    if (!kosten.children.length) kosten.append(element("span", "frei"));
    knopf.append(links, mitte, kosten);
    knopf.title = "Reise nach " + weg.ziel.name + (weg.gegner.length ? " · Gegner: " + weg.gegner.join(", ") : "");
    knopf.setAttribute("aria-label", "Reise nach " + weg.ziel.name + ", " + knoten.kantenNamen[weg.kantenTyp] + ", Hinterhalt " +
      rkPercent(weg.gefahr) + ", " + kosten.textContent + (weg.grund ? ", gesperrt: " + weg.grund : ""));
    item.append(knopf);
    const zusatz = [];
    if (weg.probe) zusatz.push(["Probe auf Willenskraft oder Intelligenz, Glut +" + weg.glut, ""]);
    if (weg.rabatt) zusatz.push(["1 Vorrat günstiger dank Auftrag", ""]);
    if (weg.auftrag) {
      const auftrag = rules.auftraege(state).find(entry => entry.id === weg.auftrag);
      zusatz.push(["Auftrag unterwegs: " + auftrag.titel + ". Auf diesem Weg stellen sich dir die Gegner.", "welt-aushang-hinweis"]);
    }
    if (weg.letzterVorrat && !weg.grund) zusatz.push(["Achtung: Diese Reise braucht deinen letzten Vorrat. Bei 0 ist das Spiel verloren.", "welt-alarm"]);
    if (weg.grund) zusatz.push(["Gesperrt: " + weg.grund, "wegweiser-grund"]);
    const nachfrage = wegweiserNachfrage.ziel === weg.zielId && !weg.grund;
    if (nachfrage) {
      item.classList.add("wegweiser-bestaetigen");
      zusatz.push(["Hohe Gefahr: Hinterhalt " + rkPercent(weg.gefahr) + ". Noch einmal klicken, um aufzubrechen.", "wegweiser-frage"]);
    }
    for (const [text, klasse] of zusatz) {
      const zeile = element("p", text);
      zeile.className = "wegweiser-zusatz" + (klasse ? " " + klasse : "");
      item.append(zeile);
    }
    knopf.addEventListener("click", () => {
      if (weg.gefahr >= wegweiserGefahr && wegweiserNachfrage.ziel !== weg.zielId) {
        wegweiserNachfrage.ziel = weg.zielId;
        renderScene();
        renderMap();
        document.querySelector('.wegweiser-bestaetigen [data-ziel="' + weg.zielId + '"]')?.focus();
        return;
      }
      wegweiserNachfrage.ziel = null;
      welt.tab = "aufbruch";
      marschieren([weg.zielId]);
    });
    return item;
  }

  function weltAufbruch(panel) {
    panel.append(element("h3", "Aufbruch"));
    panel.append(element("p", rules.lage(state)
      ? "Jede Reise-Etappe verbraucht Nahrung (1 im Kernland, 2 im Grenzland/Pass) und kann eine Begegnung auslösen. Klick auf eine Zeile, um aufzubrechen."
      : "Jede Reise ist eine Etappe: Die Weltleisten ändern sich, und unterwegs würfelt das Land eine Begegnung aus. " +
        "Jeder Weg hat seine eigene Gefahr für einen Hinterhalt. Klick auf eine Zeile, um aufzubrechen."));
    const list = element("ul");
    list.className = "welt-ziele wegweiser-liste";
    for (const weg of reiseZieleSortiert()) list.append(wegweiser(weg));
    panel.append(list);
  }

  // Gefährten und Söldner vor Ort, in Szenen der Handlung und im Hofstaat des Stadt-Hubs.
  function renderCandidates(parent) {
    const candidates = rules.candidates(state);
    if (candidates.length) {
      const recruitment = element("section");
      recruitment.className = "recruitment";
      recruitment.append(element("h3", "Gefährten vor Ort"));
      if (state.party.length >= rules.partyLimit) {
        recruitment.append(element("p", "Deine Gruppe ist voll. Am Wachhof oder in einer Stadt mit Zentrallager kannst du jemanden verabschieden."));
      }
      for (const [id, companion] of candidates) {
        const candidate = element("article");
        candidate.append(element("h4", companion.name + " · " + klassen.grundklassen[companion.klasse].name),
          element("p", companion.introduction),
          element("p", companion.ability + " · " + companionEffect(companion)));
        if (!companion.soeldner) candidate.append(element("p", "Sympathie: " + rules.relationship(state, id).score));
        const status = rules.recruitment(state, id);
        if (status === "hire") {
          const cost = rules.hireCost(state, id);
          candidate.append(element("p", "Söldner · startet auf Erfahrungsstufe " + Math.max(1, rules.level(state) - 1) +
            (cost < companion.soeldner.kosten ? " · Charisma-Rabatt" : "")));
          button(candidate, companion.name + " anwerben · " + cost + " Silber", () => update(rules.hire(state, id)),
            { disabled: state.party.length >= rules.partyLimit || state.silver < cost });
          // Technische Spezifikation: alternativ 15 Fraktionsvorrat (mit Charisma-Rabatt), der Vorrat bleibt über 0.
          const supply = rules.hireCost(state, id, rules.vorratAnwerbung);
          button(candidate, companion.name + " anwerben · " + supply + " " + rules.resourceName(state), () => update(rules.hire(state, id, "vorrat")),
            { disabled: state.party.length >= rules.partyLimit || state.ressource - supply < 1 });
        } else if (status === "incompatible") {
          candidate.append(element("p", "Volksgrenzen: Untote und Lebende reisen nicht zusammen, Orks und Zwerge ebenso wenig."));
        } else if (status === "ready") {
          button(candidate, companion.name + " mitnehmen", () => update(rules.recruit(state, id)),
            { disabled: state.party.length >= rules.partyLimit });
        } else if (status === "auftrag") {
          candidate.append(element("p", "Erst nach dem Auftrag „" + nebenquests.fuerOrt(companion.knoten).auftraege
            .find(auftrag => auftrag.id === companion.auftrag).titel + "“ am Aushang von " + knoten.get(companion.knoten).name + "."));
        } else if (status === "promise") {
          candidate.append(element("p", world.recruitmentQuests[id].text + " Frist: " + world.recruitmentQuests[id].turns + " Schritte ab Annahme."));
          button(candidate, "Auftrag annehmen · " + world.recruitmentQuests[id].title, () => update(rules.promise(state, id)));
        } else if (status === "task") {
          const plan = world.recruitmentQuests[id];
          candidate.append(element("p", plan.text + " Noch " + (rules.questEntries(state).find(quest => quest.id === "companion-" + id)?.remaining ?? plan.turns) + " Schritte."));
          if (plan.salary) {
            button(candidate, "Sold zahlen · " + plan.salary + " Silber", () => update(rules.completeQuest(state, id)),
              { disabled: state.silver < plan.salary });
            button(candidate, "Sold später zahlen · " + plan.salary + " Silber in 30 Schritten", () => update(rules.completeQuest(state, id, true)));
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
      parent.append(recruitment);
    }
    return candidates.length > 0;
  }

  // Klasse, Ressource, Spezialisierung und Meisterklasse im Charakterbereich.
  // Angriffe, Zauber und Techniken der Klasse (Kampfdokument, 17. 11. 2026), für Seitenleiste und Charakterfenster.
  function abilityListing() {
    const ressource = klassen.fraktionen[state.faction].ressource;
    const abilityList = element("ul");
    abilityList.className = "ability-list";
    for (const f of rules.abilities(state)) {
      const item = element("li");
      const cost = f.kostenWert ? f.kostenWert + " " + f.zahlung : "kostenlos";
      const extra = [cost, f.einmal ? "1 × pro Schlacht" : f.abklingzeitWert ? "AK " + f.abklingzeitWert : "",
        f.ressource ? f.ressource + " " + ressource : "", f.spezialisiert ? "Spezialisierung +50 %" : ""].filter(Boolean).join(" · ");
      item.append(element("strong", f.id[0] === "m" ? "Meister · " + f.name : "Stufe " + f.stufe + " · " + f.name),
        element("span", " " + f.wirkung + " (" + extra + ")" + (f.frei ? "" : " · noch gesperrt")));
      if (!f.frei) item.className = "locked";
      abilityList.append(item);
    }
    return abilityList;
  }

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
        " eine Fähigkeit ab Stufe 3 um 25 %, die Stufe-20-Fähigkeit kostet 3. Derselbe Vorrat (0 bis 100) bezahlt Reisen, Rast und Verträge; im Kampf sinkt er nie unter 1."),
    ];
    const abilityList = abilityListing();
    lines.push(element("h4", rules.kampfwerte(state).manaMax ? "Angriffe und Zauber" : "Angriffe und Techniken"), abilityList);
    if (people === "orks") lines.push(element("p", state.rausch ? "Kampfrausch bereit · +2 Schaden beim nächsten Angriff."
      : "Nach jeder gewonnenen Schlacht trägt dich eine Runde Kampfrausch."));
    const spez = state.build.spez;
    if (spez) {
      lines.push(element("p", "Spezialisierung " + data[spez.variante][0] + ": " + data[spez.variante][1] + "."));
    } else {
      lines.push(element("p", "Spezialisierung " + rules.spezHinweis(state) + ": " + data.a[0] + " oder " + data.b[0] + "."));
    }
    lines.push(element("p", state.build.meister ? "Meisterklasse " + rules.title(state) + " · " + master.faehigkeit + "."
      : "Meisterklasse nach der " + master.vereinigung + ": " + master.name + "."));
    sheet.replaceChildren(...lines);
    if (entwurfQuellen().some(([id]) => id !== "stufe") && !state.combat && state.health) {
      button(sheet, !spez ? "Spezialisierung wählen" : "Zur Meisterklasse aufsteigen", () => openSheet("aufstieg"));
    }
  }

  // Kopf der Seitenleiste: Balken für Lebenspunkte, Ausdauer, Mana und Glut, darunter Vorrat und Gleichgewicht.
  // Glut, Glutgleichgewicht und Glutgaben zeigt das HUD bei den Menschen nur dem Orden der Flamme (Patch 2.5.3).
  const etappeJetzt = () => rules.lage(state) ? rules.lage(state).etappen : state.runde ?? 0;
  const glutSichtbar = () => !rules.lage(state) || state.faction === "orden";

  function renderVitals() {
    const values = rules.kampfwerte(state);
    const lage = rules.lage(state);
    // Patch 2.5.0: Mana nur für Pyromant, Kleriker der Flamme, Glutpaladin und Inquisitor, Glut bei den Menschen nur im Orden.
    const zeigeMana = values.manaMax && (!lage || lage.klasse?.mana);
    const zeigeGlut = glutSichtbar();
    const bars = [
      ["hp", "Lebenspunkte", state.health, rules.healthLimit(state)],
      ["ausdauer", "Ausdauer", values.ausdauer, values.ausdauerMax],
      ...(zeigeMana ? [["mana", "Mana", values.mana, values.manaMax]] : []),
      ...(zeigeGlut ? [["glut", "Glut", state.ember, rules.emberLimit(state)]] : []),
    ];
    const vitals = el("vitals");
    // Gruppen-HUD über den Heldenbalken: Gruppen-Moral (0–100) mit Rang. Proviant steht darunter als Zahl ohne Obergrenze.
    const hud = lage ? [["moral", "Gruppen-Moral · " + lage.moralStufe.name, lage.moral, 100, null]] : [];
    const hudBlocks = hud.map(([kind, label, value, max, warnung]) => {
      const block = element("div");
      block.className = "vital vital-" + kind + (warnung ? " vital-low" : "");
      block.style.setProperty("--fill", Math.max(0, Math.min(1, value / max)) * 100 + "%");
      block.append(element("dt", label), element("dd", warnung ? value + " · " + warnung : value + " / " + max));
      return block;
    });
    vitals.replaceChildren(...hudBlocks, ...bars.map(([kind, label, value, max]) => {
      const block = element("div");
      block.className = "vital vital-" + kind + (kind === "hp" && value <= max * .3 ? " vital-low" : "");
      block.style.setProperty("--fill", (max ? Math.max(0, Math.min(1, value / max)) * 100 : 0) + "%");
      block.append(element("dt", label), element("dd", value + " / " + max));
      return block;
    }));
    const stock = element("div");
    stock.className = "vital-line vital-stock";
    stock.append(element("dt", values.ressourceName), element("dd", values.ressource + " / " + rules.vorratMax));
    // UI-Überarbeitung 19. 11. 2026: Proviant als Zahl, Glutgleichgewicht nur mit sichtbarer Glut, sonst Rüstungsschutz.
    const proviant = element("div");
    proviant.className = "vital-line vital-proviant" + (state.ressource <= 0 ? " vital-line-low" : "");
    proviant.append(element("dt", "Proviant"), element("dd", state.ressource <= 0 ? "0 Nahrung · ENTKRÄFTET (−15 Moral je Etappe)"
      : state.ressource + " Nahrung"));
    const zweite = element("div");
    if (zeigeGlut) {
      zweite.className = "vital-line vital-balance";
      zweite.style.setProperty("--mark", (Math.max(-4, Math.min(4, state.balance)) + 4) / 8 * 100 + "%");
      const scale = element("span");
      scale.className = "balance-scale";
      scale.setAttribute("aria-hidden", "true");
      zweite.append(element("dt", "Glutgleichgewicht"), element("dd", state.balance === 0 ? "0 · im Gleichgewicht" :
        state.balance < 0 ? state.balance + " · Erneuerung" : "+" + state.balance + " · Zerstörung"), scale);
    } else {
      zweite.className = "vital-line vital-schutz";
      zweite.append(element("dt", "Rüstungsschutz"), element("dd", String(rules.protection(state) + rules.gearBonus(state, "armor"))));
    }
    vitals.append(...(lage ? [proviant] : [stock]), zweite);
    document.querySelector(".hero-head .glut-help").hidden = !zeigeGlut;
  }

  // Patch 2.6.15: Farbthema nach Fraktion (Menschen je Fraktion, andere Völker Platzhalter je Volk, Rückfall Kronreich).
  const themaFraktion = { kronreich: "THEME_KRONREICH", orden: "THEME_ORDEN_DER_FLAMME", haefen: "THEME_FREIE_HAEFEN" };
  const themaVolk = { elfen: "THEME_ELFEN_PLACEHOLDER", orks: "THEME_ORKS_PLACEHOLDER", zwerge: "THEME_ZWERGE_PLACEHOLDER", untote: "THEME_UNTOTE_PLACEHOLDER" };
  function themaSetzen(fraktion) {
    const volkId = klassen.fraktionen[fraktion]?.volk;
    document.documentElement.dataset.factionTheme = themaFraktion[fraktion] ?? themaVolk[volkId] ?? "THEME_KRONREICH";
  }
  function render() {
    themaSetzen(state.faction);
    renderSchwierigkeit();
    setPortrait(el("avatar"), state);
    el("hero-name").textContent = state.name;
    el("hero-origin").textContent = klassen.voelker[klassen.fraktionen[state.faction].volk].name + " · " +
      klassen.fraktionen[state.faction].name + " · " + rules.title(state);
    const finishedRescue = state.marks.includes("joren-gerettet") || state.marks.includes("joren-verloren");
    const skarnDone = state.marks.includes("runen-geschuetzt") || state.marks.includes("runen-verbrannt");
    // Patch 2.6.12: Kopfkarte mit aktuellem Akt der Hauptquest.
    el("objective-heading").textContent = aktTitel() || "Reiseauftrag";
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
    renderVitals();
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
      button(training, "Punkte verteilen", () => openSheet("aufstieg"));
    }
    el("legacy-build").hidden = !state.umschulung || Boolean(state.combat) || !state.health;
    journalZeitleiste();
    renderScene();
    renderMap();
    if (el("character-sheet").open) renderSheet();
    if (el("reisekarte").open) renderReisekarte();
  }

  for (const [id, data] of Object.entries(klassen.voelker)) volk.add(new Option(data.name, id));
  for (const [id, label] of Object.entries(world.attributes)) volkWahl.add(new Option(label, id));

  function fillFactions() {
    const allowed = Object.entries(klassen.fraktionen).filter(([id, data]) => data.volk === volk.value &&
      (!editingLegacy || rules.originOf(id) === state.origin));
    const previous = origin.value;
    origin.replaceChildren(...allowed.map(([id, data]) =>
      // Patch 2.6.16: Kein alter Vorrats-Hinweis mehr in der Fraktionsauswahl.
      new Option(data.name + " · " + data.schwierigkeit, id)));
    if (allowed.some(([id]) => id === previous)) origin.value = previous;
    const people = klassen.voelker[volk.value];
    el("volk-description").textContent = people.text;
    el("volk-choice").hidden = !people.wahl;
    fillClasses();
  }

  function fillClasses() {
    // Patch 2.6.16: Die Charaktererstellung zeigt das Farbthema der gewählten Fraktion sofort.
    themaSetzen(origin.value);
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
      element("p", "Im Kampf: " + (kit.descriptionOhneGlut && !["orden"].includes(origin.value) && klassen.fraktionen[origin.value].volk === "menschen"
        ? kit.descriptionOhneGlut : kit.description)),
    );
    // UI-Überarbeitung 19. 11. 2026: Die Spezialisierungen stehen eingeklappt unter der Klassenbeschreibung.
    // Menschen spezialisieren sich ab Erfahrungsstufe 10 (Patch 2.0.0), die anderen Völker ab Quest-Stufe 3.
    const spez = element("details");
    spez.className = "class-spez";
    spez.append(element("summary", "Spezialisierung " + (klassen.fraktionen[origin.value].volk === "menschen" ? "ab Stufe 10"
      : "ab Quest-Stufe " + klassen.regeln.spezialisierungStufe) + ": " + data.a[0] + " oder " + data.b[0]));
    for (const [name, text] of [data.a, data.b]) {
      const zeile = element("p");
      zeile.append(element("strong", name + ": "), text);
      spez.append(zeile);
    }
    box.append(spez);
    // Patch 2.6.16: Zusammenfassung in der rechten Spalte (Fraktionsboni, Startort, Klassenrolle, Spezialisierung).
    const fr = klassen.fraktionen[origin.value];
    el("summary-title").textContent = rules.className(origin.value, role.value) + " · " + fr.name;
    el("summary-faction").textContent = "Fraktion: " + bonusText(fr.bonus) + " · Start in " + startpunkte.ort(origin.value);
    el("summary-class").textContent = "Klasse: " + bonusText(profile.bonus) + " · " + profile.rolle + " · Spezialisierung " +
      (fr.volk === "menschen" ? "ab Stufe 10" : "ab Quest-Stufe " + klassen.regeln.spezialisierungStufe) + ": " + data.a[0] + " oder " + data.b[0];
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
      let next = rules.create(name.value, origin.value, appearance.value, Number(variant.value), role.value, draftBuild());
      next = rules.schwierigkeitWaehlen(next, el("schwierigkeit").value, { neu: true, freigeschaltet: hardcoreFreigeschaltet() });
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
  // Patch 2.6.10: Einstellungen. Hauptmenü erst nach Bestätigung, Laden aus dem lokalen Platz, vom Wegpunkt oder aus einer Datei.
  el("menu").addEventListener("click", () => { el("menu-confirm").hidden = false; el("menu-yes").focus(); });
  el("menu-no").addEventListener("click", () => { el("menu-confirm").hidden = true; el("menu").focus(); });
  el("menu-yes").addEventListener("click", () => { el("menu-confirm").hidden = true; showHome(); });
  el("save-now").addEventListener("click", () => save());
  el("load-local").addEventListener("click", () => {
    try {
      const gespeichert = localStorage.getItem(key);
      if (gespeichert === null) throw new Error("leer");
      showPlay(rules.read(gespeichert));
      el("load-status").textContent = "Letzter lokaler Spielstand geladen.";
    } catch {
      el("load-status").textContent = "Kein gültiger lokaler Spielstand gefunden.";
    }
  });
  el("load-wegpunkt").addEventListener("click", () => {
    const stand = vorKampfStand();
    if (!stand) {
      el("load-status").textContent = "Es gibt noch keinen Wegpunkt vor einer Schlacht.";
      return;
    }
    showPlay(stand);
    el("load-status").textContent = "Wegpunkt vor der letzten Schlacht geladen.";
  });
  el("save-file-play").addEventListener("change", async (event) => {
    const input = event.currentTarget;
    const file = input.files[0];
    input.value = "";
    if (!file) return;
    try {
      if (file.size > 64 * 1024) throw new Error("Datei zu groß");
      showPlay(rules.read(await file.text()));
      el("load-status").textContent = "Spielstand aus der Datei geladen.";
    } catch {
      el("load-status").textContent = "Diese Datei ist kein gültiger Aschenkrone-Spielstand.";
    }
  });
  // Optionen bleiben im Browser (je Gerät), sie gehören nicht zum Spielstand.
  const optionenKey = key + ".optionen";
  const optionen = (() => {
    const standard = { punkte: true, einwuerfe: "NORMAL", kampflog: "AUSFÜHRLICH" };
    try { return { ...standard, ...JSON.parse(localStorage.getItem(optionenKey) ?? "{}") }; } catch { return standard; }
  })();
  const optionenSichern = () => { try { localStorage.setItem(optionenKey, JSON.stringify(optionen)); } catch { /* ohne Speicher gelten die Standardwerte */ } };
  el("opt-punkte").checked = optionen.punkte;
  el("opt-einwuerfe").value = optionen.einwuerfe;
  el("opt-kampflog").value = optionen.kampflog;
  document.body.dataset.kampflog = optionen.kampflog === "KOMPAKT" ? "kompakt" : "voll";
  el("opt-punkte").addEventListener("change", (e) => { optionen.punkte = e.currentTarget.checked; optionenSichern(); });
  el("opt-einwuerfe").addEventListener("change", (e) => { optionen.einwuerfe = e.currentTarget.value; optionenSichern(); });
  el("opt-kampflog").addEventListener("change", (e) => {
    optionen.kampflog = e.currentTarget.value;
    document.body.dataset.kampflog = optionen.kampflog === "KOMPAKT" ? "kompakt" : "voll";
    optionenSichern();
  });
  window.aschenkroneOptionen = optionen;
  el("opt-schwierigkeit").addEventListener("change", (e) => {
    const neu = rules.schwierigkeitWaehlen(state, e.currentTarget.value);
    if (neu === state) { renderSchwierigkeit(); return; }
    update(neu);
  });
  const schwierigkeitBeschreiben = () => {
    const grad = rules.schwierigkeitsGrad(el("schwierigkeit").value);
    el("schwierigkeit-description").textContent = grad.kurzbeschreibung +
      (hardcoreFreigeschaltet() ? "" : " Hardcore: " + rules.schwierigkeitDaten.hardcore_freischaltung.gesperrt_anzeige_in_ui.hinweis_text.replace(/^Gesperrt: /, "gesperrt. "));
  };
  schwierigkeitOptionen(el("schwierigkeit"), rules.schwierigkeitDaten.standard_auswahl, { neu: true });
  schwierigkeitBeschreiben();
  el("schwierigkeit").addEventListener("change", schwierigkeitBeschreiben);
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
