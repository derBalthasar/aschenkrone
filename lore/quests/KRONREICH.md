# Kronreich – Hauptquest und Nebenquests

Stand: 18. 11. 2026. Grundlage ist die Ausarbeitung von Gemini (Quelltext unverändert in `quellen/gemini/`).

**Entscheidungen Henry (18. 11. 2026):**
1. Die Fraktionsreihe folgt **Geminis Aufbau**: Akt 1, dann Akt 2 und 3 als Schwester-Zweige in freier Reihenfolge, dann Akt 4 mit der Volksquest und Akt 5 „Über das Innere Meer“. Damit ersetzt sie die Aktfolge aus dem Weltbuch (`lore/quellen/menschen.html`) und `lore/NACHT-DES-ERWACHENS.md`. Logikfehler bei anderen Fraktionen und Völkern werden später behoben.
2. Die Spezialisierung folgt Gemini: Nach beiden Schwester-Zweigen wählt der Held „Eiserne Krone“ oder „Banner der Glut“.
3. Die Stufen folgen Gemini, bis Stufe 20 (eigene Tabelle `kampf.questStufenFraktion.kronreich`). Ausnahme bei den Schwester-Zweigen: **Der zuerst gespielte Zweig hat Stufe 6–10, der zweite 11–15**, egal ob Häfen oder Glutberg zuerst kommen (`nebenquests.zweigStufen`).
4. Der Bleiche Skalde wird in Akt 4 entdeckt, damit die Bedrohung durch die Untoten erklärt ist. **Der Skalde ist Erzpriester Thorvald vom Glutberg.**
5. Geheim bleibt nur die Identität der Stillen Feder.
6. Die Fraktions-Spezialisierung kommt **zusätzlich** zur Spezialisierung der Klasse.
7. **Runenwaffen darf das Kronreich tragen, Glutwaffen nicht.**
8. Akt 5: Das Ziel der Überfahrt ist **frei wählbar**. Elfen, Orks und Zwerge kann man als Verbündete gewinnen oder unterwerfen. Wer zum Kontinent der Untoten segelt, um die Untoten-Bedrohung zu vernichten, wählt den extrem schweren Weg.
9. Keine zwei Späher unter den Begleitern: Wulfgar bleibt Späher (im Kronreich „Steppenreiter“), Fenris wird Krieger (Huskarl). Von Henry bestätigt (18. 11. 2026).

| Teil | Stand im Spiel |
| --- | --- |
| Nebenquests: 11 Städte mit je 10 Aufträgen, 23 Dörfer, insgesamt 136 | Aushang im Stadt-Hub (lesbar, noch nicht spielbar) |
| Hauptquest Akt 1–5, Spezialisierung, Begleiter | Plan im Stadt-Hub unter „Krise und Aufhänger“ (lesbar, noch nicht spielbar). Akttitel stehen in `spiel/startpunkte.js`. |

Daten: `spiel/nebenquests-daten.js`, erzeugt von `quellen/nebenquests-erzeugen.cjs`.

## Hauptquest „Eine Krone, ein Volk“ (Kapitel 1, etwa 11 Stunden)

### Prolog „Feuer über Westvik“ (spielbar)
Erntefest in Westvik, Überfall der Rostsegel, Entscheidung über den Korn-Tribut, Flucht nach Kronhall, wo König Harald IV. zusammenbricht.

### Akt 1 „Der Thron wankt“ (Stufe 1–5, Kernland und Westmark)
1. **Der Schwur am Krankenbett** (Kronhall): Kronprinzessin Astrid ernennt den Spieler zum Reichsboten. Am Bett des todkranken Königs Harald IV. fällt ein stummer Heiler auf, der graue Asche verbrennt. Aufbruch nach Hagenfels zu Jarl Ragnvald.
2. **Das verbrannte Korn** (Hagenfels und Westmark): Jarl Ragnvald fordert einen Beweis der Stärke, bevor er Truppen für die Krone stellt. Der Held verteidigt die Höfe der Westmark gegen Deserteure und Plünderer.
3. **Feuer an der Westmark** (Westvik und Steinwacht): Konfrontation mit Kapitän Urgash und der Vorhut der Rostsegel an der Westküste.

Entscheidung:
- **A:** Die Rostsegel blutig zurückschlagen und Ragnvald warnen. Ork-Bedrohung −5. Ragnvald stellt Truppen, misstraut aber dem Hof in Kronhall.
- **B:** Waffenstillstand mit Urgash (40 Silber) und den Hof schützen. Ruhe an der Westküste. Astrid behält die volle Kontrolle, der Kultist bleibt länger unentdeckt.

### Akt 2/3 „Die abtrünnigen Häfen“ (Stufe 6–10 als erster Zweig, 11–15 als zweiter; empfohlen als 2., mit den Freien Häfen)
Orte: Grenzmarkt, Perlvik, Zollholm, Salzwacht.
1. **Der verschlossene Hafen** (Grenzmarkt, Perlvik): Verhandlung mit Thingsprecherin Solveig Valsdottir und dem Gildenrat über Schiffe und Nachschub, trotz der Kronschuld.
2. **Schmuggel im Nebel** (Nebelvik, Zollholm): Der Held hebt eine Schmugglerbucht aus und stellt Aethari-Schriften und nördlichen Totenstaub sicher.
3. **Der Vertrag von Perlvik** (Perlvik): Einigung mit den Freien Häfen über Bau und Bereitstellung einer Flotte.

Entscheidung:
- **A:** Reichsthing und Handelsprivilegien (80 Silber). Handelsflotte und Gold-Boni, friedlicher Bund.
- **B:** Den Gildenrat mit den Schmuggelbeweisen erpressen und die Werften besetzen. Sofort Kriegsschiffe in Salzwacht, aber Unruhe in den Häfen.

### Akt 2/3 „Der Schwur am Glutberg“ (Stufe 6–10 als erster Zweig, 11–15 als zweiter; empfohlen als 3., mit dem Orden der Flamme)
Orte: Eiswacht, Aschenkloster, Glutberg.
1. **Der Zug über den Eispass** (Eiswacht, Pass P02): Eskorte eines Korntrecks (kostet 20 Korn) über den Eispass zu Ser Bjarne vom Eispass.
2. **Die flackernde Wacht** (Aschenkloster): Der Held befreit ein Ordenskloster, das vom Kult der Bleichen Ewigkeit und von Draugr bedrängt wird, und begegnet Seherin Freydis.
3. **Der Schwur am Glutberg** (Glutberg): Bündnis mit Hochmeisterin Ragna Glutherz und Erzpriester Thorvald in der Halle der Ewigen Flamme. Hier begegnet der Held dem Skalden, ohne es zu wissen.

Entscheidung:
- **A:** Ein gleichberechtigter Schildbund gegen den Norden. Schaltet Ordensritter und Glutrunen-Waffen frei (Runenwaffen, im Kronreich erlaubt).
- **B:** Den Orden unter das Kriegsrecht der Krone stellen. Schaltet Belagerungswaffen und Disziplin-Boni frei, senkt aber die Moral des Ordens.

### Fraktions-Spezialisierung (nach Abschluss beider Schwester-Zweige, zusätzlich zur Klassen-Spezialisierung)
- **Eiserne Krone:** schwere Infanterie, höhere Rüstung, −25 % Kornkosten auf Reisen.
- **Banner der Glut:** runengeschmiedete Waffen (+Feuerschaden gegen Untote), Söldner-Boni. Es sind Runenwaffen, also im Kronreich erlaubt.

### Akt 4 „Das Alte Reich ersteht neu“ (Stufe 16–18, mit der Volksquest „Das Alte Reich“)
1. **Entlarvung des Bleichen Skalden** (Katakomben von Kronhall): Der stumme Heiler am Krankenbett wird als Grabwächter des Kults entlarvt, seine 8-köpfige Zelle wird zerschlagen. Seine Briefe führen zum Bleichen Skalden selbst: **Erzpriester Thorvald vom Glutberg**. Seit über hundert Jahren hält ihn die Totenmagie des Nordens am Leben. Als Preis dafür schwächt er die Ewige Flamme, und je schwächer sie brennt, desto stärker werden die Untoten im hohen Norden. Der Held stellt ihn in den Katakomben (Endgegner). Untoten-Bedrohung −15 (Welt-Hebel nach `lore/ERRATA.md`).
2. **Das Große Thing** (Kronhall): Astrid, Jarl Ragnvald, Solveig Valsdottir und Ragna Glutherz vereinen die drei Menschenfraktionen. Der Spieler steigt zum Bannerjarl auf.
3. **Rüstung der Armada** (Salzwacht, Perlvik): Fertigstellung der Kriegsschiffe, Verladung von Korn und Truppen für die Überfahrt.

### Akt 5 „Über das Innere Meer“ (Stufe 19–20)
1. **Auslaufen der Reichsflotte** (Perlvik, Salzwacht): Die vereinte Armada der Menschen verlässt den Nordwesten von Odris.
2. **Totenschiffe im Nebel** (Inneres Meer): Abwehr eines Angriffs untoter Kriegsschiffe aus dem hohen Norden auf hoher See.
3. **Der Brückenkopf** (fremde Küste, frei wählbarer Kontinent): Eroberung eines Küstenabschnitts und Errichtung des ersten Feldlagers. Das Ziel wählt der Spieler frei: Elfen im Osten, Orks im Südwesten oder Zwerge im Südosten, jeweils als Verbündete oder um sie zu unterwerfen. Wer die Untoten-Bedrohung an der Wurzel vernichten will, segelt zum Kontinent der Untoten im hohen Norden; das ist der schwerste Weg. Ende von Kapitel 1.

## Begleiter

Die Gruppengrenze im Spiel liegt bei 3 Gefährten plus Held (`rules.partyLimit`).

| Name | Rolle | Klasse | Anwerbung | Auftrag | Fähigkeit |
| --- | --- | --- | --- | --- | --- |
| Sigrid Eisenschild | Schildmaid / Tank | Wächter (Burgvogt) | Kronhall, Akt 1 | kronhall_q10 „Die eiserne Schuld“ | Unbrechbarer Schildwall |
| Wulfgar Rossbrecher | Kavallerist / Späher | Späher (Steppenreiter) | Rosshag, Akt 2 | rosshag_q10 „Der Eid der Reiter“ | Sturmangriff der Steppe |
| Fenris Ulfsson | Meister-Bogenschütze | Krieger (Huskarl) | Ulfsborg, Akt 3 | ulfsborg_q10 „Der Jäger von Wolfstal“ | Blattschuss aus dem Hinterhalt |

## Folgen für andere Fraktionen (später beheben)

- Staubreiter Akt 3 „Feuer an der Westmark“ spiegelt den Kronreich-Akt 2 aus dem Weltbuch. Im Kronreich ist das jetzt Akt 1, Schritt 3.
- Orden Akt 2 „Verräter im Feuer“ enttarnt den Bleichen Skalden. Er ist nun festgelegt: Erzpriester Thorvald.
- Die Volksquest „Das Alte Reich“ liegt jetzt im Kronreich-Akt 4. Bei Orden und Häfen folgt sie noch nach Akt 5.
- Die allgemeine Stufentabelle (`kampf.questStufen`) gilt weiter für alle anderen Fraktionen.

## Prüfvermerke zu den Nebenquests

Die Texte sind wörtlich übernommen. Korrigiert ist nur ein Bestiariumsname: „Irrglühte“ heißt im Kanon „Irrglut“. Alle Orte, Dörfer, Erträge und Weg-Kennungen S, P, M und D sind gegen das Knotennetz geprüft (`spiel/nebenquests.test.cjs`). Im Spiel als Hinweis am Auftrag markiert:

- hagenfels_q07: Die Glutstahl-Klinge ist eine Glutwaffe und im Kronreich nicht tragbar. Sie taugt nur als Beute zum Verkauf. Runengegenstände (Runen-Dolch, Runentalisman, Runensattel) sind erlaubt. Das Glutpanzer-Wams ist eine Rüstung aus Käferpanzer und keine Waffe.
- westvik_q03 (geklärt, Henry 18. 11. 2026): Der Salzkarren nimmt den Landweg über S23 nach Steinwacht und weiter über S21 nach Rosshag und S18 nach Kronhall.
- rosshag_q02 (geklärt, Henry 18. 11. 2026): Der Titel lautet „Pferdediebe der Staubreiter“.
- Riffhaie, Wrackkrabben und Bären stehen im Bestiarium, aber nicht in der Liste „Kronreich und Eispass“.
- Gemini schreibt `noTimeLimit`. Das Questlog des Spiels kennt jedoch Fristen in Runden.

## Nächste Bauschritte

1. Akt 1 „Der Thron wankt“ ist spielbar (Kronhall, Hagenfels, Westvik). Als Nächstes folgen die Akte 2 und 3.
2. Nebenquests spielbar machen (Annahme, Ablauf, Kampf oder Probe, Lohn, Questlog).
