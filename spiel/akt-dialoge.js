"use strict";

// Quest- und Dialog-Upgrade v3.0.5 (Henry, 20. 11. 2026, Pakete A, B und C).
// Akt 1 der drei Menschen-Fraktionen, Gastgeber-Szenen der Schwester-Zweige (Akt 2/3), Akt 4 (Malakor, Kriegsrat)
// und Abschluss-Entscheidungen am Aushang. Henrys Zieldateien (spiel/handlung_akte.js, ui/dialog.js) gibt es nicht;
// die Regeln stehen in spiel/regeln.js, das Gesprächsfenster in spiel/spiel.js.
//
// Option: { id, label, probe?: { attribut | attribute[], wert }, bedingung?, text?, erfolg?, misserfolg?, effekt?, erfolgEffekt? }
//   probe       Ohne Zufall: Grundwert ≥ Wert gelingt (Regel-Entscheidung „Proben über Werte“). Bei mehreren Grundwerten zählt der höchste.
//   bedingung   { silber, proviant, nahrung, eisen, runensplitter } – Mindestbestand. proviant = Rationen des Helden (Vorrat),
//               nahrung/eisen/runensplitter = Rohstoffe im Kontor der eigenen Fraktion.
//   effekt      gilt immer, erfolgEffekt nur bei gelungener Probe.
//   Effekt-Schlüssel: silber, ep, moral, ruf (eigene Fraktion), rufBei { fraktion: n }, proviant, nahrung/eisen/runensplitter (Kontor),
//   taktik (Kampfvorteil im nächsten Questkampf), weniger (Gegner −n im nächsten Questkampf), hinterhaltSchutz,
//   ohneKampf (Kampf entfällt), flag (Marke), gegenlied (Gegenlied-Hilfe gegen Malakor für jede Klasse).
// wahl (nur Schritt 3): bisherige Wahl-Kennung, damit Akt 2–5 und alte Spielstände gleich bleiben.
const aktDialoge = (() => {
  const INT = "mind", STR = "strength", GES = "agility";
  const akt1 = {
    kronreich: [
      { npc: "astrid", ort: "kronhall", titel: "Blut im Thronsaal",
        beschreibung: "Kaiser Aurelian IV. liegt im Sterben, während vor den Toren Valengrads die Kornspeicher brennen. Ein Hauptmann der Stadtwache wurde tot im Brunnen gefunden – mit einer schwarzen Leeren-Klinge im Rücken.",
        eroeffnung: "Mein Vater atmet kaum noch, und schon kreisen die Geier über dem Thron. Der tote Hauptmann trug geheime Marschbefehle für Eisentor bei sich. Sag mir ins Gesicht: Wem in diesen Mauern kann ich noch trauen?",
        optionen: [
          { id: "valen_s1_intelligenz", label: "🧠 Die Leiche untersuchen (Intelligenz 11)", probe: { attribut: INT, wert: 11 },
            erfolg: "Du erkennst das Gift an der Klinge – es stammt aus den Schmuggler-Kais von Korvath. Aurelia nickt kalt und öffnet dir die geheime Waffenkammer.",
            erfolgEffekt: { silber: 20, taktik: "gegengift_vorbereitet" },
            misserfolg: "Die Spur im Brunnen ist verwischt. Du reitest ohne Warnung in die Nacht hinaus." },
          { id: "valen_s1_direkt", label: "⚔️ Sofort nach Eisentor aufbrechen",
            text: "Keine Zeit für Hof-Detektive. Wenn Eisentor fällt, ist Valengrad morgen eingekesselt. Marschall Kaelen wartet.",
            effekt: { moral: 4, ruf: 3 } },
          { id: "valen_s1_opfer", label: "🛡️ Eigene Rationen an die hungernde Wache verteilen (−2 Nahrung)", bedingung: { proviant: 2 },
            text: "Die Wachen senken ihre Speere und salutieren. Ein Veteran flüstert dir den geheimen Schleichweg nach Eisentor zu.",
            effekt: { proviant: -2, ruf: 6, hinterhaltSchutz: true } },
        ] },
      { npc: "kaelen", ort: "hagenfels", gegner: "deserteure", titel: "Die Belagerung am Schwarzen Pass",
        beschreibung: "Eisentor steht in Flammen. Deserteure der eigenen Grenzwacht haben die Zugbrücke besetzt und verhandeln mit Plünderern über die Auslieferung der Festung.",
        eroeffnung: "Meine eigenen Männer haben die Waffen gegen mich erhoben! Sie behaupten, die Krone habe sie zum Sterben hier draußen vergessen. Wie brechen wir ihre Barrikade, bevor das Haupttor fällt?",
        optionen: [
          { id: "valen_s2_staerke", label: "⚔️ Frontalsturm mit dem Rammbock (Stärke 12)", probe: { attribut: STR, wert: 12 },
            erfolg: "Mit einem gewaltigen Schlag sprengst du das innere Gitter. Die Deserteure weichen entsetzt zurück – einer ihrer Schützen wirft sofort die Waffe weg.",
            erfolgEffekt: { weniger: 1, moral: 5 },
            misserfolg: "Armbrustbolzen prasseln auf eure Schilde. Der Sturm gelingt, aber die Feinde sind vorgewarnt." },
          { id: "valen_s2_geschick", label: "🗡️ Über die vereiste Wehrmauer in ihren Rücken schleichen (Geschick 11)", probe: { attribut: GES, wert: 11 },
            erfolg: "Lautlos schaltet ihr die beiden Späher auf den Zinnen aus und fallt den Meuterern in den Rücken.",
            erfolgEffekt: { taktik: "ueberraschungsangriff_erstschlag" },
            misserfolg: "Steine lösen sich unter deinen Stiefeln – die Meuterer schlagen Alarm!" },
          { id: "valen_s2_verhandlung", label: "💰 Den Rädelsführer mit Silber kaufen (−25 Silber)", bedingung: { silber: 25 },
            text: "Der Anführer der Deserteure steckt den Beutel ein und zieht mit seinen Leuten ab. Kaelen spuckt verächtlich aus, doch die Festung ist ohne Blutvergießen gerettet.",
            effekt: { silber: -25, ohneKampf: true, ruf: -2, ep: 180 } },
        ] },
      { npc: "astrid", ort: "kronhall", wahlSchritt: true, titel: "Das Urteil von Valengrad",
        beschreibung: "Du kehrst mit den erbeuteten Befehlen der Verräter nach Valengrad zurück. Im Ratssaal steht der angeklagte Schatzmeister in Ketten – er schwört, er habe nur gehandelt, um die Seuche in den Armenvierteln zu stoppen.",
        eroeffnung: "Du hast Eisentor gerettet und den Verrat aufgedeckt. Jetzt fordert der Adel seinen Kopf auf den Zinnen, während das Volk nach Gnade schreit. Dein Wort entscheidet über das erste Gesetz meiner Herrschaft.",
        optionen: [
          { id: "valen_s3_hinrichtung", wahl: "kron_act1_fight", label: "⚔️ Gnadenlose Härte: Richtet ihn öffentlich hin",
            text: "Das Beil fällt vor den Augen der versammelten Herzöge. Niemand wagt es mehr, offen gegen die Krone zu flüstern – doch in den Gassen wächst der Hass.",
            effekt: { flag: "valen_pfad_haerte", silber: 40, ruf: 5, moral: -5 } },
          { id: "valen_s3_gnade_kerker", wahl: "kron_act1_truce", label: "🛡️ Gnade gegen Dienst: Zwingt ihn, sein Netzwerk offenzulegen",
            text: "Der Schatzmeister bricht weinend zusammen und nennt dir drei geheime Schmugglerverstecke des Kults. Der Adel murrt, doch du hast wertvolle Beweise.",
            effekt: { flag: "valen_pfad_gnade", runensplitter: 3, moral: 5 } },
        ] },
    ],
    orden: [
      { npc: "ragna", ort: "glutberg", titel: "Asche auf dem Altar",
        beschreibung: "In der Kathedrale von Sonnenwacht flackert die Ewige Flamme violett statt golden. Drei Novizen wurden im Kellergewölbe tot aufgefunden – ihre Augen sind zu schwarzem Glas erstarrt.",
        eroeffnung: "Die Ketzer flüstern, unser heiliges Feuer sei vergiftet. Wenn das Volk zweifelt, brennt bald ganz Kharos. Aschenkloster wurde in der Nacht überfallen – Läuterin Seraphina hält allein das innere Tor. Wie brichst du auf?",
        optionen: [
          { id: "solis_s1_intelligenz", label: "🧠 Die gläsernen Augen der Toten untersuchen (Intelligenz 11)", probe: { attribut: INT, wert: 11 },
            erfolg: "Du erkennst keine gewöhnliche Seuche, sondern ein gezieltes Leeren-Ritual. Du nimmst geweihtes Öl vom Hochaltar mit, das den Fluch bannt.",
            erfolgEffekt: { taktik: "geweihtes_oel_gegen_fluch", ep: 60 },
            misserfolg: "Die dunkle Aura sticht dir in die Schläfen, bevor du etwas erkennen kannst. Du reitest ohne Warnung los." },
          { id: "solis_s1_direkt", label: "⚔️ Mit dem Banner des Ordens im Gewaltmarsch ausrücken",
            text: "Kein Zögern! Wer die Hand gegen das Kloster erhebt, wird noch vor Sonnenuntergang im Feuer geläutert.",
            effekt: { moral: 5, ruf: 3 } },
          { id: "solis_s1_opfer", label: "🛡️ Eigene Vorräte für die verängstigten Pilger zurücklassen (−2 Nahrung)", bedingung: { proviant: 2 },
            text: "Die Pilger küssen deinen Schildrand und verraten dir, auf welchem Schleichpfad die Kultisten das Kloster eingekreist haben.",
            effekt: { proviant: -2, ruf: 6, hinterhaltSchutz: true } },
        ] },
      { npc: "seraphina", ort: "aschenkloster", gegner: "kultisten", titel: "Der Scheiterhaufen von Aschenkloster",
        beschreibung: "Dichter schwarzer Rauch hängt über dem Kreuzgang. Läuterin Seraphina steht mit blutigem Streitkolben vor der Reliquienkammer, während Kultisten mit dunklen Gesängen das Haupttor einrammen.",
        eroeffnung: "Sie wollen das Sonnenrelikt unter dem Altar schänden! Ein abtrünniger Priester führt sie an und treibt die Dörfler mit Furcht vor sich her. Stürmen wir sofort in den Hof oder zerschlagen wir zuerst ihr Ritualfeuer?",
        optionen: [
          { id: "solis_s2_staerke", label: "⚔️ Durch das brennende Tor brechen und den Prediger fällen (Stärke 12)", probe: { attribut: STR, wert: 12 },
            erfolg: "Du stößt den schweren Riegel auf und stürmst durch die Flammen. Vor Schreck lassen zwei der Kultisten ihre Fackeln fallen und fliehen.",
            erfolgEffekt: { weniger: 1, moral: 5 },
            misserfolg: "Der Rauch beißt in den Lungen – die Kultisten erwarten euch bereits mit gezückten Opferdolchen." },
          { id: "solis_s2_geschick", label: "🗡️ Über die Klosterdächer auf die Bogenschützen springen (Geschick 11)", probe: { attribut: GES, wert: 11 },
            erfolg: "Wie ein Schatten stürzt du vom Glockenturm herab und schaltest die Hinterhalt-Schützen lautlos aus.",
            erfolgEffekt: { taktik: "ueberraschungsangriff_erstschlag" },
            misserfolg: "Ein loser Dachziegel stürzt in den Hof – die Kultisten reißen ihre Waffen hoch!" },
          { id: "solis_s2_predigt", label: "🔥 Die verängstigten Dörfler mit einem Fluch-Bann zum Rückzug bewegen (Intelligenz 12)", probe: { attribut: INT, wert: 12 },
            erfolg: "Deine Stimme übertönt die dunklen Gesänge. Die verführten Bauern werfen ihre Mistgabeln weg – nur der fanatische Kern bleibt zurück.",
            erfolgEffekt: { weniger: 1, ruf: 4 },
            misserfolg: "Der Prediger übertönt deine Worte mit rasendem Geschrei!" },
        ] },
      { npc: "ragna", ort: "glutberg", wahlSchritt: true, titel: "Feuer oder Vergebung",
        beschreibung: "Du kehrst mit dem geretteten Sonnenrelikt und einem gefangenen Aschenpriester nach Sonnenwacht zurück. Auf dem Kirchplatz ist bereits der Scheiterhaufen aufgeschichtet.",
        eroeffnung: "Der Gefangene behauptet, er habe Stimmen aus der Tiefe gehört, die vor dem Verschlinger warnen. Die Menge verlangt sein Blut zur Abschreckung. Wie richtet der Orden heute?",
        optionen: [
          { id: "solis_s3_scheiterhaufen", wahl: "orden_act1_wrath", label: "🔥 Gnadenlose Läuterung: Übergebt ihn den Flammen",
            text: "Die Flammen schlagen hoch, und die Menge jubelt in finsterer Ekstase. Der Orden demonstriert eiserne Stärke, doch wertvolles Wissen verbrennt zu Asche.",
            effekt: { flag: "solis_pfad_reinigung", silber: 35, ruf: 6, moral: 4 } },
          { id: "solis_s3_verhoer", wahl: "orden_act1_mercy", label: "📜 Bewahrung: Sperrt ihn in die tiefen Archive zum Verhör",
            text: "Du entreißt ihn dem Mob und lässt seine Visionen aufzeichnen. Die Inquisitoren murren über deine Milde, doch du findest einen Hinweis auf den Sternenanker.",
            effekt: { flag: "solis_pfad_bewahrung", runensplitter: 4, ep: 150 } },
        ] },
    ],
    haefen: [
      { npc: "zollmeister", ort: "perlvik", titel: "Schwarze Segel im Nebel",
        beschreibung: "Im Hafen von Korvath-Bucht treibt ein brennendes Handelsschiff an die Kaimauer. Auf das Großsegel wurde mit Blut das Zeichen der abtrünnigen Korsaren gemalt – und Nebelklippe hat seit drei Tagen kein Leuchtfeuer mehr entzündet.",
        eroeffnung: "Wenn die Seewege dicht sind, verhungert Korvath in zwei Wochen – und die hohen Herren in Valengrad lachen sich ins Fäustchen. In Nebelklippe sitzt ein Verräter, der den Korsaren unsere Routen verkauft. Wie gehst du die Sache an?",
        optionen: [
          { id: "korvath_s1_intelligenz", label: "🧠 Die Frachtpapiere des brennenden Schiffs prüfen (Intelligenz 11)", probe: { attribut: INT, wert: 11 },
            erfolg: "Zwischen den verkohlten Listen findest du ein gefälschtes Gildensiegel aus Nebelklippe. Du weißt genau, wen du dort packen musst.",
            erfolgEffekt: { silber: 20, taktik: "verraeter_entlarvt" },
            misserfolg: "Das Seewasser hat die Tinte unleserlich gemacht. Du brichst ohne Beweise nach Nebelklippe auf." },
          { id: "korvath_s1_direkt", label: "⚔️ Mit Entermesser und Schwarzpulver direkt losmarschieren",
            text: "Wer die Gilde bestiehlt, bezahlt mit den Zähnen. Kapitänin Mirella in Nebelklippe soll ihre Leute bereithalten.",
            effekt: { moral: 4, ruf: 3 } },
          { id: "korvath_s1_silber", label: "💰 Hafenbettler für Informationen über die Schmuggler bezahlen (−10 Silber)", bedingung: { silber: 10 },
            text: "Für zehn Silbermünzen verrät dir ein einbeiniger Matrose die versteckte Schmugglerbucht vor Nebelklippe.",
            effekt: { silber: -10, ruf: 5, hinterhaltSchutz: true } },
        ] },
      { npc: "mirella", ort: "nebelvik", gegner: "schmuggler", titel: "Hinterhalt an den Salzklippen",
        beschreibung: "Dichter Küstennebel verschluckt die Stege von Nebelklippe. Kapitänin Mirella hat ihre letzten Getreuen hinter umgestürzten Rumfässern verschanzt, während aus der Schmugglerhöhle Korsaren zum Sturm ansetzen.",
        eroeffnung: "Endlich Verstärkung! Diese Bastarde haben unser Leuchtfeuer gelöscht, damit ein schweres Kriegsschiff auf die Riffe läuft und sie es plündern können. Wie schlagen wir zurück?",
        optionen: [
          { id: "korvath_s2_geschick", label: "🗡️ Durch die Flutgrotte in ihre Flanke schleichen (Geschick 11)", probe: { attribut: GES, wert: 11 },
            erfolg: "Bis zur Hüfte im eiskalten Wasser tauchst du hinter ihren Schwarzpulverschützen auf und streckst den Wachposten nieder.",
            erfolgEffekt: { taktik: "ueberraschungsangriff_erstschlag", weniger: 1 },
            misserfolg: "Eine Welle schlägt gegen den Fels und verrät eure Position!" },
          { id: "korvath_s2_staerke", label: "⚔️ Ein brennendes Pulverfass in ihre Barrikade rollen (Stärke 12)", probe: { attribut: STR, wert: 12 },
            erfolg: "Mit gewaltiger Wucht schleuderst du das Fass in ihre Deckung – die Explosion reißt eine breite Lücke in ihre Reihen.",
            erfolgEffekt: { weniger: 1, moral: 5 },
            misserfolg: "Die Lunte zischt im nassen Nebel zu früh – die Korsaren stürmen vor!" },
          { id: "korvath_s2_bestechung", label: "💰 Den Söldnern unter den Korsaren doppelten Sold bieten (−30 Silber)", bedingung: { silber: 30 },
            text: "Als die Münzen auf die Planken klirren, wechseln die angeheuerten Schläger sofort die Seite. Der Korsarenkapitän steht plötzlich allein da.",
            effekt: { silber: -30, ohneKampf: true, ep: 180 } },
        ] },
      { npc: "zollmeister", ort: "perlvik", wahlSchritt: true, titel: "Der Preis der freien See",
        beschreibung: "Mit den erbeuteten Seekarten und dem gefangenen Informanten kehrst du nach Korvath-Bucht zurück. Der Rat der Kapitäne streitet lautstark darüber, ob man das Monopol der Gilde festigt oder die Schmuggler in die eigenen Reihen aufnimmt.",
        eroeffnung: "Die See vor Nebelklippe ist wieder frei, und die Gilde schuldet dir ihren Hals. Jetzt sag uns, wie wir die Häfen für den kommenden Krieg rüsten sollen.",
        optionen: [
          { id: "korvath_s3_gilde", wahl: "haefen_act1_guild", label: "⚖️ Gilden-Ordnung: Besiegele offizielle Handelsverträge mit allen Häfen",
            text: "Die Kontore öffnen ihre Schatzkammern und sichern dir dauerhafte Vorzugspreise zu. Korvath tritt geeint und stark auf.",
            effekt: { flag: "korvath_pfad_gilde", silber: 45, ruf: 6 } },
          { id: "korvath_s3_schmuggler", wahl: "haefen_act1_shadow", label: "🏴‍☠️ Schatten-Pakt: Begnadige die Korsaren und nutze ihr Schmuggler-Netz",
            text: "Die ehrbaren Händler spucken aus, doch von nun an steht dir jede dunkle Bucht und jeder Geheimweg ohne Rufprüfung offen.",
            effekt: { flag: "korvath_pfad_schmuggler", runensplitter: 3, moral: 5 } },
        ] },
    ],
  };

  // Akt 2/3: Gastgeber-Szene, bevor der erste Kampf eines Schwester-Zweigs beginnt (Schlüssel = gastgebende Fraktion).
  const zweige = {
    kronreich: { npc: "astrid", titel: "Eisen, Krone und gebrochene Schwüre",
      beschreibung: "In den Hallen von Valengrad herrscht Belagerungsstimmung. Die Herzöge weigern sich, ihre gepanzerten Reiter für einen fremden Verbündeten zu opfern, während im Grenzland die ersten Dörfer von Untoten-Spähern überrannt werden.",
      eroeffnung: "Du kommst aus einem anderen Banner zu mir und verlangst die Treue meiner Ritter. Meine Herzöge halten dich für einen Spion oder einen Bettler. Beweise vor dem Hof, dass dein Stahl ebenso hart ist wie unser Gesetz.",
      optionen: [
        { id: "zweig_valen_staerke", label: "⚔️ Den Champion der Herzöge zum Duell fordern (Stärke 13)", probe: { attribut: STR, wert: 13 },
          erfolg: "Mit einem wuchtigen Hieb schlägst du dem Herzogschampion das Schild aus der Hand. Im Thronsaal herrscht eisiges Schweigen – dann salutieren die Ritter.",
          erfolgEffekt: { rufBei: { kronreich: 15 }, taktik: "respekt_der_ritter" },
          misserfolg: "Der Ritter pariert deinen Schlag mit kaltem Lächeln. Du musst dir ihren Respekt auf dem Schlachtfeld verdienen." },
        { id: "zweig_valen_intelligenz", label: "🧠 Die verräterischen Briefe eines Herzogs offenlegen (Intelligenz 13)", probe: { attribut: INT, wert: 13 },
          erfolg: "Aurelia wirft den entlarvten Herzog in Ketten und überträgt dir das Kommando über seine Grenztruppen.",
          erfolgEffekt: { rufBei: { kronreich: 15 }, weniger: 1 },
          misserfolg: "Die Siegel der Briefe sind zu stark beschädigt, um vor dem Rat als Beweis zu gelten." },
        { id: "zweig_valen_ressourcen", label: "📦 Kriegskasse mit Eisen & Nahrung auffüllen (−10 Eisen, −10 Nahrung)", bedingung: { eisen: 10, nahrung: 10 },
          text: "Als die schweren Versorgungskarren in den Burghof rollen, verstummt jeder Protest. Deine Taten sprechen lauter als Worte.",
          effekt: { eisen: -10, nahrung: -10, rufBei: { kronreich: 20 } } },
      ] },
    orden: { npc: "ragna", titel: "Asche, Eid und läuterndes Feuer",
      beschreibung: "In Sonnenwacht brennen Tag und Nacht die Opferfeuer. Der Flammenorden misstraut jedem Außenstehenden, seit dunkle Schatten aus den nördlichen Klöstern gemeldet wurden.",
      eroeffnung: "Die Ewige Flamme duldet keine lauen Herzen. Wenn du den Schildwall des Ordens an deiner Seite willst, musst du beweisen, dass keine Leeren-Fäulnis in deiner Seele nistet.",
      optionen: [
        { id: "zweig_solis_probe", label: "🔥 Die Feuerprobe am Altar bestehen (Stärke oder Intelligenz 13)", probe: { attribut: [STR, INT], wert: 13 },
          erfolg: "Ohne zu zucken schreitest du durch den Ring aus weißer Glut. Vane senkt sein Flammenschwert und gewährt dir den Segen des Ordens.",
          erfolgEffekt: { rufBei: { orden: 15 }, taktik: "segen_der_sonnenwacht" },
          misserfolg: "Die Hitze versengt deine Rüstung. Der Inquisitor verlangt erst Blut auf dem Feld, bevor er dir traut." },
        { id: "zweig_solis_runen", label: "✨ Runensplitter für die Tempelwachen stiften (−4 Runensplitter)", bedingung: { runensplitter: 4 },
          text: "Die Schmiedepriester fassen deine Splitter in ihre Reliquien ein und öffnen dir sofort die Rüstkammern.",
          effekt: { runensplitter: -4, rufBei: { orden: 20 } } },
        { id: "zweig_solis_soeldner", label: "🏴‍☠️ Über den Söldner-Pfad direkt gegen den Kult zuschlagen",
          text: "Du pfeifst auf die Prüfungen der Priester und greifst das Kultistenlager auf eigene Faust an.",
          effekt: { moral: 4 } },
      ] },
    haefen: { npc: "zollmeister", titel: "Salz, Nebel und gekreuzte Klingen",
      beschreibung: "In Korvath-Bucht zählen keine Titel – nur Silber, Schiffe und scharfe Klingen. Flottenfürst Draven empfängt dich an Bord seines Flaggschiffs, während draußen schwarze Korsarensegel den Horizont verdunkeln.",
      eroeffnung: "Meine Kapitäne stimmen mit dem Entermesser ab. Wenn wir unsere Schiffe für deinen Krieg riskieren sollen, was liegt für Korvath auf dem Tisch?",
      optionen: [
        { id: "zweig_korvath_geschick", label: "🗡️ Einen meuternden Kapitän im Messerduell entwaffnen (Geschick 13)", probe: { attribut: GES, wert: 13 },
          erfolg: "Blitzschnell schlägst du ihm die Klinge aus der Faust und setzt ihm deinen Dolch an die Kehle. Draven lacht dröhnend auf: „Abgemacht!“",
          erfolgEffekt: { rufBei: { haefen: 15 }, taktik: "enterkommando_bereit" },
          misserfolg: "Der Kapitän weicht aus und spuckt auf die Planken. Du musst dir deine Anteile erst erkämpfen." },
        { id: "zweig_korvath_silber", label: "💰 Die Kriegskasse der Flotte mit Silber füllen (−60 Silber)", bedingung: { silber: 60 },
          text: "Als die Silberkisten auf dem Deck geöffnet werden, heben alle Kapitäne ihre Krüge auf deinen Namen.",
          effekt: { silber: -60, rufBei: { haefen: 22 } } },
        { id: "zweig_korvath_direkt", label: "⚔️ Die Korsaren-Blockade vor dem Hafen im Sturm durchbrechen",
          text: "Kein Feilschen – wir holen uns den Ruhm auf den Planken.",
          effekt: { moral: 5 } },
      ] },
  };

  // Akt 4: Entlarvung am Sternenanker (vor dem Bosskampf) und der Große Kriegsrat (statt des Großen Things).
  const akt4 = {
    malakor: { npc: null, sprecher: { name: "Archivar Malakor", titel: "Sternenanker" }, titel: "Der Verräter im Sternenlicht",
      beschreibung: "Tief im uralten Gewölbe des Sternenankers steht der Verhüllte Sternenleser vor dem geborstenen Siegel. Als du eintrittst, wirft er die Kapuze zurück: Es ist Archivar Malakor, der die drei Menschenreiche gegeneinander gehetzt hat, um Vael-Thar den Weg zu ebnen.",
      eroeffnung: "Ihr Narren klammert euch an ein sterbendes Licht! Vael-Thar wird diesen Lärm beenden und der Welt endlich ewige Stille schenken. Niemand hält das Tor mehr auf!",
      optionen: [
        { id: "malakor_gegenlied", label: "✨ Das uralte Gegenlied der Anker anstimmen (Gegenlied-Hilfe)",
          text: "Die Runen an den Wänden flammen auf und durchbrechen Malakors dunklen Schutzschild. Jetzt steht er dir im offenen Kampf gegenüber!",
          effekt: { gegenlied: true } },
        { id: "malakor_sturmangriff", label: "⚔️ Ohne Zögern mit gezogener Waffe auf ihn losstürmen",
          text: "Mit einem Kampfschrei durchbrichst du seine Schattenbarriere und zwingst ihn in die Knie!",
          effekt: { moral: 5 } },
      ] },
    kriegsrat: { npc: "astrid", titel: "Der Große Kriegsrat & Die Armada",
      beschreibung: "Malakors Verrat ist zerschlagen, doch jenseits des Sturmmeers erwachen die fremden Völker und die Untoten-Flotten. Die Anführer von Valen, Solis und Korvath legen ihre Banner vor dir nieder.",
      eroeffnung: "Kein einzelnes Reich kann diesen Sturm überleben. Wir ernennen dich zum Hochfeldherrn von Kharos. Fülle die Kriegskasse der Armada – dann setzen wir die Segel zu den anderen Kontinenten!",
      optionen: [
        { id: "kriegsrat_annehmen", label: "🛡️ Den Titel des Hochfeldherrn annehmen und die Armada rüsten",
          text: "Die Hörner von Valengrad, Sonnenwacht und Korvath-Bucht erschallen gemeinsam. Dein Name wird in die Chronik von Kharos eingemeißelt.",
          effekt: { flag: "hochfeldherr" } },
      ] },
  };

  // Abschluss-Entscheidung nach einem Aushang-Auftrag (statt eines leeren „Auftrag erledigen“).
  const aushang = {
    kampf: { titel: "Beute und Gefangene", text: "Die Plünderer sind zerschlagen. Zwischen den zerbrochenen Karren findest du gestohlene Vorräte der umliegenden Höfe.",
      optionen: [
        { id: "beute_zurueck", label: "🛡️ Vorräte an die Bauern zurückgeben (+4 Ruf, +3 Moral)", effekt: { ruf: 4, moral: 3 } },
        { id: "beute_behalten", label: "💰 Die Beute für die eigene Kriegskasse einbehalten (+15 Silber)", effekt: { silber: 15 } },
      ] },
    bergung: { titel: "Unheimlicher Fund am Wegesrand", text: "Unter den Trümmern glimmt ein seltsamer Splitter, der kaltes Leeren-Flüstern ausstrahlt.",
      optionen: [
        { id: "splitter_versiegeln", label: "✨ Splitter sicher versiegeln (+1 Runensplitter)", effekt: { runensplitter: 1 } },
        { id: "splitter_zerschlagen", label: "🔥 Splitter sofort zerschlagen und reinigen (+50 EP)", effekt: { ep: 50 } },
      ] },
  };

  // Taktik-Vorteile für den nächsten Questkampf (Auslegung Claude: Henry nennt nur die Namen).
  //   erstschlag  Alle Gegner beginnen mit 15 % weniger LP.
  //   schild      Der Held beginnt mit einem Schild von 10 % seiner LP.
  const taktik = {
    gegengift_vorbereitet: { name: "Gegengift vorbereitet", art: "schild" },
    geweihtes_oel_gegen_fluch: { name: "Geweihtes Öl gegen den Fluch", art: "schild" },
    segen_der_sonnenwacht: { name: "Segen der Sonnenwacht", art: "schild" },
    ueberraschungsangriff_erstschlag: { name: "Überraschungsangriff", art: "erstschlag" },
    verraeter_entlarvt: { name: "Verräter entlarvt", art: "erstschlag" },
    respekt_der_ritter: { name: "Respekt der Ritter", art: "erstschlag" },
    enterkommando_bereit: { name: "Enterkommando bereit", art: "erstschlag" },
  };

  return { akt1, zweige, akt4, aushang, taktik };
})();
if (typeof module !== "undefined") module.exports = aktDialoge;
