"use strict";

// Reisekarte der Menschenlande als Pop-up-Fenster: alle Städte, Dörfer und Überseehäfen mit den Wegen S, P, D und M
// aus Geminis Karte (18. 11. 2026, quellen/reisekarte-erzeugen.cjs). Auf Henrys Wunsch behält sie das Layout der
// verbindlichen Weltkarte: Hintergrund sind deren Bilder, jeder Ort sitzt an seinem Punkt im Knotennetz. Geminis
// schematische Lagen dienen nur noch der Prüfung. Dieses Modul rechnet Ausschnitt, Lage und Wege aus. Reisen,
// Kosten und Gefahr kommen aus den Spielregeln.
const reisekarte = (() => {
  const D = typeof reisekarteDaten !== "undefined" ? reisekarteDaten : require("./reisekarte-daten.js");
  const N = typeof knoten !== "undefined" ? knoten : require("./knoten.js");
  const B = typeof karte !== "undefined" ? karte : require("./karte.js");

  // Ausschnitt der Weltkarte (Pixel der vollen Karte) um alle Orte, mit Rand. Gezeichnet wird in einem Rahmen
  // von 760 Einheiten Breite, damit Punkte, Linien und Schrift überall gleich groß bleiben.
  const breite = 760;
  const punkte = Object.keys(D.orte).map((id) => N.get(id).punkt);
  const rand = 90;
  const [rx, ry, rw, rh] = B.daten.rand;
  const x0 = Math.max(rx, Math.min(...punkte.map(([x]) => x)) - rand);
  const y0 = Math.max(ry, Math.min(...punkte.map(([, y]) => y)) - rand);
  const x1 = Math.min(rx + rw, Math.max(...punkte.map(([x]) => x)) + rand);
  const y1 = Math.min(ry + rh, Math.max(...punkte.map(([, y]) => y)) + rand);
  const massstab = (x1 - x0) / breite;
  const hoehe = Math.round((y1 - y0) / massstab);
  const umrechnen = ([x, y]) => [Math.round((x - x0) / massstab * 10) / 10, Math.round((y - y0) / massstab * 10) / 10];
  const ausschnitt = [x0, y0, x1 - x0, y1 - y0];
  // Kartenbilder, die den Ausschnitt berühren: erst die Weltkarte, darüber die schärferen Ausschnitte der Völker.
  // Die Menschenlande liegen obenauf.
  const bilder = B.daten.bilder.filter(({ rect: [x, y, w, h] }) => x < x1 && x + w > x0 && y < y1 && y + h > y0)
    .sort((a, b) => (a.src.endsWith("welt.jpg") ? -1 : a.src.endsWith("menschen.jpg") ? 1 : 0) -
      (b.src.endsWith("welt.jpg") ? -1 : b.src.endsWith("menschen.jpg") ? 1 : 0))
    .map(({ src, rect: [x, y, w, h] }) => ({ src, x: (x - x0) / massstab, y: (y - y0) / massstab, breite: w / massstab, hoehe: h / massstab }));

  // Volk je Fraktion, für Farbe und Landfläche.
  const volkVon = { kronreich: "menschen", orden: "menschen", haefen: "menschen", staubreiter: "orks", "gruene-banner": "orks",
    aschenclan: "orks", hof: "untote", erinnernde: "untote", faeulnisbrut: "untote", hueter: "elfen", dornenklingen: "elfen",
    schattenbluete: "elfen", tiefgraeber: "zwerge", "tiefes-koenigreich": "zwerge", runenschmiede: "zwerge" };
  const wegArten = { S: "strasse", P: "pass", D: "dorfweg", M: "seeweg" };
  const wegArtNamen = { strasse: "Straßen", pass: "Pässe", dorfweg: "Dorfwege", seeweg: "Seewege" };

  const hat = (id) => Object.prototype.hasOwnProperty.call(D.orte, id);
  const lage = (id) => (hat(id) ? umrechnen(N.get(id).punkt) : null);

  // Alle Orte mit Knotendaten, Städte zuerst (Dörfer liegen beim Zeichnen darunter).
  const orte = Object.keys(D.orte).map((id) => {
    const k = N.get(id);
    const menschen = volkVon[k.fraktion] === "menschen";
    return { id, name: k.name, typ: k.typ, fraktion: k.fraktion, volk: volkVon[k.fraktion] ?? null, hafen: k.hatHafen,
      uebersee: !menschen, x: lage(id)[0], y: lage(id)[1] };
  }).sort((a, b) => (a.typ === "dorf") - (b.typ === "dorf"));

  const wege = D.wege.map(([kennung, a, b]) => ({ kennung, a, b, art: wegArten[kennung[0]], sicherheit: N.verbindung(a, b).sicherheit }));
  const wegeVon = (id) => wege.filter((weg) => weg.a === id || weg.b === id);
  const wegZwischen = (a, b) => wege.find((weg) => (weg.a === a && weg.b === b) || (weg.a === b && weg.b === a)) ?? null;

  return { daten: D, breite, hoehe, ausschnitt, bilder, titel: D.titel, orte, wege, wegeVon, wegZwischen, lage, hat,
    volkVon, wegArtNamen };
})();
if (typeof module !== "undefined") module.exports = reisekarte;
