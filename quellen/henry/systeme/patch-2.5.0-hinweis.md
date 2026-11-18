# Patch 2.5.0 (Henry, 18. 11. 2026): Oberfläche nach den neuen Systemen

Umgesetzt in `spiel/spiel.js` und `spiel/stil.css`:

- Kopfzeile: „Etappe N · Zehnt in X · Überfall in Y“ statt „Spielzug“ (nur Menschen).
- Umschalter Abenteuer-Ansicht / Reichs- und Strategiekarte (Taste M), Standard Abenteuer.
- Seitenleiste oben: Reise-Nahrung (bei 0 „ENTKRÄFTET (−15 Moral/Etappe)“) und Gruppen-Moral 0–100 mit Rang.
- Mana nur für Pyromant, Kleriker der Flamme, Glutpaladin, Inquisitor; Glut bei den Menschen nur im Orden.
- Ortskopf: „Fraktion · Ruf N (Rang)“, Vorratsbalken entfernt, Rohstoffleiste Silber/Nahrung/Holz/Eisen/Stein/Runensplitter.
- Stadt-Hub A–E (Tasten A bis E): Hofstaat & Aushang, Kontor/Händler/Schmiede, Rast und Lager (3 Nahrung), Held/Gefährten/Relikt, Aufbruch.
- Aufbruch-Text nach Henrys Vorgabe.

Im Originaltext fehlt beim Moralfeld der Wert für `range`; umgesetzt ist 0–100 wie im Moralsystem.
