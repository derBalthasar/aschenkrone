# Errata und verbindliche Regel-Checkliste

Weltbuch von Odris · Aschenkrone · Rollenspiel 2.0. Vorgabe von Henry, 17. 11. 2026, als Ergänzung zum Stand `main` 5593cbd.

Diese Seite bereinigt Widersprüche zwischen den Teilen I bis VI des Weltbuchs und verhindert unlösbare Spielzustände. Wo ältere Tabellen oder Entwurfsnotizen abweichen, gilt diese Errata. Die Seitenangaben beziehen sich auf das Weltbuch von Odris (Word-Fassung).

## 1. Teil I (S. 4) · Grundidee

- Die Entwurfsoptionen A (Erlöschende Sonne), B (Der tote Gott) und C (Steigende Nebelflut) sind verworfen und kein Teil der Spielmechanik.
- Odris hat einen normalen Tag-Nacht-Wechsel. Vampire der Erinnernden kämpfen tagsüber 25 % schwächer. Es gibt keine globale Licht- oder Nebelressource.
- Die „Götterknochen“ in der Knochenschlucht der Orks sind ein uralter Mythos.

## 2. Teil V (S. 159) · Relikte der letzten Stunde

Sind vor dem Endkampf mehrere Bruchstück-Völker ausgelöscht (Orden der Flamme, Hüter des Weltenbaums, Freie Häfen beziehungsweise Schattenblüte), reicht Serathias letztes Wort nicht, um alle drei Bruchstücke von Morbius’ Namen zu ersetzen.

Wird ein Bruchstück-Volk vernichtet, bleibt sein Bruchstück als unzerstörbares Welt-Relikt an seinem Ursprungsort. Jeder andere lebende Held kann es durch eine Erkundung bergen:

| Bruchstück | Fundort |
| --- | --- |
| Das Feuer | In der erloschenen Asche auf dem Gipfel des Glutbergs |
| Das Laub | In der verkohlten Wurzelhalle von Ylvenor |
| Die Schrift | In den versiegelten Gewölben der Bibliothek von Eryndor |

## 3. Teil II und V (S. 36, 105, 159) · Volksziel und Welt-Sieg

- Die Siegbedingung eines Volks (Vereinigung der drei Fraktionen und Bannen der unmittelbaren Bedrohung) beendet das Spiel nicht. Sie schaltet die Weltquest „Das Ende der Nacht“ frei.
- „Ork-Bedrohung 0“ bedeutet für Menschen, Elfen und Zwerge nicht die Ausrottung aller Orks, sondern das dauerhafte Bannen der Überfallgefahr: durch einen Sieg über Staubreiter oder Aschenclan oder durch einen Friedensvertrag mit den Grünen Bannern. So bleibt das Ahnenfeuer der Orks als zweiter Weg zum Herz des Berges erhalten, ohne dass Elfen und Zwerge sich gegenseitig blockieren.

## 4. Teil VI (S. 163–179) · Bestiarium-Stufen 1–20

Alle Stufenangaben aus dem früheren 100-Stufen-Entwurf werden auf die Erfahrungsstufen 1–20 (Teil IV, S. 122) gebracht:

| Gebiet | Stufe | Akt |
| --- | --- | --- |
| Kronreich, Freie Häfen und Innere See | 1–6 | Akt 1–2 |
| Land des Weltenbaums und Küsten der Zwerge | 6–11 | Akt 2–3 |
| Ghor-Mahr, Ork-Lande und Tiefer Stollen | 11–15 | Akt 3–4 |
| Ordensland (Eispass, Glutberg) und Eryndor | 15–20 | Akt 5 bis Weltquest |

Alphatiere ohne eigene Werte (zum Beispiel Skarn, Mutter Tiefe, Kharrak, Der Weiße Hirsch) nutzen die Formel für Anführer aus Teil IV (S. 146): LP = 30 × Gebietsstufe, Schaden = 4 + Gebietsstufe, 2 Aktionen pro Runde. Im Spiel liefert das `kampf.alphaWerte(gebietsstufe, helden)`.

## 5. Teil II (S. 30, 70, 101) · Kult der Bleichen Ewigkeit

- Der Kult operiert als organisierte Fraktionsbedrohung (Zellen, Verderbnis-Wert, die drei Grabwächter) ausschließlich in den drei Menschenfraktionen: Kronreich, Orden der Flamme, Freie Häfen.
- Kontakte zwischen Zwergen oder Schattenblüte und den Untoten beschränken sich auf einzelne Schmuggler und Bestechung durch die Erinnernden. Sie erzeugen keinen Kult-Wert und keine Draugr-Unterwanderung.

## 6. Teil II (S. 33, 84) · Seezugang für Binnenfraktionen

Erobert oder unterwirft eine Fraktion ohne eigene Küste (vor allem Aschenclan oder Tiefes Königreich) eine Hafenstadt (blauer Kartenpunkt), übernimmt sie sofort deren Werften und Flotte. Überfahrten über das Innere Meer und das Nordmeer sind für die Weltquest damit immer möglich.

## 7. Teil III und IV (S. 109, 119, 145) · Klassensystem

- Die Klassen der Tiefgräber (S. 119) lauten wie im Kampfdokument (S. 145): Krieger = Hauer, Wächter = Grubenwächter, Späher = Kohlenwerfer, Magier = Erzspürer, Heiler = Grubenbader, Schurke = Tunnelräuber. Im Spiel stehen sie so in `spiel/klassen.js`.
- Die Regel „Höchstens ein Meisterheld pro ehemaliger Fraktion“ gilt nur für den Strategiemodus. Im Einzelspieler-Rollenspiel darf der Hauptheld nach der Vereinigung seines Volkes immer zur Meisterklasse aufsteigen (Bannerjarl, Immergrüner Sänger, Glutkönig, Siegelmeister, Vollendeter).

## Technische Kurz-Checkliste

| Punkt | Regel | Stand im Spiel |
| --- | --- | --- |
| Grundwerte | Stärke, Geschick, Intelligenz, Willenskraft, Charisma. Start 10, +2 Volk, +1 Fraktion, +2 Klasse, 5 frei = 60 Punkte, höchstens 20. Schwellen: bis 8 = −1, 9–15 = 0, 16–19 = +1, 20 = +2 | umgesetzt (`spiel/klassen.js`, `regeln.modifikatoren`) |
| Fertigkeiten | Nahkampf, Fernkampf, Magie, Verteidigung, List, Führung, Mut. 18 Punkte, die 2 Hauptfertigkeiten mindestens 3. Grenze durch Grundwert: bis 7 → 2, 8–11 → 3, 12–15 → 4, ab 16 → 5 | umgesetzt (`regeln.grenzen`) |
| Erfahrungsstufe | 1–20, 100 × n EP. Schaltet Fähigkeiten (Stufe 1, 3, 6, 10, 15, 20), LP, Ausdauer und Mana frei | umgesetzt (`spiel/kampf.js`) |
| Queststufe | Akt 1–5. Spezialisierung A/B ab Akt 3 (+1 Grundwert, +1 Fertigkeitspunkt → 19), Meisterklasse nach der Vereinigung (+2 Grundwerte, +1 Fertigkeitspunkt → 20) | umgesetzt (`rules.specialize`, `rules.ascend`) |
| Weltgleichgewicht | 5 Krisenleisten 0–100, 100 = Niederlage. Ohne Eingriff drücken Gegenkräfte Werte über 45–55 jede Runde um 3 bis 5 | Weltbuch, noch nicht im Spielstand |
| Knotennetz | 15 Hauptstädte (je 3 Dörfer) und 150 Städte (je 2 Dörfer) = 165 Hauptknoten und 345 Dörfer | Weltbuch, noch nicht im Spiel |
