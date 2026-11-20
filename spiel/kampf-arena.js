"use strict";
// Kampf-Paket (Henry, 20. 11. 2026): 2D-Kampfarena in Seitenansicht mit SVG-Figuren, Bühnen nach Region und Treffer-Feedback.
// Datenquelle: quellen/henry/v2619/kampf-animationen.json, kampfarena-2d.json, kampfbuehnen.json (über systeme-daten.js).
// Die Arena ist reine Anzeige: Sie liest den Spielstand nicht selbst, spiel.js gibt ihr eine fertige Beschreibung.
const kampfArena = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const daten = () => systeme.daten.v2619kampf;
  const warte = (ms) => new Promise((fertig) => setTimeout(fertig, ms));

  // ---- Bühnen ----
  // Hintergrund-Silhouetten je Bühne (Henrys Ebenen-Beschreibungen als einfache Vektorformen, 400 × 220).
  const kulissen = {
    westmark_ebene: '<path class="bk-fern" d="M0 132 Q40 104 82 120 T170 112 T262 122 T340 106 T400 118 V220 H0Z"/>' +
      '<path class="bk-rauch" d="M86 112 C80 90 98 78 90 56 C84 38 96 26 92 8"/><path class="bk-rauch" d="M300 108 C306 86 290 72 298 50 C304 34 294 20 300 4"/>' +
      '<path class="bk-nah" d="M0 152 Q60 140 130 150 T260 146 T400 152 V220 H0Z"/>' +
      '<g class="bk-detail"><circle cx="62" cy="182" r="11"/><circle cx="62" cy="182" r="3"/><path d="M62 171V193M51 182H73"/>' +
      '<circle cx="338" cy="190" r="9"/><path d="M338 181V199M329 190H347"/></g>',
    glutberg_und_aschland: '<path class="bk-fern" d="M0 140 L30 96 L52 120 L84 70 L112 118 L150 92 L182 128 L222 80 L250 112 L296 64 L330 116 L366 88 L400 124 V220 H0Z"/>' +
      '<path class="bk-glut" d="M84 70 L90 98 L86 120M296 64 L300 90 L292 116M222 80 L226 104"/>' +
      '<path class="bk-nah" d="M0 156 L80 150 L170 158 L260 150 L400 156 V220 H0Z"/>' +
      '<g class="bk-runen"><path d="M70 176 L96 186 L84 198M240 172 L266 180 L252 196M330 188 L350 182"/></g>',
    salzklippen_und_kueste: '<path class="bk-see" d="M0 118 Q25 112 50 118 T100 118 T150 118 T200 118 T250 118 T300 118 T350 118 T400 118 V220 H0Z"/>' +
      '<g class="bk-mast"><path d="M120 116V60M120 66 L146 92 L120 92M300 116V70M300 76 L280 98 L300 98"/></g>' +
      '<path class="bk-nebel" d="M0 104 Q100 96 200 106 T400 100 V122 H0Z"/>' +
      '<path class="bk-nah" d="M0 154 L400 150 V220 H0Z"/>' +
      '<g class="bk-detail"><path d="M0 168H400M0 186H400M0 204H400"/></g>',
    altes_reich_ruinen: '<g class="bk-fern"><path d="M30 150V70 Q70 30 110 70V150H96V80 Q70 54 44 80V150Z"/>' +
      '<path d="M250 150V60 Q300 14 350 60V150H334V72 Q300 38 266 72V150Z"/><rect x="170" y="78" width="22" height="72"/><rect x="380" y="96" width="16" height="54"/></g>' +
      '<path class="bk-nah" d="M0 150 H400 V220 H0Z"/>' +
      '<g class="bk-runen"><path d="M0 170H400M0 196H400M60 150V220M150 150V220M240 150V220M330 150V220"/></g>',
    eispass_und_norden: '<path class="bk-fern" d="M0 136 L46 70 L74 100 L120 40 L168 108 L208 66 L250 112 L300 50 L346 104 L400 72 V220 H0Z"/>' +
      '<path class="bk-schnee" d="M46 70 L56 84 L38 84ZM120 40 L136 64 L104 64ZM208 66 L220 82 L196 82ZM300 50 L316 72 L284 72ZM400 72 L392 86 L380 84Z"/>' +
      '<path class="bk-nah" d="M0 152 Q100 146 200 152 T400 150 V220 H0Z"/>' +
      '<g class="bk-detail"><path d="M40 182 L120 178M220 196 L320 192"/></g>',
    duesterwald_und_grenzhaus: '<g class="bk-fern"><path d="M10 150 L30 70 L50 150ZM50 150 L74 56 L98 150ZM120 150 L138 80 L156 150ZM230 150 L254 60 L278 150ZM300 150 L322 74 L344 150ZM350 150 L376 50 L400 150Z"/></g>' +
      '<path class="bk-nebel" d="M0 132 Q100 120 200 132 T400 128 V154 H0Z"/>' +
      '<path class="bk-nah" d="M0 154 Q120 148 220 154 T400 152 V220 H0Z"/>' +
      '<g class="bk-detail"><path d="M30 176 Q60 168 90 180M250 192 Q290 182 320 196M150 206 Q170 198 196 208"/></g>',
  };
  const buehne = (id) => daten().buehnen.buehnen_katalog.find((b) => b.buehnen_id === id) ??
    daten().buehnen.buehnen_katalog.find((b) => b.buehnen_id === daten().buehnen.standard_buehne);

  // ---- Figuren (modulares SVG-Rig: Schatten, Beine, Torso, Kopf/Helm, Schild oder Nebenhand, Waffenarm) ----
  const helme = {
    nordischer_nasenhelm: '<path class="rig-helm" d="M21 13 Q30 2 39 13 V19 H21Z"/><path class="rig-metall" d="M29 10 H31 V23 H29Z"/>',
    kapuze: '<path class="rig-helm" d="M19 22 Q19 4 31 4 Q42 6 41 22 L36 18 Q30 14 24 18Z"/>',
    ordens_kapuze: '<path class="rig-helm" d="M19 24 Q18 2 30 2 Q42 2 41 24 L35 19 Q30 15 25 19Z"/><path class="rig-akzent" d="M29 6 H31 V12 H29Z"/>',
    zerfetzte_kappe: '<path class="rig-helm" d="M20 14 Q30 6 40 14 L38 17 L35 14 L32 17 L28 14 L24 17Z"/>',
    krone: '<path class="rig-akzent" d="M20 13 L22 4 L26 10 L30 2 L34 10 L38 4 L40 13Z"/>',
  };
  const waffen = {
    schwere_streitaxt: '<path class="rig-holz" d="M45 18 L49 56"/><path class="rig-metall" d="M41 16 Q52 8 56 20 Q50 24 45 24Z"/>',
    kurzbogen_oder_dolche: '<path class="rig-holz" d="M50 14 Q60 34 50 56" fill="none"/><path class="rig-sehne" d="M50 14 V56"/>',
    runenstab: '<path class="rig-holz" d="M47 8 L49 62"/><circle class="rig-akzent" cx="47" cy="8" r="4"/>',
    rostiges_schwert_oder_armbrust: '<path class="rig-rost" d="M46 20 L54 52 L51 53 L43 21Z"/><path class="rig-holz" d="M41 22 H50"/>',
    aschen_zepter: '<path class="rig-holz" d="M47 4 L49 62"/><path class="rig-akzent" d="M41 6 L47 -2 L53 6 L47 12Z"/>',
  };
  const schilde = {
    rundschild_eisen: '<circle class="rig-schild" cx="15" cy="36" r="10"/><circle class="rig-metall" cx="15" cy="36" r="2.5"/>',
    keiner: '<path class="rig-haut" d="M16 30 L12 44"/>',
    glut_flamme_hand: '<path class="rig-glut" d="M12 40 Q8 30 14 24 Q14 32 18 30 Q20 36 12 40Z"/>',
    holz_buckler: '<circle class="rig-holzschild" cx="15" cy="38" r="7"/>',
  };
  const silhouette = (typ) => daten().arena.klassen_und_gegner_silhouetten.find((s) => s.typ === typ);

  function rig(typ, { gegner = false } = {}) {
    const s = silhouette(typ) ?? silhouette("deserteur_pluenderer");
    const helm = s.typ === "boss_thorvald" ? helme.ordens_kapuze + helme.krone : helme[s.helm] ?? helme.zerfetzte_kappe;
    const schild = s.typ === "boss_thorvald" ? schilde.glut_flamme_hand : schilde[s.schild] ?? schilde.keiner;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "-4 -6 68 90");
    svg.setAttribute("class", "rig");
    svg.style.setProperty("--akzent", s.akzent_farbe);
    svg.innerHTML =
      (s.aura ? '<ellipse class="rig-aura" cx="30" cy="40" rx="30" ry="40"/>' : "") +
      '<ellipse class="rig-schatten" cx="30" cy="80" rx="20" ry="4"/>' +
      '<g class="rig-beine"><path d="M24 52 L20 78 H26 L29 56"/><path d="M36 52 L40 78 H34 L31 56"/></g>' +
      '<path class="rig-torso" d="M20 22 Q30 18 40 22 L42 54 Q30 58 18 54Z"/><path class="rig-akzent" d="M20 44 H40 V48 H20Z"/>' +
      '<g class="rig-kopf"><circle class="rig-haut" cx="30" cy="16" r="7"/>' + helm + "</g>" +
      '<g class="rig-nebenhand">' + schild + "</g>" +
      '<g class="rig-waffenarm"><path class="rig-arm" d="M38 26 L46 38"/>' + (waffen[s.waffe] ?? waffen.rostiges_schwert_oder_armbrust) + "</g>";
    if (gegner) svg.classList.add("rig-gegner");
    return svg;
  }

  // Tiere und Ungeheuer ohne Bestiariumsbild: eine geduckte Bestien-Silhouette (eigene Ergänzung, Henrys Katalog hat nur Menschenformen).
  function bestie(akzent) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "-4 -6 88 90");
    svg.setAttribute("class", "rig rig-bestie");
    svg.style.setProperty("--akzent", akzent);
    svg.innerHTML = '<ellipse class="rig-schatten" cx="40" cy="80" rx="30" ry="4"/>' +
      '<g class="rig-beine"><path d="M18 56 L14 78 H21 L25 60"/><path d="M58 56 L62 78 H55 L52 60"/></g>' +
      '<path class="rig-torso" d="M10 46 Q14 28 40 30 Q62 28 70 44 Q66 62 40 62 Q16 64 10 46Z"/>' +
      '<g class="rig-waffenarm"><path class="rig-torso" d="M62 36 Q74 26 82 34 Q80 46 70 48Z"/><circle class="rig-akzent" cx="74" cy="36" r="2.2"/>' +
      '<path class="rig-metall" d="M76 44 L80 50 M72 46 L74 52"/></g>';
    return svg;
  }

  function figur(f, slot, seite) {
    const box = document.createElement("div");
    box.className = "arena-figur rig-idle-breathe" + (seite === "gegner" ? " arena-gegner" : "") + (f.lp <= 0 ? " rig-collapse-ash ist-besiegt war-besiegt" : "");
    box.dataset.arena = seite === "gegner" ? "gegner-" + f.id : f.id;
    box.style.left = slot.x + "%";
    box.style.top = slot.y + "%";
    box.style.setProperty("--skala", f.skala ?? 1);
    box.style.animationDelay = -(slot.x * 37 % 1800) + "ms";
    if (f.bild) {
      const img = document.createElement("img");
      img.src = "bestiarium/bilder/" + f.bild;
      img.alt = "";
      img.className = "arena-sprite";
      box.append(img);
    } else box.append(f.typ === "bestie" ? bestie(f.akzent ?? "#78716c") : rig(f.typ, { gegner: seite === "gegner" }));
    const name = document.createElement("span");
    name.className = "arena-name";
    name.textContent = f.name;
    box.append(name);
    return box;
  }

  // Beschreibung: { buehne, aura, gruppe:[{id,typ,name,lp,max}], gegner:[{id,typ,bild,name,lp,max,skala}] }
  function bauen(beschreibung) {
    const arena = document.createElement("div");
    const b = buehne(beschreibung.buehne);
    arena.className = "kampf-arena" + (beschreibung.aura ? " arena-boss-aura" : "");
    arena.dataset.buehne = b.buehnen_id;
    arena.setAttribute("role", "img");
    arena.setAttribute("aria-label", "Kampfbühne: " + b.name);
    arena.style.setProperty("--arena-hoehe", daten().arena.arena_layout.hoehe_px + "px");
    arena.style.setProperty("--himmel", "linear-gradient(180deg, " + b.lichtstimmung.himmel_gradient.join(", ") + ")");
    arena.style.setProperty("--glimmen", b.lichtstimmung.horizont_glimmen);
    arena.style.setProperty("--partikel", b.partikel_effekt.farbe);
    const kulisse = document.createElementNS(NS, "svg");
    kulisse.setAttribute("viewBox", "0 0 400 220");
    kulisse.setAttribute("preserveAspectRatio", "none");
    kulisse.setAttribute("class", "arena-kulisse");
    kulisse.innerHTML = kulissen[b.buehnen_id] ?? kulissen.westmark_ebene;
    const partikel = document.createElement("div");
    partikel.className = "arena-partikel partikel-" + b.partikel_effekt.typ;
    for (let i = 0; i < b.partikel_effekt.anzahl; i++) {
      const p = document.createElement("i");
      p.style.left = ((i * 61) % 100) + "%";
      p.style.top = ((i * 37) % 90) + "%";
      p.style.animationDelay = -((i * 431) % 4000) + "ms";
      p.style.animationDuration = 2600 + (i * 173) % 2200 + "ms";
      partikel.append(p);
    }
    const titel = document.createElement("span");
    titel.className = "arena-titel";
    titel.textContent = b.name;
    const buehneEbene = document.createElement("div");
    buehneEbene.className = "arena-figuren";
    const layout = daten().arena.arena_layout;
    beschreibung.gruppe.slice(0, 4).forEach((f, i) => buehneEbene.append(figur(f, layout.linke_seite.formations_koordinaten_prozent[i], "gruppe")));
    beschreibung.gegner.forEach((f, i) => {
      const slots = layout.rechte_seite.formations_koordinaten_prozent;
      const slot = slots[i % slots.length];
      // Mehr als vier Gegner (selten): weitere stehen leicht versetzt hinter der Reihe.
      buehneEbene.append(figur(f, i < slots.length ? slot : { x: Math.min(96, slot.x + 5), y: slot.y - 6 }, "gegner"));
    });
    arena.append(kulisse, partikel, buehneEbene, titel);
    return arena;
  }

  // ---- Effekte ----
  const anim = () => daten().animationen;
  function schwebeText(arena, figurEl, art, werte) {
    const fct = anim().visuelle_effekte.floating_combat_text;
    const stil = fct.stile[art];
    if (!fct.aktiv || !stil || !figurEl) return;
    const text = document.createElement("span");
    text.className = "arena-text arena-text-" + art;
    text.textContent = stil.vorlage.replace("{schaden}", werte.schaden).replace("{wert}", werte.wert).replace("{rest}", werte.rest);
    text.style.left = figurEl.style.left;
    text.style.top = "calc(" + figurEl.style.top + " - 3.2rem)";
    text.style.color = stil.farbe;
    text.style.setProperty("--fct-skala", stil.skalierung ?? 1);
    text.style.setProperty("--fct-aufstieg", -fct.aufstieg_px + "px");
    text.style.animationDuration = fct.dauer_ms + "ms";
    text.setAttribute("aria-hidden", "true");
    arena.append(text);
    setTimeout(() => text.remove(), fct.dauer_ms + 60);
  }
  function waffenEffekt(arena, figurEl, typ) {
    const e = anim().visuelle_effekte.svg_waffen_effekte.find((w) => w.typ === typ);
    if (!e || !figurEl) return;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("class", "arena-effekt effekt-" + typ);
    svg.setAttribute("aria-hidden", "true");
    svg.style.left = figurEl.style.left;
    svg.style.top = "calc(" + figurEl.style.top + " - 1.6rem)";
    svg.style.animationDuration = e.dauer_ms + "ms";
    svg.style.color = e.farbe;
    svg.innerHTML = e.svg_pfad ? '<path d="' + e.svg_pfad + '"/>' :
      '<path d="M50 12 L84 24 V52 Q84 76 50 90 Q16 76 16 52 V24Z"/><path d="M30 50 H70 M50 30 V70"/>';
    arena.append(svg);
    setTimeout(() => svg.remove(), e.dauer_ms + 40);
  }
  function projektil(arena, von, nach, typ) {
    const p = document.createElement("span");
    p.className = "arena-projektil projektil-" + typ;
    p.setAttribute("aria-hidden", "true");
    const flug = daten().arena["2d_modell_generator"].animationen.fernkampf_oder_zauber.projektil_flug_ms;
    p.style.left = von.style.left;
    p.style.top = "calc(" + von.style.top + " - 1.8rem)";
    arena.append(p);
    const dx = (parseFloat(nach.style.left) - parseFloat(von.style.left)) / 100 * arena.clientWidth;
    const dy = (parseFloat(nach.style.top) - parseFloat(von.style.top)) / 100 * arena.clientHeight;
    const lauf = p.animate([{ transform: "translate(0,0)" }, { transform: "translate(" + dx + "px," + dy + "px)" }], { duration: flug, easing: "ease-in" });
    return lauf.finished.catch(() => {}).then(() => p.remove());
  }

  // Ein Kampfereignis abspielen. aktion: { von, ziel (Arena-Schlüssel), art: "nah"|"fern"|"heilung"|"keine", projektil, effekt,
  //   text: { art, schaden, wert, rest }, ausweichen, besiegt, krit }. Liefert ein Promise, das nach dem Treffermoment erfüllt ist.
  async function abspielen(arena, aktion) {
    if (!arena?.isConnected) return;
    const A = daten().arena["2d_modell_generator"].animationen;
    const von = aktion.von && arena.querySelector('[data-arena="' + aktion.von + '"]');
    const ziel = aktion.ziel && arena.querySelector('[data-arena="' + aktion.ziel + '"]');
    const gegnerSeite = von?.classList.contains("arena-gegner");
    if (von && ziel && aktion.art === "nah") {
      const dx = (parseFloat(ziel.style.left) - parseFloat(von.style.left)) / 100 * arena.clientWidth;
      const dy = (parseFloat(ziel.style.top) - parseFloat(von.style.top)) / 100 * arena.clientHeight;
      const ox = A.vorsturm_angriff.ziel_offset_x_px * (gegnerSeite ? -1 : 1);
      const hin = "translate(" + (dx + ox) + "px," + dy + "px)";
      von.classList.add("ist-am-zug");
      await von.animate([{ transform: "translate(0,0)" }, { transform: hin }], { duration: A.vorsturm_angriff.vorlauf_ms, easing: "ease-out", fill: "forwards" }).finished.catch(() => {});
      von.classList.add("rig-schwung");
      await warte(A.vorsturm_angriff.schlag_schwung_ms);
      treffer(arena, ziel, aktion);
      von.animate([{ transform: hin }, { transform: "translate(0,0)" }], { duration: A.vorsturm_angriff.rueckzug_ms, easing: "ease-in-out", fill: "forwards" })
        .finished.catch(() => {}).then(() => von.classList.remove("rig-schwung", "ist-am-zug"));
      return;
    }
    if (von && ziel && aktion.art === "fern") {
      von.classList.add("ist-am-zug", "rig-hebepose");
      await warte(A.fernkampf_oder_zauber.hebepose_ms);
      await projektil(arena, von, ziel, aktion.projektil ?? "pfeil_bolzen");
      treffer(arena, ziel, aktion);
      setTimeout(() => von.classList.remove("ist-am-zug", "rig-hebepose"), 120);
      return;
    }
    if (von && aktion.art === "heilung") {
      von.classList.add("ist-am-zug", "rig-hebepose");
      await warte(A.fernkampf_oder_zauber.hebepose_ms);
      treffer(arena, ziel ?? von, aktion);
      setTimeout(() => von.classList.remove("ist-am-zug", "rig-hebepose"), 120);
      return;
    }
    if (von && aktion.art === "deckung") {
      waffenEffekt(arena, von, "schild_block");
      von.classList.add("ist-am-zug");
      await warte(A.treffer.dauer_ms);
      von.classList.remove("ist-am-zug");
      return;
    }
    treffer(arena, ziel, aktion);
  }
  function treffer(arena, ziel, aktion) {
    if (!ziel) return;
    const A = daten().arena["2d_modell_generator"].animationen;
    if (aktion.effekt) waffenEffekt(arena, ziel, aktion.effekt);
    if (aktion.text) schwebeText(arena, ziel, aktion.text.art, aktion.text);
    if (aktion.ausweichen) {
      const weg = A.ausweichen.offset_x_px * (ziel.classList.contains("arena-gegner") ? 1 : -1);
      ziel.animate([{ translate: "0 0" }, { translate: weg + "px 0" }, { translate: "0 0" }], { duration: A.ausweichen.dauer_ms, easing: "ease-out" });
      return;
    }
    if (aktion.art !== "heilung") {
      ziel.classList.remove(A.treffer.css_klasse);
      void ziel.offsetWidth;
      ziel.classList.add(A.treffer.css_klasse);
      setTimeout(() => ziel.classList.remove(A.treffer.css_klasse), A.treffer.dauer_ms);
    } else {
      ziel.classList.add("rig-geheilt");
      setTimeout(() => ziel.classList.remove("rig-geheilt"), 500);
    }
    if (aktion.krit) {
      const T = anim().visuelle_effekte.treffer_reaktion;
      arena.closest(".battlefield")?.animate(
        [0, 1, -1, 1, -1, 0].map((r) => ({ transform: "translate(" + r * T.krit_screen_shake_px + "px," + (r * T.krit_screen_shake_px) / 2 + "px)" })),
        { duration: T.krit_screen_shake_dauer_ms });
    }
    if (aktion.besiegt) setTimeout(() => ziel.classList.add(A.besiegt.css_klasse, "ist-besiegt"), A.treffer.dauer_ms);
  }

  return { bauen, abspielen, buehne, daten };
})();
