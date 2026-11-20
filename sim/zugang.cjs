"use strict";

// Bedienbarkeits-Messung für den Altersgruppen-Test (Henry, 20. 11. 2026). Spielt den Einstieg (Start, Charakter,
// Prolog bis zur Hauptstadt, Hauptquest-Gespräch, Inventar, Karte) im Browser durch, auf Handy (390 px) und
// Laptop (1366 px), und misst je Bildschirm: kleinste Schrift, zu kleine Tippziele (< 44 px), Wörter im Text,
// lange Sätze, Fachbegriffe, Knöpfe, waagrechtes Scrollen, Konsolenfehler. Screenshots in sim/zugang/.
//
//   node sim/zugang.cjs

const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");

const seite = "file://" + path.join(__dirname, "..", "index.html");
const ordner = path.join(__dirname, "zugang");
fs.mkdirSync(ordner, { recursive: true });
const BEGRIFFE = ["Etappe", "Kontor", "Vorrat", "Glut", "Moral", "Ruf", "Leiste", "Zehnt", "Garnison", "Ahnen", "Talent", "Spezialisierung",
  "Initiative", "Ausweich", "Rüstung", "Krit", "Mana", "Ausdauer", "Flammeneifer", "Runensplitter", "Söldner", "Abgesandte", "Synergie",
  "Hardcore", "Permadeath", "Questziel", "Aushang", "Hofstaat", "Gebietsstufe", "Machtbudget", "Ort-Gate"];

async function messen(page, name) {
  const m = await page.evaluate((begriffe) => {
    const sichtbar = (el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none" && r.bottom > 0 && r.top < innerHeight * 3; };
    const textEl = [...document.querySelectorAll("body *")].filter((el) => sichtbar(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const groessen = textEl.map((el) => parseFloat(getComputedStyle(el).fontSize));
    const klein = textEl.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 13).map((el) => el.textContent.trim().slice(0, 40));
    const knoepfe = [...document.querySelectorAll("button, a, select, input, summary, [role=button]")].filter(sichtbar);
    const winzig = knoepfe.filter((b) => { const r = b.getBoundingClientRect(); return r.height < 44 || r.width < 44; })
      .map((b) => (b.textContent || b.getAttribute("aria-label") || b.tagName).trim().slice(0, 30));
    const text = document.body.innerText;
    const saetze = text.split(/(?<=[.!?“])\s+/).map((x) => x.trim()).filter((x) => x.split(/\s+/).length > 3);
    const lang = saetze.filter((x) => x.split(/\s+/).length > 25).length;
    const woerter = text.split(/\s+/).filter(Boolean).length;
    const treffer = begriffe.filter((b) => text.includes(b));
    const ohneTitel = knoepfe.filter((b) => !b.textContent.trim() && !b.getAttribute("aria-label") && !b.title).length;
    return { minSchrift: Math.min(...groessen), anteilKlein: Math.round((klein.length / Math.max(1, textEl.length)) * 100), beispieleKlein: [...new Set(klein)].slice(0, 6),
      knoepfe: knoepfe.length, winzig: winzig.length, beispieleWinzig: [...new Set(winzig)].slice(0, 6), woerter, langeSaetze: lang,
      saetze: saetze.length, begriffe: treffer, ohneTitel, querScroll: document.documentElement.scrollWidth > innerWidth + 1 };
  }, BEGRIFFE);
  await page.screenshot({ path: path.join(ordner, name + ".png"), fullPage: false });
  return { name, ...m };
}

(async () => {
  const browser = await chromium.launch();
  const ergebnis = [];
  for (const [geraet, viewport] of [["handy", { width: 390, height: 844 }], ["laptop", { width: 1366, height: 900 }]]) {
    const page = await browser.newPage({ viewport });
    const fehler = [];
    page.on("pageerror", (e) => fehler.push(e.message));
    page.on("console", (msg) => { if (msg.type() === "error") fehler.push(msg.text()); });
    await page.goto(seite);
    await page.waitForTimeout(400);
    ergebnis.push({ geraet, ...(await messen(page, geraet + "-1-start")) });
    await page.click("#new-game");
    await page.waitForTimeout(300);
    ergebnis.push({ geraet, ...(await messen(page, geraet + "-2-charakter")) });
    await page.fill("#character-name", "Mira");
    await page.selectOption("#origin", "kronreich");
    await page.click("#skill-suggest").catch(() => {});
    await page.click("#character-submit");
    await page.waitForTimeout(600);
    ergebnis.push({ geraet, ...(await messen(page, geraet + "-3-prolog")) });
    // Prolog: zweimal „Weiter“, dann „Prolog überspringen“ und die erste Szene mit Wahl messen. Danach direkt einen
    // Stand in der Hauptstadt laden (wie sim/oberflaeche.cjs), damit die Messung nicht im Prolog-Kampf hängt.
    for (let i = 0; i < 2; i++) { await page.locator("button", { hasText: /^Weiter$/ }).first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(250); }
    ergebnis.push({ geraet, ...(await messen(page, geraet + "-3b-prolog-mitte")) });
    await page.click("#intro-skip", { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(500);
    ergebnis.push({ geraet, ...(await messen(page, geraet + "-3c-erste-szene")) });
    const json = await page.evaluate(() => {
      let s = { ...rules.create("Mira", "kronreich", "frau", 2), scene: "weltknoten", knoten: "kronhall", handlung: null };
      s = rules.read(JSON.stringify(s)); s.health = rules.healthLimit(s); return JSON.stringify(s);
    });
    await page.evaluate((v) => localStorage.setItem("aschenkrone.valmarch.v1", v), json);
    await page.reload();
    await page.click("#continue");
    await page.waitForTimeout(500);
    ergebnis.push({ geraet, ...(await messen(page, geraet + "-4-hauptstadt")) });
    const npc = page.locator(".welt-hauptquest .npc-start").first();
    if (await npc.count() && await npc.isEnabled()) {
      await npc.click();
      await page.waitForTimeout(300);
      ergebnis.push({ geraet, ...(await messen(page, geraet + "-5-hauptquest-gespraech")) });
      await page.keyboard.press("Escape");
    }
    await page.evaluate(() => document.querySelector("[data-sheet-open]")?.click());
    await page.waitForTimeout(300);
    ergebnis.push({ geraet, ...(await messen(page, geraet + "-6-charakterfenster")) });
    await page.keyboard.press("Escape");
    ergebnis.push({ geraet, fehler: [...new Set(fehler)].slice(0, 8) });
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, "zugang-ergebnis.json"), JSON.stringify(ergebnis, null, 1));
  for (const e of ergebnis) console.log(JSON.stringify(e));
})();
