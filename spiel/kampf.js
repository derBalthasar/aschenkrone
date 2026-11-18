"use strict";

// Kampfregeln aus dem Kampfdokument (Henry, 17. 11. 2026): Erfahrungsstufen, Lebenspunkte je Rolle,
// Ausdauer und Mana, Machtbudget, Fähigkeiten aller Klassen und Gegnerwerte.
// Das Spiel hat kein Kampfraster (Entscheidung Henry, 17. 11. 2026). Felder werden so übersetzt:
// Fläche und Umkreis treffen alle Feinde, „bis zu N“ trifft N Feinde, Zurückstoßen und Verlangsamen
// schwächen die nächsten Treffer des Ziels (−1), Wälle und Köder ziehen die Angriffe auf sich.
const kampf = (() => {
  const F = faehigkeiten;
  const K = klassen;

  // ---- Erfahrungsstufen 1 bis 20: von Stufe n auf n+1 braucht ein Held 100 × n EP ----
  const maxStufe = 20;
  const epFuer = (stufe) => 50 * stufe * (stufe - 1);
  const stufeAus = (ep) => {
    let stufe = 1;
    while (stufe < maxStufe && ep >= epFuer(stufe + 1)) stufe++;
    return stufe;
  };
  const ep = { gegnerJeStufe: 10, schlacht: 50, questakt: 300 };

  // ---- Lebenspunkte hängen an der Rolle (Profil der Grundklasse) ----
  const lpTabelle = {
    waechter: [40, 3], krieger: [34, 3], schurke: [28, 2], spaeher: [26, 2],
    heiler: [26, 2], feldscher: [26, 2], magier: [22, 2], skalde: [22, 2], pulvermeister: [22, 2],
  };
  const lebenspunkte = (profil, stufe) => lpTabelle[profil][0] + lpTabelle[profil][1] * (stufe - 1);

  // ---- Machtbudget je Stufe ----
  const budget = {
    1: { punkte: 6, kosten: 0, abklingzeit: 0 },
    3: { punkte: 10, kosten: 3, abklingzeit: 1 },
    6: { punkte: 14, kosten: 4, abklingzeit: 2 },
    10: { punkte: 18, kosten: 5, abklingzeit: 3 },
    15: { punkte: 24, kosten: 6, abklingzeit: 4 },
    20: { punkte: 36, kosten: 8, abklingzeit: 0, einmal: true, ressource: 3 },
  };
  const meisterBudget = [
    { punkte: 24, kosten: 6, abklingzeit: 4 },
    { punkte: 36, kosten: 8, abklingzeit: 0, einmal: true, ressource: 3, abStufe: 20 },
  ];
  const machtpunkte = [
    ["1 Schaden, 1 Heilung oder 1 Schild an einem Ziel", "1"], ["Wirkung auf bis zu 3 Ziele", "je Ziel die Hälfte"],
    ["Wirkung auf alle Ziele in einer Fläche", "je Ziel ein Drittel"], ["Wirkung über 3 Runden verteilt", "insgesamt 20 % mehr erlaubt"],
    ["Betäuben 1 Runde", "8"], ["Furcht 1 Runde (Ziel greift nicht an)", "6"], ["Schweigen 1 Runde (keine Zauber, keine Techniken)", "5"],
    ["Verlangsamen 2 Runden (−1 Bewegung)", "4"], ["Verspotten 1 Runde (Ziel muss den Helden angreifen)", "4"],
    ["Zurückstoßen um 1 Feld", "2"], ["Unsichtbar 2 Runden", "6"], ["Gruppe +2 Schaden für 2 Runden", "8"],
    ["Beschworenes Wesen", "halbe LP + Schaden je Runde × Runden"],
  ];
  const gegenUebermacht = [
    "Wer betäubt war, ist in der Runde danach gegen Betäuben immun.",
    "Ein Held führt höchstens 3 beschworene Wesen gleichzeitig.",
    "Heilung hebt nie über die höchsten LP, Schild verfällt nach 3 Runden.",
    "Unsichtbarkeit endet beim ersten Angriff.",
    "Magier haben die wenigsten LP und dafür die meisten Flächenwirkungen, Wächter die meisten LP und dafür kaum Schaden.",
    "Totenmagie (Tote erwecken, Seelen binden) gibt es nur bei den Untoten. Heiler der Lebenden holen Gefallene zurück, die nur kampfunfähig sind, nie Tote.",
  ];
  const ressourceVerstaerkung = 0.25;
  const spezVerstaerkung = 0.5;
  const maxDiener = 3;
  const schildDauer = 3;

  // ---- Wirkungstext in Spielregeln übersetzen ----
  const zahl = (wert) => Number(wert);
  function runden(text, standard = 1) {
    const treffer = text.match(/(\d+) Runden?/);
    return treffer ? zahl(treffer[1]) : standard;
  }

  function lies(text) {
    const e = {};
    let t = " " + text + " ";
    const nimm = (regex) => {
      const treffer = t.match(regex);
      if (treffer) t = t.replace(regex, " ");
      return treffer;
    };

    // Nur unter bestimmten Umständen (unter Tage, im Wald, mit Tiefenglut) – ohne Raster entfällt das.
    t = t.replace(/,? unter Tage zusätzlich [^,.]*/, "").replace(/,? im Wald \d+ Felder?/, "")
      .replace(/\. Mit Tiefenglut[^.]*$/, "").replace(/,? an Küsten und auf Schiffen \d+/, "").replace(/,? unter Tage \d+/, "");

    if (/nur wenn es neben einer Mine steht/.test(t)) {
      e.mineBedingung = true;
      t = t.replace(/Ziel 1 Runde betäubt \(Knall\), nur wenn es neben einer Mine steht, sonst 2 Runden verlangsamt/, " ");
    }
    if (/das Ziel ist 1 Runde (?:betäubt \(Schmerz\)|benommen)/.test(t)) {
      e.selbstBenommen = true;
      t = t.replace(/das Ziel ist 1 Runde (?:betäubt \(Schmerz\)|benommen \(−2 Schaden\))/, " ");
    }
    let w = t.match(/Er und (\d+) Nachbarn greifen sofort an, je (\d+) Schaden/);
    if (w) { e.treffer = zahl(w[1]) + 1; e.schaden = zahl(w[2]); t = t.replace(w[0], " "); }
    w = t.match(/wächst für (\d+) Runden, wer ihn berührt, nimmt (\d+) Schaden/);
    if (w) { e.dot = { wert: zahl(w[2]), runden: zahl(w[1]), alle: true }; e.dotAlle = true; t = t.replace(w[0], " "); }

    // Tod abwenden: Rückkehr, letzter Treffer mit 1 LP, kann nicht fallen.
    let m = t.match(/kehrt er mit (\d+) LP zurück|steht es sofort mit (\d+) LP auf/);
    if (m) {
      e.todesschutz = { lp: zahl(m[1] ?? m[2]), runden: /nächsten (\d+) Runden/.test(t) ? zahl(t.match(/nächsten (\d+) Runden/)[1]) : 99 };
      t = t.replace(/[,.] (?:fällt er|Fällt das Ziel).*$/, " ");
    }
    if (/tödlichen Treffer mit 1 LP|bleibt bei 1 LP|nicht unter 1 LP fallen/.test(t)) {
      e.todesschutz = { lp: 1, runden: /tödlichen Treffer/.test(t) ? 99 : runden(t, 2) };
      t = t.replace(/,? (?:hält in dieser Schlacht einen tödlichen Treffer mit 1 LP aus|er kann nicht fallen \(bleibt bei 1 LP\))/, " ");
    }
    // Was geschieht, wenn das Ziel fällt.
    const fall = t.search(/,? (?:fällt (?:das Ziel|es)\b|springt beim Fall)/);
    if (fall >= 0) {
      const rest = t.slice(fall).replace(/^,? (?:fällt (?:das Ziel|es),? )?/, "");
      t = t.slice(0, fall) + " ";
      e.beimFall = /spring/.test(rest) ? { springt: true } : lies(rest);
    }
    // Gefallene Feinde stehen auf eurer Seite auf.
    m = nimm(/(\d+) Runden: jeder Feind, der fällt, steht sofort als Gebundener auf eurer Seite auf \((\d+) LP\)/);
    if (m) e.bekehren = { runden: zahl(m[1]), lp: zahl(m[2]) };

    // Beschworene Wesen, Wälle und Köder.
    m = t.match(/\(([^)]*?(\d+) LP[^)]*)\)/);
    if (m) {
      const innen = m[1];
      const anzahl = t.match(/(?:Bis zu |^ *)(\d+) (?:Gebundene|Bestien|Glutschatten|gefallene)/) ?? innen.match(/höchstens (\d+)/);
      const schaden = innen.match(/(\d+) Schaden/) ?? t.match(/je Runde (\d+) Schaden/) ?? t.match(/schießt \d+ Runden je (\d+) Schaden/);
      const dauer = innen.match(/(\d+) Runden/) ?? t.match(/(\d+) Runden/);
      const name = (t.match(/(?:Ein|Eine|ein|eine) (?:falscher |falsches |junger |alter )?([A-ZÄÖÜ][a-zäöüß-]+)/) ?? [])[1];
      e.diener = {
        anzahl: anzahl ? zahl(anzahl[1]) : 1, lp: zahl(m[2]), schaden: schaden ? zahl(schaden[1]) : 0,
        runden: dauer ? zahl(dauer[1]) : 2, name: name && !/^(Feind|Verbündeter)$/.test(name) ? name : "Beschworenes Wesen",
        koeder: /Angriffe auf sich|zwingt Feinde|sperrt|Wall/.test(t) || !schaden,
      };
      t = t.replace(m[0], " ").replace(/,? (?:es )?schießt \d+ Runden je \d+ Schaden/, " ").replace(/,? je Runde \d+ Schaden/, " ")
        .replace(/\d+ Runden mit/, " ").replace(/zieht \d+ Runden alle Angriffe auf sich/, " ").replace(/sperrt \d+ Felde?r? für \d+ Runden/, " ");
    }
    if (/bindet alle Feinde (\d+) Runde/.test(t)) {
      e.furcht = { runden: zahl(t.match(/bindet alle Feinde (\d+) Runde/)[1]), alle: true };
      t = t.replace(/bindet alle Feinde \d+ Runde \(sie greifen es an\)/, " ");
    }

    // Stärkungen der Gruppe oder des Helden.
    m = nimm(/jeder Treffer der Gruppe darauf \+(\d+)/);
    if (m) e.verwundbar = { wert: zahl(m[1]), runden: 99 };
    m = nimm(/Ziel nimmt (\d+) Runden \+(\d+) Schaden von allen/);
    if (m) e.verwundbar = { wert: zahl(m[2]), runden: zahl(m[1]) };
    const staerke = (wert, dauer, heilung = 0) => { e.staerkung = { wert: (e.staerkung?.wert ?? 0) + wert, runden: Math.max(dauer, e.staerkung?.runden ?? 0), heilung }; };
    m = nimm(/(\d+) Runden: jeder Treffer \+(\d+) Schaden und heilt ihn um (\d+)/);
    if (m) staerke(zahl(m[2]), zahl(m[1]), zahl(m[3]));
    m = nimm(/Zweikampf: [^,]*?(\d+) Runden allein, er trifft dabei \+(\d+) und heilt (\d+) je Treffer/);
    if (m) staerke(zahl(m[2]), zahl(m[1]), zahl(m[3]));
    m = nimm(/(\d+) Runden doppelt so groß: \+(\d+) LP und jeder Treffer \+(\d+) Schaden/);
    if (m) { staerke(zahl(m[3]), zahl(m[1])); e.schild = zahl(m[2]); }
    m = nimm(/einer wird (\d+) Runden fast lebendig: \+(\d+) Schaden auf jeden Treffer/);
    if (m) staerke(zahl(m[2]), zahl(m[1]));
    m = nimm(/(\d+) Runden doppelte Kraft: jeder Treffer \+(\d+)/);
    if (m) staerke(zahl(m[2]), zahl(m[1]));
    m = nimm(/(\d+) Runden Kampfrausch für ihn, jeder Treffer zusätzlich \+(\d+) Feuerschaden/);
    if (m) { staerke(2 + zahl(m[2]), zahl(m[1])); e.feuer = true; }
    m = nimm(/(?:Gruppe |er wächst: )?(\d+) Runden:? (?:Gruppe )?(?:immun gegen Furcht, )?\+(\d+) Schaden(?: auf jeden Treffer| gegen sie)?/);
    if (m) staerke(zahl(m[2]), zahl(m[1]));
    m = nimm(/(\d+) Runden: Gruppe \+(\d+) Schaden/);
    if (m) staerke(zahl(m[2]), zahl(m[1]));
    m = nimm(/Gruppe (\d+) Runden \+(\d+) Schaden/);
    if (m) staerke(zahl(m[2]), zahl(m[1]));
    m = nimm(/(?:Ein Verbündeter |Gruppe )?tr[ie]ff?t (\d+) Runden? \+(\d+)/) ?? nimm(/treffen (\d+) Runden \+(\d+)/);
    if (m) staerke(zahl(m[2]), zahl(m[1]));
    m = nimm(/(?:(\d+) Runden? Kampfrausch|Kampfrausch: [^,]*)/) ;
    if (m) staerke(2, m[1] ? zahl(m[1]) : 1);
    m = nimm(/(\d+) Runden? Kampfrausch/);
    if (m) staerke(2, zahl(m[1]));
    m = nimm(/sein Hammer bleibt die Schlacht über \+(\d+)/);
    if (m) staerke(zahl(m[1]), 99);
    m = nimm(/(?:nächster|erster) (?:Angriff|Schuss|Treffer)(?: darauf)? \+(\d+)/);
    if (m) e.naechster = zahl(m[1]);
    if (/Glutleiste um 1/.test(t)) e.glut = 1;

    // Schwächen: Gegner treffen schlechter.
    m = nimm(/(?:sie |Ziel )?tr(?:e|i)ff?(?:en|t) (\d+) Runden? −(\d+)/) ?? nimm(/(\d+) Runden? blind \(−(\d+)\)/);
    if (m) e.schwaechen = { wert: zahl(m[2]), runden: zahl(m[1]) };
    m = nimm(/Ziel −(\d+) auf seinen nächsten Treffer/) ?? nimm(/benommen \(−(\d+) Schaden\)/);
    if (m) e.schwaechen = { wert: zahl(m[1]), runden: 1 };
    m = nimm(/alle Feinde −(\d+) Schaden/);
    if (m) e.schwaechen = { wert: zahl(m[1]), runden: runden(text, 1), alle: true };
    m = nimm(/Fernkampf gegen die Gruppe (\d+) Runden −(\d+)/);
    if (m) e.schwaechen = { wert: zahl(m[2]), runden: zahl(m[1]), alle: true };
    m = nimm(/sie sehen 1 Runde nichts/);
    if (m) e.schwaechen = { wert: 2, runden: 1 };
    m = nimm(/(?:Gruppe )?(\d+) Runden unsichtbar für Fernkampf/);
    if (m) e.schwaechen = { wert: 2, runden: zahl(m[1]), alle: true };

    // Heilung (alle Heilungen treffen den Helden, Gefährten haben keine eigenen LP).
    m = nimm(/[Hh]eilt (\d+) Runden (?:bis zu \d+ Verbündete )?je (\d+)/);
    if (m) e.hot = { wert: zahl(m[2]), runden: zahl(m[1]) };
    m = nimm(/er heilt (\d+) je getroffenem Ziel|jeder Treffer heilt ihn um (\d+)/);
    if (m) e.heilJeZiel = zahl(m[1] ?? m[2]);
    if (/dieselbe Menge heilt/.test(t)) { e.lebensraub = true; t = t.replace(/dieselbe Menge heilt einen Verbündeten/, " "); }
    for (const abschnitt of t.split(/[,.]| und (?=[a-zäöü])/)) {
      const heil = abschnitt.match(/[Hh]eil(?:t|en)\b(.*)/);
      if (!heil || /immun|Heilung|nur halb/.test(abschnitt)) continue;
      const wert = heil[1].match(/(?:je|um) (\d+)/) ?? heil[1].match(/(\d+)/);
      if (wert) e.heilung = Math.max(e.heilung ?? 0, zahl(wert[1]));
      t = t.replace(abschnitt, " ");
    }
    if (/entfernt (?:Gift|jede|Fäulnis|einen Fluch)|immun gegen (?:Gift|Krankheit|Furcht)|Gruppe 2 Runden immun/.test(text)) e.reinigen = true;

    // Schild.
    for (const treffer of t.matchAll(/(\d+) Schild( pro Runde)?/g)) {
      e.schild = Math.max(e.schild ?? 0, zahl(treffer[1]) * (treffer[2] ? (e.staerkung?.runden ?? runden(text, 2)) : 1));
    }
    t = t.replace(/(?:je )?\d+ Schild(?: pro Runde)?/g, " ");

    // Ressource und Mana zurückgewinnen.
    m = nimm(/bringt es (\d+) [A-ZÄÖÜ][a-zäöü]+/);
    if (m) e.ressource = zahl(m[1]);
    m = nimm(/gewinnt (\d+) Mana zurück/);
    if (m) e.mana = zahl(m[1]);

    // Wirkung über mehrere Runden (Gift, Blutung, Brand, Feuer, Felder mit Schaden).
    m = nimm(/(\d+) Runden je (\d+) (Gift|Blutung|Brand|Feuerschaden|Schaden)/);
    if (m) e.dot = { wert: zahl(m[2]), runden: zahl(m[1]), feuer: /Brand|Feuer/.test(m[3]) };
    m = nimm(/(\d+) Runde (\d+) Nachbrennen/);
    if (m) e.dot = { wert: zahl(m[2]), runden: zahl(m[1]), feuer: true };
    m = nimm(/je Runde (\d+) (Feuer)?[Ss]chaden/);
    if (m) e.dot = { wert: zahl(m[1]), runden: runden(text, 2), feuer: Boolean(m[2]), alle: true };
    m = nimm(/jeder Schuss in dieser Zeit (\d+) Gift/);
    if (m) e.dot = { wert: zahl(m[1]), runden: runden(text, 2) };
    m = nimm(/(?:Durchquert|wer sie durchquert), nimmt (\d+) Feuerschaden/) ?? nimm(/je (\d+) Feuerschaden bei Versuch/);
    if (m) { e.dot = { wert: zahl(m[1]), runden: runden(text, 2), feuer: true, alle: true }; }

    // Schaden.
    m = nimm(/Nutzt den Grundangriff des Ziels mit \+(\d+) Schaden/);
    if (m) e.zielAngriff = zahl(m[1]);
    m = nimm(/Nutzt die Stufe-15-Fähigkeit[^,]*,[^,]*, mit \+50 %/);
    if (m) e.schaden = 24;
    m = nimm(/Nutzt 1 Runde zusätzlich den Grundangriff eines Verbündeten mit \+(\d+)/);
    if (m) e.zusatzGrundangriff = zahl(m[1]);
    m = nimm(/(\d+) (?:Hiebe|Schüsse|Schläge|Minen|Dornfallen)[^.]*?je (\d+) (Feuer)?(?:Schaden|schaden)/);
    if (m) { e.treffer = zahl(m[1]); e.schaden = zahl(m[2]); if (m[3]) e.feuer = true; }
    m = nimm(/(\d+) (Feuer|Kälte)?(?:Schaden|schaden)([^.]*?), sonst (\d+)/);
    if (m) {
      e.schaden = zahl(m[1]);
      e.sonst = zahl(m[4]);
      e.bedingung = m[3];
      if (m[2] === "Feuer") e.feuer = true;
    }
    m = nimm(/(?:trifft es sofort für|Nimmt einem Feind|verlieren je) (\d+)(?: LP)?/);
    if (m && e.schaden === undefined) e.schaden = zahl(m[1]);
    if (e.schaden === undefined) {
      m = nimm(/(\d+) (Feuer|Kälte)?(?:Schaden|schaden|Gift)/);
      if (m) { e.schaden = zahl(m[1]); if (m[2] === "Feuer") e.feuer = true; }
    }
    if (/Feuerschaden/.test(text) && e.schaden !== undefined && !e.dot?.feuer) e.feuer = true;
    m = nimm(/gegen Untote \+(\d+)/);
    if (m) e.gegenUntote = zahl(m[1]);

    // Ziele.
    if (/(?:an allen Feinden|Alle Feinde|alle Feinde|Alle Untoten|jeder Feind auf dem Weg|jeder davon|Feinde darauf|Feinde darin|an allen)/.test(text)) e.ziele = "alle";
    m = text.match(/(?:bis zu|Bis zu) (\d+) (?:Zielen|Feinden|Feinde)|(?:^|, )(\d+) Feinde|an bis zu (\d+) Zielen/);
    if (m && e.ziele === undefined) e.ziele = zahl(m[1] ?? m[2] ?? m[3]);
    if (/an einem Ziel|ein Held nimmt|ein Ziel sofort|er selbst \d+ (?:Feuer)?[Ss]chaden|ein Feind darin|dazu \d+ Schaden an einem/.test(text) && e.ziele !== undefined) e.schadenEinzeln = true;
    if (e.dot?.alle) e.dotAlle = true;

    // Kontrolle.
    if (e.mineBedingung) {
      e.betaeuben = 1;
      e.verlangsamen = 2;
    } else {
      if (/betäubt|festgehalten|gelähmt|verliert 1 Runde|fallen in Tunnel/.test(t) && !/erstarrt stattdessen/.test(t.match(/[^,]*betäubt[^,]*/)?.[0] ?? "")) {
        e.betaeuben = 1;
      }
      m = t.match(/(\d+) Runden? verlangsamt|(\d+) Runden verlangsamt/);
      if (m) e.verlangsamen = zahl(m[1] ?? m[2]);
      else if (/verlangsamt|Felde?r? zurück|zurückgestoßen|verlier(?:t|en) (?:seine nächste|1 Runde ihre) Bewegung|bleibt 1 Runde stehen|können sich nicht bewegen|wirft das Ziel/.test(t)) e.verlangsamen = 1;
    }
    m = t.match(/(\d+) Runden? in Furcht|Furcht (\d+) Runden|greift (\d+) Runden? nicht an/);
    if (m) e.furcht = { ...(e.furcht ?? {}), runden: zahl(m[1] ?? m[2] ?? m[3]) };
    else if (/(?<!nicht )in Furcht(?! geraten)|\(Furcht\)|kämpft 1 Runde für euch|greift 1 Runde seinen eigenen Nachbarn an|verwirrt|fliehen sofort/.test(t)) e.furcht = { ...(e.furcht ?? {}), runden: 1 };
    if (/Alle Untoten im Umkreis|Alle Feinde im Umkreis von 2 Feldern 1 Runde in Furcht/.test(text) && e.furcht) e.furcht.alle = true;
    m = t.match(/(\d+) Runden?: kein Feind [^,]* kann zaubern|(\d+) Runde kann dort niemand zaubern/);
    if (m) e.schweigen = { runden: zahl(m[1] ?? m[2]), alle: true };
    else if (/Schweigen|vergisst 1 Runde zu zaubern/.test(t)) e.schweigen = { runden: /Untote 2 Runden/.test(t) ? 2 : 1 };
    if (/müssen (?:ihn|sie) 1 Runde angreifen|muss ihn 1 Runde angreifen|zwingt Feinde/.test(text)) e.verspotten = true;
    if (/Deckt|deckt|sieht Unsichtbare|kein Feind kann sich verbergen|enttarnt|verlieren ihre Tarnung|kann sich 3 Runden nicht verbergen/.test(text)) e.aufdecken = true;

    // Unsichtbarkeit (endet beim ersten Angriff).
    if (/unsichtbar(?! für Fernkampf)/.test(t) && !/nicht unsichtbar werden/.test(t)) {
      const dauer = t.match(/(\d+) Runden (?:unsichtbar|als Feind getarnt)/);
      e.unsichtbar = dauer ? zahl(dauer[1]) : 2;
    }
    return e;
  }

  // Liefert alle Fähigkeiten eines Helden mit Stufe, Kosten, Abklingzeit und Regelwirkung.
  function klassenFaehigkeiten(fraktion, rolle) {
    const eintrag = F.fraktionen[fraktion].klassen[rolle];
    return eintrag.liste.map(([name, wirkung], index) => {
      const stufe = F.stufen[index];
      return { id: "f" + stufe, stufe, name, wirkung, zahlung: eintrag.zahlung, ...budget[stufe], regel: lies(wirkung) };
    });
  }

  function meisterFaehigkeiten(fraktion, rolle) {
    const volk = K.fraktionen[fraktion].volk;
    const zahlung = K.fraktionen[fraktion].magie ? F.fraktionen[fraktion].klassen[rolle].zahlung : "A";
    return F.meister[volk].map(([name, wirkung], index) =>
      ({ id: "m" + (index + 1), stufe: index ? 20 : 1, name, wirkung, zahlung, meister: true, ...meisterBudget[index], regel: lies(wirkung) }));
  }

  // ---- Gegnerwerte aus Rang und Stufe ----
  const raenge = {
    mitlaeufer: { name: "Mitläufer", lp: (s) => 6 + 3 * s, schaden: (s) => 3 + Math.floor(s / 2), aktionen: 1, faehigkeiten: "1 Eigenschaft" },
    elite: { name: "Elite", lp: (s) => 10 * s, schaden: (s) => 4 + Math.floor(s / 2), aktionen: 1, faehigkeiten: "1–2 Fähigkeiten im Budget seiner Stufe" },
    anfuehrer: { name: "Anführer", lp: (s) => 30 * s, schaden: (s) => 4 + s, aktionen: 2, faehigkeiten: "2–3 Fähigkeiten", skaliert: true },
    endgegner: { name: "Endgegner", lp: (s) => 45 * s, schaden: (s) => 4 + s, aktionen: 2, faehigkeiten: "eigene Regeln", skaliert: true },
  };
  // Anführer und Endgegner: jeder Held mehr oder weniger als vier ändert die LP um 25 %.
  function gegnerWerte(rang, stufe, helden = 4) {
    const r = raenge[rang];
    const faktor = r.skaliert ? Math.max(0.25, 1 + 0.25 * (helden - 4)) : 1;
    return { rang, stufe, lp: Math.max(1, Math.round(r.lp(stufe) * faktor)), schaden: r.schaden(stufe), aktionen: r.aktionen };
  }
  // Errata 4: Alphatiere ohne eigene Werte kämpfen als Anführer auf der Stufe ihres Gebiets.
  const alphaWerte = (gebietsstufe, helden = 4) => gegnerWerte("anfuehrer", gebietsstufe, helden);
  // Errata 1: Odris kennt Tag und Nacht. Vampire der Erinnernden kämpfen tagsüber 25 % schwächer.
  const tagschwaeche = 0.25;
  const tagesWert = (wert, vampir, tag) => vampir && tag ? Math.max(1, Math.round(wert * (1 - tagschwaeche))) : wert;
  const faireKaempfe = "Ein fairer Kampf für eine Gruppe von 4 Helden der Stufe n: 6 Mitläufer, oder 2 Elite und 2 Mitläufer, oder 1 Anführer und 2 Mitläufer, alle auf Stufe n. Ein einzelner Held (Prolog) schafft 3 Mitläufer oder 1 Elite. Jede Gegnerstufe über der Gruppe macht den Kampf etwa 25 % schwerer.";
  const questStufen = [
    ["Prolog", "1–3", "1–2"], ["Akt 1", "3–5", "3–5"], ["Akt 2", "5–8", "5–8"], ["Akt 3 (Spezialisierung)", "8–11", "8–11"],
    ["Akt 4", "11–14", "11–14"], ["Akt 5", "14–16", "14–16"], ["Volksquest", "16–18", "16–18"], ["Weltquest, Endkampf Morbius", "18–20", "20"],
  ];
  // Eigene Stufen je Fraktion, wo die Fraktionsreihe davon abweicht (Kronreich nach Gemini, Entscheidung Henry 18. 11. 2026).
  const questStufenFraktion = {
    kronreich: [["Prolog", "1–3", "1–2"], ["Akt 1 Der Thron wankt", "1–5", "1–5"], ["Akt 2/3 erster Zweig (Häfen oder Glutberg)", "6–10", "6–10"],
      ["Akt 2/3 zweiter Zweig (der andere)", "11–15", "11–15"], ["Akt 4 Das Alte Reich ersteht neu (mit Volksquest)", "16–18", "16–18"],
      ["Akt 5 Über das Innere Meer", "19–20", "19–20"]],
  };

  // Gegner für kommende Quests. Werte ergeben sich aus gegnerWerte(rang, stufe).
  const gegner = {
    gebundener: { name: "Gebundener", rang: "mitlaeufer", stufen: [1, 12], gruppe: "Gebundene", eigenschaften: { gebunden: true, gift: [2, 1] },
      text: "Fäulnisbiss: jeder Treffer 1 Runde 2 Gift" },
    sporentraeger: { name: "Sporenträger", rang: "mitlaeufer", stufen: [3, 14], gruppe: "Gebundene", eigenschaften: { gebunden: true, platzen: 4 },
      text: "Platzen: beim Fall 4 Gift an allen Nachbarn" },
    fleischwanst: { name: "Fleischwanst", rang: "elite", stufen: [5, 16], gruppe: "Gebundene", eigenschaften: { gebunden: true },
      text: "Verschlingen (AK 2): 10 Schaden, heilt sich um 4. Voller Bauch: beim Fall brechen 2 Gebundene heraus" },
    fleischkoloss: { name: "Fleischkoloss", rang: "anfuehrer", stufen: [10, 18], gruppe: "Gebundene", eigenschaften: { gebunden: true },
      text: "Stampfen (AK 3): 8 Schaden an allen im Umkreis von 1 Feld. Packen (AK 4): 16 Schaden, Ziel 1 Runde betäubt. Fleischwachstum: heilt jede Runde 10 auf Fäulnisfeldern" },
    kultist: { name: "Kultist", rang: "mitlaeufer", stufen: [1, 10], gruppe: "Kult der Bleichen Ewigkeit", eigenschaften: { verborgen: true },
      text: "Verborgen: unsichtbar bis zu seinem ersten Angriff. Bleiches Wort (AK 3): ein Held mit Willenskraft 10 oder weniger 1 Runde in Furcht" },
    grabwaechter: { name: "Grabwächter", rang: "elite", stufen: [6, 16], gruppe: "Kult der Bleichen Ewigkeit", eigenschaften: {},
      text: "Knochenschild (AK 3): er und ein Nachbar erhalten je 9 Schild. Kalte Gabe (AK 4): eine Leiche steht als Gebundener auf" },
    draugr: { name: "Draugr", rang: "elite", stufen: [8, 18], gruppe: "Kult der Bleichen Ewigkeit", eigenschaften: { verborgen: true },
      text: "Lebendes Gesicht: bis zum ersten Angriff für einen Verbündeten gehalten. Verrat (AK 3): 18 Schaden, wenn er unerkannt ist. Geist flieht: fällt der Körper, flieht der Geist, außer ein Aschenspürer oder Glutheiler steht in 2 Feldern" },
    "bleicher-skalde": { name: "Bleicher Skalde", rang: "anfuehrer", stufen: [12, 14], einmalig: true, gruppe: "Kult der Bleichen Ewigkeit", eigenschaften: { feuerImmun: true },
      text: "Lied der Ewigkeit (AK 3): alle Kultisten 2 Runden +2 Schaden. Bleiche Flamme (AK 3): umgekehrte Flammenrunen, 12 Kälteschaden an bis zu 3 Zielen. Ruf an die Getreuen (AK 4): 2 Kultisten erscheinen. Als ehemaliger Ordensritter ist er immun gegen den Feuerbonus des Ordens" },
  };
  const gebundenRegel = "Wer in der Fäulnis stirbt, erhebt sich als Gebundener. Alle Gebundenen stehen nach dem Fall einmal mit halben LP wieder auf, außer sie fielen durch Feuer, Dornholz, Grabsegen oder einen Fäulnisbrenner.";
  const kultText = "Kultisten verstecken sich unter Lebenden und kämpfen aus dem Verborgenen. Ihre Totenmagie ist geliehen: Sie stammt von der Bleichen Krone.";
  const morbius = {
    name: "Morbius, Diener des ersten Toten", stufe: 20, lp: 900, schaden: 24, aktionen: 2, ort: "Blutbrunnen von Eryndor",
    text: "Ohne Namen unbesiegbar: Fällt Morbius auf 0 LP, steht er in der nächsten Runde mit 300 LP wieder auf. Erst wenn ein Held seinen Namen am Blutbrunnen ausspricht (eine Aktion des Helden, der die drei Bruchstücke trägt, oder Serathias letztes Wort), kann er sterben.",
    phasen: [
      { name: "1. Der Diener", lp: 300, aktionen: 2, text: "Kalte Hand: 24 Schaden. Hauch des ersten Toten (AK 3): 12 Schaden an allen Helden im Umkreis von 2 Feldern, Heilung 2 Runden halbiert" },
      { name: "2. Kein Leben", lp: 300, aktionen: 2, text: "Dazu Nameloser Griff (AK 4): 16 Schaden, Ziel 1 Runde betäubt. Die Gefallenen gehören mir: ein kampfunfähiger Held steht als Gebundener gegen die Gruppe auf, bis ihn jemand mit mindestens 10 Heilung zurückholt" },
      { name: "3. Der Name", lp: 300, aktionen: 3, text: "Er handelt dreimal pro Runde. Welt ohne Leben (1 ×): 20 Schaden an allen Helden. Erst in dieser Phase wirkt der gesprochene Name: Er bleibt dann liegen" },
    ],
    kontrolle: "Gegen Morbius wirken Betäuben und Furcht nur halb so lange (aufgerundet auf 1 Runde). Die Untoten spielen ihn in „Die Nacht ohne Morgen“ nicht als Gegner, sondern treffen ihn beim Ritual der Vollendung: Dort gelten dieselben Werte.",
  };

  return { maxStufe, epFuer, stufeAus, ep, lpTabelle, lebenspunkte, budget, meisterBudget, machtpunkte, gegenUebermacht,
    alphaWerte, tagschwaeche, tagesWert,
    ressourceVerstaerkung, spezVerstaerkung, maxDiener, schildDauer, lies, klassenFaehigkeiten, meisterFaehigkeiten,
    raenge, gegnerWerte, faireKaempfe, questStufen, questStufenFraktion, gegner, gebundenRegel, kultText, morbius };
})();
