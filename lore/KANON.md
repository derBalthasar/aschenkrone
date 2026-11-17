# Weltbuch und Kampagnenanschluss

## Quellenstand

Die [Errata und verbindliche Regel-Checkliste](ERRATA.md) (Henry, 17. 11. 2026) geht älteren Tabellen und Entwurfsnotizen des Weltbuchs vor.

Die Welt heißt **Odris** (Festlegung von Henry, 17. 11. 2026). Das Bestiarium heißt deshalb „Bestiarium von Odris“.

Das Weltbuch im Spiel verarbeitet das Weltbuch 2.0, die fünf Völkerdokumente und die sechs Karten und Bildtafeln vom Desktop. Die Fraktionsbeschreibungen und Stadtverzeichnisse stehen in `voelker.js`. Sie folgen den Völkerdokumenten. Die Karte `weltkarte-verbindlich-mit-orten.png` liefert die räumliche Übersicht. Ihr sichtbarer Titel „Entwurf 3“ stammt aus der Vorlage mit eingezeichneten Orten. Die frühere Gebietsübersicht ohne Städtebeschriftung liegt unter den Bildtafeln.

- Die Untoten-Tafeln datieren die Nacht des Ersten Blutes unter anderem auf 500, 1800 oder etwa 2000 v. E. Die Völkertexte führen sie um 4400 v. E., Aldrics Ritual um 2500 v. E. und das erste Fleischritual um 900 v. E. Diese Daten gelten für die Spielchronik.
- Eryndor und der Blutbrunnen gehören den Erinnernden. Der Hof der Bleichen Krone herrscht vom Palast der Tausend Stimmen. Eine Zeile in der Gleichgewichtstabelle des Weltbuchs verortet den Hof in Eryndor. Die Ortslisten und das Untoten-Dokument ordnen beide Sitze eindeutig zu.
- Das Elfen-Dokument beschreibt den Wald der Hüter bis zur Ostküste. Auf der Karte reicht dort die Schattenblüte weiter nach Norden. Städte stehen bei ihren Fraktionen gemäß Völkerdokument. Eine verbindliche Grenzlinie für die Küste bleibt offen.
- Die drei Weltursprünge im Weltbuch (erlöschende Sonne, toter Gott, steigende Nebelflut) sind laut [Errata](ERRATA.md) verworfen. Odris hat einen normalen Tag-Nacht-Wechsel, die Götterknochen der Orks sind ein Mythos. Die Legende vom Ersten Toten gehört zur Untoten-Lore und bleibt eine Legende innerhalb der Welt.

## Konflikte für spätere Quests

Diese Entwicklungen stammen aus den Quellen. Sie sind als Kampagnenmaterial verfügbar und liegen im Browser-Spiel noch außerhalb des spielbaren Abschnitts.

- **Menschen.** Die Thronfolge zwischen Astrid und Ragnvald bestimmt, wie das Kronreich zum Reichsthing kommt. Der Orden folgt Freydis’ Spur zum Bleichen Skalden. Die Freien Häfen können über Flotte und Handelsrechte Frieden oder Bruch mit dem Kronreich beeinflussen.
- **Untote.** Die Krone bindet die Geister Vaelthars und die Seelen der Kultisten, die sich als Gefäße anbieten. Unter Eryndor schläft Serathia. Der Umgang mit dem Blutbrunnen kann ihr Erwachen beeinflussen. Die Gebundenen der Fäulnisbrut entstehen auf verseuchtem Land und zerfallen außerhalb davon.
- **Elfen.** Die Dornenklingen halten die Fäulnis am Nordkap auf. Iseldes Spur verbindet die schwarzen Blüten mit den Wurzeln des Weltenbaums. Die Entscheidung über die Ernte betrifft Schattenblüte und Baum zugleich. Wurzelschwur und Grüner Gesang sind mögliche Ziele für eine spätere Kampagne.
- **Orks.** Die Schlacht am Grauen Pass, der Bannerschwur und der Streit zwischen Durza und Kragh bestimmen die Richtung der Clans. Das Ahnenfeuer verbindet den Konflikt mit Ghor-Mahr und der Gefahr eines zweiten Aschenwinters.
- **Zwerge.** Hildebrands Entscheidung am Tiefen Stollen verändert Erzabbau und Beben. Zollpass, Siegelrune und Schwur am Amboss greifen diesen Konflikt aus drei Fraktionsperspektiven auf.

Das Weltbuch führt fünf Startwerte für eine künftige Kampagne um 612 n. E. auf. Untoten-Bedrohung 35, Ork-Bedrohung 40, Glut des Mutterbergs 30, Erzfieber 45 und Welke 30. Der Tiefe Stollen treibt über das Erzfieber die Glut von Ghor-Mahr. Starke Glut lässt Ascheregen fallen und verstärkt die Welke des Weltenbaums. Für die Einigung eines Volkes und die großen Rituale sieht das Weltbuch Entscheidungen des Spielers vor. Diese Werte sind Entwurfsdaten für die Kampagne und gehören noch nicht zum Spielstand.

## Der Prolog auf der Weltkarte

- Kornwik und Heidvang liegen im Kronreich. Eiswacht, Eispass und Glutberg gehören zum Gebiet des Ordens der Flamme. Der Eichenwald, der Bohlenweg und die Nebenwege am Pass sind Schauplätze der regionalen Reisekarte. Das untere Runentor am Glutberg ist eine Signalstation. Die Ewige Flamme brennt weiterhin.
- Die Glut der Spielfigur ist eine besondere Gabe für alle Herkünfte und Klassen. Sie wirkt über das Gleichgewicht zwischen Erneuerung und Zerstörung. Die Flammenmagie des Ordens stützt sich auf Glauben und Runen. Die genaue Herkunft der Gabe bleibt in der Handlung offen.
- Die Grenzwache von Eiswacht und die Bergwacht von Glutberg haben jeweils eigenen Ruf. Die übrigen sechs Rufwerte zeigen Fraktionen aus den Völkerdokumenten. Die internen Schlüssel bleiben gleich, damit alte Spielstände gültig bleiben:

| Schlüssel | Früherer Name | Angezeigte Fraktion | Begründung |
| --- | --- | --- | --- |
| `groves` | Ewige Haine | Kronreich | Saat bei Kornwik und Holzrechte bei Heidvang betreffen Kornkammer und Grundherren des Kronreichs. |
| `houses` | Vampirhäuser | Die Erinnernden | Kennwort der Erinnernden aus Eryndor. |
| `order` | Orden | Orden der Flamme | Runentor und Flammenrunen am Glutberg. |
| `conclave` | Konklave | Hüter des Weltenbaums | bisher ohne Rufereignis |
| `legion` | Knochenlegion | Hof der Bleichen Krone | bisher ohne Rufereignis |
| `league` | Splitterliga | Freie Häfen | bisher ohne Rufereignis |

## Startpunkte der Fraktionen

Seit dem 17. 11. 2026 beginnt jede spielbare Fraktion in ihrem eigenen Gebiet (Vorgabe von Henry). Alle 15 Prologe spielen in der Nacht des Erwachens im Herbst 612 n. E., wie in [Die Nacht des Erwachens](NACHT-DES-ERWACHENS.md) festgelegt. Die Orte stehen auf der verbindlichen Karte. Daten und Texte liegen in `spiel/startpunkte.js`, die Prologbilder sind Kartenausschnitte unter `spiel/prolog/start/`.

| Volk | Fraktion | Startort | Zuflucht im Morgengrauen |
| --- | --- | --- | --- |
| Menschen | Kronreich | Westvik | Kronhall |
| Menschen | Freie Häfen | Perlvik | Zollholm |
| Menschen | Orden der Flamme | Aschenkloster | Glutberg |
| Elfen | Dornenklingen | Hochdorn | Hochdorn |
| Elfen | Schattenblüte | Velasyr | Velasyr |
| Elfen | Hüter des Weltenbaums | Ylvenor | Waldrand |
| Zwerge | Tiefes Königreich | Ambossheim | Ambossheim |
| Zwerge | Tiefgräber | Kluftheim | Stollenmund |
| Zwerge | Runenschmiede | Essenfels | Essenfels |
| Orks | Grüne Banner | Kragmar | Kragmar |
| Orks | Staubreiter | Ur-Taal | Zhar-Kesh |
| Orks | Aschenclan | Aschenthron | Kraterpfad am Ghor-Mahr |
| Untote | Fäulnisbrut | Tal von Nachtquell | Madenmoor |
| Untote | Hof der Bleichen Krone | Palast der Tausend Stimmen | Seelenhafen |
| Untote | Die Erinnernden | Eryndor | Eryndor |

Jeder Prolog hat drei Bilder und drei spielbare Kapitel: Heimat mit zwei Erkundungen, ein Kampf gegen einen Prologgegner, dann die Entscheidung (Marken `nacht-…`) und der Angriff, der den Helden in die Zuflucht treibt. Startort und Zuflucht haben ein Zentrallager. Bis die Fraktionsreihen spielbar sind, führt die Reise danach zur Szene „Ankunft im Kronreich“ bei Kornwik mit den Startvorteilen je Herkunft und weiter in den bestehenden Abschnitt. Spielstände im Erwachen bei Kornwik bleiben gültig.

## Bestiarium und Völker

Die Gebiete im Bestiarium folgen seit dem 17. 11. 2026 den Kontinenten der verbindlichen Karte. Namen und Spielwerte der Kreaturen sind unverändert.

- **Kronreich und Eispass** sowie **Ordensland** liegen auf dem Kontinent der Menschen.
- **Eryndor** gehört zum Kontinent der Untoten.
- **Ghor-Mahr und die Ork-Lande** ersetzt Sulkhar. Rotsteppe, Glasödland und Kettenminen heißen jetzt Weiten, Glasebene und Schlackenschmieden. Die Knocheninseln kommen als Gebiet hinzu. Das Konklave und die Dunkelelfen entfallen.
- **Land des Weltenbaums** ersetzt Ylvenhain und liegt im Osten. Die Schattenschlange, die Bleiche Königin und der Schattenlotus sind aus dem früheren Schattensumpf in die Nebelmarschen der Schattenblüte umgezogen.
- **Meere und Inseln** ersetzt die Splitterinseln. Die Freien Häfen, die Riffe um die Zollinseln und die Funkeninsel der Runenschmiede bilden dieses Gebiet. Die Splitterliga entfällt.
- Für die Zwerge gibt es noch kein eigenes Bestiarium-Gebiet.
- Die Reisekarte ist nach der Weltkarte ausgerichtet. Heidvang liegt westlich von Kornwik, Eiswacht nördlich davon und Glutberg im Nordosten.

## Quelltexte im Weltbuch

Seit dem 17. November 2026 stehen das Weltbuch 2.0 und die fünf Völkerdokumente vollständig unter `lore/quellen/`. Die Seiten sind aus den Word-Dateien erzeugt und enthalten die Detailkarten, das Gleichgewicht der Welt, Spielwerte, Städte, Dörfer, Hauptquests und die Bildtafeln der Dokumente. Bilder, die schon unter `lore/` liegen, werden wiederverwendet. Neue Bilder liegen unter `lore/quellen/bilder/`. Die Spielregeln und Spielstände sind davon nicht betroffen.

## Begleiter und Aufnahmeaufträge

Die Gruppe führt höchstens drei Begleiter. Alle neun Figuren können am Wachhof von Eiswacht angesprochen werden, damit Reisen für persönliche Aufnahmeaufträge keine Abgabe verhindern. Bereits absolvierte Taten zählen nach Annahme des Auftrags. Aufnahme und erneute Aufnahme erfordern einen abgeschlossenen persönlichen Auftrag; ein Versprechen allein genügt nicht. Kelda akzeptiert alternativ einen Vertrag über 15 Silber mit späterer Zahlung. Der Betrag bleibt als Schuld gespeichert.

Die Herkunftsvorbehalte sind neue persönliche Charakterentscheidungen für das Spiel, keine aus den Quellen abgeleitete allgemeine Feindschaft zwischen Völkern: Iven verlangt von Vampiren und Erwachten 25 Ruf bei der Grenzwache. Mira reist nicht mit Erwachten und verlangt von Vampiren 15 Ruf beim Orden der Flamme. Neri verlangt von Orks nach einem persönlichen Grenzkonflikt 15 Ruf beim Kronreich. Grundlage der Fraktionsnamen und Hintergründe sind `voelker.js`, die Ordenssuche nach dem Kult der Bleichen Ewigkeit und die Unterscheidung von Bleicher Krone und Erinnernden. Misstrauen beginnt bei −10 Sympathie und kann durch den genannten Ruf überwunden werden; Miras persönliche Ablehnung bleibt bestehen.

Aufträge sind in `world.recruitmentQuests` hinterlegt. Hedas Rezept verarbeitet zwei Galgenwurz zu einem Harzverband. Sela erhält einen Glutfunken; Iven, Neri, Tovin, Oren und Bryn verlangen bestehende Rettungs-, Kampf- oder Weltentscheidungen. Mira verlangt Grenzwachenruf. Sympathieänderungen durch bekannte Entscheidungen erscheinen im Journal. Bei alten Spielständen bleiben Aufnahmeberechtigungen vorhandener Mitglieder erhalten. Überzählige Mitglieder warten am Wachhof, ihre Gegenstände bleiben im Vorrat.

## Questlog und Spielzugfristen

Das gemeinsame Questlog führt persönliche Aufnahmeaufträge, Weltaufträge von Runa, Ada, Enna und Torben sowie Keldas offene Soldzahlung. Es trennt offene, erfüllte und gescheiterte Aufträge und speichert Auftraggeber, Beginn und Frist. Fristen sind Spielzüge, keine reale Wartezeit. Gültige Entscheidungen einschließlich Reisen, Kampfrunden, Herstellung sowie Annahme, Abgabe und Soldzahlung verbrauchen je einen Zug. Lesen, Ausrüsten, Handel, Gruppenverwaltung, reine Gespräche und Browserpausen verbrauchen keinen Zug. Ein neu angenommener Auftrag erhält seine volle Frist nach der Annahme. Eine erfolgreiche Abgabe im letzten verbleibenden Zug zählt noch.

Begleiteraufträge laufen nach 25–100 Zügen aus; die jeweilige Frist steht vor der Annahme. Nach Fristablauf sind sie gescheitert, kosten 15 Sympathie und sperren die Aufnahme. Bereits erfüllte Aufnahmeaufträge verfallen nicht. Keldas aufgeschobener Sold wird nach 30 Zügen überfällig und kostet einmalig 20 Sympathie; die Schuld bleibt bezahlbar. Eine späte Zahlung löscht den gescheiterten Friststatus nicht. Weltaufträge bleiben nach Fristablauf als gescheitert im Log, unabhängig davon, ob die Handlung später noch eine Rettung erlaubt. Bestehende Szenen, Entscheidungen und Beute werden dadurch nicht entfernt.

Alte Spielstände ohne Zeitdaten starten bei Spielzug 0; bestehende offene Aufträge erhalten eine volle Frist. Laden, Filtern und erneutes Öffnen setzen gespeicherte Fristen nicht zurück. Das System ist mit dem Inventar-Hub und dem Klassensystem aus `main` (Stand `e8054e3`) zusammengeführt.

## Eigene Begleiter-Lebenspunkte und Zustände

Begleiter besitzen gespeicherte Lebenspunkte (Iven 32, Sela 24, Heda 26, Neri 28, Tovin 26, Oren 24, Mira 34, Bryn 28, Kelda 36). Alte Spielstände starten vorhandene Begleiter mit vollen LP. Die Gegner wechseln pro Gegenangriff durch die aktiven Gruppenmitglieder; jeder Treffer benutzt nur die Rüstung seines Ziels. Schutzfähigkeiten können weiterhin den Gegenangriff abschwächen. Bei 0 LP setzen Begleiter aus; Rast und normale Heilung beleben sie nicht wieder. Verabschieden und Wiederaufnehmen setzen ihre LP nicht zurück. Die Spielfigur bleibt der Anker des Spiels: Ihre 0 LP führen weiterhin zur Niederlage.

Heilung und Gegenstände haben ein gemeinsames, auswählbares Gruppenziel im Kampf, Vorrat und Inventar-Hub. Automatische Heiler helfen dem lebenden Mitglied mit dem geringsten relativen LP-Stand. Ein Lebensfunke (20 Silber) belebt einen Begleiter mit aufgerundeten 35 % seiner maximalen LP; im Kampf handelt er ab der nächsten Runde. Brandbalsam (6 Silber), Gegengift (6 Silber) und Klartrank (8 Silber) entfernen Brand, Gift beziehungsweise Verwirrung. Alle vier Gegenstände gibt es bei Maren in der Zeugkammer. Sie werden nur bei wirksamer Anwendung verbraucht. Glutmittel bleiben der Spielfigur vorbehalten.

Brand kostet 2 LP, Gift 3 LP pro Kampfrunde; beide laufen höchstens drei Runden. Verwirrung dauert zwei Runden und lässt offensive beziehungsweise magische Aktionen aussetzen, ohne Glut zu verbrauchen. Heilmittel, Deckung und Flucht bleiben für die Spielfigur möglich. Glutkäfer verursachen Brand, Schlundtrolle Gift und Irrglut Verwirrung bei ungeschützten Gegenangriffen jeder zweiten Runde. Neue Effekte ticken erst in der Folgerunde; Heilmittel wirken vor dem nächsten Schaden. Effekte und LP bleiben zwischen Kämpfen und beim Laden erhalten; die Runden laufen außerhalb des Kampfes nicht weiter. Gefallene Begleiter verlieren ihre laufenden Effekte.
