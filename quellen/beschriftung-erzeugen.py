# Beschriftung der verbindlichen Weltkarte: Wo stehen die gedruckten Namen? Das Skript führt die Platzierung aus
# /mnt/project-files/weltbau/kartengenerator/render.py in einer Kopie erneut aus (ohne die Legende) und speichert
# alle belegten Rechtecke (Namen, Ortsmarken, Reichs- und Meeresnamen) in Pixeln der vollen Karte 2846 × 2210.
# Die Reisekarte setzt damit die Dorfnamen so, dass sie keinen gedruckten Namen verdecken.
# Aufruf: python3 quellen/beschriftung-erzeugen.py
import json, os, shutil, subprocess, sys, tempfile

QUELLE = "/mnt/project-files/weltbau/kartengenerator"
ZIEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "karte-beschriftung.json")

with tempfile.TemporaryDirectory() as tmp:
    for name in os.listdir(QUELLE):
        shutil.copy(os.path.join(QUELLE, name), tmp)
    text = open(os.path.join(tmp, "render.py"), encoding="utf8").read()
    # Jeder gesetzte Ortsname wird mit seinem Rechteck mitgeschrieben.
    alt = "_,x,y,bx=best; boxes.append(bx)"
    assert text.count(alt) == 1
    text = text.replace(alt, alt + "; namen.append([text, [x - 2 + 2, y, x + w, y + h], getattr(font, 'size', 0)])")
    text = text.replace("def place(", "namen=[]\ndef place(", 1)
    text = text[:text.index("# legend box top right")] + "\njson.dump({'boxes': boxes, 'namen': namen}, open('boxes.json', 'w'))\n"
    open(os.path.join(tmp, "nur-boxen.py"), "w", encoding="utf8").write(text)
    subprocess.run([sys.executable, "nur-boxen.py"], cwd=tmp, check=True)
    ergebnis = json.load(open(os.path.join(tmp, "boxes.json")))
    boxen = ergebnis["boxes"]

# namen: [Name, [x0, y0, x1, y1], Schriftgröße in Kartenpixeln] der gedruckten Orts- und Landmarkennamen.
daten = {"quelle": "render.py der verbindlichen Weltkarte, Platzierung erneut ausgeführt",
         "boxen": [[round(v) for v in b] for b in boxen],
         "namen": [[n, [round(v) for v in b], g] for n, b, g in ergebnis["namen"]]}
json.dump(daten, open(ZIEL, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
print(len(boxen), "Rechtecke")
