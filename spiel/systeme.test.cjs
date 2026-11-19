"use strict";

// Spielsysteme der Menschen (Henry, 18. 11. 2026, Patches 1.6.0 bis 2.3.0).
const assert = require("node:assert/strict");
const S = require("./systeme.js");
const D = S.daten;

// Datenumfang aus Henrys Dateien.
assert.equal(Object.keys(D.klassen).length, 18);
assert.equal(S.gegnerListe.length, 33);
assert.equal(Object.keys(D.doerfer).length, 69);
assert.equal(S.klasseVon("kronreich", "krieger").name, "Blutritter der Krone");

// Stufen bis 30 (Patch 2.1.0 Punkt 1): bis 20 wie bisher, danach 1900 + (n − 20) · 350.
assert.equal(S.epFuer(20), 19000);
assert.equal(S.epFuer(21) - S.epFuer(20), 2250);
assert.equal(S.epFuer(30), 57250);
assert.equal(S.stufeAus(57249), 29);
assert.equal(S.stufeAus(57250), 30);
assert.equal(S.ahnenPunkte(57250 + 9999), 1);
// Patch 2.5.5: ein Meister-Talentpunkt je Stufe von 21 bis 30.
assert.equal(S.talentPunkte(20), 0);
assert.equal(S.talentPunkte(21), 1);
assert.equal(S.talentPunkte(30), 10);
assert.equal(S.signaturRang(25), 4);

// Schaden (Patch 2.2.0): Rüstung prozentual, mindestens 1, Durchdringung senkt die Rüstung.
assert.equal(S.schaden(100, 0), 100);
// Patch 2.5.1: Konstante 14 nach dem Teilen durch 3,5.
assert.equal(S.schaden(100, 14), 50);
assert.equal(S.schaden(90, 7), 60);
assert.equal(S.schaden(100, 28, 0.5), 50);
assert.equal(S.schaden(0.4, 100), 1);
assert.equal(S.rohSchaden(10, 16, 1.5, true), 40.5);
assert.equal(S.maxMana(12, 11), 12 + 12 + 5);
assert.equal(S.skaliert(35), 10);
assert.equal(S.skaliert(180), 51);
assert.equal(S.skaliert(0.4), 1);

// Ruf-Ränge und Preise; geächtet ab −25.
assert.equal(S.rufRang(-25).id, "geaechtet");
assert.equal(S.rufRang(19).id, "fremder");
assert.equal(S.rufRang(20).id, "schutzherr");
assert.equal(S.rufRang(60).id, "bannerjarl");
const held = { faction: "kronreich", factionRuf: { groves: -30 }, silver: 100, ressource: 10 };
assert.equal(S.geaechtet(held), true);
assert.equal(S.handelGrund(held, "kronhall", "holz", 1, true), "geächtet: kein Handel im Kontor");
assert.equal(S.handelGrund(held, "koenigsau", "holz", 1, true), "nur in Städten der Menschen");

// Moral: Hunger −15, Runenharfe halbiert ihn; geächtet drehen gute und böse Taten.
const m = { faction: "kronreich", moral: 60, equipment: {} };
assert.equal(S.moralAendern(m, "hunger"), -15);
assert.equal(m.moral, 45);
assert.equal(S.moralAendern({ ...held, moral: 60 }, "boese"), 6);
assert.equal(S.moralStufe({ moral: 10 }).name, "Gebrochen");

// Reisegefahr: Grenzstraße setzt 10 %, Signalfeuer −15 %, Moral verschiebt.
const reisend = { faction: "kronreich", moral: 60, strassen: ["P01"], signalfeuer: ["S01"] };
assert.equal(S.reiseGefahr(reisend, 0.4, "P01"), 0.1);
assert.equal(S.reiseGefahr(reisend, 0.4, "S01"), 0.25);
assert.equal(S.reiseGefahr({ ...reisend, moral: 10 }, 0.4, "X"), 0.55);

// Dörfer und Zehnt: alle 6 Etappen ab Ruf 20 ins Kontor.
const z = { faction: "kronreich", factionRuf: { groves: 20 }, etappen: 0 };
assert.deepEqual(S.befreie(z, "kronhall"), ["koenigsau", "muehlbach", "weizenhof"]);
for (let i = 0; i < 5; i++) assert.deepEqual(S.etappe(z, () => 0.99), []);
assert.equal(S.etappe(z, () => 0.99).length, 1);
assert.ok(S.kontor(z, "kronreich").nahrung > 0);

// Gegner skalieren linear bis Stufe 30 (Patch 2.1.0 Punkt 12).
const g = S.gegnerListe[0];
assert.equal(S.gegnerWerte(g.id, g.minStufe).lp, g.werte.hp);
assert.ok(S.gegnerWerte(g.id, 30).lp > S.gegnerWerte(g.id, 20).lp);

// Kriegskasse: Spenden ab Akt 4, voll mit 30/25/25/20.
const k = { faction: "kronreich", questStufe: 3, factionRuf: {}, ressource: 50, kontor: { kronreich: { nahrung: 0, holz: 30, eisen: 30, stein: 30, runensplitter: 0 } } };
assert.equal(S.spenden(k, "kronhall", "holz", 25), true);
assert.equal(k.factionRuf.groves, 50);
assert.equal(S.kasseVoll(k), false);
