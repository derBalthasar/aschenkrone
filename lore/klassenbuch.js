"use strict";

// Zeigt das Klassensystem aus spiel/klassen.js im Weltbuch an.
(() => {
  const root = document.getElementById("klassen-inhalt");
  if (!root || typeof klassen === "undefined") return;
  const K = klassen;
  const keys = Object.keys(K.grundwerte);
  const signed = (value) => value ? (value > 0 ? "+" : "−") + Math.abs(value) : "";

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function table(head, rows, caption) {
    const wrap = element("div");
    wrap.className = "tabelle";
    const result = element("table");
    if (caption) result.append(element("caption", caption));
    const thead = element("thead");
    const headRow = element("tr");
    for (const cell of head) {
      const th = element("th", cell);
      th.scope = "col";
      headRow.append(th);
    }
    thead.append(headRow);
    const body = element("tbody");
    for (const row of rows) {
      const tr = element("tr");
      row.forEach((cell, index) => {
        const node = element(index ? "td" : "th", cell);
        if (!index) node.scope = "row";
        tr.append(node);
      });
      body.append(tr);
    }
    result.append(thead, body);
    wrap.append(result);
    return wrap;
  }

  const bonusRow = (name, bonus, note) => [name, ...keys.map((key) => signed(bonus[key] ?? 0)), note ?? ""];
  const attributeHead = (first) => [first, ...keys.map((key) => K.grundwerte[key])];

  root.append(element("p", "Jeder Held gehört zu einer von sechs Grundklassen, die es in allen 15 Fraktionen gibt: Krieger, Wächter, Späher, Magier, Heiler/Priester und Schurke. Jede Fraktion gibt jeder Klasse einen eigenen Namen, eine eigene Spielweise und eine eigene Art, die Fraktionsressource zu nutzen. So bleibt das System ausgewogen, und trotzdem spielt sich ein Huskarl des Kronreichs ganz anders als ein Aschenkrieger."));

  root.append(element("h3", "Grundregeln"));
  root.append(element("p", "Jeder Held hat zwei Ebenen von Werten: fünf Grundwerte (Talent, bei der Charakterwahl festgelegt) und sieben Fertigkeiten (Ausbildung, 0 bis 5). Die Grundwerte bestimmen, wie hoch eine Fertigkeit steigen kann."));
  const rules = element("ol");
  for (const [title, text] of K.grundregeln) {
    const item = element("li");
    item.append(element("strong", title + ". "), text);
    rules.append(item);
  }
  root.append(rules);

  root.append(element("h3", "Welche Fertigkeit an welchem Grundwert hängt"));
  root.append(table(["Fertigkeit", "Grundwert", "Wofür"],
    Object.values(K.fertigkeiten).map((skill) => [skill.name, K.grundwerte[skill.grundwert], skill.zweck])));

  root.append(element("h3", "Was die Grundwerte direkt bewirken"));
  root.append(element("p", "Grundwerte wirken auch direkt im Spiel, nicht nur über die Grenzen der Fertigkeiten. Es gibt drei Stufen: Ein Wert von 8 oder weniger gibt −1, 16 bis 19 geben +1 und 20 gibt +2. Dazwischen gibt es weder Bonus noch Malus."));
  root.append(table(["Grundwert", "Wirkt auf"], keys.map((key) => [K.grundwerte[key], K.grundwertWirkung[key]])));

  root.append(element("h3", "Grundwerte: Bonus und Malus"));
  root.append(element("p", "Bei der Charakterwahl stehen die Werte aus Volk, Fraktion und Klasse sofort als Grundwerte da. Leere Felder bedeuten 0."));
  root.append(table([...attributeHead("Volk"), "Begründung"],
    Object.values(K.voelker).map((volk) => bonusRow(volk.name, volk.bonus, volk.begruendung)), "Volk (unterm Strich +2)"));
  root.append(table(attributeHead("Fraktion"),
    Object.values(K.fraktionen).map((data) => bonusRow(data.name, data.bonus).slice(0, -1)), "Fraktion (unterm Strich +1)"));
  root.append(element("p", "Der Malus der Erinnernden auf Willenskraft passt zu ihrer Schwäche: Wer viel fremdes Blut trinkt, verliert leichter sich selbst. Der Hof der Bleichen Krone ist körperlos und daher schwächer in Stärke."));

  root.append(element("h3", "Die sechs Grundklassen"));
  root.append(element("p", "Jede Klasse gibt Bonus und Malus auf die Grundwerte (unterm Strich +2) und legt zwei Hauptfertigkeiten fest. Wo es keine Magie gibt, tauschen Magier und Heiler beides."));
  const bonusText = (bonus) => Object.entries(bonus).map(([key, value]) => K.grundwerte[key] + " " + signed(value)).join(", ");
  root.append(table(["Klasse", "Rolle in der Heldengruppe", "Grundwerte", "Hauptfertigkeiten (mind. 3)"],
    Object.values(K.grundklassen).map((data) => [data.name + (data.hinweis ? " (" + data.hinweis + ")" : ""), data.rolle,
      bonusText(data.bonus), data.haupt.map((id) => K.fertigkeiten[id].name).join(", ")])));
  root.append(element("p", K.ritualHinweis + " " + K.ritualschulen.map((school) =>
    school.name + " (" + school.klassen.join(", ") + ")").join(", ") + "."));

  const names = { krieger: "Krieger", waechter: "Wächter", spaeher: "Späher", magier: "Magier", heiler: "Heiler", schurke: "Schurke" };
  for (const [people, volk] of Object.entries(K.voelker)) {
    const article = element("article");
    article.id = "klassen-" + people;
    article.append(element("h3", volk.name), element("p", volk.text));
    for (const [id, faction] of Object.entries(K.fraktionen).filter(([, data]) => data.volk === people)) {
      const entry = element("details");
      entry.id = "klassen-" + id;
      entry.append(element("summary", faction.name + " (" + faction.schwierigkeit + ") · Ressource " + faction.ressource));
      entry.append(table(["Klasse", "Name", "Spielweise", "Nutzt " + faction.ressource, "Spezialisierung A ab Stufe 3", "Spezialisierung B ab Stufe 3"],
        K.klassenFolge.map((role) => {
          const data = faction.klassen[role];
          const label = role === "heiler" && ["hof", "tiefes-koenigreich"].includes(id) ? "Priester" : names[role];
          return [label, data.name, data.spielweise, data.ressource, data.a[0] + ": " + data.a[1], data.b[0] + ": " + data.b[1]];
        })));
      if (faction.hinweis) entry.append(element("p", faction.hinweis));
      article.append(entry);
    }
    const master = K.meisterklassen[people];
    article.append(element("h4", "Meisterklasse: " + master.name), element("p", master.text));
    root.append(article);
  }

  const example = K.beispiel;
  root.append(element("h3", example.titel));
  root.append(element("p", example.einleitung));
  const volk = K.voelker[example.volk];
  const faction = K.fraktionen[example.fraktion];
  const role = K.grundklassen[example.klasse];
  const values = keys.map((key) => K.regeln.start + (volk.bonus[key] ?? 0) + (faction.bonus[key] ?? 0) +
    (role.bonus[key] ?? 0) + (example.frei[key] ?? 0));
  root.append(table(["Grundwert", "Start", volk.name, faction.name, role.name, "Freie Punkte", "Ergebnis"],
    keys.map((key, index) => [K.grundwerte[key], String(K.regeln.start), signed(volk.bonus[key] ?? 0),
      signed(faction.bonus[key] ?? 0), signed(role.bonus[key] ?? 0), signed(example.frei[key] ?? 0), String(values[index])]),
    "Schritt 1, Grundwerte bei der Charakterwahl"));
  root.append(element("p", "Schritt 2, Fertigkeiten (18 Punkte): Ihre Hauptfertigkeiten Fernkampf und List brauchen mindestens 3. Mit Geschick 17 dürfen beide bis 5 steigen, Nahkampf (Stärke 10) nur bis 3. Ab Quest-Stufe 3 steigt Fernkampf auf 5 (19 Punkte), als Meisterklasse Magie auf 2 (20 Punkte)."));
  root.append(element("p", example.verlauf));
})();
