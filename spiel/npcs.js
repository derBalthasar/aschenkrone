"use strict";

// Personen für das Gesprächsfenster (NPC-Dialog, 19. 11. 2026). Liest keinen Spielstand und verändert nichts.
//
// Eintrag: { name, titel, fraktion, ruf?, portrait? }
//   fraktion  Fraktion aus klassen.fraktionen (Ruf-Rang „Fremder“, „Schutzherr“, „Geächtet“ …) oder null.
//   ruf       Örtliche Gruppe aus world.factions (z. B. "watch"); dann zeigt der Kopf deren Ansehen.
//   portrait  Optionaler Bildpfad, z. B. "assets/npcs/runa.png". Ohne Angabe gilt assets/npcs/<npcId>.png.
//             Geladen wird nur, was in der Liste „bilder“ steht; sonst erscheint das gezeichnete Porträt.
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
    // Fragenkatalog v3.0.4, Antwort 1 A (Henry, 20. 11. 2026): Schritt 2 jeder Akt-1-Reihe hat eine eigene Auftraggeberin.
    kaelen: { name: "Marschall Kaelen", titel: "Heermeister von Eisentor", fraktion: "kronreich" },
    seraphina: { name: "Läuterin Seraphina", titel: "Aschenkloster", fraktion: "orden" },
    mirella: { name: "Kapitänin Mirella", titel: "Nebelklippe", fraktion: "haefen" },
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
  // Auftraggeber je Akt-1-Schritt (Index = Henrys Schritt 1–3, im Plan „schritt“ 0–2). Berichte erstattet man der Anführerin
  // in der Hauptstadt. Akt 2/3: Anführerin der gastgebenden Fraktion, Akt 4: eigene Anführerin.
  const hauptquest = {
    kronreich: ["astrid", "kaelen", "astrid"],
    orden: ["ragna", "seraphina", "ragna"],
    haefen: ["zollmeister", "mirella", "zollmeister"],
  };
  // Bilder, die wirklich unter assets/npcs/ liegen (Fragenkatalog 10 B). Nur diese werden geladen, sonst bleibt das
  // gezeichnete Porträt – so entstehen keine 404-Anfragen. Neue Bilddatei ablegen und hier den Dateinamen eintragen.
  const bilder = new Set([]);

  const get = (id) => (typeof id === "string" && Object.hasOwn(liste, id) ? liste[id] : null);
  const fuerSzene = (szenenId, szene) => szene?.npc ?? szenen[szenenId] ?? null;
  const fuerWahl = (szenenId, wahl) => wahl?.npc ?? wahlen[szenenId + ":" + wahl?.id] ?? null;
  const anfuehrer = (fraktion) => hauptquest[fraktion]?.[0] ?? null;
  const fuerHauptquest = (fraktion, planSchritt = 0, bericht = false) =>
    bericht ? anfuehrer(fraktion) : hauptquest[fraktion]?.[planSchritt] ?? anfuehrer(fraktion);
  // Bildpfad: Angabe an Szene/Wahl, dann am Eintrag, sonst automatisch über die npcId – aber nur, wenn die Datei in der Liste steht.
  const bildDa = (pfad) => typeof pfad === "string" && bilder.has(pfad.replace(/^assets\/npcs\//, ""));
  const portrait = (id, quelle = null) => {
    const pfad = quelle?.portrait ?? get(id)?.portrait ?? (id ? "assets/npcs/" + id + ".png" : null);
    return bildDa(pfad) ? pfad : null;
  };

  return { liste, szenen, wahlen, bilder, get, fuerSzene, fuerWahl, fuerHauptquest, anfuehrer, portrait };
})();
if (typeof module !== "undefined") module.exports = npcs;
