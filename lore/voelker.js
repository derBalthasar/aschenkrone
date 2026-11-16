"use strict";

const lorePeoples = [
  {
    "id": "menschen",
    "name": "Menschen",
    "history": "Die Menschen des Nordwestens führen ihre Herkunft auf Flüchtlinge aus Vaelthar zurück. Ihre Langhäuser, Sagas, Runensteine und das Thing verbinden sie bis heute. Das Alte Reich zerbrach nach der Langen Nacht. Jetzt ringen Landadel, Glauben und Seehandel um Einfluss.",
    "factions": [
      {
        "name": "Kronreich",
        "capital": "Kronhall",
        "description": "Von Kronhall aus herrscht die Krone über das fruchtbare Binnenland. Korn, Pferde und schwere Reiterei tragen das Reich. Die ungeklärte Thronfolge stellt den Zusammenhalt des Adels auf die Probe.",
        "cities": [
          "Hagenfels",
          "Haraldstad",
          "Kornwik",
          "Rosshag",
          "Eikmark",
          "Steinwacht",
          "Ulfsborg",
          "Heidvang",
          "Westvik (Hafen)",
          "Sandvik (Hafen)"
        ]
      },
      {
        "name": "Orden der Flamme",
        "capital": "Glutberg",
        "description": "In Glutberg wacht der Ritterorden über die Ewige Flamme. Der Orden verbindet Glauben und Flammenrunen, schützt die Nordpässe und sucht nach Spuren des Kults der Bleichen Ewigkeit.",
        "cities": [
          "Aschenkloster",
          "Eiswacht (am Eispass)",
          "Nordwacht (Hafen)",
          "Glutvik (Hafen)",
          "Sigrunsheim",
          "Brandstein",
          "Flammenhof",
          "Thorvaldsklipp",
          "Wachtfeuer",
          "Lichtheim"
        ]
      },
      {
        "name": "Freie Häfen",
        "capital": "Perlvik (Hafen)",
        "description": "Perlvik und das Hafenthing führen ein Bündnis von Handelsstädten. Seine Flotte verbindet die Küsten und kontrolliert den Zoll auf den Inseln im Inneren Meer. Zwergisches Schwarzpulver stärkt seine Schiffe.",
        "cities": [
          "Salzwacht (Hafen, Kriegshafen und Werft)",
          "Zollholm (Hafen, auf den Zollinseln)",
          "Grenzmarkt (am Pass)",
          "Möwenstad (Hafen)",
          "Bernsvik (Hafen)",
          "Ankerfjord (Hafen)",
          "Skerheim (Hafen)",
          "Tranvik (Hafen)",
          "Silberholm (Hafen)",
          "Nebelvik (Hafen)"
        ]
      }
    ]
  },
  {
    "id": "untote",
    "name": "Untote",
    "history": "Jenseits des Nordmeers liegen die Ruinen der Aethari und Vaelthars. Drei Reiche überdauern dort mit drei Arten von Unsterblichkeit. Die Bleiche Krone braucht Körper, die Erinnernden Blut und die Fäulnisbrut lebendes Fleisch. Seit dem Krieg der Drei hält ein brüchiger Waffenstillstand.",
    "factions": [
      {
        "name": "Hof der Bleichen Krone",
        "capital": "Palast der Tausend Stimmen",
        "description": "Aldric Vaelthar III., der König ohne Morgen, herrscht vom Palast der Tausend Stimmen. Geister führen dort das alte Hofleben fort. In den Menschenlanden wirbt der Kult der Bleichen Ewigkeit mit dem Versprechen, als Draugr zurückzukehren.",
        "cities": [
          "Seelenhafen (Hafen)",
          "Totenwacht (Hafen)",
          "Draugrsund (Hafen)",
          "Aldricsruh",
          "Morvaen",
          "Caldrith",
          "Nebelkrone",
          "Velmora",
          "Kaltthron",
          "Stillmark"
        ]
      },
      {
        "name": "Die Erinnernden",
        "capital": "Eryndor",
        "description": "Die vampirischen Adelshäuser der Aethari hüten ihre Bibliotheken und den versiegten Blutbrunnen von Eryndor. Aus getrunkenem Blut gewinnen sie fremde Erinnerungen. Alte Vampire verlieren mit der Zeit den Überblick darüber, welche Erinnerungen ihnen selbst gehören.",
        "cities": [
          "Rubinhafen (Hafen)",
          "Schattmund (Hafen)",
          "Aethmar",
          "Sanguinor",
          "Velaryth",
          "Nachtquell",
          "Karmesin",
          "Lysandra",
          "Morgenlos",
          "Rotmoor"
        ]
      },
      {
        "name": "Fäulnisbrut",
        "capital": "Tempel der Fleischaltäre",
        "description": "Am Tempel der Fleischaltäre sammelt Morthan Vel die Fäulnisbrut. Sie erhält ihre Körper durch fremdes lebendes Gewebe. In verseuchtem Land können Gefallene als Gebundene aufstehen.",
        "cities": [
          "Faulhafen (Hafen)",
          "Rottwasser (Hafen)",
          "Schwarzbrack (Hafen)",
          "Morthansgrab",
          "Madenmoor",
          "Schwärenstadt",
          "Gärgrube",
          "Pulsheim",
          "Fleischfurt",
          "Sporenwald"
        ]
      }
    ]
  },
  {
    "id": "elfen",
    "name": "Elfen",
    "history": "Der östliche Kontinent trägt den Weltenbaum. Er schenkt den Elfen ein langes Leben, doch er welkt seit rund zwei Jahrhunderten. Das Gesetz der Wurzel verbietet es, fremdes Leben für das eigene zu stehlen. Die drei Fraktionen streiten darüber, wie weit sie zur Rettung des Baums gehen dürfen.",
    "factions": [
      {
        "name": "Dornenklingen",
        "capital": "Hochdorn",
        "description": "Von Hochdorn aus halten die Dornenklingen das Nordkap und den Dornwall. Sie bekämpfen die Fäulnis mit Waffen und Feuer und haben sich vom Wurzelrat losgesagt.",
        "cities": [
          "Nordkap (Hafen)",
          "Fjaelin (Hafen)",
          "Isgaril (Hafen)",
          "Thalvaren",
          "Sylmarith",
          "Dornwacht (am Dornwall)",
          "Hirschfurt (in der Hirschsteppe)",
          "Elvaris",
          "Kaelthorn",
          "Winddorn"
        ]
      },
      {
        "name": "Hüter des Weltenbaums",
        "capital": "Ylvenor",
        "description": "Die Hüter leben im alten Wald. Ylvenor liegt im Geäst des Weltenbaums. Wer von außerhalb mit den Hütern Handel treiben will, legt am Laubmarkt an. Die Hüter vertrauen auf die Magie des Baumes und halten Fremde von seinen heiligen Hainen fern.",
        "cities": [
          "Laubmarkt (Hafen)",
          "Wurzelhalle",
          "Lothrael",
          "Ilvanar",
          "Mirendel",
          "Saftquell",
          "Eldaris",
          "Rindenhain",
          "Silvaneth",
          "Aranwe"
        ]
      },
      {
        "name": "Schattenblüte",
        "capital": "Velasyr",
        "description": "Die Verbannten um Velasyr leben in den südlichen Sümpfen und Wäldern. Ihre schwarzen Blüten liefern einen Nektar, der ihr Leben verlängert. Gifte, Schmuggel und geheime Abkommen sichern ihren Einfluss.",
        "cities": [
          "Rankenhafen (Hafen)",
          "Lysvar (Hafen)",
          "Thessalyn (Hafen)",
          "Nebelmarsch",
          "Velnora",
          "Saelyss",
          "Mondkelch",
          "Giftgrund",
          "Schwarzgarten (am Schwarzen Garten)",
          "Irrlicht"
        ]
      }
    ]
  },
  {
    "id": "orks",
    "name": "Orks",
    "history": "Im Südwesten liegt Ghor-Mahr, der Mutterberg der Orks. Der Aschenwinter nach seinem letzten großen Ausbruch zerbrach das Großbanner. Rang verdient man durch Taten im Kampf, in der Jagd oder im Handel. Die Orks verbrennen ihre Toten und glauben, dass ehrenhaft Gefallene bei den Ahnen des Mutterbergs weiterleben.",
    "factions": [
      {
        "name": "Staubreiter",
        "capital": "Zhar-Kesh (Hafen)",
        "description": "Die Staubreiter ziehen zwischen Oasen und Zeltstädten durch das westliche Ödland. Dornechsen tragen sie durch die Wüste, ihre Rostsegel laufen von Zhar-Kesh zu Raubzügen auf der Westsee aus.",
        "cities": [
          "Ur-Taal (an der großen Oase)",
          "Knochenholm (Hafen, auf den Knocheninseln)",
          "Rostbucht (Hafen)",
          "Skarrak (Hafen)",
          "Glasfurt (an der Glasebene)",
          "Vash-Mor",
          "Sandzahn",
          "Dorn-Ghul",
          "Durstlager",
          "Khesh-Ura"
        ]
      },
      {
        "name": "Aschenclan",
        "capital": "Aschenthron",
        "description": "Über Ghor-Mahr wacht der Aschenclan vom Aschenthron aus. Er beansprucht das Erbe des Großbanners. Ahnenrufer hören den Berg wieder grollen, während die Krieger um die Führung ringen.",
        "cities": [
          "Schlackenhall (bei den Schlackenschmieden)",
          "Graupass (am Grauen Pass)",
          "Ghor-Dum",
          "Krakhal",
          "Obsidianfels",
          "Lavagrund",
          "Brandmal",
          "Urzhagstor",
          "Kraterwacht",
          "Rauchkluft"
        ]
      },
      {
        "name": "Grüne Banner",
        "capital": "Kragmar",
        "description": "Die Grünen Banner ziehen mit ihren Herden über die südlichen Weiten. Kragmar ist ihr Bannerhügel. Über Grünmarkt handeln sie mit den Freien Häfen, während der Graue Pass sie vom Aschenclan trennt.",
        "cities": [
          "Grünmarkt (Hafen)",
          "Mog-Tash (Hafen)",
          "Zarguth (Hafen)",
          "Hornfurt",
          "Grenzwall",
          "Dhurak",
          "Gharn",
          "Rukmar",
          "Weitenlager",
          "Sturrak"
        ]
      }
    ]
  },
  {
    "id": "zwerge",
    "name": "Zwerge",
    "history": "Die Zwerge des Südostens verbinden Bergbau, Schmiedekunst und Handel. Ihre Häuser halten Eide und Schulden über Generationen im Schuldbuch fest. Sie bestatten ihre Toten in versiegelten Ahnenhallen. Der Erzabbau unter der Meerenge verschärft den alten Konflikt mit den Orks.",
    "factions": [
      {
        "name": "Tiefes Königreich",
        "capital": "Ambossheim",
        "description": "In Ambossheim regieren der Hochkönig und der Rat der Sieben Häuser. Die Königsbank verwahrt den Hort. Über den Zollpass kontrolliert das Königreich das Erz der Tiefgräber. Für Fernhandel ist es auf die Häfen der Nachbarn angewiesen.",
        "cities": [
          "Zollburg (am Zollpass)",
          "Gundarsheim",
          "Silberkuppe",
          "Felsenhort",
          "Goldtiefe",
          "Eisenwacht",
          "Siebenhäuser",
          "Kristallgrund",
          "Hochwarte",
          "Granitheim"
        ]
      },
      {
        "name": "Runenschmiede",
        "capital": "Essenfels",
        "description": "Von Essenfels aus betreibt die freie Gilde Schmieden und Runenwerkstätten. Nordtor verbindet sie mit den Elfen. Auf der Funkeninsel erproben die Pulvermacher ihre neuen Mischungen.",
        "cities": [
          "Nordtor (Hafen)",
          "Messinghafen (Hafen)",
          "Funkenhafen (Hafen, auf der Funkeninsel)",
          "Köhlerheim (im Kohlenwald)",
          "Hammerstatt",
          "Runenstein",
          "Glutesse",
          "Pulverhall",
          "Donnerfels",
          "Zunftberg"
        ]
      },
      {
        "name": "Tiefgräber",
        "capital": "Kluftheim",
        "description": "Die Bergmannshäuser von Kluftheim suchen Erz und Tiefenglut. Von Stollenmund aus haben sie den Tiefen Stollen unter der Meerenge bis in Richtung Ghor-Mahr vorgetrieben. Die Arbeit bringt reiche Funde und immer stärkere Beben.",
        "cities": [
          "Erzhafen (Hafen)",
          "Salzbucht (Hafen)",
          "Westhort (Hafen)",
          "Stollenmund (Festung am Tiefen Stollen)",
          "Altmin (bei den Alten Minen)",
          "Kornfurt (in der Kornsteppe)",
          "Kupferkluft",
          "Lampenheim",
          "Tiefenwacht",
          "Rußtal"
        ]
      }
    ]
  }
];
