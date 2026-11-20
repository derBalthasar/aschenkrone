"use strict";

// Balance-Benchmark der Menschen (Patch 2.5.5, Henry 19. 11. 2026).
//
//   node sim/simulator.cjs            beide Läufe
//   node sim/simulator.cjs A          nur BENCHMARK_A_UNSPENT
//   node sim/simulator.cjs B 8        nur BENCHMARK_B_OPTIMAL_SPEND, 8 Kämpfe je Gegner
//   node sim/simulator.cjs C          nur SIM_BENCHMARK_C_WITH_GEAR (Patch 2.5.6)
//   node sim/simulator.cjs S          nur INFO_SOLO_B (wie B, aber der Held allein)
//
// Fragenkatalog v3.0.4, Antwort 13 A (Henry, 20. 11. 2026): Maßstab ist der Held mit 3 Gefährten seiner Fraktion
// (die drei Auftrags-Gefährten). Der Sololauf INFO_SOLO_B bleibt als Information, er ist kein Balance-Ziel.
//
// BENCHMARK_A_UNSPENT: Der Held verteilt keine Punkte (untere Grenze: Spieler vergisst die Punkteverteilung).
// BENCHMARK_B_OPTIMAL_SPEND: Der Held verteilt alles nach festen Regeln:
//   Grundwerte  Hauptwert bis zur Grenze (20, ab Stufe 30 mit Ahnenrängen 25), dann Zweitwert, dann der Rest.
//   Fähigkeiten Die freigeschaltete Fähigkeit mit der höchsten Grundwirkung (Schaden oder Heilung) zuerst.
//   Talente     Hauptbaum (Klinge & Wucht) auf 3, dann Runen- & Glutresonanz, dann Schildwall.
//   Ahnen       Zorn der Alten Könige, dann Eisernes Ahnenblut.
// SIM_BENCHMARK_C_WITH_GEAR (Patch 2.5.6): wie B auf jeder Stufe von 1 bis 30, dazu die angelegte Ausrüstung in der
//   Schmiede aufgewertet: Stufe 1–5 ohne, 6–11 +1, 12–17 +2, 18–30 +3.
// Jede Klasse kämpft (mit 3 Gefährten, Info-Lauf S allein) gegen vier Auftragsgegner auf ihrer Stufe: Mitläufergruppe (Kultisten),
// Elite (Kapitän Urgash), Anführer (Skarn) und Anführer mit Flächenangriff (Der Letzte Mammut).
// Würfel mit festem Startwert: Jeder Lauf ist wiederholbar.

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
const SY = rules.systeme;
rules.setTravelDice(() => 0.99);

const LAEUFE = {
  A: { id: "BENCHMARK_A_UNSPENT", verteilen: false },
  B: { id: "BENCHMARK_B_OPTIMAL_SPEND", verteilen: true },
  C: { id: "SIM_BENCHMARK_C_WITH_GEAR", verteilen: true, ausruestung: true, stufen: Array.from({ length: 30 }, (_, i) => i + 1), prestige: false },
  S: { id: "INFO_SOLO_B", verteilen: true, solo: true },
};
const GEFAEHRTEN = { kronreich: ["sigrid", "wulfgar", "fenris"], orden: ["halvar", "gunhild", "malte"], haefen: ["halvor", "karen", "soren"] };
const AUFWERTUNG = [{ min: 1, max: 5, stufe: 0 }, { min: 6, max: 11, stufe: 1 }, { min: 12, max: 17, stufe: 2 }, { min: 18, max: 30, stufe: 3 }];
const FRAKTIONEN = { kronreich: "kronhall", orden: "glutberg", haefen: "zollholm" };
const ROLLEN = ["krieger", "waechter", "spaeher", "magier", "heiler", "schurke"];
const STUFEN = [5, 10, 15, 20, 25, 30];
const GEGNER = [["auftrag-kultisten", "Gruppe"], ["auftrag-urgash", "Elite"], ["auftrag-skarn", "Skarn"], ["auftrag-letztermammut", "Mammut"]];
const TALENTE = ["TREE_EISERNE_VORHUT", "TREE_RUNEN_UND_GLUTRESONANZ", "TREE_UNGEBROCHENER_SCHILDWALL", "TREE_SCHATTENPFAD_UND_LIST", "TREE_BANNERJARL"];
const AHNEN = ["perk_ancestral_might", "perk_iron_blood"];

const auswahl = process.argv[2] ? [process.argv[2].toUpperCase()] : ["A", "B", "C", "S"];
const kaempfe = Number(process.argv[3] ?? 12);

let saat = 1;
const wuerfel = () => ((saat = (saat * 16807) % 2147483647) / 2147483647);
const mitte = () => 0.5;

// ---- Punkte verteilen (Lauf B) ----
function grundwerteVerteilen(state) {
  const start = rules.heroAttributes(state);
  const folge = Object.keys(start).sort((a, b) => start[b] - start[a]);
  for (const id of folge) {
    for (let i = 0; i < 40; i++) {
      const next = rules.train(state, id);
      if (next === state) break;
      state = next;
    }
  }
  return state;
}
function faehigkeitenVerteilen(state) {
  const wirkung = (f) => f.regel?.schaden ?? f.regel?.heilung ?? 0;
  for (let i = 0; i < 40; i++) {
    const kandidaten = rules.abilities(state).filter((f) => f.frei && !rules.faehigkeitGrund(state, f.id))
      .sort((a, b) => wirkung(b) - wirkung(a));
    if (!kandidaten.length) break;
    state = rules.faehigkeitSteigern(state, kandidaten[0].id);
  }
  return state;
}
function talenteVerteilen(state) {
  for (const id of TALENTE) for (let i = 0; i < 3; i++) {
    const next = rules.talentLernen(state, id);
    if (next === state) break;
    state = next;
  }
  for (const id of AHNEN) for (let i = 0; i < 5; i++) {
    const next = rules.ahnenLernen(state, id);
    if (next === state) break;
    state = next;
  }
  return state;
}
function verteilen(state) {
  // Ahnen zuerst: Eisernes Ahnenblut erhöht die LP, danach die Grundwerte bis zur (ab Stufe 30 höheren) Grenze.
  state = talenteVerteilen(state);
  state = faehigkeitenVerteilen(state);
  return grundwerteVerteilen(state);
}

// ---- Held auf Stufe n in der Hauptstadt ----
function held(faction, role, stufe, lauf, extraEp = 0) {
  let state = rules.create("Sim", faction, "frau", 2, role);
  state = rules.read(JSON.stringify({ ...state, scene: "weltknoten", knoten: FRAKTIONEN[faction], handlung: null,
    xp: SY.epFuer(stufe) + extraEp, party: lauf.solo ? [] : GEFAEHRTEN[faction] }));
  if (lauf.verteilen) state = verteilen(state);
  if (lauf.ausruestung) {
    const stufeSchmiede = AUFWERTUNG.find((a) => stufe >= a.min && stufe <= a.max).stufe;
    const aufwertung = {};
    for (const id of Object.values(state.equipment)) if (id && stufeSchmiede) aufwertung[id] = stufeSchmiede;
    state = rules.read(JSON.stringify({ ...state, aufwertung }));
  }
  return { ...state, health: rules.healthLimit(state) };
}

// ---- Kampf: jede Runde die Aktion, die den Gegnern am meisten und dem Helden am wenigsten schadet. Nach 80 Runden zählt
// der Kampf als verloren. ----
const gegnerLp = (s) => (s.combat ? s.combat.feinde.reduce((sum, f) => sum + f.lp, 0) : 0);
function kampf(s) {
  for (let runde = 0; s.combat && runde < 80; runde++) {
    // Abwehr nur bei weniger als 40 % LP, sonst blockt der Held endlos (Abwehr hält Mitläufer vollständig ab).
    const abwehr = s.health < 0.4 * rules.healthLimit(s) ? ["guard"] : [];
    const aktionen = [...rules.abilities(s).filter((f) => f.frei && !rules.abilityState(s, f.id)).map((f) => f.id), "spear", ...abwehr];
    const wert = (n) => n === s ? -Infinity : (n.combat ? 0 : 1000) + gegnerLp(s) - gegnerLp(n) - 1.2 * (s.health - n.health) - (n.health ? 0 : 5000);
    const beste = aktionen.reduce((best, id) => (wert(rules.strike(s, id, mitte)) > wert(rules.strike(s, best, mitte)) ? id : best), "spear");
    s = rules.strike(s, beste, wuerfel);
  }
  return s;
}
function kampfStart(state, gegnerId, stufe) {
  const auftrag = rules.aushang(state).find((x) => x.spiel.gegner && !x.spiel.weg);
  const s = rules.auftragAusfuehren(rules.auftragAnnehmen(state, auftrag.id), auftrag.id);
  if (!s.combat) return null;
  // Gleicher Kampfstart (Initiative, Glutschild), danach die Gegner des Benchmarks auf Heldenstufe.
  s.combat.id = gegnerId;
  // Gegner auf Gruppengröße skaliert (Held + Gefährten), wie im Spiel.
  s.combat.feinde = rules.gegnerAufstellung(gegnerId, s.party.length, stufe, stufe);
  return s;
}

function lauf(key) {
  const config = LAEUFE[key];
  const zeilen = [];
  for (const faction of Object.keys(FRAKTIONEN)) for (const role of ROLLEN) for (const stufe of [...(config.stufen ?? STUFEN), ...(config.prestige === false ? [] : ["30+"])]) {
    const prestige = stufe === "30+";
    const st = prestige ? 30 : stufe;
    const basis = held(faction, role, st, config, prestige ? 2 * 5000 : 0);
    const werte = rules.heroAttributes(basis);
    const zeile = { lauf: config.id, gruppe: basis.party.length, faction, role, klasse: SY.daten.menschenKlassen[faction][role].name, stufe,
      lp: rules.healthLimit(basis), punkteOffen: rules.progression(basis).points, raengeOffen: rules.faehigkeitInfo(basis)?.punkte ?? 0,
      werte: Object.values(werte).join("/"), quoten: {} };
    for (const [gegnerId, name] of GEGNER) {
      let siege = 0;
      let restLp = 0;
      for (let t = 0; t < kaempfe; t++) {
        saat = 1000 + t;
        const start = kampfStart(structuredClone(basis), gegnerId, st);
        if (!start) continue;
        const ende = kampf(start);
        if (ende.health > 0 && ende.scene !== "defeat" && !ende.combat) {
          siege++;
          restLp += ende.health / rules.healthLimit(ende);
        }
      }
      zeile.quoten[name] = { sieg: Math.round((siege / kaempfe) * 100), restLp: siege ? Math.round((restLp / siege) * 100) : 0 };
    }
    zeilen.push(zeile);
    process.stderr.write(".");
  }
  process.stderr.write("\n");
  return zeilen;
}

const ergebnis = Object.fromEntries(auswahl.map((key) => [LAEUFE[key].id, lauf(key)]));
const ziel = path.join(__dirname, "ergebnis.json");
fs.writeFileSync(ziel, JSON.stringify({ stand: new Date().toISOString(), kaempfe, ergebnis }, null, 1));
for (const [id, zeilen] of Object.entries(ergebnis)) {
  console.log("\n## " + id + " (" + (zeilen[0]?.gruppe ? "Held + " + zeilen[0].gruppe + " Gefährten" : "Held allein, nur Info") + ", " +
    kaempfe + " Kämpfe je Gegner, Sieg % / Rest-LP %)");
  console.log(["Klasse", "Stufe", "LP", ...GEGNER.map(([, n]) => n)].join(" | "));
  for (const z of zeilen) {
    console.log([z.faction + " " + z.klasse, z.stufe, z.lp, ...GEGNER.map(([, n]) => z.quoten[n].sieg + " / " + z.quoten[n].restLp)].join(" | "));
  }
}
console.log("\nGespeichert: " + path.relative(root, ziel));
