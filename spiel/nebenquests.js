"use strict";

// Nebenquests je Ort (Aushang im Stadt-Hub) und die Fraktionsreihe (Hauptquest-Plan) je Fraktion. Daten: spiel/nebenquests-daten.js, erzeugt aus quellen/gemini/.
// Liest keinen Spielstand und verändert nichts. Die Aufträge sind bisher nur lesbar, nicht spielbar.
const nebenquests = (() => {
  const D = typeof nebenquestDaten !== "undefined" ? nebenquestDaten : require("./nebenquests-daten.js");
  const K = typeof knoten !== "undefined" ? knoten : require("./knoten.js");

  const fuerOrt = (id) => {
    const ort = K.get(id);
    if (!ort) return null;
    const eintrag = D[ort.fraktion]?.orte?.[id];
    return eintrag ? { ...eintrag, fraktion: ort.fraktion, stand: D[ort.fraktion].stand } : null;
  };

  const reihe = (fraktion) => D[fraktion]?.reihe ?? null;
  // Stufenbereich eines Schwester-Zweigs nach Reihenfolge: bisher abgeschlossene Zweige 0 → erster, sonst zweiter.
  const zweigStufen = (fraktion, abgeschlosseneZweige) => {
    const stufen = reihe(fraktion)?.zweigStufen;
    return stufen ? stufen[Math.min(Math.max(0, abgeschlosseneZweige | 0), stufen.length - 1)] : null;
  };

  // „S16“ → „Kornwik – Kronhall“, unbekannte Kennungen bleiben leer.
  const wegName = (kennung) => {
    const ende = D.wegKennungen[kennung];
    return ende ? ende.map((id) => K.get(id)?.name ?? id).join(" – ") : null;
  };
  const wegeImText = (text) => [...new Set(String(text).match(/\b[SPMD]\d\d\b/g) ?? [])].filter((k) => D.wegKennungen[k]);

  return { daten: D, fuerOrt, reihe, zweigStufen, wegName, wegeImText };
})();
if (typeof module !== "undefined") module.exports = nebenquests;
