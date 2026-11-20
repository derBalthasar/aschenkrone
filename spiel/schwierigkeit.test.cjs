"use strict";

// Henry, 20. 11. 2026: Vier Schwierigkeitsgrade mit Hardcore (quellen/henry/v2619/schwierigkeitsgrade.json).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ structuredClone });
for (const file of ["bestiarium/daten.js", "spiel/klassen.js", "spiel/faehigkeiten.js", "spiel/kampf.js", "spiel/startpunkte.js", "spiel/welt.js", "spiel/knoten-daten.js", "spiel/knoten.js", "spiel/nebenquests-daten.js", "spiel/nebenquests.js", "spiel/systeme-daten.js", "spiel/systeme.js", "spiel/akt-dialoge.js", "spiel/regeln.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const rules = vm.runInContext("rules", context);
const SY = rules.systeme;
rules.setTravelDice(() => 0);
const reload = (state) => rules.read(JSON.stringify(state));
const held = (extra = {}) => {
  const s = { ...rules.create("Tala", "kronreich", "frau", 1, "krieger"), scene: "weltknoten", knoten: "kronhall", handlung: null, ...extra };
  return reload({ ...s, health: rules.healthLimit(s) });
};

test("Standard ist Leicht, alte Spielstände spielen auf Leicht", () => {
  assert.equal(rules.create("Tala", "kronreich", "frau", 1, "krieger").schwierigkeit, "leicht");
  const alt = held();
  delete alt.schwierigkeit;
  assert.equal(reload(alt).schwierigkeit, "leicht");
  assert.throws(() => reload({ ...held(), schwierigkeit: "albtraum" }), /beschädigt/);
});

test("Mittel und Schwer: mehr Gegner-LP, mehr EP und Silber", () => {
  const leicht = rules.auftragAusfuehren(rules.auftragAnnehmen(held(), "kronhall_q04"), "kronhall_q04");
  const schwer = rules.auftragAusfuehren(rules.auftragAnnehmen(rules.schwierigkeitWaehlen(held(), "schwer"), "kronhall_q04"), "kronhall_q04");
  assert.equal(schwer.combat.feinde[0].max, Math.round(leicht.combat.feinde[0].max * 1.3));
  const mittel = rules.awardXp(rules.schwierigkeitWaehlen(held(), "mittel"), "probe", 100);
  assert.equal(mittel.xp, held().xp + 110);
});

test("Hardcore: nur freigeschaltet und nur bei der Erstellung, danach kein Wechsel", () => {
  const neu = held();
  assert.match(rules.schwierigkeitGrund(neu, "hardcore", { neu: true }), /Gesperrt/);
  assert.equal(rules.schwierigkeitGrund(neu, "hardcore", { neu: false, freigeschaltet: true }), "nur bei der Charaktererstellung");
  const hc = rules.schwierigkeitWaehlen(neu, "hardcore", { neu: true, freigeschaltet: true });
  assert.equal(hc.schwierigkeit, "hardcore");
  assert.equal(rules.permadeath(hc), true);
  assert.equal(rules.schwierigkeitGrund(hc, "leicht"), "Hardcore lässt sich im Spiel nicht wechseln");
  assert.equal(rules.schwierigkeitGrund(neu, "schwer"), null, "Leicht, Mittel, Schwer frei wechselbar");
  assert.equal(rules.hardcoreFrei(held({ questStufe: 3 })), false);
  assert.equal(rules.hardcoreFrei(held({ questStufe: 4 })), true);
});

test("Permadeath bei 0 LP: keine Rettung in die Zuflucht", () => {
  const leicht = reload({ ...held(), scene: "defeat", health: 0, gefallenIn: "weltknoten" });
  const hc = reload({ ...leicht, schwierigkeit: "hardcore" });
  assert.ok(rules.choices(leicht).some((c) => c.survive), "Leicht: Rettung möglich");
  assert.ok(!rules.choices(hc).some((c) => c.survive), "Hardcore: keine Rettung");
  const rettung = rules.choices(leicht).find((c) => c.survive);
  assert.equal(rules.choose(hc, rettung.id), hc);
  const gerettet = rules.choose(leicht, rettung.id);
  assert.equal(gerettet.health, 1);
});
