# Freie Häfen – Hauptquest und Nebenquests

Stand: 18. 11. 2026. Grundlage ist die Ausarbeitung von Gemini (Quelltext in `quellen/gemini/haefen-*.json`; Silberholm q01–q08 hat Henry am 18. 11. 2026 nachgeliefert). Aufbau wie beim Kronreich und beim Orden (siehe [KRONREICH.md](KRONREICH.md), [ORDEN.md](ORDEN.md)): Gemini-Struktur, Schwester-Zweige erster 6–10 und zweiter 11–15, Fraktions-Spezialisierung zusätzlich zur Klassen-Spezialisierung, Skalde = Erzpriester Thorvald (entlarvt in Akt 4), Akt-5-Ziel frei wählbar. Die Identität der Stillen Feder bleibt geheim.

**Arbeitsanweisung und Patch Henry (18. 11. 2026):**
1. Runen- und Glutgegenstände sind **Gruppen-Relikte** (Henry, 18. 11. 2026, Quelle `quellen/henry/relikte.json`): Höchstens eins ist aktiv und stärkt die ganze Gruppe, getrennt von der Ausrüstung; Wechsel jederzeit außerhalb des Kampfes, das vorige kehrt in den Rucksack zurück. Kronreich und Häfen dürfen Runenrelikte nutzen, der Orden Runen- und Glutrelikte; alle anderen verkaufen sie. Siehe Tabelle unten.
2. „Gold und Eisen“ folgt den echten Straßen: Wachtfeuer über S43 nach Lichtheim und S28 nach Brandstein, dann über S30 nach Thorvaldsklipp und S38 zum Glutberg.
3. Der dritte Begleiter ist Zollhauptmann Halvor Eisentau (salzwacht_q10, `comp_haefen_halvor`).
4. Alle Städte haben am Aushang Stufe 1–5.
5. Das Alphatier von Zollholm heißt **Die Schwarze Krake** (bei Gemini „Mutter Tiefe“), auch im Bestiarium „Meere und Inseln“.
6. Akt 5 heißt „Über das Innere Meer“ (bei Gemini „Die Flotte gen Norden“) und beginnt mit dem Kriegsrat in Perlvik. Danach legt die Flotte im echten Starthafen der gewählten Route ab (siehe unten).

**Spielregel für Wegaufträge:** Ein Kampfauftrag wird auf einem Weg ausgelöst, der am Auftragsort beginnt und ins Land der Menschen führt. Seewege in fremdes Land (etwa M39 nach Draugrsund) lösen nichts aus; solche Aufträge erledigt der Held im Hafen vor dem Auslaufen.

| Teil | Stand im Spiel |
| --- | --- |
| Nebenquests: 11 Städte mit je 10 Aufträgen, 23 Dörfer, insgesamt 133 | Aushang im Stadt-Hub, spielbar für Helden der drei Menschen-Fraktionen |
| Hauptquest Akt 1 | spielbar: Zollholm → Möwenstad (M31) → Silberholm (M30) → Perlvik (M40), Wahl am Hafenthing |
| Hauptquest Akt 2–5, Spezialisierung | Plan im Stadt-Hub (lesbar). Akttitel in `spiel/startpunkte.js`, Stufen in `kampf.questStufenFraktion.haefen`. |
| Begleiter | Karen, Sören und Halvor nach ihrem Begleiter-Auftrag im Hofstaat |

Daten: `spiel/nebenquests-daten.js`, erzeugt von `quellen/nebenquests-erzeugen.cjs`.

## Hauptquest „Jedes Meer ist ein Weg“ (Kapitel 1)

### Prolog „Fracht aus dem Norden“ (spielbar)
Herbst 612 n. E., die Nacht des Erwachens: Ein Schmugglerschiff aus dem Norden läuft in Perlvik ein. Im Laderaum liegen Aethari-Schriften und gefesselte Elfenhändler. Kurz nach Mitternacht brennt das Gildenhaus, die Schriften verschwinden, und der Held flieht mit den Elfen nach Zollholm. (Zusammenfassung des Prologs im Spiel.)

### Akt 1 „Die Zollinseln“ (Stufe 1–5)
Zollinseln & Ostküste (Zollholm, Möwenstad, Perlvik)

1. **Spuren auf den Zollinseln** (Zollholm): Nach der Flucht aus Perlvik organisierst du von Zollholm aus die Sicherung der Seewege. Eine verschwundene Leiche aus dem brennenden Gildenhaus und ein vermisster Seesoldat führen zu einem Schmugglerversteck.
2. **Verschlüsselte Briefe** (Möwenstad / Silberholm): Über Seeweg M31 nach Möwenstad und M30 nach Silberholm fängst du Kuriere ab. Geheime Nachrichten der Stillen Feder (deren Identität im Dunkeln bleibt) warnen vor Kult-Reedern, die Knochen aus dem Norden schmuggeln.
3. **Rückkehr ans Hafenthing** (Perlvik): Über M40 kehrst du nach Perlvik zurück, überführst den korrupten Reeder vor Thingsprecherin Solveig Valsdottir und erhältst das Mandat der Freien Häfen.

- Wahl: Den Bund der ehrlichen Kapitäne stärken & Schmuggel offenlegen → +10 Gold; bessere Handelspreise in allen Hafenstädten.
- Wahl: Die Schmugglerrouten heimlich für die Häfen übernehmen → +80 Silber; Spionage- und Kaper-Boni auf Seewegen.

### Akt 2/3 „Die Kronschuld“ (Stufe 6–10 als erster Zweig, 11–15 als zweiter, Schwester-Zweig Kronreich)
Grenzmarkt, Haraldstad, Kronhall

1. **Korn gegen Schuldscheine** (Grenzmarkt / Haraldstad): Über S53 erreichst du Grenzmarkt und über Grenzstraße S10 Haraldstad. Die Häfen brauchen dringend Korn, während Kronhall tief in der Kreide bei Meister Orrin Kupferbarts Bankiers steht.
2. **Verhandlung in der Königshalle** (Kronhall): In Kronhall verhandelst du mit Kronprinzessin Astrid und Kanzler Ulf Grau über die Kronschuld. Jarl Ragnvald droht mit Abzug seiner Banner, falls die Krone den Häfen nachgibt.
3. **Kornwagen an die Küste** (Skerheim / Salzwacht): Sicherung der Kornlieferungen über Grenzstraße S11 nach Skerheim und S57 in die Werften von Salzwacht.

- Wahl: Hälfte der Schuld erlassen gegen feste Korn- und Holzquoten → Dauerhafte Kornversorgung; friedlicher Bund mit Astrid.
- Wahl: Volle Kronschuld eintreiben & Kronsteuern verpfänden → +100 Silber und +10 Gold, aber Verbitterung im Kronreich.

### Akt 2/3 „Gold und Eisen“ (Stufe 6–10 als erster Zweig, 11–15 als zweiter, Schwester-Zweig Orden der Flamme)
Bernsvik, Wachtfeuer, Brandstein, Glutberg

1. **Zug ins Hochgebirge** (Bernsvik / Wachtfeuer): Über Grenzstraße S47 reist du von Bernsvik nach Wachtfeuer, um mit dem Orden der Flamme über Waffen, Eisen und den Schutz der Nordseewege zu verhandeln.
2. **Schwefel und Schwarzpulver** (Wachtfeuer / Lichtheim / Brandstein): Von Wachtfeuer reist du über S43 nach Lichtheim und über S28 weiter nach Brandstein. Dort verhandelst du über Schwefellieferungen für die Schiffskanonen von Admiral Knut Salzhand, während Erzpriester Thorvald misstrauisch deine Schritte beobachtet.
   > Änderung Henry (18. 11. 2026): Weg über Lichtheim (S43, S28).
3. **Der Pakt am Gipfel** (Thorvaldsklipp / Glutberg): Über S30 nach Thorvaldsklipp und S38 hinauf zum Glutberg. Am Gipfel schließt du mit Hochmeisterin Ragna Glutherz und Seherin Freydis den Pakt über gemeinsame Kreuzzugs- und Handelsflotten.
   > Änderung Henry (18. 11. 2026): Weg über Thorvaldsklipp (S30, S38).

- Wahl: Gold und Schiffe gegen Ordens-Eskorten stellen (80 Silber) → Schwere Ordenspaladine begleiten die Handelsflotte; +10 Gold.
- Wahl: Handelsmonopol auf alle Nachschubwege des Ordens erzwingen → +120 Silber, aber geringere Moral bei den Ordenskriegern.

### Akt 4 „Das Alte Reich & Der Bleiche Skalde“ (Stufe 16–18)
Kronhall / Glutberg, Kronhall, Salzwacht / Perlvik · enthält Volksquest: Das Alte Reich

1. **Entlarvung des Bleichen Skalden** (Kronhall / Glutberg): Durch abgefangene Handelsbriefe und Hinweise von Seherin Freydis wird der Drahtzieher hinter dem Knochenschmuggel entlarvt: Erzpriester Thorvald vom Glutberg ist der Bleiche Skalde. Über hundert Jahre hält ihn die Totenmagie des Nordens am Leben; als Preis dafür schwächt er die Ewige Flamme, damit die Untoten im hohen Norden erstarken. Du stellst ihn zum Kampf (Untoten-Bedrohung -15).
2. **Das Große Thing** (Kronhall): Thingsprecherin Solveig Valsdottir, Kronprinzessin Astrid und Hochmeisterin Ragna Glutherz besiegeln die Vereinigung der drei Menschenfraktionen; du steigst zum Bannerjarl auf.
3. **Die Flotte gen Norden** (Salzwacht / Perlvik): Admiral Knut Salzhand rüstet in Salzwacht und Perlvik die größte Armada der Menschen für die Überfahrt.

### Akt 5 „Über das Innere Meer“ (Stufe 19–20)
Perlvik (Kriegsrat) -> Starthafen der Route -> frei wählbarer Kontinent

> Änderung Henry (18. 11. 2026): Bei Gemini „Die Flotte gen Norden“. Das Ziel ist frei wählbar, darum heißt der Akt wie bei Kronreich und Orden.

1. **Kriegsrat und Auslaufen der Armada** (Perlvik): Im Haupthafen Perlvik tagt der letzte Kriegsrat der vereinten Menschen. Hier wählst du das Ziel der Armada: die Elfen im Osten, die Orks im Südwesten oder die Zwerge im Südosten, jeweils als Bündnis oder um sie zu unterwerfen, oder als extrem schweren Weg die Untoten im hohen Norden. Danach verlegt die Flotte in den Starthafen ihrer Route und läuft dort aus: Zollholm für die Elfen (M53) und die Zwerge (M52, M55, M57), Westvik oder Sandvik für die Orks (M09, M06, M02, M05), Tranvik (M50, M51) oder Nordwacht (M13) für die Untoten.
   > Änderung Henry (18. 11. 2026): Kriegsrat mit Zielwahl im Haupthafen, Abfahrt aus dem echten Starthafen der Route.
2. **Kanonendonner im Nebel** (Inneres Meer): Abwehr eines Angriffs untoter Kriegsschiffe auf hoher See durch die Breitseiten der Bundesflotte.
3. **Der Brückenkopf** (Fremde Küste (frei wählbarer Kontinent)): Landung an der gewählten Küste (Elfen im Osten, Orks im Südwesten, Zwerge im Südosten als Bündnis oder Unterwerfung – oder der extrem schwere Sturm auf den Kontinent der Untoten im hohen Norden). Ende Kapitel 1.

### Akt 5: Ziele und Starthäfen der Armada

| Ziel | Wahl | Starthafen und Seeweg |
| --- | --- | --- |
| Elfen | Bündnis oder Unterwerfung | Zollholm: M53 Laubmarkt – Zollholm |
| Zwerge | Bündnis oder Unterwerfung | Zollholm: M52 Erzhafen – Zollholm, M55 Salzbucht – Zollholm, M57 Westhort – Zollholm |
| Orks | Bündnis oder Unterwerfung | Westvik: M09 Westvik – Zhar-Kesh, M06 Westvik – Rostbucht; Sandvik: M02 Sandvik – Rostbucht, M05 Sandvik – Zhar-Kesh |
| Untote (extrem schwer) | Vernichtung | Tranvik: M50 Draugrsund – Tranvik, M51 Totenwacht – Tranvik; Nordwacht: M13 Nordwacht – Draugrsund |

### Fraktions-Spezialisierung (Nach Abschluss beider Schwester-Zweige, zusätzlich zur Spezialisierung der Klasse)
- **Schwarzpulver-Armada**: Verstärkte Fernkampf- und Kanonenangriffe, höherer Schaden gegen Schiffe und Befestigungen.
- **Goldene Gilde**: +25% Silber aus Handel und Beute, günstigere Söldner und geringere Reisekosten.

### Begleiter (höchstens 3)

| Name | Rolle | Klasse | Ort, Akt | Auftrag | Fähigkeit |
| --- | --- | --- | --- | --- | --- |
| Karen Salzklinge | Seeschütze / Fernkampf | spaeher | Perlvik, Akt 1 | perlvik_q10 | Harpunensalve der Wellenmutter |
| Sören Nebeltritt | Schattenklinge / Kundschafter | schurke | Nebelvik, Akt 1 | nebelvik_q10 | Dolchstoß im Hafenrauch |
| Halvor Eisentau | Zollhauptmann / Frontkämpfer | waechter | Salzwacht, Akt 1 | salzwacht_q10 | Enterhaken & Schildwall |

## Gruppen-Relikte (Henry, 18. 11. 2026)

| Relikt | Art | Auftrag | Wirkung (Name) | Im Spiel | Verkauf |
| --- | --- | --- | --- | --- | --- |
| Runenkompass | Rune | ankerfjord_q04 | Seefahrer-Weisung | Gefahr auf Seewegen −15 %; Wahrnehmung +1 auf Proben unterwegs und beim Erkennen von Hinterhalten | 40 Silber |
| Runenwaage | Rune | silberholm_q04 | Gerechtes Gewicht | Verkauf +15 %, Einkauf −5 % | 50 Silber |
| Runen-Amulett | Rune | grenzmarkt_q04 | Schild der Alten Runen | Rüstung der ganzen Gruppe +2; Moral +1 wirkt erst, wenn es Moral gibt | 45 Silber |
| Runen-Fokus | Rune | aschenkloster_q07 | Brennende Runenkraft | Glut- und Zauberschaden +2 (Held und zaubernde Begleiter); Schaden gegen Untote +15 % | 45 Silber |
| Glutlaterne | Glut | nebelvik_q04 | Licht der Ewigen Glut | Feuerschaden der Gruppe +2; Schutz vor nächtlichen Hinterhalten wirkt erst, wenn es Tag und Nacht gibt | 55 Silber |
| Glutstein-Amulett | Glut | glutberg_q08 | Herz des Glutbergs | Feuerangriffe −4 Schaden, Kälteangriffe −25 % (Gegner mit Feuer: Glutwurm, Glutkäfer, Irrglut; mit Kälte: Frostbär, Eishauer, Schneeschleicher, Skarn) | 50 Silber |

## Nebenquests

### Perlvik (hauptstadt, Stufe 1-5 für Häfen-Helden)
- **Die Perlenfischer von Perlstrand** (Fraktion): Schütze die Taucher von Perlstrand (D49) vor Riffhaien und Perlendieben. Lohn: 35 Silber, +7 Gold. Gegner: Riffhaie. Wege: D49 Perlvik – Perlstrand.
- **Frischer Fisch und Gemüse für das Thing** (Dorf-Verbindung): Eskortiere Vorratswagen aus Fischerholm (D47) und Gartenby (D48) nach Perlvik, nachdem Wegelagerer die Straßen unsicher machen. Lohn: 25 Silber, +6 Gold. Gegner: Wegelagerer. Wege: D47 Perlvik – Fischerholm, D48 Perlvik – Gartenby.
- **Die Kronschuld-Kontore** (Kaltfrieden (Kronreich)): Gesandte aus dem Kronreich versuchen, im Kontor von Meister Orrin Kupferbart Schuldscheine zu stehlen. Lohn: 45 Silber, Kaltfrieden-Lore. Gegner: Spione. Wege: S53 Grenzmarkt – Perlvik.
- **Der verbotene Prediger am Außenkai** (Kaltfrieden (Orden)): Ein Ordenspriester wirkt am Hafen ein Glutgebet – auf Schiffen der Häfen gilt Magie als Unglück! Schlichte den Streit zwischen Matrosen und Pilgern. Lohn: 35 Silber (oder +6 Gold).
- **Knochenfracht aus Draugrsund** (Kult-Spur): Acht reiche Kaufleute des Kults der Bleichen Ewigkeit schmuggeln über Seeweg M39 verbotene Totenreliquien aus Draugrsund in ein Lagerhaus. Lohn: Untoten-Bedrohung -4, 50 Silber. Gegner: Kultisten. Wege: M39 Draugrsund – Perlvik.
- **Die Sternwarte und der Mutterberg** (Weltkonflikt (Zwerge/Orks)): In der großen Sternwarte von Perlvik berechnen Gelehrte die Aschewolken aus dem Süden und erklären, warum der Ausbruch des Mutterbergs Zwerge und Orks in den Krieg treibt. Lohn: 30 Silber, Welt-Lore.
- **Die gefangenen Aethari-Schriften** (Weltkonflikt (Elfen)): Entziffere nach dem Prolog die geborgenen Aethari-Schriften aus dem Norden – sie erklären, warum die Elfen ihre Wälder vor dem Weltenbaum abschotten. Lohn: 35 Silber, Welt-Lore (Elfen).
- **Hafenratten-Plage nach dem Brand** (Nacht des Erwachens): In den Ruinen des abgebrannten Gildenhauses haben sich riesige Hafenratten eingenistet und verbreiten Krankheiten. Lohn: 25 Silber, 2x Gegenmittel (Wert je 12 Silber). Gegner: Hafenratten.
- **Verschlüsselte Botschaft an der Börse** (Intrige): Ein Bote hinterlässt an der Börse eine Nachricht mit einer schwarzen Feder (Spur der Stillen Feder, ohne Auflösung), die vor einem Überfall auf S56 warnt. Lohn: 40 Silber, Intrigen-Lore. Gegner: Schmuggler. Wege: S56 Perlvik – Salzwacht.
- **Die letzte Harpune von Perlvik** (Begleiter (1/3)): Hilf der Seeschützin Karen Salzklinge, ihr von Kult-Reedern beschlagnahmtes Kaperschiff am Außenkai zurückzuerobern. Lohn: Begleiterin: Karen Salzklinge (1/3). Gegner: Kultisten, Schmuggler. Wege: M40 Perlvik – Silberholm.

### Perlstrand (Dorf, D49, Perlen, Stufe 1-5 für Häfen-Helden)
- **Wrackkrabben in der Lagune** (Dorfauftrag): Vertreibe riesige Wrackkrabben von den Perlenbänken. Lohn: 30 Silber, Perlenkette. Gegner: Wrackkrabben. Wege: D49 Perlvik – Perlstrand.

### Fischerholm (Dorf, D47, Fisch, Stufe 1-5 für Häfen-Helden)
- **Die gestohlenen Netze** (Dorfauftrag): Stelle Schmuggler, die den Fischern ihre Boote für Nachtfahrten stehlen. Lohn: 20 Silber, +5 Gold. Gegner: Schmuggler. Wege: D47 Perlvik – Fischerholm.

### Gartenby (Dorf, D48, Gemüse, Stufe 1-5 für Häfen-Helden)
- **Asche auf den Beeten** (Dorfauftrag): Hilf den Bauern, die Ernte vor dem Ascheregen zu retten und Galgenkrähen zu vertreiben. Lohn: 20 Silber, +4 Gold. Gegner: Galgenkrähen. Wege: D48 Perlvik – Gartenby.

### Silberholm (hafenstadt, Stufe 1-5 für Häfen-Helden)
- **Der Silberzug aus der Grube** (Fraktion): Eskortiere die schwer beladenen Silberwagen aus Silbergrube über D63 in die Münzstätte von Silberholm. Lohn: 40 Silber, +8 Gold. Gegner: Wegelagerer. Wege: D63 Silberholm – Silbergrube.
- **Korn aus dem Inselhof** (Dorf-Verbindung): Schütze die seltenen Kornfelder auf der Halbinsel bei Inselhof (D62) vor Galgenkrähen und Plünderern. Lohn: 25 Silber, +6 Gold. Gegner: Galgenkrähen. Wege: D62 Silberholm – Inselhof.
- **Falsche Kronmünzen** (Kaltfrieden (Kronreich)): Falschmünzer prägen minderwertige Kronreich-Silbermünzen, um den Handel auf S51 nach Bernsvik zu stören. Lohn: 45 Silber, Kaltfrieden-Lore. Gegner: Schmuggler. Wege: S51 Bernsvik – Silberholm.
- **Die Runenwaage der Bankiers** (Kaltfrieden (Orden)): Meister Orrin Kupferbarts Bankiers prüfen eine aus dem Ordensland stammende Runenwaage – doch Seeleute fordern ihre Verbrennung. Lohn: 35 Silber, Runenwaage (tragbar). Wege: M48 Silberholm – Tranvik. *Gruppen-Relikt (Henry, 18. 11. 2026): Runenwaage stärkt als einziges aktives Relikt die ganze Gruppe (Gerechtes Gewicht). Nutzbar für Kronreich, Freie Häfen, Orden der Flamme; alle anderen verkaufen es für 50 Silber.*
- **Silber für Totenwacht** (Kult-Spur): Neun reiche Kultisten der Bleichen Ewigkeit wollen gestohlenes Silber aus D63 über die Seewege M45 (Draugrsund) und M47 (Totenwacht) nach Norden verschiffen. Lohn: Untoten-Bedrohung -4, 60 Silber. Gegner: Kultisten. Wege: D63 Silberholm – Silbergrube, M45 Draugrsund – Silberholm, M47 Silberholm – Totenwacht.
- **Das Zwergenerbe in der Grube** (Weltkonflikt (Zwerge)): Im tiefsten Stollen von Silbergrube (D63) stößt du auf uralte Zwergen-Stützpfeiler und erfährst, wie die Zwerge einst den Menschen den Bergbau beibrachten. Lohn: 30 Silber, Welt-Lore (Zwerge). Wege: D63 Silberholm – Silbergrube.
- **Sturmrochen vor der Halbinsel** (Bestiarium): Ein Schwarm Sturmrochen greift Handelsschiffe auf dem kurzen Seeweg M40 nach Perlvik an. Lohn: 45 Silber, Sturmrochen-Speer. Gegner: Sturmrochen. Wege: M40 Perlvik – Silberholm.
- **Eingestürzter Stollen nach dem Beben** (Nacht des Erwachens): Nach dem Erdbeben in der Nacht des Erwachens sind Bergleute in Silbergrube eingeschlossen und werden von Hafenratten bedrängt. Lohn: 30 Silber, +6 Gold. Gegner: Hafenratten. Wege: D63 Silberholm – Silbergrube.
- **Die verschlüsselte Frachtliste** (Intrige): Auf der kurzen Küstenstraße S55 nach Nebelvik fängst du einen Schmuggler mit geheimen Kontobüchern ab. Lohn: 40 Silber, Intrigen-Lore. Gegner: Schmuggler. Wege: S55 Nebelvik – Silberholm.
- **Die Münzpresse der Bundesflotte** (Gewichtig): Sichere und erweitere die Silbergrube und Münzstätte von Silberholm, um die Kriegskasse für Akt 4 und Akt 5 zu füllen. Lohn: +15 Gold; dauerhaft +10% Silber aus Handelsgeschäften. Gegner: Wegelagerer, Kultisten. Wege: D63 Silberholm – Silbergrube, M40 Perlvik – Silberholm.

### Silbergrube (Dorf, D63, Silber, Stufe 1-5 für Häfen-Helden)
- **Die verschwundene Silberader** (Dorfauftrag): Vertreibe Deserteure, die einen heimlichen Seitenschacht ausbeuten. Lohn: 35 Silber, Silberring. Gegner: Deserteure. Wege: D63 Silberholm – Silbergrube.

### Inselhof (Dorf, D62, Korn, Stufe 1-5 für Häfen-Helden)
- **Salzwind auf den Halmen** (Dorfauftrag): Hilf den Bauern, Windschutzwälle gegen Asche und Sturm zu errichten. Lohn: 20 Silber, +5 Gold. Gegner: Galgenkrähen. Wege: D62 Silberholm – Inselhof.

### Skerheim (hafenstadt, Stufe 1-5 für Häfen-Helden)
- **Tran von den Schären** (Fraktion): Schütze die Robbenjäger von Robbenschär (D65) vor Strandräubern. Lohn: 25 Silber, +7 Gold. Gegner: Wegelagerer. Wege: D65 Skerheim – Robbenschär.
- **Wolle aus Klippenhof** (Dorf-Verbindung): Eskortiere Wollkarren aus Klippenhof (D64) sicher nach Skerheim. Lohn: 25 Silber, +5 Gold. Gegner: Galgenkrähen. Wege: D64 Skerheim – Klippenhof.
- **Kornzoll an der Südstraße** (Kaltfrieden (Kronreich)): Auf der Grenzstraße S11 nach Haraldstad verlangen Kronreich-Vögte höhere Zölle für Kornwagen. Verhandle einen Kompromiss. Lohn: 40 Silber (oder +7 Gold). Wege: S11 Haraldstad – Skerheim.
- **Der Überfall der Rostsegel** (Weltkonflikt (Orks)): Orkpiraten der Staubreiter aus Rostbucht (M49) plündern Handelsschiffe vor den Schären. Ein gefangener Steuermann berichtet von der großen Dürre im Südwesten. Lohn: Ork-Bedrohung -3, 45 Silber, Welt-Lore (Orks). Gegner: Orkpiraten. Wege: M49 Rostbucht – Skerheim.
- **Schmuggel mit dem Feind** (Kult-Spur): Sieben Kultisten der Bleichen Ewigkeit verkaufen in den Schären heimlich Waffen an die Rostsegel (M49), um den Krieg an der Südküste anzuheizen. Lohn: Untoten-Bedrohung -3, Ork-Bedrohung -2, 50 Silber. Gegner: Kultisten. Wege: M49 Rostbucht – Skerheim, M03 Sandvik – Skerheim.
- **Geleitschutz nach Sandvik** (Kaltfrieden (Kronreich)): Eskortiere ein neutrales Handelsschiff auf dem sehr langen Seeweg M03 nach Sandvik, trotz des Kaltfriedens. Lohn: 50 Silber, Kaltfrieden-Lore. Gegner: Orkpiraten. Wege: M03 Sandvik – Skerheim.
- **Riffhaie in den Schären** (Bestiarium): Ein Rudel Riffhaie bedroht die Fischerboote auf dem Seeweg M41 nach Perlvik. Lohn: 40 Silber, Haizahn-Harpune. Gegner: Riffhaie. Wege: M41 Perlvik – Skerheim. *Gemini schrieb „Haizahn-Harpoon“. Im Spiel heißt der Lohn Haizahn-Harpune.*
- **Ascheregen auf den Robbenbänken** (Nacht des Erwachens): Schwarze Asche vertreibt die Tiere und lockt Wrackkrabben an die Strände von Robbenschär. Lohn: 25 Silber, +5 Gold. Gegner: Wrackkrabben. Wege: D65 Skerheim – Robbenschär.
- **Die verloren gegangene Fracht auf S54** (Intrige): Suche einen überfallenen Handelszug auf der Straße S54 nach Grenzmarkt. Lohn: 35 Silber, +5 Gold. Gegner: Wegelagerer. Wege: S54 Grenzmarkt – Skerheim.
- **Die Schären-Wacht von Skerheim** (Gewichtig): Errichte befestigte Signalposten auf den äußeren Schären von Skerheim, um die Südküste vor Überfällen aus Rostbucht (M49) zu warnen. Lohn: Ork-Bedrohung -4; sicherer Seehandel im Süden. Gegner: Orkpiraten. Wege: M49 Rostbucht – Skerheim, M03 Sandvik – Skerheim.

### Robbenschär (Dorf, D65, Tran, Stufe 1-5 für Häfen-Helden)
- **Die gestohlenen Tranfässer** (Dorfauftrag): Verfolge Schmuggler durch die Schären. Lohn: 25 Silber, +5 Gold. Gegner: Schmuggler. Wege: D65 Skerheim – Robbenschär.

### Klippenhof (Dorf, D64, Schafe, Stufe 1-5 für Häfen-Helden)
- **Wölfe an der Steilküste** (Dorfauftrag): Schütze die Schafherden vor Grauwölfen. Lohn: 20 Silber, Wollmantel. Gegner: Grauwölfe. Wege: D64 Skerheim – Klippenhof.

### Tranvik (hafenstadt, Stufe 1-5 für Häfen-Helden)
- **Waltran für die Leuchtfeuer** (Fraktion): Sichere den Trantransport aus Walby über D67 für die Häfen der Nordostküste. Lohn: 30 Silber, +7 Gold. Gegner: Wegelagerer. Wege: D67 Tranvik – Walby.
- **Die Räuchereien von Räucherby** (Dorf-Verbindung): Verteidige die Fischvorräte von Räucherby (D66) gegen Deserteure. Lohn: 25 Silber, +5 Gold. Gegner: Deserteure. Wege: D66 Tranvik – Räucherby.
- **Holz und Fisch an der Ordensgrenze** (Kaltfrieden (Orden)): Auf der kurzen Grenzstraße S34 nach Flammenhof tauschen Händler Fisch gegen Feuerholz – doch harte Ordenswächter misstrauen den Seeleuten. Lohn: 35 Silber (oder +6 Gold & Kaltfrieden-Lore). Wege: S34 Flammenhof – Tranvik.
- **Die schmale Meerenge nach Draugrsund** (Weltkonflikt (Untote)): Tranvik liegt auf dem kürzesten Seeweg M50 direkt gegenüber von Draugrsund. Ein alter Walfänger erzählt von der Langen Nacht und dem Erwachen der Toten im Norden. Lohn: 30 Silber, Welt-Lore (Untote). Wege: M50 Draugrsund – Tranvik.
- **Der Knochenfährmann** (Kult-Spur): Acht Kultisten der Bleichen Ewigkeit schmuggeln nachts auf dem kurzen Seeweg M50 nach Draugrsund und M51 nach Totenwacht Reliquien und Gefangene. Lohn: Untoten-Bedrohung -4, 55 Silber. Gegner: Kultisten. Wege: M50 Draugrsund – Tranvik, M51 Totenwacht – Tranvik.
- **Elfenwrack im Nordoststrom** (Weltkonflikt (Elfen)): Ein Walfänger birgt auf dem Seeweg M38 ein beschädigtes Elfenboot mit einer Warnung vor der Ausbreitung der Fäulnis. Lohn: 25 Silber, Welt-Lore (Elfen). Wege: M38 Nebelvik – Tranvik.
- **Tiefenkrake vor Tranvik** (Bestiarium): Eine Tiefenkrake greift Walfängerboote und Handelsschiffe auf dem Seeweg M48 nach Silberholm an. Lohn: 55 Silber, Harpunen-Speer. Gegner: Tiefenkrake. Wege: M48 Silberholm – Tranvik.
- **Aschenschlick im Walfanghafen** (Nacht des Erwachens): Vulkanasche verstopft die Hafenbecken; hilf beim Reinigen und bekämpfe Hafenratten. Lohn: 25 Silber, +5 Gold. Gegner: Hafenratten. Wege: D67 Tranvik – Walby.
- **Notruf aus Nordwacht** (Kaltfrieden (Orden)): Bringe dringend benötigten Waltran über den sehr langen Seeweg M14 in die nördliche Ordensfestung Nordwacht. Lohn: 50 Silber, +6 Gold. Gegner: Sturmrochen. Wege: M14 Nordwacht – Tranvik.
- **Die Feuerkette von Tranvik** (Gewichtig): Errichte schwimmende Tran-Feuerschalen vor dem Hafen von Tranvik, um die gefährlichen Seewege M50 (Draugrsund) und M51 (Totenwacht) abzuriegeln. Lohn: Untoten-Bedrohung -4; Schutz der Nordostküste in Akt 4 & 5. Gegner: Kultisten. Wege: M50 Draugrsund – Tranvik, M51 Totenwacht – Tranvik.

### Walby (Dorf, D67, Tran, Stufe 1-5 für Häfen-Helden)
- **Die gestrandeten Trankessel** (Dorfauftrag): Schütze die Tranbrenner vor Galgenkrähen und Plünderern. Lohn: 20 Silber, +5 Gold. Gegner: Galgenkrähen. Wege: D67 Tranvik – Walby.

### Räucherby (Dorf, D66, Fisch, Stufe 1-5 für Häfen-Helden)
- **Salz und Rauch** (Dorfauftrag): Vertreibe Wrackkrabben, die in die Räucherhütten eindringen. Lohn: 20 Silber, +4 Gold. Gegner: Wrackkrabben. Wege: D66 Tranvik – Räucherby.

### Zollholm (hafenstadt, Stufe 1-5 für Häfen-Helden)
- **Zollkontrolle in der Meerenge** (Fraktion): Unterstütze die Hafenwache von Zollholm dabei, zollflüchtige Schiffe auf dem Seeweg M31 Richtung Möwenstad abzufangen. Lohn: 35 Silber, +8 Gold. Gegner: Schmuggler. Wege: M31 Möwenstad – Zollholm.
- **Fisch und Eier für die Inselgarnison** (Dorf-Verbindung): Sichere die Lieferungen aus Leuchtholm (D69) und Kliffby (D68) für die Festung Zollholm. Lohn: 25 Silber, +6 Gold. Gegner: Galgenkrähen. Wege: D69 Zollholm – Leuchtholm, D68 Zollholm – Kliffby.
- **Das verschwundene Beiboot** (Intrige): Knüpft an den Prolog an: Suche nach dem vermissten Seesoldaten in den Lagunen von Zollholm und finde geheime Hinweise (Spur der Stillen Feder, Identität bleibt geheim). Lohn: 40 Silber, Intrigen-Lore. Gegner: Schmuggler. Wege: D69 Zollholm – Leuchtholm.
- **Der Elfenhändler von Laubmarkt** (Weltkonflikt (Elfen)): Ein elbisches Handelsschiff aus Laubmarkt (M53) legt am Außenkai an. Der Kapitän erklärt, warum die Hüter des Weltenbaums den Menschen misstrauen, aber den gemeinsamen Feind im Norden fürchten. Lohn: 35 Silber, Welt-Lore (Elfen). Wege: M53 Laubmarkt – Zollholm.
- **Die Zwergen-Galeone aus Erzhafen** (Weltkonflikt (Zwerge)): Ein schwer gepanzertes Zwergenschiff aus Erzhafen (M52) oder Westhort (M57) zahlt Zoll in reinem Eisen und berichtet vom Aufbruch des Mutterbergs im Süden. Lohn: 40 Silber, Welt-Lore (Zwerge). Wege: M52 Erzhafen – Zollholm, M57 Westhort – Zollholm.
- **Verbotene Fracht aus Rubinhafen** (Kult-Spur): Sieben Kultisten der Bleichen Ewigkeit versuchen, unkontrolliert Schiffe über M54 (Rubinhafen) und M56 (Schattmund) durch die Zollinseln zu schleusen. Lohn: Untoten-Bedrohung -4, 55 Silber. Gegner: Kultisten. Wege: M54 Rubinhafen – Zollholm, M56 Schattmund – Zollholm.
- **Salzhandelsstreit auf M55** (Weltkonflikt (Zwerge)): Ein Kapitän aus der Zwergenstadt Salzbucht (M55) streitet mit den Zöllnern über die Zollhöhe für Bergsalz. Lohn: 35 Silber (oder +7 Gold). Wege: M55 Salzbucht – Zollholm.
- **Riffhaie an den Korallenriffen** (Bestiarium): Aggressive Riffhaie greifen Beiboote rund um Leuchtholm (D69) an. Lohn: 40 Silber, Haizahn-Klinge. Gegner: Riffhaie. Wege: D69 Zollholm – Leuchtholm.
- **Aschenwolken über dem Leuchtturm** (Nacht des Erwachens): Reinige die Linsen des Hauptleuchtturms von Vulkanasche und vertreibe Hafenratten aus den Vorratskellern. Lohn: 25 Silber, +5 Gold. Gegner: Hafenratten. Wege: D69 Zollholm – Leuchtholm.
- **Alphatier: Die Schwarze Krake** (Alphatier-Jagd): In den tiefen Gewässern rund um die Zollinseln lauert die Schwarze Krake, der größte Tiefenkrake des Inneren Meeres, und zieht ganze Zollkutter in die Tiefe. Lohn: 65 Silber, Trophäe der Schwarzen Krake. Gegner: Die Schwarze Krake. Wege: M31 Möwenstad – Zollholm, M53 Laubmarkt – Zollholm. *Änderung Henry (18. 11. 2026): Bei Gemini „Mutter Tiefe“. Umbenannt in „Die Schwarze Krake“, damit sie nicht mit der Mutter der Tiefen aus dem Ordensland verwechselt wird.*

### Leuchtholm (Dorf, D69, Fisch, Stufe 1-5 für Häfen-Helden)
- **Das gestohlene Leuchtfeuer-Öl** (Dorfauftrag): Fange Schmuggler ab, die das Lampenöl des Inselturms stehlen wollen. Lohn: 25 Silber, +5 Gold. Gegner: Schmuggler. Wege: D69 Zollholm – Leuchtholm.

### Kliffby (Dorf, D68, Eier, Stufe 1-5 für Häfen-Helden)
- **Eierdiebe an den Steilklippen** (Dorfauftrag): Vertreibe Galgenkrähen und Plünderer von den Brutplätzen. Lohn: 20 Silber, +5 Gold. Gegner: Galgenkrähen. Wege: D68 Zollholm – Kliffby.

### Ankerfjord (hafenstadt, Stufe 1-5 für Häfen-Helden)
- **Tauwerk für die Bundesflotte** (Fraktion): Sichere den Transport von Schiffstauen aus Seilerby über D51 für die Werften von Ankerfjord. Lohn: 25 Silber, +7 Gold. Gegner: Wegelagerer. Wege: D51 Ankerfjord – Seilerby.
- **Räucherfisch aus Fjordhof** (Dorf-Verbindung): Schütze die Fischer von Fjordhof (D50) vor plündernden Deserteuren. Lohn: 25 Silber, +5 Gold. Gegner: Deserteure. Wege: D50 Ankerfjord – Fjordhof.
- **Der verlorene Kornhändler** (Kaltfrieden (Kronreich)): Ein Kaufmann aus dem Kronreich bietet über Mittelsmänner Korn gegen Schiffstaue an – ein Verstoß gegen das Handelsembargo. Lohn: 40 Silber (oder +7 Gold). Wege: S49 Ankerfjord – Silberholm.
- **Der Runenkompass** (Kaltfrieden (Orden)): Ein Kapitän hat einen zwergisch-ordentlichen Runenkompass an Bord, doch die Mannschaft droht wegen des Magie-Aberglaubens mit Meuterei. Lohn: 35 Silber, Runenkompass (tragbar). Wege: M22 Ankerfjord – Tranvik. *Gruppen-Relikt (Henry, 18. 11. 2026): Runenkompass stärkt als einziges aktives Relikt die ganze Gruppe (Seefahrer-Weisung). Nutzbar für Kronreich, Freie Häfen, Orden der Flamme; alle anderen verkaufen es für 40 Silber.*
- **Schmuggel nach Schattmund** (Kult-Spur): Sieben Kultisten der Bleichen Ewigkeit verladen über den sehr langen Seeweg M20 Gold und Reliquien für die Erinnernden im Land der Untoten. Lohn: Untoten-Bedrohung -4, 50 Silber. Gegner: Kultisten. Wege: M20 Ankerfjord – Schattmund.
- **Die Stimme aus Draugrsund** (Weltkonflikt (Untote)): Ein verstörter Kapitän, der auf der Route M16 einem Geisterschiff entkam, berichtet von der Langen Nacht im hohen Norden. Lohn: 25 Silber, Welt-Lore (Untote). Wege: M16 Ankerfjord – Draugrsund.
- **Riffhaie in der Fjordmündung** (Bestiarium): Aggressive Riffhaie greifen Fischerboote an der Einfahrt nach Nebelvik (S48) an. Lohn: 40 Silber, Haizahn-Entermesser. Gegner: Riffhaie. Wege: S48 Ankerfjord – Nebelvik.
- **Aschenschlick im Hafen** (Nacht des Erwachens): Ascheregen verklebt die Seilwinden der Seilerei; hilf bei der Reinigung und bekämpfe Hafenratten. Lohn: 25 Silber, +5 Gold. Gegner: Hafenratten. Wege: D51 Ankerfjord – Seilerby.
- **Das Wrack von M17** (Lore): Birg auf dem Seeweg M17 Richtung Möwenstad das Logbuch eines verschollenen Handelsschiffs. Lohn: 45 Silber, Seekarte. Gegner: Wrackkrabben. Wege: M17 Ankerfjord – Möwenstad.
- **Die Sperrkette von Ankerfjord** (Gewichtig): Schmiede mit den Seilern und Schmieden von Ankerfjord eine schwere Hafenkette über die Fjordmündung, um Überfälle aus M16 und M20 abzuwehren. Lohn: Untoten-Bedrohung -3; Ankerfjord ist vor Seeüberfällen geschützt. Gegner: Schmuggler. Wege: M16 Ankerfjord – Draugrsund, M20 Ankerfjord – Schattmund.

### Seilerby (Dorf, D51, Tauwerk, Stufe 1-5 für Häfen-Helden)
- **Salzkraut für die Taue** (Dorfauftrag): Sammle Salzkraut an den Klippen zum Imprägnieren der Schiffstaue und wehre Galgenkrähen ab. Lohn: 20 Silber, +5 Gold. Gegner: Galgenkrähen. Wege: D51 Ankerfjord – Seilerby.

### Fjordhof (Dorf, D50, Fisch, Stufe 1-5 für Häfen-Helden)
- **Die verschwundenen Reusen** (Dorfauftrag): Vertreibe Wrackkrabben, die die Fischreusen zerstören. Lohn: 20 Silber, +4 Gold. Gegner: Wrackkrabben. Wege: D50 Ankerfjord – Fjordhof.

### Bernsvik (hafenstadt, Stufe 1-5 für Häfen-Helden)
- **Der Bernstein von Bernsteinstrand** (Fraktion): Schütze die Bernsteinsammler auf D52 vor Strandräubern und Schmugglerbanden. Lohn: 35 Silber, +7 Gold. Gegner: Wegelagerer. Wege: D52 Bernsvik – Bernsteinstrand.
- **Tang für die Salzkocher** (Dorf-Verbindung): Eskortiere Tangwagen aus Tangby (D53) sicher nach Bernsvik. Lohn: 20 Silber, +5 Gold. Gegner: Galgenkrähen. Wege: D53 Bernsvik – Tangby.
- **Zollstreit an der Wachtfeuer-Straße** (Kaltfrieden (Orden)): Auf der Grenzstraße S47 nach Wachtfeuer verlangen Ordensritter eine Durchsuchung aller Bernsteinwagen nach verbotenen Toten-Reliquien. Lohn: 35 Silber, Kaltfrieden-Lore. Wege: S47 Wachtfeuer – Bernsvik.
- **Der gesuchte Adlige aus Kronhall** (Kaltfrieden (Kronreich)): Ein geflohener Kronreich-Adliger will sich auf einem Schiff nach Süden (M25) absetzen – gegen 50 Silber Schweigegeld. Lohn: 50 Silber (oder +7 Gold bei Auslieferung). Wege: M25 Bernsvik – Perlvik.
- **Der Totenhandel von Draugrsund** (Kult-Spur): Neun reiche Kaufleute des Kults der Bleichen Ewigkeit betreiben über M23 und M27 einen geheimen Handel mit Reliquien aus Draugrsund und Totenwacht. Lohn: Untoten-Bedrohung -4, 55 Silber. Gegner: Kultisten. Wege: M23 Bernsvik – Draugrsund, M27 Bernsvik – Totenwacht.
- **Warum die Zwerge Bernstein kaufen** (Weltkonflikt (Zwerge)): Ein Zwergenhändler erklärt, warum seine Sippe im Südosten so viel Bernstein für ihre Runenschmieden braucht, seit die Glut im Mutterberg erwacht ist. Lohn: 30 Silber, Welt-Lore (Zwerge).
- **Sturmrochen vor der Küste** (Bestiarium): Ein Schwarm Sturmrochen greift Handelsschiffe auf dem kurzen Seeweg M24 nach Nebelvik an. Lohn: 45 Silber, Rochenleder-Umhang. Gegner: Sturmrochen. Wege: M24 Bernsvik – Nebelvik.
- **Ascheregen auf den Bernsteinbänken** (Nacht des Erwachens): Schwarze Asche bedeckt die Küste von D52; hilf beim Bergen der verschütteten Bernsteinfunde. Lohn: 30 Silber, +5 Gold. Gegner: Wrackkrabben. Wege: D52 Bernsvik – Bernsteinstrand.
- **Die Geleitschutz-Fahrt nach Nordwacht** (Fraktion): Bringe dringend benötigte Vorräte über den sehr langen Seeweg M12 in die nördliche Ordensfestung Nordwacht. Lohn: 50 Silber, +6 Gold. Gegner: Sturmrochen. Wege: M12 Nordwacht – Bernsvik.
- **Der Leuchtturm von Bernsvik** (Gewichtig): Verstärke den großen Leuchtturm von Bernsvik mit Bernstein-Spiegeln und einer Wachmannschaft, um die gefährlichen Seewege M23 und M27 nach Norden zu überwachen. Lohn: Untoten-Bedrohung -3; Schutz der Nord-Seewege in Akt 3 & 4. Gegner: Kultisten. Wege: M23 Bernsvik – Draugrsund, M27 Bernsvik – Totenwacht.

### Bernsteinstrand (Dorf, D52, Bernstein, Stufe 1-5 für Häfen-Helden)
- **Die gestohlene Bernstein-Truhe** (Dorfauftrag): Verfolge Schmuggler, die den gesamten Monatsfund entwendet haben. Lohn: 30 Silber, Bernstein-Talisman. Gegner: Schmuggler. Wege: D52 Bernsvik – Bernsteinstrand.

### Tangby (Dorf, D53, Tang, Stufe 1-5 für Häfen-Helden)
- **Wrackkrabben in den Tangfeldern** (Dorfauftrag): Räume die Küste von aggressiven Wrackkrabben. Lohn: 20 Silber, +4 Gold. Gegner: Wrackkrabben. Wege: D53 Bernsvik – Tangby.

### Grenzmarkt (stadt, Stufe 1-5 für Häfen-Helden)
- **Maultiere für den Passhandel** (Fraktion): Sichere eine Herde Lastmaultiere aus Passhof über D54 für die Handelszüge im Gebirge. Lohn: 25 Silber, +7 Gold. Gegner: Wegelagerer. Wege: D54 Grenzmarkt – Passhof.
- **Warenlager in Saumby** (Dorf-Verbindung): Verteidige die vollbeladenen Lagerhäuser von Saumby (D55) gegen plündernde Deserteure. Lohn: 30 Silber, +6 Gold. Gegner: Deserteure. Wege: D55 Grenzmarkt – Saumby.
- **Der Streit zwischen Eikmark und Haraldstad** (Kaltfrieden (Kronreich)): Auf den Grenzstraßen S02 (nach Eikmark) und S10 (nach Haraldstad) blockieren Kronreich-Zöllner die Handelskarawanen. Handle einen freien Durchzug aus. Lohn: 45 Silber, Kaltfrieden-Lore. Wege: S02 Eikmark – Grenzmarkt, S10 Haraldstad – Grenzmarkt.
- **Die geweihte Kiste aus Sigrunsheim** (Kaltfrieden (Orden)): Ein Ordensbote aus Sigrunsheim (S45) verlangt geleitete Durchreise für eine Truhe mit Runenrelikten – doch abergläubische Händler wollen die Magie nicht in der Stadt dulden. Lohn: 40 Silber, Runen-Amulett (tragbar). Gegner: Kultisten. Wege: S45 Sigrunsheim – Grenzmarkt. *Gruppen-Relikt (Henry, 18. 11. 2026): Runen-Amulett stärkt als einziges aktives Relikt die ganze Gruppe (Schild der Alten Runen). Nutzbar für Kronreich, Freie Häfen, Orden der Flamme; alle anderen verkaufen es für 45 Silber.*
- **Falsche Münzen, echte Knochen** (Kult-Spur): Acht reiche Kaufleute des Kults der Bleichen Ewigkeit nutzen das Marktgewühl von Grenzmarkt, um Totenreliquien aus dem Norden an Adlige aus dem Kronreich weiterzuverkaufen. Lohn: Untoten-Bedrohung -3, 50 Silber. Gegner: Kultisten. Wege: S02 Eikmark – Grenzmarkt, S53 Grenzmarkt – Perlvik.
- **Warum die Zwerge das Gebirge meiden** (Weltkonflikt (Zwerge)): Ein fahrender Zwergenhändler erzählt am Marktfeuer, wie die Glut des Mutterbergs die tiefen Stollen im Südosten bedroht und die Zwerge gegen die anderen Völker misstrauisch macht. Lohn: 25 Silber, Welt-Lore (Zwerge).
- **Die flüsternde Feder am Schwarzen Brett** (Intrige): Ein unauffälliger Schreiber hinterlässt eine mit einer Feder gesiegelte Warnung vor einem Hinterhalt auf S54 nach Skerheim (Spur der Stillen Feder, Identität bleibt geheim). Lohn: 40 Silber, Intrigen-Lore. Gegner: Wegelagerer. Wege: S54 Grenzmarkt – Skerheim.
- **Galgenkrähen über dem Pass** (Bestiarium): Ein Schwarm Galgenkrähen greift Packtiere auf der Straße S53 nach Perlvik an. Lohn: 30 Silber, Krähenfeder-Mantel. Gegner: Galgenkrähen. Wege: S53 Grenzmarkt – Perlvik.
- **Aschenstaub auf den Handelswegen** (Nacht des Erwachens): Besorge Salzkraut und Heilmittel für erkrankte Karawanenführer nach dem schweren Ascheregen. Lohn: 25 Silber, 2x Heilmittel (Wert je 12 Silber). Gegner: Hafenratten. Wege: D54 Grenzmarkt – Passhof.
- **Der Freihandelsbrief von Grenzmarkt** (Gewichtig): Sichere den neutralen Marktplatz gegen Übergriffe von allen drei Menschenfraktionen, damit Grenzmarkt als dauerhafter Nachschubknoten für Akt 2 und 3 dient. Lohn: +10 Gold; Reisen über Grenzmarkt kosten 1 Vorrat weniger. Gegner: Wegelagerer, Spione. Wege: S02 Eikmark – Grenzmarkt, S10 Haraldstad – Grenzmarkt, S45 Sigrunsheim – Grenzmarkt, S53 Grenzmarkt – Perlvik.

### Passhof (Dorf, D54, Maultiere, Stufe 1-5 für Häfen-Helden)
- **Die entlaufenen Lasttiere** (Dorfauftrag): Fange erschreckte Maultiere nach einem Nachbeben ein und vertreibe Grauwölfe. Lohn: 20 Silber, +5 Gold. Gegner: Grauwölfe. Wege: D54 Grenzmarkt – Passhof.

### Saumby (Dorf, D55, Handelswaren, Stufe 1-5 für Häfen-Helden)
- **Die falschen Zollpapiere** (Dorfauftrag): Überführe Betrüger, die gestohlene Waren aus Bernsvik (S50) umetikettieren. Lohn: 25 Silber, +5 Gold. Gegner: Schmuggler. Wege: D55 Grenzmarkt – Saumby, S50 Bernsvik – Grenzmarkt.

### Möwenstad (hafenstadt, Stufe 1-5 für Häfen-Helden)
- **Salz aus den Inselsalinen** (Fraktion): Schütze die Salzkocher von Salzgarten (D57) vor Strandräubern. Lohn: 25 Silber, +7 Gold. Gegner: Wegelagerer. Wege: D57 Möwenstad – Salzgarten.
- **Die Fischer von Möwenstrand** (Dorf-Verbindung): Vertreibe Wrackkrabben, die die Boote am Möwenstrand (D56) beschädigen. Lohn: 25 Silber, +5 Gold. Gegner: Wrackkrabben. Wege: D56 Möwenstad – Möwenstrand.
- **Der Schiffbrüchige aus Sandvik** (Kaltfrieden (Kronreich)): Rette einen gestrandeten Seemann aus dem Kronreich von einem Korallenriff und erfahre von der Kornnot im Westen. Lohn: 30 Silber, Kronreich-Lore. Gegner: Riffhaie.
- **Pilger auf Irrfahrt** (Kaltfrieden (Orden)): Ein vom Kurs abgekommenes Boot mit Ordensnovizen sucht Wasser und Vorräte auf Möwenstad. Lohn: 35 Silber (oder +6 Gold).
- **Schmuggel nach Rubinhafen und Schattmund** (Kult-Spur): Sieben Kultisten der Bleichen Ewigkeit nutzen die einsame Insel als Zwischenhalt für verbotene Fahrten über M28 und M29 zu den Erinnernden im Land der Untoten. Lohn: Untoten-Bedrohung -4, 55 Silber. Gegner: Kultisten. Wege: M28 Möwenstad – Rubinhafen, M29 Möwenstad – Schattmund.
- **Die Blutsteine von Rubinhafen** (Weltkonflikt (Untote)): Ein alter Inselkapitän zeigt dir einen roten Kristall aus Rubinhafen (M28) und erklärt, warum die Untoten im Norden nach dem Blut und der Lebenswärme der Lebenden dürsten. Lohn: 30 Silber, Welt-Lore (Untote). Wege: M28 Möwenstad – Rubinhafen.
- **Treibgut aus dem Elfenmeer** (Weltkonflikt (Elfen)): An der Ostküste der Insel wird eine geschnitzte Elfen-Boje mit Warnzeichen vor den Untoten-Seewegen M29 und M31 angespült. Lohn: 25 Silber, Welt-Lore (Elfen). Wege: M29 Möwenstad – Schattmund, M31 Möwenstad – Zollholm.
- **Sturmrochen auf der Route nach Zollholm** (Bestiarium): Ein Schwarm Sturmrochen greift Handelsschiffe auf dem Seeweg M31 nach Zollholm an. Lohn: 45 Silber, Rochenleder-Schild. Gegner: Sturmrochen. Wege: M31 Möwenstad – Zollholm.
- **Aschenregen auf den Salzgärten** (Nacht des Erwachens): Vulkanasche verunreinigt die offenen Salzpfannen; hilf beim Reinigen und vertreibe Galgenkrähen. Lohn: 25 Silber, +5 Gold. Gegner: Galgenkrähen. Wege: D57 Möwenstad – Salzgarten.
- **Alphatier: Der Kapitän** (Alphatier-Jagd): In den Wracks südlich von Möwenstad haust Der Kapitän, eine riesige Wrackkrabbe mit einem alten Admiralshut auf dem Panzer. Lohn: 65 Silber, Admiralshut des Kapitäns. Gegner: Der Kapitän. Wege: M31 Möwenstad – Zollholm.

### Möwenstrand (Dorf, D56, Fisch, Stufe 1-5 für Häfen-Helden)
- **Riffhaie in der Bucht** (Dorfauftrag): Erlege zwei Riffhaie, die die Fischerboote am Auslaufen hindern. Lohn: 25 Silber, Haizahn-Dolch. Gegner: Riffhaie. Wege: D56 Möwenstad – Möwenstrand.

### Salzgarten (Dorf, D57, Salz, Stufe 1-5 für Häfen-Helden)
- **Die gestohlenen Salzsäcke** (Dorfauftrag): Stelle Schmuggler, die unverzolltes Salz auf Boote verladen. Lohn: 20 Silber, +5 Gold. Gegner: Schmuggler. Wege: D57 Möwenstad – Salzgarten.

### Nebelvik (hafenstadt, Stufe 1-5 für Häfen-Helden)
- **Fischfang im dichten Nebel** (Fraktion): Eskortiere die Fischer von Nebelstrand (D58) sicher zurück in den Hafen. Lohn: 25 Silber, +6 Gold. Gegner: Riffhaie. Wege: D58 Nebelvik – Nebelstrand.
- **Ordnung in der Schmugglerbucht** (Dorf-Verbindung): In der Schmugglerbucht (D59) streiten zwei Banden um beschlagnahmte Handelswaren. Lohn: 35 Silber, +6 Gold. Gegner: Schmuggler. Wege: D59 Nebelvik – Schmugglerbucht.
- **Verbotenes Korn aus dem Westen** (Kaltfrieden (Kronreich)): Ein Kapitän aus Salzwacht (M34) bringt über Umwege geschmuggeltes Kronreich-Korn nach Nebelvik. Lohn: 40 Silber (oder +7 Gold). Wege: M34 Nebelvik – Salzwacht.
- **Die geschmuggelte Glutlaterne** (Kaltfrieden (Orden)): In der Schmugglerbucht (D59) taucht eine magische Glutlaterne des Ordens auf – die Seeleute weigern sich, an Bord zu gehen, solange sie in der Stadt ist. Lohn: 40 Silber, Glutlaterne (nur Handelsware/Beute zum Verkauf). Gegner: Schmuggler. Wege: D59 Nebelvik – Schmugglerbucht. *Gruppen-Relikt (Henry, 18. 11. 2026): Glutlaterne stärkt als einziges aktives Relikt die ganze Gruppe (Licht der Ewigen Glut). Nutzbar für Orden der Flamme; alle anderen verkaufen es für 55 Silber.*
- **Totenschiffe in der Nebelbucht** (Kult-Spur): Acht Kultisten der Bleichen Ewigkeit empfangen nachts in der Schmugglerbucht (D59) verfluchte Fracht über die Seewege M32 (Draugrsund) und M37 (Totenwacht). Lohn: Untoten-Bedrohung -4, 55 Silber. Gegner: Kultisten. Wege: D59 Nebelvik – Schmugglerbucht, M32 Draugrsund – Nebelvik, M37 Nebelvik – Totenwacht.
- **Flaschenpost aus Schattmund** (Weltkonflikt (Untote)): Ein Fischer findet auf der Route M35 nach Schattmund eine versiegelte Urne mit alten Schriften über den Fall der nördlichen Königreiche. Lohn: 30 Silber, Welt-Lore (Untote). Wege: M35 Nebelvik – Schattmund.
- **Die Elfen-Späher im Nebel** (Weltkonflikt (Elfen)): Ein Schmuggler zeigt dir einen silbernen Elfenpfeil und berichtet, wie die Elfen im Osten ihre Wälder mit Dornen und Schatten gegen Eindringlinge verteidigen. Lohn: 25 Silber, Welt-Lore (Elfen). Wege: D59 Nebelvik – Schmugglerbucht.
- **Tiefenkrake vor Nebelvik** (Bestiarium): Eine Tiefenkrake greift Schiffe auf dem Seeweg M33 nach Perlvik an. Lohn: 55 Silber, Krakenleder-Wams. Gegner: Tiefenkrake. Wege: M33 Nebelvik – Perlvik.
- **Hafenratten in den Nebelspeichern** (Nacht des Erwachens): Nach dem Ascheregen fallen Schwärme von Hafenratten über die gelagerten Trockenfische her. Lohn: 25 Silber, +5 Gold. Gegner: Hafenratten. Wege: D58 Nebelvik – Nebelstrand.
- **Schatten im Nebel** (Begleiter (2/3)): Die Schattenklinge Sören Nebeltritt wurde bei einem Auftrag gegen Kult-Schmuggler in der Schmugglerbucht (D59) umzingelt. Rette ihn und birg die verschlüsselten Frachtlisten. Lohn: Begleiter: Sören Nebeltritt (2/3). Gegner: Kultisten, Schmuggler. Wege: D59 Nebelvik – Schmugglerbucht.

### Nebelstrand (Dorf, D58, Fisch, Stufe 1-5 für Häfen-Helden)
- **Das verschollene Nebelhorn** (Dorfauftrag): Birg das kupferne Nebelhorn von einer Klippe voller Wrackkrabben. Lohn: 20 Silber, +5 Gold. Gegner: Wrackkrabben. Wege: D58 Nebelvik – Nebelstrand.

### Schmugglerbucht (Dorf, D59, Schmuggelware, Stufe 1-5 für Häfen-Helden)
- **Die versenkte Kiste** (Dorfauftrag): Hebe eine geschmuggelte Waffenkiste aus der flachen Bucht und wehre Riffhaie ab. Lohn: 30 Silber, Entermesser. Gegner: Riffhaie. Wege: D59 Nebelvik – Schmugglerbucht.

### Salzwacht (hafenstadt, Stufe 1-5 für Häfen-Helden)
- **Schiffsholz aus Werftby** (Fraktion): Sichere die Holzlieferungen aus Werftby über D61 für die Kriegsschiffe von Admiral Knut Salzhand. Lohn: 30 Silber, +7 Gold. Gegner: Wegelagerer. Wege: D61 Salzwacht – Werftby.
- **Teer für die Schiffsrümpfe** (Dorf-Verbindung): Verteidige die Teerbrenner von Teerhag (D60) gegen Brandstifter. Lohn: 25 Silber, +6 Gold. Gegner: Deserteure. Wege: D60 Salzwacht – Teerhag.
- **Eisen für die Bundesflotte** (Kaltfrieden (Kronreich)): Ein Schmied aus dem Kronreich bietet heimlich Geschützrohre und Anker an, verlangt aber doppelten Preis wegen des Kaltfriedens. Lohn: 45 Silber (oder +7 Gold). Wege: S56 Perlvik – Salzwacht.
- **Der zwergische Geschützmeister** (Weltkonflikt (Zwerge)): Ein Gehilfe von Meister Orrin Kupferbart erklärt den Bau von Schwarzpulver-Kanonen und erzählt, wie die Zwerge im Südosten ihre Tiefenfestungen verteidigen. Lohn: 35 Silber, Welt-Lore (Zwerge).
- **Sabotage auf den Hellingen** (Kult-Spur): Sieben Kultisten der Bleichen Ewigkeit versuchen, das neue Flaggschiff von Admiral Knut Salzhand vor der Fahrt nach Norden (M42) anzuzünden. Lohn: Untoten-Bedrohung -4, 50 Silber. Gegner: Kultisten. Wege: M42 Draugrsund – Salzwacht.
- **Die Piraten von Rostbucht** (Weltkonflikt (Orks)): Ein ehemaliger Pirat aus Knut Salzhands Mannschaft berichtet von einer Fahrt auf M43 nach Rostbucht und erklärt, warum die Staubreiter-Orks aus Verzweiflung rauben. Lohn: 30 Silber, Welt-Lore (Orks). Wege: M43 Rostbucht – Salzwacht.
- **Meuterei auf der Reede** (Intrige): Unzufriedene Söldner meutern auf einem Transportschiff auf der Straße nach Skerheim (S57). Lohn: 45 Silber, Enteraxt. Gegner: Deserteure. Wege: S57 Salzwacht – Skerheim.
- **Tiefenkrake vor der Kriegswerft** (Bestiarium): Eine Tiefenkrake blockiert die Hafeneinfahrt Richtung Silberholm (M44). Lohn: 55 Silber, Krakenbein-Talisman. Gegner: Tiefenkrake. Wege: M44 Salzwacht – Silberholm.
- **Brennender Ascheregen im Teerlager** (Nacht des Erwachens): Heiße Vulkanasche droht die Teerfässer in Teerhag zu entzünden; hilf beim Löschen und bekämpfe Hafenratten. Lohn: 25 Silber, +5 Gold. Gegner: Hafenratten. Wege: D60 Salzwacht – Teerhag.
- **Der Schwur der Kriegswerft** (Begleiter (3/3)): Zollhauptmann Halvor Eisentau verteidigt das Hauptarsenal von Salzwacht gegen Kult-Saboteure und Meuterer. Schlage den Angriff gemeinsam mit ihm zurück. Lohn: Begleiter: Zollhauptmann Halvor Eisentau (3/3). Gegner: Kultisten, Deserteure. Wege: D61 Salzwacht – Werftby.

### Werftby (Dorf, D61, Holz, Stufe 1-5 für Häfen-Helden)
- **Eichenstämme für den Kiel** (Dorfauftrag): Schütze die Holzfäller vor Galgenkrähen und Wegelagerern. Lohn: 25 Silber, +5 Gold. Gegner: Galgenkrähen, Wegelagerer. Wege: D61 Salzwacht – Werftby.

### Teerhag (Dorf, D60, Teer, Stufe 1-5 für Häfen-Helden)
- **Schwarzer Rauch über Teerhag** (Dorfauftrag): Fange Saboteure ab, die die Teergruben vergiften wollen. Lohn: 20 Silber, +5 Gold. Gegner: Schmuggler. Wege: D60 Salzwacht – Teerhag.
