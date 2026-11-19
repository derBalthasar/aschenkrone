"use strict";

const world = (() => {
  const valmarch = lands.find((land) => land.id === "valmarch");
  const creatures = Object.fromEntries(
    valmarch.fauna.filter((row) => row[7]).map(
      ([name, , , , , , image, stats]) => [image.replace(".png", ""), { name, image, stats }]
    )
  );
  // Grundwerte des Klassensystems. Die Schlüssel bleiben wegen bestehender Spielstände gleich.
  const attributes = klassen.grundwerte;
  const skills = klassen.fertigkeiten;
  // Herkunft bestimmt Erwachensszene und Porträt. Volk und Fraktion stehen in spiel/klassen.js.
  const origins = {
    "valmarcher": { name: "Menschen", volk: "menschen", portrait: 1, path: "wake-road", lead: "Dem Licht am Feldweg folgen" },
    "waldelf": { name: "Elfen", volk: "elfen", portrait: 2, path: "wake-wood", lead: "Durch die Hecke zu den Eichen gehen" },
    "bergzwerg": { name: "Zwerge", volk: "zwerge", portrait: 3, path: "wake-stone", lead: "Den alten Grenzstein untersuchen" },
    "gruenhaut": { name: "Orks", volk: "orks", portrait: 4, path: "wake-cart", lead: "Den Rufen am Graben nachgehen" },
    "vampir": { name: "Untote · Die Erinnernden", volk: "untote", portrait: 5, path: "wake-shade", lead: "Im Schatten dem Herzschlag folgen" },
    "untot": { name: "Untote", volk: "untote", portrait: 6, path: "wake-grave", lead: "Zu den Steinen am Rand des Gräberfelds gehen" },
  };
  // Kampfwerte der Grundklassen. Glut ist die Gabe aller Gezeichneten und steht jeder Klasse offen,
  // auch Skalden, Pulvermeistern und Feldschern ohne Magie. skill nennt die Fertigkeit, die den Glutangriff trägt.
  const classes = {
    krieger: {
      name: "Krieger", weapon: "axt", attack: { name: "Gluthieb", power: 10, skill: "nahkampf" },
      restore: { name: "Standglut", guard: 8 },
      description: "Setzt auf Nahkampf und einen schweren Gluthieb. Standglut hält dich beim Gegenangriff auf den Beinen.",
    },
    waechter: {
      name: "Wächter", weapon: "speer", attack: { name: "Glutklinge", power: 8, skill: "nahkampf" },
      restore: { name: "Glutschild", guard: 9 },
      description: "Legt Glut auf seine Waffe oder bindet sie zu einem Schild gegen den nächsten Gegenangriff.",
    },
    spaeher: {
      name: "Späher", weapon: "bogen", attack: { name: "Glutpfeil", power: 8, skill: "fernkampf" },
      restore: { name: "Dornenwall", guard: 6, hinder: 2 },
      description: "Kämpft auf Distanz. Glutpfeile treffen aus der Ferne, ein Dornenwall schwächt den Gegenangriff.",
    },
    magier: {
      name: "Magier", weapon: "stab", attack: { name: "Flammenstoß", power: 11, skill: "magie" },
      restore: { name: "Wurzelgriff", guard: 4, hinder: 4 },
      description: "Bündelt Glut zu einer Flamme oder lässt Wurzeln wachsen, die den Gegner festhalten.",
    },
    heiler: {
      name: "Heiler/Priester", weapon: "stab", attack: { name: "Glutstrahl", power: 6, skill: "magie" },
      restore: { name: "Heilglut", heal: 10 },
      description: "Wehrt Gegner mit einem Glutstrahl ab oder heilt Wunden mit gebundener Glut.",
    },
    schurke: {
      name: "Schurke", weapon: "dolch", attack: { name: "Glutstich", power: 9, skill: "list" },
      restore: { name: "Aschenschleier", guard: 8 },
      description: "Trifft aus dem Hinterhalt. Der Aschenschleier deckt dich gegen den nächsten Gegenangriff.",
    },
    skalde: {
      name: "Skalde", weapon: "schwert", attack: { name: "Glutsaga", power: 8, skill: "fuehrung" },
      restore: { name: "Kriegslied", guard: 5, heal: 5 },
      description: "Keine Magie: Ein Lied voller Glut lähmt den Feind, das Kriegslied heilt leicht und schwächt den nächsten Angriff.",
    },
    pulvermeister: {
      name: "Pulvermeister", weapon: "dolch", attack: { name: "Glutladung", power: 10, skill: "fernkampf" },
      restore: { name: "Pulverrauch", guard: 6, hinder: 2 },
      description: "Keine Magie: Eine Ladung mit Glut zündet wie ein Flächenzauber, Pulverrauch deckt dich und trifft den Gegner.",
    },
    feldscher: {
      name: "Feldscher", weapon: "dolch", attack: { name: "Brennender Schnitt", power: 6, skill: "mut" },
      restore: { name: "Glutverband", heal: 10 },
      description: "Keine Magie: Kräuter, Verbände und ein glühendes Messer. Der Glutverband schließt Wunden.",
    },
  };
  const items = {
    galgenwurz: "Galgenwurz", keilerhauer: "Keilerhauer", borstenfell: "Borstenfell",
    kraehenfedern: "Krähenfedern", flusssiegel: "Siegel von Heidvang",
    wolfspelz: "Wolfspelz", wolfszahn: "Wolfszahn",
    glutfunke: "Glutfunke", glutpanzer: "Glutpanzer", greifenfeder: "Greifenfeder",
    greifenklaue: "Greifenklaue", trollblut: "Trollblut",
    speer: "Speer", schwert: "Schwert", bogen: "Bogen", dolch: "Dolch", stab: "Stab",
    axt: "Axt", lederwams: "Lederwams", faeuste: "Fäuste",
    wachschwert: "Wachschwert von Eiswacht", grauflussbogen: "Heidvanger Jagdbogen",
    runenstab: "Runenstab der alten Mine", grenzmantel: "Grenzläufermantel",
    aschenwaechter: "Aschenwächterwams", eisenkeil: "Minenspeer",
    rostklaue: "Rostklaue", harzverband: "Harzverband", glutampulle: "Glutampulle",
    forstbuch: "Heidvanger Forstbuch", frostfell: "Frostklippenmantel", runenbeil: "Runenbeil",
    baerenklaue: "Bärenklaue", runensplitter: "Runensplitter",
    holzschild: "Eichenrundschild", wachschild: "Schild der Grenzwache",
    glutamulett: "Glutamulett", spurenring: "Ring des Spurenlesers",
    lederhaube: "Lederhaube", eisenhelm: "Eisenhelm der Bergwacht", lederbeinlinge: "Lederbeinlinge",
    kettenbeinlinge: "Kettenbeinlinge", eisenring: "Eisenring der Wache",
  };
  // stat nennt den Grundwert der Waffe, skill die Fertigkeit, die ihren Schaden trägt.
  const gear = {
    speer: { slot: "weapon", stat: "strength", power: 5, pierce: 2 },
    schwert: { slot: "weapon", stat: "strength", power: 5 },
    bogen: { slot: "weapon", stat: "agility", power: 5, airborne: 2, twoHanded: true },
    dolch: { slot: "weapon", stat: "agility", skill: "nahkampf", power: 4, pierce: 1 },
    stab: { slot: "weapon", stat: "mind", power: 4, twoHanded: true },
    axt: { slot: "weapon", stat: "strength", power: 6 },
    faeuste: { stat: "strength", power: 2 },
    lederwams: { slot: "armor", armor: 1 },
    borstenfell: { slot: "armor", armor: 2 },
    wolfspelz: { slot: "armor", armor: 1, travel: 1 },
    glutpanzer: { slot: "armor", armor: 3 },
    wachschwert: { slot: "weapon", stat: "strength", power: 8, pierce: 1 },
    grauflussbogen: { slot: "weapon", stat: "agility", power: 8, airborne: 3, twoHanded: true },
    runenstab: { slot: "weapon", stat: "mind", power: 6, magic: 3, twoHanded: true },
    grenzmantel: { slot: "armor", armor: 2, travel: 2 },
    aschenwaechter: { slot: "armor", armor: 4 },
    eisenkeil: { slot: "weapon", stat: "strength", power: 7, pierce: 2 },
    rostklaue: { slot: "weapon", stat: "agility", skill: "nahkampf", power: 7, pierce: 2 },
    frostfell: { slot: "armor", armor: 4, travel: 1 },
    runenbeil: { slot: "weapon", stat: "strength", power: 9, pierce: 2, magic: 1 },
    // Linke Hand, Kopf, Hals, Beine und Ringe (17.11.2026, Vorschlagswerte)
    holzschild: { slot: "offhand", armor: 1 },
    wachschild: { slot: "offhand", armor: 2 },
    glutamulett: { slot: "neck", magic: 1 },
    spurenring: { slot: "ring", travel: 1 },
    eisenring: { slot: "ring", armor: 1 },
    lederhaube: { slot: "head", armor: 1 },
    eisenhelm: { slot: "head", armor: 2 },
    lederbeinlinge: { slot: "legs", armor: 1 },
    kettenbeinlinge: { slot: "legs", armor: 2 },
  };
  Object.assign(items, { lebensfunke: "Lebensfunke", brandbalsam: "Brandbalsam", gegengift: "Gegengift", klartrank: "Klartrank" });
  const ailments = {
    burn: { name: "Brand", damage: 2 }, poison: { name: "Gift", damage: 3 }, confused: { name: "Verwirrt", damage: 0 },
  };
  const enemyAilments = { glutkaefer: "burn", netzweberin: "poison", schlundtroll: "poison", irrglut: "confused" };
  const supplies = { lebensfunke: { revive: 35 }, brandbalsam: { cure: "burn" }, gegengift: { cure: "poison" }, klartrank: { cure: "confused" }, galgenwurz: { heal: 10 }, glutfunke: { ember: 2 }, harzverband: { heal: 16 }, glutampulle: { ember: 3 } };
  const rarity = {
    eisenkeil: "Ungewöhnlich", rostklaue: "Ungewöhnlich", glutpanzer: "Ungewöhnlich",
    grenzmantel: "Selten", grauflussbogen: "Selten", wachschwert: "Selten", runenstab: "Selten",
    aschenwaechter: "Episch", frostfell: "Selten", runenbeil: "Selten",
    wachschild: "Ungewöhnlich", glutamulett: "Ungewöhnlich", spurenring: "Ungewöhnlich",
    eisenhelm: "Ungewöhnlich", kettenbeinlinge: "Ungewöhnlich", eisenring: "Ungewöhnlich",
  };
  const lootTables = {
    "minenfach": [[50, ["harzverband"], 8], [32, ["eisenkeil"], 5], [18, ["runenstab"], 0]],
    "signaltruhe": [[55, ["harzverband", "glutampulle"], 10], [35, ["grauflussbogen"], 4], [10, ["aschenwaechter"], 0]],
    "haendlerwagen": [[55, ["harzverband"], 7], [30, ["glutampulle"], 5], [15, ["rostklaue"], 0]],
    "ackervorrat": [[70, ["galgenwurz", "harzverband"], 3], [30, ["glutampulle", "galgenwurz"], 6]],
    "foersterlohn": [[100, ["grauflussbogen"], 8]],
    "skarn-vorrat": [[100, ["harzverband", "glutampulle"], 12]],
  };
  const milestones = {
    arrival: ["ankunft", 35], watch: ["moorbericht", 45], "pass-report": ["grenzbericht", 50],
  };
  const deeds = {
    "keiler-vertrieben": 25, "woelfe-vertrieben": 25, "kraehen-vertrieben": 20,
    "bohlen-markiert": 25, "joren-spur": 20, "joren-gerettet": 65, "joren-verloren": 15,
    "zoll-verhandelt": 30, "zoll-umgangen": 20, "haendlerin-geholfen": 25,
    "forstbuch-geborgen": 20, "forstbuch-zurueckgegeben": 25,
    "klippen-umgangen": 35, "klippen-beruhigt": 40, "runen-geschuetzt": 65, "runen-verbrannt": 45,
  };
  // Zentrallager: ein gemeinsames Lager, erreichbar aus jeder Stadt.
  const storageSites = { weidenkamm: "Zentrallager · Kornwik", kraehenfurt: "Zentrallager · Heidvang",
    hochwacht: "Zentrallager · Eiswacht", "skarn-gate": "Zentrallager · Glutberg" };
  const shop = { lebensfunke: 20, brandbalsam: 6, gegengift: 6, klartrank: 8, harzverband: 8, glutampulle: 12, eisenkeil: 22, rostklaue: 24, grenzmantel: 40,
    holzschild: 14, wachschild: 34, glutamulett: 26, spurenring: 24, eisenring: 24,
    lederhaube: 10, eisenhelm: 28, lederbeinlinge: 10, kettenbeinlinge: 28 };
  // Errata 10: Rucksack in drei Ausbaustufen (+10 Plätze) bei Sattlern und Gildenhändlern der Städte mit Zentrallager.
  // Statt Silber gehen auch Materialien. Stufe 3 braucht Handel mit Zwergen oder den Freien Häfen.
  const bagUpgrades = [
    { name: "Verstärkte Reisetasche", plaetze: 30, silber: 30, material: { wolfspelz: 2 } },
    { name: "Gilden-Packtasche", plaetze: 40, silber: 75, material: { borstenfell: 2 } },
    { name: "Zwergischer Runen-Tornister", plaetze: 50, silber: 150, material: { trollblut: 1 }, handel: true },
  ];
  const salePrices = { keilerhauer: 5, wolfszahn: 4, kraehenfedern: 2, greifenfeder: 10, greifenklaue: 14, trollblut: 18 };

  const scenes = {
    wake: {
      place: "Kornwik · Feldweg", title: "Aus der Asche",
      objective: "Finde heraus, wo du bist.",
      illustration: "asche.png",
      text: "Du stützt dich auf den Ellbogen. Unter deiner Hand ist die Erde noch warm. Eine Wagenspur führt am Feld entlang. Weiter vorn hängt eine Laterne.",
      choices: Object.entries(origins).map(([origin, data]) =>
        ({ id: "lantern", origin, label: data.lead, to: data.path })),
    },
    "wake-road": {
      place: "Kornwik · Feldweg", title: "Kerben im Holz", objective: "Lies die Zeichen am Feldweg.",
      text: "Du kennst die Kerben am Wegpfahl. Die Fuhrleute aus Kornwik markieren damit sichere Gräben und Wege.",
      choices: [
        { id: "prepare", label: "Die Markierung für den trockenen Graben einprägen", mark: "ditch", to: "start" },
        { id: "move", label: "Direkt zum Kornwagen gehen", to: "start" },
      ],
    },
    "wake-wood": {
      place: "Kornwik · Eichenhecke", title: "Spuren unter den Eichen", objective: "Lies die Spuren am Waldrand.",
      text: "Unter den Eichen reicht ein einziger Blick auf den Boden. Du erkennst, wo die Wölfe den Bach queren und wo das Ufer frei bleibt.",
      choices: [
        { id: "prepare", label: "Den freien Bachpfad einprägen", mark: "waldspur", to: "start" },
        { id: "move", label: "Zum Laternenlicht zurückkehren", to: "start" },
      ],
    },
    "wake-stone": {
      place: "Kornwik · Grenzstein", title: "Wärme unter dem Stein", objective: "Untersuche den Grenzstein.",
      text: "Im Sockel des Grenzsteins liegt eine warme Naht. Du erkennst ein Muster der Runenschmiede von Essenfels und weißt, wie du den Glutfluss abfangen kannst.",
      choices: [
        { id: "prepare", label: "Dir den Rhythmus der Glut merken", mark: "steinrhythmus", to: "start" },
        { id: "move", label: "Weiter zum Feldweg gehen", to: "start" },
      ],
    },
    "wake-cart": {
      place: "Kornwik · Wagengraben", title: "Das Rad im Graben", objective: "Finde heraus, wer am Graben ruft.",
      text: "Zwei Fuhrleute stemmen sich gegen ein festgefahrenes Wagenrad. Als du näher kommst, lassen sie vor Schreck den Hebel fallen.",
      choices: [
        { id: "prepare", label: "Das Rad anheben und mit ihnen zum Lager gehen", mark: "fuhrleute-vertrauen", to: "start" },
        { id: "move", label: "Abstand halten und zum Lager gehen", to: "start" },
      ],
    },
    "wake-shade": {
      place: "Kornwik · Heckenrand", title: "Ein Herzschlag im Nebel", objective: "Finde den Ursprung des Geräuschs.",
      text: "Hinter der Hecke hörst du den Herzschlag eines Fuhrmanns. Er murmelt ein Kennwort der Erinnernden aus Eryndor, um sich bei der Furt zu erkennen zu geben.",
      choices: [
        { id: "prepare", label: "Das Kennwort der Fährleute einprägen", mark: "faehrwort", to: "start" },
        { id: "move", label: "Dem Feldweg zum Kornwagen folgen", to: "start" },
      ],
    },
    "wake-grave": {
      place: "Kornwik · Altes Gräberfeld", title: "Der Name auf dem Tuch",
      objective: "Untersuche das alte Gräberfeld.",
      text: "Du findest ein aufgerissenes Leichentuch unter den Steinen. Dein Name steht darauf. Neben dem Tuch wächst Galgenwurz. In der Ferne hörst du die Fuhrleute.",
      choices: [
        { id: "prepare", label: "Die Galgenwurz für den Weg mitnehmen", item: "galgenwurz", to: "start" },
        { id: "move", label: "Die Totenruhe achten und weitergehen", to: "start" },
      ],
    },
    start: {
      place: "Kornwik · Ackerland", title: "Die Warnung", objective: "Bereite den Aufbruch vor.",
      illustration: "lager.png",
      text: "Die Laterne hängt an einem Kornwagen. Eine Fuhrfrau aus Garbenfeld reicht dir Wasser und erzählt von der grauen Asche am Eispass. Die Fuhrleute wollen noch vor Dunkelheit nach Heidvang. Sie bitten dich, vorauszugehen und einen freien Weg zu finden.",
      choices: [
        { id: "talk", label: "Die Fuhrleute nach sicheren Wegen fragen", check: ["fuehrung", 11], advantage: "fuhrleute-vertrauen",
          pass: "Sie zeigen dir einen trockenen Graben am Acker. Darin kannst du ungesehen näher heran.", fail: "Niemand war seit dem letzten Regen draußen.", mark: "ditch", to: "field" },
        { id: "search", label: "Am alten Galgen nach Galgenwurz suchen", check: ["list", 10],
          pass: "Unter dem Balken findest du Galgenwurz und steckst sie ein.", fail: "Unter dem Balken liegen nur faulige Wurzeln.", item: "galgenwurz", to: "field" },
        { id: "go", label: "Zum Acker aufbrechen", to: "field" },
        { id: "soil", label: "Den verschütteten Saatstreifen ansehen", to: "ash-field" },
      ],
    },
    "ash-field": {
      place: "Kornwik · Saatstreifen", title: "Was unter der Asche wächst",
      objective: "Entscheide, wie viel Glut du der Erde anvertraust.",
      text: "Unter der grauen Schicht liegen noch Samen. Ausgewogene Glut kann sie zum Keimen bringen. Wer sie zu schnell entfacht, kann die ganze Saat verbrennen.",
      choices: [
        { id: "balance", label: "Wärme und Wachstum im Gleichgewicht halten · 1 Glut", emberCost: 1, soil: "balanced", to: "field" },
        { id: "force", label: "Die Asche mit einem starken Glutstoß wegbrennen · 1 Glut", emberCost: 1, soil: "force", to: "field" },
        // Patch 2.5.4: Ersatz ohne Glutgabe für Kronreich und Freie Häfen.
        { id: "soil-hands", label: "[Stärke 10] Die Ascheschicht mit bloßen Händen und Spaten abtragen", glutlos: true,
          check: ["strength", 10], failMark: "saat-muehe", excludes: ["saat-erholt", "saat-verbrannt", "saat-muehe"],
          mark: "saat-erholt", to: "field", failTo: "field",
          pass: "Schicht um Schicht trägst du die Asche ab. Darunter ist die Erde noch feucht, und die ersten Spitzen kommen durch.",
          fail: "Die Asche ist schwerer, als sie aussieht. Nach einer Stunde liegt der Streifen noch immer grau." },
        { id: "leave", label: "Die Saat unberührt lassen und weitergehen", to: "field" },
      ],
    },
    field: {
      place: "Kornwik · Ackerweg", title: "Im Revier des Keilers", creature: "keiler",
      objective: "Finde einen Weg zur Furt, auf dem die Kornfuhre folgen kann.",
      text: "Zwischen aufgeworfenen Rübenreihen steht ein Eisenborstenkeiler. Er scharrt im Boden, senkt den Kopf und hält den Weg zum Fluss bei Heidvang besetzt.",
      choices: [
        { id: "sneak", label: "Am Keiler vorbeischleichen", check: ["list", 11], advantage: "ditch",
          pass: "Du erreichst den Fluss bei Heidvang. Der Keiler bleibt auf dem Acker und der Kornwagen muss warten.", fail: "Der Keiler hört dich und scharrt zum Angriff.",
          mark: "keiler-umgangen", to: "ford", fight: "keiler" },
        { id: "fire", label: "Mit der Laterne aus dem Revier treiben", check: ["mut", 12],
          pass: "Der Keiler weicht in die Hecken zurück. Der Kornweg ist frei.", fail: "Er schnaubt durch den Rauch und hält stand.",
          mark: "keiler-vertrieben", to: "ford", fight: "keiler" },
        { id: "fight", label: "Den Keiler mit dem Speer stellen", fight: "keiler", to: "ford" },
        { id: "detour", label: "Einen Umweg durch den Eichenwald bei Heidvang nehmen", destination: "rotwaelder", mark: "waldweg", to: "forest" },
      ],
    },
    forest: {
      place: "Eichenwald bei Heidvang · Bachpfad", title: "Unter den Eichen", creature: "grauwolf",
      objective: "Prüfe, ob der Wagenweg durch den Eichenwald bei Heidvang frei ist.",
      text: "Unter den Eichen wird es früh dunkel. Im Schlamm siehst du frische Wolfsspuren. Der Weg über den Waldrand ist auch für den Kornwagen breit genug, wenn du das Rudel von dort fernhältst.",
      choices: [
        { id: "trace", label: "Den Spuren ausweichen und am Bach bleiben", check: ["list", 11], advantage: "waldspur",
          pass: "Du lässt die Spuren hinter dir. Der Bachpfad ist für einen Wagen zu schmal.",
          fail: "Beim Queren des Bachs bemerkt dich das Rudel.", to: "ford", fight: "grauwolf" },
        { id: "lead", label: "Den Leitwolf mit Feuer vom Wagenweg vertreiben", check: ["mut", 11],
          pass: "Du erkennst den Leitwolf an der gekerbten Ohrspitze. Er weicht vor der Flamme zurück und das Rudel folgt ihm.",
          fail: "Der Leitwolf umkreist die Flamme und die anderen Wölfe schließen auf.",
          mark: "woelfe-vertrieben", to: "ford", fight: "grauwolf" },
        { id: "fight", label: "Den Leitwolf stellen", fight: "grauwolf", to: "ford" },
      ],
    },
    ford: {
      place: "Heidvang · Furt", title: "Am Galgen", objective: "Überbringe der Fährfrau die Nachricht.",
      text: "Am Ufer steht der alte Galgen. Krähen hacken an einem verlassenen Wagen. Eine Fährfrau wartet auf der anderen Seite. Sie will die Furt erst wieder öffnen, wenn sie weiß, ob das Korn sicher passieren kann.",
      creature: "galgenkraehe",
      choices: [
        { id: "signal", label: "Die Fährfrau vom Ufer aus warnen", mark: "warnung", to: "arrival" },
        { id: "scare", label: "Die Krähen mit Laterne und Lärm vertreiben", check: ["mut", 11],
          pass: "Die Krähen steigen auf. Die Fährfrau sieht den freien Weg und winkt dich heran.", fail: "Der Schwarm stürzt sich auf dich.",
          mark: "kraehen-vertrieben", to: "arrival", fight: "galgenkraehe" },
        { id: "cross", label: "Durch das flache Wasser zur Fährfrau waten", check: ["list", 10],
          pass: "Du erreichst das andere Ufer, während der Schwarm am Wagen bleibt.", fail: "Ein Stein rutscht weg. Die Krähen kommen näher.",
          mark: "furt-durchquert", to: "arrival", fight: "galgenkraehe" },
        { id: "password", label: "Der Fährfrau das Kennwort zurufen und gemeinsam die Krähen vertreiben",
          requires: "faehrwort", mark: "kraehen-vertrieben", to: "arrival",
          message: "Die Fährfrau erkennt das Kennwort. Sie läutet die Fährglocke, während du die Laterne hebst. Die Krähen verlassen den Wagen." },
      ],
    },
    arrival: {
      place: "Heidvang", title: "Die Nachricht kommt an", objective: "Nachricht überbracht.",
      text: "Du berichtest der Fährfrau vom Ackerweg und den Krähen. Als Zeichen für die Fuhrleute gibt sie dir das Siegel von Heidvang.",
      choices: [
        { id: "seed", label: "Mit den Fuhrleuten Saatgut für den geretteten Acker zurücklegen",
          requires: "saat-erholt", condition: "delivery", item: "galgenwurz", recover: 6, mark: "saatgut-zurueckgelegt", to: "moor",
          message: "Die Fuhrleute legen Saatgut zurück, versorgen deine Wunden (bis zu 6 LP) und geben dir Galgenwurz." },
        { id: "guide", label: "Eine ortskundige Begleitung ins Moor bei Eiswacht mitnehmen",
          condition: "delivery", excludes: "saat-verbrannt", mark: "moorbegleitung", recover: 10, to: "moor",
          message: "Die Fuhrleute stellen dir eine Ortskundige zur Seite. Vor dem Aufbruch versorgt sie deine Wunden (bis zu 10 LP)." },
        { id: "rest", label: "In Heidvang rasten und im Morgengrauen allein aufbrechen",
          condition: "delivery", recover: 99, replenish: 99, to: "moor",
          message: "Die Rast füllt deine Lebenspunkte und Glut wieder auf. Dein Gleichgewicht kehrt zur Mitte zurück." },
        { id: "messengers", label: "Boten zur wartenden Kornfuhre schicken",
          condition: "no-delivery", mark: "boten-unterwegs", recover: 8, to: "moor",
          message: "Du schickst zwei Boten zu den Fuhrleuten. Während sie aufbrechen, versorgt die Fährfrau deine Wunden (bis zu 8 LP)." },
        { id: "urgent", label: "Sofort ins Moor bei Eiswacht aufbrechen",
          condition: "no-delivery", replenish: 1, to: "moor",
          message: "Du nimmst auf dem Weg Glut aus der Kohle am Fährhaus auf (bis zu 1 Glut)." },
      ],
    },
    moor: {
      place: "Moor bei Eiswacht · Alter Bohlenweg", title: "Lichter über dem Wasser", creature: "irrglut",
      objective: "Finde heraus, warum die Lichter den Bohlenweg blockieren.",
      text: "Zwischen den Bohlen steigt ein orangefarbenes Licht auf. Es zieht in Bögen über das schwarze Wasser. Die Fährfrau hatte erzählt, dass seit drei Nächten niemand mehr über den alten Weg kommt.",
      choices: [
        { id: "bank", label: "Mit deiner Begleitung das feste Ufer und die morschen Bohlen markieren",
          requires: "moorbegleitung", mark: "bohlen-markiert", to: "moor-report",
          message: "Deine Begleitung zeigt dir einen festen Uferstreifen. Ihr markiert den Weg und die Stellen, an denen die Irrglut auftaucht." },
        { id: "water", label: "Die Irrglut mit Moorwasser von den Bohlen treiben", check: ["mut", 11],
          pass: "Die Funken zischen im Wasser. Du markierst die morschen Bohlen, während das Licht über dem offenen Moor verblasst.",
          fail: "Das Licht weicht dem Wasser aus und schießt auf dich zu.",
          mark: "bohlen-markiert", to: "moor-report", fight: "irrglut" },
        { id: "fight", label: "Die Irrglut auf den Bohlen stellen", fight: "irrglut", to: "moor-report" },
        { id: "return", label: "Abbrechen und die Fährfrau vor dem Licht warnen", to: "moor-report",
          message: "Du lässt das Licht über dem Wasser zurück. Wo der Bohlenweg noch trägt, bleibt unklar." },
      ],
    },
    "moor-report": {
      place: "Heidvang · Fährhaus", title: "Was das Moor zurückgibt",
      objective: "Entscheide, wie Heidvang mit dem Bohlenweg umgehen soll.",
      text: "Die Fährfrau hat das Ufer abgesperrt. Sie wartet darauf, was du über die Lichter und den alten Weg berichten kannst.",
      choices: [
        { id: "hand-over", label: "Den Glutfunken der Fährfrau als Beleg geben", requiresItem: "glutfunke",
          consume: "glutfunke", mark: "beleg-uebergeben", to: "moor-end" },
        { id: "keep", label: "Den Glutfunken behalten und den Weg vorerst sperren lassen", requiresItem: "glutfunke",
          mark: "beleg-behalten", to: "moor-end" },
        { id: "daylight", label: "Den markierten Weg bei Tageslicht freigeben lassen", requires: "bohlen-markiert",
          mark: "moorpassage-offen", to: "moor-end" },
        { id: "close", label: "Die Fährfrau bitten, den Bohlenweg gesperrt zu lassen",
          mark: "moorpassage-gesperrt", to: "moor-end" },
      ],
    },
    "moor-end": {
      place: "Heidvang · Fährhaus", title: "Der nächste Morgen",
      objective: "Den Bericht über das Moor bei Eiswacht abgeschlossen.",
      text: "Am nächsten Morgen macht sich ein Bote nach Eiswacht auf. Er nimmt deinen Bericht über die Lichter im Moor bei Eiswacht mit.",
      choices: [
        { id: "bridge", label: "Bei Tageslicht über den markierten Bohlenweg nach Eiswacht reisen",
          requires: "moorpassage-offen", mark: "hochweg-kurz", to: "watch" },
        { id: "ridge", label: "Über den trockenen Höhenweg nach Eiswacht reisen", destination: "hochwacht", to: "watch" },
      ],
    },
    watch: {
      place: "Eiswacht · Torhaus", title: "Unter dem Eispass",
      objective: "Verschaffe dir Zugang zu den Berichten vom Eispass.",
      text: "Die Wache sammelt Meldungen über die Asche am Eispass. Der Bericht aus Heidvang liegt auf dem Tisch. Eine Schreiberin fragt, was sie als gesichert weitergeben kann.",
      choices: [
        { id: "archive", label: "Den bereits übergebenen Glutfunken untersuchen lassen",
          requires: "beleg-uebergeben", mark: "hochwacht-archiv", to: "watch-end",
          message: "Die Wache hat den Glutfunken bereits untersucht. Du bekommst sofort Zugang zu den Berichten vom Eispass." },
        { id: "show", label: "Den eigenen Glutfunken vorzeigen und als Beleg abgeben",
          requiresItem: "glutfunke", consume: "glutfunke", mark: "hochwacht-archiv", to: "watch-end",
          message: "Die Schreiberin nimmt den Glutfunken entgegen und öffnet das Archiv." },
        { id: "testimony", label: "Der Wache schildern, was du im Moor gesehen hast",
          check: ["fuehrung", 12], advantage: "hochweg-kurz", mark: "hochwacht-archiv", to: "watch-end",
          pass: "Die Schreiberin hält deinen Bericht für glaubwürdig und lässt dich ins Archiv.",
          fail: "Die Schreiberin nimmt den Bericht an. Bis ein zweiter Zeuge eintrifft, bleibt das Archiv geschlossen." },
        { id: "wait", label: "Den Bericht hinterlegen und auf weitere Zeugen warten", to: "watch-end" },
      ],
    },
    "watch-end": {
      place: "Eiswacht · Torhaus", title: "Die Meldungen vom Eispass",
      objective: "Erkunde die Wege zum Eispass.",
      text: "Die Schreiberin siegelt das Protokoll. Draußen wird das Tor vor Einbruch der Nacht geschlossen.",
      map: "hochwacht",
      choices: [
        { id: "watch-yard", label: "Zum Wachhof gehen und die Reisekarte öffnen", destination: "hochwacht", to: "watch-yard" },
      ],
    },
    "watch-yard": {
      place: "Eiswacht · Wachhof", title: "Wege zum Eispass",
      objective: "Finde heraus, wo der vermisste Grenzläufer steckt.",
      illustration: "wachhof.png",
      text: "Unter der Torlaube hängt ein leerer Haken. Daran sollte Jorens Signallaterne hängen. Seine Schwester Lene steht seit Sonnenaufgang am Tor und hat ihm einen trockenen Schal mitgebracht. Wachtmeisterin Runa lässt einen Seilwagen bereitmachen, hält ihn aber im Hof zurück. Seit die Asche am Pass fällt, schickt sie niemanden ohne ein Zeichen hinauf.",
      map: "hochwacht",
      choices: [
        { id: "sister", label: "Lene fragen, woran man Jorens Spur erkennt", excludes: ["joren-zeichen", "joren-gerettet", "joren-verloren"],
          mark: "joren-zeichen", to: "watch-yard",
          message: "„Er wickelt rotes Garn um seine Ausrüstung“, sagt Lene. „Damit wir unsere Sachen nicht wieder vertauschen.“" },
        { id: "warden", label: "Runa fragen, was der Seilwagen für eine Rettung braucht", excludes: ["runa-plan", "joren-gerettet", "joren-verloren"],
          mark: "runa-plan", to: "watch-yard",
          message: "„Zwei kurze Lichtzeichen“, sagt Runa. „Dann schicke ich den Seilwagen. Aber erst muss ich wissen, wo wir suchen.“" },
        { id: "camp", label: "Am Wachfeuer rasten · LP und Glut auffüllen", recover: 99, replenish: 99, center: true,
          to: "watch-yard", message: "Am Wachfeuer versorgst du deine Wunden und sammelst deine Glut.",
          // Patch 2.5.4: Ohne Glutgabe (Kronreich, Freie Häfen) nennt die Wahl keine Glut.
          ohneGlut: { label: "Am Wachfeuer rasten · LP auffüllen", message: "Am Wachfeuer versorgst du deine Wunden." } },
        { id: "skarn-briefing", label: "Mit Runa über die ausgebliebenen Zeichen aus Glutberg sprechen",
          requires: "pass-gemeldet", excludes: "skarn-auftrag", to: "skarn-briefing" },
        { id: "skarn-road", label: "Über den bewachten Eispass zum Grenzlager reisen", requires: ["skarn-auftrag", "pass-bewacht"],
          destination: "skarn-gate", to: "skarn-gate" },
        { id: "skarn-detour", label: "Am gesperrten Pass vorbei über die alte Ziegenstiege reisen",
          requires: ["skarn-auftrag", "pass-gesperrt"], destination: "skarn-gate", to: "skarn-gate" },
        { id: "return-ford", label: "Nach Heidvang zurückreisen", destination: "kraehenfurt", to: "return-ford" },
        { id: "supply-post", label: "Mit der Quartiermeisterin handeln", to: "supply-post" },
        { id: "rescue-reward", label: "Lene und Runa wegen Jorens Rettung aufsuchen", requires: ["joren-gerettet", "pass-gemeldet"],
          excludes: "jorens-dank", to: "pass-report" },
        { id: "toll", label: "Nach dem Streit an der alten Zollstelle sehen", condition: "toll-unresolved", destination: "toll", to: "toll" },
        { id: "toll-revisit", label: "Zur alten Zollstelle zurückkehren", condition: "toll-resolved", destination: "toll", to: "toll-resolved" },
        { id: "return-moor", label: "Über die markierten Bohlen ins Moor bei Eiswacht reisen", destination: "schwarzmoor",
          requires: "moorpassage-offen", to: "return-moor" },
        { id: "guard-supply", label: "Die Vorräte der Passwache abholen", requires: "pass-bewacht",
          excludes: "wachvorrat", mark: "wachvorrat", item: "galgenwurz", to: "watch-yard",
          message: "Die Wache dankt dir für den offenen Übergang und gibt dir Galgenwurz." },
        { id: "watch-trust", label: "Bei Runa einen Verband aus den Wachvorräten erbitten · Ruf +25",
          faction: ["watch", 25], excludes: "runa-vertrauensgabe", mark: "runa-vertrauensgabe",
          item: "harzverband", to: "watch-yard", message: "Runa lässt dir einen Verband aus der Zeugkammer bringen." },
        { id: "mine", label: "Zur alten Glutmine reisen", destination: "mine", excludes: "pass-mine", to: "mine" },
        { id: "mine-revisit", label: "Zum freigelegten Stollen reisen", destination: "mine", requires: "pass-mine", to: "mine-cleared" },
        { id: "ridge-trail", label: "Zur Felsrippe aufbrechen", destination: "ridge", excludes: "pass-ridge", to: "ridge-trail" },
        { id: "ridge-revisit", label: "Zum Signalplatz auf der Felsrippe reisen", destination: "ridge", requires: "pass-ridge", to: "ridge-cleared" },
        { id: "ravine", label: "In den Trollschlund hinabsteigen", destination: "ravine", excludes: "pass-ravine", to: "ravine" },
        { id: "ravine-revisit", label: "Zum Treidelpfad im Trollschlund reisen", destination: "ravine", requires: "pass-ravine", to: "ravine-cleared" },
        { id: "pass", label: "Den erschlossenen Weg zum Eispass nehmen", destination: "pass", condition: "pass-open", to: "pass" },
      ],
    },
    "supply-post": {
      place: "Eiswacht · Zeugkammer", map: "hochwacht", title: "Maren zählt die Vorräte",
      objective: "Kaufe Vorräte oder verkaufe Trophäen.",
      text: "Maren streicht jede ausgegebene Binde auf ihrer Tafel an. Trophäen nimmt sie für die Gerber an. Ausrüstung gibt sie dir für Silber mit.",
      choices: [{ id: "supply-back", label: "Zum Wachhof gehen", to: "watch-yard" }],
    },
    toll: {
      place: "Eispass · Alte Zollstelle", map: "toll", title: "Ein Zoll ohne Siegel",
      objective: "Kläre den Streit um Adas Wagen.",
      text: "Die Händlerin Ada steht vor einer quer gelegten Stange. Ein Deserteur verlangt die Hälfte ihrer Ladung und behauptet, für den Zoll von Passhütte zu kassieren. Sein Gegenüber betrachtet die Stange, als suche er einen Vorwand, sie selbst aus dem Weg zu räumen.",
      creature: "deserteure",
      choices: [
        { id: "toll-talk", label: "Mit dem Fährsiegel aushandeln, dass Ada passieren darf", requiresItem: "flusssiegel",
          condition: "toll-unresolved", check: ["fuehrung", 13], mark: "zoll-verhandelt", fight: "deserteure", to: "toll-resolved",
          pass: "Die Männer sehen das Siegel und geben den Weg frei. Sie wollen keinen Bericht an die Wache in Eiswacht riskieren.",
          fail: "Der Wortführer schlägt das Siegel zur Seite und zieht sein Schwert." },
        { id: "toll-help", label: "Ada über den Seitenweg an der Sperre vorbeiführen",
          condition: "toll-unresolved", check: ["list", 11], advantage: "waldspur",
          pass: "Du gehst voraus und winkst Ada zwischen zwei Grenzpfählen hindurch. Als die Männer den leeren Weg bemerken, ist der Wagen schon hinter der Böschung.",
          fail: "Ein Rad schlägt gegen einen Grenzpfahl. Die Deserteure hören es und kommen auf euch zu.",
          mark: "zoll-umgangen", fight: "deserteure", to: "toll-resolved" },
        { id: "toll-fight", label: "Die Deserteure stellen · Kampf", condition: "toll-unresolved", fight: "deserteure", to: "toll-resolved" },
        { id: "toll-back", label: "Nach Eiswacht zurückkehren", destination: "hochwacht", to: "watch-yard" },
      ],
    },
    "toll-resolved": {
      place: "Eispass · Alte Zollstelle", map: "toll", title: "Adas Wagen",
      objective: "Hilf Ada beim Anspannen oder reise weiter.",
      text: "Ada zieht die Riemen ihres Pferdes nach. Ein Kasten ist vom Wagen gefallen. Sie bittet dich, ihn unter die Plane zu heben, und will dich aus ihrem Reisevorrat bezahlen.",
      choices: [
        { id: "toll-reward", label: "Den Kasten sichern und Adas Dank annehmen", excludes: "haendlerin-geholfen",
          mark: "haendlerin-geholfen", loot: "haendlerwagen", to: "toll-resolved" },
        { id: "toll-back", label: "Nach Eiswacht zurückkehren", destination: "hochwacht", to: "watch-yard" },
      ],
    },
    "return-ford": {
      place: "Heidvang · Fährhaus", title: "Zurück an der Furt", map: "kraehenfurt",
      objective: "Entscheide, welchen Weg du als Nächstes nimmst.",
      text: "Die Fährfrau erkennt dich. Am alten Galgen hängt noch die Laterne vom Tag deiner Ankunft.",
      choices: [
        { id: "return-yard", label: "Über den Höhenweg nach Eiswacht reisen", destination: "hochwacht", to: "watch-yard" },
        { id: "return-moor", label: "Den Uferweg zum Moor bei Eiswacht nehmen", destination: "schwarzmoor", to: "return-moor" },
        { id: "return-forest", label: "Den Eichenwald bei Heidvang aufsuchen", destination: "rotwaelder", to: "return-forest" },
        { id: "return-field", label: "Den Ackerweg bei Kornwik aufsuchen", destination: "weidenkamm", to: "return-field" },
      ],
    },
    "return-moor": {
      place: "Moor bei Eiswacht · Alter Bohlenweg", title: "Wieder am Moor", map: "schwarzmoor",
      objective: "Wähle deinen Rückweg.",
      text: "Über dem Wasser liegt Nebel. An den Bohlen siehst du, wie die Fährfrau deinen Bericht umgesetzt hat.",
      choices: [
        { id: "return-ford", label: "Am Ufer nach Heidvang zurückgehen", destination: "kraehenfurt", to: "return-ford" },
        { id: "return-yard", label: "Über die markierten Bohlen nach Eiswacht reisen", destination: "hochwacht",
          requires: "moorpassage-offen", to: "watch-yard" },
      ],
    },
    "return-forest": {
      place: "Eichenwald bei Heidvang · Bachpfad", title: "Am alten Bachpfad", map: "rotwaelder",
      objective: "Wähle zwischen Heidvang und Kornwik.",
      text: "Der Bach läuft zwischen den Eichen. Neben dem Wagenweg hat Försterin Enna ihre nassen Karten auf einen Zaun gehängt. Eine davon zeigt einen alten Messpfahl auf der anderen Seite des Bachs.",
      choices: [
        { id: "forest-book", label: "Enna fragen, was sie am Bach sucht", excludes: "forstbuch-zurueckgegeben",
          to: "forest-cache" },
        { id: "return-ford", label: "Nach Heidvang zurückkehren", destination: "kraehenfurt", to: "return-ford" },
        { id: "return-field", label: "Nach Kornwik gehen", destination: "weidenkamm", to: "return-field" },
      ],
    },
    "forest-cache": {
      place: "Eichenwald bei Heidvang · Messpfahl", map: "rotwaelder", title: "Was das Wasser mitnahm",
      objective: "Hilf Enna, ihr Forstbuch zu bergen.",
      text: "„Da stehen die Grenzen der Holzrechte drin“, sagt Enna. „Seit der Bach die Kiste weggespült hat, behauptet der Gutshof, die Weide gehöre ihm.“ Am anderen Ufer klemmt die Kiste zwischen zwei Wurzeln. Oberhalb führt ein trockener Steg dorthin.",
      choices: [
        { id: "forest-path", label: "Den trockenen Steg nehmen und das Buch holen",
          excludes: "forstbuch-geborgen", mark: "forstbuch-geborgen", item: "forstbuch", to: "forest-cache",
          message: "Das Leder ist aufgequollen. Die Einträge im Buch sind noch lesbar." },
        { id: "forest-return-book", label: "Enna das Forstbuch zurückgeben", requiresItem: "forstbuch",
          excludes: "forstbuch-zurueckgegeben", consume: "forstbuch", mark: "forstbuch-zurueckgegeben",
          loot: "foersterlohn", to: "return-forest",
          message: "Enna prüft den Eintrag zur Weide und reicht dir ihren Heidvanger Jagdbogen. „Den Eintrag bringe ich morgen nach Heidvang.“" },
        { id: "forest-back", label: "Zum Bachpfad zurückgehen", to: "return-forest" },
      ],
    },
    "return-field": {
      place: "Kornwik · Ackerweg", title: "Wieder im Ackerland", map: "weidenkamm",
      objective: "Sieh nach der Saat oder reise weiter.",
      illustration: "lager.png",
      text: "Am Feldrand stehen noch die Pfähle der Fuhrleute. Von hier führt der Weg zur Furt oder unter den Eichen hindurch.",
      choices: [
        { id: "seed-cache", label: "Den Vorrat der Fuhrleute am neu bestellten Acker abholen", requires: "saatgut-zurueckgelegt",
          excludes: "ackervorrat-geholt", mark: "ackervorrat-geholt", loot: "ackervorrat", to: "return-field",
          message: "Am Feldpfahl hängt ein Beutel mit deinem Namen. Unter dem Beutel siehst du die neuen Saatreihen." },
        { id: "return-ford", label: "Zur Furt reisen", destination: "kraehenfurt", to: "return-ford" },
        { id: "return-forest", label: "In den Eichenwald bei Heidvang gehen", destination: "rotwaelder", to: "return-forest" },
      ],
    },
    mine: {
      place: "Eispass · Alte Glutmine", title: "Ein Licht unter dem Hang",
      objective: "Untersuche den alten Entwässerungsstollen.", map: "mine",
      text: "Im Stollen zieht kalte Luft nach Norden. Ein Schwarm Glutkäfer sitzt auf dem morschen Gitter. Zwischen den Steinen siehst du einen Hebel. Hier könnten die Fuhrleute unter dem Hang hindurch, sobald der Durchgang frei ist.",
      choices: [
        { id: "inspect-mine", label: "Jorens rotes Garn am Werkzeugkasten prüfen", requires: "joren-zeichen", excludes: "joren-spur",
          mark: "joren-spur", to: "mine",
          message: "Am Griff hängt rotes Garn. Im Staub darüber hat jemand einen Pfeil zum alten Grenzhaus geritzt." },
        { id: "mine-fight", label: "Die Glutkäfer stellen · Kampf", excludes: "kaefer-besiegt", fight: "glutkaefer", to: "mine-cleared" },
        { id: "mine-mechanism", label: "Den Mechanismus aus dem Wachbericht benutzen", requires: "hochwacht-archiv",
          excludes: "pass-mine", mark: "pass-mine", to: "mine-cleared" },
        { id: "mine-back", label: "Nach Eiswacht zurückkehren", to: "watch-yard", destination: "hochwacht" },
      ],
      creature: "glutkaefer",
    },
    "mine-cleared": {
      place: "Eispass · Entwässerungsstollen", title: "Das Gitter hebt sich",
      objective: "Nutze den Stollen oder melde den neuen Weg.", map: "mine",
      text: "Hinter dem Gitter stehen noch Brotdosen auf einer Bank. Der Stollen ist so trocken, dass selbst die Kerben im Holz geblieben sind. An der letzten Abzweigung liegt ein Werkzeugkasten im Staub.",
      choices: [
        { id: "search-locker", label: "Das verschlossene Werkzeugfach hinter der Bank öffnen", excludes: "minenfach-gepluendert",
          mark: "minenfach-gepluendert", loot: "minenfach", to: "mine-cleared" },
        { id: "inspect-mine", label: "Das rote Garn am Werkzeugkasten und die Kerbe im Staub prüfen", excludes: "joren-spur",
          mark: "joren-spur", to: "mine-cleared",
          message: "Der Pfeil weist zum alten Grenzhaus. Jemand hat mit dem Fingernagel ein zweites Zeichen daneben geritzt: verletzt." },
        { id: "mine-pass", label: "Durch den Stollen zum Eispass weitergehen", destination: "pass", excludes: "pass-gesperrt", to: "pass" },
        { id: "mine-back", label: "Nach Eiswacht zurückkehren", to: "watch-yard", destination: "hochwacht" },
      ],
    },
    "ridge-trail": {
      place: "Eispass · Felsrippe", title: "Der Schatten über dem Steig",
      objective: "Sichere den Steig über die Felsrippe.", map: "ridge",
      text: "Ein Felsgreif kreist über dem einzigen offenen Absatz. Im Geröll liegen alte Seile der Grenzwache. Dahinter führt der Steig hinauf zu einem verlassenen Signalplatz.",
      creature: "felsgreif",
      choices: [
        { id: "ridge-net", label: "Ein altes Fangnetz für den Kampf vorbereiten", excludes: "greifnetz",
          mark: "greifnetz", to: "ridge-trail",
          message: "Du spannst das alte Netz am Fels. Der Greif kann sich beim ersten Gegenangriff darin verfangen." },
        { id: "ridge-fight", label: "Den Felsgreif am Absatz stellen · Kampf", excludes: "greif-besiegt", fight: "felsgreif", to: "ridge-cleared" },
        { id: "ridge-climb", label: "Die gedeckte Seilroute erklettern", check: ["list", 13], advantage: "waldspur",
          excludes: "pass-ridge", pass: "Du erreichst den Signalplatz unter dem Felsüberhang.", fail: "Ein Stein löst sich. Der Greif stößt herab.",
          mark: "pass-ridge", fight: "felsgreif", to: "ridge-cleared" },
        { id: "ridge-back", label: "Nach Eiswacht zurückkehren", to: "watch-yard", destination: "hochwacht" },
      ],
    },
    "ridge-cleared": {
      place: "Eispass · Signalplatz", title: "Über der Schlucht",
      objective: "Markiere den Steig und gehe zum Pass.", map: "ridge",
      illustration: "signalplatz.png",
      text: "In der Signalschale liegt nasses Tuch. Jenseits der Schlucht steht das Grenzhaus, das Dach halb eingesunken. Für einen Augenblick hält jemand einen blanken Gegenstand in die Öffnung. Dann bleibt sie dunkel.",
      choices: [
        { id: "search-chest", label: "Die Wachtruhe unter dem nassen Tuch öffnen", excludes: "signaltruhe-gepluendert",
          mark: "signaltruhe-gepluendert", loot: "signaltruhe", to: "ridge-cleared" },
        { id: "find-shelter", label: "Auf ein weiteres Zeichen aus dem Grenzhaus warten", excludes: "joren-spur",
          mark: "joren-spur", to: "ridge-cleared",
          message: "Ein zweites Blinken aus dem Grenzhaus. Dort wartet noch jemand." },
        { id: "send-signal", label: "Runa das vereinbarte Signal für den Seilwagen geben", requires: ["runa-plan", "joren-spur"],
          excludes: ["seilwagen", "joren-gerettet", "joren-verloren"], mark: "seilwagen", to: "ridge-cleared",
          message: "Du deckst die Laterne zweimal kurz auf. Tief unten antwortet ein Licht. Der Seilwagen ist unterwegs." },
        { id: "ridge-pass", label: "Vom Signalplatz zum Eispass steigen", destination: "pass", excludes: "pass-gesperrt", to: "pass" },
        { id: "ridge-back", label: "Nach Eiswacht zurückkehren", to: "watch-yard", destination: "hochwacht" },
      ],
    },
    ravine: {
      place: "Eispass · Trollschlund", title: "Unter den Grenzsteinen",
      objective: "Erkunde die Schlucht. Der Troll ist ein schwerer Gegner.", map: "ravine",
      text: "Aus der Felsspalte dringt ein schweres Atmen. Hinter dem Troll führt ein alter Treidelpfad zum Pass. Seine Wunden schließen sich ohne Feuer. Die Höhle ist eng genug, um ihn mit einer Fackel auf Abstand zu halten.",
      creature: "schlundtroll",
      choices: [
        { id: "ravine-fight", label: "In die Höhle treten · Schwerer Kampf", excludes: "troll-besiegt", fight: "schlundtroll", to: "ravine-cleared" },
        { id: "ravine-back", label: "Nach Eiswacht zurückkehren", to: "watch-yard", destination: "hochwacht" },
      ],
    },
    "ravine-cleared": {
      place: "Eispass · Treidelpfad", title: "Der Weg hinter der Höhle",
      objective: "Nutze den Pfad oder melde ihn der Wache.", map: "ravine",
      text: "Hinter der Höhle findest du einen schmalen Pfad. Du legst Steine an die Abzweigung, damit die Grenzwache ihn wiederfindet.",
      choices: [
        { id: "find-shelter", label: "Den blutigen Stoff am Grenzstein untersuchen", excludes: "joren-spur",
          mark: "joren-spur", to: "ravine-cleared",
          message: "Ein Streifen roten Garns hängt im Stein. Die Schleifspur zieht sich bergauf zum Grenzhaus." },
        { id: "ravine-pass", label: "Dem Treidelpfad zum Eispass folgen", destination: "pass", excludes: "pass-gesperrt", to: "pass" },
        { id: "ravine-back", label: "Nach Eiswacht zurückkehren", to: "watch-yard", destination: "hochwacht" },
      ],
    },
    pass: {
      place: "Eispass · Grenzsteine", title: "Die Asche auf der Südseite",
      objective: "Entscheide, welche Nachricht Eiswacht erhält.", map: "pass",
      text: "Südlich der Grenzsteine ist der Schnee unter einer grauen Schicht verschwunden. Zwischen zwei Steinen glimmt noch eine schmale Linie. Was du hier meldest, bestimmt, wie die Wache den Pass sichert.",
      choices: [
        { id: "shelter", label: "Der Spur zum alten Grenzhaus folgen", requires: "joren-spur", excludes: ["joren-gerettet", "joren-verloren"], to: "pass-shelter" },
        { id: "look-shelter", label: "Dem schwachen Klopfen hinter den Grenzsteinen nachgehen", excludes: ["joren-spur", "joren-gerettet", "joren-verloren"], to: "pass-shelter" },
        { id: "pass-seal", label: "Die Wache warnen und den Übergang sperren lassen", condition: "report-ready", excludes: "pass-gemeldet",
          mark: "pass-gesperrt", to: "pass-report" },
        { id: "pass-post", label: "Den erschlossenen Weg unter Bewachung offen halten", condition: "report-ready", excludes: "pass-gemeldet",
          mark: "pass-bewacht", to: "pass-report" },
        { id: "pass-back", label: "Nach Eiswacht zurückkehren", destination: "hochwacht", to: "watch-yard" },
      ],
    },
    "pass-shelter": {
      place: "Eispass · Grenzhaus", title: "Unter dem geborstenen Balken", map: "pass",
      objective: "Entscheide, wie du Joren aus dem Grenzhaus holst.",
      text: "Jorens Bein steckt unter einem Querbalken. Mit einem Messer hat er Kerben in den Türrahmen geschlagen, damit ihn jemand hört. Als er dich sieht, fragt er zuerst nach seiner Schwester. Vom Dach rieselt Asche auf seine Stiefel.",
      choices: [
        { id: "rescue-rope", label: "Mit Runas Seilwagen den Balken kontrolliert anheben", requires: "seilwagen",
          mark: "joren-gerettet", to: "pass", message: "Das Seil spannt sich. Runa hält den Balken, während du Joren über die Schwelle ziehst." },
        { id: "rescue-herb", label: "Joren mit Galgenwurz stabilisieren und ihn herausziehen", requiresItem: "galgenwurz",
          consume: "galgenwurz", mark: "joren-gerettet", to: "pass",
          message: "Mit der Galgenwurz hält Joren lange genug durch. Gemeinsam schiebt ihr den Balken gerade weit genug zur Seite." },
        { id: "rescue-ember", label: "[· 1 Glut] Die Wunde mit geweihter Flamme ausbrennen", emberCost: 1,
          emberRescue: true, balanceShift: 1, ruf: { watch: 12 }, to: "pass",
          message: "Du bindest die Glut im Holz. Der Balken hält gerade lange genug, um Joren hinauszuziehen. Dann brennst du seine Wunde mit geweihter Flamme aus." },
        // Patch 2.5.4: Ohne Glutgabe (Kronreich, Freie Häfen) rettet eine Probe auf einen Grundwert. Misslingt sie, bleibt der andere Weg.
        { id: "rescue-strength", label: "[Stärke 11] Den brennenden Balken mit bloßer Kraft stemmen", glutlos: true,
          check: ["strength", 11], failMark: "joren-stemmen-versucht", excludes: "joren-stemmen-versucht",
          mark: "joren-gerettet", ruf: { watch: 12 }, to: "pass", failTo: "pass-shelter",
          pass: "Du stemmst die Schulter unter den Balken. Das Holz knirscht, hebt sich eine Handbreit, und Joren kriecht hinaus.",
          fail: "Der Balken bewegt sich keinen Fingerbreit. Joren stöhnt. Allein mit Kraft geht es nicht." },
        { id: "rescue-lever", label: "[Geschick 11] Einen Deichselbaum als Hebel ansetzen", glutlos: true,
          check: ["agility", 11], failMark: "joren-hebel-versucht", excludes: "joren-hebel-versucht",
          mark: "joren-gerettet", ruf: { watch: 12 }, to: "pass", failTo: "pass-shelter",
          pass: "Du setzt die Deichsel unter den Balken und keilst einen Stein darunter. Langsam hebt sich das Holz, und du ziehst Joren heraus.",
          fail: "Die Deichsel rutscht vom Stein ab und schlägt gegen die Wand. Asche rieselt herab. Der Hebel findet keinen Halt." },
        { id: "rescue-balance", label: "Atmen und die Glut sammeln", condition: "unbalanced",
          center: true, to: "pass-shelter", message: "Du wartest, bis sich die Glut beruhigt hat." },
        { id: "rescue-wait", label: "Zurück nach Eiswacht gehen und zuerst Hilfe organisieren", to: "watch-yard", destination: "hochwacht" },
        { id: "rescue-leave", label: "Das Grenzhaus aufgeben und Joren zurücklassen", mark: "joren-verloren", to: "pass",
          message: "Du hörst das Klopfen noch einmal, als du die Schwelle verlässt. Danach ist es still." },
      ],
    },
    "pass-report": {
      place: "Eiswacht · Wachhof", title: "Der Auftrag am Eispass", map: "hochwacht",
      objective: "Der Bericht ist abgegeben. Weitere Wege bleiben erkundbar.",
      text: "Runa legt den Bericht neben die Signallaterne. Draußen wartet Lene an derselben Stelle wie am Morgen.",
      choices: [
        { id: "reward-sword", label: "Runas Wachschwert als Dank annehmen", requires: "joren-gerettet",
          excludes: "jorens-dank", mark: "jorens-dank", item: "wachschwert", to: "pass-report" },
        { id: "reward-cloak", label: "Lenes Grenzläufermantel als Dank annehmen", requires: "joren-gerettet",
          excludes: "jorens-dank", mark: "jorens-dank", item: "grenzmantel", to: "pass-report" },
        { id: "watch-yard", label: "Weiterreisen und die Karte öffnen", to: "watch-yard" },
      ],
    },
    "skarn-briefing": {
      place: "Eiswacht · Kartenstube", map: "hochwacht", title: "Dreimal kein Licht",
      objective: "Finde heraus, warum das Runentor am Glutberg kein Signal mehr gibt.",
      text: "Runa dreht drei Holzmarken auf der Karte um. Die Ewige Flamme brennt in Glutberg weiter. Seit drei Abenden fehlt aber das Signal vom unteren Runentor. Die Hütten am Grenzlager sind bewohnt. Wenn die Asche die Stiege nimmt, kommen die Bewohner mit ihren Vorräten nicht mehr fort.",
      choices: [
        { id: "skarn-accept", label: "Zum Runentor aufbrechen und nach den Bewohnern sehen", mark: "skarn-auftrag", to: "watch-yard" },
        { id: "skarn-later", label: "Erst am Wachhof Vorbereitungen treffen", to: "watch-yard" },
      ],
    },
    "skarn-gate": {
      place: "Glutberg · Grenzlager", map: "skarn-gate", title: "Die Häuser ohne Rauch",
      objective: "Finde einen Weg zum Runentor.",
      text: "Die Steinmetzin Nalda sitzt vor einer kalten Esse und wickelt Seile um ihre Finger. Ihr Sohn Torben ist mit der letzten Laterne zum Runentor gegangen. Seitdem steht ein Frostbär auf dem alten Klippenweg.",
      choices: [
        { id: "skarn-sledge", label: "Jorens Seilzeichen erklären und damit die Bergwacht einweisen",
          requires: "joren-gerettet", excludes: "skarn-seilschlitten", mark: "skarn-seilschlitten", to: "skarn-gate",
          message: "Nalda erkennt Jorens Zeichen. Zusammen richtet ihr einen Seilschlitten für den Rückweg her." },
        { id: "skarn-search", label: "Nalda beim Verteilen der letzten Vorräte helfen", excludes: "skarn-vorrat-geholt",
          mark: "skarn-vorrat-geholt", loot: "skarn-vorrat", to: "skarn-gate",
          message: "Nalda behält die Vorräte für die Kinder und gibt dir einen Verband und eine Glutampulle für den Klippenweg." },
        { id: "skarn-trust", label: "Die angebotene Glutampulle der Bergwacht annehmen · Ruf +25",
          faction: ["skarn", 25], excludes: "bergwacht-vertrauensgabe", mark: "bergwacht-vertrauensgabe",
          item: "glutampulle", to: "skarn-gate", message: "Die Bergwacht gibt dir eine Ampulle aus ihrem eigenen Vorrat." },
        { id: "skarn-cliffs", label: "Den alten Klippenweg nehmen", excludes: "skarn-klippen-frei", destination: "skarn-cliffs", to: "skarn-cliffs" },
        { id: "skarn-cliffs-return", label: "Zum freien Klippenweg zurückkehren", requires: "skarn-klippen-frei",
          destination: "skarn-cliffs", to: "skarn-cliffs-open" },
        { id: "skarn-south", label: "Nach Eiswacht zurückreisen", destination: "hochwacht", to: "watch-yard" },
      ],
    },
    "skarn-cliffs": {
      place: "Glutberg · Klippenweg", map: "skarn-cliffs", title: "Tatzen am Abgrund",
      objective: "Finde einen Weg am Frostbären vorbei.",
      creature: "frostbaer",
      illustration: "nordpass.png",
      text: "Der Bär brüllt erst, wenn du dich dem Windfang näherst. In einer trockenen Mulde hinter ihm bewegt sich ein Jungtier. Am Steinrand ist ein alter Handlauf noch fest im Fels.",
      choices: [
        { id: "skarn-rope", label: "Den Seilschlitten als Sicherung für den unteren Steig benutzen",
          requires: "skarn-seilschlitten", mark: "klippen-umgangen", to: "skarn-cliffs-open",
          message: "Ihr sichert den Steig unterhalb der Mulde. Muttertier und Junges bleiben am Windfang." },
        { id: "skarn-calm", label: "Die Gruppe zurückhalten und langsam am Windfang vorbeigehen",
          check: ["mut", 13], mark: "klippen-beruhigt", fight: "frostbaer", to: "skarn-cliffs-open",
          pass: "Du hältst Abstand, bis der Bär mit seinem Jungen abzieht.",
          fail: "Auf dem Steig bricht Eis unter dir. Der Bär springt vor die Mulde." },
        { id: "skarn-fight", label: "Den Frostbären am Windfang stellen", fight: "frostbaer", to: "skarn-cliffs-open" },
        { id: "skarn-back", label: "Ins Grenzlager zurückgehen", destination: "skarn-gate", to: "skarn-gate" },
      ],
    },
    "skarn-cliffs-open": {
      place: "Glutberg · Klippenweg", map: "skarn-cliffs", title: "Die andere Seite",
      objective: "Folge dem Steig zum Runentor.",
      text: "Hinter dem Windfang findest du Torbens Laterne. Über die Felswand kommt ein dumpfes Klopfen vom Runentor.",
      choices: [
        { id: "skarn-runes", label: "Torbens Laterne zum Runentor bringen", excludes: ["runen-geschuetzt", "runen-verbrannt"],
          destination: "skarn-runes", to: "skarn-runes" },
        { id: "skarn-runes-return", label: "Zum Runentor zurückkehren", condition: "skarn-done",
          destination: "skarn-runes", to: "skarn-aftermath" },
        { id: "skarn-back", label: "Ins Grenzlager zurückgehen", destination: "skarn-gate", to: "skarn-gate" },
      ],
    },
    "skarn-runes": {
      place: "Glutberg · Runentor", map: "skarn-runes", title: "Namen im Stein",
      objective: "Entscheide, wie du Torben und den Weg aus der Asche holst.",
      text: "Torben steckt auf der falschen Seite der halb eingestürzten Torbögen. Die Flammenrunen des Ordens halten den Durchgang offen. Nalda hat die Namen der Familien in denselben Stein gemeißelt. Als du die Hand hebst, folgt deine eigene Glut deinem Atem und breitet sich entlang der Schrift aus.",
      choices: [
        { id: "skarn-balance", label: "Die Runen mit gebundener Glut stabilisieren · 1 Glut", emberCost: 1,
          emberRescue: "runen-geschuetzt", to: "skarn-aftermath",
          message: "Die Glut verteilt sich auf die ganze Schrift. Torben kann hindurch. Die Namen bleiben im Stein." },
        // Patch 2.5.4: Ersatz ohne Glutgabe für Kronreich und Freie Häfen.
        { id: "skarn-wedge", label: "[Intelligenz 12] Die Inschrift mechanisch verkeilen", glutlos: true,
          check: ["mind", 12], failMark: "runen-keil-versucht", excludes: "runen-keil-versucht",
          mark: "runen-geschuetzt", to: "skarn-aftermath", failTo: "skarn-runes",
          pass: "Du liest, wo die Bögen tragen, und treibst Keile in die Fugen zwischen den Namen. Die Schrift hält, und Torben kommt hindurch.",
          fail: "Der erste Keil sprengt eine Ecke aus dem Stein. Du hältst inne, bevor die Namen brechen." },
        { id: "skarn-pull", label: "Torben mit dem Seilschlitten aus dem Spalt ziehen", requires: "skarn-seilschlitten",
          mark: "runen-geschuetzt", to: "skarn-aftermath",
          message: "Am Seil kommt Torben durch den Spalt. Nalda sichert die Bögen von außen." },
        { id: "skarn-burn", label: "Den kalten Torflügel zerschlagen und die glühenden Runen opfern",
          mark: "runen-verbrannt", to: "skarn-aftermath",
          message: "Du drückst Torben durch den freigewordenen Spalt. Beim Einsturz werden die glühenden Namen zu schwarzem Staub." },
        { id: "skarn-compose", label: "Die Glut sammeln, bevor du das Tor berührst", condition: "unbalanced",
          center: true, to: "skarn-runes" },
        { id: "skarn-cliff-back", label: "Zum Klippenweg zurückgehen", destination: "skarn-cliffs", to: "skarn-cliffs-open" },
      ],
    },
    "skarn-aftermath": {
      place: "Glutberg · Runentor", map: "skarn-runes", title: "Was die Stiege trägt",
      objective: "Kehre ins Grenzlager zurück.",
      text: "Nalda hat euch vom Steig aus gesehen. Sie steigt die letzten Stufen herauf und drückt Torben die Laterne in die Hand. Beim Abstieg zählt er die Lichter im Grenzlager.",
      choices: [
        { id: "skarn-reward", label: "Naldas Runenbeil als Dank annehmen", requires: "runen-geschuetzt",
          excludes: "skarn-belohnung", mark: "skarn-belohnung", item: "runenbeil", to: "skarn-aftermath" },
        { id: "skarn-broken-reward", label: "Den letzten Runensplitter vom Boden aufheben", requires: "runen-verbrannt",
          excludes: "skarn-belohnung", mark: "skarn-belohnung", item: "runensplitter", to: "skarn-aftermath" },
        { id: "skarn-return", label: "Mit Torben ins Grenzlager zurückkehren", destination: "skarn-gate", to: "skarn-gate" },
      ],
    },
    // Patch 2.5.4: Die Niederlage beendet die Reise nicht mehr. Kein automatisches Speichern in dieser Szene;
    // „Letzten Wegpunkt laden“ erscheint im Spiel nur, wenn ein Spielstand vor dem Kampf existiert.
    defeat: {
      place: "Kronreich", title: "Der Weg endet hier", objective: "Wähle, wie deine Chronik weitergeht.",
      text: "Stahl und Staub schmecken nach Blut. Deine Deckung bricht, und Schwärze schlägt über dir zusammen. Doch der Tod nimmt dich heute noch nicht.",
      choices: [
        { id: "retreat", label: "Aus dem Staub kriechen und zur letzten Zuflucht schleppen", survive: true,
          hint: "Du erwachst mit 1 LP in der letzten sicheren Stadt. Ein Viertel deines Silbers ist verloren, die Moral sinkt um 20." },
      ],
    },
    // Weltebene (Technische Spezifikation): Ort, Text und Aktionen liefert der Stadt-Hub des aktuellen Knotens.
    weltknoten: {
      place: "Weltreise", title: "Unterwegs in Odris", objective: "Reise von Knoten zu Knoten. Jede Reise ist eine Etappe der Weltleisten.",
      text: "",
    },
    weltende: {
      place: "Odris", title: "Die Welt fällt", objective: "Das Spiel ist verloren.",
      text: "Das Gleichgewicht der Welt ist gebrochen. Deine Reise endet hier.",
    },
  };
  // Gegnerwerte nach dem Kampfdokument (17. 11. 2026): Rang und Stufe bestimmen LP und Schaden (spiel/kampf.js).
  // Namen und Bilder bleiben, die alten Bestiariumswerte gelten im Kampf nicht mehr. Prolog: Gegnerstufe 1 bis 2, Akt 1: 3 bis 5.
  const fights = {
    keiler: {
      gegner: { rang: "elite", stufe: 2 },
      to: "ford", victory: "keiler-erlegt", escape: "keiler-umgangen", loot: ["keilerhauer", "borstenfell"],
      spearPierce: 2, special: { name: "Rammstoß", warning: "Der Keiler scharrt mit den Vorderhufen.",
        damage: 2, stuns: true },
    },
    galgenkraehe: {
      gegner: { rang: "mitlaeufer", stufe: 1, anzahl: 3 },
      to: "arrival", victory: "kraehen-besiegt", escape: "kraehen-umgangen", loot: ["kraehenfedern"],
      emberBonus: 4, special: { name: "Schnabelhiebe", warning: "Die Krähen sammeln sich zum Sturzflug.",
        damage: 1, bleeds: true },
    },
    grauwolf: {
      gegner: { rang: "mitlaeufer", stufe: 2, anzahl: 3, tags: ["spaeher"] },
      name: "Leitwolf der Grauwölfe", to: "ford", victory: "woelfe-besiegt", escape: "woelfe-umgangen",
      loot: ["wolfspelz", "wolfszahn"], emberBonus: 3,
      special: { name: "Reißbiss", warning: "Der Leitwolf setzt zum Sprung an.", damage: 1, bleeds: true },
      victoryText: "Der Leitwolf fällt. Das Rudel zieht sich zwischen die Eichen zurück.",
    },
    irrglut: {
      gegner: { rang: "elite", stufe: 2 },
      to: "moor-report", victory: "irrglut-besiegt", escape: "irrglut-entkommen",
      loot: ["glutfunke"],
      special: { name: "Glutwurf", warning: "Das Licht zieht sich zu einem glühenden Kern zusammen.",
        damage: 2, drainsEmber: true },
      victoryText: "Das Licht erlischt. Zwischen den Bohlen bleibt ein Glutfunke zurück.",
    },
    glutkaefer: {
      gegner: { rang: "mitlaeufer", stufe: 2, anzahl: 3 },
      to: "mine-cleared", retreatTo: "watch-yard", victory: "kaefer-besiegt", unlock: "pass-mine",
      loot: ["glutpanzer"], deathBurst: 3,
      special: { name: "Glutwolke", warning: "Unter den Panzern leuchtet es orange.", damage: 2 },
    },
    felsgreif: {
      gegner: { rang: "elite", stufe: 3 },
      to: "ridge-cleared", retreatTo: "watch-yard", victory: "greif-besiegt", unlock: "pass-ridge",
      loot: ["greifenfeder", "greifenklaue"], preparation: "greifnetz",
      special: { name: "Sturzflug", warning: "Der Greif legt die Flügel an.", damage: 3, stuns: true },
    },
    schlundtroll: {
      gegner: { rang: "elite", stufe: 4 },
      to: "ravine-cleared", retreatTo: "watch-yard", victory: "troll-besiegt", unlock: "pass-ravine",
      loot: ["trollblut"], regeneration: 4, emberBonus: 5,
      special: { name: "Keulenschlag", warning: "Der Troll holt mit seiner Keule aus.", damage: 4, stuns: true },
    },
    deserteure: {
      gegner: { rang: "mitlaeufer", stufe: 3, anzahl: 3, tags: ["schurke"] },
      to: "toll-resolved", retreatTo: "watch-yard", victory: "zoll-befreit", loot: ["rostklaue"],
      special: { name: "Flankenangriff", warning: "Der zweite Deserteur versucht, hinter dich zu kommen.", damage: 2 },
    },
    frostbaer: {
      gegner: { rang: "elite", stufe: 4 },
      to: "skarn-cliffs-open", retreatTo: "skarn-gate", victory: "frostbaer-besiegt",
      loot: ["frostfell", "baerenklaue"], emberBonus: 4,
      special: { name: "Prankenhieb", warning: "Der Frostbär richtet sich auf.", damage: 3, stuns: true },
    },
  };
  creatures.deserteure = { name: "Deserteure", stats: [24, 7, 2, 5] };
  const frostBear = lands.find(land => land.id === "skarnheim").fauna.find(row => row[0] === "Frostbär");
  creatures.frostbaer = { name: frostBear[0], stats: [46, 10, 3, 5] };
  const enemyGroups = {
    galgenkraehe: { leader: "Galgenkrähe", ally: "Weitere Krähe", health: 7, attack: 2 },
    grauwolf: { leader: "Leitwolf", ally: "Grauwolf", health: 10, attack: 3 },
    glutkaefer: { leader: "Glutkäfer", ally: "Weiterer Glutkäfer", health: 6, attack: 2 },
    deserteure: { leader: "Wortführer", ally: "Deserteur", health: 12, attack: 3 },
  };
  // Silber für gewonnene Kämpfe. Die EP ergeben sich aus dem Kampfdokument (50 je Schlacht, 10 je Gegnerstufe).
  const battleRewards = {
    keiler: [30, 0], galgenkraehe: [22, 0], grauwolf: [32, 0], irrglut: [36, 0],
    glutkaefer: [30, 0], felsgreif: [55, 0], schlundtroll: [85, 0], deserteure: [50, 14], frostbaer: [75, 0],
  };
  const destinations = {
    weidenkamm: { name: "Kornwik", position: [42, 88], note: "Ackerland" },
    rotwaelder: { name: "Eichenwald", position: [27, 76], note: "Wagenweg bei Heidvang" },
    kraehenfurt: { name: "Heidvang", position: [12, 87], note: "Fährhaus" },
    schwarzmoor: { name: "Bohlenweg", position: [14, 60], note: "Moor bei Eiswacht" },
    hochwacht: { name: "Eiswacht", position: [38, 52], note: "Wachhof und Rast" },
    mine: { name: "Alte Glutmine", position: [20, 34], note: "Glutkäfer · Stollen" },
    ridge: { name: "Felsrippe", position: [46, 33], note: "Felsgreif · Steig" },
    ravine: { name: "Trollschlund", position: [68, 63], note: "Schlundtroll · Schwerer Kampf" },
    pass: { name: "Eispass", position: [56, 16], note: "Grenzsteine · Auftragsziel" },
    toll: { name: "Zollstelle", position: [50, 74], note: "Passhütte · Adas Wagen · Menschliche Begegnung" },
    "skarn-gate": { name: "Glutberg", position: [84, 42], note: "Unteres Grenzlager · Naldas Lager" },
    "skarn-cliffs": { name: "Klippenweg", position: [88, 22], note: "Glutberg · Frostbär" },
    "skarn-runes": { name: "Runentor", position: [76, 7], note: "Glutberg · Torben suchen" },
  };
  const routes = [
    ["weidenkamm", "rotwaelder"], ["weidenkamm", "kraehenfurt"], ["rotwaelder", "kraehenfurt"], ["kraehenfurt", "schwarzmoor"],
    ["kraehenfurt", "hochwacht"], ["schwarzmoor", "hochwacht"],
    ["hochwacht", "mine"], ["hochwacht", "ridge"], ["hochwacht", "ravine"],
    ["mine", "pass"], ["ridge", "pass"], ["ravine", "pass"], ["hochwacht", "toll"],
    ["hochwacht", "skarn-gate"], ["skarn-gate", "skarn-cliffs"], ["skarn-cliffs", "skarn-runes"],
  ];
  // Errata 8: Reise- und Zufallsbegegnungsregel. Jede Kante der Reisekarte hat einen Typ.
  // Kernland: 70 % ruhig, 20 % scheue Tiere, 10 % Jäger. Grenzland: 40 % ruhig, 40 % Jäger, 20 % scheue Tiere oder Gerüchte.
  // Spezialkanten (Pässe, Stollen, Klippen) haben feste Revier-Gegner aus der Handlung und keinen Zufallswurf.
  const edgeTypes = {
    "weidenkamm|kraehenfurt": "kernland", "kraehenfurt|hochwacht": "kernland", "hochwacht|skarn-gate": "kernland",
    "weidenkamm|rotwaelder": "grenzland", "rotwaelder|kraehenfurt": "grenzland", "kraehenfurt|schwarzmoor": "grenzland",
    "schwarzmoor|hochwacht": "grenzland", "hochwacht|toll": "grenzland", "skarn-gate|skarn-cliffs": "grenzland",
  };
  const edgeType = (from, to) => edgeTypes[from + "|" + to] ?? edgeTypes[to + "|" + from] ?? "spezial";
  const encounterTables = {
    kernland: [[70, "ruhig"], [20, "scheu"], [10, "jaeger"]],
    grenzland: [[40, "ruhig"], [40, "jaeger"], [20, "scheu"]],
  };
  // Regionale Pools nach dem Bestiarium (Kronreich und Eispass). Alphatiere ersetzen zu 10 % einen Jäger.
  const encounterPools = {
    jaeger: { weidenkamm: ["jagd-galgenkraehe", "jagd-grauwolf"], rotwaelder: ["jagd-grauwolf"], kraehenfurt: ["jagd-galgenkraehe"],
      schwarzmoor: ["jagd-irrglut"], hochwacht: ["jagd-grauwolf"], toll: ["jagd-grauwolf"], "skarn-gate": ["jagd-grauwolf"],
      "skarn-cliffs": ["jagd-grauwolf"] },
    alpha: ["jagd-graufang"],
  };
  const quietTexts = [
    "Die Straße bleibt ruhig. Nur der Wind treibt Asche über die Furchen.",
    "Ein Fuhrmann grüßt dich vom Bock. Ihr tauscht Neuigkeiten über das Wetter am Pass.",
    "Nieselregen begleitet dich. Unterwegs begegnet dir niemand.",
  ];
  const rumorTexts = [
    "An einem Wegkreuz flüstern Reisende von Kultisten, die nachts Gräber öffnen.",
    "Ein Händler erzählt von Rostsegel-Piraten vor der Westküste.",
  ];
  const travelScenes = {
    hochwacht: ["watch-yard"], kraehenfurt: ["return-ford"], weidenkamm: ["return-field"],
    rotwaelder: ["return-forest"], schwarzmoor: ["return-moor"], mine: ["mine", "mine-cleared"],
    ridge: ["ridge-trail", "ridge-cleared"], ravine: ["ravine", "ravine-cleared"], pass: ["pass"],
    toll: ["toll", "toll-resolved"],
    "skarn-gate": ["skarn-gate"], "skarn-cliffs": ["skarn-cliffs", "skarn-cliffs-open"],
    "skarn-runes": ["skarn-runes", "skarn-aftermath"],
  };
  const companions = {
    knight: {
      klasse: "waechter", name: "Iven", scenes: ["watch-yard"], place: "Wachhof von Eiswacht",
      introduction: "Iven zieht die lockeren Riemen an seinem Schild fest. Seit sein Trupp am Pass aufgerieben wurde, begleitet er Reisende über die alten Wachwege.",
      ability: "Schildwall", guard: 11,
    },
    mage: {
      klasse: "magier", name: "Sela", scenes: ["mine-cleared", "supply-post"], place: "Glutmine oder Zeugkammer",
      introduction: "Sela wickelt einen warmen Runenstein in Filz. Sie will wissen, warum die Glut in den Minen anders reagiert als unter freiem Himmel.",
      ability: "Runenfeuer", damage: 13, fire: true,
    },
    priest: {
      klasse: "heiler", name: "Heda", scenes: ["arrival", "return-ford"], place: "Fährhaus in Heidvang",
      introduction: "Heda spült blutige Tücher am Fährhaus aus. Sie sucht jemanden, der sie zu den Dörfern begleitet, die seit der Asche keine Hilfe mehr bekommen.",
      ability: "Wunden schließen", heal: 12, cleanse: true,
    },
    ranger: {
      klasse: "spaeher", name: "Neri", scenes: ["forest", "return-forest"], place: "Bachpfad in den Wäldern bei Heidvang",
      introduction: "Neri kniet neben zwei verwischten Spuren am Bach. Sie kennt den Wagenweg und sucht Begleitung für die höheren Steige.",
      ability: "Gezielter Schuss", damage: 10, airborne: 4,
    },
    thief: {
      klasse: "schurke", name: "Tovin", scenes: ["toll-resolved"], place: "Adas Wagen an der Zollstelle",
      introduction: "Tovin gibt Ada einen Schlüssel zurück, den die Deserteure ihr abgenommen hatten. Er kennt ihre alten Verstecke und möchte in Eiswacht neu anfangen.",
      ability: "Täuschmanöver", guard: 8, damage: 4,
    },
    necromancer: {
      klasse: "magier", name: "Oren", scenes: ["return-moor"], place: "Bohlenweg im Moor bei Eiswacht",
      introduction: "Oren liest die Namen auf alten Grabpfählen ab, bevor sie im Moor versinken. Er bittet dich, ihn bis zur nächsten befestigten Siedlung mitzunehmen.",
      ability: "Knochenwacht", guard: 7, damage: 6,
    },
    paladin: {
      klasse: "krieger", name: "Mira", scenes: ["watch-yard"], place: "Wachfeuer von Eiswacht",
      introduction: "Mira teilt ihr Brot mit den Wachen. Sie hat im Aschenkloster ihren Eid auf Menschen geschworen, die den Pass überqueren müssen, und will mit dir hinauf.",
      ability: "Schutzsegen", heal: 6, guard: 6,
    },
    druid: {
      klasse: "heiler", name: "Bryn", scenes: ["start", "return-field"], place: "Kornwik",
      introduction: "Bryn kniet am Feldrain und wäscht Asche von einem jungen Halm. Er möchte herausfinden, an welchen Orten sich das Land von selbst erholt.",
      ability: "Wurzelverband", heal: 8, guard: 3,
    },
    warrior: {
      klasse: "krieger", name: "Kelda", scenes: ["supply-post"], place: "Zeugkammer von Eiswacht",
      introduction: "Kelda feilt die Scharte aus ihrer Axt. Für einen weiteren Tag in der Zeugkammer, sagt sie, reiche ihre Geduld kaum.",
      ability: "Wuchtiger Hieb", damage: 12,
    },
  };
  const factions = {
    watch: "Grenzwache von Eiswacht",
    skarn: "Bergwacht von Glutberg",
    groves: "Kronreich",
    houses: "Die Erinnernden",
    order: "Orden der Flamme",
    conclave: "Hüter des Weltenbaums",
    legion: "Hof der Bleichen Krone",
    league: "Freie Häfen",
  };
  const loyalties = {
    knight: { request: "Iven versprechen, die Vermissten am Pass zu suchen", proof: ["joren-gerettet"], broken: ["joren-verloren"], gift: "harzverband",
      talk: ["Iven erzählt von seinem alten Trupp. Du lässt ihn ausreden.", "Iven zeigt dir die Kerben auf seinem Schild. Ihr sprecht darüber, wen man im Stich lassen darf.", "Iven vertraut dir die Namen seiner verlorenen Kameraden an.", "Iven bittet dich, beim nächsten Wachwechsel neben ihm zu bleiben."] },
    mage: { request: "Sela versprechen, die Schrift am Runentor zu erhalten", proof: ["runen-geschuetzt"], broken: ["runen-verbrannt"], gift: "glutampulle",
      talk: ["Sela zeigt dir, wie viel Wärme der Runenstein durch den Filz abgibt.", "Sela erzählt, wem sie ihre ersten Aufzeichnungen verdankt.", "Ihr sprecht darüber, was Glut bewahren kann.", "Sela legt ihr Notizbuch beiseite und bleibt bei dir."] },
    priest: { request: "Heda versprechen, den vermissten Grenzläufer zurückzubringen", proof: ["joren-gerettet"], broken: ["joren-verloren"], gift: "harzverband",
      talk: ["Heda erzählt von ihrer Arbeit im Fährhaus.", "Du hilfst Heda, die Namen der Vermissten aufzuschreiben.", "Heda erzählt dir von der ersten Person, die sie nicht retten konnte.", "Heda fragt, ob ihr nach der Reise zusammen nach Heidvang gehen könnt."] },
    ranger: { request: "Neri versprechen, den Leuten in den Wäldern bei Heidvang zu helfen", proof: ["woelfe-vertrieben", "woelfe-besiegt", "forstbuch-zurueckgegeben"], gift: "wolfszahn",
      talk: ["Neri zeigt dir die Spuren am Bach.", "Neri erzählt dir, wo sie als Kind im Wald übernachtet hat.", "Neri verrät dir, warum sie den Wagenweg so gut kennt.", "Neri bittet dich, eines Tages mit ihr zu ihrem alten Aussichtspunkt zu gehen."] },
    thief: { request: "Ada mit ihrem Wagen helfen, damit Tovin dir vertraut", task: "haendlerin-geholfen", gift: "rostklaue",
      talk: ["Tovin gibt zu, dass der Schlüssel von Ada nicht seine einzige Schuld war.", "Tovin erzählt dir, weshalb er sich den Deserteuren angeschlossen hat.", "Tovin fragt, ob du glaubst, dass Ada ihm irgendwann verzeiht.", "Tovin bleibt beim Wachfeuer sitzen, als die anderen schon gegangen sind."] },
    necromancer: { request: "Oren versprechen, Namen und Grabschrift am Runentor zu schützen", proof: ["runen-geschuetzt"], broken: ["runen-verbrannt"], gift: "glutfunke",
      talk: ["Oren liest dir einen der Namen von den Grabpfählen vor.", "Oren erklärt, weshalb er Tote mit Namen anspricht.", "Oren verrät dir, wessen Namen er auf der Reise sucht.", "Oren legt die Liste beiseite und fragt, ob du noch etwas bleiben möchtest."] },
    paladin: { request: "Mira zusagen, den Grenzläufer lebend zurückzubringen", proof: ["joren-gerettet"], broken: ["joren-verloren"], gift: "glutampulle",
      talk: ["Mira teilt ihr Brot mit dir.", "Mira erzählt, wann sie ihren Eid abgelegt hat.", "Ihr sprecht darüber, wann ein Versprechen zu schwer wird.", "Mira fragt dich, wem du dich anvertrauen kannst, wenn die Reise vorbei ist."] },
    druid: { request: "Bryn versprechen, die Saat bei Kornwik zu schonen", proof: ["saat-erholt"], broken: ["saat-verbrannt", "runen-verbrannt"], gift: "galgenwurz",
      talk: ["Bryn zeigt dir, welcher Halm die Asche überstanden hat.", "Bryn erzählt, welche Pflanzen ihm auf seiner ersten Reise geholfen haben.", "Bryn spricht darüber, weshalb er nach einem Brand zuerst nach Keimlingen sucht.", "Bryn hält einen Platz für dich am Feldrain frei."] },
    warrior: { request: "Kelda versprechen, die alte Glutmine wieder begehbar zu machen", proof: ["pass-mine", "kaefer-besiegt"], gift: "eisenkeil",
      talk: ["Kelda erzählt, wie sie ihre erste Axt verloren hat.", "Kelda zeigt dir die Macke, die sie am Griff belassen hat.", "Kelda erzählt, warum ihr die Zeugkammer zu eng geworden ist.", "Kelda fragt, wo ihr nach dem Eispass als Nächstes hingehen wollt."] },
  };
  // Persönliche Haltungen, keine pauschale Feindschaft ganzer Völker.
  // Fraktionen und Orte folgen lore/voelker.js und lore/KANON.md.
  const recruitmentQuests = {
    knight: { title: "Ein Leben am Pass", text: "Rette Joren am Nordpass und kehre zu Iven zurück.", marks: ["joren-gerettet"] },
    mage: { title: "Wärme im Stein", text: "Finde einen Glutfunken (zum Beispiel im Moor) und übergib ihn Sela.", item: "glutfunke" },
    priest: { title: "Ein Verband für die Vermissten", text: "Fertige aus zwei Galgenwurz einen Harzverband und bringe ihn Heda.", item: "harzverband", crafted: "harzverband" },
    ranger: { title: "Sichere Waldwege", text: "Besiege oder vertreibe die Wölfe bei Heidvang und berichte Neri.", marks: ["woelfe-besiegt", "woelfe-vertrieben"] },
    thief: { title: "Eine Schuld bei Ada", text: "Hilf Ada mit ihrem Wagen an der Zollstelle und sprich wieder mit Tovin.", marks: ["haendlerin-geholfen"] },
    necromancer: { title: "Bewahrte Namen", text: "Schütze die Grabschrift am Runentor und berichte Oren.", marks: ["runen-geschuetzt"] },
    paladin: { title: "Vertrauen der Grenzwache", text: "Erreiche mindestens 25 Ruf bei der Grenzwache von Eiswacht.", faction: "watch", reputation: 25 },
    druid: { title: "Die erste grüne Saat", text: "Erneuere die Saat bei Kornwik, ohne sie zu verbrennen, und berichte Bryn.", marks: ["saat-erholt"] },
    warrior: { title: "Sold für den Aufbruch", text: "Vereinbare mit Kelda 15 Silber Sold. Zahle sofort oder sage die Zahlung für später zu.", salary: 15 },
  };
  const questTurns = { knight: 80, mage: 50, priest: 50, ranger: 40, thief: 35, necromancer: 100, paladin: 80, druid: 35, warrior: 25 };
  for (const [id, quest] of Object.entries(recruitmentQuests)) quest.turns = questTurns[id];
  const storyQuests = {
    "runa-rescue": { title: "Joren am Nordpass", giver: "Runa · Eiswacht", type: "Weltauftrag", turns: 80,
      text: "Finde Joren am Pass und rette ihn, bevor seine Zeit abläuft.",
      scenes: ["watch-yard", "pass", "pass-shelter"], success: ["joren-gerettet"], failure: ["joren-verloren"] },
    "ada-cart": { title: "Adas Wagen", giver: "Ada · Alte Zollstelle", type: "Weltauftrag", turns: 40,
      text: "Überwinde die Zollstelle und hilf Ada mit ihrem Wagen.",
      scenes: ["toll", "toll-resolved"], success: ["haendlerin-geholfen"] },
    "forest-book": { title: "Das verlorene Forstbuch", giver: "Enna · Wald bei Heidvang", type: "Weltauftrag", turns: 40,
      text: "Finde das Forstbuch und bringe es zu Enna zurück.",
      scenes: ["return-forest", "forest-cache"], success: ["forstbuch-zurueckgegeben"] },
    "torben-runes": { title: "Torben am Runentor", giver: "Torben · Glutberg", type: "Weltauftrag", turns: 60,
      text: "Befreie Torben am Runentor. Bewahren oder Verbrennen der Runen hat unterschiedliche Folgen.",
      scenes: ["skarn-gate", "skarn-runes"], success: ["runen-geschuetzt", "runen-verbrannt"] },
  };
  const companionAttitudes = {
    knight: { wary: ["untot", "vampir"], faction: "watch", reputation: 25,
      reason: "Iven fürchtet den Kult der Bleichen Ewigkeit. Als Untoter oder Vampir musst du zuerst 25 Ruf bei der Grenzwache gewinnen." },
    paladin: { blocked: ["untot"], wary: ["vampir"], faction: "order", reputation: 15,
      reason: "Mira lehnt für sich die Reise mit Erwachten ab. Vampiren vertraut sie erst ab 15 Ruf beim Orden der Flamme." },
    ranger: { wary: ["gruenhaut"], faction: "groves", reputation: 15,
      reason: "Neri misstraut dir als Ork nach einem persönlichen Grenzkonflikt. 15 Ruf beim Kronreich überzeugen sie." },
  };
  const recipes = {
    harzverband: { ingredients: { galgenwurz: 2 }, text: "Zwei Galgenwurz zu einem haltbaren Wundverband verarbeiten." },
  };
  // Errata 9 (17. 11. 2026): Söldner werden in Städten mit Zentrallager gegen Silber angeworben.
  // Volk zählt für die Volksgrenzen (Untote und Lebende, Orks und Zwerge). Werte sind Vorschlagswerte.
  Object.assign(companions, {
    steppenreiter: {
      klasse: "krieger", name: "Steppenreiter Arne", volk: "menschen", health: 30, scenes: [],
      soeldner: { kosten: 50, orte: ["weidenkamm", "kraehenfurt"] }, place: "Söldner in Kornwik und Heidvang",
      introduction: "Arne hat sein Pferd an der Grenze verloren, nicht aber seinen Säbel. Für Sold reitet er mit, wohin du willst.",
      ability: "Sturmangriff", damage: 10,
    },
    grenzbogner: {
      klasse: "spaeher", name: "Grenzbognerin Ylva", volk: "menschen", health: 26, scenes: [],
      soeldner: { kosten: 50, orte: ["weidenkamm", "kraehenfurt", "hochwacht"] }, place: "Söldnerin in Kornwik, Heidvang und Eiswacht",
      introduction: "Ylva zählt die Pfeile in ihrem Köcher zweimal. Sie hat für die Grenzwache gejagt, bis der Sold ausblieb.",
      ability: "Pfeilhagel", damage: 9, airborne: 3,
    },
    flammenknecht: {
      klasse: "waechter", name: "Flammenknecht Hal", volk: "menschen", health: 32, scenes: [],
      soeldner: { kosten: 50, orte: ["hochwacht", "skarn-gate"] }, place: "Söldner in Eiswacht und Glutberg",
      introduction: "Hal trägt das Zeichen des Ordens der Flamme auf dem Schild, aber keinen Eid mehr. Er schützt, wer ihn bezahlt.",
      ability: "Flammenschild", guard: 9,
    },
    feldscherin: {
      klasse: "heiler", name: "Feldscherin Ute", volk: "menschen", health: 24, scenes: [],
      soeldner: { kosten: 50, orte: ["hochwacht", "skarn-gate"] }, place: "Söldnerin in Eiswacht und Glutberg",
      introduction: "Ute rollt ihre Verbände so fest, dass sie wie Kerzen aussehen. Für Silber flickt sie jeden, der noch atmet.",
      ability: "Feldverband", heal: 8,
    },
  });
  // Gemeinsamer Treffpunkt, damit Aufnahmeaufträge nach Reisen abgegeben werden können.
  for (const companion of Object.values(companions)) {
    if (!companion.soeldner && !companion.scenes.includes("watch-yard")) companion.scenes.push("watch-yard");
  }
  const factionEffects = {
    "joren-gerettet": { watch: 30 }, "joren-verloren": { watch: -35 },
    "pass-bewacht": { watch: 20, skarn: 10 }, "pass-gesperrt": { watch: 10, skarn: -15 },
    "hochwacht-archiv": { watch: 10 }, "zoll-verhandelt": { watch: 15 }, "zoll-befreit": { watch: 10 },
    "forstbuch-zurueckgegeben": { groves: 25 }, "saat-erholt": { groves: 15 }, "saat-verbrannt": { groves: -30, order: -15 },
    "faehrwort": { houses: 15 }, "runen-geschuetzt": { skarn: 40, order: 15 }, "runen-verbrannt": { skarn: -35, order: -20 },
    "klippen-beruhigt": { skarn: 10 }, "skarn-vorrat-geholt": { skarn: 10 },
  };
  const relationshipEffects = {
    "joren-gerettet": { knight: 25, priest: 20, paladin: 25 },
    "joren-verloren": { knight: -65, priest: -55, paladin: -70 },
    "saat-verbrannt": { druid: -65, ranger: -25, priest: -15 },
    "saat-erholt": { druid: 25, ranger: 10 },
    "runen-verbrannt": { mage: -65, necromancer: -65, druid: -40, priest: -20 },
    "runen-geschuetzt": { mage: 25, necromancer: 25, druid: 20, priest: 15 },
    "woelfe-vertrieben": { ranger: 25 }, "woelfe-besiegt": { ranger: 25 },
    "forstbuch-zurueckgegeben": { ranger: 25, druid: 15, thief: 10 },
    "zoll-verhandelt": { thief: 15, paladin: 15 }, "haendlerin-geholfen": { thief: 25 },
    "pass-mine": { warrior: 25, mage: 15 }, "frostbaer-besiegt": { ranger: -25, druid: -25 },
    "klippen-beruhigt": { ranger: 15, druid: 15 },
  };
  // Zufallskämpfe der Reiseregel. Sie nutzen Werte und Bilder der bestehenden Gegner, setzen aber keine Handlungsmarken.
  const randomFight = (id, base, gegner, extra = {}) => {
    creatures[id] = { ...creatures[base] };
    if (enemyGroups[base]) enemyGroups[id] = { ...enemyGroups[base] };
    if (enemyAilments[base]) enemyAilments[id] = enemyAilments[base];
    const { to, victory, escape, retreatTo, unlock, preparation, ...rest } = fights[base];
    fights[id] = { ...rest, gegner, random: true, victoryText: "Der Hinterhalt ist abgewehrt.", ...extra };
    battleRewards[id] = [10, 0];
  };
  randomFight("jagd-grauwolf", "grauwolf", { rang: "mitlaeufer", stufe: 3, anzahl: 3, tags: ["spaeher"] },
    { name: "Grauwölfe im Hinterhalt", loot: ["wolfspelz"] });
  randomFight("jagd-galgenkraehe", "galgenkraehe", { rang: "mitlaeufer", stufe: 3, anzahl: 3 },
    { name: "Galgenkrähen im Sturzflug", loot: ["kraehenfedern"] });
  randomFight("jagd-irrglut", "irrglut", { rang: "elite", stufe: 3 }, { name: "Irrglut über den Bohlen", loot: ["glutfunke"] });
  // Graufang, Alphatier des Kronreichs: Anführer auf Gebietsstufe (Errata 4).
  randomFight("jagd-graufang", "grauwolf", { rang: "anfuehrer", stufe: 4 },
    { name: "Graufang, der weiße Leitwolf", loot: ["wolfspelz", "wolfszahn", "wolfszahn"], alpha: true,
      victoryText: "Graufang fällt. Ohne seinen Ruf zerstreut sich das Rudel." });
  delete enemyGroups["jagd-graufang"];
  creatures["jagd-graufang"].name = "Graufang";
  battleRewards["jagd-graufang"] = [40, 0];
  // Prologe der Nacht des Erwachens je Fraktion (spiel/startpunkte.js) und ihre Zentrallager.
  Object.assign(scenes, startpunkte.scenes);
  Object.assign(storageSites, startpunkte.storageSites);
  // Gegner, Belohnungen und Beute der Prologe in der Nacht des Erwachens.
  Object.assign(creatures, startpunkte.creatures);
  Object.assign(fights, startpunkte.fights);
  Object.assign(battleRewards, startpunkte.battleRewards);
  Object.assign(milestones, startpunkte.milestones);
  Object.assign(lootTables, startpunkte.lootTables);
  for (const scene of Object.values(scenes)) {
    if (scene.map) continue;
    const region = scene.place.split(" · ")[0];
    scene.map = ({
      Kornwik: "weidenkamm", "Eichenwald bei Heidvang": "rotwaelder", Heidvang: "kraehenfurt",
      "Moor bei Eiswacht": "schwarzmoor", Eiswacht: "hochwacht",
    })[region];
  }
  return { ailments, enemyAilments, attributes, skills, origins, classes, items, gear, supplies, rarity, lootTables, milestones, deeds, shop, salePrices, storageSites,
    storyQuests, recruitmentQuests, companionAttitudes, recipes, battleRewards, enemyGroups, companions, loyalties, factions, factionEffects, relationshipEffects,
    scenes, creatures, fights, destinations, routes, travelScenes, bagUpgrades, edgeType, encounterTables, encounterPools,
    quietTexts, rumorTexts };
})();
