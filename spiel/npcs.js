"use strict";

// Personen für das Gesprächsfenster (NPC-Dialog, 19. 11. 2026). Liest keinen Spielstand und verändert nichts.
//
// Eintrag: { name, titel, fraktion, ruf?, portrait? }
//   fraktion  Fraktion aus klassen.fraktionen (Ruf-Rang „Fremder“, „Schutzherr“, „Geächtet“ …) oder null.
//   ruf       Örtliche Gruppe aus world.factions (z. B. "watch"); dann zeigt der Kopf deren Ansehen.
//   portrait  Optionaler Bildpfad, z. B. "assets/npcs/runa.png". Ohne Angabe sucht das Spiel
//             automatisch assets/npcs/<npcId>.png. Fehlt die Datei, erscheint ein gezeichneter Platzhalter.
//
// Zuordnung: Eine Szene oder eine Wahl kann selbst ein Feld npc (und portrait) tragen. Für Szenen, die aus
// anderen Dateien erzeugt werden (Prologe in startpunkte.js), steht die Zuordnung hier unter szenen und wahlen.
const npcs = (() => {
  const liste = {
    runa: { name: "Runa", titel: "Wachtmeisterin von Eiswacht", fraktion: "kronreich", ruf: "watch" },
    lene: { name: "Lene", titel: "Schwester des Grenzläufers Joren", fraktion: "kronreich", ruf: "watch" },
    maren: { name: "Maren", titel: "Quartiermeisterin der Zeugkammer", fraktion: "kronreich", ruf: "watch" },
    schreiberin: { name: "Die Schreiberin", titel: "Torhaus von Eiswacht", fraktion: "kronreich", ruf: "watch" },
    faehrfrau: { name: "Die Fährfrau", titel: "Fährhaus von Heidvang", fraktion: "kronreich" },
    enna: { name: "Försterin Enna", titel: "Eichenwald bei Heidvang", fraktion: "kronreich" },
    ada: { name: "Ada", titel: "Händlerin am Eispass", fraktion: null },
    dorfvorsteher: { name: "Der Dorfvorsteher", titel: "Westvik", fraktion: "kronreich" },
    skalde: { name: "Der Skalde", titel: "Methalle von Westvik", fraktion: "kronreich" },
    reeder: { name: "Der Reeder", titel: "Laderaum am Außenkai von Perlvik", fraktion: "haefen" },
    boersenhaendler: { name: "Ein Händler", titel: "Börse von Perlvik", fraktion: "haefen" },
    freydis: { name: "Seherin Freydis", titel: "Aschenkloster", fraktion: "orden" },
    // Auftraggeber der Fraktionsreihen (Hauptquest)
    astrid: { name: "Kronprinzessin Astrid", titel: "Auftraggeberin der Reihe „Eine Krone, ein Volk“", fraktion: "kronreich" },
    ragna: { name: "Hochmeisterin Ragna Glutherz", titel: "Auftraggeberin der Reihe „Solange die Flamme brennt“", fraktion: "orden" },
    zollmeister: { name: "Der Zollmeister von Zollholm", titel: "Auftraggeber der Reihe „Jedes Meer ist ein Weg“", fraktion: "haefen" },
  };

  // Szenen, deren ganzer Inhalt ein Gespräch ist
  const szenen = {
    "supply-post": "maren", "skarn-briefing": "runa", "pass-report": "runa", "toll-resolved": "ada",
    "moor-report": "faehrfrau", watch: "schreiberin", "watch-end": "schreiberin", "forest-cache": "enna",
    "wahl-kronreich": "dorfvorsteher", "wahl-haefen": "reeder",
  };
  // Einzelne Wahlen in sonst offenen Szenen („Szene:Wahl“)
  const wahlen = {
    "watch-yard:sister": "lene", "watch-yard:warden": "runa", "watch-yard:watch-trust": "runa",
    "heim-kronreich:erkunden-1": "skalde", "heim-haefen:erkunden-2": "boersenhaendler", "heim-orden:erkunden-1": "freydis",
  };
  const hauptquest = { kronreich: "astrid", orden: "ragna", haefen: "zollmeister" };

  const get = (id) => (typeof id === "string" && Object.hasOwn(liste, id) ? liste[id] : null);
  const fuerSzene = (szenenId, szene) => szene?.npc ?? szenen[szenenId] ?? null;
  const fuerWahl = (szenenId, wahl) => wahl?.npc ?? wahlen[szenenId + ":" + wahl?.id] ?? null;
  const fuerHauptquest = (fraktion) => hauptquest[fraktion] ?? null;
  // Bildpfad: Angabe an Szene/Wahl, dann am Eintrag, sonst automatisch über die npcId.
  const portrait = (id, quelle = null) => quelle?.portrait ?? get(id)?.portrait ?? (id ? "assets/npcs/" + id + ".png" : null);

  return { liste, szenen, wahlen, get, fuerSzene, fuerWahl, fuerHauptquest, portrait };
})();
if (typeof module !== "undefined") module.exports = npcs;
