"use strict";

// Knotennetz von Odris nach der Technischen Spezifikation (17. 11. 2026): 15 Hauptstädte, 150 Städte und
// Hafenstädte, 345 Dörfer. Die Daten erzeugt quellen/knoten-erzeugen.py aus der verbindlichen Weltkarte und den
// Dörferlisten der Völkerdokumente. Dieses Modul macht daraus das Knotenmodell der Spezifikation
// ({ id, name, fraktion, typ, hatHafen, regionBestiarium, verbindungen }) und liest keinen Spielstand.
const knoten = (() => {
  const D = typeof knotenDaten !== "undefined" ? knotenDaten : require("./knoten-daten.js");
  const typNamen = { hauptstadt: "Hauptstadt", stadt: "Stadt", hafenstadt: "Hafenstadt", dorf: "Dorf" };
  const kantenNamen = { strasse: "Straße", pass: "Pass", seeweg: "Seeweg", tiefer_stollen: "Tiefer Stollen" };
  const sicherheitNamen = { kernland: "Kernland", grenzland: "Grenzland" };

  const alle = {};
  for (const [id, k] of Object.entries(D.knoten)) {
    alle[id] = {
      id, name: k.n, fraktion: k.f, typ: k.t, punkt: k.p, hatHafen: Boolean(k.h),
      regionBestiarium: D.regionen[k.f] ?? null, ertrag: k.e ?? null, stadt: k.s ?? null,
      verbindungen: k.k.map(([zielId, kantenTyp, sicherheit, kostenRessource, kostenGold = 0, extra = {}]) => ({
        zielId, kantenTyp, sicherheit, kostenRessource, kostenGold,
        ...(kantenTyp === "seeweg" ? { erfordertHafenOderVertrag: true } : {}),
        ...(extra.pass_ ? { pass: extra.pass_ } : {}),
        ...(extra.probe ? { probe: extra.probe, glut: extra.glut ?? 0 } : {}),
      })),
    };
  }
  const nachName = Object.fromEntries(Object.values(alle).map((k) => [k.name, k.id]));
  const doerfer = (id) => Object.values(alle).filter((k) => k.stadt === id).map((k) => k.id);

  // Orte der Handlung: Diese Knoten führen zurück in die Szenen der Reisekarte Kornwik bis Glutberg.
  const handlungsOrte = { kornwik: "weidenkamm", heidvang: "kraehenfurt", eiswacht: "hochwacht", glutberg: "skarn-gate" };
  const knotenZuKarte = (id) => handlungsOrte[id] ?? null;
  const karteZuKnoten = (map) => Object.keys(handlungsOrte).find((id) => handlungsOrte[id] === map) ?? null;

  const get = (id) => (typeof id === "string" && Object.hasOwn(alle, id) ? alle[id] : null);
  const verbindung = (von, nach) => get(von)?.verbindungen.find((v) => v.zielId === nach) ?? null;

  return { daten: D, alle, get, verbindung, nachName, doerfer, typNamen, kantenNamen, sicherheitNamen,
    handlungsOrte, knotenZuKarte, karteZuKnoten, aufhaenger: D.aufhaenger };
})();
if (typeof module !== "undefined") module.exports = knoten;
