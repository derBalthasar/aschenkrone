"use strict";

// Gesamtsimulation der Menschen (Henry, 20. 11. 2026): Jede der 18 Kombinationen (3 Fraktionen × 6 Klassen) spielt ohne
// Abkürzungen vom Prolog über Akt 1 (v3.0.5-Szenen), Aushang-Aufträge, die Schwester-Zweige (Akt 2/3) bis zum Kriegsrat
// in Akt 4. Gereist wird Etappe für Etappe mit Begegnungen; Kämpfe wählt ein einfacher Spieler (beste Aktion je Runde).
// Stufen, Silber und Gefährten entstehen nur aus dem Spiel selbst. Notiert werden Blockaden, Niederlagen, Stufen je Akt,
// wie viele Aufträge nötig sind, um eine Stufensperre zu erreichen, und ungewöhnliche Werte.
//
//   node sim/gesamt.cjs                alle 18 Läufe
//   node sim/gesamt.cjs orden heiler   ein Lauf
//
// Ergebnis: sim/gesamt-ergebnis.json

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ structuredClone });
for (const file of ["bestiarium/daten.js", "spiel/klassen.js", "spiel/faehigkeiten.js", "spiel/kampf.js", "spiel/startpunkte.js",
  "spiel/welt.js", "spiel/knoten-daten.js", "spiel/knoten.js", "spiel/nebenquests-daten.js", "spiel/nebenquests.js",
  "spiel/systeme-daten.js", "spiel/systeme.js", "spiel/akt-dialoge.js", "spiel/regeln.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const rules = vm.runInContext("rules", context);
const knoten = vm.runInContext("knoten", context);
const SY = rules.systeme;

let saat = 1;
const wuerfel = () => ((saat = (saat * 16807) % 2147483647) / 2147483647);
rules.setTravelDice(wuerfel);
const reload = (s) => rules.read(JSON.stringify(s));

const ROLLEN = ["krieger", "waechter", "spaeher", "magier", "heiler", "schurke"];
const SCHWESTERN = { kronreich: ["haefen", "orden"], orden: ["kronreich", "haefen"], haefen: ["kronreich", "orden"] };
const HUB = { kronreich: "kronhall", orden: "glutberg", haefen: "perlvik" };
const MAX_SCHRITTE = 4000;

// --geduldig: Die Spielerin nimmt vor jedem Zweig- und Akt-4-Kampf so lange Aushang-Aufträge an, bis sie die
// Untergrenze der Akt-Stufen erreicht (so, wie es der neue Stufen-Hinweis empfiehlt). Ohne den Schalter spielt sie
// „natürlich“ und holt nur nach, was eine Sperre verlangt.
const GEDULDIG = process.argv.includes("--geduldig");
function lauf(faction, role) {
  saat = 7 + ROLLEN.indexOf(role) * 31 + Object.keys(HUB).indexOf(faction) * 997;
  const p = { faction, role, fehler: [], hinweise: [], niederlagen: 0, kaempfe: 0, etappen: 0, auftraege: 0, stufen: {}, schritte: 0,
    blockiert: null, ende: null, silber: {}, dialoge: [], silberNot: 0, niederlageOrte: {} };
  let s = rules.create("Sim", faction, "frau", 2, role);
  const zug = () => { if (++p.schritte > MAX_SCHRITTE) throw new Error("Schrittgrenze erreicht"); };

  // ---- Kampf: beste Aktion je Runde (Schaden an den Gegnern minus eigener Schaden), Abwehr unter 40 % LP. ----
  const gegnerLp = (x) => (x.combat ? x.combat.feinde.reduce((sum, f) => sum + f.lp, 0) : 0);
  function kaempfen(x) {
    p.kaempfe++;
    p.letzterKampf = x.combat.id + " (St. " + rules.level(x) + " vs " + x.combat.feinde.map((f) => f.stufe).join("/") + ")";
    for (let r = 0; x.combat && r < 120; r++) {
      zug();
      const abwehr = x.health < 0.4 * rules.healthLimit(x) ? ["guard"] : [];
      const aktionen = [...rules.abilities(x).filter((f) => f.frei && !rules.abilityState(x, f.id)).map((f) => f.id), "spear", ...abwehr];
      const wert = (n) => n === x ? -Infinity : (n.combat ? 0 : 1000) + gegnerLp(x) - gegnerLp(n) - 1.2 * (x.health - n.health) - (n.health ? 0 : 5000);
      // Ab Runde 60 nur noch angreifen (sonst kann ein Schurke mit Rauchschleier endlos unsichtbar bleiben, siehe Bericht).
      const beste = r >= 60 ? "spear" : aktionen.reduce((b, id) => (wert(rules.strike(x, id, () => 0.5)) > wert(rules.strike(x, b, () => 0.5)) ? id : b), "spear");
      if (r === 60) p.patt = (p.patt ?? 0) + 1;
      const n = rules.strike(x, beste, wuerfel);
      if (n === x) { p.fehler.push("Kampf hängt: keine Aktion möglich (" + x.combat.id + ")"); break; }
      x = n;
    }
    if (x.combat) {
      p.fehler.push("Kampf nach 120 Runden nicht beendet: " + x.combat.id);
      p.haenger = { feinde: x.combat.feinde.map((f) => [f.name, f.lp, f.max, f.schaden, JSON.stringify(f.status)]), held: x.health,
        unsichtbar: x.combat.held.unsichtbar, log: x.journal.slice(-8) };
    }
    return x;
  }
  // Nach Niederlage: den angebotenen Weg zurück nehmen (Zuflucht), danach weiter.
  function nachNiederlage(x) {
    if (x.scene === "weltende") {
      p.blockiert = "Spiel verloren (Weltende: " + x.niederlage + ") nach " + p.niederlagen + " Niederlagen, Stufe " + rules.level(x) +
        ", Leisten " + JSON.stringify(x.weltLeisten) + ", Runde " + x.runde;
      p.weltende = x.niederlage;
      return null;
    }
    if (!["defeat"].includes(x.scene) && x.health > 0) return x;
    p.niederlagen++;
    const wo = p.phase + ": " + (p.letzterKampf ?? "?");
    p.niederlageOrte[wo] = (p.niederlageOrte[wo] ?? 0) + 1;
    for (let i = 0; i < 6 && x.scene !== "weltknoten"; i++) {
      const wahl = rules.choices(x).find((c) => !c.disabled);
      if (!wahl) break;
      x = rules.choose(x, wahl.id, wuerfel);
      if (x.combat) x = kaempfen(x);
    }
    if (x.scene !== "weltknoten") { p.blockiert = "Nach Niederlage kein Weg zurück (Szene " + x.scene + ")"; return null; }
    return reload({ ...x, health: Math.max(x.health, 1) });
  }
  // Rasten, wenn die LP niedrig sind und Rasten möglich ist.
  function erholen(x) {
    // Nahrung: in Städten aus dem Kontor holen, sonst kaufen (ein umsichtiger Spieler hält mindestens 20 im Gepäck).
    if ((x.ressource ?? 0) < 20 && SY.kontorAm(x.knoten) && x.silver >= 40) {
      const ausKontor = Math.min(20, x.kontor?.[SY.kontorAm(x.knoten)]?.nahrung ?? 0);
      if (ausKontor > 0) x = rules.nahrungTragen(x, ausKontor, false);
      for (const menge of [20, 10, 5]) {
        if ((x.ressource ?? 0) >= 20) break;
        const y = rules.kontorHandel(x, "nahrung", menge, true);
        if (y !== x) { x = rules.nahrungTragen(y, menge, false); p.nahrungGekauft = (p.nahrungGekauft ?? 0) + menge; }
      }
      if ((x.ressource ?? 0) < 5) p.hinweise.push("Kaum Nahrung und kein Silber zum Kaufen (Stufe " + rules.level(x) + ", Silber " + x.silver + ")");
    }
    if (x.health >= 0.7 * rules.healthLimit(x)) return x;
    if (!rules.rastGrund(x)) return rules.rast(x);
    return x;
  }
  // ---- Reisen: Etappe für Etappe zum Ziel, mit Begegnungen. ----
  function reisen(x, ziel) {
    for (let i = 0; i < 40 && x && x.knoten !== ziel; i++) {
      zug();
      const route = rules.marschRoute(x, ziel);
      if (!route?.length) { p.blockiert = "Kein Weg von " + x.knoten + " nach " + ziel; return null; }
      const grund = rules.reiseGrund(x, route[0]);
      if (grund) {
        if (/Silber/.test(grund)) { p.hinweise.push("Reise braucht Silber: " + grund + " (" + x.knoten + " → " + route[0] + ", Silber " + x.silver + ")"); if (p.silberNot++ > 5) { p.blockiert = "Kein Silber für die Überfahrt (" + grund + ")"; return null; } x = auftraegeMachen(x, 2, true); if (!x) return null; continue; }
        p.blockiert = "Reise gesperrt: " + grund + " (" + x.knoten + " → " + route[0] + ", Szene " + x.scene + ", LP " + x.health + ", Kampf " + Boolean(x.combat) + ")";
        return null;
      }
      x = rules.reise(x, route[0]);
      p.etappen++;
      if (x.combat) x = kaempfen(x);
      // Begegnungen mit Szenen (Wahl) – erste mögliche Wahl.
      for (let k = 0; k < 6 && x.scene !== "weltknoten" && !x.combat && x.health > 0 && x.scene !== "defeat"; k++) {
        const wahl = rules.choices(x).find((c) => !c.disabled);
        if (!wahl) break;
        x = rules.choose(x, wahl.id, wuerfel);
        if (x.combat) x = kaempfen(x);
      }
      x = nachNiederlage(x);
      if (!x) return null;
      x = erholen(x);
    }
    return x;
  }
  // ---- Aushang-Aufträge am aktuellen Ort (oder in der Hauptstadt), bis n erledigt sind. ----
  function auftraegeMachen(x, n, nurHier = false) {
    let erledigt = 0;
    for (const ort of nurHier ? [x.knoten] : [x.knoten, HUB[faction]]) {
      if (ort !== x.knoten) { x = reisen(x, ort); if (!x) return null; }
      for (const a of rules.aushang(x)) {
        if (erledigt >= n) return x;
        if (a.grund || a.spiel.weg) continue;
        let y = rules.auftragAnnehmen(x, a.id);
        if (y === x) continue;
        y = rules.auftragAusfuehren(y, a.id);
        if (y.combat) y = kaempfen(y);
        y = nachNiederlage(y);
        if (!y) return null;
        if (y.weltAuftraege?.[a.id]?.status !== "erledigt" && y.weltAuftraege?.[a.id]) {
          const abgabe = rules.auftragAbgeben(y, a.id);
          if (abgabe !== y) y = abgabe;
        }
        if (y.tatOffen) y = rules.tatWaehlen(y, "gut") !== y ? rules.tatWaehlen(y, "gut") : rules.tatWaehlen(y, rules.taten(y)[0].id);
        x = werben(erholen(reload(y)));
        erledigt++;
        p.auftraege++;
      }
    }
    return x;
  }
  // Gefährten, die nach einem Auftrag bereitstehen, nimmt die Spielerin auf (wie das Angebot in der Oberfläche).
  function werben(x) {
    for (const [id] of rules.candidates(x)) {
      if (rules.recruitment(x, id) !== "ready") continue;
      const y = rules.recruit(x, id);
      if (y !== x) { x = reload(y); p.dialoge.push("Gefährte " + id); }
    }
    return x;
  }
  // Nächste Stadt (kürzeste Route) mit freiem Aushang-Auftrag.
  function naechsterAushang(x) {
    let best = null;
    for (const k of Object.values(knoten.alle)) {
      if (k.id === x.knoten) continue;
      let frei;
      try { frei = rules.aushang({ ...x, knoten: k.id }).some((a) => !a.grund && !a.spiel.weg); } catch { frei = false; }
      if (!frei) continue;
      const route = rules.marschRoute(x, k.id);
      if (route?.length && (!best || route.length < best.n)) best = { id: k.id, n: route.length };
    }
    return best?.id ?? null;
  }
  // Dialog-Antwort: gelingende Probe zuerst, dann eine Antwort ohne Kosten, sonst die erste mögliche.
  const antwort = (optionen, grundFn) => {
    const frei = optionen.filter((o) => !grundFn(o));
    return frei.find((o) => o.probe && rules.probeInfo(s, o.probe)?.gelingt) ?? frei.find((o) => !/Silber|Nahrung|Rationen|Runensplitter|Eisen/.test(o.folge ?? "")) ?? frei[0];
  };

  // ---- Prolog ----
  p.phase = "Prolog";
  for (let i = 0; i < 80 && s.scene !== "weltknoten"; i++) {
    zug();
    if (s.combat) { s = kaempfen(s); continue; }
    const wahl = rules.choices(s).find((c) => !c.disabled);
    if (!wahl) { p.blockiert = "Prolog ohne Wahl in Szene " + s.scene; return p; }
    s = rules.choose(s, wahl.id, wuerfel);
  }
  if (s.scene !== "weltknoten") { p.blockiert = "Prolog endet nicht im Weltknoten (" + s.scene + ")"; return p; }
  s = reload(s);
  p.stufen.prolog = rules.level(s);
  p.silber.prolog = s.silver;

  // ---- Akt 1 ----
  p.phase = "Akt 1";
  for (let i = 0; i < 12; i++) {
    const h = rules.hauptquest(s);
    if (!h || h.fertig) break;
    s = reisen(s, h.zielOrt);
    if (!s) return p;
    const h2 = rules.hauptquest(s);
    let id = null;
    if (!h2.bericht) {
      const o = antwort(h2.schritt.wahlen, (x) => rules.hauptGrund(s, x.id));
      if (!o) { p.blockiert = "Akt 1 Schritt " + h2.schritt.nr + ": keine Antwort möglich (" + h2.schritt.wahlen.map((w) => rules.hauptGrund(s, w.id)).join(" / ") + ")"; return p; }
      id = o.id;
      p.dialoge.push("A1." + h2.schritt.nr + " " + o.label);
    }
    const n = rules.hauptWeiter(s, id);
    if (n === s) { p.blockiert = "Akt 1 Schritt " + h2.schritt.nr + ": " + rules.hauptGrund(s, id); return p; }
    s = n.combat ? kaempfen(n) : n;
    s = nachNiederlage(s);
    if (!s) return p;
    s = erholen(reload(s));
  }
  p.stufen.akt1 = rules.level(s);
  p.silber.akt1 = s.silver;

  // ---- Bis Akt 2 frei ist: Aufträge in der Hauptstadt ----
  p.phase = "Aufträge";
  let vorher = p.auftraege;
  for (let i = 0; i < 15 && rules.akteInfo(s)?.grund; i++) {
    const grund = rules.akteInfo(s).grund;
    if (!/Stufe/.test(grund)) { p.blockiert = "Akt 2 gesperrt: " + grund; return p; }
    s = auftraegeMachen(s, 2);
    if (!s) return p;
  }
  if (rules.akteInfo(s)?.grund) { p.blockiert = "Akt 2 nach 30 Aufträgen noch gesperrt: " + rules.akteInfo(s).grund; return p; }
  p.auftraegeBisAkt2 = p.auftraege - vorher;
  p.stufen.akt2Start = rules.level(s);

  // ---- Akt 2 und 3 ----
  p.phase = "Akt 2/3";
  for (const fraktion of SCHWESTERN[faction]) {
    s = reisen(s, HUB[fraktion]);
    if (!s) return p;
    const sz = rules.szeneInfo(s, "zweig", fraktion);
    if (sz && !sz.erledigt) {
      const o = antwort(sz.optionen, (x) => x.grund);
      s = reload(rules.zweigSzeneWaehlen(s, fraktion, o.id));
      p.dialoge.push("Zweig " + fraktion + " " + o.label);
    }
    for (let stufe = 0; stufe < 3; stufe++) {
      s = reisen(s, HUB[fraktion]);
      if (!s) return p;
      if (GEDULDIG) {
        const min = Number(rules.akteInfo(s).zweige.find((z) => z.fraktion === fraktion).stufen.split("-")[0]);
        for (let k = 0; k < 20 && rules.level(s) < min; k++) { s = auftraegeMachen(s, 2); if (!s) return p; }
        s = reisen(s, HUB[fraktion]); if (!s) return p;
      }
      let grund = rules.zweigGrund(s, fraktion, stufe === 0 ? "good" : null);
      for (let k = 0; k < 6 && grund && /Stufe|Silber/.test(grund); k++) { s = auftraegeMachen(s, 2); if (!s) return p; s = reisen(s, HUB[fraktion]); if (!s) return p; grund = rules.zweigGrund(s, fraktion, stufe === 0 ? "good" : null); }
      if (grund) { p.blockiert = "Zweig " + fraktion + " Stufe " + (stufe + 1) + ": " + grund; return p; }
      let n = rules.zweigWeiter(s, fraktion, stufe === 0 ? "good" : null);
      n = n.combat ? kaempfen(n) : n;
      const nieder = n.scene === "defeat" || n.health <= 0;
      s = nachNiederlage(n);
      if (!s) return p;
      if (nieder) stufe--; // nach einer Niederlage denselben Schritt erneut
      s = erholen(reload(s));
      if (p.niederlagen > 25) { p.blockiert = "Mehr als 25 Niederlagen (Zweig " + fraktion + ")"; return p; }
    }
    p.stufen["zweig_" + fraktion] = rules.level(s);
  }
  const fspez = rules.akteInfo(s).fspezOptionen?.[0];
  if (fspez) s = reload(rules.fspezWaehlen(s, fspez.spec_id));
  p.silber.akt3 = s.silver;

  // ---- Akt 4 ----
  p.phase = "Akt 4";
  for (let i = 0; i < 30; i++) {
    const a4 = rules.akteInfo(s).akt4;
    if (a4.fertig) break;
    if (GEDULDIG && rules.level(s) < Number(a4.stufen.split("-")[0])) {
      for (let k = 0; k < 30 && rules.level(s) < Number(a4.stufen.split("-")[0]); k++) {
        const vorher = s.xp;
        s = auftraegeMachen(s, 2); if (!s) return p;
        if (s.xp === vorher) {
          // Die Bretter hier und in der Hauptstadt sind leer: zur nächsten Stadt mit offenem Aushang reisen.
          const ziel = naechsterAushang(s);
          if (!ziel) { p.hinweise.push("Akt 4: kein offener Aushang mehr erreichbar (Stufe " + rules.level(s) + ")"); break; }
          s = reisen(s, ziel); if (!s) return p;
          const xp0 = s.xp, a0 = p.auftraege;
          s = auftraegeMachen(s, 5, true); if (!s) return p;
          p.grind = p.grind ?? [];
          p.grind.push({ ort: ziel, stufe: rules.level(s), auftraege: p.auftraege - a0, ep: s.xp - xp0 });
        }
      }
      continue;
    }
    if (a4.zielOrt && s.knoten !== a4.zielOrt) { s = reisen(s, a4.zielOrt); if (!s) return p; continue; }
    const info = rules.akteInfo(s).akt4;
    let wahl = null;
    if (info.wahlen.length) wahl = info.wahlen[0].id;
    else if (info.szene) wahl = antwort(info.szene.optionen, (x) => x.grund).id;
    if (info.grund && !/Antwort/.test(info.grund) && !wahl) {
      if (/Stufe/.test(info.grund)) { s = auftraegeMachen(s, 2); if (!s) return p; continue; }
      p.blockiert = "Akt 4: " + info.grund; return p;
    }
    let n = rules.akt4Weiter(s, wahl);
    if (n === s) { p.blockiert = "Akt 4 hängt: " + rules.akt4Grund(s, wahl); return p; }
    n = n.combat ? kaempfen(n) : n;
    s = nachNiederlage(n);
    if (!s) return p;
    s = erholen(reload(s));
    if (p.niederlagen > 40) { p.blockiert = "Mehr als 40 Niederlagen (Akt 4)"; return p; }
  }
  p.stufen.akt4 = rules.level(s);
  if (!rules.akteInfo(s).akt4.fertig) { p.blockiert = "Akt 4 nach 30 Versuchen nicht abgeschlossen (Schritt " + rules.akteInfo(s).akt4.schritt + ")"; return p; }
  p.silber.akt4 = s.silver;
  p.ende = { hochfeldherr: s.marks.includes("hochfeldherr"), hardcore: rules.hardcoreFrei(s), armada: rules.akteInfo(s).armada?.offen ?? false,
    gefaehrten: s.party.length, moral: s.moral };
  // Plausibilität: auffällige Werte im Journal
  for (const t of s.journal) {
    if (/undefined|NaN|null|\[object/.test(t)) p.fehler.push("Journal enthält kaputten Text: " + t.slice(0, 140));
  }
  return p;
}

const [nurF, nurR] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const ergebnis = [];
for (const faction of nurF ? [nurF] : Object.keys(HUB)) for (const role of nurR ? [nurR] : ROLLEN) {
  let p;
  try { p = lauf(faction, role); } catch (e) { p = { faction, role, absturz: e.message + " " + (e.stack ?? "").split("\n")[1] }; }
  ergebnis.push(p);
  console.log([faction, role, p.absturz ? "ABSTURZ " + p.absturz : p.blockiert ? "BLOCKIERT " + p.blockiert : "fertig",
    "Stufen " + JSON.stringify(p.stufen ?? {}), "Niederlagen " + (p.niederlagen ?? "-"), "Kämpfe " + (p.kaempfe ?? "-"),
    "Aufträge " + (p.auftraege ?? "-") + " (bis Akt 2: " + (p.auftraegeBisAkt2 ?? "-") + ")", "Etappen " + (p.etappen ?? "-"),
    p.fehler?.length ? "FEHLER " + [...new Set(p.fehler)].slice(0, 3).join(" | ") : ""].join(" · "));
}
fs.writeFileSync(path.join(__dirname, GEDULDIG ? "gesamt-geduldig-ergebnis.json" : "gesamt-ergebnis.json"), JSON.stringify({ stand: new Date().toISOString(), ergebnis }, null, 1));
