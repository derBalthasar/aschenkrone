"use strict";

// Startpunkte je Fraktion (17. 11. 2026). Jede spielbare Fraktion beginnt in ihrem eigenen Gebiet nach der
// verbindlichen Weltkarte. Das Kronreich behält den bisherigen Prolog in Kornwik. Alle anderen Fraktionen
// erwachen an ihrem Startort und reisen danach ins Ackerland bei Kornwik, wo der spielbare Abschnitt beginnt.
// Die Bilder unter spiel/prolog/start/ sind Ausschnitte der verbindlichen Karte mit markiertem Startort.
const startpunkte = (() => {
  const kontinente = {
    menschen: "Land der Menschen", untote: "Land der Untoten", elfen: "Land der Elfen",
    orks: "Land der Orks", zwerge: "Land der Zwerge",
  };
  const vorrat = (label, message) => ({ id: "vorrat", label, item: "galgenwurz", mark: "heimvorrat", excludes: "heimvorrat", message });
  const auftrag = (fraktion, label, message) => ({ id: "auftrag", label, mark: "auftrag-" + fraktion, to: "ankunft", message });
  const eigen = (label, message) => ({ id: "eigen", label, mark: "eigener-weg", to: "ankunft", message });

  const fraktionen = {
    kronreich: { ort: "Kornwik", szene: "wake" },
    orden: {
      ort: "Aschenkloster", volk: "menschen",
      prolog: [
        ["Feuer auf den Nordpässen", "Seit Tagen weht graue Asche vom Eispass über das Land. Im Orden der Flamme heißt es, die Ewige Flamme in Glutberg habe in derselben Nacht geflackert."],
        ["Vor der Frühmesse", "Das Hochtal der Novizen", "Im Hochtal unter Glutberg läuten die Glocken des Aschenklosters. Paladine und Runenmeister lernen hier, Glauben und Flamme zu verbinden."],
        ["Morgengrauen", "Du erwachst vor dem Altar", "Du liegst auf den kalten Steinen vor dem Altar. An deinen Namen erinnerst du dich: %NAME%. Die Kerze neben dir ist längst erloschen, doch in deiner Hand glimmt Glut. Die Runen an der Wand antworten mit einem schwachen Leuchten."],
      ],
      szene: {
        place: "Aschenkloster · Runenhalle", title: "Ein Zeichen der Flamme", objective: "Entscheide, wie du aufbrichst.",
        text: "Der Runenmeister des Klosters hat dich am Altar gefunden. Er hält deine glühende Hand ins Licht und schweigt lange. Dann erzählt er von den Fuhrleuten bei Kornwik im Kronreich, die Asche auf ihren Feldern melden. Seherin Freydis fürchtet, dass der Kult der Bleichen Ewigkeit die Unruhe nutzt. Der Orden will jemanden mit wachen Augen nach Süden schicken.",
        choices: [
          vorrat("In der Klosterküche Galgenwurz für den Weg erbitten", "Die Köchin gibt dir ein Bündel Galgenwurz mit."),
          auftrag("orden", "Den Auftrag des Ordens annehmen und nach Kornwik reisen",
            "Der Runenmeister zeichnet dir ein Aschenkreuz auf die Stirn. Über die Bergstraße erreichst du nach einigen Tagen das Ackerland bei Kornwik."),
          eigen("Ohne Segen aufbrechen und der eigenen Glut folgen",
            "Du verlässt das Kloster vor der Frühmesse. Die Glut in deiner Hand zieht dich nach Süden, bis du nach einigen Tagen das Ackerland bei Kornwik erreichst."),
        ],
      },
    },
    haefen: {
      ort: "Perlvik", volk: "menschen",
      prolog: [
        ["Segel im Inneren Meer", "Die Freien Häfen leben vom Handel zwischen allen Küsten. Seit die Asche am Eispass fällt, bleiben die Kornfuhren aus dem Kronreich aus, und im Hafenthing streiten die Gilden über Zölle und Krieg."],
        ["Vor Sonnenaufgang", "Nebel über dem Hafen", "Im Hafen von Perlvik knarren die Taue. Zwischen Fässern und Netzen warten die Schauerleute auf die Flut."],
        ["Morgengrauen", "Du erwachst auf dem Kai", "Du liegst zwischen Taurollen auf dem nassen Kai. An deinen Namen erinnerst du dich: %NAME%. Die Möwen schreien, und in deiner Hand regt sich Glut. Wo deine Finger das Holz berühren, trocknet der Nebel."],
      ],
      szene: {
        place: "Perlvik · Hafenkontor", title: "Ein Auftrag des Hafenthings", objective: "Entscheide, wie du aufbrichst.",
        text: "Eine Schreiberin des Hafenthings hat gesehen, wie die Glut in deiner Hand den Nebel vertrieb, und dich ins Kontor geholt. Die Kornfuhren aus Kornwik sind überfällig. Die Gilden wollen wissen, ob die Asche vom Eispass die Ernte verdorben hat. Am Mittag läuft ein Küstensegler nach Westen aus.",
        choices: [
          vorrat("Aus der Schiffsapotheke ein Bündel Galgenwurz nehmen", "Die Schreiberin trägt die Galgenwurz in ihr Buch ein und gibt sie dir mit."),
          auftrag("haefen", "Für das Hafenthing nach den Kornfuhren sehen",
            "Der Küstensegler bringt dich in zwei Tagen nach Westen. Vom Anleger aus erreichst du zu Fuß das Ackerland bei Kornwik."),
          eigen("Auf eigene Rechnung anheuern und der Glut folgen",
            "Du heuerst als Deckhand auf einem Kornschiff an. Vom Anleger aus erreichst du zu Fuß das Ackerland bei Kornwik."),
        ],
      },
    },
    hof: {
      ort: "Draugrsund", volk: "untote",
      prolog: [
        ["Der König ohne Morgen", "Jenseits des Nordmeers herrscht Aldric Vaelthar III. vom Palast der Tausend Stimmen. Seine Geister führen das alte Hofleben fort, und in den Menschenlanden wirbt der Kult der Bleichen Ewigkeit um neue Diener."],
        ["In der Nacht", "Schwarze Segel", "Im Hafen von Draugrsund liegen Schiffe ohne Ruderer. Draugr stehen reglos an Deck und warten auf einen Befehl aus dem Palast."],
        ["Kalter Morgen", "Du erwachst im Totenhafen", "Du öffnest die Augen in einer Steinkammer am Kai. An deinen Namen erinnerst du dich: %NAME%. Dein Atem bleibt kalt, doch in deiner Hand glimmt Glut. Die Geister in der Kammer weichen vor dem Licht zurück."],
      ],
      szene: {
        place: "Draugrsund · Kammer am Kai", title: "Die Stimme der Krone", objective: "Entscheide, wie du aufbrichst.",
        text: "Eine Geisterstimme aus dem Palast spricht durch den Mund des Hafenmeisters. Die Krone hat gespürt, wie im Süden Glut erwacht. Über dem Eispass im Land der Menschen fällt Asche, und die Kultisten dort werden unruhig. Der Hof will wissen, wer diese Glut entfacht. Ein Schiff mit schwarzen Segeln liegt bereit, um dich unbemerkt an die Küste des Kronreichs zu bringen.",
        choices: [
          vorrat("Aus den Grabbeigaben der Kammer Galgenwurz nehmen", "Zwischen den Grabbeigaben liegt ein Bündel getrockneter Galgenwurz."),
          auftrag("hof", "Der Krone gehorchen und an Bord gehen",
            "Das Schiff überquert das Nordmeer in einer mondlosen Nacht. Unter Kapuze und Mantel gehst du an Land und erreichst das Ackerland bei Kornwik."),
          eigen("Heimlich mit einem Salzhändler über das Meer fahren",
            "Ohne Wissen der Krone fährst du mit einem Salzhändler über das Nordmeer. Unter Kapuze und Mantel erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
    erinnernde: {
      ort: "Eryndor", volk: "untote",
      prolog: [
        ["Blut und Erinnerung", "Die Adelshäuser der Erinnernden hüten in Eryndor ihre Bibliotheken und den versiegten Blutbrunnen. Mit jedem Schluck Blut gewinnen sie fremde Erinnerungen."],
        ["Mitternacht", "Am Blutbrunnen", "Seit Jahrhunderten liegt der Blutbrunnen trocken. In dieser Nacht schimmert an seinem Grund ein dünner roter Film."],
        ["Vor dem Morgen", "Du erwachst am Brunnenrand", "Du lehnst am kalten Rand des Brunnens. An deinen Namen erinnerst du dich: %NAME%. Fremde Erinnerungen an ein Kornfeld im Süden flackern in dir auf. In deiner Hand regt sich Glut."],
      ],
      szene: {
        place: "Eryndor · Bibliothek am Blutbrunnen", title: "Eine fremde Erinnerung", objective: "Entscheide, wie du aufbrichst.",
        text: "Eine Archivarin deines Hauses lässt dich die Erinnerung beschreiben: ein Kornfeld unter grauer Asche, ein Feldweg, eine Laterne. Sie kennt den Ort. Es ist Kornwik im Kronreich, wo Fuhrleute ein altes Kennwort der Erinnernden benutzen. Die Häuser wollen wissen, wessen Erinnerung du trägst.",
        choices: [
          vorrat("Aus dem Kräuterschrank der Bibliothek Galgenwurz nehmen", "Die Archivarin reicht dir ein Bündel Galgenwurz aus dem Schrank."),
          auftrag("erinnernde", "Die Erinnerung im Auftrag der Häuser verfolgen",
            "Ein Rubinsegler aus Rubinhafen bringt dich über das Innere Meer. Nach Tagen erreichst du das Ackerland bei Kornwik."),
          eigen("Die Erinnerung für dich behalten und allein aufbrechen",
            "Du verlässt Eryndor, ohne den Häusern alles zu sagen. Nach Tagen auf See erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
    faeulnisbrut: {
      ort: "Sporenwald", volk: "untote",
      prolog: [
        ["Fleisch und Fäulnis", "Am Tempel der Fleischaltäre sammelt Morthan Vel die Fäulnisbrut. Sie erhält ihre Körper durch fremdes lebendes Gewebe. Auf verseuchtem Land stehen Gefallene als Gebundene wieder auf."],
        ["Im Dunst", "Sporen über dem Moor", "Zwischen den aufgequollenen Stämmen des Sporenwalds treiben Sporen wie Schnee. Nichts wächst hier, das nicht von etwas anderem lebt."],
        ["Morgengrauen", "Du erwachst im Sporennest", "Du liegst in einem Nest aus weichem Pilzgeflecht. An deinen Namen erinnerst du dich: %NAME%. Wo die Glut in deiner Hand aufglimmt, zieht sich die Fäulnis zurück, und dein Fleisch bleibt fest."],
      ],
      szene: {
        place: "Sporenwald · Fleischaltar am Waldrand", title: "Gebunden und doch frei", objective: "Entscheide, wie du aufbrichst.",
        text: "Ein Priester der Fäulnisbrut betrachtet dich misstrauisch. Gebundene zerfallen, sobald sie das verseuchte Land verlassen. Dich hält die Glut zusammen. Morthan Vel will wissen, ob diese Gabe auch im Süden trägt, wo im Land der Menschen Asche auf die Felder fällt.",
        choices: [
          vorrat("Die Galgenwurz vom Altar nehmen", "Am Fuß des Altars wächst Galgenwurz, unberührt von der Fäulnis. Du nimmst ein Bündel mit."),
          auftrag("faeulnisbrut", "Für Morthan Vel nach Süden gehen",
            "Ein Schmugglerboot aus Schwarzbrack setzt dich an der Küste des Kronreichs ab. Die Glut hält deinen Körper zusammen, als du das verseuchte Land verlässt. Nach Tagen erreichst du das Ackerland bei Kornwik."),
          eigen("Ohne Segen des Tempels fliehen",
            "Du schleichst dich auf ein Schmugglerboot. Die Glut hält deinen Körper zusammen, als du das verseuchte Land verlässt. Nach Tagen erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
    dornenklingen: {
      ort: "Dornwacht", volk: "elfen",
      prolog: [
        ["Der Dornwall", "Die Dornenklingen halten das Nordkap und den Dornwall gegen die Fäulnis aus dem Norden. Sie kämpfen mit Waffen und Feuer und haben sich vom Wurzelrat losgesagt."],
        ["Nachtwache", "Feuer auf dem Wall", "Auf dem Dornwall brennen Wachfeuer. Über die Hirschsteppe treibt der Wind Sporen vom Nordmeer heran."],
        ["Morgengrauen", "Du erwachst auf dem Wehrgang", "Du liegst auf dem Wehrgang zwischen Dornenranken. An deinen Namen erinnerst du dich: %NAME%. In deiner Hand regt sich Glut, und die verdorrten Ranken neben dir treiben frische Dornen."],
      ],
      szene: {
        place: "Dornwacht · Wachturm am Dornwall", title: "Asche im Westwind", objective: "Entscheide, wie du aufbrichst.",
        text: "Die Hauptfrau der Wache hat Staub aus dem Westwind aufgefangen: graue Asche vom Eispass im Land der Menschen. Wenn dort Glut aus der Erde bricht, kann sie die Fäulnis stärken oder schwächen. Die Hauptfrau braucht jemanden, der hinüberfährt und es herausfindet.",
        choices: [
          vorrat("In der Wachstube Galgenwurz für den Weg holen", "Die Wache teilt ein Bündel Galgenwurz aus ihren Vorräten mit dir."),
          auftrag("dornenklingen", "Den Auftrag der Dornenklingen annehmen",
            "Ein schmales Schiff der Dornenklingen bringt dich über das Innere Meer. Nach Tagen erreichst du das Ackerland bei Kornwik."),
          eigen("Den Wall verlassen und der eigenen Glut folgen",
            "Du verlässt den Wall ohne Befehl und findest Platz auf einem Handelsschiff. Nach Tagen erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
    hueter: {
      ort: "Ylvenor", volk: "elfen",
      prolog: [
        ["Der welkende Baum", "Der Weltenbaum schenkt den Elfen ein langes Leben, doch seit rund zwei Jahrhunderten welkt er. Die Hüter vertrauen auf seine Magie und halten Fremde von den heiligen Hainen fern."],
        ["Im Geäst", "Stadt im Weltenbaum", "Ylvenor liegt hoch im Geäst des Weltenbaums. Am Aschenast sind in dieser Nacht die Blätter grau geworden."],
        ["Morgengrauen", "Du erwachst am Aschenast", "Du liegst auf der Rinde des Aschenasts. An deinen Namen erinnerst du dich: %NAME%. In deiner Hand regt sich Glut. Unter deinen Fingern treibt der graue Ast eine einzelne grüne Knospe."],
      ],
      szene: {
        place: "Ylvenor · Aschenast", title: "Die Knospe am grauen Ast", objective: "Entscheide, wie du aufbrichst.",
        text: "Eine Älteste des Wurzelrats betrachtet die Knospe lange. Der Baum spüre, sagt sie, wenn fern im Westen Glut aus der Erde bricht. Seit die Asche am Eispass im Land der Menschen fällt, welkt er schneller. Sie bittet dich, dorthin zu gehen und herauszufinden, ob die Glut heilt oder verbrennt.",
        choices: [
          vorrat("Unter den Wurzeln Galgenwurz sammeln", "Zwischen den Wurzeln des Baums findest du ein Bündel Galgenwurz."),
          auftrag("hueter", "Der Bitte des Wurzelrats folgen",
            "Vom Laubmarkt aus bringt dich ein Handelsschiff über das Innere Meer. Nach Tagen erreichst du das Ackerland bei Kornwik."),
          eigen("Ohne Segen des Rats aufbrechen",
            "Du steigst ohne Abschied aus dem Geäst und gehst am Laubmarkt an Bord. Nach Tagen erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
    schattenbluete: {
      ort: "Schwarzgarten", volk: "elfen",
      prolog: [
        ["Die Verbannten", "Um Velasyr leben die Verbannten der Schattenblüte in den südlichen Sümpfen. Der Nektar ihrer schwarzen Blüten verlängert ihr Leben. Gifte, Schmuggel und geheime Abkommen sichern ihren Einfluss."],
        ["Mondnacht", "Der Schwarze Garten", "Im Schwarzen Garten öffnen sich die Blüten nur bei Nacht. Wer erntet, trägt eine Maske gegen den süßen Duft."],
        ["Morgengrauen", "Du erwachst zwischen den Blüten", "Du liegst zwischen schwarzen Blüten im feuchten Moos. An deinen Namen erinnerst du dich: %NAME%. In deiner Hand regt sich Glut, und die Blüten in ihrer Nähe färben sich grau wie Asche."],
      ],
      szene: {
        place: "Schwarzgarten · Erntehaus", title: "Graue Blüten", objective: "Entscheide, wie du aufbrichst.",
        text: "Die Erntemeisterin zeigt dir die grauen Blüten. Seit am Eispass im Land der Menschen Asche fällt, verliert der Nektar an Kraft. Velasyr will wissen, was dort geschieht, bevor der Wurzelrat oder die Dornenklingen es erfahren. In Rankenhafen liegt ein Schmugglerboot bereit.",
        choices: [
          vorrat("Im Erntehaus Galgenwurz einstecken", "Zwischen Giftkräutern liegt ein Bündel harmloser Galgenwurz. Du steckst es ein."),
          auftrag("schattenbluete", "Für Velasyr nach Westen fahren",
            "Das Schmugglerboot bringt dich ungesehen über das Innere Meer. Nach Tagen erreichst du das Ackerland bei Kornwik."),
          eigen("Auf eigene Faust einen Platz auf dem Boot kaufen",
            "Du zahlst den Schmugglern selbst und schuldest Velasyr nichts. Nach Tagen erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
    staubreiter: {
      ort: "Ur-Taal", volk: "orks",
      prolog: [
        ["Staub und Rostsegel", "Die Staubreiter ziehen zwischen Oasen und Zeltstädten durch das westliche Ödland. Dornechsen tragen sie durch die Wüste, und ihre Rostsegel laufen von Zhar-Kesh zu Raubzügen auf der Westsee aus."],
        ["Vor Sonnenaufgang", "Der große Brunnen", "Am Brunnen von Ur-Taal drängen sich Herden und Zelte. Seit den Dürrejahren wird jeder Eimer Wasser gezählt."],
        ["Morgengrauen", "Du erwachst im Sand", "Du liegst im warmen Sand neben dem Brunnen. An deinen Namen erinnerst du dich: %NAME%. In deiner Hand regt sich Glut. Wo sie den Boden berührt, sickert Wasser aus dem trockenen Sand."],
      ],
      szene: {
        place: "Ur-Taal · Zelt der Karawane", title: "Wasser aus dem Sand", objective: "Entscheide, wie du aufbrichst.",
        text: "Die Ältesten der Karawane streiten, ob deine Gabe ein Segen ist. Händler aus Zhar-Kesh berichten von grauer Asche über der Westsee. Sie kommt vom Eispass im Land der Menschen. Wo Glut so stark erwacht, gibt es Beute oder Gefahr. Ein Rostsegler läuft nach Norden aus.",
        choices: [
          vorrat("Am Brunnen Galgenwurz eintauschen", "Eine Händlerin tauscht dir ein Bündel Galgenwurz gegen einen Schluck Brunnenwasser."),
          auftrag("staubreiter", "Mit dem Rostsegler der Karawane nach Norden fahren",
            "Der Rostsegler kreuzt über die Westsee nach Norden. An der Küste des Kronreichs gehst du an Land und erreichst nach Tagen das Ackerland bei Kornwik."),
          eigen("Allein auf einem Händlerschiff anheuern",
            "Du verlässt die Karawane ohne Abschied und heuerst auf einem Händlerschiff an. Nach Tagen erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
    aschenclan: {
      ort: "Aschenthron", volk: "orks",
      prolog: [
        ["Der Berg grollt", "Über Ghor-Mahr wacht der Aschenclan vom Aschenthron aus. Der Mutterberg grollt zum ersten Mal seit dem Aschenwinter, und Kriegshäuptling Kragh Schlackenherz ruft zur Rückkehr des Großbanners."],
        ["Nacht", "Glutspalten", "An den Flanken von Ghor-Mahr öffnen sich neue Glutspalten. Die Ahnenmutter hört im Berg ein Klopfen, das nicht von den Ahnen stammt."],
        ["Morgengrauen", "Du erwachst in der Asche", "Du liegst in warmer Asche am Fuß des Throns. An deinen Namen erinnerst du dich: %NAME%. In deiner Hand regt sich Glut, ruhig und gleichmäßig wie der Atem des Berges."],
      ],
      szene: {
        place: "Aschenthron · Ahnenfeuer", title: "Das Klopfen im Berg", objective: "Entscheide, wie du aufbrichst.",
        text: "Die Ahnenmutter ruft dich ans Ahnenfeuer. Die Glut in dir und das Grollen des Berges kommen aus derselben Tiefe, sagt sie. Fern im Norden fällt Asche auf den Eispass im Land der Menschen. Wer dort die Glut entfacht, könnte einen zweiten Aschenwinter bringen.",
        choices: [
          vorrat("Am Ahnenfeuer Galgenwurz als Wegzehrung nehmen", "Die Ahnenmutter legt dir ein Bündel Galgenwurz in die Hand."),
          auftrag("aschenclan", "Für die Ahnenmutter nach Norden gehen",
            "Ein Handelsschiff bringt dich über das Innere Meer nach Norden. Nach Tagen erreichst du das Ackerland bei Kornwik."),
          eigen("Dem Ruf zum Großbanner ausweichen und allein gehen",
            "Du verlässt den Aschenthron, bevor Kragh nach dir schicken kann. Nach Tagen auf See erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
    "gruene-banner": {
      ort: "Weitenlager", volk: "orks",
      prolog: [
        ["Die Weiten", "Die Grünen Banner ziehen mit ihren Herden über die südlichen Weiten. Über Grünmarkt handeln sie mit den Freien Häfen, während der Graue Pass sie vom Aschenclan trennt."],
        ["Vor Sonnenaufgang", "Herden im Nebel", "Im Weitenlager stehen die Zelte dicht an dicht. Die Hirten treiben die Herden früh hinaus, bevor der Wind vom Berg die Asche bringt."],
        ["Morgengrauen", "Du erwachst im Gras", "Du liegst im taunassen Gras am Rand des Lagers. An deinen Namen erinnerst du dich: %NAME%. In deiner Hand regt sich Glut. Als du ausatmest, richten sich die niedergedrückten Halme um dich auf."],
      ],
      szene: {
        place: "Weitenlager · Bannerzelt", title: "Ein Ruf aus Grünmarkt", objective: "Entscheide, wie du aufbrichst.",
        text: "Der Bannerführer des Lagers hat Nachricht aus Grünmarkt. Die Kornschiffe aus den Freien Häfen bleiben aus, weil im Land der Menschen Asche auf die Felder fällt. Ohne Korn wird der Winter für die Herden hart. Er sucht jemanden, der nach Norden fährt und herausfindet, was dort geschieht.",
        choices: [
          vorrat("Bei den Hirten Galgenwurz für den Weg holen", "Die Hirten geben dir ein Bündel Galgenwurz aus ihren Satteltaschen."),
          auftrag("gruene-banner", "Für die Grünen Banner nach Norden fahren",
            "Von Grünmarkt aus nimmt dich ein Handelsschiff der Freien Häfen mit über das Innere Meer. Nach Tagen erreichst du das Ackerland bei Kornwik."),
          eigen("Das Lager verlassen und der eigenen Glut folgen",
            "Du ziehst ohne Auftrag nach Grünmarkt und findest ein Schiff nach Norden. Nach Tagen erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
    "tiefes-koenigreich": {
      ort: "Zollburg", volk: "zwerge",
      prolog: [
        ["Der Hort der Sieben Häuser", "In Ambossheim regieren der Hochkönig und der Rat der Sieben Häuser. Über den Zollpass kontrolliert das Tiefe Königreich das Erz der Tiefgräber."],
        ["Nacht", "Am Zollpass", "Die Zollburg sperrt den Pass zwischen Ambossheim und den Minen. Jede Erzfuhre wird gewogen, gezählt und versiegelt."],
        ["Morgengrauen", "Du erwachst in der Wägekammer", "Du liegst zwischen Erzsäcken in der Wägekammer. An deinen Namen erinnerst du dich: %NAME%. In deiner Hand regt sich Glut, und das Erz in den Säcken beginnt warm zu leuchten."],
      ],
      szene: {
        place: "Zollburg · Wägekammer", title: "Erz, das glüht", objective: "Entscheide, wie du aufbrichst.",
        text: "Der Zollmeister misstraut dem leuchtenden Erz. Seit die Tiefgräber den Tiefen Stollen vorantreiben, steigt das Erzfieber. Händler berichten, dass im Land der Menschen am Eispass Glut aus der Erde bricht. Das Königreich will wissen, ob dort Erz zu holen ist, bevor Tiefgräber oder Runenschmiede davon erfahren.",
        choices: [
          vorrat("Aus der Zollkiste Galgenwurz für den Weg nehmen", "Der Zollmeister trägt das Bündel Galgenwurz sorgfältig ins Zollbuch ein."),
          auftrag("tiefes-koenigreich", "Mit einer versiegelten Erzfuhre nach Norden reisen",
            "Die Erzfuhre reist über die Häfen der Nachbarn nach Norden. Nach Tagen erreichst du das Ackerland bei Kornwik."),
          eigen("Den Zollpass ohne Siegel verlassen",
            "Du verlässt die Zollburg ohne Siegel und Auftrag. Nach Tagen auf See erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
    runenschmiede: {
      ort: "Essenfels", volk: "zwerge",
      prolog: [
        ["Die freie Gilde", "Von Essenfels aus betreibt die Runenschmiede ihre Schmieden und Runenwerkstätten. Auf der Funkeninsel erproben die Pulvermacher neue Mischungen."],
        ["Nachtschicht", "Die Essen von Essenfels", "In den Werkstätten von Essenfels brennen die Essen die ganze Nacht. Runenmeister prüfen jede Klinge mit der bloßen Hand."],
        ["Morgengrauen", "Du erwachst an der Esse", "Du liegst neben einer erkalteten Esse. An deinen Namen erinnerst du dich: %NAME%. In deiner Hand regt sich Glut, und die Runen auf dem Amboss neben dir leuchten im selben Takt."],
      ],
      szene: {
        place: "Essenfels · Runenwerkstatt", title: "Runen im Takt der Glut", objective: "Entscheide, wie du aufbrichst.",
        text: "Die Gildemeisterin erkennt das Muster sofort. Dieselben Runen hat die Gilde vor langer Zeit in Grenzsteine im Land der Menschen gesetzt, auch bei Kornwik. Jetzt melden Händler Asche am Eispass. Die Gilde will wissen, ob ihre alten Runen damit zu tun haben.",
        choices: [
          vorrat("Aus dem Werkstattschrank Galgenwurz gegen Brandwunden nehmen", "Die Gildemeisterin gibt dir ein Bündel Galgenwurz aus dem Werkstattschrank."),
          auftrag("runenschmiede", "Für die Gilde nach den alten Grenzsteinen sehen",
            "Von Nordtor bringt dich ein Gildenschiff über das Innere Meer. Nach Tagen erreichst du das Ackerland bei Kornwik."),
          eigen("Ohne Gildenbrief aufbrechen",
            "Du verlässt Essenfels ohne Gildenbrief und zahlst die Überfahrt selbst. Nach Tagen erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
    tiefgraeber: {
      ort: "Stollenmund", volk: "zwerge",
      prolog: [
        ["Unter der Meerenge", "Die Bergmannshäuser von Kluftheim suchen Erz und Tiefenglut. Von Stollenmund aus haben sie den Tiefen Stollen unter der Meerenge bis in Richtung Ghor-Mahr vorgetrieben. Mit jedem Fund werden die Beben stärker."],
        ["Schichtwechsel", "Die Festung am Stollen", "Am Stollenmund rattern die Förderkörbe. Aus der Tiefe dringt ein warmer Wind, der nach Schwefel riecht."],
        ["Morgengrauen", "Du erwachst im Stollen", "Du liegst am Ende eines Seitenstollens, die Grubenlampe neben dir ist erloschen. An deinen Namen erinnerst du dich: %NAME%. In deiner Hand regt sich Glut und zeigt dir den Weg nach oben."],
      ],
      szene: {
        place: "Stollenmund · Steigerstube", title: "Der warme Wind", objective: "Entscheide, wie du aufbrichst.",
        text: "Der Steiger hört dir zu und klopft auf die Karte des Tiefen Stollens. In derselben Nacht hat die Erde gebebt, und fern im Land der Menschen fällt Asche am Eispass. Die Tiefgräber wollen wissen, ob die Glut dort aus derselben Ader stammt, bevor das Königreich den Stollen schließen lässt.",
        choices: [
          vorrat("In der Steigerstube Galgenwurz aus dem Grubenkasten nehmen", "Im Grubenkasten liegt ein Bündel Galgenwurz für Verletzte. Der Steiger nickt dir zu."),
          auftrag("tiefgraeber", "Für die Tiefgräber der Ader nachgehen",
            "Von Erzhafen aus fährst du mit einem Erzschiff über das Innere Meer nach Norden. Nach Tagen erreichst du das Ackerland bei Kornwik."),
          eigen("Den Stollen verlassen und allein aufbrechen",
            "Du gibst deine Grubenmarke ab und gehst in Erzhafen an Bord. Nach Tagen erreichst du das Ackerland bei Kornwik."),
        ],
      },
    },
  };

  // Gemeinsame Ankunft aller Fraktionen außer dem Kronreich. Die Wahl je Herkunft entspricht den
  // Vorteilen aus dem Erwachen in Kornwik, damit alle Fraktionen dieselben Startvorteile behalten.
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

  const scenes = { ankunft };
  const storageSites = {};
  const prologe = {};
  for (const [id, start] of Object.entries(fraktionen)) {
    if (!start.prolog) continue;
    const key = "heim-" + id;
    const [ort] = start.szene.place.split(" · ");
    scenes[key] = { ...start.szene, fern: start.ort, lager: key,
      choices: start.szene.choices.map((choice) => ({ to: key, ...choice })) };
    storageSites[key] = "Zentrallager · " + ort;
    const [[title, text], ...rest] = start.prolog;
    prologe[id] = [
      { image: "start/kontinent-" + start.volk + ".jpg", location: "Odris · " + kontinente[start.volk], title, text, duration: 6200 },
      ...rest.map(([zeit, slideTitle, slideText], index) => ({
        image: "start/ort-" + id + ".jpg", location: start.ort + " · " + zeit, title: slideTitle, text: slideText,
        duration: index ? 7300 : 6500, showPortrait: index === 1,
      })),
    ];
    start.szene = key;
  }
  const szene = (faction) => fraktionen[faction]?.szene ?? "wake";
  const ort = (faction) => fraktionen[faction]?.ort ?? "Kornwik";
  return { fraktionen, scenes, storageSites, prologe, szene, ort };
})();
