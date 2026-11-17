# Bauliste · Stadt-Hub, Knotennetz und Strategieebene

Vorbereitet am 17. 11. 2026 auf Henrys Wunsch. Grundlage sind die [Errata](ERRATA.md) (Ergänzung zu Teil I bis IV sowie Punkte 8 bis 10) und das Weltbuch von Odris. Die Liste ordnet die Arbeit in Schritte, die jeweils einzeln spielbar und prüfbar sind. Jeder Schritt bekommt einen eigenen Pull Request.

Spielstände bleiben in jedem Schritt ladbar. Bestehende Szenen, Kämpfe, Gefährten, Inventar und Bestiarium werden erweitert, nicht ersetzt.

## Schritt 1 · Weltleisten und Fraktionsvorrat im Spielstand

- Fünf Krisenleisten in den Spielstand übernehmen (Untoten-Bedrohung 35, Ork-Bedrohung 40, Glut 30, Erzfieber 45, Welke 30; Startwerte aus dem Weltbuch).
- Fraktionsvorrat 0–100 je Fraktion (Korn, Gold, Glaube, Seelen, Fleisch, Blut, Dornholz, Nektar, Weltensaft, Herden, Beute, Ruhm, Hort, Erz, Runen). Klären, wie er sich zur bisherigen Kampfressource (+1 je Schlacht, Verstärkung) verhält.
- Gegenkräfte: Werte über 45–55 sinken ohne Eingriff jede Runde um 3 bis 5 (Gleichgewicht der Welt).
- Niederlage bei Leiste 100 oder Fraktionsvorrat 0, mit eigener Abschlussszene.
- Anzeige im Charakterfenster (Reiter „Stand“) und im Kopf des Hubs.
- Offene Frage an Henry: Was ist eine „Runde“ der Weltleisten (Spielzug, Reise, Akt)?

## Schritt 2 · Stadt-Hub als Oberfläche

- Eine Hub-Ansicht für Städte mit Zentrallager (heute Kornwik, Heidvang, Eiswacht, Glutberg und die Prolog-Lager).
- Kopfzeile: Ort, Jahreszeit (Herbst 612 n. E.), Weltleisten, Fraktionsvorrat, aktive Marken, aktive Krise.
- Fünf Aktionen: Hofstaat und Diplomatie, Aufhänger und Aktquest, Zentrallager mit Versorgung und Rast, Held und Meisterpfad (öffnet das Charakterfenster), Aufbruch (öffnet die Reisekarte).
- Söldnerwerbung, Rucksack-Ausbau und Handel aus der Szene in den Hub verlegen.
- Prüfen auf Handybreite und Ultrawide.

## Schritt 3 · Knotennetz statt fester Reisekarte

- Datenmodell: 15 Hauptstädte, 150 Städte, 345 Dörfer aus `lore/voelker.js` und der verbindlichen Weltkarte, mit Kanten und Kantentyp (Kernland, Grenzland, Seeweg, Pass, Tiefer Stollen).
- Die heutige Reisekarte Kornwik bis Glutberg wird ein Ausschnitt dieses Netzes; ihre Szenen bleiben.
- Karte in drei Stufen (Gebiet, Fraktion, Welt) aus PR #10 als Anzeige nutzen.
- Ressourcen- und Proviantprüfung bei jeder Kante (Hungeraufstand, Bankrott, Zerfall bei kritischem Vorrat).
- Spezialkanten: Häfen nur mit Schiffen, Pässe mit Wachen und Zoll, Zollpass ab Erzfieber 50 gesperrt, Tiefer Stollen mit Probe auf Willenskraft oder Intelligenz und Wirkung auf die Glutleiste.
- Errata 6: Erobert eine Binnenfraktion einen Hafen, übernimmt sie Werften und Flotte.

## Schritt 4 · Dörfer, Kontrolle und Eroberung

- Jede Hauptstadt hat 3, jede Stadt 2 Versorgungsdörfer. Verlorene Dörfer senken die Produktion.
- Status je Knoten: eigen, Partner, Vasall, feindlich, neutral.
- Feindlicher Knoten startet den Rundenkampf (Teil IV); Sieg erobert den Knoten.
- EP: Eroberung und Bündnisvertrag geben gleich viele EP; der Vertrag senkt die Moral des Volkes nicht.

## Schritt 5 · Diplomatie und Bündnisse

- Hofstaat: Bündnis schmieden (Partner-Status für den gemeinsamen Sieg) oder Grenzstädte unterwerfen (Vasall). Führung und Charisma beeinflussen die Chancen.
- Volksziel: Vereinigung der drei Fraktionen und Bannen der Bedrohung schaltet die Weltquest „Das Ende der Nacht“ frei (Errata 3). „Ork-Bedrohung 0“ heißt Bannen der Überfallgefahr, nicht Ausrottung.
- Bündnisgesandte (Errata 9): Nach einem Bündnis mit einem anderen Volk nimmt der Hauptheld einen Elite-Begleiter des Partnervolks auf. Die Volksgrenzen gelten auch für sie; in der Weltquest dürfen Orks und Zwerge unter Vermittlung von Menschen oder Elfen zusammen reisen.

## Schritt 6 · Gefährten aus den Prologen und Söldner aller Fraktionen

- Freie Häfen: befreite Elfenhändler stellen einen elfischen Späher oder Heiler (Prolog Kap. 2).
- Dornenklingen: der gerettete Seemann aus Perlvik, wenn das Nordkap nicht sofort niedergebrannt wurde.
- Tiefgräber: Überlebende des Einsturzes am Mutterberg als Hauer oder Grubenwächter (Prolog Kap. 3, Akt 2).
- Söldner in allen Hauptstädten und Hafenstädten (Seeschütze in den Freien Häfen, Grünheiler am Laubmarkt und weitere je Fraktion), mit Volk für die Volksgrenzen.
- Alternative Bezahlung mit 15 Fraktionsvorrat (braucht Schritt 1).

## Schritt 7 · Handwerk im Hub

- Schmied und Runenmeister: Trophäen zu Waffen, Schilden, Rüstungen, Ringen und Amuletten (Keilerhauer → Waffe +1, Schnapperpanzer → Schild/Rüstung +1, Luchsauge → List-Ring +1, Krakenauge → Magie-Amulett +1).
- Heiler (Feldscher, Grünheiler, Schiffsarzt, Kelchmischerin): Flora zu Gürtelgegenständen (Galgenwurz → Heiltrank, Tränenmoos → Gegengift, Schwefelblüte → Glutbombe, Silberfarn → Manatrank).
- Neue Gegenstände: Leder, Schnapperpanzer, Rochenhaut, Gifte und Bomben mit Wirkung im Kampf (zum Beispiel Krähenbeeren-Gift +3 Giftschaden für 3 Runden, Glutbombe 8 Feuerschaden).
- Schwere Rüstung verlangt Stärke 12, sonst −1 auf Ausweichen und Geschick.
- Wartet teilweise auf die Flora-und-Fauna-Ausarbeitung für alle Gebiete.

## Schritt 8 · Reisebegegnungen für alle Gebiete

- Regionale Tabellen für jedes Gebiet aus dem Bestiarium von Odris (Jäger, Revier, Scheu), sobald die Fauna aller Gebiete vorliegt.
- Revier-Gegner als feste Blockaden mit einmaligem Pflichtkampf und einzigartiger Trophäe.
- Alphatiere als Jagdquests über Gerüchte im Hub; Alphatiere ohne Werte nach `kampf.alphaWerte`.
- Ereignisse der Grenzland-Tabelle mit Wirkung auf die Weltleisten (Kultzellen, Gerüchte, Patrouillen).

## Schritt 9 · Tag und Nacht, Relikte und Endspiel

- Tag-Nacht-Wechsel im Spielstand; Vampire der Erinnernden kämpfen tagsüber 25 % schwächer (`kampf.tagesWert`).
- Relikte der letzten Stunde (Errata 2): Feuer am Gipfel des Glutbergs, Laub in der Wurzelhalle von Ylvenor, Schrift in der Bibliothek von Eryndor.
- Weltquest „Das Ende der Nacht“ und Endkampf gegen Morbius.

## Schon erledigt (17. 11. 2026)

- Technische Spezifikation (Henry, 17. 11. 2026), Schritte 1 bis 3 im Kern:
  - Fünf Weltleisten im Spielstand (Start 35/40/30/45/30). Eine Runde ist eine Reise im Knotennetz. Glut, Welke und Erzfieber steigen je Runde um 1 („jede Runde ein wenig“), Erzfieber ab 50 hebt die Glut um 1 mehr (ab 75 um 2), Glut über 50 die Welke. Danach greifen die Gegenkräfte (Untote ab 50 −5, Orks ab 55 −3, Glut ab 45 −3, Erzfieber ab 50 −3, Welke ab 45 −3), unter 20 steigt eine Leiste um 1, unter 10 um 2.
  - Fraktionsressource und Kampfressource sind ein Vorrat von 0 bis 100 (Start 42, alte Stände: 42 + bisheriger Kampfvorrat − 3). Im Kampf sinkt er nie unter 1. Niederlage bei Leiste 100 oder Vorrat 0 mit eigener Abschlussszene.
  - Knotennetz mit 510 Knoten aus der verbindlichen Karte; Dörfer mit Henrys Namen und Erträgen aus den Völkerdokumenten. Kanten automatisch aus den Kartennachbarn, dazu Seewege (15 Silber), Pässe (Zollpass ab Erzfieber 50 gesperrt) und der Tiefe Stollen (Probe, Glut +1).
  - Stadt-Hub mit Statusleiste, Krise und Aufhängern, Hofstaat (Handelsverträge, Söldner für Silber oder 15 Vorrat), Rast und Lager (Rast, Dorfertrag, Zentrallager, Rucksack), Held (Charakterfenster) und Aufbruch (Nachbarn mit Weg, Risiko und Kosten). Die vier Orte der Handlung (Kornwik, Heidvang, Eiswacht, Glutberg) führen zurück in ihre Szenen.
  - Charakterfenster: Reiter „Aufstieg“ mit Entwurfsmodus (Plus und Minus, „Änderungen speichern“, „Zurücksetzen“) für Stufenpunkte, Spezialisierung und Meisterklasse.
- Noch offen aus diesen Schritten: Hungeraufstand, Bankrott und Zerfall bei knappem Vorrat, Häfen eroberter Städte (Errata 6), Bündnisse und Vasallen, Revier-Gegner auf Knotenkanten.

- Errata 1–7 im Weltbuch, Meisterklasse im Einzelspiel immer erlaubt, Alphatier-Formel, Tagschwäche als Regeldaten.
- Reisebegegnungen auf der Reisekarte Kornwik bis Glutberg, Ausweichen ab List 3.
- Söldner mit Charisma-Rabatt und Volksgrenzen, Begleiter-EP, acht Ausrüstungsplätze für Begleiter.
- Gürtel mit 2 Ladungen, Rucksack 20 + Stärke-Bonus bis 50, Stapel zu 10, unbegrenztes Zentrallager.
- Bestiarium-Stufen auf 1–20.
