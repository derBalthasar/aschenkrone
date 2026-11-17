"use strict";

// Karte von Odris in drei Stufen: 1. das Gebiet, in dem der Held gerade ist, 2. das Gebiet der Fraktion, in deren
// Land er steht, 3. die ganze Welt. Grundlage ist die verbindliche Weltkarte (spiel/karte-daten.js, erzeugt von
// quellen/karte-erzeugen.py). Die Karte liest nur die aktuelle Szene und die Fraktion des Helden. Reisemechanik und
// Spielstand bleiben unverändert.
const karte = (() => {
  const D = typeof karteDaten !== "undefined" ? karteDaten : require("./karte-daten.js");
  const stufen = ["gebiet", "fraktion", "welt"];
  const stufenNamen = { gebiet: "Gebiet", fraktion: "Fraktion", welt: "Welt" };
  const gebietGroesse = [400, 290];

  const innerhalb = (rect, outer) => rect[0] >= outer[0] && rect[1] >= outer[1] &&
    rect[0] + rect[2] <= outer[0] + outer[2] && rect[1] + rect[3] <= outer[1] + outer[3];
  const enthaelt = (rect, [x, y]) => x >= rect[0] && y >= rect[1] && x <= rect[0] + rect[2] && y <= rect[1] + rect[3];

  function rahmen([x, y, w, h], [fx, fy, fw, fh] = D.rand) {
    w = Math.min(w, fw);
    h = Math.min(h, fh);
    return [Math.min(Math.max(x, fx), fx + fw - w), Math.min(Math.max(y, fy), fy + fh - h), w, h];
  }

  // Wo steht der Held? Reiseziele der Reisekarte haben feste Punkte, Szenen der Prologe nennen ihren Ort (fern).
  function lage(scene, destinations = {}) {
    const ziel = scene && D.reise[scene.map];
    if (ziel) return { punkt: ziel.p, name: destinations[scene.map]?.name ?? scene.map, fraktion: ziel.f, reise: true };
    const ort = scene?.fern && D.orte[scene.fern];
    if (ort) return { punkt: ort.p, name: scene.fern, fraktion: ort.f, reise: false };
    return null;
  }

  // Ausschnitt einer Stufe in Pixeln der vollen Karte.
  function ansicht(stufe, ort, heimat) {
    if (stufe === "welt") return { rect: D.rand.slice(), fraktion: ort?.fraktion ?? heimat };
    const fraktion = ort?.fraktion ?? heimat;
    const gebiet = D.fraktionen[fraktion]?.rect ?? D.rand;
    if (stufe === "fraktion" || !ort) return { rect: gebiet.slice(), fraktion };
    const [w, h] = gebietGroesse;
    return { rect: rahmen([ort.punkt[0] - w / 2, ort.punkt[1] - h / 2, w, h]), fraktion };
  }

  // Das kleinste Kartenbild, das den Ausschnitt ganz enthält. Die Weltkarte deckt immer alles ab.
  function bild(rect) {
    const passend = D.bilder.filter(b => innerhalb(rect, b.rect));
    passend.sort((a, b) => a.rect[2] * a.rect[3] - b.rect[2] * b.rect[3]);
    return passend[0] ?? D.bilder[0];
  }

  // Lage eines Kartenpunkts im Ausschnitt in Prozent, oder null außerhalb.
  function prozent(rect, punkt) {
    if (!enthaelt(rect, punkt)) return null;
    return [(punkt[0] - rect[0]) / rect[2] * 100, (punkt[1] - rect[1]) / rect[3] * 100];
  }

  return { daten: D, stufen, stufenNamen, lage, ansicht, bild, prozent, enthaelt };
})();
if (typeof module !== "undefined") module.exports = karte;
