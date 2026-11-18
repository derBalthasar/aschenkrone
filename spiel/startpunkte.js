"use strict";

// Die Nacht des Erwachens (Herbst 612 n. E.). Henrys Dokument „Prologe und Questreihen“ vom 17. 11. 2026,
// vollständig in lore/NACHT-DES-ERWACHENS.md. Alle 15 Fraktionen erleben dieselbe Nacht in ihrem eigenen Gebiet.
// Jeder Prolog hat drei Kapitel: 1. Heimat und Bewegung, 2. Kampf und Klassenfähigkeit, 3. Ressource und erste
// Entscheidung. Er endet mit einem Angriff, der den Helden aus seiner Heimat treibt, und mit dem Morgengrauen an
// einem Zufluchtsort mit Zentrallager. Entscheidungen werden als Marken „nacht-…“ gespeichert, damit spätere Akte
// und die Kreuzungen zwischen den Reihen sie aufgreifen können. Bis die Akte spielbar sind, führt der Weg danach
// in den bestehenden Abschnitt bei Kornwik. Die Bilder unter spiel/prolog/start/ sind Ausschnitte der
// verbindlichen Karte mit markiertem Startort.
const startpunkte = (() => {
  const kontinente = {
    menschen: "Land der Menschen", untote: "Land der Untoten", elfen: "Land der Elfen",
    orks: "Land der Orks", zwerge: "Land der Zwerge",
  };
  const pick = (label, mark, message, extra = {}) => ({ label, mark, message, ...extra });

  const fraktionen = {
    // ---------------------------------------------------------------- Menschen
    kronreich: {
      ort: "Westvik", volk: "menschen", prolog: "Feuer über Westvik", motto: "Eine Krone, ein Volk",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht bricht im Süden ein Berg auf, und überall auf Odris erwacht Glut. Im Kronreich feiert man noch die Ernte."],
        ["Erntefest", "Westvik an der Westmark", "Das Hafendorf Westvik feiert in der Methalle. Die Landwehr des Jarls hat Wache am Kornspeicher, die Boote liegen sicher im Hafen."],
        ["Abend", "%NAME% aus Westvik", "Du bist %NAME%, in Westvik geboren und Landwehr des Jarls. Seit dem Abend kribbelt etwas Warmes in deiner Hand, als hätte sie zu lange am Feuer gelegen."],
      ],
      heim: {
        place: "Westvik · Methalle", title: "Erntefest in der Methalle",
        text: "Die Methalle ist voll. Zwischen Hof, Hafen und Kornspeicher laufen Kinder mit Fackeln. Der Skalde des Dorfs sitzt am Feuer und wartet auf jemanden, der ihm zuhört.",
        erkunden: [
          ["Dem Skalden vom Roten Sommer 588 zuhören", "nacht-kronreich-skalde", "Der Skalde erzählt vom Roten Sommer 588, als die Rostsegel zuletzt an der Westmark landeten. „Sie kommen wieder, wenn das Korn reif ist“, sagt er."],
          ["Am Hafen nach den Booten sehen", "nacht-kronreich-hafen", "Die Boote liegen fest vertäut. Draußen auf der Westsee siehst du kein Licht, nur den Nebel über dem Wasser."],
        ],
        weiter: "Deine Wache am Kornspeicher antreten",
      },
      kampf: {
        place: "Westvik · Kornspeicher", title: "Die Vorhut der Rostsegel", label: "Den Kornspeicher verteidigen · Kampf",
        text: "Mitten in der Nacht laufen Boote ohne Licht auf den Strand. Ork-Krieger der Rostsegel springen ins flache Wasser und laufen auf den Kornspeicher zu. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Vorhut der Rostsegel", [22, 6, 1, 5], "Enterbeil", "Der Ork hebt sein Enterbeil zum Wurf.", 2],
        sieg: "Die Vorhut weicht zu den Booten zurück. Der Kornspeicher steht noch.", loot: ["harzverband"],
      },
      wahl: {
        place: "Westvik · Kornspeicher", title: "Korn als Tribut",
        text: "Der Dorfvorsteher zieht dich hinter den Speicher. Andere Jarle der Westmark geben den Orks heimlich Korn, sagt er, dann ziehen sie weiter. Er will es genauso machen. Weniger Tote, aber Verrat am König.",
        a: pick("Dem Tribut zustimmen", "nacht-kronreich-tribut", "Du hilfst, die Kornsäcke zum Strand zu tragen. Niemand im Dorf soll davon erfahren."),
        b: pick("Den Tribut verweigern", "nacht-kronreich-verweigert", "Du stellst dich vor das Tor des Speichers. Das Korn des Königs geht an niemanden."),
      },
      angriff: {
        place: "Westvik · Hafen", title: "Der Hafen brennt", label: "Mit den Überlebenden nach Kronhall fliehen",
        text: "Die Rostsegel kommen mit allen Booten zurück und werfen Feuer in den Hafen. Die Methalle brennt. Du sammelst die Überlebenden und führst sie über die Felder nach Osten.",
        message: "Ihr erreicht Kronhall im Morgengrauen.",
      },
      morgen: {
        place: "Kronhall · Burgtor", title: "Morgengrauen über Kronhall",
        text: "Am Tor von Kronhall erfährst du, dass König Harald IV. im Morgengrauen zusammengebrochen ist. In den Gassen flüstert man, ein Fremder habe ihm vom ewigen Leben erzählt. Im Süden steigt Rauch über der Westmark auf, und vom Eispass treibt graue Asche über das Land.",
      },
      // Akt 2 und 3 in freier Reihenfolge (Gemini-Aufbau, Entscheidung Henry 18. 11. 2026, lore/quests/KRONREICH.md).
      akte: ["Der Thron wankt", "Die abtrünnigen Häfen", "Der Schwur am Glutberg", "Das Alte Reich ersteht neu", "Über das Innere Meer"],
    },
    haefen: {
      ort: "Perlvik", volk: "menschen", prolog: "Fracht aus dem Norden", motto: "Jedes Meer ist ein Weg",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht bricht im Süden ein Berg auf, und überall auf Odris erwacht Glut. In Perlvik läuft am Abend ein Schiff aus dem Norden ein."],
        ["Abend", "Perlvik bei Nacht", "Der Leuchtturm wirft sein Licht über das Wasser. In der Börse wird noch gehandelt, und im Hafenviertel trinken Zwerge und Elfen am selben Tisch."],
        ["Abend", "%NAME% von der Stillen Feder", "Du bist %NAME%, Seesoldat der Bundesflotte und Agent der Stillen Feder. Heute erhältst du deinen ersten Auftrag für die Gilde. Seit dem Abend glimmt Wärme in deiner Hand."],
      ],
      heim: {
        place: "Perlvik · Hafenviertel", title: "Perlvik bei Nacht",
        text: "Am Kai warten Schauerleute auf die Flut. Eine Schreiberin der Gilde hat dir einen Zettel zugesteckt: Ein Schmugglerschiff aus dem Norden sei eingelaufen. Du sollst es durchsuchen, bevor der Reeder Wind davon bekommt.",
        erkunden: [
          ["Zum Leuchtturm hinaufsteigen", "nacht-haefen-leuchtturm", "Vom Leuchtturm siehst du das Schiff am Außenkai. Es liegt tief im Wasser, und niemand ist an Deck."],
          ["In der Börse nach dem Reeder fragen", "nacht-haefen-boerse", "Ein Händler nennt dir den Namen des Reeders und lacht. „Der zahlt jedem, der nicht zu genau hinsieht.“"],
        ],
        weiter: "Zum Schmugglerschiff gehen",
      },
      kampf: {
        place: "Perlvik · Außenkai", title: "Fracht aus dem Norden", label: "Das Schiff durchsuchen · Kampf",
        text: "Kaum betrittst du das Deck, ziehen die Seeleute ihre Messer. Hinter ihnen steht die Luke zum Laderaum offen. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Schmuggler aus dem Norden", [22, 6, 1, 6], "Messerstich", "Ein Schmuggler duckt sich unter deinem Arm hindurch.", 2, "bleeds"],
        sieg: "Die Schmuggler geben auf. Im Laderaum liegen Aethari-Schriften und gefesselte Elfenhändler.", loot: ["harzverband"],
      },
      wahl: {
        place: "Perlvik · Laderaum", title: "Gold vom Reeder",
        text: "Du befreist die Elfenhändler. Da steht der Reeder auf der Planke und hält dir einen Beutel hin. Wenn du schweigst, gehört das Gold dir, und die Schriften bleiben an Bord.",
        a: pick("Das Gold nehmen", "nacht-haefen-gold", "Du nimmst den Beutel. Die Spur zu den Schriften wird sich verlieren.", { loot: "reedergold" }),
        b: pick("Alles der Stillen Feder melden", "nacht-haefen-gemeldet", "Du lässt das Schiff versiegeln und schickst einen Boten zur Stillen Feder."),
      },
      angriff: {
        place: "Perlvik · Gildenhaus", title: "Feuer im Gildenhaus", label: "Mit den befreiten Elfen auf die Zollinseln fliehen",
        text: "Die Fracht wird ins Gildenhaus gebracht. Kurz nach Mitternacht schlagen dort Flammen aus den Fenstern. Eine Kultzelle hat Feuer gelegt. Ein Kultist stirbt in den Flammen, die Schriften verschwinden. Die Elfenhändler drängen zum Hafen.",
        message: "Ein Küstensegler bringt euch noch in der Nacht nach Zollholm.",
      },
      morgen: {
        place: "Zollholm · Zollinseln", title: "Morgengrauen auf den Zollinseln",
        text: "Im ersten Licht siehst du Perlvik über dem Wasser rauchen. Die Elfenhändler bedanken sich leise. Die Gilde wird wissen wollen, wer das Gildenhaus angezündet hat und wohin die Schriften gebracht wurden.",
      },
      akte: ["Die Zollinseln", "Gold und Eisen", "Der Handel mit den Grünen Bannern", "Die Kronschuld", "Die Flotte gen Norden"],
    },
    orden: {
      ort: "Aschenkloster", volk: "menschen", prolog: "Die Nacht der kalten Feuer", motto: "Solange die Flamme brennt",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht bricht im Süden ein Berg auf, und überall auf Odris erwacht Glut. Am Glutberg wird die Ewige Flamme schwächer."],
        ["Abend", "Das Hochtal der Novizen", "Im Hochtal unter Glutberg läuten die Glocken des Aschenklosters. Zwischen den Runensteinen beten die Novizen vor der Ewigen Flamme."],
        ["Abend", "Novize %NAME%", "Du bist %NAME% und hast heute deine Gelübde abgelegt. Als du die Hand über die Flamme hältst, brennt sie nicht. Die Glut ist in dir."],
      ],
      heim: {
        place: "Aschenkloster · Runenhof", title: "Gebet vor der Flamme",
        text: "Nach dem Gelübde gehen die Novizen schweigend zwischen den Runensteinen. Seherin Freydis sitzt vor dem Feuer und starrt hinein.",
        erkunden: [
          ["Seherin Freydis ansprechen", "nacht-orden-freydis", "Freydis sieht dich nicht an. „Im Feuer ist ein schwarzes Herz“, flüstert sie. „Es schlägt heute Nacht zum ersten Mal.“"],
          ["Die Runensteine am Glutberg abschreiten", "nacht-orden-runen", "Die Runen glühen schwächer als sonst. Ein älterer Bruder sagt, so sei es seit dem Abend."],
        ],
        weiter: "Zur Nachtwache in den Kreuzgang gehen",
      },
      kampf: {
        place: "Aschenkloster · Kreuzgang", title: "Ein Bruder steht wieder auf", label: "Den Draugr verbrennen · Kampf",
        text: "Im Kreuzgang liegt ein gefallener Ordensbruder aufgebahrt. Als die Glocke Mitternacht schlägt, setzt er sich auf. Seine Augen sind bleich wie Eis. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Draugr im Kreuzgang", [24, 6, 2, 3], "Eiskalter Griff", "Der Draugr greift nach deiner Kehle.", 2, "stuns"],
        sieg: "Der Draugr zerfällt zu Asche. Unter seinem Gewand trägt er das Zeichen des Kults der Bleichen Ewigkeit.", loot: ["glutampulle"],
      },
      wahl: {
        place: "Nordwacht · Wachturm", title: "Die kalten Feuer",
        text: "Von der Nordwacht kommen Boten: Die Wachfeuer erlöschen eins nach dem anderen. Vor der Küste liegt ein einzelnes Geisterschiff im Nebel. Kultisten haben die Feuer gelöscht und fliehen in die Klippen.",
        a: pick("Das Wachfeuer mit eigenem Glauben entzünden · 1 Glut", "nacht-orden-feuer", "Du legst die Hand in die kalte Asche. Das Wachfeuer flammt wieder auf, und das Geisterschiff weicht zurück in den Nebel.", { emberCost: 1, spend: true }),
        b: pick("Die Kultisten in die Klippen verfolgen", "nacht-orden-jagd", "Du holst einen der Kultisten ein. Er lacht nur und ruft, die Flamme sei schon so gut wie erloschen."),
      },
      angriff: {
        place: "Nordwacht · Wachturm", title: "Sturm auf den Wachturm", label: "Dich zum Glutberg durchschlagen",
        text: "Aus dem Nebel kommen weitere Kultisten und stürmen den Wachturm. Die Wachen fallen zurück. Du hältst die Treppe, bis die letzten draußen sind, dann läufst du den Pfad hinauf zum Glutberg.",
        message: "Im Morgengrauen erreichst du die Halle der Ewigen Flamme.",
      },
      morgen: {
        place: "Glutberg · Halle der Ewigen Flamme", title: "Die Flamme flackert",
        text: "Die Ewige Flamme ist fast erloschen. Nur ein kleiner blauer Rest brennt noch auf dem Altar. Die Ritter stehen stumm davor. Niemand weiß, wie lange sie noch hält.",
      },
      akte: ["Die flackernde Flamme", "Korn über den Eispass", "Schiffe für den Kreuzzug", "Verräter im Feuer & Das Alte Reich", "Über das Nordmeer"],
    },
    // ---------------------------------------------------------------- Elfen
    dornenklingen: {
      ort: "Hochdorn", volk: "elfen", prolog: "Segel im Nordmeer", motto: "Der Dorn schützt die Blüte",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht bricht im Süden ein Berg auf, und am Weltenbaum glüht der Aschenast wie Feuer. Am Nordkap treiben Segel heran."],
        ["Abend", "Hochdorn und die Dornhaine", "Hochdorn liegt hoch über dem Nordkap. Zwischen den Dornhainen üben die jungen Krieger der Dornenwacht mit Speer und Feuer."],
        ["Abend", "%NAME% von der Dornenwacht", "Du bist %NAME%, junger Krieger der Dornenwacht. Du reitest unter Sylmar Windläufer. Seit dem Abend wärmt dich eine Glut, die nicht vom Feuer kommt."],
      ],
      heim: {
        place: "Hochdorn · Dornhaine", title: "Ritt an die Küste",
        text: "Sylmar Windläufer lässt die Sturmhirsche satteln. Ein Späher hat Segel im Nordmeer gesehen. Bevor ihr reitet, bleibt noch ein Augenblick.",
        erkunden: [
          ["Mit Sylmar die Küste auf der Karte ansehen", "nacht-dorn-sylmar", "Sylmar zeigt auf die verbrannte Küste. „Dort haben wir die Fäulnis zuletzt zurückgebrannt. Sie kommt immer an denselben Stellen.“"],
          ["Deinen Sturmhirsch selbst satteln", "nacht-dorn-hirsch", "Der Hirsch scharrt unruhig. Er wittert etwas aus dem Norden, das ihm Angst macht."],
        ],
        weiter: "Zum Nordkap reiten",
      },
      kampf: {
        place: "Nordkap · Verbrannte Küste", title: "Drei faulende Schiffe", label: "Die Gelandeten zurückschlagen · Kampf",
        text: "Drei Schiffe laufen auf den Strand. Aus ihren Rümpfen steigen verwesende Kultisten mit Sporen im Haar. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Verwesende Kultisten", [22, 6, 1, 4], "Sporenwolke", "Ein Kultist reißt seinen faulen Mantel auf.", 2, "bleeds"],
        sieg: "Die Kultisten fallen. Im Laderaum des ersten Schiffs findest du einen gefangenen Seemann aus Perlvik.", loot: ["harzverband"],
      },
      wahl: {
        place: "Nordkap · Strand", title: "Feuer oder Leben",
        text: "Orwen der Jüngere will die Küste sofort niederbrennen, mit den Schiffen, den Toten und allem, was noch darin ist. In den anderen Rümpfen rufen Stimmen um Hilfe, Elfen und Menschen.",
        a: pick("Die Küste niederbrennen", "nacht-dorn-brand", "Das Feuer frisst die Schiffe und die Sporen. Die Fäulnis ist gestoppt, aber die Stimmen verstummen."),
        b: pick("Erst die Lebenden retten", "nacht-dorn-gerettet", "Du ziehst die Gefangenen aus den Rümpfen, auch den Seemann aus Perlvik. Die Fäulnis frisst sich weiter ins Land."),
      },
      angriff: {
        place: "Nordkap · Strand", title: "Die Gefallenen stehen auf", label: "Dich nach Hochdorn zurückziehen",
        text: "Im verseuchten Sand rühren sich die Gefallenen. Dornenklingen, die eben noch neben dir kämpften, stehen als Gebundene auf. Sylmar gibt das Zeichen zum Rückzug.",
        message: "Im Morgengrauen erreicht ihr Hochdorn.",
      },
      morgen: {
        place: "Hochdorn · Wachhalle", title: "Morgengrauen in Hochdorn",
        text: "In der Wachhalle zählt Sylmar die Lebenden. Orwen schweigt. Im Süden glüht der Himmel über dem Weltenbaum, und niemand kann sagen, warum.",
      },
      akte: ["Das Nordkap", "Der Dornwall", "Klinge und Flamme", "Orwens Fahrt", "Am Weltenbaum"],
    },
    schattenbluete: {
      ort: "Velasyr", volk: "elfen", prolog: "Die Nacht der offenen Kelche", motto: "Im Schatten blüht",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht bricht im Süden ein Berg auf, und am Weltenbaum glüht der Aschenast wie Feuer. Im Schwarzen Garten öffnen sich alle Blüten."],
        ["Abend", "Velasyr auf Stelzen", "Velasyr steht auf Stelzen über den Kanälen. Laternen spiegeln sich im schwarzen Wasser, und Boote gleiten zu den Nebelmarschen hinaus."],
        ["Abend", "Gartenwächter %NAME%", "Du bist %NAME%, Gartenwächter im Schwarzen Garten und ein Freund von Iselde. Seit dem Abend glimmt Wärme in deiner Hand."],
      ],
      heim: {
        place: "Velasyr · Kanäle", title: "Laternen über dem Wasser",
        text: "Iselde wartet am Steg auf dich. Heute Nacht soll es im Garten ruhig bleiben, sagt sie, aber sie sieht unruhig aus.",
        erkunden: [
          ["Mit Iselde durch die Kanäle fahren", "nacht-schatten-iselde", "Iselde erzählt, dass die Blüten seit Tagen anders duften. „Als hätten sie Durst“, sagt sie."],
          ["Den Weg durch die Nebelmarschen nehmen", "nacht-schatten-marsch", "Zwischen den Schilfinseln siehst du frische Spuren. Jemand ist vor dir durch die Marsch gegangen."],
        ],
        weiter: "Zum Schwarzen Garten gehen",
      },
      kampf: {
        place: "Schwarzer Garten", title: "Die offenen Kelche", label: "Die Späher stellen · Kampf",
        text: "Um Mitternacht öffnen sich alle schwarzen Blüten zugleich. In ihrem Licht siehst du Gestalten zwischen den Beeten, Späher der Hüter. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Späher der Hüter", [20, 6, 1, 7], "Pfeil aus dem Schatten", "Ein Späher spannt seinen Bogen hinter einer Blüte.", 2],
        sieg: "Die Späher fliehen in die Marsch und lassen ihre Bögen zurück.", loot: ["harzverband"],
      },
      wahl: {
        place: "Schwarzer Garten · Erntebeete", title: "Nektar einer Nacht",
        text: "Die Kelche geben in dieser Nacht so viel Nektar wie sonst in einem Jahr. Iselde zeigt dir eine Wurzel unter den Beeten, die nach Norden führt, zum Weltenbaum.",
        a: pick("Alles ernten", "nacht-schatten-ernte", "Ihr füllt jedes Gefäß. Im Norden welkt der Baum weiter.", { item: "glutampulle" }),
        b: pick("Die Hälfte stehen lassen und über die Wurzel schweigen", "nacht-schatten-schweigen", "Du lässt die halbe Ernte stehen. Iselde sieht dich lange an und sagt nichts."),
      },
      angriff: {
        place: "Schwarzer Garten", title: "Feuer im Garten", label: "Mit Iselde nach Velasyr fliehen",
        text: "Hainwächter, die Waldhauptmann Varyn in die Marschen geschickt hat, überschreiten ihre Befehle. Sie zünden einen Teil des Gartens an. Der Rauch der Blüten ist süß und schwer.",
        message: "Ihr erreicht Velasyr, als die Laternen erlöschen.",
      },
      morgen: {
        place: "Velasyr · Steg der Erntemeister", title: "Morgengrauen in Velasyr",
        text: "Vom Steg aus siehst du den Rauch über dem Garten. Iselde hält ein Stück der Wurzel in der Hand. Sie will wissen, was der Nektar wirklich ist.",
      },
      akte: ["Der Schwarze Garten", "Schleier über Perlvik", "Die bittere Wahrheit", "Die Rückkehr der Verbannten", "Am Weltenbaum"],
    },
    hueter: {
      ort: "Ylvenor", volk: "elfen", prolog: "Der brennende Ast", motto: "Die Wurzel vergisst nicht",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht bricht im Süden ein Berg auf. Am Weltenbaum glüht der Aschenast, der seit dem Aschenwinter tot ist, zum ersten Mal wie offenes Feuer."],
        ["Abend", "Ylvenor im Geäst", "Hängebrücken verbinden die Hallen im Geäst des Weltenbaums. Tief unten liegen die Wurzelhalle und der Laubmarkt."],
        ["Abend", "%NAME%, Schüler der Baumsängerin", "Du bist %NAME%, Schüler der Baumsängerin Ilvara Aschenblatt. Seit dem Abend hörst du den Baum lauter als sonst, und in deiner Hand glimmt Glut."],
      ],
      heim: {
        place: "Ylvenor · Hängebrücken", title: "Im Geäst",
        text: "Ilvara hat dich zur Abendstunde gerufen, doch sie ist noch im Rat. Über die Hängebrücken gehen Hüter mit Laternen zur Wurzelhalle.",
        erkunden: [
          ["Zur Wurzelhalle hinabsteigen", "nacht-hueter-halle", "In der Wurzelhalle streiten Stimmen. Wurzelsprecher Caelorin sagt laut, manche Dinge gehörten nicht vor den Rat."],
          ["Über den Laubmarkt gehen", "nacht-hueter-markt", "Händler von außerhalb packen früh zusammen. Einer sagt, im Süden habe der Boden gebebt."],
        ],
        weiter: "Zum Aschenast hinaufsteigen",
      },
      kampf: {
        place: "Ylvenor · Unter dem Aschenast", title: "Der brennende Ast", label: "Mit Varyn die Späher stellen · Kampf",
        text: "Um Mitternacht glüht der Aschenast wie offenes Feuer. Glut tropft auf den Waldboden. In der Unruhe schleichen Späher der Schattenblüte durch den Wald. Waldhauptmann Varyn ruft dich an seine Seite. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Späher der Schattenblüte", [20, 6, 1, 7], "Giftdorn", "Ein Späher zieht einen schwarzen Dorn aus dem Ärmel.", 2, "bleeds"],
        sieg: "Die Späher fliehen. Varyn schwört, ihnen bis in die Marschen zu folgen.", loot: ["harzverband"],
      },
      wahl: {
        place: "Ylvenor · Aschenast", title: "Saft des Weltenbaums",
        text: "Die Welke steigt, und der Baum verliert Saft. Ilvara steht neben dir. Sie will dem Rat endlich vom Aschenpakt erzählen, doch Caelorin hat es verboten.",
        a: pick("Die Glut mit Weltensaft löschen · 1 Glut", "nacht-hueter-geloescht", "Du gießt den Saft auf die tropfende Glut. Sie zischt und erlischt. Der Baum hat Saft verloren, aber er brennt nicht.", { emberCost: 1, spend: true }),
        b: pick("Die Glut brennen lassen und Ilvara folgen", "nacht-hueter-ilvara", "Du folgst Ilvara durch das Geäst. Sie sagt, die Glut sei eine Antwort, kein Feuer."),
      },
      angriff: {
        place: "Ylvenor · Waldboden", title: "Waldbrand unter dem Ast", label: "Mit Ilvara heimlich den Wald verlassen",
        text: "Unter dem Aschenast fängt der Wald Feuer. Ylvenor flieht in die Wurzelhalle. Ilvara nimmt dich am Arm und führt dich einen anderen Weg hinaus.",
        message: "Im Morgengrauen steht ihr am Rand des alten Waldes.",
      },
      morgen: {
        place: "Waldrand · Alter Wald", title: "Morgengrauen am Waldrand",
        text: "Hinter euch steigt Rauch aus dem Geäst. Ilvara erzählt dir zum ersten Mal vom Aschenpakt, einem alten Versprechen zwischen Elfen und Orks. Der Baum hat es nicht vergessen.",
      },
      akte: ["Der glühende Ast", "Die Aschenschuld", "Die alte Kränkung", "Die verlorenen Zweige", "Am Weltenbaum"],
    },
    // ---------------------------------------------------------------- Zwerge
    "tiefes-koenigreich": {
      ort: "Ambossheim", volk: "zwerge", prolog: "Zoll in der Bebennacht", motto: "Was der Stein hält",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht brechen die Tiefgräber im Tiefen Stollen in das Herz des Berges durch. Das Beben ist bis über die Meerenge zu spüren."],
        ["Abend", "Ambossheim", "In der Halle der Steinahnen brennen die Lampen der Sieben Häuser. Von hier führt die Pass-Straße zur Festung am Zollpass."],
        ["Abend", "%NAME% von der Eisenwacht", "Du bist %NAME% und dienst in der Eisenwacht am Zollpass unter Schildherr Hagen Felswall. Seit dem Abend ist deine Hand warm wie frisch geschmiedetes Eisen."],
      ],
      heim: {
        place: "Ambossheim · Halle der Steinahnen", title: "Die Halle der Steinahnen",
        text: "Vor deiner Wache gehst du noch einmal durch die Halle der Steinahnen. Dann wartet die lange Pass-Straße zum Zollpass.",
        erkunden: [
          ["Vor den Steinahnen deines Hauses verweilen", "nacht-reich-ahnen", "Die Gesichter der Ahnen sind in den Fels gehauen. Ein Wächter sagt, die Steine hätten heute zweimal gezittert."],
          ["Bei der Königsbank vorbeigehen", "nacht-reich-bank", "Ein Bote von Schatzmeister Dankwart Goldzunge eilt mit einem leeren Beutel Richtung Zollpass."],
        ],
        weiter: "Über die Pass-Straße zur Zollfestung gehen",
      },
      kampf: {
        place: "Zollburg · Pass-Straße", title: "Ein Erzzug ohne Siegel", label: "Die Schmuggler stellen · Kampf",
        text: "Ein Erzzug der Tiefgräber will den Zoll umgehen. Die Fuhrleute ziehen Spitzhacken, als du die Karren anhältst. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Erzschmuggler der Tiefgräber", [24, 6, 2, 3], "Spitzhackenhieb", "Ein Schmuggler holt mit der Spitzhacke weit aus.", 3, "stuns"],
        sieg: "Die Schmuggler ergeben sich. Um Mitternacht bebt der Pass unter euren Füßen.", loot: ["harzverband"],
      },
      wahl: {
        place: "Zollburg · Wägekammer", title: "Tiefenglut auf den Karren",
        text: "Unter dem Erz liegt Tiefenglut, die in der Dunkelheit leuchtet. Der Bote von Dankwart Goldzunge steht plötzlich neben dir und bietet an, sie heimlich zu kaufen.",
        a: pick("Die Tiefenglut für die Krone beschlagnahmen", "nacht-reich-beschlagnahmt", "Du versiegelst die Karren im Namen der Krone. Der Hort wächst, und mit ihm das Erzfieber."),
        b: pick("Den Handel zulassen und dir den Namen merken", "nacht-reich-dankwart", "Du siehst weg. Der Bote zahlt und verschwindet. Den Namen Dankwart Goldzunge vergisst du nicht.", { loot: "zollgold" }),
      },
      angriff: {
        place: "Zollburg · Festungsmauer", title: "Die Mauer bricht", label: "Die Nachricht nach Ambossheim bringen",
        text: "Ein zweites Beben reißt eine Mauer der Zollfestung ein. Durch die Lücke stürmen Tiefgräber und holen sich ihre Karren zurück. Hagen Felswall schickt dich los.",
        message: "Im Morgengrauen erreichst du das Tor von Ambossheim.",
      },
      morgen: {
        place: "Ambossheim · Tor der Sieben Häuser", title: "Morgengrauen in Ambossheim",
        text: "Am Tor drängen sich die Boten aus allen Richtungen. Der Zollpass ist offen, die Tiefgräber halten ihr Erz. Im Rat der Sieben Häuser fällt zum ersten Mal das Wort Eidbruch.",
      },
      akte: ["Der Zollpass", "Gold für die Häfen", "Der Runenstreit", "Die Eidbrecher", "Der Schwur am Amboss"],
    },
    tiefgraeber: {
      ort: "Kluftheim", volk: "zwerge", prolog: "Das Herz bricht auf", motto: "Tiefer, immer tiefer",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht bricht Obersteigerin Kuni Lampenlicht im Tiefen Stollen in das Herz des Berges durch. Was danach geschieht, spürt ganz Odris."],
        ["Abend", "Kluftheim", "In Kluftheim rattern die Aufzüge, und die Schmelzhütten glühen. Von hier fahren die Trupps durch den Stollenmund unter die Meerenge."],
        ["Abend", "%NAME% aus Kunis Trupp", "Du bist %NAME% und arbeitest im Trupp von Kuni Lampenlicht am vordersten Ort des Tiefen Stollens. Seit dem Abend leuchtet deine Hand wie das Erz vor Ort."],
      ],
      heim: {
        place: "Kluftheim · Schmelzhütten", title: "Schichtbeginn in Kluftheim",
        text: "Kuni ruft den Trupp zusammen. Heute Nacht will sie den letzten Fels vor Ort durchschlagen. Bis zur Einfahrt bleibt noch Zeit.",
        erkunden: [
          ["Erzspürer Alberich nach dem Fels fragen", "nacht-graeber-alberich", "Alberich legt die Hand an die Stollenwand. „Dahinter ist es hohl“, sagt er. „Und warm.“"],
          ["Mit dem Aufzug zum Stollenmund fahren", "nacht-graeber-aufzug", "Aus dem Stollenmund weht warmer Wind, der nach Schwefel riecht. Die Lampen flackern."],
        ],
        weiter: "Mit dem Trupp unter die Meerenge einfahren",
      },
      kampf: {
        place: "Tiefer Stollen · Vor Ort", title: "Die Halle der Tiefenglut", label: "Die Schatten abwehren · Kampf",
        text: "Kuni schlägt durch. Dahinter liegt eine Halle aus glühendem Erz, größer als Ambossheim. Aus der Glut lösen sich Schatten mit Hauern und Narben. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Schatten aus der Tiefenglut", [22, 6, 1, 5], "Glutklaue", "Ein Schatten zieht sich zu einem glühenden Umriss zusammen.", 2],
        sieg: "Die Schatten sinken in die Glut zurück. Alberich hat sie in einer fremden Sprache rufen hören.", loot: ["glutampulle"],
      },
      wahl: {
        place: "Tiefer Stollen · Seitenstollen", title: "Erz oder Gefährten",
        text: "Der Berg bebt. Ein Seitenstollen stürzt ein und schneidet einen zweiten Trupp ab. Durch das Geröll hörst du sie klopfen. Neben dir liegt die Tiefenglut, so viel, wie ein Haus in zehn Jahren nicht fördert.",
        a: pick("Tiefenglut hinaustragen", "nacht-graeber-erz", "Du trägst so viel Tiefenglut, wie du schleppen kannst. Das Klopfen hinter dem Geröll wird leiser.", { loot: "tiefenglut" }),
        b: pick("Nach dem abgeschnittenen Trupp graben", "nacht-graeber-gegraben", "Du gräbst, bis deine Hände bluten. Ein Spalt öffnet sich, und du hörst Stimmen, doch dahinter ist nur Dunkelheit."),
      },
      angriff: {
        place: "Tiefer Stollen", title: "Glühendes Gestein", label: "Zum Stollenmund fliehen",
        text: "Glühendes Gestein flutet den vorderen Stollen. Kuni ruft alle zurück. Der abgeschnittene Trupp antwortet nicht mehr.",
        message: "Im Morgengrauen erreicht ihr den Stollenmund.",
      },
      morgen: {
        place: "Stollenmund · Festung", title: "Morgengrauen am Stollenmund",
        text: "Der Trupp zählt sich. Es fehlen zu viele. Kuni starrt in den Stollen zurück. Alberich murmelt die fremden Worte, die er in der Glut gehört hat. Der verschollene Trupp gilt als tot.",
      },
      akte: ["Erzhafen halten", "Das Klopfen im Fels", "Das Grabrecht", "Das Herz des Berges", "Der Schwur am Amboss"],
    },
    runenschmiede: {
      ort: "Essenfels", volk: "zwerge", prolog: "Die schreiende Rune", motto: "Die Rune vergisst nicht",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht brechen die Tiefgräber im Tiefen Stollen in das Herz des Berges durch. In Essenfels beginnt eine Rune zu schreien."],
        ["Abend", "Essenfels", "In Essenfels brennen hundert Essen. Im Vorhof der Runenhalle prüfen die Meister jede Klinge, bevor sie am Nordtor nach Norden geht."],
        ["Abend", "Geselle %NAME%", "Du bist %NAME%, Geselle in Essenfels. Mit Gesellin Gunda arbeitest du für Runenmeister Ortwin Siebenhammer. Seit dem Abend glühen die Runen, wenn du sie berührst."],
      ],
      heim: {
        place: "Essenfels · Vorhof der Runenhalle", title: "Hundert Essen",
        text: "Gunda wartet mit einer Kiste Klingen für das Nordtor. Ortwin arbeitet in der Werkstatt an seiner Rune aus Tiefenglut und lässt niemanden hinein.",
        erkunden: [
          ["Gunda beim Verladen helfen", "nacht-rune-gunda", "Gunda erzählt, dass Ortwin seit Tagen kaum schläft. „Er sagt, die Rune singt.“"],
          ["Durch die Tür zu Ortwins Werkstatt sehen", "nacht-rune-ortwin", "Ortwin beugt sich über eine Rune, die rot glimmt wie ein Herz. Er murmelt Worte, die du nicht kennst."],
        ],
        weiter: "Mit der Kiste zum Nordtor gehen",
      },
      kampf: {
        place: "Nordtor · Kai", title: "Nektar unter Pulverfässern", label: "Die Schmuggler stellen · Kampf",
        text: "Am Nordtor wird ein Schmugglerboot aus Velasyr gestellt. Unter den Pulverfässern liegt Nektar der Schattenblüte. Die Schmuggler greifen an. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Schmuggler aus Velasyr", [20, 6, 1, 7], "Giftklinge", "Eine Schmugglerin zieht eine schwarz glänzende Klinge.", 2, "bleeds"],
        sieg: "Die Schmuggler werden gefesselt. Der Nektar geht an die Gilde.", loot: ["harzverband"],
      },
      wahl: {
        place: "Essenfels · Runenwerkstatt", title: "Die schreiende Rune",
        text: "Um Mitternacht schreit Ortwins Rune aus Tiefenglut. Sie ruft Namen in Ghrash, der Sprache der Orks, und alle Runen in der Werkstatt glühen auf. Ortwin braucht Runen, um die Werkstatt zu bannen.",
        a: pick("Ortwin deine Runen geben · 1 Glut", "nacht-rune-gebannt", "Du legst deine Runen in den Bannkreis. Die Werkstatt wird still, die Rune flüstert nur noch.", { emberCost: 1, spend: true }),
        b: pick("Die Namen aufschreiben, die die Rune ruft", "nacht-rune-namen", "Du schreibst mit, so schnell du kannst. Sieben Namen in Ghrash stehen auf dem Blatt."),
      },
      angriff: {
        place: "Funkeninsel · Pulverlager", title: "Die Funkeninsel brennt", label: "Wolfram retten und nach Essenfels zurückkehren",
        text: "Auf der Funkeninsel zünden die glühenden Runen das Pulverlager. Die Explosion ist bis Essenfels zu hören. Du fährst mit dem ersten Boot hinüber und ziehst Wolfram den Pulvermacher aus den Trümmern.",
        message: "Im Morgengrauen bringst du Wolfram nach Essenfels.",
      },
      morgen: {
        place: "Essenfels · Runenhalle", title: "Morgengrauen in Essenfels",
        text: "Wolfram lebt. Ortwin sitzt vor seiner Rune und hört ihr zu. Die Gilde will wissen, wer die Namen gerufen hat und warum eine Rune aus Tiefenglut Ghrash spricht.",
      },
      akte: ["Die Funkeninsel", "Klingen für die Flamme", "Ortwins Flüstern", "Die freie Gilde", "Der Schwur am Amboss"],
    },
    // ---------------------------------------------------------------- Orks
    "gruene-banner": {
      ort: "Kragmar", volk: "orks", prolog: "Die Erde brüllt", motto: "Wo Gras wächst",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht bebt der Mutterberg so stark wie seit dem Aschenwinter nicht. Bis in den Süden brüllt die Erde."],
        ["Abend", "Kragmar und der Bannerhügel", "Auf dem Bannerhügel von Kragmar wehen die grünen Banner der Clans. Darunter ziehen die Herden über die Weiten."],
        ["Abend", "Büffelhirte %NAME%", "Du bist %NAME%, Büffelhirte einer Sippe in den Weiten und Lehrling von Oghul dem Alten. Seit dem Abend ist deine Hand warm wie ein Stein in der Sonne."],
      ],
      heim: {
        place: "Kragmar · Bannerhügel", title: "Ritt über die Weiten",
        text: "Oghul der Alte will die Herde noch vor der Nacht an die Grenzwälle bringen. Vom Bannerhügel siehst du über die Weiten bis zum Rauch des Berges.",
        erkunden: [
          ["Oghul nach dem Rauch fragen", "nacht-banner-oghul", "Oghul kneift die Augen zusammen. „Die Mutter ist unruhig“, sagt er. „Das war sie lange nicht.“"],
          ["Die Herde selbst zusammentreiben", "nacht-banner-herde", "Die Büffel drängen sich eng zusammen. Sie wollen nicht nach Norden schauen."],
        ],
        weiter: "Die Herde an die Grenzwälle bringen",
      },
      kampf: {
        place: "Weiten · Grenzwall", title: "Die Erde brüllt", label: "Die Herde gegen die Staubreiter halten · Kampf",
        text: "Um Mitternacht bebt die Erde bis in den Süden. Die Herde gerät in Panik. Staubreiter nutzen das Chaos und brechen über den Wall. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Staubreiter-Plünderer", [22, 6, 1, 7], "Dornechsenbiss", "Eine Dornechse reißt ihr Maul auf.", 2, "bleeds"],
        sieg: "Die Plünderer reiten in die Nacht zurück. Die Herde beruhigt sich langsam.", loot: ["harzverband"],
      },
      wahl: {
        place: "Weiten · Grenzwall", title: "Wasser gegen Vieh",
        text: "Am Morgen kommt ein verdursteter Staubreiter-Trupp an den Wall. Ihr Brunnen sinkt seit Monaten. Sie bitten um Wasser und bieten Vieh dafür. Oghul legt das Ohr auf den Boden und sagt: Der Berg wurde geweckt.",
        a: pick("Wasser gegen Vieh tauschen", "nacht-banner-tausch", "Du gibst ihnen Wasser, wie es die Clans in Dürrejahren heimlich tun. Sie lassen zwei Rinder da."),
        b: pick("Den Trupp fortjagen", "nacht-banner-fortgejagt", "Du jagst sie zurück in die Wüste. Einer dreht sich um und spuckt in den Staub."),
      },
      angriff: {
        place: "Weiten · Grenzwall", title: "Der Wall bricht", label: "Die Reste der Herde nach Kragmar retten",
        text: "In der nächsten Nacht bricht ein großer Staubreiter-Haufen durch die Lücke im Grenzwall. Die Sippe kann den Wall nicht halten.",
        message: "Du treibst, was von der Herde übrig ist, zurück nach Kragmar.",
      },
      morgen: {
        place: "Kragmar · Bannerhügel", title: "Morgengrauen in Kragmar",
        text: "Auf dem Bannerhügel zählen die Clans ihre Verluste. Oghul sitzt bei dir. „Der Berg wurde geweckt“, sagt er wieder. „Und er wird nicht allein wach bleiben.“",
      },
      akte: ["Die Weiten schützen", "Der Grünmarkt", "Der Graue Pass", "Wasser gegen Vieh", "Der Bannerschwur"],
    },
    staubreiter: {
      ort: "Ur-Taal", volk: "orks", prolog: "Der sinkende Brunnen", motto: "Was der Wind bringt",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht bebt der Mutterberg so stark wie seit dem Aschenwinter nicht. Im Westen sinkt der Brunnen von Ur-Taal."],
        ["Abend", "Das Sommerlager", "Am Brunnen von Ur-Taal stehen die Zelte der Sippen. Über der Glasebene weht der Wind feinen Sand."],
        ["Abend", "Dornechsenreiter %NAME%", "Du bist %NAME%, Dornechsenreiter in der Sippe der Staubkhanin Vashka Dornzahn. Seit dem Abend glüht deine Hand wie Sand in der Mittagssonne."],
      ],
      heim: {
        place: "Ur-Taal · Sommerlager", title: "Das Sommerlager",
        text: "Windseherin Ashka hat ihren Kreis im Sand gezogen. Vashka lässt die Dornechsen tränken, bevor die Sippen sich am Wasser streiten.",
        erkunden: [
          ["Windseherin Ashka im Sand lesen lassen", "nacht-staub-ashka", "Ashka streut Sand in den Wind. „Das Wasser geht nach unten“, sagt sie. „Etwas trinkt von unten.“"],
          ["Über die Glasebene reiten", "nacht-staub-glas", "Die Glasebene knirscht unter den Krallen. Am Horizont siehst du Rauch über dem Berg."],
        ],
        weiter: "Zum Brunnen zurückkehren",
      },
      kampf: {
        place: "Ur-Taal · Brunnen", title: "Der Brunnen sinkt", label: "Dich am Wasser durchsetzen · Kampf",
        text: "Um Mitternacht bebt die Erde, und der Brunnen sinkt um Manneshöhe. Am Wasser bricht Streit zwischen den Sippen aus, Klingen werden gezogen. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Krieger einer fremden Sippe", [22, 6, 1, 6], "Krummsäbel", "Der Krieger wirbelt seinen Säbel über dem Kopf.", 2],
        sieg: "Die fremde Sippe weicht vom Wasser zurück. Vashka nickt dir zu.", loot: ["harzverband"],
      },
      wahl: {
        place: "Ur-Taal · Vashkas Zelt", title: "Die letzte Beute",
        text: "Vashka lässt die letzte Beute verteilen. Draußen warten durstige Sippen. Brakk der Hungrige sagt laut, Vashka habe den Brunnen verloren.",
        a: pick("Deinen Anteil an die durstigen Sippen geben", "nacht-staub-geteilt", "Du gibst deinen Anteil weiter. Die Sippen rufen deinen Namen."),
        b: pick("Deinen Anteil behalten", "nacht-staub-behalten", "Du steckst deinen Anteil ein. Brakk grinst.", { loot: "beuteanteil" }),
      },
      angriff: {
        place: "Ur-Taal · Sommerlager", title: "Brakks Überfall", label: "Mit Vashka nach Zhar-Kesh fliehen",
        text: "In der Nacht überfallen Brakks Krieger Vashkas Zelte. Feuer läuft durch das Lager. Du ziehst Vashka auf deine Dornechse.",
        message: "Im Morgengrauen seht ihr die Mauern von Zhar-Kesh.",
      },
      morgen: {
        place: "Zhar-Kesh · Hafen der Rostsegel", title: "Morgengrauen in Zhar-Kesh",
        text: "Im Hafen von Zhar-Kesh liegen die Rostsegel. Vashka ist verwundet, aber sie lebt. Sie will wissen, warum der Brunnen sinkt, und wer hinter Brakk steht.",
      },
      akte: ["Der leere Brunnen", "Brakks Aufstand", "Feuer an der Westmark", "Das grüne Land", "Der Bannerschwur"],
    },
    aschenclan: {
      ort: "Aschenthron", volk: "orks", prolog: "Die Mutter erwacht", motto: "Nur die Asche bleibt",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht bebt der Mutterberg so stark wie seit dem Aschenwinter nicht. Unter Ghor-Mahr öffnen sich neue Glutspalten."],
        ["Abend", "Der Aschenthron", "Am Kraterrand steht der Aschenthron. Darunter liegen die Schlackenschmieden von Thrak Obsidianhand und der Kreis der Asche."],
        ["Abend", "Narbenträger %NAME%", "Du bist %NAME%, junger Narbenträger am Aschenthron im Gefolge von Durza der Narbigen. Seit dem Abend atmet die Glut in deiner Hand im Takt des Berges."],
      ],
      heim: {
        place: "Aschenthron · Kraterrand", title: "Am Kraterrand",
        text: "Durza ruft ihr Gefolge in den Kreis der Asche. Unten in den Schlackenschmieden schlagen die Hämmer von Thrak Obsidianhand.",
        erkunden: [
          ["Durch die Schlackenschmieden gehen", "nacht-asche-schmiede", "Thrak Obsidianhand hält ein Stück Glutstahl hoch. „Der Berg gibt heute mehr Hitze als sonst“, sagt er."],
          ["Zur Ahnenstätte hinabsteigen", "nacht-asche-ahnen", "In der Ahnenstätte flackern die Feuer, obwohl kein Wind geht."],
        ],
        weiter: "In den Kreis der Asche treten",
      },
      kampf: {
        place: "Aschenthron · Kreis der Asche", title: "Der Kreis der Asche", label: "Im Kreis kämpfen · Kampf",
        text: "Durza schickt dich in einen Übungskampf gegen einen erfahrenen Narbenträger. Wer hier besteht, kämpft an ihrer Seite. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Narbenträger im Kreis", [22, 6, 1, 4], "Schulterstoß", "Dein Gegner senkt die Schulter zum Stoß.", 2, "stuns"],
        sieg: "Dein Gegner geht in die Asche. Um Mitternacht reißt das Beben eine Glutspalte unter dem Schmiededorf auf.", loot: ["harzverband"],
      },
      wahl: {
        place: "Aschenthron · Glutspalte", title: "Ahnen oder Schmieden",
        text: "Lava quillt aus der Spalte und fließt zugleich auf die Ahnenstätte und die Schmieden zu. Du kannst nur eines retten. Ahnenmutter Morga hört im Berg ein Klopfen, das nicht von den Ahnen kommt.",
        a: pick("Die Ahnenstätte retten", "nacht-asche-ahnen-gerettet", "Du lenkst die Lava mit Felsen von der Ahnenstätte weg. Die Ahnen sind geehrt, die Glut sinkt ein wenig.", { replenish: 2 }),
        b: pick("Die Schmieden retten", "nacht-asche-schmieden", "Du rettest die Schmieden. Thrak drückt dir ein Stück Glutstahl in die Hand. Dein Name wird im Clan genannt.", { loot: "glutstahl" }),
      },
      angriff: {
        place: "Ghor-Mahr · Bergflanke", title: "Lampen im Fels", label: "Die Fremden zurückschlagen · Kampf",
        text: "Aus einem frischen Felsspalt an der Bergflanke klettern Zwerge mit Grubenlampen und Spitzhacken. Sie sehen so erschrocken aus wie du.",
        gegner: ["Zwerge aus dem Felsspalt", [24, 6, 2, 3], "Spitzhackenhieb", "Ein Zwerg holt mit der Spitzhacke weit aus.", 2, "stuns"],
        sieg: "Der Spalt stürzt ein und begräbt den Weg, aus dem die Zwerge kamen. Kragh Schlackenherz glaubt dir kein Wort.", loot: ["harzverband"],
      },
      morgen: {
        place: "Ghor-Mahr · Kraterpfad", title: "Morgengrauen am Krater",
        text: "Kragh Schlackenherz schickt dich mit Ahnenmutter Morga in den Krater. Wenn im Berg Fremde graben, soll sie es dort hören. Morga geht schweigend voran, die Hand am heißen Fels.",
      },
      akte: ["Der Kreis der Asche", "Der grollende Berg", "Glutstahl und Eisen", "Die Clans beugen", "Der Bannerschwur"],
    },
    // ---------------------------------------------------------------- Untote
    faeulnisbrut: {
      ort: "Nachtquell", volk: "untote", prolog: "Das zweite Erwachen", motto: "Was einmal lebte",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht spürt Morthan Vel die freigesetzte Glut wie ein Meer aus Lebenskraft. An den Fleischaltären vollzieht er das große Ritual, und die Fäulnis springt."],
        ["Nach Mitternacht", "Das Tal von Nachtquell", "Am Rand des Tals von Nachtquell kippt das Land in die Fäulnis. Wer dort stirbt, bleibt nicht liegen."],
        ["Nach Mitternacht", "%NAME% erhebt sich", "Du warst %NAME%, ein Blutholde aus dem Tal von Nachtquell. Du bist in dieser Nacht gestorben. Jetzt stehst du wieder auf, mit Hunger statt Herzschlag und Glut in der Hand."],
      ],
      heim: {
        place: "Nachtquell · Verfaulter Talrand", title: "Das zweite Erwachen",
        text: "Du liegst dort, wo du gestorben bist. Der Boden ist weich und warm. Im verseuchten Land bewegst du dich schneller als im Leben. Von irgendwo ruft etwas nach dir.",
        erkunden: [
          ["Durch das verseuchte Land laufen", "nacht-brut-lauf", "Du läufst, ohne müde zu werden. Wo die Fäulnis endet, werden deine Schritte schwer."],
          ["Zu deinem alten Haus hinübersehen", "nacht-brut-haus", "In deinem alten Haus brennt Licht. Jemand weint dort. Du verstehst nicht mehr, warum."],
        ],
        weiter: "Dem Ruf zum Fleischaltar folgen",
      },
      kampf: {
        place: "Nachtquell · Talrand", title: "Fliehende Blutholde", label: "Dir den Weg zum Altar freikämpfen · Kampf",
        text: "Auf dem Weg zum Altar kommen dir Blutholde entgegen, die vor der Fäulnis fliehen. Sie erkennen nicht, wer du warst, und greifen dich an. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Fliehende Blutholde", [20, 6, 1, 5], "Fackelschlag", "Ein Blutholde schwingt eine brennende Fackel.", 2],
        sieg: "Die Blutholden laufen ins Dunkel. Vor dir liegt der Fleischaltar.", loot: ["galgenwurz"],
      },
      wahl: {
        place: "Nachtquell · Fleischaltar", title: "Fleisch",
        text: "Am Altar tragen Kultisten Morthans großes Ritual aus der Ferne mit. Dein neues Fleisch beginnt bereits zu faulen. Neben dem Altar liegt ein gefangener Blutholde. Aus dem Schatten beobachtet dich jemand, ein Mitglied der Stillen.",
        a: pick("Dem Gefangenen das Fleisch nehmen", "nacht-brut-fleisch", "Du nimmst, was du brauchst. Dein Körper heilt, und ein Vorrat an Fleisch bleibt dir.", { recover: 99 }),
        b: pick("Den Gefangenen laufen lassen", "nacht-brut-verschont", "Du lässt ihn laufen. Der Stille im Schatten nickt kaum merklich und verschwindet."),
      },
      angriff: {
        place: "Nachtquell · Ritualfeld", title: "Die Blutritter kommen", label: "Nach Osten in die Marschen fliehen",
        text: "Blutritter der Erinnernden stürmen das Ritualfeld und brennen den Altar nieder. Die Kultisten fallen. Du läufst, solange das verseuchte Land dich trägt.",
        message: "Im Morgengrauen erreichst du die Marschen von Madenmoor.",
      },
      morgen: {
        place: "Madenmoor · Marschen", title: "Morgengrauen in Madenmoor",
        text: "In den Marschen von Madenmoor ist der Boden verseucht und sicher. Andere Gebundene stehen zwischen den Pilzen. Aus dem Norden ruft der Tempel der Fleischaltäre. Der Hunger bleibt.",
      },
      akte: ["Der Hunger der Altäre", "Die faulenden Schiffe", "Die Stillen", "Die Grenze fällt", "Vor den Toren"],
    },
    hof: {
      ort: "Palast der Tausend Stimmen", volk: "untote", prolog: "Die Stimmen werden laut", motto: "Der König ohne Morgen",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht bricht im Süden ein Berg auf, und die Fäulnis springt. Im Palast der Tausend Stimmen flüstern die Geisteradligen von einem Aufstand."],
        ["Abend", "Der Palast der Tausend Stimmen", "In den verlassenen Sälen feiern Geister das alte Hofleben von Vaelthar. Aldric Vaelthar III. schweigt, aber er hört jedes Wort."],
        ["Abend", "%NAME% von der Hofwache", "Du bist %NAME%, ein Geist aus Vaelthar und ehemaliger Ritter der Hofwache. Seit dreitausend Jahren bewachst du denselben Gang. Heute Nacht glimmt in dir eine Glut, die du nicht kennst."],
      ],
      heim: {
        place: "Palast der Tausend Stimmen · Dein Gang", title: "Feste in leeren Sälen",
        text: "Hinter den Wänden spielt Musik, die vor dreitausend Jahren verklungen ist. Du gehst durch die Wände, wie immer. Heute klingen die Stimmen anders.",
        erkunden: [
          ["Durch die Wand in den Festsaal gleiten", "nacht-hof-fest", "Die Geisteradligen tanzen, doch sie flüstern dabei. Ein Wort fällt immer wieder: endlich."],
          ["Vor dem Thronsaal verharren", "nacht-hof-thron", "Hinter der Tür ist es still. Du weißt, dass Aldric dich hört."],
        ],
        weiter: "Dem Flüstern in den Kronsaal folgen",
      },
      kampf: {
        place: "Palast der Tausend Stimmen · Kronsaal", title: "Die gestohlene Krone", label: "Die Verschwörer stellen · Kampf",
        text: "Eine Gruppe Geisteradliger will die Krone stehlen, damit alle endlich sterben können. Sie haben dich nicht kommen hören. Die Glut in dir wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Verschwörende Geisteradlige", [20, 6, 1, 7], "Kalter Schrei", "Ein Adliger öffnet den Mund zu einem lautlosen Schrei.", 2, "stuns"],
        sieg: "Die Verschwörer fliehen durch die Wände. Einer bleibt zurück, gebunden von deiner Glut.", loot: ["glutampulle"],
      },
      wahl: {
        place: "Palast der Tausend Stimmen · Kronsaal", title: "Gnade für einen Adligen",
        text: "Der gefangene Adlige bittet um Gnade. Er will nur sterben, sagt er, wie alle anderen. Dann spricht Aldric zum ersten Mal zu dir: Er brauche bald Körper für sein Volk.",
        a: pick("Den Adligen Aldric ausliefern", "nacht-hof-ausgeliefert", "Du übergibst ihn dem König. Seine Seele gehört jetzt der Krone."),
        b: pick("Den Adligen entkommen lassen", "nacht-hof-verschont", "Du siehst weg, und er gleitet durch die Wand davon. Aldric sagt nichts."),
      },
      angriff: {
        place: "Palast der Tausend Stimmen", title: "Der Aufstand bricht los", label: "Nach Seelenhafen fliehen",
        text: "Der Aufstand bricht offen aus. Die Säle füllen sich mit kämpfenden Geistern. Du kannst den Gang nicht mehr halten.",
        message: "Im Morgengrauen erreichst du Seelenhafen.",
      },
      morgen: {
        place: "Seelenhafen · Kai der Geisterschiffe", title: "Morgengrauen in Seelenhafen",
        text: "In Seelenhafen liegen Schiffe ohne Ruderer. Aus dem Süden kommt Nachricht vom Kult: In Perlvik ist ein Kultist im Feuer gestorben, der der Krone sein Leben geschworen hatte. Aldric braucht Körper.",
      },
      akte: ["Die Stimmen im Palast", "Der erste Draugr", "Ein Körper für den König", "Die zweite Lange Nacht", "Vor den Toren"],
    },
    erinnernde: {
      ort: "Eryndor", volk: "untote", prolog: "Der verweigerte Zehnt", motto: "Was das Blut erinnert",
      slides: [
        ["Die Nacht des Erwachens", "Herbst 612 n. E. In dieser Nacht springt die Fäulnis. Am Rand des Tals von Nachtquell kippt das Land, und die Blutholden suchen Schutz."],
        ["Abend", "Eryndor", "In den Bibliotheken von Eryndor stehen die Erinnerungen der Aethari. Am versiegten Blutbrunnen ist es still."],
        ["Abend", "%NAME%, Vogt von Nachtquell", "Du bist %NAME%, ein junger Vampir eines alten Hauses und Vogt über das Tal von Nachtquell. Heute reist du zum Blutzehnt. Seit dem Abend glimmt Glut in deiner Hand."],
      ],
      heim: {
        place: "Eryndor · Bibliothek", title: "Die Bibliotheken von Eryndor",
        text: "Bevor du ins Tal reist, rufen dich die Ältesten deines Hauses in die Bibliothek. Ihre Erinnerungen sind älter als jede Stadt der Menschen.",
        erkunden: [
          ["In den Erinnerungen der Bibliothek lesen", "nacht-blut-bibliothek", "Ein Band erzählt vom ersten Ritual unter Serathia. Ein Name ist auf jeder Seite geschwärzt."],
          ["Am Blutbrunnen verweilen", "nacht-blut-brunnen", "Der Brunnen ist trocken wie seit Jahrhunderten. Doch der Stein ist heute warm."],
        ],
        weiter: "Ins Tal von Nachtquell reisen",
      },
      kampf: {
        place: "Nachtquell · Dorfrand", title: "Das Tal kippt", label: "Für die Blutholden kämpfen · Kampf",
        text: "In der Nacht kippt der Rand des Tals in die Fäulnis. Gebundene greifen die Dörfer an. Die Blutholden schreien nach ihrem Vogt. Die Glut in deiner Hand wird heiß. Zum ersten Mal kannst du sie im Kampf einsetzen.",
        gegner: ["Gebundene der Fäulnis", [24, 6, 1, 3], "Faulender Griff", "Ein Gebundener packt dich mit fauligen Händen.", 2, "bleeds"],
        sieg: "Die Gebundenen fallen. Im Dorf brennen noch Fackeln.", loot: ["harzverband"],
      },
      wahl: {
        place: "Nachtquell · Dorfplatz", title: "Der verweigerte Zehnt",
        text: "Am Morgen verweigert das Dorf den Zehnt. Der versprochene Schutz hat versagt, sagen die Ältesten. Dein Durst brennt.",
        a: pick("Das Blut mit Gewalt nehmen", "nacht-blut-gewalt", "Du nimmst, was dir zusteht. Beim Trinken siehst du die Erinnerung eines Toten, der als Gebundener wieder aufstand. Das Tal wird dir das nicht vergeben.", { recover: 99 }),
        b: pick("Auf den Zehnt verzichten", "nacht-blut-verzicht", "Du verzichtest. Die Raserei kratzt an deinem Willen, aber das Tal bleibt dir treu."),
      },
      angriff: {
        place: "Nachtquell", title: "Das Heer der Fäulnisbrut", label: "Die Überlebenden nach Eryndor führen",
        text: "Ein Heer der Fäulnisbrut überrennt das Tal. Auf dem Ritualfeld brennen die Blutritter einen Altar nieder, aber das Heer ist zu groß.",
        message: "Im Morgengrauen erreicht ihr die Tore von Eryndor.",
      },
      morgen: {
        place: "Eryndor · Tor der Häuser", title: "Morgengrauen in Eryndor",
        text: "Die Überlebenden drängen sich am Tor. Die Häuser streiten, wer sie aufnehmen soll. Aus Perlvik kommt Nachricht: Aethari-Schriften, die dort lagen, sind in der Nacht verschwunden.",
      },
      akte: ["Der Blutzehnt", "Die Bibliothek der Toten", "Das Herz von Eryndor", "Die Schlafende", "Vor den Toren"],
    },
  };

  // Gemeinsame Ankunft im bisherigen Abschnitt. Die Wahl je Herkunft entspricht den Vorteilen aus dem Erwachen in
  // Kornwik, damit alle Fraktionen dieselben Startvorteile behalten.
  const ankunft = {
    place: "Kornwik · Landstraße", title: "Ankunft im Kronreich", objective: "Finde die Fuhrleute am Kornwagen.",
    illustration: "asche.png",
    text: "Am Ende deiner Reise erreichst du das Ackerland bei Kornwik im Westen des Kronreichs. Graue Asche vom Eispass liegt in den Wagenspuren und unter den Hecken. Weiter vorn hängt eine Laterne an einem Kornwagen.",
    choices: [
      { id: "prepare", origin: "valmarcher", label: "Die Kerben der Fuhrleute am Wegpfahl lesen", mark: "ditch", to: "start",
        message: "Die Kerben markieren sichere Gräben. Du merkst dir den trockenen Graben am Acker." },
      { id: "prepare", origin: "waldelf", label: "Den freien Bachpfad unter den Eichen einprägen", mark: "waldspur", to: "start",
        message: "Ein Blick auf den Boden reicht. Du erkennst, wo die Wölfe den Bach queren und wo das Ufer frei bleibt." },
      { id: "prepare", origin: "bergzwerg", label: "Den alten Grenzstein am Weg untersuchen", mark: "steinrhythmus", to: "start",
        message: "Im Sockel liegt eine warme Naht mit dem Muster der Runenschmiede von Essenfels. Du merkst dir den Rhythmus der Glut." },
      { id: "prepare", origin: "gruenhaut", label: "Den Fuhrleuten das festgefahrene Rad aus dem Graben heben", mark: "fuhrleute-vertrauen", to: "start",
        message: "Die Fuhrleute erschrecken bei deinem Anblick. Als das Rad frei ist, nehmen sie dich mit zum Wagen." },
      { id: "prepare", origin: "vampir", label: "Im Schatten der Hecke dem Herzschlag eines Fuhrmanns lauschen", mark: "faehrwort", to: "start",
        message: "Er murmelt ein Kennwort der Erinnernden aus Eryndor. Damit erkennt man sich an der Furt von Heidvang." },
      { id: "prepare", origin: "untot", label: "Am alten Gräberfeld Galgenwurz sammeln", item: "galgenwurz", to: "start",
        message: "Zwischen den Grabsteinen wächst Galgenwurz. Du nimmst ein Bündel mit und ziehst die Kapuze tiefer." },
      { id: "move", label: "Direkt zum Kornwagen gehen", to: "start" },
    ],
  };

  // Belohnungen für Entscheidungen mit Gold, Beute oder Erz (Gewichtung, Gegenstände, Silber).
  const lootTables = {
    reedergold: [[100, [], 25]], zollgold: [[100, [], 20]], beuteanteil: [[100, ["glutampulle"], 12]],
    tiefenglut: [[100, ["glutampulle", "glutampulle"], 0]], glutstahl: [[100, ["eisenkeil"], 0]],
  };

  const scenes = { ankunft };
  const storageSites = {};
  const prologe = {};
  const creatures = {};
  const fights = {};
  const battleRewards = {};
  const milestones = {};
  const marken = {};
  const fernOrt = (place) => place.split(" · ")[0];
  for (const [id, f] of Object.entries(fraktionen)) {
    const ids = { heim: "heim-" + id, kampf: "kampf-" + id, wahl: "wahl-" + id, angriff: "angriff-" + id, morgen: "morgen-" + id };
    const kapitel = (n, text) => "Prolog „" + f.prolog + "“ · Kapitel " + n + " · " + text;
    const fight = (key, data, to) => {
      const [name, stats, special, warning, damage, effect] = data.gegner;
      creatures[key] = { name, stats };
      fights[key] = { name, to, retreatTo: to, victory: key + "-sieg", escape: key + "-entkommen", loot: data.loot,
        special: { name: special, warning, damage, ...(effect ? { [effect]: true } : {}) }, victoryText: data.sieg,
        // Kampfdokument: Im Prolog kämpft ein Held allein gegen 1 Elite der Stufe 1, der Angriff in Kapitel 3 ist Stufe 2.
        gegner: { rang: "elite", stufe: key.endsWith("-angriff") ? 2 : 1 } };
      battleRewards[key] = [40, 0];
    };
    const chosen = [];
    scenes[ids.heim] = {
      place: f.heim.place, title: f.heim.title, objective: kapitel(1, "Sieh dich in deiner Heimat um."), text: f.heim.text,
      fern: fernOrt(f.heim.place), lager: ids.heim,
      choices: [
        ...f.heim.erkunden.map(([label, mark, message], index) =>
          ({ id: "erkunden-" + (index + 1), label, mark, excludes: mark, message, to: ids.heim })),
        { id: "weiter", label: f.heim.weiter, to: ids.kampf },
      ],
    };
    fight("nacht-" + id, f.kampf, ids.wahl);
    scenes[ids.kampf] = {
      place: f.kampf.place, title: f.kampf.title, objective: kapitel(2, "Kämpfe und setze deine Glut ein."), text: f.kampf.text,
      fern: fernOrt(f.kampf.place), creature: "nacht-" + id,
      choices: [{ id: "kampf", label: f.kampf.label, fight: "nacht-" + id, to: ids.wahl }],
    };
    scenes[ids.wahl] = {
      place: f.wahl.place, title: f.wahl.title, objective: kapitel(3, "Triff deine erste Entscheidung."), text: f.wahl.text,
      fern: fernOrt(f.wahl.place),
      choices: [f.wahl.a, f.wahl.b].map((choice, index) => {
        chosen.push(choice.mark);
        return { id: index ? "wahl-b" : "wahl-a", to: ids.angriff, ...choice };
      }),
    };
    const attack = f.angriff;
    if (attack.gegner) fight("nacht-" + id + "-angriff", attack, ids.morgen);
    scenes[ids.angriff] = {
      place: attack.place, title: attack.title, objective: kapitel(3, "Überstehe den Angriff."), text: attack.text,
      fern: fernOrt(attack.place), ...(attack.gegner ? { creature: "nacht-" + id + "-angriff" } : {}),
      choices: [attack.gegner
        ? { id: "flucht", label: attack.label, fight: "nacht-" + id + "-angriff", to: ids.morgen }
        : { id: "flucht", label: attack.label, message: attack.message, to: ids.morgen }],
    };
    scenes[ids.morgen] = {
      place: f.morgen.place, title: f.morgen.title, objective: "Prolog abgeschlossen. Als Nächstes: Akt 1, „" + f.akte[0] + "“.",
      text: f.morgen.text + " Die Fraktionsreihe „" + f.motto + "“ beginnt mit Akt 1, „" + f.akte[0] + "“. Bis dahin führt dich der Weg ins Kronreich, wo am Eispass die Asche fällt.",
      fern: fernOrt(f.morgen.place), lager: ids.morgen,
      choices: [{ id: "reise", label: "Ins Kronreich reisen", to: "ankunft",
        message: "Du machst dich auf den Weg ins Kronreich. Nach Tagen erreichst du das Ackerland bei Kornwik." }],
    };
    storageSites[ids.heim] = "Zentrallager · " + fernOrt(f.heim.place);
    storageSites[ids.morgen] = "Zentrallager · " + fernOrt(f.morgen.place);
    // Ein abgeschlossener Prolog zählt wie ein Questakt (300 EP, Kampfdokument). Mit den zwei Kämpfen erreicht der Held Stufe 3.
    milestones[ids.morgen] = ["prolog-" + id, 300];
    marken[id] = chosen;
    const [[title, text], ...rest] = f.slides;
    prologe[id] = [
      { image: "start/kontinent-" + f.volk + ".jpg", location: "Odris · Herbst 612 n. E.", title, text, duration: 6800 },
      ...rest.map(([zeit, slideTitle, slideText], index) => ({
        image: "start/ort-" + id + ".jpg", location: f.ort + " · " + zeit, title: slideTitle, text: slideText,
        duration: index ? 7300 : 6500, showPortrait: index === 1,
      })),
    ];
    f.szene = ids.heim;
    f.kontinent = kontinente[f.volk];
  }

  // Kreuzungen zwischen den Reihen (Dokument „Nacht des Erwachens“). Die Marken der Prologe sind bereits
  // gespeichert. Die Akte, die sie aufgreifen, sind noch nicht spielbar.
  const kreuzungen = [
    ["Der Brand im Gildenhaus von Perlvik", "haefen · Prolog Kap. 3, Akt 1", "hof · Akt 2"],
    ["Die gestohlenen Aethari-Schriften", "haefen · Prolog Kap. 2", "erinnernde · Akt 2"],
    ["Gefangene Elfenhändler", "haefen · Prolog Kap. 2", "schattenbluete · Akt 2"],
    ["Der Seemann aus Perlvik am Nordkap", "dornenklingen · Prolog Kap. 2 und 3", "haefen · Akt 1"],
    ["Das Tal von Nachtquell", "erinnernde · Prolog", "faeulnisbrut · Prolog, Akt 1"],
    ["Der zerstörte Altar bei Nachtquell", "faeulnisbrut · Prolog Kap. 3", "erinnernde · Prolog"],
    ["Die Späher im Wald und im Garten", "hueter · Prolog Kap. 2", "schattenbluete · Prolog Kap. 2 und Angriff"],
    ["Der verschollene Trupp im Stollen", "tiefgraeber · Prolog Kap. 3, Akt 2", "aschenclan · Prolog Angriff"],
    ["Die Schatten in der Tiefenglut", "tiefgraeber · Prolog Kap. 2", "runenschmiede · Prolog Kap. 3"],
    ["Die Tiefenglut am Zollpass", "tiefes-koenigreich · Prolog Kap. 3", "tiefgraeber, runenschmiede"],
    ["Nektar am Nordtor", "runenschmiede · Prolog Kap. 2", "schattenbluete · Prolog Kap. 3"],
    ["Der sinkende Brunnen", "staubreiter · Prolog Kap. 2", "gruene-banner · Prolog Kap. 3"],
    ["Die Rostsegel vor Westvik", "kronreich · Prolog", "staubreiter · Akt 3"],
    ["Der Kult am Krankenbett", "kronreich · Akt 1", "hof · Akt 3"],
    ["Die Ewige Flamme", "orden · Prolog, Akt 1", "hof · Akt 4; kronreich · Akt 4"],
    ["Das Aschenlied", "hueter · Akt 2", "aschenclan · Akt 2"],
    ["Klinge und Flamme", "dornenklingen · Akt 3", "orden · Akt 4"],
    ["Gold und Eisen", "tiefes-koenigreich · Akt 2", "haefen · Akt 2"],
    ["Der Grünmarkt", "gruene-banner · Akt 2", "haefen · Akt 3"],
    ["Das Wrack an den Knocheninseln", "staubreiter · Akt 2", "faeulnisbrut · Akt 2"],
  ];

  const szene = (faction) => fraktionen[faction]?.szene ?? "wake";
  const ort = (faction) => fraktionen[faction]?.ort ?? "Kornwik";
  return { fraktionen, scenes, storageSites, prologe, creatures, fights, battleRewards, milestones, lootTables, marken,
    kreuzungen, szene, ort };
})();
