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
    if (await haupt.count() && await haupt.first().isEnabled()) await pruefe("Hauptquest-Gespräch", () => haupt.first().click(), "npc-dialog");
    // Ort-Gate: Ist die Auftraggeberin woanders, zeigt der Abschnitt das Reiseziel statt des Dialogs.
    else if (await haupt.count() && !(await page.locator(".welt-hauptquest .ort-gate-reise").count())) {
      fehler.push(`${f.fraktion}/${f.akt} · Hauptquest: gesperrter Gesprächsknopf ohne Reise-Knopf`);
    }
    schritt = "Aushang";
    await page.locator("button", { hasText: "Hofstaat" }).first().click().catch(() => {});
    await page.waitForTimeout(200);
    const aushang = page.locator(".npc-start:visible", { hasText: "Annehmen" });
    if (await aushang.count()) await pruefe("Aushang-Gespräch", () => aushang.first().click(), "npc-dialog");
    else fehler.push(`${f.fraktion}/${f.akt} · Aushang: kein Auftrag zum Besprechen gefunden`);
    console.log(`${f.fraktion}/${f.akt} geprüft`);
    await page.close();
  }
  // Ort-Gate (Henry, 20. 11. 2026): Am falschen Ort zeigt der Knopf das Reiseziel statt des NPC-Dialogs, und die Reise
  // startet den Marsch. Kronreich, Schritt 2 (Hagenfels), Held in Kronhall.
  {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.on("pageerror", (e) => fehler.push("Ort-Gate: " + e.message));
    await page.goto(seite);
    const json = await page.evaluate(() => {
      let s = { ...rules.create("Prüferin", "kronreich", "frau", 2), scene: "weltknoten", knoten: "kronhall", handlung: null, hauptquest: { schritt: 1, wahl: null } };
      s = rules.read(JSON.stringify(s));
      s.health = rules.healthLimit(s);
      return JSON.stringify(s);
    });
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, json]);
    await page.reload();
    await page.evaluate(() => rules.setTravelDice(() => 0));
    await page.click("#continue");
    await page.waitForTimeout(300);
    const npc = page.locator(".welt-hauptquest .npc-start").first();
    if (!(await npc.isDisabled())) fehler.push("Ort-Gate: Gesprächsknopf am falschen Ort nicht gesperrt");
    const reise = page.locator(".welt-hauptquest .ort-gate-reise").first();
    const text = (await reise.count()) ? await reise.textContent() : "";
    if (!/^Nach Eisentor reisen \(1 Etappe\)$/.test(text)) fehler.push("Ort-Gate: Reise-Knopf fehlt oder falsch: „" + text + "“");
    const hinweis = await page.locator(".welt-hauptquest .ort-gate-hinweis").first().textContent().catch(() => "");
    if (!hinweis.includes("Du bist in Valengrad. Reise nach Eisentor, um mit Marschall Kaelen zu sprechen.")) fehler.push("Ort-Gate: Hinweis falsch: „" + hinweis + "“");
    await reise.click();
    await page.waitForTimeout(400);
    if (!(await page.evaluate(() => document.querySelector(".rk-marschiert") !== null))) fehler.push("Ort-Gate: Reise startet keinen Marsch");
    await page.waitForFunction(() => !document.getElementById("reisekarte").open, null, { timeout: 8000 }).catch(() => fehler.push("Ort-Gate: Marsch endet nicht"));
    if (!(await page.locator(".welt-hauptquest .npc-start").first().isEnabled())) fehler.push("Ort-Gate: Gesprächsknopf am Zielort gesperrt");
    console.log("Ort-Gate geprüft");
    await page.close();
  }
  // Kharos 3.0: Anzeigenamen der 15 Fraktionen, Städte und Figuren; Malakor vor Akt 4 nur als Tarnname.
  {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.on("pageerror", (e) => fehler.push("Kharos: " + e.message));
    await page.goto(seite);
    await page.getByText("Neues Spiel").first().click();
    await page.waitForTimeout(200);
    const start = await page.evaluate(() => document.body.innerText);
    for (const name of ["Kaiserreich von Valen", "Flammenorden von Solis", "Freie Kapitäne von Korvath"])
      if (!start.includes(name)) fehler.push("Kharos: Fraktion „" + name + "“ fehlt in der Auswahl");
    for (const alt of ["Kronreich", "Orden der Flamme", "Freie Häfen", "Odris"])
      if (start.includes(alt)) fehler.push("Kharos: alter Name „" + alt + "“ noch sichtbar");
    const json = await page.evaluate(() => {
      let s = { ...rules.create("Prüferin", "kronreich", "frau", 2), scene: "weltknoten", knoten: "kronhall", handlung: null, silver: 100, hauptquest: { schritt: 1, wahl: null } };
      s = rules.read(JSON.stringify(s));
      s.health = rules.healthLimit(s);
      s.journal = ["Erzpriester Thorvald segnet die Glut. Die Stille Feder schweigt."];
      return JSON.stringify(s);
    });
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, json]);
    await page.reload();
    await page.click("#continue");
    await page.waitForTimeout(300);
    await page.getByText("A · Hofstaat", { exact: false }).first().click();
    await page.waitForTimeout(200);
    // v3.0.3: drei Sub-Reiter, Standard A1; die Chronik liegt in A3.
    const reiter = await page.$$eval(".welt-subtab", (k) => k.map((x) => x.textContent));
    if (reiter.join("|") !== "A1 · Aushang & NPCs|A2 · Siedlung & Bau|A3 · Hofstaat & Rekrutierung") fehler.push("v3.0.3: Sub-Reiter falsch: " + reiter.join(", "));
    if (!(await page.locator(".welt-subpanel[data-reiter=a1] .aushang-kachel").count())) fehler.push("v3.0.3: A1 zeigt keine Aushang-Kacheln");
    await page.click("#hof-reiter-a2");
    await page.waitForTimeout(150);
    const bau = await page.locator(".welt-subpanel[data-reiter=a2]").innerText();
    if (!/Siedlung und Bau/.test(bau)) fehler.push("v3.0.3: A2 zeigt keine Siedlung");
    if (/Kosten:/.test(bau)) fehler.push("v3.0.3: doppelte Kosten-Nennung in A2");
    await page.click("#hof-reiter-a3");
    await page.waitForTimeout(150);
    if (!(await page.locator(".welt-subpanel[data-reiter=a3] h3", { hasText: "Hofstaat und Diplomatie" }).count())) fehler.push("v3.0.3: A3 ohne Hofstaat");
    const hub = await page.evaluate(() => document.body.innerText + " " + document.title);
    if (!hub.includes("Valengrad")) fehler.push("Kharos: Hauptstadt Valengrad fehlt");
    if (/Kronhall|Thorvald|Stille Feder|Harald IV|Ragnvald|Aldric\b|\(Henry,|\d Gold\b/.test(hub)) fehler.push("Kharos: alter Name oder Entwicklernotiz sichtbar: " +
      (hub.match(/.{30}(Kronhall|Thorvald|Stille Feder|Harald IV|Ragnvald|Aldric\b|\(Henry,|\d Gold\b).{30}/)?.[0] ?? ""));
    if (/Malakor/.test(hub)) fehler.push("Kharos: Malakor vor Akt 4 erkennbar");
    if (!(await page.locator(".welt-chronik-kharos").count())) fehler.push("Kharos: Chronik (Akt 5 und Aushänge) fehlt im Hofstaat");
    // v3.0.2: Reiseliste – Questziel zuerst, gesperrte Ziele hinter dem Umschalter.
    await page.click("#welt-tab-aufbruch");
    await page.waitForTimeout(150);
    const reise = await page.evaluate(() => ({
      erstes: document.querySelector(".welt-panel .wegweiser-liste li")?.className ?? "",
      gesperrtSichtbar: document.querySelectorAll(".welt-panel .wegweiser-liste .wegweiser-knopf:disabled").length,
      umschalter: document.querySelector(".gesperrt-umschalter")?.textContent ?? "" }));
    if (!/wegweiser-quest/.test(reise.erstes)) fehler.push("v3.0.2: Questziel steht nicht oben in der Reiseliste");
    if (reise.gesperrtSichtbar) fehler.push("v3.0.2: gesperrte Ziele sind nicht eingeklappt");
    if (reise.umschalter && !/^Gesperrte (Seewege|Ziele) anzeigen \(\d+\)$/.test(reise.umschalter)) fehler.push("v3.0.2: Umschalter falsch: " + reise.umschalter);
    if (reise.umschalter) {
      await page.click(".gesperrt-umschalter");
      await page.waitForTimeout(100);
      if (!(await page.locator(".wegweiser-gesperrt li").count())) fehler.push("v3.0.2: Umschalter zeigt die gesperrten Ziele nicht");
    }
    if (!(await page.locator(".welt-hauptquest.quest-aktiv .quest-kurztext").count())) fehler.push("v3.0.2: aktive Quest ohne Kurztext");
    if (await page.locator(".welt-akte:not(details)").count()) fehler.push("v3.0.2: gesperrte Zweige nicht eingeklappt");
    // v3.0.4: Handel mit Schatz-Banner, Symbolen und funktionierendem Kauf/Verkauf.
    await page.click("#welt-tab-kontor").catch(() => {});
    await page.waitForTimeout(100);
    await page.getByRole("button", { name: "Handel öffnen" }).first().click();
    await page.waitForTimeout(200);
    const handel = await page.evaluate(() => ({
      banner: document.querySelector(".schatz-banner")?.innerText ?? "",
      rohstoffe: [...document.querySelectorAll(".rohstoff-raster .inv-row-name strong")].map((x) => x.textContent),
      symbole: document.querySelectorAll(".rohstoff-raster .inv-symbol").length,
      silber: Number(document.querySelector(".schatz-silber strong")?.textContent) }));
    if (!/Dein Silber/.test(handel.banner) || !/Rucksack/.test(handel.banner) || !/Kontor-Vorräte/.test(handel.banner)) fehler.push("v3.0.4: Schatz-Banner unvollständig: " + handel.banner);
    if (handel.rohstoffe.join("|") !== "Nahrung|Bauholz|Roheisen|Bruchstein|Runensplitter") fehler.push("v3.0.4: Rohstoffnamen: " + handel.rohstoffe.join(", "));
    if (handel.symbole !== 5) fehler.push("v3.0.4: Rohstoff-Symbole fehlen (" + handel.symbole + ")");
    const kauf = page.locator(".rohstoff-raster button:not(:disabled)", { hasText: "Kauf 1" }).first();
    if (await kauf.count()) {
      await kauf.click();
      await page.waitForTimeout(150);
      const nachher = Number(await page.locator(".schatz-silber strong").textContent());
      if (!(nachher < handel.silber)) fehler.push("v3.0.4: Kauf 1 ändert das Silber nicht (" + handel.silber + " → " + nachher + ")");
    } else fehler.push("v3.0.4: kein aktiver Kauf-Knopf im Handel");
    console.log("Kharos geprüft");
    await page.close();
  }
  // v3.0.0 Gefährten-Pool: drei Zonen, Tausch in der Hauptstadt, Sperre unterwegs.
  for (const [ort, hauptstadt] of [["kronhall", true], ["hagenfels", false]]) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.on("pageerror", (e) => fehler.push("Gefährten-Pool: " + e.message));
    await page.goto(seite);
    const json = await page.evaluate((knoten) => {
      let s = { ...rules.create("Prüferin", "kronreich", "frau", 2, "krieger"), scene: "weltknoten", knoten, handlung: null,
        party: ["knight", "mage", "priest"], gefaehrtenPool: ["ranger"] };
      s = rules.read(JSON.stringify(s));
      s.health = rules.healthLimit(s);
      return JSON.stringify(s);
    }, ort);
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, json]);
    await page.reload();
    await page.click("#continue");
    await page.waitForTimeout(300);
    await page.click("#side-tab-gefaehrten");
    await page.waitForTimeout(150);
    const zonen = await page.evaluate(() => ({
      trupp: document.getElementById("party-count").textContent, synergie: document.getElementById("party-synergien").textContent,
      reserve: document.querySelector("#gef-reserve h4")?.textContent ?? "", pills: document.querySelectorAll("#gef-reserve .gef-pill").length,
      gesandte: document.querySelector("#gef-gesandte h4")?.textContent ?? "", champions: document.querySelectorAll("#gef-gesandte li").length }));
    if (zonen.trupp !== "Aktiver Kampftrupp (4/4)") fehler.push("Gefährten-Pool: Zone 1 falsch: „" + zonen.trupp + "“");
    if (!zonen.synergie) fehler.push("Gefährten-Pool: Synergiezeile fehlt");
    if (!/^Quartier-Reserve \(Pool\) · 1\/16$/.test(zonen.reserve) || zonen.pills !== 3) fehler.push("Gefährten-Pool: Zone 2 falsch: „" + zonen.reserve + "“, " + zonen.pills + " Filter");
    if (zonen.gesandte !== "Völker-Gesandte & Freischaltungen" || zonen.champions < 4) fehler.push("Gefährten-Pool: Zone 3 falsch");
    const inTrupp = page.locator("#gef-reserve button.gef-tausch").first();
    const reserveKnoepfe = await page.locator("#party-members button.gef-tausch").count();
    if (hauptstadt) {
      if (reserveKnoepfe !== 3) fehler.push("Gefährten-Pool: In der Hauptstadt fehlen die Knöpfe „In Reserve“ (" + reserveKnoepfe + ")");
      await page.locator("#party-members button.gef-tausch").first().click();
      await page.waitForTimeout(150);
      await page.locator("#gef-reserve button.gef-tausch", { hasText: "In Trupp" }).filter({ hasNot: page.locator(":disabled") }).first().click().catch(() => {});
      const party = await page.evaluate(() => document.getElementById("party-count").textContent);
      if (party !== "Aktiver Kampftrupp (4/4)" || !(await page.evaluate(() => document.querySelector("#party-members").textContent.includes("Neri"))))
        fehler.push("Gefährten-Pool: Tausch in der Hauptstadt hat nicht funktioniert (" + party + ")");
    } else {
      if (reserveKnoepfe) fehler.push("Gefährten-Pool: Unterwegs darf es keinen Knopf „In Reserve“ geben");
      if (!(await inTrupp.isDisabled())) fehler.push("Gefährten-Pool: „In Trupp“ unterwegs nicht gesperrt");
      const hinweis = await page.locator("#gef-reserve small").first().textContent().catch(() => "");
      if (hinweis !== "Nur in Hauptstädten möglich") fehler.push("Gefährten-Pool: Hinweis unterwegs falsch: „" + hinweis + "“");
    }
    console.log("Gefährten-Pool " + (hauptstadt ? "in der Hauptstadt" : "unterwegs") + " geprüft");
    await page.close();
  }
  // Fragenkatalog v3.0.4 (Henry, 20. 11. 2026): Titel, nur Menschen wählbar, Volksressource, keine 404-Bilder, Sternenklipp.
  {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const fehlend = [];
    page.on("pageerror", (e) => fehler.push("Fragenkatalog: " + e.message));
    page.on("requestfailed", (r) => fehlend.push(r.url()));
    page.on("response", (r) => { if (r.status() >= 400) fehlend.push(r.url()); });
    await page.goto(seite);
    if (!(await page.title()).includes("Der Krieg um den letzten Atem")) fehler.push("Fragenkatalog 8: Seitentitel falsch");
    if ((await page.locator("h1").first().textContent()) !== "Der Krieg um den letzten Atem") fehler.push("Fragenkatalog 8: Überschrift falsch");
    await page.click("#new-game");
    const auswahl = await page.evaluate(() => ({
      voelker: [...document.querySelectorAll("#volk option")].map((o) => [o.value, o.disabled]),
      fraktionen: [...document.querySelectorAll("#origin option")].map((o) => [o.value, o.disabled, o.textContent]),
    }));
    const frei = auswahl.fraktionen.filter(([, aus]) => !aus).map(([id]) => id).sort().join(",");
    if (frei !== "haefen,kronreich,orden") fehler.push("Fragenkatalog 6: wählbar sind " + frei);
    const bald = auswahl.fraktionen.filter(([, aus, text]) => aus && /Bald verfügbar/.test(text)).length;
    if (bald !== 12) fehler.push("Fragenkatalog 6: " + bald + " statt 12 Fraktionen als „Bald verfügbar“");
    if (auswahl.voelker.filter(([, aus]) => aus).length !== 4) fehler.push("Fragenkatalog 6: andere Völker nicht ausgegraut");
    // Spielstand Orden-Heiler: Mana heißt Flammeneifer; Schritt 2 spricht mit Läuterin Seraphina.
    const json = await page.evaluate(() => {
      let s = { ...rules.create("Prüferin", "orden", "frau", 2, "heiler"), scene: "weltknoten", knoten: "glutberg", handlung: null, hauptquest: { schritt: 1, wahl: null } };
      s = rules.read(JSON.stringify(s));
      s.health = rules.healthLimit(s);
      return JSON.stringify(s);
    });
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, json]);
    await page.reload();
    await page.click("#continue");
    await page.waitForTimeout(400);
    const leiste = await page.evaluate(() => document.body.innerText);
    if (!/Flammeneifer/.test(leiste)) fehler.push("Fragenkatalog 4: Volksressource „Flammeneifer“ fehlt in der Anzeige");
    if (/Thorvaldsklipp/.test(leiste)) fehler.push("Fragenkatalog 9: Thorvaldsklipp noch sichtbar");
    const knopf = await page.locator(".welt-hauptquest .npc-start").first().textContent().catch(() => "");
    if (!/Läuterin Seraphina/.test(knopf)) fehler.push("Fragenkatalog 1: Schritt 2 nennt „" + knopf + "“");
    await page.locator("#npc-dialog").count();
    const bilder = fehlend.filter((url) => /\.(png|jpe?g|webp)(\?|$)/i.test(url));
    if (bilder.length) fehler.push("Fragenkatalog 10: fehlende Bilder angefragt: " + [...new Set(bilder)].slice(0, 5).join(", "));
    console.log("Fragenkatalog geprüft");
    await page.close();
  }
  await browser.close();
  console.log(fehler.length ? "FEHLER:\n" + fehler.join("\n") : "Keine Fehler.");
  process.exitCode = fehler.length ? 1 : 0;
})();
