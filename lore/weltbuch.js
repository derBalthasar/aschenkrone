"use strict";

(() => {
  function element(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  const nav = document.getElementById("voelker-nav");
  const entries = document.getElementById("eintraege");
  for (const people of lorePeoples) {
    const link = element("a", people.name);
    link.href = "#" + people.id;
    nav.append(link);

    const article = document.createElement("article");
    article.id = people.id;
    article.append(element("h3", people.name), element("p", people.history));
    for (const faction of people.factions) {
      const entry = document.createElement("details");
      const cities = document.createElement("ul");
      cities.className = "cities";
      for (const city of faction.cities) cities.append(element("li", city));
      entry.append(element("summary", faction.name + " · " + faction.capital),
        element("p", faction.description), element("h4", "Städte und Häfen"), cities);
      article.append(entry);
    }
    entries.append(article);
  }
})();
