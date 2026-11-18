# Aschenkrone

Öffne [index.html](index.html) lokal im Browser, um das Rollenspiel zu starten. Das [Weltbuch](lore/index.html) enthält Karte, Völker, Fraktionen und Chronik.

Für die Mitarbeit gelten der [Git-Abgleich in der Arbeitsanweisung](AGENTS.md) und die [technische Übergabe](CLAUDE-UEBERGABE.md). Die [Arbeitsanweisung für Bestiarium-Modelle](quellen/arbeitsanweisung-modelle.pdf) liegt im Quellenordner.

Neue Mitwirkende und KI-Assistenten beginnen mit [CONTRIBUTING.md](CONTRIBUTING.md). Die verbindliche gemeinsame Arbeitsanweisung liegt in [AGENTS.md](AGENTS.md).

## Pixelkampf ausprobieren

Öffne [die Pixelkampf-Testszene](spiel/pixelkampf/index.html) oder wähle im Hauptmenü „Pixelkampf ausprobieren“. Die eigenständige Demo zeigt vier Gruppenmitglieder gegen drei Wölfe, Zielwahl, Nah- und Fernkampf, Magie, Heilung, Deckung und Wiederbelebung. „Wiederbelebung testen“ startet mit einer gefallenen Begleiterin. Jedes lebende Mitglied handelt einmal, danach die Gegner. Ein Einzelklick wählt das Ziel, ein weiterer auf die Aktion startet die Animation. Das Ergebnis bleibt bis zum Klick auf „Weiter“ stehen; auch Gegneraktionen werden einzeln bestätigt. Doppelklick oder Enter-Bestätigung sind nicht erforderlich. Der Geschwindigkeitsregler reicht von ×1 (Standard, bisherige Zeitlupe) bis ×5 (fünfmal schneller); die Animationen sind für diesen ausdrücklich gewünschten Animationstest standardmäßig eingeschaltet und lassen sich jederzeit ausschalten. Voreingestellt ist ×1: Nahkampf etwa 7,2 Sekunden, Fernkampf etwa 6 Sekunden. Auch Gehbewegung und Trefferblinken folgen dem gewählten Tempo. Talas Schwerthieb zeigt Ausholen, einen bewegten Schwertarm, eine diagonale Schnittspur beim Klingenkontakt und die Rückkehr; Zauberstab und Großstab bleiben dagegen auf ihrer Position: Stab anheben, Magie sammeln, Geschoss zum Ziel senden und Zauberwirkung zeigen. Sela nutzt einen blauen Stabzauber oder Runenfeuer, Heda einen goldenen Lichtzauber beziehungsweise grüne Heilmagie zum gewählten Verbündeten.

Die vereinfachten Demoregeln und originalen, im Canvas gezeichneten Pixelgrafiken sind ein Darstellungsprototyp. Es werden keine Spielstände gelesen oder gespeichert. Der gesamte Prototyp steckt in einer HTML-Datei und benötigt weder Build noch zusätzliche Pakete.

## Pixelgrafik im Spiel

Die regulären Kämpfe verwenden jetzt die Pixelbühne aus `spiel/pixelkampf.js`. Sie zeigt den gewählten Helden und bis zu drei Begleiter mit angelegten Waffen, Rüstung und Schild. Körperbau, Ohren, Bart, Hautfarbe und Kleidung unterscheiden die fünf Völker und neun Klassenprofile; die 15 Fraktionen liefern Farben und ihre 90 Klassentitel. Spezialisierung und Meisterrang erhalten zusätzliche Abzeichen. Die Figuren sind prozedural gezeichnete Varianten, keine 90 einzeln gezeichneten Spritebögen.

Schwert, Axt, Dolch, Speer, Bogen und Stab haben passende Bewegungen. Magische Klassen wirken Feuer-, Natur-, Seelen-, Licht- oder Runenzauber. Skalden spielen Kriegslieder, Pulvermeister werfen Sprengladungen, Feldscher verwenden Heilmittel. Kronreich und Freie Häfen erhalten dadurch keine reguläre Magie. Gegner greifen das tatsächlich vom Regelsystem bestimmte Gruppenmitglied an. Heilung, Wiederbelebung, Statusereignisse und kampfunfähige Figuren folgen ebenfalls den echten Kampfereignissen.

Die bestehende Kampfberechnung, Ausrüstung und Speicherdateien bleiben maßgeblich. Die Runde wird einmal berechnet und vor der Animation gespeichert. Die Bühne spielt anschließend die Ereignisse ab; „Weiter“ bestätigt jede Aktion. Tempo ×1 bis ×5 und die Animationswahl bleiben lokal gespeichert. Reduzierte Bewegung im Betriebssystem überspringt die Animationen. Die beschrifteten Karten und die Heilzielauswahl bleiben über Tastatur zugänglich. Im Canvas können Ziele zusätzlich angeklickt werden.

Die [Figurenübersicht](spiel/pixelkampf/figuren.html) zeigt alle 90 Fraktionsklassen und lässt Angriffe und Heilung einzeln ausprobieren. Im Hauptmenü ist sie unter „Pixelfiguren · Klassen und Völker“ erreichbar. Die frühere eigenständige Kampfdemo bleibt zum Vergleichen verfügbar.
