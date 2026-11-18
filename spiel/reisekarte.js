"use strict";

// Reisekarte als Pop-up-Fenster: die ganze verbindliche Weltkarte mit stufenlosem Zoom (Henry, 18. 11. 2026).
// Für die Menschenlande liegen darüber alle Städte, Dörfer und Überseehäfen mit den Wegen S, P, D und M aus Geminis
// Karte (quellen/reisekarte-erzeugen.cjs). Jeder Ort sitzt an seinem Punkt im Knotennetz, Geminis schematische Lagen
// dienen nur der Prüfung. Die anderen Völker zeigen vorerst nur die gedruckten Namen der Weltkarte; ihr Wegenetz
// kommt später. Alle Maße in Pixeln der vollen Weltkarte (2846 × 2210). Reisen, Kosten und Gefahr kommen aus den
// Spielregeln.
const reisekarte = (() => {
  const D = typeof reisekarteDaten !== "undefined" ? reisekarteDaten : require("./reisekarte-daten.js");
  const N = typeof knoten !== "undefined" ? knoten : require("./knoten.js");
  const B = typeof karte !== "undefined" ? karte : require("./karte.js");

  // Sichtbare Welt und Kartenbilder: erst die Weltkarte, darüber die schärferen Ausschnitte der Völker,
  // die Menschenlande obenauf.
  const welt = B.daten.rand.slice();
  const rang = (src) => (src.endsWith("welt.jpg") ? -1 : src.endsWith("menschen.jpg") ? 1 : 0);
  const bilder = B.daten.bilder.slice().sort((a, b) => rang(a.src) - rang(b.src))
    .map(({ src, rect: [x, y, w, h] }) => ({ src, x, y, breite: w, hoehe: h }));
  // Sprungziele: die Gebiete der fünf Völker.
  const regionen = { ...B.daten.voelker };

  // Volk je Fraktion.
  const volkVon = { kronreich: "menschen", orden: "menschen", haefen: "menschen", staubreiter: "orks", "gruene-banner": "orks",
    aschenclan: "orks", hof: "untote", erinnernde: "untote", faeulnisbrut: "untote", hueter: "elfen", dornenklingen: "elfen",
    schattenbluete: "elfen", tiefgraeber: "zwerge", "tiefes-koenigreich": "zwerge", runenschmiede: "zwerge" };
  const wegArten = { S: "strasse", P: "pass", D: "dorfweg", M: "seeweg" };
  const wegArtNamen = { strasse: "Straßen", pass: "Pässe", dorfweg: "Dorfwege", seeweg: "Seewege" };

  const hat = (id) => Object.prototype.hasOwnProperty.call(D.orte, id);
  const lage = (id) => N.alle[id]?.punkt.slice() ?? null;

  // Orte des Wegenetzes, Städte zuerst (Dörfer liegen beim Zeichnen darunter).
  const orte = Object.keys(D.orte).map((id) => {
    const k = N.get(id);
    return { id, name: k.name, typ: k.typ, fraktion: k.fraktion, volk: volkVon[k.fraktion] ?? null, hafen: k.hatHafen,
      uebersee: volkVon[k.fraktion] !== "menschen", x: k.punkt[0], y: k.punkt[1] };
  }).sort((a, b) => (a.typ === "dorf") - (b.typ === "dorf"));

  const wege = D.wege.map(([kennung, a, b]) => ({ kennung, a, b, art: wegArten[kennung[0]], sicherheit: N.verbindung(a, b).sicherheit }));
  const wegeVon = (id) => wege.filter((weg) => weg.a === id || weg.b === id);
  const wegZwischen = (a, b) => wege.find((weg) => (weg.a === a && weg.b === b) || (weg.a === b && weg.b === a)) ?? null;

  // Dorfnamen (Henry: alle Ortsnamen sind zu sehen). Städte sind auf dem Kartenbild beschriftet, Dörfer nicht.
  // Jeder Dorfname bekommt die erste freie von acht Lagen um seinen Punkt, wie bei der Weltkarte selbst: Er meidet
  // gedruckte Namen, Ortsmarken und schon gesetzte Dorfnamen. Die Schrift wächst mit der Karte, so bleibt die Lage
  // bei jedem Zoom frei.
  const dorfSchrift = 15;
  const ueberlappung = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const beschriftung = (() => {
    const belegt = (D.belegt ?? []).map((box) => box.slice());
    for (const ort of orte) {
      const r = ort.typ === "dorf" ? 6 : 10;
      belegt.push([ort.x - r, ort.y - r, ort.x + r, ort.y + r]);
    }
    const lagen = {};
    for (const ort of orte.filter((entry) => entry.typ === "dorf")) {
      const w = ort.name.length * dorfSchrift * 0.5;
      const h = dorfSchrift * 1.05;
      const r = 7;
      // Rechts, links, oben, unten, dann die Ecken (x links oben des Namens).
      const kandidaten = [[r, -h / 2], [-r - w, -h / 2], [-w / 2, -r - h], [-w / 2, r], [r, -r - h], [-r - w, -r - h], [r, r], [-r - w, r]];
      // SVG-Anker je Lage (Versatz zum Punkt, Grundlinie, Ausrichtung).
      const anker = [[r, h * 0.3, "start"], [-r, h * 0.3, "end"], [0, -r - h * 0.2, "middle"], [0, r + h * 0.8, "middle"],
        [r, -r - h * 0.2, "start"], [-r, -r - h * 0.2, "end"], [r, r + h * 0.8, "start"], [-r, r + h * 0.8, "end"]];
      let beste = null;
      kandidaten.forEach(([dx, dy], index) => {
        const box = [ort.x + dx, ort.y + dy, ort.x + dx + w, ort.y + dy + h];
        const wert = belegt.reduce((summe, andere) => summe + ueberlappung(box, andere), 0) + index * 2;
        if (!beste || wert < beste.wert) beste = { wert, index, box };
      });
      belegt.push(beste.box);
      const [ax, ay, ausrichtung] = anker[beste.index];
      lagen[ort.id] = [Math.round(ax * 10) / 10, Math.round(ay * 10) / 10, ausrichtung];
    }
    return lagen;
  })();

  // Gedruckte Namen der Weltkarte an derselben Stelle, damit Wege und Marken sie nicht verdecken. Namen, die ein Ort
  // im Knotennetz sind, lassen sich anklicken. [Name, x, Grundlinie y, Breite, Schriftgröße, Hauptstadt, Knoten]
  const gedruckteNamen = (D.namen ?? []).map(([name, [ax, ay, bx], groesse]) =>
    [name, ax, ay + groesse * 0.73, bx - ax, groesse, groesse >= 23, N.nachName[name] ?? null]);

  return { daten: D, welt, bilder, regionen, beschriftung, gedruckteNamen, dorfSchrift, titel: D.titel, orte, wege, wegeVon,
    wegZwischen, lage, hat, volkVon, wegArtNamen };
})();
if (typeof module !== "undefined") module.exports = reisekarte;
