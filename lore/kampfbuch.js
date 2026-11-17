"use strict";

// Zeigt das Kampfdokument (Henry, 17. 11. 2026) im Weltbuch an: Regeln, Fähigkeiten aller Klassen, Gegnerwerte.
// Quelle der Zahlen sind spiel/faehigkeiten.js und spiel/kampf.js, die auch das Spiel verwendet.
(() => {
  const root = document.getElementById("kampf-inhalt");
  if (!root || typeof kampf === "undefined" || typeof faehigkeiten === "undefined" || typeof klassen === "undefined") return;
  const K = klassen;
  const F = faehigkeiten;

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
    const headRow = element("tr");
    for (const cell of head) {
      const th = element("th", cell);
      th.scope = "col";
      headRow.append(th);
    }
    const thead = element("thead");
    thead.append(headRow);
    const body = element("tbody");
    for (const row of rows) {
      const tr = element("tr");
      row.forEach((cell, index) => {
        const node = element(index ? "td" : "th", String(cell));
        if (!index) node.scope = "row";
        tr.append(node);
      });
      body.append(tr);
    }
    result.append(thead, body);
    wrap.append(result);
    return wrap;
  }

  const list = (items) => {
    const node = element("ul");
    for (const text of items) node.append(element("li", text));
    return node;
  };

  root.append(element("h3", "Grundregeln"));
  root.append(list([
    "Kämpfe laufen in Runden. Jeder Held hat pro Runde eine Bewegung und eine Aktion: Grundangriff, Fähigkeit, Gegenstand oder Verteidigen. Wer das höhere Geschick hat, handelt zuerst.",
    "Erfahrungsstufen 1 bis 20. Stufe n kostet 100 × n EP, Stufe 20 erreicht man mit insgesamt " + kampf.epFuer(20).toLocaleString("de-DE") + " EP.",
    "EP: " + kampf.ep.gegnerJeStufe + " EP je Gegnerstufe, " + kampf.ep.schlacht + " EP je gewonnener Schlacht, " + kampf.ep.questakt + " EP je abgeschlossenem Questakt.",
    "Erfahrungsstufen und Queststufen bleiben getrennt. Erfahrungsstufen geben Fähigkeiten, LP und Kraft, Queststufen geben Spezialisierung und Meisterklasse.",
    "Ausdauer beginnt bei 10, Mana bei 2 × Magie. Beide steigen alle zwei Stufen um 1 und kehren jede Runde um 2 zurück. Kronreich und Freie Häfen haben kein Mana.",
    "Fraktionsressource: Die Stufe-20-Fähigkeit kostet 3. Jede andere Fähigkeit ab Stufe 3 kann für 1 Ressource um 25 % verstärkt werden.",
    "Ein hoher Intelligenzbonus senkt die Kosten jeder Fähigkeit um den Bonus, mindestens bleibt 1.",
    "Schaden = Tabellenwert + passende Fertigkeit + Bonus des Grundwerts. Der Grundangriff steigt auf den Stufen 4, 8, 12, 16 und 20 um 1.",
    "Spezialisierung A verstärkt die Stufe-6-Fähigkeit, B die Stufe-10-Fähigkeit: +50 % Wirkung oder bei Kontrolle 1 Runde weniger Abklingzeit.",
    "Das Spiel hat kein Kampfraster: Fläche und Umkreis treffen alle Feinde, „bis zu N“ trifft N Feinde, Zurückstoßen und Verlangsamen senken den Schaden des Ziels um 1, Wälle und Köder ziehen Angriffe auf sich.",
  ]));

  root.append(element("h3", "Lebenspunkte nach Rolle"));
  const roleName = { waechter: "Wächter", krieger: "Krieger", schurke: "Schurke", spaeher: "Späher", heiler: "Heiler/Priester",
    feldscher: "Feldscher, Schiffsarzt", magier: "Magier", skalde: "Skalde", pulvermeister: "Pulvermeister" };
  root.append(table(["Rolle", "Start", "Je Stufe", "Auf Stufe 20"],
    Object.entries(kampf.lpTabelle).map(([id, [start, step]]) => [roleName[id] ?? id, start, "+" + step, start + 19 * step])));

  root.append(element("h3", "Machtbudget je Stufe"));
  const budgetRow = (label, b) => [label, b.punkte, b.kosten || "–", b.einmal ? "1 × pro Schlacht" : b.abklingzeit || "–", b.ressource ?? "–"];
  root.append(table(["Stufe", "Budget", "Kosten", "Abklingzeit", "Ressource"], [
    ...F.stufen.map((s) => budgetRow(String(s), kampf.budget[s])),
    budgetRow("Meister I", kampf.meisterBudget[0]), budgetRow("Meister II (ab Stufe 20)", kampf.meisterBudget[1]),
  ]));
  root.append(table(["Wirkung", "Machtpunkte"], kampf.machtpunkte, "Was eine Wirkung kostet"));
  root.append(element("h4", "Gegen Übermacht"));
  root.append(list(kampf.gegenUebermacht));

  root.append(element("h3", "Angriffe, Zauber und Techniken aller Klassen"));
  root.append(element("p", "A bezahlt mit Ausdauer, M mit Mana. Jede Klasse hat sechs Fähigkeiten auf den Stufen 1, 3, 6, 10, 15 und 20."));
  const nav = element("nav");
  nav.className = "lore-nav";
  nav.setAttribute("aria-label", "Fraktionen im Kampfbuch");
  root.append(nav);
  for (const [id, data] of Object.entries(F.fraktionen)) {
    const faction = K.fraktionen[id];
    const anchor = "kampf-" + id;
    const link = element("a", faction.name);
    link.href = "#" + anchor;
    nav.append(link);
    const heading = element("h4", faction.name + " · " + data.art);
    heading.id = anchor;
    root.append(heading, element("p", data.text));
    const rows = [];
    for (const role of K.klassenFolge) {
      const className = faction.klassen[role].name;
      for (const f of kampf.klassenFaehigkeiten(id, role)) {
        rows.push([f.stufe === 1 ? className : "", f.stufe, f.name, f.wirkung, f.zahlung, f.kosten || "–"]);
      }
    }
    root.append(table(["Klasse", "Stufe", "Fähigkeit", "Wirkung", "Zahlung", "Kosten"], rows));
  }

  root.append(element("h3", "Meisterfähigkeiten"));
  root.append(table(["Volk", "Meister I (Budget 24, 6 Kosten, AK 4)", "Meister II (ab Stufe 20, 1 × pro Schlacht, 3 Ressource)"],
    Object.entries(F.meister).map(([volk, [first, second]]) => [K.voelker[volk].name, first[0] + ": " + first[1], second[0] + ": " + second[1]])));

  root.append(element("h3", "Gegner"));
  root.append(table(["Rang", "LP", "Schaden", "Aktionen", "Fähigkeiten"], [
    ["Mitläufer", "6 + 3 × Stufe", "3 + Stufe/2", 1, kampf.raenge.mitlaeufer.faehigkeiten],
    ["Elite", "10 × Stufe", "4 + Stufe/2", 1, kampf.raenge.elite.faehigkeiten],
    ["Anführer", "30 × Stufe", "4 + Stufe", 2, kampf.raenge.anfuehrer.faehigkeiten],
    ["Endgegner", "45 × Stufe", "4 + Stufe", 2, kampf.raenge.endgegner.faehigkeiten],
  ]));
  root.append(element("p", "Anführer und Endgegner sind für 4 Helden gerechnet. Jeder Held mehr oder weniger ändert ihre LP um 25 %. " + kampf.faireKaempfe));
  root.append(table(["Abschnitt", "Queststufe", "Gegnerstufe"], kampf.questStufen, "Gegnerstufen in der Kampagne"));

  const groups = {};
  for (const foe of Object.values(kampf.gegner)) (groups[foe.gruppe] ??= []).push(foe);
  for (const [group, foes] of Object.entries(groups)) {
    root.append(element("h4", group));
    if (group === "Gebundene") root.append(element("p", kampf.gebundenRegel));
    if (group.startsWith("Kult")) root.append(element("p", kampf.kultText));
    root.append(table(["Gegner", "Rang", "Stufen", "Eigenschaft"],
      foes.map((foe) => [foe.name, kampf.raenge[foe.rang].name, foe.stufen.join("–"), foe.text])));
  }

  const m = kampf.morbius;
  root.append(element("h4", m.name));
  root.append(element("p", "Stufe " + m.stufe + " · " + m.lp + " LP in drei Phasen · " + m.schaden + " Schaden · " + m.aktionen +
    " Aktionen pro Runde · " + m.ort + ". " + m.text));
  root.append(table(["Phase", "LP", "Aktionen", "Wirkung"], m.phasen.map((p) => [p.name, p.lp, p.aktionen, p.text])));
  if (m.kontrolle) root.append(element("p", m.kontrolle));
})();
