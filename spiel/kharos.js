"use strict";
// Kharos 3.0 (Henry, 20. 11. 2026): Umbenennungsschicht über der bestehenden Welt.
// Verbindlich: Karte „Entwurf 3“, alle 510 Orte, IDs, Spielstände, Klassen 6×6 und alle Rechenregeln bleiben.
// Nur Anzeigenamen ändern sich: Welt Odris → Kharos, 15 Fraktionen, 15 Haupt- und 15 Zweitstädte (mapping-entwurf3.json),
// Hauptfiguren (Astrid → Kaiserin Aurelia, Ragna → Großinquisitor Vane, Zollmeister → Flottenfürst Draven),
// Thorvald → vor Akt 4 „der Verhüllte Sternenleser“, danach „Archivar Malakor“; Stille Feder → Der Schweigsame Chronist.
// Die Schicht arbeitet nur auf angezeigtem Text (DOM). Daten, IDs und Nachschlagen per Name bleiben unberührt.
const kharos = (() => {
  const D = typeof kharosDaten !== "undefined" ? kharosDaten : typeof require === "function" ? require("./kharos-daten.js") : null;
  const WELT = "Kharos";
  // Fraktionen: [alter Name (Regex-Quelle), neuer Name]. Genitiv-s wird mitgenommen („des Kronreichs“ → „des Kaiserreichs von Valen“).
  const fraktionen = [
    ["Kronreicher(in|innen)?", "Valener$1"],
    ["Kronreich(s?)", "Kaiserreich$1 von Valen"],
    ["Orden(s?) der Flamme", "Flammenorden$1 von Solis"],
    ["Freien Häfen", "Freien Kapitäne von Korvath"],
    ["Freie Häfen", "Freie Kapitäne von Korvath"],
    ["Dornenklingen", "Hochelfen von Aethel"],
    ["Hüter(n?) des Weltenbaums", "Waldelfen von Sylvar"],
    ["Schattenblüte", "Nachtelfen von Vael’Dorn"],
    ["Tiefe(?:s|n) Königreich(?:s|es)?", "Bergzwerge von Khaz-Thar"],
    ["Tiefgräber(?:n)?", "Tiefenzwerge von Mur’Grim"],
    ["Grüne(?:n)? Banner(?:n)?", "Ehrenklans von Grom’Kar"],
    ["Staubreiter(?:n)?(?![-\\w])", "Bluthorde von Kargath"],
    ["Aschenclan(?:s)?", "Knochenschamanen von Zul’Vash"],
    ["Hof(?:es)? der Bleichen Krone", "Grabkönige von Mor’Vael"],
    ["Fäulnisbrut", "Seuchenflut von Nethergrund"],
    ["Erinnernde(n?)", "Flüsternde$1 von Noctis"],
  ];
  // Die Runenschmiede heißt auch ein Gebäude; deshalb nur der Fraktionsname aus klassen.js („Zwerge · Runenschmiede“ u. ä.).
  const fraktionsIds = {
    kronreich: "Kaiserreich von Valen", orden: "Flammenorden von Solis", haefen: "Freie Kapitäne von Korvath",
    dornenklingen: "Hochelfen von Aethel", hueter: "Waldelfen von Sylvar", schattenbluete: "Nachtelfen von Vael’Dorn",
    "tiefes-koenigreich": "Bergzwerge von Khaz-Thar", tiefgraeber: "Tiefenzwerge von Mur’Grim", runenschmiede: "Klippenzwerge von Skald",
    "gruene-banner": "Ehrenklans von Grom’Kar", staubreiter: "Bluthorde von Kargath", aschenclan: "Knochenschamanen von Zul’Vash",
    hof: "Grabkönige von Mor’Vael", faeulnisbrut: "Seuchenflut von Nethergrund", erinnernde: "Flüsternde von Noctis",
  };
  // Glutberg ist im alten Text ein Berg („auf dem Glutberg“), Sonnenwacht eine Stadt: Präpositionen vorher anpassen.
  const glutberg = [["auf dem Glutberg", "in Sonnenwacht"], ["am Glutberg", "in Sonnenwacht"], ["vom Glutberg", "aus Sonnenwacht"],
    ["zum Glutberg", "nach Sonnenwacht"], ["den Glutberg", "Sonnenwacht"], ["dem Glutberg", "Sonnenwacht"], ["des Glutberg(?:e?s)", "von Sonnenwacht"],
    ["der Glutberg", "Sonnenwacht"], ["Der Glutberg", "Sonnenwacht"]];
  // Städte (Henrys Mapping; die Zweitstadt der Erinnernden war offen, Claudes Vorschlag Karmesin gilt).
  const staedte = [
    ["Kronhall", "Valengrad"], ["Hagenfels", "Eisentor"], ["Glutberg", "Sonnenwacht"], ["Perlvik", "Korvath-Bucht"], ["Nebelvik", "Nebelklippe"],
    ["Hochdorn", "Aethel-Spitze"], ["Nordkap", "Sternenwarte"], ["Ylvenor", "Wurzelkron"], ["Wurzelhalle", "Moosgrund"],
    ["Velasyr", "Vael’Dorn"], ["Mondkelch", "Knochenspitze"], ["Ambossheim", "Khaz-Thar"], ["Eisenwacht", "Eisenamboss"],
    ["Kluftheim", "Mur’Grim"], ["Rußtal", "Magmaschacht"], ["Essenfels", "Skald-Feste"], ["Donnerfels", "Donnerkap"],
    ["Kragmar", "Grom’Kar"], ["Grenzwall", "Steppenwacht"], ["Zhar-Kesh", "Kargath-Grube"], ["Skarrak", "Blutpass"],
    ["Aschenthron", "Zul’Vash"], ["Rauchkluft", "Aschemoor"], ["Palast der Tausend Stimmen", "Mor’Vael"], ["Kaltthron", "Knochenzitadelle"],
    ["Tempel der Fleischaltäre", "Nethergrund"], ["Madenmoor", "Faulmoor"], ["Eryndor", "Noctis-Krypta"], ["Karmesin", "Blutspiegel"],
  ];
  const staedteIds = {
    kronhall: "Valengrad", hagenfels: "Eisentor", glutberg: "Sonnenwacht", perlvik: "Korvath-Bucht", nebelvik: "Nebelklippe",
    hochdorn: "Aethel-Spitze", nordkap: "Sternenwarte", ylvenor: "Wurzelkron", wurzelhalle: "Moosgrund", velasyr: "Vael’Dorn",
    mondkelch: "Knochenspitze", ambossheim: "Khaz-Thar", eisenwacht: "Eisenamboss", kluftheim: "Mur’Grim", russtal: "Magmaschacht",
    essenfels: "Skald-Feste", donnerfels: "Donnerkap", kragmar: "Grom’Kar", grenzwall: "Steppenwacht", "zhar-kesh": "Kargath-Grube",
    skarrak: "Blutpass", aschenthron: "Zul’Vash", rauchkluft: "Aschemoor", "palast-der-tausend-stimmen": "Mor’Vael", kaltthron: "Knochenzitadelle",
    "tempel-der-fleischaltaere": "Nethergrund", madenmoor: "Faulmoor", eryndor: "Noctis-Krypta", karmesin: "Blutspiegel",
  };
  // Figuren. Thorvald hängt vom Stand ab: vor der Entlarvung nur der Tarnname (Henry: darf vor Akt 4 nicht enttarnt werden).
  const figuren = (entlarvt) => [
    ["(?:Kron)?[Pp]rinzessin Astrid", "Kaiserin Aurelia"], ["Astrids", "Aurelias"], ["Astrid", "Aurelia"],
    ["Hochmeisterin Ragna Glutherz", "Großinquisitor Vane"], ["Ragna Glutherz", "Großinquisitor Vane"], ["Hochmeisterin Ragna", "Großinquisitor Vane"], ["Ragna", "Vane"],
    ["Der Zollmeister von Zollholm", "Flottenfürst Draven"], ["der Zollmeister von Zollholm", "Flottenfürst Draven"],
    ["Der Zollmeister", "Flottenfürst Draven"], ["der Zollmeister", "Flottenfürst Draven"], ["dem Zollmeister", "Flottenfürst Draven"], ["des Zollmeisters", "von Flottenfürst Draven"],
    ...(entlarvt
      ? [["Erzpriester Thorvald, der Bleiche Skalde", "Archivar Malakor, Diener Vael-Thars"], ["Erzpriester Thorvald", "Archivar Malakor"], ["Thorvalds", "Malakors"], ["Thorvald(?!s?klipp)", "Malakor"]]
      : [["Erzpriester Thorvald, der Bleiche Skalde", "der Verhüllte Sternenleser"], ["Erzpriester Thorvald", "der Verhüllte Sternenleser"],
        ["Thorvalds", "des Verhüllten Sternenlesers"], ["Thorvald(?!s?klipp)", "der Verhüllte Sternenleser"]]),
    ["[Dd]er Bleiche Skalde", "der Diener Vael-Thars"], ["[Dd]es Bleichen Skalden", "des Dieners Vael-Thars"], ["[Dd]em Bleichen Skalden", "dem Diener Vael-Thars"],
    ["[Dd]en Bleichen Skalden", "den Diener Vael-Thars"], ["Bleicher Skalde", "Diener Vael-Thars"], ["Bleichen Skalden", "Dieners Vael-Thars"], ["Bleiche Skalde", "Diener Vael-Thars"],
    ["Die Stille Feder", "Der Schweigsame Chronist"], ["die Stille Feder", "der Schweigsame Chronist"], ["der Stillen Feder", "des Schweigsamen Chronisten"],
    ["Stillen Feder", "Schweigsamen Chronisten"], ["Stille Feder", "Schweigsame Chronist"],
    ["Odris", WELT],
    // v3.0.2–v3.0.4: Altlasten aus Odris in angezeigten Texten.
    ["des todkranken König Harald IV\\.", "des todkranken Kaisers Aurelian IV."], ["König Harald IV\\.", "Kaiser Aurelian IV."], ["Harald IV\\.", "Aurelian IV."],
    ["Jarl Ragnvalds?", "Marschall Kaelen"], ["Ragnvalds", "Kaelens"], ["Ragnvald", "Kaelen"],
    ["Aldric Vaelthar III\\.", "Grabkönig Sethek"], ["Aldric", "Sethek"],
    ["(R|r)unengeätzte([rn]?) Ascheriss-Fangzahn", "$1unengeätzte$2 Leerenriss-Fangzahn"],
    // Namensgleichheit mit bestehenden Minibossen: Malakor, Vane und Draven gehören jetzt den Kharos-Hauptfiguren.
    ["Erzketzer Malakor", "Erzketzer Morkhal"], ["Inquisitor Vane der Verbrannte", "Inquisitor Varn der Verbrannte"],
    ["Kapitän „Kielholer“ Draven", "Kapitän „Kielholer“ Dravik"],
  ];
  const regel = (paare) => paare.map(([alt, neu]) => [new RegExp("(?<![\\wÄÖÜäöüß’-])" + alt + "(?![\\wÄÖÜäöüß])", "g"), neu]);
  // Kharos-Klassennamen (2 je Fraktion, auf die passende Grundklasse gelegt; das 6×6-System bleibt).
  const klassen = (D?.klassenNamen ?? []).map((k) => [k.alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), k.neu]);
  const regelnOffen = regel([...figuren(false), ...fraktionen, ...klassen, ...glutberg, ...staedte.map(([a, n]) => [a + "(s?)", n + "$1"])]);
  const regelnEntlarvt = regel([...figuren(true), ...fraktionen, ...klassen, ...glutberg, ...staedte.map(([a, n]) => [a + "(s?)", n + "$1"])]);
  const schnelltest = new RegExp([...fraktionen.map(([a]) => a.split("(")[0]), ...staedte.map(([a]) => a), "Astrid", "Ragna", "Zollmeister",
    "Thorvald", "Bleich", "Stille", "Odris", "Harald", "Ragnvald", "Aldric", "Ascheriss-Fangzahn", " Gold", "Henry", ...(D?.klassenNamen ?? []).map((k) => k.alt), "Erzketzer Malakor", "Inquisitor Vane", "Kielholer“ Draven"].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));

  // Grammatik nach dem Tausch: Die neuen Titel sind männlich und tragen den Artikel. Dativ nach Präpositionen,
  // Akkusativ nach typischen Verben, großer Artikel am Satzanfang.
  const TITEL = "(Verhüllte|Schweigsame)";
  const schwach = (titel, nomen) => titel + "n " + nomen + (nomen === "Chronist" ? "en" : "");
  const grammatik = [
    [new RegExp("\\b(mit|von|bei|zu|aus|nach|seit|gegenüber) (?:der|des) " + TITEL + "n? (Sternenleser|Chronist)(?:en|s)?\\b", "g"),
      (_, p, t, n) => p + " dem " + schwach(t, n)],
    [new RegExp("\\b(gegen|für|durch|um|stellst|stellt|besiegst|besiegt|entlarvst|entlarvt|suchst|sucht|triffst|trifft) der " + TITEL + " (Sternenleser|Chronist)\\b", "g"),
      (_, p, t, n) => p + " den " + schwach(t, n)],
    [new RegExp("(^|[.!?:]\\s+|[„\"»]\\s*)der " + TITEL, "g"), "$1Der $2"],
    [new RegExp("\\bder " + TITEL + " (Sternenleser|Chronist) (stellen|besiegen|entlarven|suchen|treffen)\\b", "g"), (_, t, n, v) => "den " + schwach(t, n) + " " + v],
    // v3.0.3: Belohnungen in Gold heißen Silber; Entwicklernotizen wie „(Henry, 18. 11. 2026):“ verschwinden aus der Anzeige.
    [/([+−-]?\d+) Gold\b/g, "$1 Silber"],
    [/\s*\((?:Henry|Patch|Errata)[^()]*\d{4}\)/g, ""],
    [/\bHenry,\s*/g, ""],
  ];
  // Text umbenennen. entlarvt: Hat der Held Thorvald/Malakor schon entlarvt (Akt 4)?
  function text(wert, entlarvt = false) {
    if (typeof wert !== "string" || !schnelltest.test(wert)) return wert;
    let aus = wert;
    for (const [muster, neu] of entlarvt ? regelnEntlarvt : regelnOffen) aus = aus.replace(muster, neu);
    for (const [muster, neu] of grammatik) aus = aus.replace(muster, neu);
    return aus;
  }
  // Der Kampf gegen ihn ist die Entlarvung (Akt 4), danach trägt der Stand die Marke.
  const entlarvtIn = (state) => Boolean(state?.marks?.includes?.("thorvald-entlarvt") || (state?.questStufe ?? 0) >= 4 ||
    /thorvald/.test(state?.combat?.id ?? ""));

  // ---- Browser: Umbenennung aller angezeigten Texte ----
  let stand = null;
  let beobachter = null;
  const ATTRIBUTE = ["title", "aria-label", "placeholder", "alt"];
  function knotenText(knoten) {
    const e = entlarvtIn(stand);
    if (knoten.nodeType === 3) {
      const neu = text(knoten.data, e);
      if (neu !== knoten.data) {
        knoten.data = neu;
        // Gedruckte Kartennamen: neue Namen bekommen eine Unterlage, damit der alte Name im Kartenbild nicht durchscheint.
        const t = knoten.parentNode;
        if (t?.closest?.(".rk-gedruckt")) { t.classList.add("rk-umbenannt"); t.removeAttribute("textLength"); }
      }
      return;
    }
    if (knoten.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(knoten.nodeName)) return;
    for (const a of ATTRIBUTE) {
      const v = knoten.getAttribute?.(a);
      if (v) { const neu = text(v, e); if (neu !== v) knoten.setAttribute(a, neu); }
    }
    if (knoten.nodeName === "INPUT" && knoten.type === "button") knoten.value = text(knoten.value, e);
    for (const kind of knoten.childNodes) knotenText(kind);
  }
  function starten(wurzel = document.body) {
    if (typeof document === "undefined" || beobachter) return;
    document.title = text(document.title);
    knotenText(wurzel);
    beobachter = new MutationObserver((liste) => {
      for (const m of liste) {
        if (m.type === "characterData") knotenText(m.target);
        else if (m.type === "attributes") knotenText(m.target);
        else for (const n of m.addedNodes) knotenText(n);
      }
    });
    beobachter.observe(wurzel, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTE });
  }
  // spiel.js meldet den Stand, damit Thorvald/Malakor richtig erscheint; bei der Entlarvung wird alles neu benannt.
  function standSetzen(s) {
    const vorher = entlarvtIn(stand);
    stand = s;
    if (typeof document !== "undefined" && beobachter && vorher !== entlarvtIn(s)) knotenText(document.body);
  }

  return { WELT, daten: D, text, entlarvtIn, starten, standSetzen, fraktionsIds, staedteIds, fraktionen, staedte };
})();
if (typeof module !== "undefined") module.exports = kharos;
