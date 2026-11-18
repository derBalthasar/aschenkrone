# Kronreich – Hauptquest-Plan und Nebenquests

Stand: 18. 11. 2026. Grundlage: Ausarbeitung von Gemini (Quelltext unverändert in `quellen/gemini/`), geprüft gegen `lore/NACHT-DES-ERWACHENS.md`, `lore/quellen/menschen.html`, `lore/KLASSEN.md`, `spiel/kampf.js` (Stufentabelle) und `spiel/knoten-daten.js`.

**Entscheidung Henry (18. 11. 2026):** Es bleiben die fünf Akte aus dem Weltbuch. Geminis Schritte und Entscheidungen werden auf diese Akte verteilt. Die Überfahrt aus Geminis Akt 5 „Über das Innere Meer“ wird ein Ausblick auf die Volksquest und kein eigener Akt.

| Teil | Stand |
| --- | --- |
| Nebenquests: 11 Städte mit je 10 Aufträgen, 23 Dörfer, insgesamt 136 | im Spiel als **Aushang** im Stadt-Hub (lesbar, noch nicht spielbar), Daten in `spiel/nebenquests-daten.js` |
| Hauptquest Akt 1–5 | nur Plan (dieses Dokument) |
| Begleiter Sigrid, Wulfgar, Fenris | nur Plan, im Spiel noch nicht angelegt |

## Hauptquest „Eine Krone, ein Volk“

Die Stufen folgen der Tabelle in `spiel/kampf.js`. Der Held erreicht Kronhall nach dem Prolog mit Erfahrungsstufe 3. Die Spezialisierung wählt jede Klasse nach Akt 3 selbst (`lore/KLASSEN.md`). Geminis Fraktions-Spezialisierungen „Eiserne Krone“ und „Banner der Glut“ werden daher nicht übernommen. Sie können später als Lohn für Entscheidungen dienen, falls Henry das will.

### Prolog „Feuer über Westvik“ (spielbar)
Erntefest in Westvik, Überfall der Rostsegel, Entscheidung über den Korn-Tribut (Marken `nacht-kronreich-tribut` / `nacht-kronreich-verweigert`), Flucht nach Kronhall, wo Harald IV. zusammenbricht.

### Akt 1 „Der Thron wankt“ (Stufe 3–5)
1. **Der Schwur am Krankenbett** (Kronhall): Kronprinzessin Astrid ernennt den Helden zum Reichsboten. Am Bett von Harald IV. fällt ein stummer Heiler auf, der graue Asche verbrennt.
2. **Das verbrannte Korn** (Hagenfels und Höfe der Westmark): Jarl Ragnvald fordert einen Beweis der Stärke, bevor er Truppen für die Krone stellt. Der Held verteidigt die Höfe gegen Deserteure und Plünderer.
3. **Der stumme Heiler** (Kronhall, neu aus Geminis Akt 4, Schritt 1, vorgezogen): Laut Weltbuch wird der Kultist am Krankenbett in Akt 1 entlarvt, oder er entkommt.

Entscheidung: Entlarven (die Zelle in den Katakomben wird früh zerschlagen) oder entkommen lassen (der Heiler taucht als Grabwächter in Akt 5 wieder auf).

### Akt 2 „Feuer an der Westmark“ (Stufe 5–8)
1. **Feuer an der Westmark** (Westvik und Steinwacht): Der Held stellt Kapitän Urgash und die Vorhut der Rostsegel an der Westküste. Der Tribut aus dem Prolog wird dabei aufgedeckt oder bleibt geheim.

Entscheidung (aus Geminis Akt 1):
- **A: Die Rostsegel blutig zurückschlagen und Ragnvald warnen.** Ork-Bedrohung −5. Ragnvald stellt Truppen, misstraut aber dem Hof in Kronhall.
- **B: Waffenstillstand mit Urgash (40 Silber) und den Hof schützen.** Ruhe an der Westküste. Astrid behält die volle Kontrolle.

Anschluss an Nebenquests: „Das Bollwerk der Westmark“ (steinwacht_q10) und „Die Kette über die Bucht“ (westvik_q10) wirken in diesem Akt.

### Akt 3 „Die abtrünnigen Häfen“ (Stufe 8–11, danach Spezialisierung)
1. **Der verschlossene Hafen** (Grenzmarkt, Perlvik): Der Held verhandelt mit Thingsprecherin Solveig Valsdottir und dem Gildenrat über Schiffe und Nachschub, trotz der Kronschuld.
2. **Schmuggel im Nebel** (Nebelvik, Schmugglerbucht): Der Held hebt die Bucht aus und stellt Aethari-Schriften und Totenstaub aus dem Norden sicher.
3. **Der Vertrag von Perlvik** (Perlvik): Einigung über eine Flotte.

Entscheidung (Weltbuch: „erobern oder auf dem Reichsthing zur Rückkehr bewegen“):
- **A: Reichsthing und Handelsprivilegien (80 Silber).** Handelsflotte und Gold-Boni (Vorrat der Häfen), friedlicher Bund.
- **B: Den Gildenrat mit den Schmuggelbeweisen erpressen und die Werften besetzen.** Sofort Kriegsschiffe in Salzwacht, aber Unruhe in den Häfen.

Anschluss: „Der Kornschwur von Haraldstad“ (haraldstad_q10) bringt einen Verhandlungsbonus.

### Akt 4 „Der Schwur am Glutberg“ (Stufe 11–14)
1. **Der Zug über den Eispass** (Kronhall, Pass P02, Eiswacht): Der Held eskortiert einen Korntreck (kostet 20 Korn) zu Ser Bjarne vom Eispass.
2. **Die flackernde Wacht** (Aschenkloster): Ein Ordenskloster wird vom Kult der Bleichen Ewigkeit und von Draugr bedrängt. Der Held bricht die Belagerung und begegnet Seherin Freydis. Er sieht, wie schwach die Ewige Flamme seit der Nacht brennt.
3. **Der Schwur am Glutberg** (Glutberg): Bündnis mit Hochmeisterin Ragna Glutherz und Erzpriester Thorvald in der Halle der Ewigen Flamme.

Entscheidung (Weltbuch: „vom einfachen Lehnseid zur echten Gefolgschaft“):
- **A: Ein gleichberechtigter Schildbund gegen den Norden.** Bringt Ordensritter. Für Glutrunen-Waffen ist zu prüfen, ob Helden des Kronreichs sie führen dürfen, denn dort ist Magie verboten.
- **B: Den Orden unter das Kriegsrecht der Krone stellen.** Bringt Belagerungswaffen und Disziplin-Boni, senkt aber die Moral des Ordens.

### Akt 5 „Das Alte Reich ersteht neu“ (Stufe 14–16, leitet die Volksquest ein)
1. **Entlarvung des Grabwächters** (Katakomben von Kronhall): Nur wenn der stumme Heiler in Akt 1 entkommen ist. Seine 8-köpfige Zelle wird zerschlagen. Der Bleiche Skalde bleibt unerkannt.
2. **Das Große Thing** (Kronhall): Astrid, Jarl Ragnvald, Solveig Valsdottir und Ragna Glutherz treffen sich.
3. **Rüstung der Armada** (Salzwacht, Perlvik): Die Kriegsschiffe werden fertiggestellt, Korn und Truppen werden verladen.

Anschluss: „Ragnvalds geheime Truppen“ (hagenfels_q10) bringt hier Verstärkung durch die Kronwache.

### Ausblick: Volksquest „Das Alte Reich“ (Stufe 16–18) und Überfahrt
Das Weltbuch legt fest: Vereinigung durch Eroberung oder Diplomatie, beide Bedrohungsleisten senken, Aufstieg zum Bannerjarl, Entlarvung des Bleichen Skalden. Aus Geminis Akt 5 kann hier die Überfahrt einfließen: Auslaufen der Reichsflotte aus Perlvik oder Salzwacht, Abwehr untoter Totenschiffe im Nebel, ein Brückenkopf an fremder Küste. Ziel und Meer (Nordmeer zum hohen Norden der Untoten oder Inneres Meer) muss Henry noch festlegen.

## Begleiter (Vorschlag)

Die Gruppengrenze im Spiel liegt bei 3 Gefährten plus Held (`rules.partyLimit`). Die drei neuen Begleiter würden neben die vorhandenen Gefährten treten (Iven, Sela, Heda, Neri, Tovin, Oren, Mira, Bryn, Kelda).

| Name | Rolle | Anwerbung | Auftrag | Fähigkeit |
| --- | --- | --- | --- | --- |
| Sigrid Eisenschild | Schildmaid (Wächter) | Kronhall, Akt 1 | kronhall_q10 „Die eiserne Schuld“ | Unbrechbarer Schildwall |
| Wulfgar Rossbrecher | Kavallerist, Späher | Rosshag, Akt 2 | rosshag_q10 „Der Eid der Reiter“ | Sturmangriff der Steppe |
| Fenris Ulfsson | Meister-Bogenschütze | Ulfsborg, Akt 3 | ulfsborg_q10 „Der Jäger von Wolfstal“ | Blattschuss aus dem Hinterhalt |

Offen: Wulfgar und Fenris wären beide Späher. Gefährten sollen aber unterschiedliche Klassen haben.

## Prüfvermerke zu den Nebenquests

Die Texte sind wörtlich übernommen. Korrigiert wurde nur ein Bestiariumsname: Gemini schreibt „Irrglühte“, im Kanon heißt das Wesen „Irrglut“. Alle Orte, Dörfer, Erträge sowie alle Weg-Kennungen S, P, M und D wurden gegen das Knotennetz geprüft (`spiel/nebenquests.test.cjs`). Diese Punkte bleiben offen und stehen im Spiel als Hinweis am Auftrag:

- Runen- oder Glutgegenstände als Lohn im Kronreich, obwohl dort Magie verboten ist: kornwik_q06 Runentalisman, rosshag_q03 Runensattel, eikmark_q06 Runen-Dolch, eikmark_q07 Glutpanzer-Wams, hagenfels_q07 Glutstahl-Klinge.
- westvik_q03: Von Westvik führt keine Straße direkt nach Kronhall. Der Weg geht über S23 nach Steinwacht.
- rosshag_q02: Der Titel nennt die Rostsegel (Orkpiraten), der Text aber Kundschafter der Staubreiter zu Lande.
- Riffhaie, Wrackkrabben und Bären stehen im Bestiarium, aber nicht in der Liste „Kronreich und Eispass“.
- Gemini schreibt `noTimeLimit`. Das Questlog des Spiels kennt jedoch Fristen in Runden. Ob Nebenquests eine Frist bekommen, ist noch offen.

## Nächste Bauschritte

1. Nebenquests spielbar machen: Für jeden Auftrag braucht es Annahme, Ablauf, Kampf oder Probe, Lohn und einen Eintrag im Questlog. Gemini liefert bisher nur Titel, Text und Lohn. Für den Ablauf eignet sich das Antwortformat aus der Ortsliste (Auftraggeber, Aufhänger, 3 bis 5 Schritte, Entscheidung).
2. Akt 1 als spielbare Szenenfolge ab dem Prologende in Kronhall bauen.
