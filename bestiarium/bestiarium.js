"use strict";

const types = { fauna: "Fauna", alpha: "Alphatiere", flora: "Flora" };
const statsLabels = ["Lebenspunkte", "Angriff", "Rüstung", "Tempo"];
const el = (id) => document.getElementById(id);
const search = el("search");
const entriesList = el("entries");
const detail = el("detail");

function node(tag, content, className) {
  const element = document.createElement(tag);
  if (content) element.textContent = content;
  if (className) element.className = className;
  return element;
}

function button(label, callback) {
  const element = node("button", label);
  element.type = "button";
  element.addEventListener("click", callback);
  return element;
}

function pair(list, label, value) {
  if (value != null && value !== "") {
    list.append(node("dt", label), node("dd", String(value)));
  }
}

function getEntries(land, type) {
  return land[type].map((row) => {
    const [name] = row;
    if (type === "fauna") {
      const [, location, behavior, ability, weakness, trophy, image, stats, alias, caption] = row;
      return { name, location, behavior, ability, weakness, trophy, image, stats, alias, caption };
    }
    if (type === "alpha") {
      const [, description, behavior, stats, ability, image] = row;
      return { name, description, behavior, stats, ability, image };
    }
    const [, location, ability] = row;
    return { name, location, ability };
  });
}

function normalized(text) {
  return text.toLocaleLowerCase("de").normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("ß", "ss");
}

let currentLand = lands[0];
let currentType = "fauna";
let currentName = currentLand.fauna[0][0];

const landButtons = new Map(lands.map((land) => [land.id, button(land.name, () => {
  currentLand = land;
  currentName = null;
  updateRegions();
  render();
})]));
el("lands").append(...landButtons.values());

const typeButtons = new Map(Object.entries(types).map(([type, label]) => [type, button(label, () => {
  currentType = type;
  currentName = null;
  render();
})]));
el("kinds").append(...typeButtons.values());

function updateRegions() {
  const regions = el("region-list");
  regions.replaceChildren();
  for (const [name, description] of currentLand.regions) {
    pair(regions, name, description);
  }
}

function renderDetail(entry) {
  detail.replaceChildren();
  if (!entry) {
    detail.append(node("p", "Keine passenden Einträge in dieser Ansicht."));
    return;
  }

  const context = [currentLand.name, types[currentType]];
  if (currentType !== "flora") context.push("Stufenbereich " + currentLand.level);
  detail.append(node("p", context.join(" · "), "category"), node("h2", entry.name));

  const sheet = node("div", null, "sheet");
  if (entry.image) {
    const figure = node("figure");
    const picture = node("img");
    picture.src = "bilder/" + entry.image;
    picture.alt = entry.caption || entry.name;
    picture.width = 1024;
    picture.height = 1024;
    figure.append(picture);
    if (entry.caption) figure.append(node("figcaption", entry.caption));
    picture.addEventListener("error", () => {
      figure.remove();
      sheet.classList.remove("with-image");
    }, { once: true });
    sheet.append(figure);
    sheet.classList.add("with-image");
  }

  const facts = node("div");
  if (entry.description) facts.append(node("p", entry.description));
  const list = node("dl");
  pair(list, currentType === "flora" ? "Fundort" : "Region", entry.location);
  pair(list, "Verhalten", entry.behavior);
  pair(list, currentType === "flora" ? "Wirkung" : "Fähigkeiten", entry.ability);
  pair(list, "Schwäche", entry.weakness);
  pair(list, "Trophäe", entry.trophy);
  if (entry.alias) pair(list, "Name in der Bildvorlage", entry.alias);
  if (list.childElementCount) facts.append(list);
  if (entry.stats) {
    const stats = node("dl", null, "stats");
    entry.stats.forEach((value, index) => {
      if (value == null) return;
      const stat = node("div");
      pair(stat, statsLabels[index], value);
      stats.append(stat);
    });
    facts.append(stats);
  }
  sheet.append(facts);
  detail.append(sheet);
}

function render() {
  for (const [id, element] of landButtons) {
    element.setAttribute("aria-pressed", id === currentLand.id);
  }
  for (const [type, element] of typeButtons) {
    element.setAttribute("aria-pressed", type === currentType);
  }

  const query = normalized(search.value.trim());
  const entries = getEntries(currentLand, currentType).filter((entry) =>
    normalized([entry.name, entry.alias, entry.location].filter(Boolean).join(" ")).includes(query)
  );
  const selected = entries.find((entry) => entry.name === currentName) ?? entries[0];
  currentName = selected?.name;
  entriesList.replaceChildren(...entries.map((entry) => {
    const item = node("li");
    const control = button(entry.name, () => {
      currentName = entry.name;
      for (const entryButton of entriesList.querySelectorAll("button")) {
        entryButton.setAttribute("aria-pressed", entryButton === control);
      }
      renderDetail(entry);
    });
    control.setAttribute("aria-pressed", entry === selected);
    control.setAttribute("aria-controls", "detail");
    if (entry.location) control.append(node("small", entry.location));
    item.append(control);
    return item;
  }));
  renderDetail(selected);
}

search.addEventListener("input", render);
updateRegions();
render();
