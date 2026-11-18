# Orden der Flamme – Hauptquest und Nebenquests

Stand: 18. 11. 2026. Grundlage ist die Ausarbeitung von Gemini in drei Teilen (Quelltext unverändert in `quellen/gemini/orden-*.json`). Aufbau wie beim Kronreich (siehe [KRONREICH.md](KRONREICH.md)); Henrys Entscheidungen von dort gelten auch hier: Gemini-Struktur, Schwester-Zweige erster 6–10 und zweiter 11–15, Fraktions-Spezialisierung zusätzlich zur Klassen-Spezialisierung, Skalde = Erzpriester Thorvald (entlarvt in Akt 4), Akt-5-Ziel frei wählbar.

**Entscheidungen Henry (18. 11. 2026), alle fünf Vorschläge angenommen:**
1. Skarn der Weiße Bär bleibt nur in Eiswacht (Frostklippen). Glutberg bekommt „Die Mutter der Tiefen“. Damit kommt jedes der drei Alphatiere des Ordens (Skarn, Mutter der Tiefen, Der Letzte Mammut in Lichtheim) genau einmal vor.
2. Die Gebietsstufe hängt von der Fraktion des Helden ab. Für Orden-Helden ist das Ordensland Startgebiet (Stufe des Aushangs, 1–5). Kronreich- und Häfen-Helden treffen dort die Stufe ihres Schwester-Zweigs (6–10 oder 11–15). Für Helden anderer Völker gilt die Stufe aus dem Bestiarium (15–20). Im Spiel: `nebenquests.stufenFuer(ort, heldFraktion)`.
3. Die Begleiter heißen **Bruder Halvar Eisenrun** und **Runenpriesterin Gunhild Gluthand** (Bjarne und Solveig sind schon vergeben).
4. Akt 5 heißt **„Über das Innere Meer“** wie beim Kronreich.
5. Der Korntreck geht von Kronhall über **P02 zurück nach Eiswacht**, also wirklich über den Eispass.

**Weitere Prüfvermerke:** brandstein_q04 nennt S29, Grenzmarkt liegt aber erst hinter Sigrunsheim (S29, dann S45). Die Dornenklingen haben in ihrem Akt 3 „Klinge und Flamme“ noch eine Kreuzung mit dem früheren Orden-Akt 4 „Die Elfen am Weltenbaum“, den es nach Geminis Aufbau nicht mehr gibt (wird mit den Elfen-Quests geklärt).

| Teil | Stand im Spiel |
| --- | --- |
| Nebenquests: 11 Städte mit je 10 Aufträgen, 23 Dörfer, insgesamt 133 | Aushang im Stadt-Hub (lesbar, noch nicht spielbar) |
| Hauptquest Akt 1–5, Spezialisierung, Begleiter | Plan im Stadt-Hub (lesbar, noch nicht spielbar). Akttitel in `spiel/startpunkte.js`, Stufen in `kampf.questStufenFraktion.orden`. |

Daten: `spiel/nebenquests-daten.js`, erzeugt von `quellen/nebenquests-erzeugen.cjs`.

## Hauptquest „Solange die Flamme brennt, ruht der Tod“ (Kapitel 1)

### Prolog „Die Nacht der kalten Feuer“ (spielbar)
Herbst 612 n. E., die Nacht des Erwachens: Novizenweihe im Aschenkloster, ein gefallener Bruder steht im Kreuzgang wieder auf, Kultisten löschen die Wachfeuer von Nordwacht, und am Glutberg flackert die Ewige Flamme. (Zusammenfassung des Prologs im Spiel.)

### Akt 1 „Die flackernde Flamme“ (Stufe 1–5)
Ordensland (Glutberg, Aschenkloster, Lichtheim, Brandstein)

1. **Halle der Ewigen Flamme** (Glutberg): Hochmeisterin Ragna Glutherz und Erzpriester Thorvald melden, dass die seit 270 Jahren brennende Ewige Flamme erlischt. Thorvald rät dazu, die alten Runenbecken mit geweihtem Wachs und Schwefel neu zu entfachen.
2. **Wachs und Schwefel** (Lichtheim / Brandstein): Über S36 reist du nach Lichtheim (Bienental, D37) und über S28 weiter nach Brandstein (Schwefelgrube, D30). Kultisten haben die Lieferungen sabotiert und Runenfresser angelockt.
3. **Verräter im Feuer** (Glutberg): Rückkehr zum Glutberg. Seherin Freydis entlarvt mit deiner Hilfe einen niederen Akolythen, der das heilige Öl verwässert hat – doch die wahren Drahtzieher bleiben im Schatten.

- Wahl: Die Flamme mit den Gebeten der Überlebenden nähren → +10 Glaube; schaltet Schutz- und Heilrunen für die Gruppe frei.
- Wahl: Die Flamme mit Stahl und Asche der Gefallenen nähren → Untoten-Bedrohung -5; schaltet offensive Glutwaffen-Runen frei.

### Akt 2/3 „Korn über den Eispass“ (Stufe 6–10 als erster Zweig, 11–15 als zweiter, Schwester-Zweig Kronreich)
Eiswacht, Kronhall

1. **Die Wacht am Eispass** (Eiswacht): Marschall Ser Bjarne vom Eispass meldet leere Kornspeicher. Ohne Korn aus dem Kronreich droht dem Ordensland der Hunger.
2. **Kaltfrieden am Krankenbett** (Kronhall): Über Pass P02 erreichst du Kronhall. Du verhandelst mit Kronprinzessin Astrid und Kanzler Ulf Grau über Kornlieferungen, während Jarl Ragnvald misstrauisch auf deine Runen blickt.
3. **Der Korntreck über den Eispass** (Kronhall / Eiswacht): Du sicherst den Korntreck von Kronhall über Pass P02 zurück nach Eiswacht. Auf dem Pass warten Schnee, Wegelagerer und die Zöllner beider Seiten.
   > Änderung Henry (18. 11. 2026): Bei Gemini lief der Treck über S04 und S01 nach Brandstein, also nicht über den Eispass. Jetzt passt er zur Kronreich-Seite („Der Zug über den Eispass“).

- Wahl: Heiliger Bund & Beistand für König Harald IV. → Dauerhafte Kornlieferungen (+10 Glaube); schwere Kronreich-Ritter unterstützen den Orden.
- Wahl: Grenzstädte unter Kriegsrecht des Ordens stellen → Sofortiger Vorrats- und Silbergewinn (+60 Silber), aber Misstrauen bei Astrid und Ragnvald.

### Akt 2/3 „Schiffe für den Kreuzzug“ (Stufe 6–10 als erster Zweig, 11–15 als zweiter, Schwester-Zweig Freie Häfen)
Flammenhof, Tranvik, Bernsvik, Perlvik

1. **Der Weg an die Ostküste** (Flammenhof / Tranvik): Über Grenzstraße S34 reist du von Flammenhof nach Tranvik, um Schiffe für den Orden anzuwerben.
2. **Knochenfracht aus Draugrsund** (Bernsvik): Über S52 erreichst du Bernsvik. Du deckst auf, dass korrupte Kaufleute über Seeweg M23 heimlich Reliquien aus Draugrsund schmuggeln.
3. **Gold und Glaube** (Perlvik): Über Seeweg M25 reist du nach Perlvik und schließt mit Thingsprecherin Solveig Valsdottir und Meister Orrin Kupferbart den Flottenvertrag.

- Wahl: Tempelsilber zahlen & Handelsrouten segnen (80 Silber) → Schnelle Kriegsschiffe und erfahrene Seeleute der Freien Häfen schließen sich an.
- Wahl: Kult-Reeder enteignen & Werften beschlagnahmen → Kostenlose Schiffe, aber Unruhe in den Häfen und Sabotagegefahr.

### Akt 4 „Verräter im Feuer & Das Alte Reich“ (Stufe 16–18)
Glutberg, Kronhall, Nordwacht / Glutvik · enthält Volksquest: Das Alte Reich

1. **Entlarvung des Bleichen Skalden** (Glutberg): Seherin Freydis findet in den tiefen Gewölben des Glutbergs verbotene Totenrunen. Der wahre Anführer des Kults der Bleichen Ewigkeit wird entlarvt: Erzpriester Thorvald selbst. Über hundert Jahre hält ihn die Totenmagie des Nordens am Leben; als Preis dafür schwächt er die Ewige Flamme, damit die Untoten im Norden erstarken. Du stellst Thorvald in der Halle der Ewigen Flamme als Endgegner (Untoten-Bedrohung -15).
   > Wie beim Kronreich: Der Bleiche Skalde ist Erzpriester Thorvald und wird in Akt 4 entlarvt (Henry, 18. 11. 2026). In Akt 1 tritt er unerkannt auf.
2. **Das Große Thing** (Kronhall): Nach Thorvalds Fall vereinen Hochmeisterin Ragna Glutherz, Kronprinzessin Astrid und Thingsprecherin Solveig Valsdottir die drei Menschenfraktionen; der Held steigt zum Bannerjarl auf.
3. **Der Kreuzzug rüstet** (Nordwacht / Glutvik): Die Flotte sammelt sich an den Nordhäfen, und die Wachfeuer brennen wieder hell.

### Akt 5 „Über das Innere Meer“ (Stufe 19–20)
Nordwacht / Glutvik -> Seewege -> frei wählbarer Kontinent

> Änderung Henry (18. 11. 2026): Bei Gemini „Über das Nordmeer“. Das Ziel ist frei wählbar, und nur der Weg zu den Untoten führt über das Nordmeer.

1. **Auslaufen der Kreuzzugsflotte** (Nordwacht / Glutvik): Mit dem Segen der neu entfachten Ewigen Flamme sticht die Menschenarmada in See.
2. **Feuer auf den Wellen** (Inneres Meer / Nordmeer): Abwehr eines Angriffs untoter Kriegsschiffe auf hoher See mithilfe geweihter Glutrunen.
3. **Der Brückenkopf** (Fremde Küste (frei wählbarer Kontinent)): Landung an der gewählten Küste (Elfen im Osten, Orks im Südwesten, Zwerge im Südosten als Bündnis oder Unterwerfung – oder der extrem schwere Weg direkt gegen die Untoten im hohen Norden). Ende Kapitel 1.

### Fraktions-Spezialisierung (Nach Abschluss beider Schwester-Zweige, zusätzlich zur Spezialisierung der Klasse)
- **Sonnenklingen**: Maximale Glutmagie im Nahkampf, verheerender Feuerschaden gegen Untote.
- **Wächter der Asche**: Unerschütterliche Runen-Rüstungen, Gruppenheilung und -25% Glaubenskosten auf Reisen.

### Begleiter (höchstens 3)

| Name | Rolle | Klasse | Ort, Akt | Auftrag | Fähigkeit |
| --- | --- | --- | --- | --- | --- |
| Bruder Halvar Eisenrun | Runen-Paladin / Tank | waechter | Aschenkloster, Akt 1 | aschenkloster_q10 | Schild der Ewigen Glut |
| Runenpriesterin Gunhild Gluthand | Feuerpriesterin / Magie | magier | Brandstein, Akt 2 | brandstein_q10 | Schwefelrune & Feuerstoß |
| Späher Malte Sturmauge | Bergschütze / Fernkampf | spaeher | Nordwacht, Akt 3 | nordwacht_q10 | Wachfeuer-Salve gegen Untote |

## Nebenquests

### Glutberg (hauptstadt, Stufe 1-5 für Orden-Helden)
- **Wachs für die Ewige Flamme** (Fraktion): Eskortiere eine Karawane mit geweihtem Bienenwachs aus Kerzenhof sicher über den steilen Klippenweg. Lohn: +8 Glaube, 25 Silber. Gegner: Grauwolf. Wege: D25 Glutberg – Kerzenhof.
- **Pilger am Abgrund** (Fraktion): Rette verirrte Pilger aus Pilgerrast, die im Schneesturm von der Straße abgekommen sind. Lohn: +6 Glaube, 20 Silber. Gegner: Eishauer. Wege: D26 Glutberg – Pilgerrast.
- **Der Spion im Pilgergewand** (Kaltfrieden (Kronreich)): Ein Kundschafter Jarl Ragnvalds spioniert die Truppenstärke der Paladine am Runentor aus. Lohn: 35 Silber, Kaltfrieden-Lore. Gegner: Spione.
- **Wucherpreise am Gipfel** (Kaltfrieden (Häfen)): Ein Kaufmann aus den Freien Häfen verlangt überhöhte Preise für Lampenöl und Salz. Lohn: 40 Silber, +4 Glaube. Gegner: Schmuggler.
- **Asche in den Opferbecken** (Kult-Spur): Sieben abtrünnige Akolythen des Kults der Bleichen Ewigkeit mischen Totenstaub in das Weihwasser. Lohn: Untoten-Bedrohung -3, 35 Silber. Gegner: Kultisten.
- **Die vergessene Zwergenrune** (Weltkonflikt (Zwerge)): Am Fuß des Glutbergs liegt eine uralte Zwergeninschrift, die vor dem Erwachen der Glut im Süden warnt. Lohn: Welt-Lore, Runenschild. Gegner: Runenfresser.
- **Der Brief vom Weltenbaum** (Weltkonflikt (Elfen)): Seherin Freydis zeigt dir eine alte elfische Pergamentrolle, die erklärt, warum die Elfen im Osten fremde Schiffe fürchten. Lohn: Welt-Lore, +5 Glaube.
- **Glutwurm in der unteren Stiege** (Nacht des Erwachens): Seit dem Beben im Süden ist ein Glutwurm aus einer Felsspalte unter dem Gipfel gekrochen. Lohn: 50 Silber, Glutstein-Amulett. Gegner: Glutwurm.
- **Frostbären an der Bergweide** (Bestiarium): Verteidige die Ziegenherden von Bergweide gegen hungrige Frostbären. Lohn: 45 Silber, Frostbärenpelz. Gegner: Frostbär. Wege: D24 Glutberg – Bergweide.
- **Alphatier: Die Mutter der Tiefen** (Alphatier-Jagd): Seit dem Beben im Süden kriechen Stollenkriecher aus den Felsspalten unter dem Gipfel. Pilger in der Herberge flüstern von ihrer Königin, der Mutter der Tiefen, die ganze Minen leert. Steig in die Spalten unter dem Glutberg und töte sie. Lohn: 65 Silber, Trophäe der Mutter der Tiefen. Gegner: Die Mutter der Tiefen, Stollenkriecher. *Änderung Henry (18. 11. 2026): Skarn der Weiße Bär bleibt das Alphatier von Eiswacht. Glutberg bekommt die Mutter der Tiefen, so kommt jedes Alphatier des Ordens einmal vor.*

### Kerzenhof (Dorf, D25, Wachs, Stufe 1-5 für Orden-Helden)
- **Eingefrorene Bienenstöcke** (Dorfauftrag): Sammle Glutpilze, um die Wachskammern von Kerzenhof vor der Eiseskälte zu retten. Lohn: +5 Glaube, 20 Silber. Gegner: Schneeschleicher. Wege: D25 Glutberg – Kerzenhof.

### Pilgerrast (Dorf, D26, Glaube, Stufe 1-5 für Orden-Helden)
- **Die falsche Reliquie** (Dorfauftrag): Entlarve einen Betrüger, der verfluchte Knochensplitter als heilige Reliquien verkauft. Lohn: Untoten-Bedrohung -2, +6 Glaube. Gegner: Kultisten. Wege: D26 Glutberg – Pilgerrast.

### Bergweide (Dorf, D24, Ziegen, Stufe 1-5 für Orden-Helden)
- **Aschenkrähen über der Alm** (Dorfauftrag): Vertreibe einen Schwarm Aschenkrähen, der die jungen Ziegen angreift. Lohn: 20 Silber, +4 Glaube. Gegner: Aschenkrähen. Wege: D24 Glutberg – Bergweide.

### Aschenkloster (stadt, Stufe 1-5 für Orden-Helden)
- **Heilkräuter für die Verwundeten** (Fraktion): Sammle Frostlilien und Kräuter im Klostergarten für die verletzten Paladine aus dem Prolog. Lohn: +6 Glaube, 2x Heilmittel (Wert je 15 Silber). Gegner: Schneeschleicher. Wege: D28 Aschenkloster – Klostergarten.
- **Gerste für die Novizen** (Dorf-Verbindung): Schütze einen Gerstenkarren aus Hochtalhof auf dem Weg ins Kloster. Lohn: +5 Glaube, 25 Silber. Gegner: Grauwolf. Wege: D27 Aschenkloster – Hochtalhof.
- **Die geschändete Krypta** (Kult-Spur): Sechs Kultisten der Bleichen Ewigkeit versuchen im Kreuzgang, gefallene Ordensbrüder zu erwecken. Lohn: Untoten-Bedrohung -3, Runen-Streitkolben. Gegner: Kultisten.
- **Chronik der drei Grenzkriege** (Kaltfrieden (Kronreich)): Ein alter Bibliothekar sucht verlorene Berichte über die Schlachten gegen das Kronreich. Lohn: 35 Silber, Kaltfrieden-Lore. Wege: S25 Aschenkloster – Glutberg.
- **Geschmuggelte Runensteine** (Kaltfrieden (Häfen)): Ein Novize wollte geweihte Runensteine an Händler aus Tranvik verkaufen. Lohn: 40 Silber, +4 Glaube. Gegner: Schmuggler. Wege: S24 Aschenkloster – Flammenhof.
- **Warum die Untoten marschieren** (Weltkonflikt (Untote)): Entziffere eine alte Prophezeiung im Runenhof über den Zusammenhang zwischen dem Mutterberg im Süden und dem hohen Norden. Lohn: Welt-Lore, +5 Glaube.
- **Runenfresser in der Bibliothek** (Bestiarium): Runenfresser nagen an den alten Runentafeln im Kellergewölbe. Lohn: 40 Silber, Runen-Fokus. Gegner: Runenfresser.
- **Aschenregen auf den Dächern** (Nacht des Erwachens): Hilf den Mönchen, die eingestürzte Dachkonstruktion der Runenschmiede zu räumen. Lohn: 30 Silber, +5 Glaube. Gegner: Stollenkriecher.
- **Deserteure auf dem Klosterweg** (Intrige): Verängstigte Knappen sind nach dem Draugr-Angriff geflohen und plündern Reisende auf S27. Lohn: 35 Silber, Plattenpanzer. Gegner: Deserteure. Wege: S27 Aschenkloster – Wachtfeuer.
- **Der Schwur des Runenhofs** (Begleiter (1/3)): Hilf dem verwundeten Paladin Bruder Halvar Eisenrun, das gestohlene Ordensbanner aus einer Kultistenhöhle zurückzuholen. Lohn: Begleiter: Bruder Halvar Eisenrun (1/3). Gegner: Kultisten. Wege: S25 Aschenkloster – Glutberg. *Änderung Henry (18. 11. 2026): Bei Gemini hieß er Bruder Bjarne Eisenrun. Bjarne ist schon Ser Bjarne vom Eispass.*

### Klostergarten (Dorf, D28, Kräuter, Stufe 1-5 für Orden-Helden)
- **Runenflechte im Eis** (Dorfauftrag): Ernte seltene Runenflechte für die Klosteralchemisten. Lohn: 25 Silber, Gegenmittel (Wert 18 Silber). Gegner: Eishauer. Wege: D28 Aschenkloster – Klostergarten.

### Hochtalhof (Dorf, D27, Gerste, Stufe 1-5 für Orden-Helden)
- **Wölfe am Kornspeicher** (Dorfauftrag): Vertreibe Grauwölfe von den Gerstenspeichern. Lohn: 20 Silber, +4 Glaube. Gegner: Grauwolf. Wege: D27 Aschenkloster – Hochtalhof.

### Brandstein (stadt, Stufe 1-5 für Orden-Helden)
- **Schwefel für das heilige Feuer** (Fraktion): Sichere den Transport von reinem Schwefel aus der Schwefelgrube für die Runenschmieden. Lohn: +7 Glaube, 30 Silber. Gegner: Stollenkriecher. Wege: D30 Brandstein – Schwefelgrube.
- **Kohle aus Feuerhof** (Dorf-Verbindung): Verteidige die Köhler von Feuerhof gegen Wegelagerer an der Südgrenze. Lohn: 30 Silber, +5 Glaube. Gegner: Wegelagerer. Wege: D29 Brandstein – Feuerhof.
- **Zollstreit mit Eikmark** (Kaltfrieden (Kronreich)): Auf der Grenzstraße S01 blockieren Kronreich-Wachen eine Lieferung Runenerz. Lohn: 40 Silber, Kaltfrieden-Lore. Wege: S01 Eikmark – Brandstein.
- **Pulverschmuggel nach Grenzmarkt** (Kaltfrieden (Häfen)): Schmuggler wollen Schwefel aus Brandstein über die Bergpfade an die Freien Häfen verkaufen. Lohn: 45 Silber, +4 Glaube. Gegner: Schmuggler. Wege: S29 Brandstein – Sigrunsheim. *Prüfen: S29 führt nur bis Sigrunsheim. Nach Grenzmarkt geht es von dort über S45 weiter.*
- **Die erloschenen Öfen** (Kult-Spur): Acht Kultisten sabotieren die Schmelzöfen von Brandstein, damit keine Runenwaffen mehr geschmiedet werden können. Lohn: Untoten-Bedrohung -3, Glutklinge. Gegner: Kultisten.
- **Die Tiefe der Zwerge** (Weltkonflikt (Zwerge)): Ein alter Runenmeister erzählt, wie die Zwerge im Südosten einst den Orden das Runenschmieden lehrten, bevor der Streit um die Tiefenglut ausbrach. Lohn: Welt-Lore, 30 Silber.
- **Glutwurm im Schwefelschacht** (Nacht des Erwachens): Nach dem Ausbruch des Mutterbergs dringt Hitze aus der Tiefe, und ein Glutwurm bedroht die Grube. Lohn: 55 Silber, Glutpanzer-Rüstung. Gegner: Glutwurm. Wege: D30 Brandstein – Schwefelgrube.
- **Klippenwyrm am Pass P03** (Bestiarium): Ein Klippenwyrm greift Karawanen auf dem Pass P03 nach Eiswacht an. Lohn: 50 Silber, Wyrmschuppen-Schild. Gegner: Klippenwyrm. Wege: P03 Brandstein – Eiswacht.
- **Wache an der Südstraße** (Intrige): Untersuche verdächtige Rauchzeichen an der Grenze zu Eikmark (S01). Lohn: 35 Silber, Späher-Stiefel. Gegner: Spione. Wege: S01 Eikmark – Brandstein.
- **Die schreiende Schwefelrune** (Begleiter (2/3)): Rette Runenpriesterin Gunhild Gluthand aus einer eingestürzten Runenkammer, in der ein Runenfresser wütet. Lohn: Begleiterin: Runenpriesterin Gunhild Gluthand (2/3). Gegner: Runenfresser. Wege: D30 Brandstein – Schwefelgrube. *Änderung Henry (18. 11. 2026): Bei Gemini hieß sie Solveig Gluthand. Solveig ist schon Thingsprecherin Solveig Valsdottir.*

### Schwefelgrube (Dorf, D30, Schwefel, Stufe 1-5 für Orden-Helden)
- **Giftige Dämpfe** (Dorfauftrag): Bringe Gegenmittel zu den erkrankten Bergleuten und vertreibe Stollenkriecher. Lohn: 30 Silber, +4 Glaube. Gegner: Stollenkriecher. Wege: D30 Brandstein – Schwefelgrube.

### Feuerhof (Dorf, D29, Kohle, Stufe 1-5 für Orden-Helden)
- **Brennende Meiler** (Dorfauftrag): Fange Saboteure ab, die die Holzkohle für die Ordensschmieden vernichten wollen. Lohn: 25 Silber, +5 Glaube. Gegner: Kultisten. Wege: D29 Brandstein – Feuerhof.

### Eiswacht (stadt, Stufe 1-5 für Orden-Helden)
- **Zoll am Südtor** (Fraktion): Unterstütze die Wachen in der Passhütte auf D32, wenn Schmuggler versuchen, den Passzoll zu umgehen. Lohn: 30 Silber, +6 Glaube. Gegner: Schmuggler. Wege: D32 Eiswacht – Passhütte.
- **Felle für die Nordwacht** (Dorf-Verbindung): Eskortiere einen Schlitten voller Winterfelle aus Firnby (D31) nach Eiswacht und weiter nach Thorvaldsklipp (S33). Lohn: 25 Silber, +5 Glaube, Fellmantel. Gegner: Grauwölfe. Wege: D31 Eiswacht – Firnby, S33 Eiswacht – Thorvaldsklipp.
- **Flüchtlinge aus Heidvang** (Kaltfrieden (Kronreich)): Eine Gruppe Bauern aus Heidvang steckt am Eispass (P01) im Schneesturm fest. Ser Bjarne vom Eispass entscheidet über ihre Aufnahme. Lohn: 35 Silber, +7 Glaube (oder 20 Silber Zollgebühr). Gegner: Frostbär. Wege: P01 Heidvang – Eiswacht.
- **Das geschmuggelte Hauptbuch** (Kaltfrieden (Häfen)): Ein Kaufmann, der über P02 aus Kronhall kam, trägt geheime Kontorbücher der Freien Häfen über den Kornhandel bei sich. Lohn: 45 Silber, Intrigen-Lore. Gegner: Schmuggler. Wege: P02 Kronhall – Eiswacht.
- **Kälte im Wachfeuer** (Kult-Spur): Fünf abtrünnige Ordensritter löschen heimlich die Signalfeuer entlang des Passes P03 nach Brandstein. Lohn: Untoten-Bedrohung -3, 40 Silber. Gegner: Kultisten. Wege: P03 Brandstein – Eiswacht.
- **Der alte Grenzstein** (Weltkonflikt (Menschen)): In der Kartenstube von Eiswacht liegt eine unvollständige Karte der drei Grenzkriege gegen das Kronreich. Birg den fehlenden Teil aus den Ruinen am Moor. Lohn: 30 Silber, Kaltfrieden-Lore. Gegner: Schneeschleicher.
- **Warum die Zwerge schweigen** (Weltkonflikt (Zwerge)): Ein alter Passwächter zeigt dir Zwergen-Meißelzeichen am Runenpass und berichtet, wie das Erwachen der Glut im Süden die Zwerge in ihre tiefen Stollen zwang. Lohn: 35 Silber, Welt-Lore (Zwerge). Gegner: Runenfresser.
- **Aschenschnee auf dem Pass** (Nacht des Erwachens): Schwarze Vulkanasche legt sich auf das Eis und lockt hungrige Aschenkrähen auf die Zeugkammer von Eiswacht. Lohn: 25 Silber, 2x Heilmittel. Gegner: Aschenkrähen.
- **Klippenwyrm über der Schlucht** (Bestiarium): Ein Klippenwyrm greift Maultierkarren auf der Straße S32 nach Glutvik an. Lohn: 50 Silber, Wyrmschuppen-Schild. Gegner: Klippenwyrm. Wege: S32 Eiswacht – Glutvik.
- **Alphatier: Skarn der Weiße Bär** (Alphatier-Jagd): An den Frostklippen oberhalb von Eiswacht wütet Skarn der Weiße Bär und zerreißt ganze Patrouillen. Lohn: 65 Silber, Pelz von Skarn. Gegner: Skarn der Weiße Bär. Wege: S31 Eiswacht – Glutberg.

### Passhütte (Dorf, D32, Zoll, Stufe 1-5 für Orden-Helden)
- **Die falsche Zollmarke** (Dorfauftrag): Entlarve Wegelagerer, die sich als Zöllner verkleidet haben und Reisende ausrauben. Lohn: 25 Silber, +4 Glaube. Gegner: Wegelagerer. Wege: D32 Eiswacht – Passhütte.

### Firnby (Dorf, D31, Felle, Stufe 1-5 für Orden-Helden)
- **Schneeschleicher im Stall** (Dorfauftrag): Schütze die Pelzvorräte und Schlittenhunde vor einem Rudel Schneeschleicher. Lohn: 20 Silber, Gefütterte Stiefel. Gegner: Schneeschleicher. Wege: D31 Eiswacht – Firnby.

### Flammenhof (stadt, Stufe 2-5 für Orden-Helden)
- **Die Gaben des Opferhains** (Fraktion): Begleite eine Prozession über D33 zum Opferhain, um den Segen für die Ostgrenze zu erneuern. Lohn: 20 Silber, +8 Glaube. Gegner: Grauwölfe. Wege: D33 Flammenhof – Opferhain.
- **Die Ziegen der Hochalm** (Dorf-Verbindung): Ein Klippenwyrm bedroht die Herden auf der Ziegenalm (D34). Lohn: 30 Silber, +5 Glaube. Gegner: Klippenwyrm. Wege: D34 Flammenhof – Ziegenalm.
- **Fisch gegen Feuerholz** (Kaltfrieden (Häfen)): Händler aus Tranvik bieten über die kurze Grenzstraße S34 gesalzenen Fisch gegen geweihtes Feuerholz an – doch ein Zelot will den Handel sprengen. Lohn: 40 Silber, +5 Glaube. Gegner: Deserteure. Wege: S34 Flammenhof – Tranvik.
- **Der Spitzel aus Tranvik** (Kaltfrieden (Häfen)): Ein angeblicher Seemann aus Tranvik (S34) späht die Befestigungen von Flammenhof aus. Lohn: 35 Silber, Kaltfrieden-Lore. Gegner: Schmuggler. Wege: S34 Flammenhof – Tranvik.
- **Die Knochenfracht von Tranvik** (Kult-Spur): Sieben Kultisten der Bleichen Ewigkeit bringen über S34 Kisten mit Totenreliquien aus Tranvik in eine Höhle nahe dem Opferhain. Lohn: Untoten-Bedrohung -3, 40 Silber. Gegner: Kultisten. Wege: S34 Flammenhof – Tranvik, D33 Flammenhof – Opferhain.
- **Elfenfeuer am Horizont** (Weltkonflikt (Elfen)): Ein alter Seefahrer berichtet von leuchtenden Schiffen der Elfen im Osten und erklärt, warum die Elfen seit dem Erwachen der Glut jeden Fremden an ihren Küsten bekämpfen. Lohn: 25 Silber, Welt-Lore (Elfen).
- **Die Schatten von Draugrsund** (Weltkonflikt (Untote)): Ein geflohener Walfänger aus Tranvik erzählt voller Entsetzen von den untoten Flotten in Draugrsund jenseits des Meeres. Lohn: 25 Silber, Welt-Lore (Untote). Wege: S34 Flammenhof – Tranvik.
- **Aschenkrähen über dem Hain** (Nacht des Erwachens): Nach dem Ascheregen fallen Schwärme von Aschenkrähen über die Opfergaben her. Lohn: 25 Silber, Krähenfeder-Talisman. Gegner: Aschenkrähen. Wege: D33 Flammenhof – Opferhain.
- **Der vermisste Bote nach Wachtfeuer** (Fraktion): Suche einen Ordensboten, der auf der Straße S35 nach Wachtfeuer verschwunden ist. Lohn: 30 Silber, +5 Glaube. Gegner: Grauwölfe. Wege: S35 Flammenhof – Wachtfeuer.
- **Der Grenzpakt von S34** (Gewichtig): Schließe mit dem Hafenmeister von Tranvik auf S34 ein geheimes Frühwarnabkommen ab, falls untote Segel am Horizont auftauchen. Lohn: Frühwarnung in Akt 3 & 4; Untoten-Bedrohung -3. Gegner: Schmuggler. Wege: S34 Flammenhof – Tranvik.

### Opferhain (Dorf, D33, Glaube, Stufe 2-5 für Orden-Helden)
- **Die geschändete Feuerschale** (Dorfauftrag): Reinige den heiligen Hain, nachdem Kultisten die Glut mit kaltem Wasser und Asche gelöscht haben. Lohn: Untoten-Bedrohung -2, +7 Glaube. Gegner: Kultisten. Wege: D33 Flammenhof – Opferhain.

### Ziegenalm (Dorf, D34, Ziegen, Stufe 2-5 für Orden-Helden)
- **Frostlilien am Steilhang** (Dorfauftrag): Sammle seltene Frostlilien für die Heiler von Flammenhof und wehre Eishauer ab. Lohn: 25 Silber, 2x Heilmittel. Gegner: Eishauer. Wege: D34 Flammenhof – Ziegenalm.

### Glutvik (hafenstadt, Stufe 2-5 für Orden-Helden)
- **Tran für die Leuchtfeuer** (Fraktion): Sichere die Tranfässer aus Walstrand auf D36, damit die Leuchttürme der Nordwestküste nicht verlöschen. Lohn: 30 Silber, +6 Glaube. Gegner: Wegelagerer. Wege: D36 Glutvik – Walstrand.
- **Die Fischer von Eismeerby** (Dorf-Verbindung): Schütze die Winterfischer auf D35 vor hungrigen Frostbären an der Küste. Lohn: 25 Silber, +5 Glaube. Gegner: Frostbär. Wege: D35 Glutvik – Eismeerby.
- **Das Handelsschiff aus Sandvik** (Kaltfrieden (Kronreich)): Ein Kapitän aus Sandvik (M01) bringt dringend benötigtes Korn, doch ein harter Ordensvogt will die Ladung ohne Bezahlung beschlagnahmen. Lohn: 35 Silber, +6 Glaube. Wege: M01 Sandvik – Glutvik.
- **Zollstreit mit Bernsvik** (Kaltfrieden (Häfen)): Seefahrer aus Bernsvik (M10) verweigern den Hafenzoll von Glutvik und schmuggeln Bernstein an der Wache vorbei. Lohn: 45 Silber, Bernstein-Amulett. Gegner: Schmuggler. Wege: M10 Glutvik – Bernsvik.
- **Die vergifteten Tranfässer** (Kult-Spur): Sechs Kultisten mischen nasses Salz in den Lampentran von Glutvik, damit die Signalfeuer auf M11 und M01 versagen. Lohn: Untoten-Bedrohung -3, 35 Silber. Gegner: Kultisten. Wege: M11 Glutvik – Tranvik, M01 Sandvik – Glutvik.
- **Kunde von den Rostsegeln** (Weltkonflikt (Orks)): Ein Seemann, der über den langen Seeweg M01 aus Sandvik kam, berichtet von den Überfällen der orkischen Rostsegel im Süden und ihrem Kampf um Wasser. Lohn: 25 Silber, Welt-Lore (Orks). Wege: M01 Sandvik – Glutvik.
- **Das Treibholz aus dem Norden** (Weltkonflikt (Untote)): Am Strand von Walstrand (D36) werden Planken eines zerbrochenen Schiffes mit unheimlichen Knochenrunen angespült. Lohn: 30 Silber, Welt-Lore (Untote). Gegner: Schneeschleicher. Wege: D36 Glutvik – Walstrand.
- **Eisschollen und Asche** (Nacht des Erwachens): Schwarzer Ascheregen färbt das Küsteneis dunkel und lockt Aschenkrähen auf die Trockengestelle von Eismeerby. Lohn: 20 Silber, 2x Heilmittel. Gegner: Aschenkrähen. Wege: D35 Glutvik – Eismeerby.
- **Eishauer an der Küstenstraße** (Bestiarium): Vertreibe ein Rudel Eishauer, das die Straße S39 nach Nordwacht blockiert. Lohn: 40 Silber, Eishauer-Axt. Gegner: Eishauer. Wege: S39 Glutvik – Nordwacht.
- **Die Walfänger-Flottille** (Gewichtig): Rüste die robusten Walfängerboote von Glutvik mit Runen-Rammen aus, damit sie in Akt 5 die Überfahrt der Kreuzzugsflotte verstärken. Lohn: Stärkere Flotte in Akt 5. Gegner: Frostbär. Wege: M01 Sandvik – Glutvik, M11 Glutvik – Tranvik.

### Eismeerby (Dorf, D35, Fisch, Stufe 2-5 für Orden-Helden)
- **Die eingefrorenen Boote** (Dorfauftrag): Hilf den Fischern, ihre Boote freizuschlagen und plündernde Deserteure abzuwehren. Lohn: 20 Silber, +5 Glaube. Gegner: Deserteure. Wege: D35 Glutvik – Eismeerby.

### Walstrand (Dorf, D36, Tran, Stufe 2-5 für Orden-Helden)
- **Die Trankessel von Walstrand** (Dorfauftrag): Besorge Grauweide-Holz zum Befeuern der Trankessel und vertreibe Grauwölfe. Lohn: 25 Silber, Tran-Fackel. Gegner: Grauwölfe. Wege: D36 Glutvik – Walstrand.

### Lichtheim (stadt, Stufe 1-5 für Orden-Helden)
- **Die Kerzen von Bienental** (Fraktion): Sichere den Wachstransport aus Bienental über D37 für die Kapellen von Lichtheim. Lohn: 25 Silber, +7 Glaube. Gegner: Grauwölfe. Wege: D37 Lichtheim – Bienental.
- **Gebete in Kapellby** (Dorf-Verbindung): Pilger auf D38 nach Kapellby werden von Wegelagerern überfallen. Lohn: 25 Silber, +6 Glaube. Gegner: Wegelagerer. Wege: D38 Lichtheim – Kapellby.
- **Der verirrte Kronreich-Bote** (Kaltfrieden (Kronreich)): Ein Bote aus dem Kronreich, der über Brandstein (S28) kam, wurde im Tal festgehalten. Entscheide über seine Freilassung. Lohn: 35 Silber (oder +7 Glaube). Wege: S28 Brandstein – Lichtheim.
- **Geschmuggelter Bernstein** (Kaltfrieden (Häfen)): Ein Hehler verkauft unverzollten Bernstein aus den Freien Häfen auf dem Markt von Lichtheim. Lohn: 40 Silber, Kaltfrieden-Lore. Gegner: Schmuggler.
- **Flüstern in der Krypta** (Kult-Spur): Acht Kultisten der Bleichen Ewigkeit halten in einer verlassenen Talkapelle geheime Messen für die Toten des Nordens ab. Lohn: Untoten-Bedrohung -3, 35 Silber. Gegner: Kultisten.
- **Der Runenstein des Ersten Hochmeisters** (Lore): Entziffere eine verwitterte Runensäule im Zentrum von Lichtheim, die von der Gründung des Ordens vor über 270 Jahren erzählt. Lohn: 30 Silber, +6 Glaube, Ordens-Lore. Gegner: Runenfresser.
- **Warum der Mutterberg brennt** (Weltkonflikt (Zwerge/Orks)): Ein weitgereister Priester in Lichtheim erklärt den Zusammenhang zwischen dem Ausbruch des Mutterbergs im Süden und dem Vormarsch der Orks und Untoten. Lohn: 25 Silber, Welt-Lore.
- **Aschenmammut im Hochtal** (Bestiarium): Ein rasendes Aschenmammut hat sich aus den Aschefeldern verirrt und bedroht die Straße S36 zum Glutberg. Lohn: 55 Silber, Mammutzahn-Talisman. Gegner: Aschenmammut. Wege: S36 Glutberg – Lichtheim.
- **Grauweiden gegen den Husten** (Nacht des Erwachens): Sammle Rinde der Grauweide für einen Sud gegen den Ascheregen-Husten der Talbewohner. Lohn: 20 Silber, 2x Heilmittel. Gegner: Stollenkriecher.
- **Alphatier: Der Letzte Mammut** (Alphatier-Jagd): In den Aschefeldern östlich von Lichtheim (richtung S43) streift Der Letzte Mammut umher und zerstört ganze Karawanen. Lohn: 65 Silber, Trophäe des Letzten Mammuts. Gegner: Der Letzte Mammut. Wege: S43 Lichtheim – Wachtfeuer.

### Kapellby (Dorf, D38, Glaube, Stufe 1-5 für Orden-Helden)
- **Die gestohlene Altarkerze** (Dorfauftrag): Verfolge Diebe, die die geweihte Altarkerze aus der Dorfkapelle entwendet haben. Lohn: 20 Silber, +6 Glaube. Gegner: Wegelagerer. Wege: D38 Lichtheim – Kapellby.

### Bienental (Dorf, D37, Wachs, Stufe 1-5 für Orden-Helden)
- **Honig und Runenflechte** (Dorfauftrag): Schütze die Imker vor Runenfressern, die das geweihte Wachs fressen. Lohn: 25 Silber, Heilhonig. Gegner: Runenfresser. Wege: D37 Lichtheim – Bienental.

### Nordwacht (hafenstadt, Stufe 1-5 für Orden-Helden)
- **Tran für den großen Leuchtturm** (Fraktion): Sichere den Transport von Waltran aus Leuchtfeuer über D39, damit das Hauptfeuer an der Nordküste nicht erlischt. Lohn: 25 Silber, +7 Glaube. Gegner: Wegelagerer. Wege: D39 Nordwacht – Leuchtfeuer.
- **Die Fischer von Robbenstrand** (Dorf-Verbindung): Verteidige die Fischer von Robbenstrand (D40) gegen ein Rudel hungriger Frostbären. Lohn: 25 Silber, +5 Glaube. Gegner: Frostbär. Wege: D40 Nordwacht – Robbenstrand.
- **Gestrandete Seefahrer aus dem Kronreich** (Kaltfrieden (Kronreich)): An der Eisküste stranden überlebende Seeleute aus dem Kronreich. Entscheide, ob du ihnen Zuflucht gewährst oder sie als Spione festsetzt. Lohn: 35 Silber (oder +6 Glaube & Kaltfrieden-Lore).
- **Schmuggel auf der Nordroute** (Kaltfrieden (Häfen)): Ein Kaperschiff aus Bernsvik (M12) oder Tranvik (M14) versucht nachts ohne Licht an den Klippen vorbei nach Osten zu segeln. Lohn: 45 Silber, Seekarte des Nordmeers. Gegner: Schmuggler. Wege: M12 Nordwacht – Bernsvik, M14 Nordwacht – Tranvik.
- **Die erloschenen Wachfeuer** (Kult-Spur): Sieben abtrünnige Ritter des Kults der Bleichen Ewigkeit löschen heimlich die Signalfeuer entlang der Küste nach Glutvik (S39), um untoten Schiffen freie Fahrt zu geben. Lohn: Untoten-Bedrohung -4, 40 Silber. Gegner: Kultisten. Wege: S39 Glutvik – Nordwacht.
- **Segel aus Draugrsund** (Weltkonflikt (Untote)): Späher sichten auf dem Seeweg M13 Richtung Draugrsund schwarze Segel ohne Ruderschlag. Birg eine versiegelte Flaschenpost vom Strand. Lohn: 30 Silber, Welt-Lore (Untote). Gegner: Schneeschleicher. Wege: M13 Nordwacht – Draugrsund.
- **Warum die Elfen das Meer meiden** (Weltkonflikt (Elfen)): Ein alter Leuchtturmwärter erzählt von den uralten Verträgen der Seefahrt und warum die Elfen seit dem Erwachen der Fäulnis keine Schiffe mehr nach Norden schicken. Lohn: 25 Silber, Welt-Lore (Elfen).
- **Eishauer an der Steilküste** (Bestiarium): Ein Rudel Eishauer blockiert den Nachschubweg S44 nach Thorvaldsklipp. Lohn: 40 Silber, Eishauer-Speer. Gegner: Eishauer. Wege: S44 Nordwacht – Thorvaldsklipp.
- **Aschenschnee im Hafenbecken** (Nacht des Erwachens): Schwarzer Ascheregen und Eis verstopfen die Hafenausfahrt; hilf den Wachen beim Freiräumen und wehre Aschenkrähen ab. Lohn: 25 Silber, +5 Glaube. Gegner: Aschenkrähen.
- **Der letzte Wachposten im Eis** (Begleiter (3/3)): Späher Malte Sturmauge hält nach dem Prolog-Angriff allein den zerstörten äußeren Wachturm gegen Kultisten und Schneeschleicher. Entsetze ihn und sichere die Signalhörner. Lohn: Begleiter: Späher Malte Sturmauge (3/3). Gegner: Kultisten, Schneeschleicher. Wege: D39 Nordwacht – Leuchtfeuer.

### Leuchtfeuer (Dorf, D39, Tran, Stufe 1-5 für Orden-Helden)
- **Das zerbrochene Spiegelglas** (Dorfauftrag): Bringe geschliffenes Glas und geweihtes Öl nach Leuchtfeuer, um das Küstenfeuer wieder weit sichtbar zu machen. Lohn: 25 Silber, +5 Glaube. Gegner: Grauwölfe. Wege: D39 Nordwacht – Leuchtfeuer.

### Robbenstrand (Dorf, D40, Fisch, Stufe 1-5 für Orden-Helden)
- **Plünderer am Eisstrand** (Dorfauftrag): Vertreibe Deserteure, die den Wintervorrat an Trockenfisch stehlen wollen. Lohn: 20 Silber, Fischtran-Salbe. Gegner: Deserteure. Wege: D40 Nordwacht – Robbenstrand.

### Sigrunsheim (stadt, Stufe 2-5 für Orden-Helden)
- **Das Wasser von Sigrunsquell** (Fraktion): Eskortiere Priesterinnen auf D42 nach Sigrunsquell, um geweihtes Quellwasser für die Kranken im Ordensland zu schöpfen. Lohn: +8 Glaube, 20 Silber, 2x Heilmittel. Gegner: Grauwölfe. Wege: D42 Sigrunsheim – Sigrunsquell.
- **Gerste aus dem Südtal** (Dorf-Verbindung): Schütze die Bauern von Gerstenhof (D41) vor Wegelagerern aus dem Grenzland. Lohn: 25 Silber, +5 Glaube. Gegner: Wegelagerer. Wege: D41 Sigrunsheim – Gerstenhof.
- **Zollstreit vor Grenzmarkt** (Kaltfrieden (Häfen)): Auf der Grenzstraße S45 nach Grenzmarkt verlangen bewaffnete Söldner der Freien Häfen Wegezoll von Ordenspilgern. Lohn: 40 Silber, Kaltfrieden-Lore. Gegner: Schmuggler. Wege: S45 Sigrunsheim – Grenzmarkt.
- **Der Flüchtling aus Eikmark** (Kaltfrieden (Kronreich)): Ein desertierter Hauptmann aus dem Kronreich versteckt sich in den Nadelwäldern nahe S29 und bietet Informationen über Jarl Ragnvalds Truppen. Lohn: 35 Silber, Kronreich-Lore. Gegner: Deserteure. Wege: S29 Brandstein – Sigrunsheim.
- **Vergiftete Quelle** (Kult-Spur): Sechs Kultisten der Bleichen Ewigkeit versuchen nachts, das heilige Wasser von Sigrunsquell (D42) mit Totenstaub zu entweihen. Lohn: Untoten-Bedrohung -3, 35 Silber. Gegner: Kultisten. Wege: D42 Sigrunsheim – Sigrunsquell.
- **Der Pakt der alten Quellen** (Weltkonflikt (Zwerge)): In einer Felsgrotte nahe Sigrunsquell finden sich Zwergenrunen, die erklären, warum die unterirdischen Wasseradern seit dem Ausbruch des Mutterbergs kochen. Lohn: 30 Silber, Welt-Lore (Zwerge). Gegner: Glutwurm. Wege: D42 Sigrunsheim – Sigrunsquell.
- **Die trockenen Brunnen im Südwesten** (Weltkonflikt (Orks)): Ein weitgereister Händler aus Grenzmarkt (S45) berichtet, dass die Orks der Staubreiter nur wegen der versiegten Brunnen nach dem Erdbeben in den Krieg ziehen. Lohn: 25 Silber, Welt-Lore (Orks). Wege: S45 Sigrunsheim – Grenzmarkt.
- **Runenfresser im Nadelwald** (Bestiarium): Runenfresser zerstören die Schutzsteine entlang der Straße S41 nach Lichtheim. Lohn: 40 Silber, Runen-Amulett. Gegner: Runenfresser. Wege: S41 Lichtheim – Sigrunsheim.
- **Ascheregen auf den Gerstenfeldern** (Nacht des Erwachens): Hilf den Bauern von Gerstenhof, die Felder von Vulkanasche zu reinigen und Aschenkrähen zu vertreiben. Lohn: 20 Silber, +5 Glaube. Gegner: Aschenkrähen. Wege: D41 Sigrunsheim – Gerstenhof.
- **Die gesegneten Banner von Sigrunsheim** (Gewichtig): Weihe die Kriegsbanner des Ordens in Sigrunsquell und entsende Boten über S46 nach Wachtfeuer. Stärkt die Moral der Paladine in Akt 4. Lohn: +10 Glaube; Moral-Bonus im Großen Thing (Akt 4). Gegner: Kultisten. Wege: D42 Sigrunsheim – Sigrunsquell, S46 Sigrunsheim – Wachtfeuer.

### Sigrunsquell (Dorf, D42, Glaube, Stufe 2-5 für Orden-Helden)
- **Die stummen Pilger** (Dorfauftrag): Entlarve drei als Pilger verkleidete Spione, die das Quellheiligtum auskundschaften. Lohn: 25 Silber, +5 Glaube. Gegner: Spione. Wege: D42 Sigrunsheim – Sigrunsquell.

### Gerstenhof (Dorf, D41, Gerste, Stufe 2-5 für Orden-Helden)
- **Wölfe am Mühlbach** (Dorfauftrag): Vertreibe ein Rudel Grauwölfe, das die Kornsäcke am Bachlauf bedroht. Lohn: 20 Silber, +4 Glaube. Gegner: Grauwölfe. Wege: D41 Sigrunsheim – Gerstenhof.

### Thorvaldsklipp (stadt, Stufe 1-5 für Orden-Helden)
- **Der Aufstieg zum Gebetsfels** (Fraktion): Sichere den vereisten Pilgerpfad D43 zum Gebetsfels gegen Schneeschleicher. Lohn: +7 Glaube, 25 Silber. Gegner: Schneeschleicher. Wege: D43 Thorvaldsklipp – Gebetsfels.
- **Wolle und Hammelfleisch** (Dorf-Verbindung): Schütze die Hirten von Kliffhof (D44) vor einem hungrigen Frostbären. Lohn: 25 Silber, +5 Glaube, Wollmantel. Gegner: Frostbär. Wege: D44 Thorvaldsklipp – Kliffhof.
- **Der Knoten der Bergwege** (Fraktion): Stelle die weggespülten Wegweiser und Schutzhütten entlang der Straßen S38 (Glutberg) und S33 (Eiswacht) wieder her. Lohn: 30 Silber, +6 Glaube. Gegner: Grauwölfe. Wege: S38 Glutberg – Thorvaldsklipp, S33 Eiswacht – Thorvaldsklipp.
- **Geschmuggelte Kronwaffen** (Kaltfrieden (Kronreich)): Ein Waffenschmuggler aus dem Kronreich verkauft gestohlene Reichsschwerter an Wegelagerer auf S30. Lohn: 40 Silber, Breitschwert. Gegner: Schmuggler. Wege: S30 Brandstein – Thorvaldsklipp.
- **Der falsche Reliquienhändler** (Kaltfrieden (Häfen)): Ein Händler aus den Freien Häfen bietet gefälschte Runenamulette aus Tranvik an. Lohn: 35 Silber, +4 Glaube. Gegner: Schmuggler.
- **Schatten am Gebetsfels** (Kult-Spur): Neun Kultisten der Bleichen Ewigkeit versuchen nachts, die uralten Gebetsrunen auf D43 mit schwarzer Asche unlesbar zu machen. Lohn: Untoten-Bedrohung -3, 40 Silber. Gegner: Kultisten. Wege: D43 Thorvaldsklipp – Gebetsfels.
- **Die Inschrift der Alten** (Weltkonflikt (Untote/Zwerge)): Am Gebetsfels entzifferst du eine uralte Chronik über den ersten Pakt zwischen Zwergen und Menschen gegen die Untoten im hohen Norden. Lohn: 25 Silber, Welt-Lore. Wege: D43 Thorvaldsklipp – Gebetsfels.
- **Klippenwyrm an der Steilwand** (Bestiarium): Ein Klippenwyrm blockiert die Straße S40 nach Glutvik. Lohn: 50 Silber, Wyrmleder-Rüstung. Gegner: Klippenwyrm. Wege: S40 Glutvik – Thorvaldsklipp.
- **Aschesturm auf den Gipfeln** (Nacht des Erwachens): Rette verschüttete Bergwächter nach einem Ascheregen und bekämpfe Stollenkriecher. Lohn: 30 Silber, +5 Glaube. Gegner: Stollenkriecher. Wege: S38 Glutberg – Thorvaldsklipp.
- **Die Signalglocke von Thorvaldsklipp** (Gewichtig): Repariere die große Sturmglocke auf den Klippen, damit Glutberg, Eiswacht und Nordwacht bei Angriffen sofort gewarnt werden. Lohn: Untoten-Bedrohung -3; Schutz vor Hinterhalten im Kerngebirge. Gegner: Eishauer. Wege: S38 Glutberg – Thorvaldsklipp, S33 Eiswacht – Thorvaldsklipp, S44 Nordwacht – Thorvaldsklipp.

### Gebetsfels (Dorf, D43, Glaube, Stufe 1-5 für Orden-Helden)
- **Die erloschenen Kerzen** (Dorfauftrag): Bringe geweihtes Wachs zum Gipfelschrein und vertreibe Aschenkrähen. Lohn: 20 Silber, +6 Glaube. Gegner: Aschenkrähen. Wege: D43 Thorvaldsklipp – Gebetsfels.

### Kliffhof (Dorf, D44, Schafe, Stufe 1-5 für Orden-Helden)
- **Die verlorene Herde** (Dorfauftrag): Finde die verirrten Schafe im Nebel und wehre Grauwölfe ab. Lohn: 20 Silber, +4 Glaube. Gegner: Grauwölfe. Wege: D44 Thorvaldsklipp – Kliffhof.

### Wachtfeuer (stadt, Stufe 2-5 für Orden-Helden)
- **Bauholz für die Palisaden** (Fraktion): Sichere den Holztransport aus Holzfällerby über D45 für die Befestigungen an der Ostgrenze. Lohn: 25 Silber, +6 Glaube. Gegner: Grauwölfe. Wege: D45 Wachtfeuer – Holzfällerby.
- **Korn aus dem Wachthof** (Dorf-Verbindung): Schütze die wenigen Kornfelder des Ordens bei Wachthof (D46) vor Plünderern. Lohn: 25 Silber, +6 Glaube. Gegner: Wegelagerer. Wege: D46 Wachtfeuer – Wachthof.
- **Die Grenze nach Bernsvik** (Kaltfrieden (Häfen)): Auf der Grenzstraße S47 nach Bernsvik überfallen Schmuggler eine Ordenskarawane mit Bernsteintalismanen. Lohn: 45 Silber, Kaltfrieden-Lore. Gegner: Schmuggler. Wege: S47 Wachtfeuer – Bernsvik.
- **Der Deserteur aus Haraldstad** (Kaltfrieden (Kronreich)): Ein entlaufener Soldat aus dem Kronreich berichtet von Unruhen und Kornknappheit im Süden. Lohn: 35 Silber, Kronreich-Lore. Gegner: Deserteure.
- **Verrat am Ostfeuer** (Kult-Spur): Sieben Kultisten der Bleichen Ewigkeit wollen den großen Wachturm von Wachtfeuer niederbrennen, um die Verbindung nach Bernsvik (S47) abzuschneiden. Lohn: Untoten-Bedrohung -3, 40 Silber. Gegner: Kultisten. Wege: S47 Wachtfeuer – Bernsvik.
- **Elfenholz und Menschenaxt** (Weltkonflikt (Elfen)): Ein alter Holzfäller in Holzfällerby (D45) zeigt dir ein versteinertes Stück Elfenholz aus dem Osten und erklärt den alten Streit um die Wälder. Lohn: 25 Silber, Welt-Lore (Elfen). Wege: D45 Wachtfeuer – Holzfällerby.
- **Kunde aus Draugrsund** (Weltkonflikt (Untote)): Ein Kaufmann aus Bernsvik (S47) bringt beunruhigende Berichte über untote Kriegsschiffe im Inneren Meer. Lohn: 30 Silber, Welt-Lore (Untote). Wege: S47 Wachtfeuer – Bernsvik.
- **Frostbär im Nadelwald** (Bestiarium): Ein riesiger Frostbär blockiert die Straße S27 nach Aschenkloster. Lohn: 45 Silber, Frostbären-Rüstung. Gegner: Frostbär. Wege: S27 Aschenkloster – Wachtfeuer.
- **Aschenregen im Waldtal** (Nacht des Erwachens): Vulkanasche vergiftet die Bäche im Tal; besorge Frostlilien zur Reinigung des Wassers. Lohn: 25 Silber, 2x Heilmittel. Gegner: Schneeschleicher. Wege: D46 Wachtfeuer – Wachthof.
- **Die Wacht an der Oststraße** (Gewichtig): Errichte einen befestigten Außenposten auf der Grenzstraße S47 nach Bernsvik. Lohn: Reisen auf S47 kosten 1 Vorrat weniger; Verhandlungsbonus in Bernsvik. Gegner: Wegelagerer, Schmuggler. Wege: S47 Wachtfeuer – Bernsvik.

### Holzfällerby (Dorf, D45, Holz, Stufe 2-5 für Orden-Helden)
- **Die umgestürzten Kiefern** (Dorfauftrag): Räume die Straße nach einem Sturm frei und wehre ein Rudel Grauwölfe ab. Lohn: 20 Silber, +5 Glaube. Gegner: Grauwölfe. Wege: D45 Wachtfeuer – Holzfällerby.

### Wachthof (Dorf, D46, Korn, Stufe 2-5 für Orden-Helden)
- **Aschenkrähen auf der Saat** (Dorfauftrag): Vertreibe einen Schwarm Aschenkrähen von den kostbaren Kornfeldern. Lohn: 20 Silber, +5 Glaube. Gegner: Aschenkrähen. Wege: D46 Wachtfeuer – Wachthof.
