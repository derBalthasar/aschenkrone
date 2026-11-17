# Gemeinsam an Aschenkrone arbeiten

Für alle Mitwirkenden und KI-Assistenten gilt die [zentrale Arbeitsanweisung in AGENTS.md](AGENTS.md). Lies sie vor der ersten Änderung. Sie ist die gemeinsame Referenz für Codex, Claude und weitere Werkzeuge; persönliche Chatverläufe ersetzen sie nicht. Änderungen an dieser Vereinbarung erfolgen ebenfalls über einen Pull Request.

## Der gemeinsame Ablauf

1. Arbeitsbaum und Branch prüfen, `git fetch origin` ausführen und mit `origin/main` vergleichen.
2. Vorhandene Arbeit sichern und neue Änderungen aus `main` integrieren. Änderungen anderer vollständig berücksichtigen. Bei unklarer fachlicher Absicht eines Konflikts nachfragen.
3. Auf einem eigenen Feature-Branch arbeiten. Kein Force-Push, kein blindes Überschreiben und im regulären Ablauf kein direkter Push auf `main`.
4. Vor jedem Push und unmittelbar vor dem Merge erneut mit GitHub abgleichen. Neue Änderungen integrieren und betroffene Prüfungen wiederholen.
5. Änderungen committen, den Branch pushen und einen Pull Request gegen `main` erstellen. Problem, Änderung und tatsächlich ausgeführte Prüfungen beschreiben.
6. Nur nach ausdrücklichem Merge-Auftrag des Projektverantwortlichen und mit bestandenen erforderlichen Prüfungen mergen. Danach prüfen, dass der Merge auf GitHub angekommen ist.

Bereits erteilte Aufträge für Commit, Push und Merge gelten für die beauftragte Änderung weiter; nicht wiederholt dieselbe Zustimmung erfragen.

## Prüfen

Bei Spieländerungen sind `node --test spiel/regeln.test.cjs` und die passenden JavaScript-Syntaxprüfungen erforderlich. Bei Änderungen an der Oberfläche zusätzlich den betroffenen Ablauf im Browser prüfen, bei Layoutänderungen auch auf Handybreite. Für reine Dokumentationsänderungen genügen passende Dokumentations- und Linkprüfungen. Die GitHub-Prüfung „Regeltests“ läuft für jeden Pull Request.

## Kurz berichten

- Zu Beginn: Branch, lokale Änderungen und Ergebnis des GitHub-Abgleichs.
- Bei Konflikten: betroffene Funktionen und wie die Absichten beider Änderungen erhalten bleiben.
- Zum Abschluss: Ergebnis, ausgeführte Prüfungen, Commit-ID, PR-Link und Merge-Status.

„Hochgeladen“, „gemergt“ oder „synchron“ erst nach erfolgreicher Prüfung melden. Fehlende Berechtigungen, nicht ausgeführte Prüfungen und andere Blocker klar benennen.

## GitHub-seitig verbindlich machen

Die Dateien beschreiben die Vereinbarung. Technisch erzwingt GitHub sie erst mit einer aktiven Branchregel unter **Settings → Rules → Rulesets** für `main`:

- Änderungen müssen über Pull Requests erfolgen.
- Die Statusprüfung „Regeltests“ muss erfolgreich sein; der Branch muss vor dem Merge aktuell sein.
- Force-Pushes und das Löschen von `main` sind gesperrt.
- Die Regel gilt auch für Administratoren; Ausnahmen nur bewusst über die konfigurierte Ausnahmeliste vergeben.

Diese Einstellungen benötigt jemand mit entsprechenden Repository-Rechten. Der Arbeitsbericht muss unterscheiden, ob nur die Dateien gespeichert oder auch diese Regeln tatsächlich aktiviert wurden. Automatische Tests können die fachliche Abstimmung nicht ersetzen.
