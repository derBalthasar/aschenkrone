"use strict";

// Reisekarte der Menschenlande als Pop-up-Fenster (Gemini, 18. 11. 2026): schematische Karte mit allen Städten,
// Dörfern und Überseehäfen und den Wegen S, P, D und M. Die Daten erzeugt quellen/reisekarte-erzeugen.cjs. Dieses
// Modul rechnet nur Lage und Wege aus. Reisen, Kosten und Gefahr kommen aus den Spielregeln.
const reisekarte = (() => {
  const D = typeof reisekarteDaten !== "undefined" ? reisekarteDaten : require("./reisekarte-daten.js");
  const N = typeof knoten !== "undefined" ? knoten : require("./knoten.js");

  // Volk je Fraktion, für Farbe und Landfläche.
  const volkVon = { kronreich: "menschen", orden: "menschen", haefen: "menschen", staubreiter: "orks", "gruene-banner": "orks",
    aschenclan: "orks", hof: "untote", erinnernde: "untote", faeulnisbrut: "untote", hueter: "elfen", dornenklingen: "elfen",
    schattenbluete: "elfen", tiefgraeber: "zwerge", "tiefes-koenigreich": "zwerge", runenschmiede: "zwerge" };
  const wegArten = { S: "strasse", P: "pass", D: "dorfweg", M: "seeweg" };
  const wegArtNamen = { strasse: "Straßen", pass: "Pässe", dorfweg: "Dorfwege", seeweg: "Seewege" };

  const hat = (id) => Object.prototype.hasOwnProperty.call(D.orte, id);
  const lage = (id) => (hat(id) ? [D.orte[id].x, D.orte[id].y] : null);

  // Alle Orte mit Knotendaten, Städte zuerst (Dörfer liegen beim Zeichnen darunter).
  const orte = Object.keys(D.orte).map((id) => {
    const k = N.get(id);
    const menschen = volkVon[k.fraktion] === "menschen";
    return { id, name: k.name, typ: k.typ, fraktion: k.fraktion, volk: volkVon[k.fraktion] ?? null, hafen: k.hatHafen,
      uebersee: !menschen, x: D.orte[id].x, y: D.orte[id].y };
  }).sort((a, b) => (a.typ === "dorf") - (b.typ === "dorf"));

  const wege = D.wege.map(([kennung, a, b]) => ({ kennung, a, b, art: wegArten[kennung[0]], sicherheit: N.verbindung(a, b).sicherheit }));
  const wegeVon = (id) => wege.filter((weg) => weg.a === id || weg.b === id);
  const wegZwischen = (a, b) => wege.find((weg) => (weg.a === a && weg.b === b) || (weg.a === b && weg.b === a)) ?? null;

  // Land zeichnet die Karte als Flecken um jeden Ort der Menschen und als breite Bänder entlang der Landwege.
  // Seewege bleiben offen, so trennen sich die Inseln der Häfen vom Festland.
  const landwege = wege.filter((weg) => weg.art !== "seeweg");

  return { daten: D, breite: D.breite, hoehe: D.hoehe, titel: D.titel, orte, wege, landwege, wegeVon, wegZwischen, lage, hat,
    volkVon, wegArtNamen };
})();
if (typeof module !== "undefined") module.exports = reisekarte;
