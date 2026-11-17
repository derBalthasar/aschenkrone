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

## 8. Teil V und VI (S. 161, 163) · Reise- und Zufallsbegegnungsregel

Bei jeder Bewegung von einem Knoten zum nächsten macht das Spiel genau einen Reisewurf. Er hängt vom Kantentyp und vom Verhalten der regionalen Fauna (Teil VI) ab.

| Kantentyp | Ruhige Reise | Scheu-Begegnung | Jäger-Hinterhalt |
| --- | --- | --- | --- |
| Sichere Kernland-Straße (eigene Fraktion) | 70 % (Atmosphäre, Wetter) | 20 % (Probe auf List oder Fernkampf für Trophäen, Nahrung, Flora) | 10 % (rundenbasierter Kampf) |
| Grenzland, Wildnis, Seewege | 40 % (auch Handelsereignis) | 20 % (auch Kult- oder Gerüchte-Ereignis, beeinflusst Weltleisten) | 40 % (auch Fraktionspatrouille) |

- **Spezialkanten** (Pässe, Tiefer Stollen, ungesicherte Routen): Revier-Gegner (Flussschnapper, Schlundtroll, Moosriese, Glutwurm) erscheinen nicht zufällig. Sie sind fest an Kanten gebunden, blockieren die Route oder fordern beim ersten Durchqueren einen Pflichtkampf und lassen danach einzigartige Trophäen fallen.
- **Alphatiere** ersetzen zu 10 % einen normalen Revier- oder Jäger-Gegner in ihrer Heimatregion oder werden über Gerüchte im Stadt-Hub als Jagdquest freigeschaltet.
- **Ausweichen:** Helden mit List 3 oder mehr sowie Späher und Schurken weichen einem Jäger-Hinterhalt vor Kampfbeginn aus. Sie verlieren dadurch die Kampf-EP (10 EP × Gegnerstufe + 50 EP).

**Im Spiel (17. 11. 2026):** Auf der Reisekarte Kornwik bis Glutberg sind die Kanten Kernland (Kornwik–Heidvang, Heidvang–Eiswacht, Eiswacht–Glutberg), Grenzland (Eichenwald, Bohlenweg, Zollstelle, Klippenweg) oder Spezialkante (Glutmine, Felsrippe, Trollschlund, Eispass, Runentor). Gewürfelt wird nur auf bekannten Wegen, nicht beim ersten Weg der Handlung. Auf Spezialkanten bleiben die Gegner der Handlung (Glutkäfer, Felsgreif, Schlundtroll) die festen Revier-Gegner. Jäger sind Grauwölfe, Galgenkrähen und im Moor die Irrglut; Graufang ist das Alphatier (Anführer, Stufe 4). Zufallskämpfe setzen keine Handlungsmarken und geben jedes Mal EP. Scheue Tiere: Probe auf List oder Fernkampf gegen 12, Erfolg bringt Galgenwurz.

## 9. Teil III und V (S. 108, 146, 161) · Begleiter und Rekrutierung

- Gruppe aus höchstens 4 Helden: Hauptheld und bis zu 3 Begleiter. Der Prolog wird allein gespielt. Überzählige Begleiter warten im Stadt-Hub und können dort vor jeder Reise getauscht werden.
- **Anwerben im Stadt-Hub:** In Hauptstädten und Hafenstädten stehen Rekruten der Fraktion bereit (zum Beispiel Steppenreiter im Kronreich, Seeschütze in den Freien Häfen, Grünheiler am Laubmarkt). Einmalige Gebühr 50 Silber oder 15 Fraktionsressource. Charisma 16–19 senkt die Kosten um 10 %, Charisma 20 um 20 %.
- **Volksgrenzen:** Untote nehmen keine Lebenden auf und umgekehrt. Orks und Zwerge sind nie gleichzeitig in der Gruppe (außer vorübergehend in der Weltquest unter Vermittlung von Menschen oder Elfen).
- **Story- und Prologgefährten:** Freie Häfen (Prolog Kap. 2): befreite Elfenhändler stellen einen elfischen Späher oder Heiler. Dornenklingen (Prolog Kap. 2): der gerettete Seemann aus Perlvik, wenn das Nordkap nicht sofort niedergebrannt wurde. Tiefgräber (Prolog Kap. 3 und Akt 2): Überlebende des Einsturzes am Mutterberg als Hauer oder Grubenwächter.
- **Bündnisgesandte:** Ab einem offiziellen Bündnis zwischen Völkern (ab Akt 3 oder nach der Vereinigung) darf der Hauptheld einen Elite-Begleiter des Partnervolks aufnehmen.
- **Stufen:** Begleiter erhalten dieselben EP wie der Hauptheld und starten beim Anwerben eine Erfahrungsstufe unter ihm, mindestens auf Stufe 1.
- **Boss-Skalierung:** Anführer und Endgegner haben bei 1 Held 25 %, bei 2 Helden 50 %, bei 3 Helden 75 % und bei 4 Helden 100 % ihrer LP.

**Im Spiel (17. 11. 2026, Henrys Entscheidungen):** Die Gebühr wird in Silber bezahlt. Söldner gibt es in den Städten mit Zentrallager: Steppenreiter Arne (Krieger) in Kornwik und Heidvang, Grenzbognerin Ylva (Späher) in Kornwik, Heidvang und Eiswacht, Flammenknecht Hal (Wächter) und Feldscherin Ute (Heiler) in Eiswacht und Glutberg. Einmal bezahlt, kommen sie nach dem Verabschieden kostenlos wieder mit. Verabschieden geht am Wachhof und in jeder Stadt mit Zentrallager. Die Volksgrenzen gelten für Söldner und Gesandte; die neun Story-Gefährten bleiben für alle Völker über ihre Aufträge und Vorbehalte erreichbar. Begleiter-LP steigen um 2 je Erfahrungsstufe über 1 (Vorschlagswert). Prologgefährten und Bündnisgesandte warten auf die Akte, in denen sie auftreten, und stehen in der [Bauliste](HUB-BAULISTE.md).

## 10. Teil III und IV (S. 108, 122, 163) · Ausrüstung, Inventar und Handwerk

- **Ausrüstung im Spiel (Henrys Entscheidung 17. 11. 2026):** Es bleibt die Figur aus dem Inventar-Hub mit acht Plätzen: Kopf, Hals (Amulett, Talisman), Körper (Rüstung), Beine, rechte Hand (Waffe), linke Hand (Schild, Fokus, Zweitwaffe; Zweihandwaffen belegen beide Hände) und zwei Ringe. Dazu kommt als neunter Platz der **Gürtel mit 2 Ladungen**. Begleiter tragen dieselben acht Plätze; den Gürtel führt die Spielfigur für die Gruppe.
- **Gürtel:** Hält bis zu 2 Verbrauchsgegenstände (Tränke, Gifte, Bomben, Kräuter). Im Kampf wirken sie ohne Ausdauer, Mana und ohne die Aktion der Runde zu verbrauchen. Gegenstände aus dem Rucksack bleiben wie bisher als Aktion „Gegenstand“ nutzbar.
- **Rucksack:** 20 Plätze + Stärke-Bonus (bis 22 bei Stärke 20). Gleiche Gegenstände stapeln sich zu höchstens 10 Stück je Platz. Die Gruppe teilt sich einen Rucksack.
- **Ausbau beim Sattler oder Gildenhändler** einer Stadt mit Zentrallager, dauerhaft, je +10 Plätze:

| Stufe | Name | Plätze | Silber | oder Material |
| --- | --- | --- | --- | --- |
| 1 | Verstärkte Reisetasche | 30 | 30 | 2 × Wolfspelz (Leder) |
| 2 | Gilden-Packtasche | 40 | 75 | 2 × Borstenfell (Schnapperpanzer) |
| 3 | Zwergischer Runen-Tornister | 50 | 150 | 1 × Trollblut (Rochenhaut); nur mit Handel mit Zwergen oder Freien Häfen |

  Handel gilt als gegeben für Zwerge, die Freien Häfen selbst oder ab 25 Ruf bei den Freien Häfen. Leder, Schnapperpanzer und Rochenhaut gibt es noch nicht als Gegenstand.
- **Zentrallager:** unbegrenzt und kostenlos in jeder Stadt mit Lager.
- **Handwerk:** Trophäen werden bei Schmieden und Runenmeistern zu Waffen, Schilden, Rüstungen, Ringen und Amuletten (Keilerhauer → Waffe +1, Schnapperpanzer → Schild oder Rüstung +1, Luchsauge → List-Ring +1, Krakenauge → Magie-Amulett +1). Flora wird bei Heilern (Feldscher, Grünheiler, Schiffsarzt, Kelchmischerin) zu Gürtelgegenständen (Galgenwurz → Heiltrank, Tränenmoos → Gegengift, Schwefelblüte → Glutbombe). Im Spiel gibt es bisher nur den Harzverband; der Ausbau steht in der Bauliste.
- **Schadensformel (Teil IV):** Endschaden = Fähigkeit oder Grundangriff + Fertigkeit + Grundwert-Bonus + Waffen- und Nebenhandbonus − (Rüstung + Schild des Ziels), mindestens 1, außer Fähigkeiten wie Durchschlag ignorieren Rüstung oder Schild. Schwere Rüstung verlangt Stärke 12, sonst −1 auf Ausweichen und Geschick.

## Ergänzung zu Teil I bis IV · Stadt-Hub, Knotennetz und Fraktionsressourcen

Henrys Entwurf vom 17. 11. 2026 legt die Strategieebene fest. Sie steht im Weltbuch und ist im Spiel noch nicht gebaut; die Schritte stehen in der [Bauliste](HUB-BAULISTE.md).

- **Fraktionsressourcen:** Bleiche Krone Seelen (statt Körper), Fäulnisbrut Fleisch, Erinnernde Blut; Menschen Korn, Gold, Glaube. Im Spiel so umgesetzt.
- **Stadt-Hub:** Jeder der 165 Hauptknoten (15 Hauptstädte, 150 Städte) und jedes Dorf (3 je Hauptstadt, 2 je Stadt) nutzt dieselbe Oberfläche: Welt-Leisten, Fraktionsvorrat, aktive Marken und Krise, dazu die Aktionen Hofstaat und Diplomatie, Aufhänger und Aktquest, Zentrallager mit Versorgung und Rast, Held und Meisterpfad, Aufbruch über die Knotenkarte. Sinkt die Fraktionsressource auf 0 oder steigt eine Krisenleiste auf 100, endet das Spiel mit einer Niederlage.
- **Reisen über Kanten:** Jede Bewegung prüft die Fraktionsressource (Korn im Kronreich, Gold für Söldner und Schiffe in den Freien Häfen, Glaube beim Orden, Fleischverfall bei der Fäulnisbrut). Kritisch niedrige Vorräte drohen mit Hungeraufstand, Bankrott oder Zerfall. Verliert eine Stadt ihre Dörfer, sinkt ihre Produktion. Ein feindlicher Knoten startet den Rundenkampf.
- **Spezialkanten der Weltkarte:** Blaue Häfen (Seewege, zum Beispiel Westvik, Perlvik, Zhar-Kesh, Laubmarkt; das Kronreich braucht für „Orks an der Westküste“ erst Schiffe der Freien Häfen), rote Dreiecke (Pässe wie Eispass, Zollpass, Grauer Pass mit Wachen, Zoll und Sperren, zum Beispiel sperrt das Tiefe Königreich ab Erzfieber 50 den Zollpass), orange gestrichelt (Tiefer Stollen zwischen Stollenmund und Ghor-Mahr, hohe Proben auf Willenskraft oder Intelligenz, beeinflusst die Glutleiste).
- **EP-Quellen:** 10 EP × Gegnerstufe je besiegtem Feind + 50 EP je gewonnener Schlacht; 300 EP je abgeschlossenem Questakt; Welt-Hebel (zum Beispiel der Bleiche Skalde entlarvt: Untote −15, Hildebrands Wahl) schalten Queststufen und Boni frei. Ein Bündnisvertrag bringt so viele EP wie die Eroberung eines Knotens, ohne die Moral des Volkes zu senken.
- **Heldenentwicklung:** Die Oberfläche zeigt 5 Grundwerte mit Schwellen, 7 Fertigkeiten mit Grundwert-Grenze, Spezialisierung A oder B ab Akt 3 und die Klassenfähigkeiten der Stufen 1–20. Das Charakterfenster des Spiels deckt das bereits ab.

## Technische Kurz-Checkliste

| Punkt | Regel | Stand im Spiel |
| --- | --- | --- |
| Grundwerte | Stärke, Geschick, Intelligenz, Willenskraft, Charisma. Start 10, +2 Volk, +1 Fraktion, +2 Klasse, 5 frei = 60 Punkte, höchstens 20. Schwellen: bis 8 = −1, 9–15 = 0, 16–19 = +1, 20 = +2 | umgesetzt (`spiel/klassen.js`, `regeln.modifikatoren`) |
| Fertigkeiten | Nahkampf, Fernkampf, Magie, Verteidigung, List, Führung, Mut. 18 Punkte, die 2 Hauptfertigkeiten mindestens 3. Grenze durch Grundwert: bis 7 → 2, 8–11 → 3, 12–15 → 4, ab 16 → 5 | umgesetzt (`regeln.grenzen`) |
| Erfahrungsstufe | 1–20, 100 × n EP. Schaltet Fähigkeiten (Stufe 1, 3, 6, 10, 15, 20), LP, Ausdauer und Mana frei | umgesetzt (`spiel/kampf.js`) |
| Queststufe | Akt 1–5. Spezialisierung A/B ab Akt 3 (+1 Grundwert, +1 Fertigkeitspunkt → 19), Meisterklasse nach der Vereinigung (+2 Grundwerte, +1 Fertigkeitspunkt → 20) | umgesetzt (`rules.specialize`, `rules.ascend`) |
| Weltgleichgewicht | 5 Krisenleisten 0–100, 100 = Niederlage. Ohne Eingriff drücken Gegenkräfte Werte über 45–55 jede Runde um 3 bis 5 | Weltbuch, noch nicht im Spielstand |
| Knotennetz | 15 Hauptstädte (je 3 Dörfer) und 150 Städte (je 2 Dörfer) = 165 Hauptknoten und 345 Dörfer | Weltbuch, noch nicht im Spiel |
| Reise | 1 Wurf je Kante: Revier = feste Blockade, Jäger = Kampf, Scheu = Probe auf List oder Fernkampf | umgesetzt für die Reisekarte Kornwik–Glutberg (`rules.travelEncounter`) |
| Gruppe | 1 Hauptheld + höchstens 3 Begleiter, Kompatibilitätsprüfung, Boss-LP 25/50/75/100 % | umgesetzt (`rules.hire`, `rules.compatible`, `kampf.gegnerWerte`) |
| Ausrüstung | 8 Plätze der Figur + Gürtel mit 2 Ladungen, Rucksack 20 + Stärke-Bonus bis 50, Stapel 10, Lager unbegrenzt | umgesetzt (`rules.belt`, `rules.bagLimit`, `rules.upgradeBag`) |
