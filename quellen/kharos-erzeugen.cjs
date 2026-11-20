"use strict";
// Kharos 3.0 (Henry, 20. 11. 2026): erzeugt spiel/kharos-daten.js aus quellen/henry/v300/*.json.
// Aufruf: node quellen/kharos-erzeugen.cjs
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const quelle = (datei) => JSON.parse(fs.readFileSync(path.join(__dirname, "henry", "v300", datei), "utf8"));
const p1a = quelle("1a-fraktionen-menschen-elfen.json");
const p1b = quelle("1b-fraktionen-zwerge-orks-untote.json");
const p2a = quelle("2a-kampagne-akte-1-4.json");
const p2b = quelle("2b-akt5-nebenquests.json");
const p3a = quelle("3a-portraets.json");
const p3b = quelle("3b-arena-silhouetten.json");
const mapping = quelle("mapping-entwurf3.json");

// Die Regeln laden, damit die Menschen-Klassennamen nach den Systempatches gelten (rules.title).
const kontext = vm.createContext({ structuredClone });
for (const datei of ["bestiarium/daten.js", "spiel/klassen.js", "spiel/faehigkeiten.js", "spiel/kampf.js", "spiel/startpunkte.js",
  "spiel/welt.js", "spiel/knoten-daten.js", "spiel/knoten.js", "spiel/nebenquests-daten.js", "spiel/nebenquests.js",
  "spiel/systeme-daten.js", "spiel/systeme.js", "spiel/regeln.js"])
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", datei), "utf8"), kontext, { filename: datei });
const K = vm.runInContext("klassen", kontext);
const rules = vm.runInContext("rules", kontext);
const klassenName = (fraktion, rolle) => { try { return rules.title(rules.create("X", fraktion, "frau", 1, rolle)); } catch { return null; } };

// Kharos-Fraktion → Spiel-Fraktion (Reihenfolge und alte Namen aus Henrys Mapping).
const altNachId = Object.fromEntries(Object.entries(K.fraktionen).map(([id, f]) => [f.name.replace(/^.*· /, ""), id]));
const altId = (name) => altNachId[name] ?? Object.entries(K.fraktionen).find(([, f]) => f.name.includes(name))?.[0];
const neuFraktionen = [...p1a.fraktionen_menschen_und_elfen, ...p1b.fraktionen_zwerge_orks_untote];
const fraktionen = {};
for (const m of mapping.fraktions_und_orte_mapping) {
  const id = altId(m.alt_fraktion.replace(/^Die /, ""));
  if (!id) throw new Error("Unbekannte Fraktion " + m.alt_fraktion);
  const kurz = m.neu_fraktion.split(" ")[0];
  const neu = neuFraktionen.find((f) => f.name.includes(kurz) || f.name.toLowerCase().includes(kurz.toLowerCase()));
  if (!neu) throw new Error("Keine Kharos-Fraktion zu " + m.neu_fraktion);
  fraktionen[id] = { kharosId: neu.fraktion_id, name: m.neu_fraktion, volk: neu.volk, anfuehrer: neu.anfuehrer_npc, zweiter: neu.zweiter_npc,
    heimat: m.hauptstadt, zweite: m.zweite_stadt, hinweis: neu.schwierigkeit_hinweis ?? null, kharosKlassen: neu.klassen };
}

// Kharos-Klassen auf die passende Grundklasse legen (Rolle → Grundklasse). Das 6×6-System bleibt, nur der Name wechselt.
const rolleZuKlasse = (rolle) => /^tank/.test(rolle) ? "waechter" : /^schurke/.test(rolle) ? "schurke" :
  /^heiler|magie_heilung/.test(rolle) ? "heiler" : /^fernkampf(?!_aoe)/.test(rolle) ? "spaeher" :
  /^nahkampf/.test(rolle) ? "krieger" : "magier";
const klassenNamen = [];
for (const [id, f] of Object.entries(fraktionen)) {
  const rollen = Object.keys(K.fraktionen[id].klassen);
  const vergeben = new Set(rollen.map((r) => klassenName(id, r)));
  for (const k of f.kharosKlassen) {
    const grund = rolleZuKlasse(k.rolle);
    const alterName = klassenName(id, grund);
    if (!alterName || alterName === k.name || vergeben.has(k.name)) continue;
    klassenNamen.push({ fraktion: id, grundklasse: grund, alt: alterName, neu: k.name, kharosKlasse: k.klasse_id, faehigkeiten: k.faehigkeiten });
  }
}

const ressourcen = Object.fromEntries(p1a.voelker_kampfressourcen.map((r) => [r.volk, r]));
const daten = {
  quelle: "quellen/henry/v300 (Henry, 20. 11. 2026)",
  welt: p1a.welt_umbenennung, fraktionen, klassenNamen, ressourcen,
  untote: p1b.untoten_sondermechanik_korrumpierung,
  kampagne: { struktur: p2a.kampagnen_struktur, akte: p2a.akte_1_bis_4, akt5: p2b.akt_5_uebersee_und_finale },
  nebenquests: p2b.aushang_nebenquests_kharos,
  portraets: p3a.kharos_portraets,
  arena: { voelker: p3b.voelker_2d_kampfmodelle, bosse: p3b.boss_sondermodelle },
};
for (const f of Object.values(daten.fraktionen)) delete f.kharosKlassen;
const ziel = path.join(__dirname, "..", "spiel", "kharos-daten.js");
fs.writeFileSync(ziel, "\"use strict\";\n// Erzeugt von quellen/kharos-erzeugen.cjs – nicht von Hand ändern.\nconst kharosDaten = " +
  JSON.stringify(daten) + ";\nif (typeof module !== \"undefined\") module.exports = kharosDaten;\n");
console.log("spiel/kharos-daten.js: " + Object.keys(fraktionen).length + " Fraktionen, " + klassenNamen.length + " Klassennamen, " +
  daten.nebenquests.length + " Nebenquests, " + daten.portraets.length + " Porträts");
