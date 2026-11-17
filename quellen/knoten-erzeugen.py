#!/usr/bin/env python3
"""Erzeugt das Knotennetz von Odris (spiel/knoten-daten.js) aus der verbindlichen Weltkarte.

Quellen:
- spiel/karte-daten.js: 165 Siedlungen (15 Hauptstädte, 150 Städte und Hafenstädte) in Pixeln der vollen Karte.
- lore/quellen/{menschen,untote,elfen,orks,zwerge}.html: Henrys Dörfer je Stadt mit Ertrag („Die Dörfer der Fraktionen“).
- weltbau/kartengenerator/land.npy: Land- und Wassermaske des Kartengenerators (Rohkoordinaten, 1000 × 1600).

Kanten entstehen aus den Nachbarn auf der Karte (Gabriel-Graph, nur über Land), Seewege verbinden Häfen über
das Meer, Pässe liegen an Eispass, Zollpass und Grauem Pass, der Tiefe Stollen führt von Stollenmund nach
Aschenthron. Jedes Dorf hängt mit einer Straße an seiner Stadt. Die Ausgabe ist kompakt, spiel/knoten.js macht
daraus das Knotenmodell der Technischen Spezifikation.

Aufruf: python3 quellen/knoten-erzeugen.py /pfad/zu/weltbau
"""
import html
import json
import math
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np

WELTBAU = Path(sys.argv[1] if len(sys.argv) > 1 else "/mnt/project-files/weltbau")
REPO = Path(__file__).resolve().parent.parent

karte = json.loads(re.search(r"const karteDaten = (\{.*\});", (REPO / "spiel" / "karte-daten.js").read_text(encoding="utf-8")).group(1))
land = np.load(WELTBAU / "kartengenerator" / "land.npy")
H, W = land.shape
K = 2 * 1423 / 1648


def roh(p):
    """Pixel der vollen Karte -> Rohkoordinaten des Kartengenerators (Umkehrung von karte-erzeugen.py T)."""
    return p[0] / K - 24, p[1] / K - 60


def an_land(p):
    x, y = roh(p)
    xi, yi = int(round(x)), int(round(y))
    return 0 <= yi < H and 0 <= xi < W and bool(land[yi, xi])


def slug(name):
    text = name.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


# Landmassen (Kontinente und Inseln) über eine Flutfüllung der Landmaske.
komponente = -np.ones(land.shape, dtype=np.int32)
nummer = 0
for sy in range(H):
    for sx in range(W):
        if not land[sy, sx] or komponente[sy, sx] >= 0:
            continue
        stapel = [(sy, sx)]
        komponente[sy, sx] = nummer
        while stapel:
            y, x = stapel.pop()
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < H and 0 <= xx < W and land[yy, xx] and komponente[yy, xx] < 0:
                    komponente[yy, xx] = nummer
                    stapel.append((yy, xx))
        nummer += 1


def landmasse(p):
    x, y = roh(p)
    xi, yi = int(round(x)), int(round(y))
    best, abstand = -1, 1e9
    for dy in range(-12, 13):
        for dx in range(-12, 13):
            yy, xx = yi + dy, xi + dx
            if 0 <= yy < H and 0 <= xx < W and komponente[yy, xx] >= 0 and dx * dx + dy * dy < abstand:
                best, abstand = int(komponente[yy, xx]), dx * dx + dy * dy
    return best


def wasseranteil(a, b):
    ax, ay = roh(a)
    bx, by = roh(b)
    schritte = max(2, int(math.hypot(bx - ax, by - ay) / 1.5))
    nass = 0
    for i in range(schritte + 1):
        t = i / schritte
        x, y = int(round(ax + (bx - ax) * t)), int(round(ay + (by - ay) * t))
        if not (0 <= y < H and 0 <= x < W and land[y, x]):
            nass += 1
    return nass / (schritte + 1)


def entfernung(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


VOLK = {f: d["volk"] for f, d in karte["fraktionen"].items()}
REGION = {"kronreich": "valmarch", "orden": "skarnheim", "haefen": "splitterinseln", "hof": "eryndor",
          "erinnernde": "eryndor", "faeulnisbrut": "eryndor", "dornenklingen": "ylvenhain", "hueter": "ylvenhain",
          "schattenbluete": "ylvenhain", "staubreiter": "sulkhar", "aschenclan": "sulkhar", "gruene-banner": "sulkhar",
          "tiefgraeber": None, "tiefes-koenigreich": None, "runenschmiede": None}
TYP = {"cap": "hauptstadt", "city": "stadt", "port": "hafenstadt"}

# ---- Siedlungen ----
knoten = {}
for name, ort in karte["orte"].items():
    if ort["art"] not in TYP:
        continue
    knoten[slug(name)] = {"name": name, "fraktion": ort["f"], "typ": TYP[ort["art"]], "p": ort["p"],
                          "hafen": ort["art"] == "port", "region": REGION[ort["f"]], "kanten": {}}
# Hauptstädte am Meer haben ebenfalls einen Hafen (Weltbuch: Perlvik und Zhar-Kesh).
for name in ("Perlvik", "Zhar-Kesh"):
    knoten[slug(name)]["hafen"] = True
assert len(knoten) == 165, len(knoten)
haupt = list(knoten)
masse = {k: landmasse(knoten[k]["p"]) for k in haupt}


def kante(a, b, typ, sicherheit, kosten, silber=0, **extra):
    eintrag = [b, typ, sicherheit, kosten] + ([silber] if silber or extra else [])
    if extra:
        eintrag.append(extra)
    knoten[a]["kanten"][b] = eintrag
    rueck = [a] + eintrag[1:]
    knoten[b]["kanten"][a] = rueck


def sicherheit_land(a, b):
    return "kernland" if knoten[a]["fraktion"] == knoten[b]["fraktion"] else "grenzland"


def landkante(a, b):
    s = sicherheit_land(a, b)
    kante(a, b, "strasse", s, 1 if s == "kernland" else 2)


# ---- Landwege: Gabriel-Graph über die Siedlungen derselben Landmasse ----
P = np.array([knoten[k]["p"] for k in haupt], dtype=float)
for i, a in enumerate(haupt):
    for j in range(i + 1, len(haupt)):
        b = haupt[j]
        if masse[a] != masse[b] or masse[a] < 0:
            continue
        mitte = (P[i] + P[j]) / 2
        radius2 = ((P[i] - P[j]) ** 2).sum() / 4
        d2 = ((P - mitte) ** 2).sum(axis=1)
        d2[[i, j]] = np.inf
        if (d2 < radius2).any():
            continue
        if entfernung(P[i], P[j]) > 330 or wasseranteil(P[i], P[j]) > 0.12:
            continue
        landkante(a, b)

# Jede Landmasse zusammenhängend machen: kürzeste fehlende Verbindung über möglichst viel Land.
def gruppen():
    eltern = {k: k for k in haupt}

    def wurzel(k):
        while eltern[k] != k:
            eltern[k] = eltern[eltern[k]]
            k = eltern[k]
        return k
    for a in haupt:
        for b in knoten[a]["kanten"]:
            if b in eltern:
                eltern[wurzel(a)] = wurzel(b)
    return wurzel


while True:
    wurzel = gruppen()
    kandidaten = []
    for i, a in enumerate(haupt):
        for b in haupt[i + 1:]:
            if masse[a] == masse[b] and masse[a] >= 0 and wurzel(a) != wurzel(b):
                kandidaten.append((entfernung(knoten[a]["p"], knoten[b]["p"]) * (1 + 4 * wasseranteil(knoten[a]["p"], knoten[b]["p"])), a, b))
    if not kandidaten:
        break
    _, a, b = min(kandidaten)
    landkante(a, b)

# Wege der Handlung (Reisekarte Kornwik – Heidvang – Eiswacht – Glutberg) sind immer direkt verbunden.
for a, b in (("kornwik", "heidvang"), ("heidvang", "eiswacht"), ("eiswacht", "glutberg")):
    if b not in knoten[a]["kanten"]:
        landkante(a, b)

# ---- Pässe ----
PAESSE = {"Eispass": "Eiswacht", "Zollpass": "Zollburg", "Grauer Pass": "Graupass"}
for pass_name, stadt in PAESSE.items():
    punkt = karte["orte"][pass_name]["p"]
    s = slug(stadt)
    for b, eintrag in list(knoten[s]["kanten"].items()):
        if b not in knoten or eintrag[1] != "strasse":
            continue
        if knoten[b]["fraktion"] != knoten[s]["fraktion"] or entfernung(punkt, knoten[b]["p"]) < entfernung(knoten[s]["p"], knoten[b]["p"]):
            kante(s, b, "pass", "grenzland", 2, 0, pass_=pass_name)
    if not any(e[1] == "pass" for e in knoten[s]["kanten"].values()):
        naechste = min((b for b in knoten[s]["kanten"]), key=lambda b: entfernung(punkt, knoten[b]["p"]))
        kante(s, naechste, "pass", "grenzland", 2, 0, pass_=pass_name)

# ---- Seewege zwischen Häfen ----
haefen = [k for k in haupt if knoten[k]["hafen"]]
for a in haefen:
    naechste = sorted((b for b in haefen if b != a), key=lambda b: entfernung(knoten[a]["p"], knoten[b]["p"]))
    gezaehlt = 0
    for b in naechste:
        if gezaehlt >= 3:
            break
        if b in knoten[a]["kanten"]:
            continue
        kante(a, b, "seeweg", "grenzland", 0, 15)
        gezaehlt += 1
# Alle Häfen müssen über See zusammenhängen (Brücken zwischen den Kontinenten).
while True:
    eltern = {k: k for k in haefen}

    def wurzel(k):
        while eltern[k] != k:
            eltern[k] = eltern[eltern[k]]
            k = eltern[k]
        return k
    for a in haefen:
        for b, e in knoten[a]["kanten"].items():
            if e[1] == "seeweg":
                eltern[wurzel(a)] = wurzel(b)
    kandidaten = [(entfernung(knoten[a]["p"], knoten[b]["p"]), a, b) for i, a in enumerate(haefen) for b in haefen[i + 1:]
                  if wurzel(a) != wurzel(b)]
    if not kandidaten:
        break
    _, a, b = min(kandidaten)
    kante(a, b, "seeweg", "grenzland", 0, 15)

# ---- Tiefer Stollen unter der Meerenge ----
kante("stollenmund", "aschenthron", "tiefer_stollen", "grenzland", 2, 0, probe=["willenskraft", "intelligenz"], glut=1)

# ---- Dörfer aus Henrys Völkerdokumenten ----
def doerfer_aus(datei):
    text = (REPO / "lore" / "quellen" / datei).read_text(encoding="utf-8")
    text = re.sub(r"</t[dh]>", "\t", text)
    text = re.sub(r"<(br|/p|/li|/tr|/h\d)[^>]*>", "\n", text)
    text = html.unescape(re.sub(r"<[^>]+>", "", text))
    start = text.index("Die Dörfer der Fraktionen")
    ende = text.find("Spielziele und Hauptquests", start)
    if ende < 0 or "Hauptquests der" in text[start:ende]:
        ende = min(i for i in (text.find("Spielziele und Hauptquests", start), text.find("Hauptquests der", start)) if i > 0)
    zeilen = [z.strip() for z in text[start:ende].split("\n") if z.strip()]
    ergebnis = {}
    stadt = None
    for zeile in zeilen:
        zeile = zeile.strip("\t ")
        if not zeile:
            continue
        if re.fullmatch(r"[^()]+(\(Hauptstadt\))?", zeile.split("\t")[0].strip()) and "," not in zeile and "(" not in zeile.replace("(Hauptstadt)", ""):
            kandidat = zeile.replace("(Hauptstadt)", "").strip("\t ")
            if slug(kandidat) in knoten:
                stadt = slug(kandidat)
            continue
        if stadt and "(" in zeile:
            eintraege = re.findall(r"([^,()]+?)\s*\(([^()]+)\)", zeile)
            ergebnis[stadt] = [(n.strip(), e.strip()) for n, e in eintraege]
            stadt = None
    return ergebnis


doerfer = {}
for datei in ("menschen.html", "untote.html", "elfen.html", "orks.html", "zwerge.html"):
    doerfer.update(doerfer_aus(datei))
fehlend = [k for k in haupt if k not in doerfer]
assert not fehlend, fehlend
for k, liste in doerfer.items():
    soll = 3 if knoten[k]["typ"] == "hauptstadt" else 2
    assert len(liste) == soll, (k, liste)

besetzt = [tuple(knoten[k]["p"]) for k in haupt]


def platz_fuer(stadt, index, anzahl):
    p = knoten[stadt]["p"]
    nachbarn = [knoten[b]["p"] for b in knoten[stadt]["kanten"] if b in knoten]
    # Dörfer liegen bevorzugt dort, wo keine Nachbarstadt ist.
    winkel_nachbarn = [math.atan2(q[1] - p[1], q[0] - p[0]) for q in nachbarn]
    bester, wertung = None, -1e9
    for schritt in range(36):
        w = 2 * math.pi * schritt / 36
        for r in (30, 38, 24, 46, 18):
            q = (round(p[0] + r * math.cos(w)), round(p[1] + r * math.sin(w)))
            if not an_land(q) or landmasse(q) != masse[stadt]:
                continue
            frei = min((entfernung(q, b) for b in besetzt), default=99)
            if frei < 14:
                continue
            luecke = min((abs((w - v + math.pi) % (2 * math.pi) - math.pi) for v in winkel_nachbarn), default=math.pi)
            wert = luecke * 40 + min(frei, 40) - abs(r - 30)
            if wert > wertung:
                bester, wertung = q, wert
    if bester is None:
        w = 2 * math.pi * index / anzahl
        bester = (round(p[0] + 18 * math.cos(w)), round(p[1] + 18 * math.sin(w)))
    besetzt.append(bester)
    return list(bester)


namen = {knoten[k]["name"] for k in haupt} | set(karte["orte"])
dorf_ids = set()
for stadt in haupt:
    liste = doerfer[stadt]
    for index, (name, ertrag) in enumerate(liste):
        dorf_id = slug(name)
        if dorf_id in knoten or dorf_id in dorf_ids:
            dorf_id = slug(name) + "-" + stadt
        dorf_ids.add(dorf_id)
        knoten[dorf_id] = {"name": name, "fraktion": knoten[stadt]["fraktion"], "typ": "dorf",
                           "p": platz_fuer(stadt, index, len(liste)), "hafen": False,
                           "region": knoten[stadt]["region"], "ertrag": ertrag, "stadt": stadt, "kanten": {}}
        kante(stadt, dorf_id, "strasse", "kernland", 1)

anzahl_doerfer = sum(1 for k in knoten.values() if k["typ"] == "dorf")
assert anzahl_doerfer == 345, anzahl_doerfer

# Zusammenhang prüfen: Von jedem Knoten aus muss jeder andere über Land, See oder Stollen erreichbar sein.
gesehen = {"kronhall"}
offen = ["kronhall"]
while offen:
    a = offen.pop()
    for b in knoten[a]["kanten"]:
        if b not in gesehen:
            gesehen.add(b)
            offen.append(b)
assert len(gesehen) == len(knoten), set(knoten) - gesehen

# Aufhänger je Volk aus den Völkerdokumenten (Abschnitt „Aufhänger für Geschichten“).
aufhaenger = {}
for volk in ("menschen", "untote", "elfen", "orks", "zwerge"):
    text = (REPO / "lore" / "quellen" / (volk + ".html")).read_text(encoding="utf-8")
    text = re.sub(r"<(br|/p|/li|/tr|/h\d)[^>]*>", "\n", text)
    text = html.unescape(re.sub(r"<[^>]+>", "", text))
    liste = []
    if "Aufhänger für Geschichten" in text:
        for zeile in text[text.rindex("Aufhänger für Geschichten"):].split("\n")[1:]:
            zeile = zeile.strip()
            if not zeile:
                continue
            treffer = re.match(r"([^:]{3,60}):\s+(.+)", zeile)
            if not treffer:
                break
            liste.append([treffer.group(1), treffer.group(2)])
    else:
        # Das Untoten-Dokument hat keine Aufhänger. Es zählen die ersten Stufen der drei Hauptquests.
        zeilen = [z.strip() for z in text[text.rindex("Hauptquests der Untoten"):].split("\n") if z.strip()]
        for index, zeile in enumerate(zeilen[:-1]):
            if zeile.startswith("Hauptquest "):
                treffer = re.match(r"([^:]{3,60}):\s+(.+)", zeilen[index + 1])
                if treffer:
                    liste.append([treffer.group(1), treffer.group(2)])
    assert len(liste) >= 3, (volk, liste)
    aufhaenger[volk] = liste

ausgabe = {}
for k, d in knoten.items():
    eintrag = {"n": d["name"], "f": d["fraktion"], "t": d["typ"], "p": d["p"]}
    if d["hafen"]:
        eintrag["h"] = 1
    if d.get("ertrag"):
        eintrag["e"] = d["ertrag"]
        eintrag["s"] = d["stadt"]
    eintrag["k"] = sorted(d["kanten"].values(), key=lambda e: e[0])
    ausgabe[k] = eintrag
daten = {"regionen": REGION, "aufhaenger": aufhaenger, "paesse": {slug(p): p for p in PAESSE}, "knoten": ausgabe}
js = ("\"use strict\";\n\n// Erzeugt von quellen/knoten-erzeugen.py aus der verbindlichen Weltkarte und den Dörferlisten der\n"
      "// Völkerdokumente. Nicht von Hand ändern, sondern das Skript anpassen und neu ausführen.\n"
      "// Kante: [Ziel, Typ, Sicherheit, Kosten Fraktionsvorrat, Kosten Silber, Extras]\n"
      "const knotenDaten = " + json.dumps(daten, ensure_ascii=False, separators=(",", ":")) + ";\n"
      "if (typeof module !== \"undefined\") module.exports = knotenDaten;\n")
(REPO / "spiel" / "knoten-daten.js").write_text(js, encoding="utf-8")

typen = {}
for d in knoten.values():
    for e in d["kanten"].values():
        typen[e[1]] = typen.get(e[1], 0) + 1
print(len(knoten), "Knoten,", anzahl_doerfer, "Dörfer, Kanten (je Richtung):", typen, "·", len(js) // 1024, "KB")
