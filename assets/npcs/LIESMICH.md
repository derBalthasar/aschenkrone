# NPC-Porträts

Bilder für das Gesprächsfenster. Das Spiel sucht für jede Person automatisch `assets/npcs/<npcId>.png`
(die npcId steht in `spiel/npcs.js`, z. B. `runa.png`, `astrid.png`). Ein anderer Pfad lässt sich am Eintrag
oder an einer Szene mit `portrait: "assets/npcs/datei.webp"` setzen.

Format: Hochformat 5:6 (z. B. 500 × 600 px). Das Fenster zeigt 100 × 120 px. Fehlt ein Bild oder lädt es nicht,
zeigt das Spiel eine gezeichnete Kapuzen-Silhouette.
