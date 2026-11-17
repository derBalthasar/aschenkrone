#!/usr/bin/env python3
"""Erzeugt die Kartenbilder unter spiel/karte/ und die Kartendaten spiel/karte-daten.js.

Quelle ist die verbindliche Weltkarte von Odris („Weltkarte · Entwurf 3“ mit allen Orten) und der Kartengenerator
aus dem Projektordner weltbau/kartengenerator (cities.py, pts.json, lab.npy). Alle Koordinaten in den Daten sind
Pixel der vollen Karte (2846 × 2210), damit Weltkarte, Fraktionskarte und Gebietskarte dieselben Punkte nutzen.

Aufruf: python3 quellen/karte-erzeugen.py /pfad/zu/weltbau
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

WELTBAU = Path(sys.argv[1] if len(sys.argv) > 1 else "/mnt/project-files/weltbau")
REPO = Path(__file__).resolve().parent.parent
ZIEL = REPO / "spiel" / "karte"
ZIEL.mkdir(exist_ok=True)

K = 2 * 1423 / 1648
def T(p):
    return [round((p[0] + 24) * K), round((p[1] + 60) * K)]

# Reihenfolge der Fraktionen im Kartengenerator (cities.py) -> Schlüssel im Spiel (startpunkte.js)
FRAKTIONEN = ["kronreich", "orden", "haefen", "hof", "erinnernde", "faeulnisbrut", "dornenklingen", "hueter",
              "schattenbluete", "staubreiter", "aschenclan", "gruene-banner", "tiefgraeber", "tiefes-koenigreich",
              "runenschmiede"]
VOLK = {"kronreich": "menschen", "orden": "menschen", "haefen": "menschen", "hof": "untote", "erinnernde": "untote",
        "faeulnisbrut": "untote", "dornenklingen": "elfen", "hueter": "elfen", "schattenbluete": "elfen",
        "staubreiter": "orks", "aschenclan": "orks", "gruene-banner": "orks", "tiefgraeber": "zwerge",
        "tiefes-koenigreich": "zwerge", "runenschmiede": "zwerge"}

ns = {}
exec((WELTBAU / "kartengenerator" / "cities.py").read_text(encoding="utf-8"), ns)
pts = json.loads((WELTBAU / "kartengenerator" / "pts.json").read_text(encoding="utf-8"))
lab = np.load(WELTBAU / "kartengenerator" / "lab.npy")
karte = Image.open(WELTBAU / "weltkarte-verbindlich-mit-orten.png").convert("RGB")
W, H = karte.size
# Kartenfläche ohne Titelband und Biom-Legende
RAND = [0, 96, W, 1826 - 96]

def fraktion_bei(raw):
    x, y = int(raw[0]), int(raw[1])
    if 0 <= y < lab.shape[0] and 0 <= x < lab.shape[1] and lab[y, x] >= 0:
        return int(lab[y, x])
    ys, xs = np.nonzero(lab >= 0)
    i = ((xs - x) ** 2 + (ys - y) ** 2).argmin()
    return int(lab[ys[i], xs[i]])

orte = {}
for name, raw, art, f in pts:
    orte[name] = {"p": T(raw), "f": FRAKTIONEN[f], "art": art}
for name, raw, art in ns["LANDMARKS"]:
    if art == "sea" and name not in ("Zollinseln", "Knocheninseln", "Funkeninsel"):
        continue
    orte.setdefault(name, {"p": T(raw), "f": FRAKTIONEN[fraktion_bei(raw)], "art": "landschaft"})
# Orte aus den Prologen, die nicht als Punkt auf der Karte stehen (Angaben in Rohkoordinaten des Generators)
extra = {
    "Tiefer Stollen": ((905, 775), "tiefgraeber"),   # Tiefer Stollen unter der Meerenge vor Stollenmund
    "Waldrand": ((1150, 445), "hueter"),               # westlicher Rand des Uralten Walds vor Ylvenor
    "Weiten": ((560, 880), "gruene-banner"),           # „Die Weiten“
}
for name, (raw, f) in extra.items():
    orte[name] = {"p": T(raw), "f": f, "art": "landschaft"}

# Reiseziele der Reisekarte (welt.js destinations) in Pixeln der vollen Karte, abgelesen an Kornwik, Heidvang,
# Eiswacht, Eispass und Glutberg. Teilorte ohne eigenen Kartenpunkt liegen an passender Stelle daneben.
reise = {
    "weidenkamm": [307, 554], "kraehenfurt": [192, 558], "rotwaelder": [252, 612], "schwarzmoor": [404, 512],
    "hochwacht": [516, 466], "mine": [452, 414], "ridge": [578, 448], "ravine": [560, 536], "pass": [493, 502],
    "toll": [470, 590], "skarn-gate": [663, 360], "skarn-cliffs": [742, 318], "skarn-runes": [676, 286],
}

def clamp(rect, frame):
    x, y, w, h = rect
    fx, fy, fw, fh = frame
    w, h = min(w, fw), min(h, fh)
    x = min(max(x, fx), fx + fw - w)
    y = min(max(y, fy), fy + fh - h)
    return [int(x), int(y), int(w), int(h)]

def box(points, rand):
    xs = [p[0] for p in points]; ys = [p[1] for p in points]
    return [min(xs) - rand, min(ys) - rand, max(xs) - min(xs) + 2 * rand, max(ys) - min(ys) + 2 * rand]

fraktionen = {}
for i, key in enumerate(FRAKTIONEN):
    # Die elf Städte jeder Fraktion verteilen sich über ihr ganzes Gebiet (auch Inseln wie Zollholm).
    staedte = [T(raw) for _, raw, _, f in pts if f == i]
    rect = clamp(box(staedte, 90), RAND)
    cap = ns["FAC"][i][0]
    fraktionen[key] = {"volk": VOLK[key], "rect": rect, "hauptstadt": cap}

voelker = {}
for volk in ["menschen", "untote", "elfen", "orks", "zwerge"]:
    rects = [f["rect"] for f in fraktionen.values() if f["volk"] == volk]
    pkt = [[r[0], r[1]] for r in rects] + [[r[0] + r[2], r[1] + r[3]] for r in rects]
    voelker[volk] = clamp(box(pkt, 30), RAND)

bilder = []
welt = karte.crop((RAND[0], RAND[1], RAND[0] + RAND[2], RAND[1] + RAND[3]))
welt.resize((1600, round(1600 * RAND[3] / RAND[2])), Image.LANCZOS).save(ZIEL / "welt.jpg", quality=78, optimize=True, progressive=True)
bilder.append({"src": "spiel/karte/welt.jpg", "rect": RAND})
for volk, r in voelker.items():
    teil = karte.crop((r[0], r[1], r[0] + r[2], r[1] + r[3]))
    teil.save(ZIEL / (volk + ".jpg"), quality=76, optimize=True, progressive=True)
    bilder.append({"src": "spiel/karte/" + volk + ".jpg", "rect": r})

# Seite, auf der das Namensschild eines Reiseziels steht (r = rechts, l = links), damit dichte Orte lesbar bleiben.
seiten = {"schwarzmoor": "l", "hochwacht": "l", "mine": "l", "skarn-runes": "l"}
def fraktion_pixel(p):
    return FRAKTIONEN[fraktion_bei((p[0] / K - 24, p[1] / K - 60))]
reise = {k: {"p": p, "f": fraktion_pixel(p), "seite": seiten.get(k, "r")} for k, p in reise.items()}

daten = {"groesse": [W, H], "rand": RAND, "bilder": bilder, "orte": orte, "fraktionen": fraktionen,
         "voelker": voelker, "reise": reise}
js = ("\"use strict\";\n\n// Erzeugt von quellen/karte-erzeugen.py aus der verbindlichen Weltkarte von Odris. Nicht von Hand ändern,\n"
      "// sondern das Skript anpassen und neu ausführen. Koordinaten sind Pixel der vollen Karte.\n"
      "const karteDaten = " + json.dumps(daten, ensure_ascii=False, separators=(",", ":")) + ";\n"
      "if (typeof module !== \"undefined\") module.exports = karteDaten;\n")
(REPO / "spiel" / "karte-daten.js").write_text(js, encoding="utf-8")
for f in sorted(ZIEL.iterdir()):
    print(f.name, f.stat().st_size // 1024, "KB")
print("voelker", voelker)
print("reise", {k: v["f"] for k, v in reise.items()})
