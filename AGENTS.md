# Arbeitsanweisung für Aschenkrone

## Verbindlicher gemeinsamer Ablauf

Diese Datei ist die zentrale Arbeitsanweisung für alle Mitwirkenden und KI-Assistenten, einschließlich Codex, Claude und weiterer Werkzeuge. Lies sie zu Beginn jeder Aufgabe. Der vollständige Ablauf und die Einrichtung des GitHub-Branchschutzes stehen in [CONTRIBUTING.md](CONTRIBUTING.md). Halte diese gemeinsame Referenz aktuell; ändere sie über einen Pull Request.

- Arbeite auf einem eigenen Feature-Branch. Im regulären Ablauf gehen alle Änderungen über einen Pull Request gegen `main`; kein direkter Push auf `main` und kein Force-Push.
- Sichere vorhandene Arbeit, bevor du fremde Änderungen integrierst. Überschreibe keine Änderungen anderer blind.
- Gleiche vor Änderungen, vor jedem Push und unmittelbar vor dem Merge mit GitHub ab. Integriere neue Änderungen und wiederhole betroffene Prüfungen.
- Beschreibe im Pull Request das Problem, das resultierende Verhalten und tatsächlich ausgeführte Prüfungen.
- Merge nur mit ausdrücklichem Auftrag des Projektverantwortlichen und bestandenen erforderlichen Prüfungen. Bereits erteilte Aufträge gelten für die beauftragte Änderung weiter; frage dieselbe Zustimmung nicht erneut ab.
- Berichte zu Beginn Branch, lokale Änderungen und Abgleichstatus. Berichte zum Abschluss Ergebnis, Prüfungen, Commit-ID, PR-Link und Merge-Status. Kennzeichne Blocker und nicht ausgeführte Prüfungen klar.
- Melde „hochgeladen“, „gemergt“ oder „synchron“ erst nach erfolgreicher Prüfung des jeweiligen Zustands.

## Mit GitHub abgleichen

1. Prüfe vor jeder Änderung mit `git status --short --branch` den aktuellen Branch und vorhandene lokale Änderungen. Rufe anschließend mit `git fetch origin` den aktuellen Stand von GitHub ab.
2. Vergleiche den lokalen Branch mit seinem Upstream. Auf `main` zeigt `git log --left-right --oneline HEAD...origin/main` die Unterschiede. Lies die relevanten fremden Änderungen, bevor du auf denselben Dateien weiterarbeitest.
3. Integriere zuerst die fremden Änderungen. Wenn der Arbeitsbaum sauber ist und der lokale Branch nur hinterherhinkt, nutze auf `main` `git merge --ff-only origin/main`. Bei lokalen Änderungen oder auseinanderlaufender Historie sichere die vorhandene Arbeit, gleiche die betroffenen Dateien ab und löse Konflikte anhand beider Fassungen. Hol Rücksprache ein, wenn sich die fachliche Absicht eines Konflikts nicht klären lässt.
4. Prüfe vor jedem Push erneut den Remote-Stand. Falls seit dem letzten Abgleich neue Commits eingegangen sind, übernimm sie und wiederhole die betroffenen Tests. Verwende einen regulären Push. Wenn Git ihn wegen neuer Remote-Commits ablehnt, beginne den Abgleich erneut.
5. Falls GitHub nicht erreichbar ist, kennzeichne den Stand als lokal und hole den Abgleich vor dem nächsten Upload nach.

## Lokaler Einstieg

Öffne die [aktuelle index.html](index.html) im Browser. Die ältere Upload-Kopie und das Vorschau-ZIP sind lokale Exporte. Die [technische Übergabe](CLAUDE-UEBERGABE.md) beschreibt den Aufbau. Der [Quellenabgleich zur Lore](lore/KANON.md) hält die Entscheidungen zu Spielwelt und Prolog fest.

Für Bestiarium-Modelle gilt die [Arbeitsanweisung für Modelle](quellen/arbeitsanweisung-modelle.pdf). Bei Änderungen am Spiel führe `node --test spiel/regeln.test.cjs` und passende JavaScript-Syntaxprüfungen aus. Prüfe geänderte Oberflächenabläufe zusätzlich im Browser, bei Layoutänderungen auch auf Handybreite.
