"use strict";
// Porträt-Paket (Henry, 20. 11. 2026): feste Hauptfiguren und variable NPC-Porträt-Pools.
// Daten: quellen/henry/v2619/npc-portraets-*.json (über systeme-daten.js als systeme.daten.v2619portraets).
// Ladereihenfolge nach Henry: erst ein Bild unter assets/portraits/<dateiname> (PNG, sonst WebP),
// fehlt es, zeigt das Spiel ein stilisiertes SVG-Porträt (Henrys Zeichnung oder aus den Merkmalen erzeugt).
const npcPortraets = (() => {
  const daten = () => systeme.daten.v2619portraets;
  const ORDNER = () => daten().engine.asset_ordner;

  // Zuordnung der Spielfiguren (spiel/npcs.js) zu Henrys Porträts. Die übrigen festen Figuren kommen mit den Dialog-Paketen.
  const spielNpc = { astrid: "kronprinzessin_astrid" };
  const spielPool = { dorfvorsteher: "bauer_und_dorfbewohner", faehrfrau: "bauer_und_dorfbewohner", boersenhaendler: "kontor_verwalter",
    reeder: "kontor_verwalter" };
  // Astrid hat ein fertiges Gemälde, aber keine SVG-Zeichnung: Merkmale für den Fallback aus Henrys Bildbeschreibung.
  const eigeneMerkmale = {
    kronprinzessin_astrid: { geschlecht: "weiblich", alter: "jung", haar: "platinblond_zopf", accessoire: "eisenreif", kleidung: "purpur_pelzkragen", hintergrund: "#3b1d2a" },
  };
  // Anzeigenamen der Pool-Archetypen (nach Geschlecht der Variante).
  const archetypNamen = {
    bauer_und_dorfbewohner: ["Bauer", "Bäuerin"], schmied: ["Schmied", "Schmiedin"], schankwirt: ["Wirt", "Wirtin"],
    wachhauptmann_aushang: ["Wachhauptmann", "Wachhauptfrau"], kraeuterheilerin: ["Heiler", "Kräuterheilerin"],
    kontor_verwalter: ["Kontorvogt", "Kontorvögtin"], soeldner_anwerber: ["Söldnerwerber", "Söldnerwerberin"],
  };

  const stamm = (datei) => String(datei).replace(/\.[a-z]+$/i, "");
  const hash = (text) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);

  function svgVon(dateiStamm) {
    for (const p of daten().svgHaupt.portraets) if (stamm(p.dateiname) === dateiStamm && p.svg_markup) return p.svg_markup;
    for (const pool of daten().svgPools.variable_pools)
      for (const v of pool.varianten) if (stamm(v.dateiname) === dateiStamm && v.svg_markup) return v.svg_markup;
    return null;
  }

  // Feste Figur nach Henrys npc_id.
  function fest(npcId) {
    const f = daten().engine.feste_hauptcharaktere.find((x) => x.npc_id === npcId);
    if (!f) return null;
    return { id: f.npc_id, name: f.name, datei: f.dateiname, svg: svgVon(stamm(f.dateiname)), merkmale: eigeneMerkmale[f.npc_id] ?? null,
      geheim: Boolean(f.geheimnis_sperre) };
  }
  // Pool-Variante: deterministisch nach Lauf-Seed (und Ort, wenn der Pool so eingestellt ist).
  function pool(archetyp, seed, ort = "") {
    const p = daten().engine.variable_welt_npc_pools.find((x) => x.archetyp === archetyp);
    if (!p) return null;
    const mitOrt = /ort/.test(p.auswahl_modus);
    const v = p.varianten[hash(seed + ":" + archetyp + (mitOrt ? ":" + ort : "")) % p.varianten.length];
    const weiblich = v.merkmale?.geschlecht === "weiblich";
    return { id: v.id, name: (archetypNamen[archetyp] ?? [archetyp, archetyp])[weiblich ? 1 : 0], datei: v.dateiname,
      svg: svgVon(stamm(v.dateiname)), merkmale: v.merkmale ?? null, archetyp };
  }
  // Für eine Figur des Spiels (npcs.js-ID) oder einen Ausrufer am Aushang.
  function fuerNpc(npcId, seed, ort = "") {
    if (!npcId) return null;
    if (spielNpc[npcId]) return fest(spielNpc[npcId]);
    if (spielPool[npcId]) return pool(spielPool[npcId], seed, ort);
    if (/^ausrufer-/.test(npcId)) return pool("wachhauptmann_aushang", seed, npcId.slice(9));
    return fest(npcId);
  }

  // ---- Stilisiertes Dark-Fantasy-Porträt aus den Merkmalen (Fallback, wenn weder Bild noch Zeichnung vorliegt) ----
  function aufbauen(m = {}, schluessel = "x") {
    const r = (n) => hash(schluessel + n) % 1000 / 1000;
    const weiblich = m.geschlecht === "weiblich";
    const alt = /alt|aelter|vernarbt/.test(m.alter ?? "");
    const haut = ["#cfa886", "#d6b496", "#c49a76", "#dec0a4"][Math.floor(r("haut") * 4)];
    const haarFarbe = /platin/.test(m.haar ?? "") ? "#e7e2cf" : /silber|grau|weiss/.test((m.haar ?? "") + (m.bart ?? "")) || alt ? "#a8a29e" :
      /braun|zerzaust/.test(m.haar ?? "") ? "#6b4226" : ["#292524", "#451a03", "#57534e"][Math.floor(r("haar") * 3)];
    const augen = ["#475569", "#65a30d", "#0284c7", "#d97706"][Math.floor(r("augen") * 4)];
    const bg = m.hintergrund ?? ["#1c1917", "#292524", "#0f172a", "#27130c"][Math.floor(r("bg") * 4)];
    const kleid = /purpur|crimson/.test(m.kleidung ?? "") ? "#7f1d1d" : /leder/.test(m.kleidung ?? "") ? "#3f2e21" : ["#44403c", "#57534e", "#3f2e21"][Math.floor(r("kleid") * 3)];
    let s = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 240'><rect width='200' height='240' fill='" + bg + "'/>" +
      "<path d='M28,240 L50,170 L150,170 L172,240 Z' fill='" + kleid + "'/>";
    if (/pelz/.test(m.kleidung ?? "")) s += "<path d='M50,172 Q100,150 150,172 L146,190 Q100,174 54,190 Z' fill='#78716c'/>";
    if (/kopftuch|kapuze/.test(m.haar ?? "")) s += "<path d='M48,90 Q52,36 100,36 Q148,36 152,90 L160,240 L40,240 Z' fill='" + haarFarbe + "'/>";
    else if (/zopf|knoten|straehnen|lang/.test(m.haar ?? "") || weiblich) s += "<path d='M58,150 Q52,70 70,52 Q100,30 130,52 Q148,70 142,150 L130,160 L70,160 Z' fill='" + haarFarbe + "'/>";
    s += "<path d='M68,72 Q68,142 100,154 Q132,142 132,72 Q128,42 100,42 Q72,42 68,72 Z' fill='" + haut + "'/>";
    if (/rasiert/.test(m.haar ?? "")) s += "<path d='M70,70 Q74,42 100,42 Q120,42 128,56 L118,58 Q100,50 82,62 Z' fill='" + haarFarbe + "'/>";
    else if (/halbglatze/.test(m.haar ?? "")) s += "<path d='M68,78 Q66,60 72,56 L74,80 Z M132,78 Q134,60 128,56 L126,80 Z' fill='" + haarFarbe + "'/>";
    else if (!/kopftuch|kapuze/.test(m.haar ?? "")) s += "<path d='M64,76 Q68,38 100,38 Q132,38 136,76 Q118,54 100,54 Q82,54 64,76 Z' fill='" + haarFarbe + "'/>";
    if (/nasenhelm/.test(m.helm ?? "")) s += "<path d='M62,74 Q64,34 100,34 Q136,34 138,74 Z' fill='#64748b'/><rect x='97' y='68' width='6' height='34' fill='#64748b'/>";
    if (/eisenreif/.test(m.accessoire ?? "")) s += "<path d='M68,62 Q100,52 132,62' stroke='#94a3b8' stroke-width='4' fill='none'/>";
    if (/zopf/.test(m.haar ?? "")) s += "<path d='M132,96 Q146,130 136,172' stroke='" + haarFarbe + "' stroke-width='9' fill='none' stroke-linecap='round'/>";
    s += "<path d='M76,86 L91,88 M109,88 L124,86' stroke='#292524' stroke-width='2.5'/>";
    if (/augenklappe/.test(m.accessoire ?? "")) s += "<path d='M68,84 L126,102' stroke='#09090b' stroke-width='3'/><ellipse cx='84' cy='93' rx='8' ry='6' fill='#09090b'/>";
    else s += "<circle cx='84' cy='93' r='3.2' fill='" + augen + "'/>";
    s += "<circle cx='116' cy='93' r='3.2' fill='" + augen + "'/><path d='M99,92 L96,109 L104,109' stroke='#8a6648' stroke-width='2' fill='none'/>";
    if (/narbe/.test(m.narbe ?? "") || /narben|vernarbt/.test((m.haar ?? "") + (m.alter ?? ""))) s += "<path d='M110,70 L120,80' stroke='#b45353' stroke-width='2'/>";
    if (m.bart) s += "<path d='M70,114 Q76," + (/vollbart|breit/.test(m.bart) ? 176 : 154) + " 100,160 Q124,154 130,114 Q112,126 100,124 Q88,126 70,114 Z' fill='" +
      (/grau|stoppel/.test(m.bart) ? "#a8a29e" : haarFarbe) + "'" + (/stoppel/.test(m.bart) ? " opacity='0.55'" : "") + "/>";
    else s += "<path d='M89,122 Q100," + (weiblich ? 125 : 123) + " 111,122' stroke='#7c3f36' stroke-width='2.5' fill='none'/>";
    if (/schuerze/.test(m.kleidung ?? "")) s += "<path d='M70,240 L76,176 L124,176 L130,240 Z' fill='#5b3a22'/>";
    return s + "</svg>";
  }

  // SVG-Markup sicher einsetzen: Henrys Zeichnungen tragen eine verkürzte Namensraum-Adresse und feste Verlaufs-IDs.
  let zaehler = 0;
  function svgElement(eintrag) {
    let markup = eintrag.svg ?? aufbauen(eintrag.merkmale ?? {}, eintrag.id);
    const suffix = "-p" + (++zaehler);
    markup = markup.replace("xmlns='http://w3.org'", "xmlns='http://www.w3.org/2000/svg'")
      .replace(/id='([^']+)'/g, (_, id) => "id='" + id + suffix + "'").replace(/url\(#([^)]+)\)/g, (_, id) => "url(#" + id + suffix + ")");
    const vorlage = document.createElement("template");
    vorlage.innerHTML = markup.trim();
    const svg = vorlage.content.firstElementChild;
    if (svg?.tagName?.toLowerCase() !== "svg") return null;
    svg.setAttribute("role", "presentation");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    return svg;
  }

  // Bild unter assets/portraits/ probieren (PNG, dann WebP), sonst SVG behalten.
  const status = new Map();
  function bildLaden(box, eintrag) {
    const kandidaten = [ORDNER() + eintrag.datei, ORDNER() + stamm(eintrag.datei) + ".webp"].filter((url) => status.get(url) !== "fehlt");
    const versuch = (i) => {
      if (i >= kandidaten.length) return;
      const url = kandidaten[i];
      const bild = new Image();
      bild.alt = "";
      bild.decoding = "async";
      bild.onload = () => { status.set(url, "ok"); if (box.dataset.portraet === eintrag.id) box.replaceChildren(bild); };
      bild.onerror = () => { status.set(url, "fehlt"); versuch(i + 1); };
      bild.src = url;
    };
    versuch(0);
  }
  // Porträt in ein Kästchen setzen: sofort das SVG, das Bild ersetzt es, sobald es geladen ist.
  function zeigen(box, eintrag) {
    if (!box || !eintrag) return false;
    if (box.dataset.portraet === eintrag.id && box.firstChild) return true;
    box.dataset.portraet = eintrag.id;
    const svg = svgElement(eintrag);
    box.replaceChildren(...(svg ? [svg] : []));
    bildLaden(box, eintrag);
    return true;
  }

  return { fest, pool, fuerNpc, zeigen, aufbauen, archetypNamen };
})();
