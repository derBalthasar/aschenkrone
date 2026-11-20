"use strict";

// Patch 2.6.3: End-to-End-Simulation Akt 1 bis Akt 4 (Henry, Spezifikation 2.6.0–2.6.16, Modul ASCHENKRONE_E2E_SIMULATION_ACT1_TO_ACT4).
//   node sim/e2e.cjs            beide Profile
//   node sim/e2e.cjs party      nur E2E_STANDARD_PARTY_RUN (3 Fraktionen × 6 Klassen × 2 Prolog-Wahlen)
//   node sim/e2e.cjs outlaw     nur E2E_OUTLAW_SOFTLOCK_CHECK
// Der Held startet nach Akt 1 (Wahl A oder B) mit zwei Gefährten seiner Fraktionsreihe. Je Phase wird er auf die
// Zielstufe gehoben, verteilt alle Punkte, erhält die Schmiedestufe der Phase und kämpft die Akt-Kämpfe mit derselben
// Kampflogik wie sim/simulator.cjs. Eine Niederlage zählt; danach lädt der Lauf wie ein Spieler den Stand vor dem Kampf
// (höchstens 3 Versuche). Ergebnis: sim/e2e-ergebnis.json und eine Tabelle auf der Konsole.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ structuredClone });
for (const file of ["bestiarium/daten.js", "spiel/klassen.js", "spiel/faehigkeiten.js", "spiel/kampf.js", "spiel/startpunkte.js",
  "spiel/welt.js", "spiel/knoten-daten.js", "spiel/knoten.js", "spiel/nebenquests-daten.js", "spiel/nebenquests.js",
  "spiel/systeme-daten.js", "spiel/systeme.js", "spiel/regeln.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const rules = vm.runInContext("rules", context);
const NQ = vm.runInContext("nebenquestDaten", context);
const SY = rules.systeme;
rules.setTravelDice(() => 0.99);
const reload = (s) => rules.read(JSON.stringify(s));

const ROLLEN = ["krieger", "waechter", "spaeher", "magier", "heiler", "schurke"];
const HAUPTSTADT = { kronreich: "kronhall", orden: "glutberg", haefen: "perlvik" };
const SCHRITTE_AKT1 = { kronreich: 3, orden: 4, haefen: 4 };
const SCHWESTERN = { kronreich: ["haefen", "orden"], orden: ["kronreich", "haefen"], haefen: ["kronreich", "orden"] };
const BEGLEITER = { kronreich: ["sigrid", "wulfgar"], orden: ["halvar", "gunhild"], haefen: ["halvor", "karen"] };
const TALENTE = ["TREE_EISERNE_VORHUT", "TREE_RUNEN_UND_GLUTRESONANZ", "TREE_UNGEBROCHENER_SCHILDWALL", "TREE_SCHATTENPFAD_UND_LIST", "TREE_BANNERJARL"];
const PHASEN = { akt2: { stufe: 10, schmiede: 1, tier: 2 }, akt3: { stufe: 15, schmiede: 2, tier: 3 }, akt4: { stufe: 22, schmiede: 3, tier: 4 } };

let saat = 1;
const wuerfel = () => ((saat = (saat * 16807) % 2147483647) / 2147483647);
const mitte = () => 0.5;

// ---- Punkte verteilen: Talente, Fähigkeitsränge, dann Grundwerte nach dem höchsten Wert ----
function verteilen(state) {
  for (const id of TALENTE) for (let i = 0; i < 3; i++) {
    const next = rules.talentLernen(state, id);
    if (next === state) break;
    state = next;
  }
  const wirkung = (f) => f.regel?.schaden ?? f.regel?.heilung ?? 0;
  for (let i = 0; i < 40; i++) {
    const k = rules.abilities(state).filter((f) => f.frei && !rules.faehigkeitGrund(state, f.id)).sort((a, b) => wirkung(b) - wirkung(a));
    if (!k.length) break;
    state = rules.faehigkeitSteigern(state, k[0].id);
  }
  const start = rules.heroAttributes(state);
  for (const id of Object.keys(start).sort((a, b) => start[b] - start[a])) {
    for (let i = 0; i < 40; i++) {
      const next = rules.train(state, id);
      if (next === state) break;
      state = next;
    }
  }
  if (!state.build.spez && rules.spezBereit(state)) {
    const haupt = Object.keys(state.build.fertigkeiten).sort((a, b) => state.build.fertigkeiten[b] - state.build.fertigkeiten[a]);
    const grund = Object.keys(start).sort((a, b) => start[a] - start[b]);
    suche: for (const f of haupt) for (const g of grund) {
      const next = rules.specialize(state, "a", g, f);
      if (next !== state) { state = next; break suche; }
    }
  }
  return state;
}
function phase(state, name) {
  const p = PHASEN[name];
  state = reload({ ...state, xp: Math.max(state.xp, SY.epFuer(p.stufe)) });
  state = verteilen(state);
  // Stufengerechte Ausrüstung: je Platz das stärkste für die Klasse erlaubte Teil bis zum Tier der Phase.
  const wert = (st) => { const g = rules.gearStats(st); return (g.damage ?? 0) * 2 + (g.armor ?? 0) * 1.5 + (g.magic ?? 0); };
  const kandidaten = Object.values(SY.daten.gegenstaende).filter((g) => g.tier && g.tier <= p.tier && g.slot && !/RELIKT/.test(g.slot))
    .sort((a, b) => b.tier - a.tier);
  for (const g of kandidaten) {
    if (rules.ausruestungGrund(state, g.id)) continue;
    const probe = reload({ ...state, inventory: [...state.inventory, g.id] });
    const angelegt = rules.equip(probe, g.id);
    if (angelegt !== probe && wert(angelegt) > wert(state)) state = reload(angelegt);
  }
  const aufwertung = {};
  for (const id of Object.values(state.equipment)) if (id) aufwertung[id] = p.schmiede;
  state = reload({ ...state, aufwertung });
  return reload({ ...state, health: rules.healthLimit(state) });
}

// ---- Kampf wie in sim/simulator.cjs ----
const gegnerLp = (s) => (s.combat ? s.combat.feinde.reduce((sum, f) => sum + f.lp, 0) : 0);
function kampf(s) {
  let zuletzt = null;
  for (let runde = 0; s.combat && runde < 120; runde++) {
    // Abwehr nur bei wenig LP und nie zweimal hintereinander (sonst endlose Patt-Runden).
    const abwehr = s.health < 0.4 * rules.healthLimit(s) && zuletzt !== "guard" ? ["guard"] : [];
    const aktionen = [...rules.abilities(s).filter((f) => f.frei && !rules.abilityState(s, f.id)).map((f) => f.id), "spear", ...abwehr];
    // Nach 30 Runden zählt Schaden am Gegner mehr als eigene LP (sonst heilen Heiler endlos, statt den Kampf zu beenden).
    const lpGewicht = runde > 30 ? 0.3 : 1.2;
    const wert = (n) => n === s ? -Infinity : (n.combat ? 0 : 1000) + gegnerLp(s) - gegnerLp(n) - lpGewicht * (s.health - n.health) - (n.health ? 0 : 5000);
    const beste = aktionen.reduce((best, id) => (wert(rules.strike(s, id, mitte)) > wert(rules.strike(s, best, mitte)) ? id : best), "spear");
    s = rules.strike(s, beste, wuerfel);
    zuletzt = beste;
  }
  return s;
}
// Ein Akt-Kampf; nach 3 Niederlagen levelt der Held wie ein Spieler eine Stufe nach (höchstens 6) und versucht es erneut.
function schaffen(s, starte, protokoll, name) {
  for (let extra = 0; extra <= 6; extra++) {
    const start = starte(s);
    if (start === s) { protokoll.fehler.push(name + " blockiert"); return null; }
    const r = aktKampf(s, start, protokoll, name);
    if (r.s) return r.s;
    protokoll.nachgelevelt = (protokoll.nachgelevelt ?? 0) + 1;
    s = verteilen(reload({ ...s, xp: SY.epFuer(rules.level(s) + 1) }));
    s = reload({ ...s, health: rules.healthLimit(s) });
  }
  protokoll.fehler.push(name + ": auch mit 6 Stufen mehr nicht zu schaffen");
  return null;
}
// Ein Akt-Kampf mit bis zu 3 Versuchen. Liefert den Stand nach dem Sieg (oder null) und die Zahl der Niederlagen.
function aktKampf(vorher, start, protokoll, name) {
  for (let versuch = 1; versuch <= 3; versuch++) {
    saat = 7 * versuch + protokoll.kaempfe.length;
    if (!start.combat) return { s: start };
    const ende = kampf(structuredClone(start));
    const sieg = !ende.combat && ende.health > 0 && ende.scene === "weltknoten";
    protokoll.kaempfe.push({ name, versuch, sieg, restLp: Math.round(100 * ende.health / rules.healthLimit(ende)) });
    if (sieg) return { s: reload({ ...ende, health: rules.healthLimit(ende) }) };
    // Eine Niederlage darf nie einen Spielstand mit totem Helden im Kampf hinterlassen.
    if (ende.combat && ende.health <= 0) protokoll.fehler.push(name + ": toter Held mit offenem Kampf");
    start = reload(start);
  }
  return { s: null };
}

function pruefeZahlen(state, protokoll, wo) {
  const suche = (wert, pfad) => {
    if (typeof wert === "number" && !Number.isFinite(wert)) protokoll.fehler.push(wo + ": NaN/Unendlich bei " + pfad);
    else if (wert && typeof wert === "object") for (const [k, v] of Object.entries(wert)) suche(v, pfad + "." + k);
  };
  suche(state, "state");
  if (state.faction !== "orden" && state.ember !== 0) protokoll.fehler.push(wo + ": Glut " + state.ember + " ohne Orden");
}
function punkteOffen(state) {
  return rules.progression(state).points + (rules.faehigkeitInfo(state)?.punkte ?? 0) + (rules.aufstiegInfo(state)?.talentPunkte ?? 0);
}

function startHeld(faction, role, wahl) {
  let s = rules.create("Sim", faction, "frau", 1, role);
  s = reload({ ...s, scene: "weltknoten", knoten: HAUPTSTADT[faction], handlung: null, xp: SY.epFuer(5),
    hauptquest: { schritt: SCHRITTE_AKT1[faction], wahl }, questStufe: 1, party: BEGLEITER[faction] });
  return reload({ ...s, health: rules.healthLimit(s) });
}
const bei = (s, knoten) => reload({ ...s, knoten, health: rules.healthLimit(s) });

function zweig(s, fraktion, wahlArt, protokoll) {
  s = bei(s, HAUPTSTADT[fraktion]);
  for (let stufe = 0; stufe < 3; stufe++) {
    const grund = rules.zweigGrund(s, fraktion, stufe === 0 ? wahlArt : null);
    if (grund && /Silber/.test(grund)) s = reload({ ...s, silver: s.silver + 200 });
    if (rules.zweigGrund(s, fraktion, stufe === 0 ? wahlArt : null)) {
      protokoll.fehler.push("Zweig " + fraktion + " Stufe " + (stufe + 1) + " blockiert: " + rules.zweigGrund(s, fraktion, wahlArt));
      return null;
    }
    s = schaffen(s, (x) => rules.zweigWeiter(x, fraktion, stufe === 0 ? wahlArt : null), protokoll, "Zweig " + fraktion + " " + (stufe + 1));
    if (!s) return null;
  }
  return s;
}

function durchlauf(faction, role, wahl, boese, protokoll) {
  let s = startHeld(faction, role, wahl);
  pruefeZahlen(s, protokoll, "Start");
  const [erst, zweit] = SCHWESTERN[faction];
  if (boese) {
    // Geächtet bei beiden Schwesterreichen: Söldnergeld statt Schutzbund.
    SY.rufAendern(s, erst, -60);
    SY.rufAendern(s, zweit, -60);
    s = reload(s);
  }
  s = phase(s, "akt2");
  protokoll.stufen.akt2 = rules.level(s);
  s = zweig(s, erst, boese ? "evil" : "good", protokoll);
  if (!s) return protokoll;
  pruefeZahlen(s, protokoll, "Akt 2");
  s = phase(s, "akt3");
  protokoll.stufen.akt3 = rules.level(s);
  s = zweig(s, zweit, boese ? "evil" : "mercenary", protokoll);
  if (!s) return protokoll;
  const fspez = rules.akteInfo(s).fspezOptionen.map((o) => o.spec_id ?? o.id ?? o)[0];
  s = reload(rules.fspezWaehlen(s, fspez));
  protokoll.doppelteSpezialisierung = Boolean(s.build.spez && s.akte.fspez);
  if (!protokoll.doppelteSpezialisierung) protokoll.fehler.push("Spezialisierung fehlt: Klasse " + Boolean(s.build.spez) + ", Fraktion " + Boolean(s.akte?.fspez));
  pruefeZahlen(s, protokoll, "Akt 3");
  s = phase(s, "akt4");
  protokoll.stufen.akt4 = rules.level(s);
  for (const ort of ["kronhall", "glutberg", "perlvik"]) s = reload(rules.akt4Weiter(bei(s, ort)));
  s = schaffen(s, (x) => rules.akt4Weiter(x), protokoll, "Akt 4 Hinterhalt");
  if (!s) return protokoll;
  s = bei(s, "glutberg");
  const untoteVorher = s.weltLeisten?.untote ?? rules.leistenStart.untote;
  s = schaffen(s, (x) => rules.akt4Weiter(x), protokoll, "Akt 4 Thorvald");
  if (!s) return protokoll;
  const wahlen = rules.akteInfo(s).akt4.wahlen.map((w) => w.id);
  s = reload(rules.akt4Weiter(s, boese ? wahlen[wahlen.length - 1] : wahlen.find((w) => /good/.test(w)) ?? wahlen[0]));
  protokoll.thorvaldEntlarvt = s.marks.includes("thorvald-entlarvt");
  protokoll.untoteDelta = (s.weltLeisten?.untote ?? 0) - untoteVorher;
  protokoll.stilleFederVerborgen = !s.journal.some((t) => /Stille Feder/.test(t) && /ist|war|enthüllt/.test(t));
  s = reload(rules.akt4Weiter(bei(s, "kronhall")));
  protokoll.thing = s.marks.includes("grosses-thing");
  if (!protokoll.thing) protokoll.fehler.push("Großes Thing nicht erreicht: " + rules.akt4Grund(s));
  // Kriegskasse über das eigene Kontor füllen (Rohstoffe einlagern, dann spenden).
  const kontorStadt = { kronreich: "kronhall", orden: "glutberg", haefen: "perlvik" }[faction];
  s = bei(s, kontorStadt);
  const k = SY.kontor(s, faction);
  Object.assign(k, { nahrung: k.nahrung + 40, holz: k.holz + 30, eisen: k.eisen + 30, stein: k.stein + 30 });
  s = reload(s);
  for (const [roh, n] of Object.entries(SY.daten.kriegskasse.bedarf)) {
    const grund = SY.spendenGrund(s, s.knoten, roh, n);
    if (grund) { protokoll.fehler.push("Spende " + roh + ": " + grund); continue; }
    s = reload(rules.spenden(s, roh, n));
  }
  protokoll.kontorEinzahlung = rules.armadaInfo(s).voll;
  protokoll.tor = Boolean(rules.armadaInfo(s).tor);
  if (!protokoll.tor) protokoll.fehler.push("Tor zu Akt 5 nicht erreicht");
  pruefeZahlen(s, protokoll, "Akt 4");
  // Alle Punkte, die sich verteilen lassen, sind verteilt. Was übrig bleibt, hängt an Höchstwerten (Grundwert 20, Rang 4).
  const v = verteilen(s);
  protokoll.ueberzaehlig = { grundwerte: rules.progression(v).points, raenge: rules.faehigkeitInfo(v)?.punkte ?? 0,
    talente: rules.aufstiegInfo(v)?.talentPunkte ?? 0 };
  protokoll.fertig = true;
  return protokoll;
}

const auswahl = (process.argv[2] ?? "").toLowerCase();
// Nur einzelne Klassen prüfen: E2E_ROLLE=heiler node sim/e2e.cjs party
const nurRolle = process.env.E2E_ROLLE ?? null;
const ergebnis = {};
if (!auswahl || auswahl === "party") {
  ergebnis.E2E_STANDARD_PARTY_RUN = [];
  for (const faction of Object.keys(HAUPTSTADT)) for (const role of ROLLEN.filter((r) => !nurRolle || r === nurRolle)) for (const [variante, wahl] of NQ[faction].reihe.akte[0].wahl.slice(0, 2).map((w, i) => [i ? "WAHL_B" : "WAHL_A", w.id])) {
    const p = { profil: "E2E_STANDARD_PARTY_RUN", faction, role, variante, stufen: {}, kaempfe: [], fehler: [] };
    try { durchlauf(faction, role, wahl, false, p); } catch (e) { p.fehler.push("Absturz: " + e.message); }
    ergebnis.E2E_STANDARD_PARTY_RUN.push(p);
    process.stderr.write(p.fehler.length ? "x" : ".");
  }
}
if (!auswahl || auswahl === "outlaw") {
  ergebnis.E2E_OUTLAW_SOFTLOCK_CHECK = [];
  for (const faction of Object.keys(HAUPTSTADT)) {
    const p = { profil: "E2E_OUTLAW_SOFTLOCK_CHECK", faction, role: "krieger", variante: "BOESE", stufen: {}, kaempfe: [], fehler: [] };
    try { durchlauf(faction, "krieger", NQ[faction].reihe.akte[0].wahl[0].id, true, p); } catch (e) { p.fehler.push("Absturz: " + e.message); }
    ergebnis.E2E_OUTLAW_SOFTLOCK_CHECK.push(p);
    process.stderr.write(p.fehler.length ? "x" : ".");
  }
}
process.stderr.write("\n");
fs.writeFileSync(path.join(__dirname, "e2e-ergebnis.json"), JSON.stringify({ stand: new Date().toISOString(), ergebnis }, null, 1));
let fehler = 0;
for (const [profil, zeilen] of Object.entries(ergebnis)) {
  console.log("\n## " + profil);
  console.log("Fraktion | Klasse | Wahl | Stufen | Niederlagen | nachgelevelt | Thorvald | Untote | Tor | Fehler");
  for (const z of zeilen) {
    const niederlagen = z.kaempfe.filter((k) => !k.sieg).length;
    fehler += z.fehler.length;
    console.log([z.faction, z.role, z.variante, Object.values(z.stufen).join("/"), niederlagen + " von " + z.kaempfe.length, z.nachgelevelt ?? 0,
      z.thorvaldEntlarvt ? "entlarvt" : "–", z.untoteDelta ?? "–", z.tor ? "offen" : "zu", z.fehler.join("; ") || "keine"].join(" | "));
  }
}
console.log("\nGespeichert: sim/e2e-ergebnis.json · Fehler gesamt: " + fehler);
process.exitCode = fehler ? 1 : 0;
