"use strict";

// Spielsysteme der Menschen nach Henry (18. 11. 2026, quellen/henry/systeme/, Nachträge 1.6.0 bis 2.2.0):
// Kontor und Rohstoffe, Ruf-Ränge und Preise, gute/pragmatische/böse Taten, Gruppenmoral, Dörfer und Zehnt,
// Reisegefahr, Gegner und Beute der Menschenlande, Handwerk und Schmiede, Bau und Garnison, Kriegskasse,
// Endgame, Stufen 1–30, Meister-Talente, Ahnenränge, Schadens- und Manaformel.
// Die Funktionen verändern den übergebenen Spielstand direkt; spiel/regeln.js klont vorher.
const systeme = (() => {
  const D = typeof systemDaten !== "undefined" ? systemDaten : require("./systeme-daten.js");
  const N = typeof knoten !== "undefined" ? knoten : require("./knoten.js");

  const MENSCHEN = ["kronreich", "orden", "haefen"];
  // Rufschlüssel der Menschen-Fraktionen im Spielstand (alte Schlüssel bleiben wegen der Spielstände).
  const rufSchluessel = { kronreich: "groves", orden: "order", haefen: "league" };
  const ROHSTOFFE = ["nahrung", "holz", "eisen", "stein", "runensplitter"];
  const istMensch = (fraktion) => MENSCHEN.includes(fraktion);
  const zwischen = (wert, min, max) => Math.max(min, Math.min(max, wert));
  const wuerfel = (dice, min, max) => min + Math.floor(dice() * (max - min + 1));

  // ---- Stufen 1–30 (Patch 2.1.0 Punkt 1): bis 20 wie bisher 50·n·(n−1), danach die festen Schritte ----
  const maxStufe = D.aufstieg.maxStufe;
  const epTabelle = [0, 0];
  for (let s = 2; s <= maxStufe; s++) epTabelle[s] = s <= 20 ? 50 * s * (s - 1) : epTabelle[s - 1] + D.aufstieg.schritte[s];
  const epFuer = (stufe) => epTabelle[zwischen(stufe, 1, maxStufe)];
  const stufeAus = (ep) => {
    let s = 1;
    while (s < maxStufe && ep >= epTabelle[s + 1]) s++;
    return s;
  };
  // Ahnenränge: ab Stufe 30 jede volle 5000 EP über der Schwelle.
  const ahnenPunkte = (ep) => Math.max(0, Math.floor((ep - epTabelle[maxStufe]) / D.aufstieg.ahnen.epJeRang));
  // Patch 2.5.5: Jede Stufe von 21 bis 30 bringt einen Meister-Talentpunkt (10 Punkte, 5 Bäume mit je 3 Rängen).
  const talentStufen = Array.from({ length: 10 }, (_, i) => 21 + i);
  const talentPunkte = (stufe) => talentStufen.filter((s) => stufe >= s).length;
  const talentRang = (state, id) => state.talente?.[id] ?? 0;
  // Patch 2.6.2: Wirkung eines Talentbaums bis zum erreichten Rang (Rang 1 bis 3, jede Stufe mit eigener Wirkung).
  const talentWirkung = (state, id, key) => (D.aufstieg.talente.find((t) => t.id === id)?.raenge ?? [])
    .filter((r) => r.rang <= talentRang(state, id)).reduce((s, r) => s + (typeof r.wirkung[key] === "number" ? r.wirkung[key] : 0), 0);
  // Hinterhaltsrisiko auf Reisen: Schattenpfad Rang 1, Stiefel (Patch 2.6.5) und Lagerfeuer-Vorhut (Patch 2.6.8).
  const hinterhaltMinderung = (state) => Math.min(0.9, (talentWirkung(state, "TREE_SCHATTENPFAD_UND_LIST", "ambush_risk_reduction_pct") +
    Object.values(state.equipment ?? {}).reduce((s, id) => s + (D.gegenstaende[id]?.stats?.ambushReductionPct ?? 0), 0) +
    (state.vorhut?.etappen > 0 ? state.vorhut.prozent : 0) + (state.gefaehrtenPerks?.includes("PERK_KR_GRENZPFAD") ? 10 : 0)) / 100);
  function talentGrund(state, id, stufe) {
    if (!D.aufstieg.talente.some((t) => t.id === id)) return "unbekanntes Talent";
    const vergeben = Object.values(state.talente ?? {}).reduce((s, n) => s + n, 0);
    if (vergeben >= talentPunkte(stufe)) return "kein freier Meister-Talentpunkt";
    if (talentRang(state, id) >= D.aufstieg.talentMaxRang) return "höchster Rang erreicht";
    return null;
  }
  function talentLernen(state, id, stufe) {
    if (talentGrund(state, id, stufe)) return false;
    (state.talente ??= {})[id] = talentRang(state, id) + 1;
    return true;
  }
  function ahnenGrund(state, pfad, ep) {
    const p = D.aufstieg.ahnen.pfade.find((x) => x.id === pfad);
    if (!p) return "unbekannter Pfad";
    const vergeben = Object.values(state.ahnen ?? {}).reduce((s, n) => s + n, 0);
    if (vergeben >= ahnenPunkte(ep)) return "kein freier Ahnenpunkt";
    if ((state.ahnen?.[pfad] ?? 0) >= p.max) return "höchster Rang erreicht";
    return null;
  }
  function ahnenLernen(state, pfad, ep) {
    if (ahnenGrund(state, pfad, ep)) return false;
    (state.ahnen ??= {})[pfad] = (state.ahnen[pfad] ?? 0) + 1;
    return true;
  }
  // Rang der Signaturfähigkeit: 1 ab Stufe 10, 2 ab 15, 3 ab 20, 4 (Meisterstufe) ab 25.
  const signaturRang = (stufe) => Object.entries(D.aufstieg.signaturRaenge).reduce((r, [s, rang]) => (stufe >= Number(s) ? rang : r), 0);

  // ---- Ruf (−100 bis 100 je Fraktion) ----
  const ruf = (state, fraktion) => state.factionRuf?.[rufSchluessel[fraktion] ?? fraktion] ?? 0;
  const rufRang = (wert) => D.rufRaenge.find((r) => wert >= r.min && wert <= r.max) ?? D.rufRaenge[1];
  function rufAendern(state, fraktion, delta) {
    const key = rufSchluessel[fraktion] ?? fraktion;
    (state.factionRuf ??= {})[key] = zwischen((state.factionRuf[key] ?? 0) + delta, -100, 100);
    return state.factionRuf[key];
  }
  const geaechtet = (state) => istMensch(state.faction) && ruf(state, state.faction) <= -25;

  // ---- Moral 0–100 (Patch 1.6.0, 1.6.1) ----
  const tragt = (state, id) => Object.values(state.equipment ?? {}).includes(id);
  // Basiswert-Boni aus Ausrüstung und Talent heben die wirksame Moral (Kriegshorn +10, Runenharfe +20, Veteran +5 je Rang).
  // Patch 2.6.2: Die Meister-Talentbäume geben keinen Moral-Basiswert mehr (Bannerjarl Rang 2 senkt stattdessen den Moralverlust).
  const moralBonus = (state) => Object.entries(D.moral.ausruestung).reduce((s, [id, b]) => s + (tragt(state, id) ? b.basis : 0), 0);
  const moral = (state) => zwischen((state.moral ?? D.moral.start) + moralBonus(state), D.moral.min, D.moral.max);
  const moralStufe = (state) => D.moral.stufen.find((s) => moral(state) >= s.min && moral(state) <= s.max);
  const moralSchutz = (state) => Math.min(0.6, (talentWirkung(state, "TREE_BANNERJARL", "moral_loss_reduction_pct") +
    (state.relikt === "REL_T4_BANNER_DER_EINIGUNG" ? D.gegenstaende.REL_T4_BANNER_DER_EINIGUNG.stats.moralLossReductionPct : 0) +
    (state.gefaehrtenPerks?.includes("PERK_FH_SCHWUR_DER_PLANK") ? 15 : 0) +
    (state.akte?.fspez === "FSPEC_SCHILDWALL_DER_KRONE" ? 20 : 0)) / 100);
  function moralAendern(state, ausloeser) {
    let delta = D.moral.ausloeser[ausloeser] ?? 0;
    if (geaechtet(state) && D.moral.geaechtet[ausloeser] !== undefined) delta = D.moral.geaechtet[ausloeser];
    if (ausloeser === "hunger" && tragt(state, "OFF_AHNENHARFE_T4")) delta = Math.round(delta * D.moral.ausruestung.OFF_AHNENHARFE_T4.hunger);
    if ((ausloeser === "sieg" || ausloeser === "bossSieg") && tragt(state, "OFF_SKALDENHORN_T2")) delta += D.moral.ausruestung.OFF_SKALDENHORN_T2.jeSieg;
    // Patch 2.6.x: Moralverlust sinkt durch Bannerjarl Rang 2 (−25 %), Kriegshorn des Großen Things (−15 %),
    // Schwur der Planke (−15 %) und Schildwall der Krone (−20 %), zusammen höchstens −60 %.
    if (delta < 0) delta = Math.round(delta * (1 - moralSchutz(state)));
    let wert = zwischen((state.moral ?? D.moral.start) + delta, D.moral.min, D.moral.max);
    // Kriegshorn des Alten Reiches: im Kampf fällt die Moral nie unter 40.
    if (state.combat && state.relikt === "RELIC_HORN_ALTES_REICH") wert = Math.max(wert, D.moral.reliktUntergrenze.RELIC_HORN_ALTES_REICH);
    state.moral = wert;
    return delta;
  }

  // ---- Kontor: gemeinsames Rohstofflager aller Städte einer Fraktion (Patch 2.1.0 Punkt 3) ----
  const leeresKontor = () => Object.fromEntries(ROHSTOFFE.map((r) => [r, 0]));
  const kontor = (state, fraktion) => ((state.kontor ??= {})[fraktion] ??= leeresKontor());
  // Wo steht der Held: Stadt/Hauptstadt einer Menschen-Fraktion mit Kontor (Dörfer haben keins).
  const kontorAm = (ortId) => {
    const ort = N.get(ortId);
    return ort && istMensch(ort.fraktion) && ort.typ !== "dorf" ? ort.fraktion : null;
  };
  // Patch 2.6.19 (Henry, B3): Misstraut Ragnvald dem Hof (Kronreich, harte Wahl in Akt 1), kauft der Held im Kronreich 10 % teurer.
  const preisFaktor = (state, fraktion, kaufen) => {
    const r = rufRang(ruf(state, fraktion));
    return kaufen ? r.kauf * (fraktion === "kronreich" && (state.marks ?? []).includes("ragnvald_misstraut_hof") ? 1.1 : 1) : r.verkauf;
  };
  function rohstoffPreis(state, fraktion, rohstoff, menge, kaufen) {
    const r = D.rohstoffe[rohstoff];
    if (!r) return null;
    const basis = kaufen && menge >= r.buendel ? Math.floor(menge / r.buendel) * r.buendelPreis + (menge % r.buendel) * r.kauf
      : menge * (kaufen ? r.kauf : r.verkauf);
    return Math.max(1, Math.round(basis * preisFaktor(state, fraktion, kaufen)));
  }
  function handelGrund(state, ortId, rohstoff, menge, kaufen) {
    const fraktion = kontorAm(ortId);
    if (!fraktion) return "nur in Städten der Menschen";
    if (!D.rohstoffe[rohstoff] || !Number.isInteger(menge) || menge < 1) return "ungültige Menge";
    if (!rufRang(ruf(state, fraktion)).handel) return "geächtet: kein Handel im Kontor";
    if (kaufen && state.silver < rohstoffPreis(state, fraktion, rohstoff, menge, true)) return "zu wenig Silber";
    if (!kaufen && kontor(state, fraktion)[rohstoff] < menge) return "zu wenig im Kontor";
    return null;
  }
  function handeln(state, ortId, rohstoff, menge, kaufen) {
    if (handelGrund(state, ortId, rohstoff, menge, kaufen)) return false;
    const fraktion = kontorAm(ortId);
    const preis = rohstoffPreis(state, fraktion, rohstoff, menge, kaufen);
    state.silver += kaufen ? -preis : preis;
    kontor(state, fraktion)[rohstoff] += kaufen ? menge : -menge;
    return preis;
  }
  // Nahrung zwischen Gepäck (state.ressource, höchstens 100) und Kontor tragen. Abheben geht auch geächtet.
  function nahrungGrund(state, ortId, menge, einlagern) {
    const fraktion = kontorAm(ortId);
    if (!fraktion) return "nur in Städten der Menschen";
    if (!Number.isInteger(menge) || menge < 1) return "ungültige Menge";
    if (einlagern && (state.ressource ?? 0) - menge < 1) return "zu wenig Nahrung im Gepäck";
    if (!einlagern && kontor(state, fraktion).nahrung < menge) return "zu wenig Nahrung im Kontor";
    if (!einlagern && (state.ressource ?? 0) + menge > 100) return "Gepäck voll (höchstens 100 Nahrung)";
    return null;
  }
  function nahrungTragen(state, ortId, menge, einlagern) {
    if (nahrungGrund(state, ortId, menge, einlagern)) return false;
    const k = kontor(state, kontorAm(ortId));
    state.ressource += einlagern ? -menge : menge;
    k.nahrung += einlagern ? menge : -menge;
    return true;
  }
  // Kosten aus dem Kontor der Fraktion bezahlen (Silber aus der Börse).
  function bezahlbar(state, fraktion, kosten, faktor = 1) {
    const k = kontor(state, fraktion);
    return Object.entries(kosten).every(([r, n]) => (r === "silber" ? state.silver >= Math.ceil(n * faktor) : (k[r] ?? 0) >= n));
  }
  function bezahle(state, fraktion, kosten, faktor = 1) {
    const k = kontor(state, fraktion);
    for (const [r, n] of Object.entries(kosten)) {
      if (r === "silber") state.silver -= Math.ceil(n * faktor);
      else k[r] -= n;
    }
  }

  // ---- Taten am Ende von Neben- und Dorfaufträgen (Ruf-Datei 2.0) ----
  function tatAnwenden(state, fraktion, tat, silber = 0) {
    const t = D.taten[tat];
    if (!t) return null;
    rufAendern(state, fraktion, t.ruf);
    const lohn = Math.round(silber * t.silber);
    state.silver += lohn;
    if (t.rohstoffe) state.ressource = Math.min(100, (state.ressource ?? 0) + t.rohstoffe);
    moralAendern(state, tat === "gut" ? "gut" : tat === "boese" ? "boese" : "keins");
    return { ruf: t.ruf, silber: lohn, rohstoffe: t.rohstoffe };
  }

  // ---- Dörfer, Befreiung und Zehnt (Patch 2.0.0 Punkt 6, 2.1.0 Punkt 4) ----
  const doerferVon = (stadtId) => Object.entries(D.doerfer).filter(([, d]) => d.stadt === stadtId).map(([id]) => id);
  function befreie(state, stadtId) {
    const neu = doerferVon(stadtId).filter((id) => !(state.befreit ?? []).includes(id));
    state.befreit = [...(state.befreit ?? []), ...neu];
    return neu;
  }
  const befreiteDoerfer = (state, fraktion = null) => (state.befreit ?? []).filter((id) => !fraktion || D.doerfer[id]?.fraktion === fraktion);
  // Ertrag eines Dorfes für einen Zehnt. Bannerjarl +1, Hochzitadelle der Stadt +50 %.
  function zehntErtrag(state, dorfId) {
    const d = D.doerfer[dorfId];
    const rang = rufRang(ruf(state, d.fraktion));
    if (!rang.zehnt || state.pausiert?.[dorfId] > (state.etappen ?? 0) || state.gepluendert?.includes(dorfId)) return 0;
    // Patch 2.6.2: Bannerjarl Rang 2 bringt +1 Ressource je Zehnt befreiter Dörfer.
    let menge = d.ertrag + rang.zehntBonus + talentWirkung(state, "TREE_BANNERJARL", "village_tithe_bonus_resources");
    if (siedlungsStufe(state, d.stadt) >= 3) menge = Math.floor(menge * 1.5);
    // Patch 2.6.19 (Henry, B3): Gilden-Patronat der Freien Häfen +15 % Kontor-Ertrag (aufgerundet).
    if ((state.marks ?? []).includes("gilden_patronat")) menge = Math.ceil(menge * 1.15);
    return menge;
  }
  // Eine Reise-Etappe: Zähler, alle 6 Etappen Zehnt ins Kontor, alle 8 Etappen Überfallprüfung.
  function etappe(state, dice = Math.random) {
    state.etappen = (state.etappen ?? 0) + 1;
    // Patch 2.6.8/2.6.9: gemeinsame Etappen je Gefährte (persönliche Szenen ab 4) und Vorhut-Etappen herunterzählen.
    state.gefaehrtenEtappen ??= {};
    for (const id of state.party ?? []) state.gefaehrtenEtappen[id] = (state.gefaehrtenEtappen[id] ?? 0) + 1;
    if (state.vorhut?.etappen > 0) state.vorhut = state.vorhut.etappen > 1 ? { ...state.vorhut, etappen: state.vorhut.etappen - 1 } : null;
    const meldungen = [];
    if (state.etappen % D.zehnt.etappen === 0) {
      const summe = {};
      for (const id of befreiteDoerfer(state)) {
        const menge = zehntErtrag(state, id);
        if (!menge) continue;
        const d = D.doerfer[id];
        kontor(state, d.fraktion)[d.rohstoff] += menge;
        summe[d.rohstoff] = (summe[d.rohstoff] ?? 0) + menge;
      }
      // Sägewerk & Eisenschmelze: +4 Holz und +3 Eisen ins Kontor der Stadt.
      for (const [ortId, liste] of Object.entries(state.gebaeude ?? {})) {
        if (!liste.includes("BLD_SAEGEWERK_SCHMELZE")) continue;
        const k = kontor(state, N.get(ortId).fraktion);
        k.holz += 4; k.eisen += 3;
        summe.holz = (summe.holz ?? 0) + 4; summe.eisen = (summe.eisen ?? 0) + 3;
      }
      const text = Object.entries(summe).map(([r, n]) => "+" + n + " " + D.rohstoffe[r].name.replace(/ \(.*\)/, "")).join(", ");
      if (text) meldungen.push("Der Zehnt des Schutzbundes liegt im Kontor: " + text + ".");
    }
    if (state.etappen % D.garnison.etappen === 0) {
      const u = ueberfall(state, dice);
      if (u) meldungen.push(u);
    }
    return meldungen;
  }

  // ---- Reise: Nahrung und Gefahr (Patch 2.1.0 Punkte 7 und 8) ----
  const wegTyp = (verbindung, wegId) => verbindung.kantenTyp === "seeweg" ? "seeweg" : verbindung.kantenTyp === "pass" ? "pass" :
    wegId?.startsWith("D") ? "dorf_weg" : verbindung.sicherheit === "grenzland" ? "grenzland" : "kernland";
  function reiseNahrung(state, verbindung, wegId, basis) {
    if (wegId && state.strassen?.includes(wegId) && verbindung.sicherheit === "grenzland") return Math.min(basis, D.reise.nahrung.kernland);
    return basis;
  }
  function reiseGefahr(state, basis, wegId) {
    let gefahr = basis;
    if (wegId && state.strassen?.includes(wegId)) gefahr = Math.min(gefahr, D.reise.grenzstrasseGefahr);
    if (wegId && state.signalfeuer?.includes(wegId)) gefahr += D.reise.signalfeuer;
    if (istMensch(state.faction)) gefahr += moralStufe(state).hinterhalt;
    // Patch 2.6.2/2.6.5: Schattenpfad Rang 1 −15 %, Marschstiefel −10 % (anteilig vom Wert).
    gefahr *= 1 - hinterhaltMinderung(state);
    return zwischen(Math.round(gefahr * 100) / 100, 0, 1);
  }

  // ---- Gegner und Beute der Menschenlande (Gegnerdatei 1.5.0, Patch 1.6.0, 2.0.0 Punkt 8) ----
  const gegnerListe = Object.entries(D.gegnerRegionen).flatMap(([region, r]) => r.gegner.map((g) => ({ ...g, region })));
  const gegnerNach = Object.fromEntries(gegnerListe.map((g) => [g.id, g]));
  // Werte auf einer Stufe: feste Werte bei der Mindeststufe, darüber linear wie die Rangformel (+8 % LP und Angriff je Stufe),
  // fortgeführt bis Stufe 30 (Patch 2.1.0 Punkt 12). Rüstung +1 je 3 Stufen.
  function gegnerWerte(id, stufe) {
    const g = gegnerNach[id];
    if (!g) return null;
    const s = zwischen(stufe, g.minStufe, maxStufe);
    const plus = s - g.minStufe;
    return { stufe: s, lp: Math.round(g.werte.hp * (1 + 0.08 * plus)), angriff: Math.round(g.werte.attack * (1 + 0.08 * plus)),
      ruestung: g.werte.armor + Math.floor(plus / 3), tempo: g.werte.speed };
  }
  // Umrechnung auf die Skala des Kampfdokuments vom 17. 11. (Helden 22–40 LP statt 90–150).
  // Patch 2.4.0: Teiler 3,5, auf ganze Zahlen gerundet, mindestens 1.
  const skala = 1 / D.kampf.skalaTeiler;
  const skaliert = (wert) => Math.max(1, Math.round((wert ?? 0) / D.kampf.skalaTeiler));
  function kampfWerte(id, stufe) {
    const w = gegnerWerte(id, stufe);
    if (!w) return null;
    return { lp: skaliert(w.lp), schaden: skaliert(w.angriff), ruestung: skaliert(w.ruestung), aktionen: gegnerNach[id].miniboss ? 2 : 1 };
  }
  // Begegnung auf einem Weg der Menschenlande: Miniboss nach Wegtyp (mit 5 Etappen Abklingzeit), sonst passender Gegner.
  function begegnung(state, region, typ, stufe, dice = Math.random) {
    const r = D.gegnerRegionen[region];
    if (!r) return null;
    const passt = (g) => stufe >= g.minStufe && stufe <= Math.max(g.maxStufe, stufe >= 20 ? maxStufe : g.maxStufe);
    const boss = (state.etappen ?? 0) - (state.letzterBoss ?? -99) > D.reise.minibossAbklingen &&
      dice() < (D.reise.minibossChance[typ] ?? 0);
    let pool = r.gegner.filter((g) => g.miniboss === boss && passt(g) && (!g.orte || g.orte.map((o) => o.toLowerCase()).includes(typ)));
    if (!pool.length) pool = r.gegner.filter((g) => !g.miniboss && passt(g));
    if (!pool.length) pool = r.gegner.filter((g) => !g.miniboss);
    const g = pool[Math.floor(dice() * pool.length)];
    if (g.miniboss) state.letzterBoss = state.etappen ?? 0;
    return { id: g.id, name: g.name, miniboss: g.miniboss, werte: gegnerWerte(g.id, stufe) };
  }
  function ziehePool(pool, dice) {
    const summe = pool.reduce((s, e) => s + e.weight, 0);
    let wurf = dice() * summe;
    const e = pool.find((x) => (wurf -= x.weight) < 0) ?? pool[pool.length - 1];
    return { id: e.itemId, anzahl: wuerfel(dice, e.min, e.max) };
  }
  const ausruestungDerStufe = (stufe) => Object.values(D.gegenstaende).filter((g) => g.slot && g.slot !== "GRUPPEN_RELIKT" && g.tier === stufe &&
    (g.source ?? []).some((q) => q === "LOOT" || q === "LOOT_ASCHERISS"));
  // Beute eines besiegten Gegners: Silber, Materialwürfe aus dem Familienpool, Bonusmaterial, Verbrauchsgut, Ausrüstung, Relikt.
  function beute(state, id, dice = Math.random) {
    const g = gegnerNach[id];
    if (!g) return null;
    const b = g.beute;
    const silberBonus = 1;
    const gegenstaende = [];
    const pool = D.beutePools[b.materialPoolRef] ?? [];
    for (let i = 0; i < (b.materialRolls ?? 0); i++) {
      const z = ziehePool(pool, dice);
      gegenstaende.push(z);
    }
    if (b.guaranteedMaterial) gegenstaende.push({ id: b.guaranteedMaterial.id, anzahl: b.guaranteedMaterial.count });
    if (b.bonusMaterial && dice() < b.bonusMaterial.chance) gegenstaende.push({ id: b.bonusMaterial.id, anzahl: b.bonusMaterial.count });
    if (b.consumableDrop && dice() < b.consumableDrop.chance) gegenstaende.push({ id: b.consumableDrop.id, anzahl: 1 });
    if (dice() < (b.equipmentDropChance ?? 0)) {
      const auswahl = ausruestungDerStufe(wuerfel(dice, b.stufen[0], b.stufen[1]));
      if (auswahl.length) gegenstaende.push({ id: auswahl[Math.floor(dice() * auswahl.length)].id, anzahl: 1 });
    }
    if (dice() < (b.relicDropChance ?? 0)) {
      const relikte = Object.values(D.gegenstaende).filter((x) => x.slot === "GRUPPEN_RELIKT" && x.source.includes("LOOT_ASCHERISS"));
      gegenstaende.push({ id: relikte[Math.floor(dice() * relikte.length)].id, anzahl: 1 });
    }
    // Runensplitter sind ein Rohstoff und gehen ins Kontor, alles andere in den Rucksack.
    return { silber: Math.round(wuerfel(dice, b.silber[0], b.silber[1]) * silberBonus), gegenstaende };
  }

  // ---- Ausrüstung: Rechte der Klassen und Fraktionen (Ökonomie-Datei) ----
  function ausruestungErlaubt(fraktion, klasseId, gegenstandId) {
    const g = D.gegenstaende[gegenstandId];
    if (!g?.slot) return false;
    const f = D.fraktionsHandel[fraktion];
    if (g.magicTag === "GLUT_ITEM" && f && !f.glut) return false;
    if (g.magicTag === "RUNEN_ITEM" && f && !f.runen) return false;
    const k = D.klassen[klasseId];
    if (!k) return true;
    // Patch 2.6.5: Tier-3/4-Stücke aus Henrys Datei nennen ihre Klassen selbst.
    if (g.klassen) return g.klassen.includes(k.rechte);
    const rechte = D.ausruestungsRechte[k.rechte];
    if (["SCHWER", "LEICHT", "STOFF"].includes(g.equipCategory)) return rechte.ruestung.includes(g.equipCategory);
    if (g.equipCategory === "SCHMUCK") return true;
    return rechte.waffen.includes(g.equipCategory) || (g.equipCategory === "FERNKAMPF_BOGEN" && rechte.waffen.includes("FERNKAMPF_BOGEN"));
  }
  // Fraktionsrabatt (−10 %) auf die bevorzugten Warengruppen, Glut-Beute verkaufen Nicht-Orden schlechter.
  function warenFaktor(fraktion, gegenstandId, kaufen) {
    const g = D.gegenstaende[gegenstandId];
    const f = D.fraktionsHandel[fraktion];
    if (!g || !f) return 1;
    const gruppen = [g.category, g.equipCategory, g.magicTag].filter(Boolean);
    if (g.equipCategory === "SCHWER") gruppen.push("SCHWERE_RUESTUNG");
    if (g.equipCategory === "LEICHT") gruppen.push("LEICHTE_RUESTUNG");
    if (g.equipCategory?.startsWith("FERNKAMPF") || g.equipCategory?.startsWith("SCHWARZPULVER")) gruppen.push("FERNKAMPF", "SCHWARZPULVER");
    if (g.equipCategory === "FOKUS_RELIQUIE") gruppen.push("GEBET_RELIQUIE");
    if (kaufen) return gruppen.some((x) => f.rabatt.includes(x)) ? f.rabattFaktor : 1;
    return g.magicTag === "GLUT_ITEM" ? f.glutVerkauf : 1;
  }
  function gegenstandPreis(state, ortId, gegenstandId, kaufen) {
    const g = D.gegenstaende[gegenstandId];
    const fraktion = kontorAm(ortId) ?? state.faction;
    const basis = kaufen ? g?.baseBuyPrice : g?.baseSellPrice;
    if (!basis) return null;
    return Math.max(1, Math.round(basis * preisFaktor(state, fraktion, kaufen) * warenFaktor(state.faction, gegenstandId, kaufen)));
  }

  // ---- Bau: Phasen, Siedlungsstufen, Gebäude (Bau-Datei, Patch 1.6.0, 2.1.0) ----
  const akt = (state) => Math.min(5, (state.questStufe ?? 0) + 1);
  const siedlungsStufe = (state, ortId) => state.siedlungen?.[ortId] ?? 0;
  const gebaeudeIn = (state, ortId) => [...(D.vorgebaut[ortId] ?? []), ...(state.gebaeude?.[ortId] ?? [])];
  function phase(state, fraktion = state.faction) {
    const r = ruf(state, fraktion);
    if (akt(state) >= 4 && r >= 60 && ((state.marks ?? []).includes("thing-vereint") || (state.questStufe ?? 0) >= 4)) return 4;
    if (akt(state) >= 2 && r >= 40) return 3;
    if (r >= 20 && befreiteDoerfer(state, fraktion).length >= 1) return 2;
    return 1;
  }
  const ausbauRegeln = { 1: { akt: 2, ruf: 40 }, 2: { akt: 3, ruf: 45 }, 3: { akt: 4, ruf: 60 } };
  function ausbauGrund(state, ortId) {
    const ort = N.get(ortId);
    if (!ort || !istMensch(ort.fraktion) || ort.typ === "dorf") return "nur in Städten der Menschen";
    const ziel = D.siedlungsStufen[siedlungsStufe(state, ortId) + 1];
    if (!ziel) return "höchste Stufe erreicht";
    if (phase(state, ort.fraktion) < ziel.phase) return "erst als " + D.phasen[ziel.phase - 1].titel;
    // Patch 2.6.19 (Henry, B2): Stufe 1 nach Akt 2 (Ruf 40), Stufe 2 nach Akt 3 (Ruf 45), Stufe 3 nach Akt 4 (Ruf 60).
    const regel = ausbauRegeln[siedlungsStufe(state, ortId) + 1];
    if ((state.questStufe ?? 0) < regel.akt) return "erst nach Akt " + regel.akt;
    if (ruf(state, ort.fraktion) < regel.ruf) return "Ruf " + regel.ruf + " nötig";
    if (!bezahlbar(state, ort.fraktion, ziel.kosten)) return "Kosten: " + kostenText(ziel.kosten);
    return null;
  }
  function ausbauen(state, ortId) {
    if (ausbauGrund(state, ortId)) return false;
    const ziel = D.siedlungsStufen[siedlungsStufe(state, ortId) + 1];
    bezahle(state, N.get(ortId).fraktion, ziel.kosten);
    (state.siedlungen ??= {})[ortId] = ziel.stufe;
    return ziel;
  }
  // Wo darf ein Gebäude stehen? Ortstyp aus dem Katalog gegen Ort und Siedlungsstufe.
  function ortPasst(state, ortId, g) {
    const ort = N.get(ortId);
    const stufe = siedlungsStufe(state, ortId);
    switch (g.ort) {
      case "DORF": return ort.typ === "dorf";
      case "DORF_ODER_GRENZSTRASSE": return ort.typ === "dorf" || ort.verbindungen.some((v) => v.sicherheit === "grenzland");
      case "DORF_ODER_STADT_T0": return ort.typ === "dorf" || stufe >= 0;
      case "STADT_T1": return ort.typ !== "dorf" && stufe >= 1;
      case "STADT_T1_ODER_T2": return ort.typ !== "dorf" && stufe >= 1;
      case "STADT_T2": return ort.typ !== "dorf" && stufe >= 2;
      case "STADT_T2_ORDEN_DER_FLAMME": return ort.typ !== "dorf" && stufe >= 2 && ort.fraktion === "orden";
      case "HAFENSTADT_T2": return ort.typ !== "dorf" && stufe >= 2 && ort.hatHafen;
      case "KANTE_GRENZLAND": return false;
      default: return false;
    }
  }
  const belegtePlaetze = (state, ortId) => (state.gebaeude?.[ortId] ?? []).filter((id) => !["BLD_SIGNALFEUER", "BLD_DORFPALISADE"].includes(id)).length;
  function bauGrund(state, ortId, id) {
    const g = D.gebaeude[id];
    const ort = N.get(ortId);
    if (!g || !ort || !istMensch(ort.fraktion)) return "hier nicht möglich";
    if (gebaeudeIn(state, ortId).includes(id)) return "steht schon";
    if (!ortPasst(state, ortId, g)) return "passt nicht an diesen Ort (" + g.ort.toLowerCase().replaceAll("_", " ") + ")";
    if (phase(state, ort.fraktion) < g.phase) return "erst als " + D.phasen[g.phase - 1].titel;
    if (ruf(state, ort.fraktion) < g.ruf) return "Ruf " + g.ruf + " nötig";
    if (ort.typ !== "dorf" && !["BLD_SIGNALFEUER"].includes(id) && belegtePlaetze(state, ortId) >= D.siedlungsStufen[siedlungsStufe(state, ortId)].plaetze)
      return "keine freien Bauplätze";
    if (!bezahlbar(state, ort.fraktion, g.kosten)) return "Kosten: " + kostenText(g.kosten);
    return null;
  }
  function bauen(state, ortId, id) {
    if (bauGrund(state, ortId, id)) return false;
    const ort = N.get(ortId);
    bezahle(state, ort.fraktion, D.gebaeude[id].kosten);
    ((state.gebaeude ??= {})[ortId] ??= []).push(id);
    // Signalfeuer senkt die Gefahr aller angrenzenden Wege.
    if (id === "BLD_SIGNALFEUER") state.signalfeuer = [...new Set([...(state.signalfeuer ?? []), ...wegeAm(ortId)])];
    rufAendern(state, ort.fraktion, id === "BLD_SIGNALFEUER" ? D.rufAusloeser.build_signal_fire.ruf : 0);
    return true;
  }
  const wegeAm = (ortId) => Object.entries(wegKennungen()).filter(([, e]) => e.includes(ortId)).map(([k]) => k);
  let wegCache = null;
  const wegKennungen = () => (wegCache ??= (typeof nebenquests !== "undefined" ? nebenquests : require("./nebenquests.js")).daten.wegKennungen);
  // Grenzstraße pflastern: ein Grenzland-Weg am aktuellen Ort.
  function strasseGrund(state, ortId, wegId) {
    const ende = wegKennungen()[wegId];
    if (!ende || !ende.includes(ortId)) return "kein Weg an diesem Ort";
    const v = N.verbindung(ende[0], ende[1]);
    if (v?.sicherheit !== "grenzland" || v.kantenTyp !== "strasse") return "nur Grenzland-Straßen";
    if (state.strassen?.includes(wegId)) return "schon gepflastert";
    const fraktion = [N.get(ende[0]).fraktion, N.get(ende[1]).fraktion].find(istMensch);
    if (!fraktion) return "nur im Land der Menschen";
    const g = D.gebaeude.BLD_GRENZSTRASSE_STEIN;
    if (phase(state, fraktion) < g.phase) return "erst als " + D.phasen[g.phase - 1].titel;
    if (ruf(state, fraktion) < g.ruf) return "Ruf " + g.ruf + " nötig";
    if (!bezahlbar(state, fraktion, g.kosten)) return "Kosten: " + kostenText(g.kosten);
    return null;
  }
  function strassePflastern(state, ortId, wegId) {
    if (strasseGrund(state, ortId, wegId)) return false;
    const ende = wegKennungen()[wegId];
    const fraktion = [N.get(ende[0]).fraktion, N.get(ende[1]).fraktion].find(istMensch);
    bezahle(state, fraktion, D.gebaeude.BLD_GRENZSTRASSE_STEIN.kosten);
    state.strassen = [...(state.strassen ?? []), wegId];
    rufAendern(state, fraktion, D.rufAusloeser.secure_border_road.ruf);
    return true;
  }
  const kostenText = (kosten) => Object.entries(kosten).map(([r, n]) => n + " " + (r === "silber" ? "Silber" : D.rohstoffe[r]?.name.replace(/ \(.*\)/, "") ?? r)).join(", ");

  // ---- Garnison und Überfälle (Patch 1.6.0) ----
  function verteidigung(state, ortId) {
    const stufe = D.siedlungsStufen[siedlungsStufe(state, ortId)];
    const bauten = gebaeudeIn(state, ortId).reduce((s, id) => s + (D.gebaeude[id]?.verteidigung ?? 0), 0);
    return stufe.verteidigung + bauten + (state.garnison?.[ortId] ?? 0) * D.garnison.jeTruppe;
  }
  function rekrutierenGrund(state, ortId) {
    const ort = N.get(ortId);
    if (!ort || !istMensch(ort.fraktion) || ort.typ === "dorf") return "nur in Städten der Menschen";
    if (siedlungsStufe(state, ortId) < 1) return "erst ab Befestigter Marktstadt";
    if (state.silver < D.garnison.kosten.silber || (state.ressource ?? 0) - D.garnison.kosten.nahrung < 1 ||
        kontor(state, ort.fraktion).eisen < D.garnison.kosten.eisen) return "Kosten: " + kostenText(D.garnison.kosten);
    return null;
  }
  function rekrutieren(state, ortId) {
    if (rekrutierenGrund(state, ortId)) return false;
    state.silver -= D.garnison.kosten.silber;
    state.ressource -= D.garnison.kosten.nahrung;
    kontor(state, N.get(ortId).fraktion).eisen -= D.garnison.kosten.eisen;
    (state.garnison ??= {})[ortId] = (state.garnison[ortId] ?? 0) + 1;
    return true;
  }
  // Alle 8 Etappen: 45 % Überfall auf eine eigene Siedlung (befreites Dorf oder ausgebaute Stadt).
  function ueberfall(state, dice = Math.random) {
    const ziele = [...befreiteDoerfer(state).filter((id) => !(state.gepluendert ?? []).includes(id)),
      ...Object.keys(state.siedlungen ?? {}).filter((id) => state.siedlungen[id] >= 1)];
    if (!ziele.length || dice() >= D.garnison.chance) return null;
    const ziel = ziele[Math.floor(dice() * ziele.length)];
    const ort = N.get(ziel);
    if (siedlungsStufe(state, ziel) >= 3) return ort.name + " wurde angegriffen, doch die Hochzitadelle hält jedem Überfall stand.";
    const [min, max] = D.garnison.staerke[Math.min(4, akt(state))];
    const staerke = wuerfel(dice, min, max);
    const stadt = ort.typ === "dorf" ? D.doerfer[ziel]?.stadt : ziel;
    const wert = verteidigung(state, ziel) + (ort.typ === "dorf" ? verteidigung(state, stadt) - D.siedlungsStufen[siedlungsStufe(state, stadt)].verteidigung : 0);
    if (wert >= staerke) {
      const silber = wuerfel(dice, ...D.garnison.beute.silber);
      state.silver += silber;
      state.beuteImKontor = (state.beuteImKontor ?? 0) + wuerfel(dice, ...D.garnison.beute.bruchmetall);
      return "Überfall auf " + ort.name + " abgewehrt (Verteidigung " + wert + " gegen " + staerke + "). Die Garnison erbeutet " + silber + " Silber.";
    }
    if (staerke - wert <= 15) {
      (state.pausiert ??= {})[ziel] = (state.etappen ?? 0) + D.garnison.pause;
      return ort.name + " wurde beschädigt (Verteidigung " + wert + " gegen " + staerke + "). Der Zehnt ruht " + D.garnison.pause + " Etappen.";
    }
    state.gepluendert = [...new Set([...(state.gepluendert ?? []), ziel])];
    rufAendern(state, ort.fraktion, D.garnison.pluenderRuf);
    const bauten = state.gebaeude?.[ziel];
    if (bauten?.length) bauten.pop();
    return ort.name + " wurde geplündert (Verteidigung " + wert + " gegen " + staerke + "). Der Zehnt ist verloren, bis du den Ort für 20 Silber und 3 Holz wieder aufbaust. Ruf " + D.garnison.pluenderRuf + ".";
  }
  function reparierenGrund(state, ortId) {
    if (!(state.gepluendert ?? []).includes(ortId) && !(state.pausiert?.[ortId] > (state.etappen ?? 0))) return "nichts zu reparieren";
    const fraktion = N.get(ortId).fraktion;
    if (!bezahlbar(state, fraktion, D.garnison.reparatur)) return "Kosten: " + kostenText(D.garnison.reparatur);
    return null;
  }
  function reparieren(state, ortId) {
    if (reparierenGrund(state, ortId)) return false;
    bezahle(state, N.get(ortId).fraktion, D.garnison.reparatur);
    state.gepluendert = (state.gepluendert ?? []).filter((id) => id !== ortId);
    if (state.pausiert) delete state.pausiert[ortId];
    return true;
  }

  // ---- Wiederaufbau (Ruf-Datei 2.0, Patch 2.1.0 Punkt 6) ----
  function wiederaufbauGrund(state, id) {
    const w = D.wiederaufbau.find((x) => x.id === id);
    if (!w) return "unbekanntes Projekt";
    if ((state.marks ?? []).includes(w.marke)) return "schon wiederaufgebaut";
    if (!bezahlbar(state, w.fraktion, w.kosten)) return "Kosten: " + kostenText(w.kosten);
    return null;
  }
  function wiederaufbauen(state, id) {
    if (wiederaufbauGrund(state, id)) return false;
    const w = D.wiederaufbau.find((x) => x.id === id);
    bezahle(state, w.fraktion, w.kosten);
    state.silver += w.silber;
    rufAendern(state, w.fraktion, w.ruf);
    (state.marks ??= []).push(w.marke);
    return w;
  }

  // ---- Kriegskasse für die Armada (Patch 2.1.0 Punkt 2): Spenden aus dem Kontor, +2 Ruf je Einheit ----
  const kasse = (state) => ({ ...Object.fromEntries(Object.keys(D.kriegskasse.bedarf).map((r) => [r, 0])), ...(state.kriegskasse ?? {}) });
  const kasseVoll = (state) => Object.entries(D.kriegskasse.bedarf).every(([r, n]) => kasse(state)[r] >= n);
  function spendenGrund(state, ortId, rohstoff, menge) {
    const fraktion = kontorAm(ortId);
    if (!fraktion) return "nur in Städten der Menschen";
    // Patch 2.6.1: Die Armada-Kriegskasse öffnet mit dem Großen Thing (Akt 4); Geächtete dürfen einzahlen.
    if (!state.marks?.includes("grosses-thing")) return "die Kriegskasse öffnet mit dem Großen Thing (Akt 4)";
    if (!D.kriegskasse.bedarf[rohstoff]) return "wird nicht gebraucht";
    if (!Number.isInteger(menge) || menge < 1) return "ungültige Menge";
    const vorrat = rohstoff === "nahrung" ? (state.ressource ?? 0) - 1 + kontor(state, fraktion).nahrung : kontor(state, fraktion)[rohstoff];
    if (vorrat < menge) return "zu wenig " + D.rohstoffe[rohstoff].name;
    return null;
  }
  function spenden(state, ortId, rohstoff, menge) {
    if (spendenGrund(state, ortId, rohstoff, menge)) return false;
    const fraktion = kontorAm(ortId);
    const k = kontor(state, fraktion);
    let rest = menge;
    const ausKontor = Math.min(k[rohstoff], rest);
    k[rohstoff] -= ausKontor;
    rest -= ausKontor;
    if (rest) state.ressource -= rest;
    (state.kriegskasse ??= {})[rohstoff] = (state.kriegskasse[rohstoff] ?? 0) + menge;
    rufAendern(state, fraktion, D.rufAusloeser.donate_to_kontor.ruf * menge);
    return true;
  }
  // Stärkere Flotte, wenn eine Hochzitadelle mit Kriegswerft steht: weniger Seegefechte auf der Überfahrt.
  const flotteVerstaerkt = (state) => Object.entries(state.siedlungen ?? {}).some(([ort, s]) => s >= 3 && gebaeudeIn(state, ort).includes("BLD_KRIEGSWERFT"));

  // ---- Handwerk und Schmiede (Ökonomie-Datei, Patch 2.1.0 Punkt 5) ----
  function handwerkGrund(state, rezeptId, klasseId, zaehle) {
    const r = D.handwerk.find((x) => x.id === rezeptId);
    if (!r) return "unbekanntes Rezept";
    const k = D.klassen[klasseId];
    if (!k || !r.requiredClasses.includes(k.rechte)) return "nur für " + r.requiredClasses.map((c) => c.toLowerCase().replaceAll("_", " ")).join(", ");
    const fehlt = r.ingredients.find((i) => zaehle(i.id) < i.count);
    return fehlt ? "es fehlt " + (D.gegenstaende[fehlt.id]?.name ?? fehlt.id) : null;
  }
  // Höchste Schmiedestufe am Ort: Stadtschmiede +2, Meisterschmiede +3, Runenschmiede +4.
  function schmiedeStufe(state, ortId) {
    const b = gebaeudeIn(state, ortId);
    return b.includes("BLD_RUNENSCHMIEDE") ? 4 : b.includes("BLD_MEISTERSCHMIEDE") ? 3 : b.includes("BLD_STADTSCHMIEDE") ? 2 : 0;
  }
  function aufwertKosten(state, ortId, ziel) {
    const s = D.schmiede.stufen[ziel - 1];
    if (!s) return null;
    const fraktion = kontorAm(ortId) ?? state.faction;
    const rang = rufRang(ruf(state, fraktion));
    const eisenRabatt = rang.eisenRabatt + (state.role && ["magier"].includes(state.role) && state.faction === "orden" ? 1 : 0);
    const material = s.materials.map((m) => ({ ...m, count: m.id === "RES_EISEN" ? Math.max(1, m.count - eisenRabatt) : m.count }));
    return { silber: Math.round(s.baseSilverCost * rang.schmiede), material, bonus: s.statBonusPercent, rune: Boolean(s.addsRuneTrait) };
  }

  // ---- Endgame (Endgame-Datei, Patch 1.6.0, 1.6.1) ----
  function endgameGrund(state, id, ortId) {
    const a = D.endgame[id];
    if (!a) return "unbekannt";
    if ((state.questStufe ?? 0) < 1) return "erst nach Akt 1";
    const zuletzt = state.endgame?.[id];
    if (zuletzt !== undefined && (state.etappen ?? 0) - zuletzt < a.abklingen) return "wieder bereit in " + (a.abklingen - ((state.etappen ?? 0) - zuletzt)) + " Etappen";
    if (a.orte && !a.orte.some((o) => (o.ort ?? o) === ortId)) return "nicht an diesem Ort";
    if (id === "karawane" && siedlungsStufe(state, ortId) < a.stufe) return "nur in einer Wehrhaften Bollwerksstadt";
    if (id === "kaperfahrt" && !gebaeudeIn(state, ortId).includes(a.gebaeude)) return "nur in einer Hafenstadt mit Kriegswerft";
    if (id === "kaperfahrt" && state.silver < a.kosten) return "zu wenig Silber";
    // Patch 2.6.19 (Henry, B1): Ascherisse öffnen mit dem Titel Bannerjarl (Quest-Stufe 4) statt erst nach Akt 5.
    if (id === "ascheriss" && ((state.questStufe ?? 0) < 4 || !(state.marks ?? []).includes("bannerjarl"))) return "erst als Bannerjarl (nach Akt 4)";
    return null;
  }
  // Lohn nach dem gewonnenen Kampf (der Kampf selbst läuft über spiel/regeln.js).
  function endgameLohn(state, id, ortId, dice = Math.random, wahlRohstoff = "eisen") {
    const a = D.endgame[id];
    (state.endgame ??= {})[id] = state.etappen ?? 0;
    if (id === "kaperfahrt") state.silver -= a.kosten;
    const silber = Math.round(wuerfel(dice, a.silber[0], a.silber[1]));
    state.silver += silber;
    const fraktion = kontorAm(ortId) ?? N.get(ortId)?.fraktion;
    const k = istMensch(fraktion) ? kontor(state, fraktion) : null;
    const rohstoffe = {};
    const gib = (r, n) => { if (k) { k[r] += n; rohstoffe[r] = (rohstoffe[r] ?? 0) + n; } };
    if (a.rohstoff?.chance && dice() < a.rohstoff.chance) gib(a.rohstoff.pool[Math.floor(dice() * a.rohstoff.pool.length)], a.rohstoff.menge);
    if (id === "kaperfahrt") gib(["holz", "eisen", "nahrung"][Math.floor(dice() * 3)], a.rohstoff);
    if (id === "karawane") gib(D.rohstoffe[wahlRohstoff] ? wahlRohstoff : "eisen", a.wahlRohstoff);
    if (id === "ascheriss") gib("runensplitter", wuerfel(dice, a.runensplitter[0], a.runensplitter[1]));
    if (a.ruf && fraktion) rufAendern(state, fraktion, a.ruf);
    return { ep: a.ep, silber, rohstoffe };
  }

  // ---- Kampf: Schadensformel, Rüstung, Mana (Patch 2.1.0 Punkt 9, 2.2.0) ----
  function rohSchaden(waffenAngriff, hauptwert, multiplikator = 1, krit = false) {
    return (waffenAngriff + hauptwert / 2) * multiplikator * (krit ? D.kampf.krit : 1);
  }
  function schaden(roh, ruestung, durchdringung = 0) {
    const wirksam = Math.max(0, ruestung) * (1 - zwischen(durchdringung, 0, 1));
    return Math.max(1, Math.floor(roh * (D.kampf.ruestungsKonstante / (D.kampf.ruestungsKonstante + wirksam))));
  }
  // Patch 2.4.0: maxMana = 12 + Willenskraft + floor(Intelligenz / 2).
  const maxMana = (wille, intelligenz) => D.kampf.mana.basis + D.kampf.mana.wille * wille + Math.floor(D.kampf.mana.intelligenz * intelligenz);
  // Menschen-Klasse eines Helden: Fraktion und Grundklasse (Rolle).
  const klasseVon = (fraktion, rolle) => Object.values(D.klassen).find((k) => k.fraktion === fraktion && k.rolle === rolle) ?? null;

  // ---- Neue Klassen der Menschen (Patch 2.0.0 Punkt 1): ersetzen Namen, Spezialisierungen und Fähigkeiten ----
  // der bisherigen Klassen von Kronreich, Orden und Freien Häfen. Stufe 15 und 20 belegt die Signaturfähigkeit
  // der gewählten Spezialisierung (spiel/regeln.js).
  if (typeof klassen !== "undefined" && typeof faehigkeiten !== "undefined") {
    for (const [fraktion, rollen] of Object.entries(D.menschenKlassen)) {
      for (const [rolle, k] of Object.entries(rollen)) {
        Object.assign(klassen.fraktionen[fraktion].klassen[rolle], { name: k.name, spielweise: k.spielweise, ressource: k.ressource, a: k.a, b: k.b });
        faehigkeiten.fraktionen[fraktion].klassen[rolle] = { zahlung: k.zahlung,
          liste: [...k.liste, k.signatur.a[0], k.signatur.a[1]], signatur: k.signatur };
      }
      klassen.fraktionen[fraktion].magie = fraktion === "orden";
    }
  }

  return {
    daten: D, MENSCHEN, ROHSTOFFE, rufSchluessel, istMensch,
    maxStufe, epFuer, stufeAus, ahnenPunkte, talentPunkte, talentStufen, talentRang, talentWirkung, hinterhaltMinderung, talentGrund, talentLernen, ahnenGrund, ahnenLernen, signaturRang,
    ruf, rufRang, rufAendern, geaechtet,
    moral, moralBonus, moralStufe, moralAendern, moralSchutz,
    kontor, kontorAm, preisFaktor, rohstoffPreis, handelGrund, handeln, nahrungGrund, nahrungTragen, bezahlbar, bezahle, kostenText,
    tatAnwenden, doerferVon, befreie, befreiteDoerfer, zehntErtrag, etappe,
    wegTyp, reiseNahrung, reiseGefahr,
    gegnerListe, gegnerNach, gegnerWerte, kampfWerte, skala, skaliert, begegnung, beute,
    ausruestungErlaubt, warenFaktor, gegenstandPreis,
    akt, phase, siedlungsStufe, gebaeudeIn, ausbauGrund, ausbauen, bauGrund, bauen, wegeAm, strasseGrund, strassePflastern,
    verteidigung, rekrutierenGrund, rekrutieren, ueberfall, reparierenGrund, reparieren,
    wiederaufbauGrund, wiederaufbauen, kasse, kasseVoll, spendenGrund, spenden, flotteVerstaerkt,
    handwerkGrund, schmiedeStufe, aufwertKosten,
    endgameGrund, endgameLohn,
    rohSchaden, schaden, maxMana, klasseVon,
  };
})();
if (typeof module !== "undefined") module.exports = systeme;
