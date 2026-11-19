"use strict";

// Browser-Prüfung der Fenster (19. 11. 2026): Für jede Menschen-Fraktion in Akt 1, Akt 2 und Akt 4 öffnet sie Reisekarte,
// Inventar mit allen Reitern, Charakterfenster, Hauptquest- und Aushang-Gespräch und meldet jeden Skriptfehler.
// Aufruf: node sim/oberflaeche.cjs  (braucht Playwright mit Chromium; Exit-Code 1 bei Fehlern)
const path = require("node:path");
const { chromium } = require("playwright");

const seite = "file://" + path.join(__dirname, "..", "index.html");
const KEY = "aschenkrone.valmarch.v1";
const fall = [];
for (const fraktion of ["kronreich", "orden", "haefen"]) for (const akt of ["akt1", "akt2", "akt4"]) fall.push({ fraktion, akt });

// Baut einen Spielstand in der Hauptstadt der Fraktion, wie die Testleiste der Testversion.
function stand({ fraktion, akt }) {
  const ort = { kronreich: "kronhall", orden: "glutberg", haefen: "perlvik" }[fraktion];
  const akt1 = { kronreich: [3, "kron_act1_truce"], orden: [4, "orden_act1_mercy"], haefen: [4, "haefen_act1_guild"] }[fraktion];
  const gruppe = { kronreich: ["sigrid", "wulfgar"], orden: ["halvar", "gunhild"], haefen: ["halvor", "karen"] }[fraktion];
  const schwestern = { kronreich: ["haefen", "orden"], orden: ["kronreich", "haefen"], haefen: ["kronreich", "orden"] }[fraktion];
  const stufe = akt === "akt4" ? 20 : akt === "akt2" ? 10 : 1;
  let s = { ...rules.create("Prüferin", fraktion, "frau", 2), scene: "weltknoten", knoten: ort, handlung: null, xp: rules.systeme.epFuer(stufe) };
  if (akt !== "akt1") {
    s = { ...s, hauptquest: { schritt: akt1[0], wahl: akt1[1] }, questStufe: akt === "akt4" ? 3 : 1, ressource: 40, party: gruppe,
      gefaehrtenEtappen: Object.fromEntries(gruppe.map((id) => [id, 4])) };
    if (akt === "akt4") s.akte = { zweige: { [schwestern[0]]: { stufe: 3, akt: 2, wahl: "good", soeldner: false },
      [schwestern[1]]: { stufe: 3, akt: 3, wahl: "good", soeldner: false } }, fspez: null, akt4: { schritt: 0, siegel: [], wahlOffen: false, wahl: null } };
  }
  s = rules.read(JSON.stringify(s));
  s.health = rules.healthLimit(s);
  return JSON.stringify(s);
}

(async () => {
  const browser = await chromium.launch();
  const fehler = [];
  for (const f of fall) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    let schritt = "Laden";
    page.on("pageerror", (e) => fehler.push(`${f.fraktion}/${f.akt} · ${schritt}: ${e.message}`));
    page.on("dialog", (d) => { fehler.push(`${f.fraktion}/${f.akt} · ${schritt}: Browser-Dialog „${d.message()}“`); d.dismiss(); });
    await page.goto(seite);
    const json = await page.evaluate(stand, f);
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, json]);
    await page.reload();
    await page.click("#continue");
    await page.waitForTimeout(300);
    const offen = (id) => page.evaluate((x) => document.getElementById(x).open, id);
    const pruefe = async (name, oeffnen, dialog) => {
      schritt = name;
      if (await page.evaluate(() => document.getElementById("npc-dialog").open)) await page.click("#npc-close");
      await oeffnen();
      await page.waitForTimeout(250);
      if (!(await offen(dialog))) fehler.push(`${f.fraktion}/${f.akt} · ${name}: Fenster #${dialog} ist nicht offen`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
    };
    await pruefe("Reisekarte", () => page.locator("[data-reisekarte-open]:visible").first().click(), "reisekarte");
    for (const reiter of ["bag", "storage", "trade"]) {
      await pruefe("Inventar " + reiter, () => page.evaluate(() => document.querySelector("[data-hub-open]").click())
        .then(() => page.click(`#hub-tab-${reiter}`)), "inventory-hub");
    }
    await pruefe("Charakterfenster", () => page.evaluate(() => document.querySelector("[data-sheet-open]").click()), "character-sheet");
    const haupt = page.locator(".welt-hauptquest .npc-start");
    if (await haupt.count()) await pruefe("Hauptquest-Gespräch", () => haupt.first().click(), "npc-dialog");
    schritt = "Aushang";
    await page.locator("button", { hasText: "Hofstaat" }).first().click().catch(() => {});
    await page.waitForTimeout(200);
    const aushang = page.locator(".npc-start:visible", { hasText: "Auftrag" });
    if (await aushang.count()) await pruefe("Aushang-Gespräch", () => aushang.first().click(), "npc-dialog");
    else fehler.push(`${f.fraktion}/${f.akt} · Aushang: kein Auftrag zum Besprechen gefunden`);
    console.log(`${f.fraktion}/${f.akt} geprüft`);
    await page.close();
  }
  await browser.close();
  console.log(fehler.length ? "FEHLER:\n" + fehler.join("\n") : "Keine Fehler.");
  process.exitCode = fehler.length ? 1 : 0;
})();
