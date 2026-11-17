# Klassensystem – Alle Völker und Fraktionen

Vorgabe von Henry, 17. 11. 2026. Die Spieldaten stehen in `spiel/klassen.js`, das Weltbuch zeigt sie unter „Klassensystem“.

Jeder Held gehört zu einer von sechs Grundklassen, die es in allen 15 Fraktionen gibt: Krieger, Wächter, Späher, Magier, Heiler/Priester und Schurke. Jede Fraktion gibt jeder Klasse einen eigenen Namen, eine eigene Spielweise und eine eigene Art, die Fraktionsressource zu nutzen. So bleibt das System ausgewogen, und trotzdem spielt sich ein Huskarl des Kronreichs ganz anders als ein Aschenkrieger.

## Grundregeln

Jeder Held hat zwei Ebenen von Werten: fünf Grundwerte (Talent, bei der Charakterwahl festgelegt) und sieben Fertigkeiten (Ausbildung, 0 bis 5). Die Grundwerte bestimmen, wie hoch eine Fertigkeit steigen kann.

1. **Grundwerte.** Stärke, Geschick, Intelligenz, Willenskraft und Charisma. Jeder startet bei 10. Volk, Fraktion und Klasse geben Bonus und Malus, die sich addieren. Danach verteilt der Spieler 5 freie Punkte. Kein Grundwert darf über 20 steigen.
2. **Gleich viel für alle.** Jedes Volk gibt unterm Strich +2, jede Fraktion +1, jede Klasse +2. Jeder neue Held hat damit zusammen 60 Punkte in seinen Grundwerten, egal was er wählt.
3. **Fertigkeiten.** Nahkampf, Fernkampf, Magie, Verteidigung, List, Führung und Mut, Skala 0 bis 5, zusammen 18 Punkte wie bei den Fraktionen. Jede Fertigkeit hängt an einem Grundwert.
4. **Grundwert begrenzt die Fertigkeit.** Grundwert bis 7 erlaubt höchstens 2, 8 bis 11 höchstens 3, 12 bis 15 höchstens 4, ab 16 die volle 5. Ein kluger Magier kann also Magie 5 erreichen, ein ungeschickter Krieger kaum Fernkampf 5.
5. **Zwei Hauptfertigkeiten.** Jede Klasse legt zwei Fertigkeiten fest, die mindestens 3 haben müssen.
6. **Magie nur, wo es sie gibt.** Hat eine Fraktion Magie 0, haben auch ihre Helden Magie 0. Das betrifft Kronreich und Freie Häfen.
7. **Ressource.** Jede Klasse verbraucht oder erzeugt die Ressource ihrer Fraktion auf eigene Weise.
8. **Spezialisierung ab Quest-Stufe 3.** Hat die eigene Fraktion Stufe 3 ihrer Hauptquest erreicht, wählt jeder Held eine von zwei Spezialisierungen seiner Klasse: Titel, neue Fähigkeit, +1 Fertigkeitspunkt (19) und +1 Grundwert. Die Wahl gilt für immer.
9. **Meisterklasse nach der Vereinigung.** Ein spezialisierter Held kann zur Meisterklasse seines Volkes aufsteigen: +1 Fertigkeitspunkt (20), +2 Grundwerte, alle drei Ressourcen aus dem gemeinsamen Vorrat. Höchstens ein Meisterheld pro ehemaliger Fraktion.
10. **Der Kult ist keine Klasse.** Der Kult der Bleichen Ewigkeit bleibt nicht spielbar. Ein Held kann ihm aber durch Ereignisse verfallen. Ein Held behält seine Klasse sein Leben lang, auch nach der Vereinigung.

## Welche Fertigkeit an welchem Grundwert hängt

| Fertigkeit | Grundwert | Wofür |
| --- | --- | --- |
| Nahkampf | Stärke | Schaden mit Klinge, Axt, Hammer |
| Fernkampf | Geschick | Bogen, Armbrust, Büchse, Wurfwaffen |
| Magie | Intelligenz | Zauber und Rituale |
| Verteidigung | Willenskraft | Halten, Blocken, Durchhalten |
| List | Geschick | Schleichen, Spionage, Fallen |
| Führung | Charisma | Heere führen, verhandeln, überzeugen |
| Mut | Willenskraft | Widerstand gegen Furcht, Flüche und den Kult |

## Was die Grundwerte direkt bewirken

Grundwerte wirken auch direkt im Spiel, nicht nur über die Grenzen der Fertigkeiten. Es gibt drei Stufen: Ein Wert von 8 oder weniger gibt −1, 16 bis 19 geben +1 und 20 gibt +2. Dazwischen gibt es weder Bonus noch Malus.

| Grundwert | Wirkt auf |
| --- | --- |
| Stärke | Schaden im Nahkampf und Tragkraft (Beute, Ausrüstung) |
| Geschick | Schaden im Fernkampf und Ausweichen, ab 20 auch +1 Feld Bewegung |
| Intelligenz | Zauber und Fähigkeiten kosten so viel weniger Ressource (mindestens 1), außerdem Fallen und Hinterhalte erkennen |
| Willenskraft | Widerstand gegen Furcht, Flüche, Gift und Verführung durch den Kult |
| Charisma | Verhandlungen und Ansehen, ab 16 kosten Rekruten und Söldner außerdem 10 % weniger (ab 20: 20 %) |

## Grundwerte: Bonus und Malus

Bei der Charakterwahl stehen die Werte aus Volk, Fraktion und Klasse sofort als Grundwerte da. Leere Felder bedeuten 0.

### Volk (unterm Strich +2)

| Volk | Stärke | Geschick | Intelligenz | Willenskraft | Charisma | Begründung |
| --- | --- | --- | --- | --- | --- | --- |
| Menschen |  |  |  |  | +1 | Vielseitig: dazu +1 auf einen Grundwert nach Wahl, kein Malus |
| Untote | +1 |  |  | +2 | −1 | Kennen keinen Schmerz, wirken aber abschreckend |
| Elfen | −1 | +2 | +1 |  |  | Schnell und alt an Wissen, aber zierlich |
| Orks | +3 |  | −1 | +1 | −1 | Das stärkste Kriegervolk, rau im Umgang |
| Zwerge | +1 | −1 | +1 | +2 | −1 | Zäh, kundig im Handwerk, stur und schwerfällig |

### Fraktion (unterm Strich +1)

| Fraktion | Stärke | Geschick | Intelligenz | Willenskraft | Charisma |
| --- | --- | --- | --- | --- | --- |
| Kronreich | +1 |  | −1 |  | +1 |
| Freie Häfen |  | +1 |  | −1 | +1 |
| Orden der Flamme |  | −1 | +1 | +2 | −1 |
| Fäulnisbrut | +2 |  | −1 |  |  |
| Hof der Bleichen Krone | −1 |  | +1 |  | +1 |
| Die Erinnernden |  | +1 | +1 | −2 | +1 |
| Dornenklingen | +1 | +1 |  |  | −1 |
| Schattenblüte |  | +1 |  | −1 | +1 |
| Hüter des Weltenbaums |  | −1 | +2 |  |  |
| Grüne Banner |  | −1 |  | +1 | +1 |
| Staubreiter |  | +2 |  | −1 |  |
| Aschenclan | +1 |  |  | +1 | −1 |
| Tiefes Königreich |  | −1 |  | +1 | +1 |
| Tiefgräber | +2 |  |  |  | −1 |
| Runenschmiede | −1 |  | +2 |  |  |

Der Malus der Erinnernden auf Willenskraft passt zu ihrer Schwäche: Wer viel fremdes Blut trinkt, verliert leichter sich selbst. Der Hof der Bleichen Krone ist körperlos und daher schwächer in Stärke.

## Die sechs Grundklassen

Jede Klasse gibt Bonus und Malus auf die Grundwerte (unterm Strich +2) und legt zwei Hauptfertigkeiten fest. Wo es keine Magie gibt, tauschen Magier und Heiler beides.

| Klasse | Rolle in der Heldengruppe | Grundwerte | Hauptfertigkeiten (mind. 3) |
| --- | --- | --- | --- |
| Krieger | Schaden im Nahkampf, führt den Angriff an | Stärke +2, Willenskraft +1, Intelligenz −1 | Nahkampf, Mut |
| Wächter | Hält Stellungen, schützt Gruppe und Festungen | Willenskraft +2, Stärke +1, Geschick −1 | Verteidigung, Führung |
| Späher | Aufklärung, Fernkampf, schnelle Bewegung | Geschick +2, Intelligenz +1, Stärke −1 | Fernkampf, List |
| Magier | Zauber, Flächenschaden, große Rituale | Intelligenz +3, Stärke −1 | Magie, Mut |
| Heiler/Priester | Heilt, stärkt die Moral, wehrt Flüche ab | Willenskraft +2, Charisma +1, Stärke −1 | Magie, Führung |
| Schurke | Spionage, Sabotage, Attentate | Geschick +2, Charisma +1, Willenskraft −1 | List, Nahkampf |
| Skalde (Kronreich, statt Magier) | Lieder und Sagas, hebt die Moral | Charisma +2, Intelligenz +1, Stärke −1 | Führung, Mut |
| Pulvermeister (Freie Häfen, statt Magier) | Sprengladungen und Geschütze | Intelligenz +2, Geschick +1, Stärke −1 | Fernkampf, Mut |
| Feldscher, Schiffsarzt (statt Heiler) | Heilt mit Kräutern und Wissen | Intelligenz +2, Charisma +1, Stärke −1 | Mut, Führung |

Bei Elfen, Orks und Zwergen sind die drei Magierklassen eines Volkes genau die drei Schulen, die das große Ritual nach der Vereinigung brauchen. Ohne diese Helden kann das Ritual nicht stattfinden. Grüner Gesang (Dornweber, Nebelweber, Baumsänger), Ahnenfeuer (Erdsänger, Windseher, Aschenrufer), Siegelrune (Steinsprecher, Erzspürer, Runenmeister).

## Menschen

Nur der Orden der Flamme wirkt Magie. Kronreich und Freie Häfen ersetzen Magier und Heiler durch Skalden, Pulvermeister, Feldscher und Schiffsärzte. Namen und Titel bleiben nordisch.

### Kronreich (leicht) · Ressource Korn

| Klasse | Name | Spielweise | Nutzt Korn | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Huskarl | Leibgarde mit Axt und Schild, stark im ersten Ansturm | Festmahl vor der Schlacht: Korn ausgeben für +1 Nahkampf in dieser Schlacht | Königsrecke: begleitet einen Anführer, der dann nicht fallen kann, solange der Recke steht | Sturmhuskarl: sein erster Angriff in jeder Schlacht richtet doppelten Schaden an |
| Wächter | Burgvogt | Hält Burgen und Grenzburgen, Landwehr in der Nähe kämpft besser | Vorratskammer: eine belagerte Burg verliert kein Korn | Grenzgraf: zwei Grenzburgen gleichzeitig verteidigen | Belagerungsmeister: führt Katapulte und Ballisten, feindliche Mauern fallen schneller |
| Späher | Steppenreiter | Leichter Reiter der Südsteppe, schnell und weitsichtig | Zieht ohne Tross: zwei Runden ohne Kornverbrauch | Steppenjäger: deckt feindliche Heere in drei Feldern Umkreis auf | Pferdeherr: alle Reiter in seinem Heer bewegen sich ein Feld weiter |
| Magier | Skalde | Keine Magie: Sagas und Kriegslieder heben die Moral und lähmen den Feind | Erntelied: Kornertrag einer Provinz drei Runden +20 % | Sagenmeister: eine gewonnene Schlacht hebt die Moral aller Heere des Kronreichs | Thingredner: überzeugt einen Jarl oder eine andere Menschenfraktion, Ansehen steigt schneller |
| Heiler | Feldscher | Keine Magie: Kräuter und Verbände, heilt nach der Schlacht | Heilt verwundete Einheiten gegen Korn statt durch Ruhe | Kräutermeister: senkt den Kultwert einer Provinz durch Pflege der Kranken | Lazarettmeister: nach jeder Schlacht kehrt ein Teil der Gefallenen verwundet zurück |
| Schurke | Kanzleispitzel | Dient Kanzler Ulf Grau, späht Jarle und Nachbarn aus | Kornschmuggel: stiehlt Korn aus feindlichen Provinzen | Graue Hand: deckt einen Draugr oder Kultisten am Hof auf | Kornfeuer: brennt feindliche Speicher nieder, der Feind verliert Nahrung |

### Freie Häfen (mittel) · Ressource Gold

| Klasse | Name | Spielweise | Nutzt Gold | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Enterhauptmann | Führt Seesoldaten mit Axt und Handbüchse ins Entern | Prisengeld: jedes geenterte Schiff bringt Gold | Kaperfahrer: übernimmt geenterte Schiffe in die eigene Flotte | Seewolf: kämpft an Küsten und auf Deck mit +1 Nahkampf und landet ohne Malus |
| Wächter | Zollhauptmann | Schützt Häfen, Zollinseln und Handelsrouten | Zollkette: ein Hafen bringt mehr Gold und kann für Feinde gesperrt werden | Admiral der Salzwacht: Flotten in seiner Nähe verteidigen sich besser | Handelsherr: jeder Handelsvertrag in seiner Stadt bringt 25 % mehr Gold |
| Späher | Seeschütze | Büchsenschütze an Deck und an Land | Gekauftes Pulver: Gold ausgeben für eine doppelte Salve | Scharfschütze: kann einen feindlichen Helden gezielt verwunden | Kartenleser: seine Flotte fährt ein Feld weiter und findet Schleichwege durch die Zollinseln |
| Magier | Pulvermeister | Keine Magie: Sprengladungen und Geschütze, gebaut mit den Zwergen | Jede Ladung kostet Gold, wirkt aber wie ein Flächenzauber | Kanonenmeister: Geschütze in seinem Heer schießen ein Feld weiter | Minenleger: legt Seeminen und Sprengfallen in Häfen und Pässen |
| Heiler | Schiffsarzt | Keine Magie: heilt mit Kräutern der Elfen und Wissen aus allen Häfen | Kauft Heilmittel: Heilung gegen Gold, auch auf See | Seuchenarzt: schützt eine Hafenstadt vor Fäulnissporen | Kompaniearzt: heilt Söldner jedes Volkes, Söldner kosten weniger Gold |
| Schurke | Schattenklinge | Spion und Attentäter der Stillen Feder | Bestechung: Wachen, Kapitäne und Beamte kaufen | Federmeister: führt ein Netz, das jede feindliche Stadt ausspähen kann | Giftmischerin: kann einen feindlichen Anführer vergiften |

### Orden der Flamme (schwer) · Ressource Glaube

| Klasse | Name | Spielweise | Nutzt Glaube | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Flammenritter | Paladin mit Flammenrunen, Elite gegen Untote | Entzündet die Runen: Glaube ausgeben für Feuerschaden im Nahkampf | Glutklinge: Untote, die er tötet, können nie wieder aufstehen | Bußritter: führt Bußgänger an, die in seiner Nähe nie fliehen |
| Wächter | Nordwächter | Hält die Leuchtturmfestungen der Nordwacht | Heilige Flamme: Geister können die Mauern seiner Festung nicht durchqueren | Leuchtturmherr: sieht Geisterflotten auf dem Nordmeer, bevor sie landen | Eispasswächter: kein Feind zieht ohne Schlacht über den Eispass |
| Späher | Bergschütze | Armbrustschütze aus den Gebirgsdörfern | Brandbolzen: Glaube ausgeben für Feuerschaden auf Distanz | Brandschütze: setzt verseuchtes Land in Brand und stoppt die Fäulnis dort | Gipfeljäger: schießt von Bergen aus ein Feld weiter |
| Magier | Feuerpriester | Kampfmagier mit Flammensäulen und Feuerwänden | Jeder Zauber kostet Glaube, Siege füllen ihn wieder | Flammenrufer: ein Flächenzauber pro Schlacht kostet keinen Glauben | Runenpriester: schneidet Flammenrunen in die Waffen seiner Gruppe |
| Heiler | Glutheiler | Brennt Wunden mit heiligem Feuer aus | Heilende Glut: Heilung gegen Glauben, heilt auch Flüche | Seherin: Seherblick, deckt Hinterhalte und getarnte Feinde auf | Aschenmutter: heilt nach der Schlacht ganze Einheiten, jede Heilung bringt Glauben |
| Schurke | Aschenspürer | Jäger des Kults, arbeitet verdeckt in Städten | Verhör im Feuer: Glaube ausgeben, um einen Kultisten zu entlarven | Kultbrecher: zerschlägt eine Kultzelle und senkt den Kultwert stark | Draugrjäger: erkennt einen Draugr und treibt den Geist von Vaelthar aus dem Körper |

### Meisterklasse: Bannerjarl

Nach der Vereinigung unter einem Banner (Bonus „Das Alte Reich“) kann je ein Held aus Kronreich, Häfen und Orden zum Bannerjarl aufsteigen. Er nutzt Korn, Gold und Glauben aus dem gemeinsamen Vorrat. Fähigkeit „Ein Banner“: Sein Heer darf Einheiten aller drei Fraktionen mischen, ohne Moral zu verlieren, und er kann einmal pro Schlacht eine Einheit einer anderen Menschenfraktion zu Hilfe rufen. Ein Bannerjarl aus Kronreich oder Häfen bleibt ohne Magie.

## Untote

Untote Helden brauchen keine Nahrung, verhandeln aber mit niemandem. Jede Klasse hängt an ihrer Ressource: Ohne Fleisch zerfallen die Helden der Fäulnisbrut, ohne Blut verfallen die Erinnernden in Raserei.

### Fäulnisbrut (leicht) · Ressource Fleisch

| Klasse | Name | Spielweise | Nutzt Fleisch | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Flickhüne | Zusammengeflickte Kreatur, wächst mit jedem Kampf | Frisst Fleisch, um sich zu heilen und größer zu werden | Monstrum: kann ein Feld zerstörter Mauern niedertrampeln | Fleischberg: trägt Gebundene in sich, die bei seinem Fall herausbrechen und weiterkämpfen |
| Wächter | Fäulnishüter | Hält verseuchtes Land und die Fleischaltäre | Fleischwall: Fleisch ausgeben für einen lebenden Wall | Altarwächter: sein Altar verliert kein Fleisch durch Verfall | Sumpfherr: verseuchtes Land in seiner Provinz verlangsamt jeden Feind um ein Feld |
| Späher | Sporenläufer | Schnell, trägt Sporen in fremdes Land | Braucht kaum Fleisch, verseucht aber jedes Feld, das er betritt | Seuchenbote: die Fäulnis breitet sich um ihn zwei Felder pro Runde aus | Aaskundschafter: sieht durch die Augen aller Gebundenen in drei Feldern Umkreis |
| Magier | Fleischformer | Opfermagie, formt Gefallene zu neuen Kreaturen | Formt aus Fleisch neue Gebundene | Opferpriester: ein geopferter Gefangener füllt das Fleisch stark auf | Kreaturenschmied: formt aus vielen Gefallenen eine einzige große Kreatur |
| Heiler | Fleischnäher | Näht Einheiten mit fremdem Fleisch zusammen | Heilung kostet Fleisch, wirkt aber sofort | Lebensflicker: kann für eine Runde einen Untoten fast lebendig machen (spürt Sonne, fühlt Schmerz) | Wundnäher: Heilung kostet nur halb so viel Fleisch |
| Schurke | Seuchenträger | Schleicht als Kranker in Städte | Trägt Fleischreste, die Brunnen und Kornspeicher verderben | Brunnenvergifter: eine ganze Stadt erkrankt, wer dort stirbt, wird Gebundener | Kornfäule: verdirbt Ernten, das Korn des Feindes sinkt |

### Hof der Bleichen Krone (mittel) · Ressource Seelen

| Klasse | Name | Spielweise | Nutzt Seelen | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Spektralritter | Geisterritter mit Klingen, die durch Rüstung gleiten | Seelen ausgeben, um Rüstung zu ignorieren | Ritter ohne Morgen: kehrt einmal pro Schlacht nach dem Fall zurück | Geisterreiter: führt eine Geisterreiterei, die über Wasser reitet |
| Wächter | Kronwächter | Bewacht Aldrics Krone und die Festungen von Vaelthar | Seelenschild: Seelen fangen Schaden für die Gruppe ab | Ehrengarde des Lichkönigs: solange er steht, kann die Krone nicht geraubt werden | Gruftherr: Geister in seiner Festung heilen jede Runde vollständig |
| Späher | Erscheinung | Körperlos, geht durch Mauern, überquert ein Wasserfeld | Jede Erkundung einer lebenden Stadt bringt eine Seele | Nebelgeist: unsichtbar, bis er angreift | Spukgestalt: senkt die Moral einer feindlichen Stadt, dort steigt der Kultwert |
| Magier | Lichmagier | Seelenmagie und Illusion | Jeder Zauber kostet Seelen | Seelenbinder: bindet die Seele eines gefallenen Helden als Geist an die Krone | Trugmeister: lässt den Feind ein Heer sehen, das nicht da ist |
| Priester | Seelenhirte | Führt die Geister von Vaelthar, stärkt ihre Erinnerung | Gibt Seelen an Geister zurück und heilt sie so | Hüter der Erinnerung: Geister in seiner Nähe verlieren nie ihren Verstand | Totenruf: ruft einmal pro Schlacht gefallene Geister zurück |
| Schurke | Draugr | Vaelthar-Geist im Körper eines Kultisten, unterwandert lebende Reiche | Jeder neue Draugr bringt Seelen, der Kultwert steigt schneller | Bleicher Herold: übernimmt einen Jarl, Ratsherrn oder Priester | Grabflüsterer: gründet in einer Stadt eine neue Kultzelle |

### Die Erinnernden (schwer) · Ressource Blut

| Klasse | Name | Spielweise | Nutzt Blut | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Blutritter | Schneller Vampirkämpfer in alter Aethari-Rüstung | Blut ausgeben für Geschwindigkeit und Kraft | Blutfürst: trinkt im Kampf und heilt sich mit jedem Treffer | Sonnenwandler: kämpft tagsüber ohne Malus, das kostet aber Blut |
| Wächter | Ältestenwacht | Schützt die Schlafenden im Blutschlaf | Blutsiegel: eine Gruft wird für Feinde unbetretbar | Wächter des Blutschlafs: kann Serathias Gruft bewachen (wichtig für die Vereinigung) | Blutholdenvogt: Blutholde liefern mehr Blut, ohne sich zu erheben |
| Späher | Nachtjäger | Jagt nachts, schnell und lautlos | Bringt Blut von jeder Jagd zurück | Schattenschwinge: bewegt sich nachts doppelt so weit | Schwarmrufer: Fledermäuse spähen für ihn fünf Felder weit |
| Magier | Blutmagier | Erinnerungsmagie, trinkt Wissen aus Blut | Zauber kosten Blut, fremdes Blut gibt fremdes Wissen | Erinnerungsweber: liest aus dem Blut eines besiegten Helden eine Technologie seines Volkes | Blutsturm: Flächenzauber, der Feinden Blut entzieht und das eigene Blut auffüllt |
| Heiler | Blutweber | Überträgt Lebenskraft von einem Körper in einen anderen | Heilung kostet Blut, heilt aber vollständig | Brunnenhüter: hilft beim Wiederherstellen des Blutbrunnens von Eryndor | Lebensräuber: heilt Verbündete im Kampf mit dem Blut der Feinde |
| Schurke | Gesichtsdieb | Trägt die Erinnerungen seiner Opfer und gibt sich als sie aus | Trinkt Blut, um eine fremde Identität anzunehmen | Archivar des Blutes: trägt viele Leben, riskiert aber, das eigene zu vergessen | Hofgänger: lebt unerkannt am Hof der Lebenden und öffnet einmal die Tore einer Stadt |

Zu viel fremdes Blut lässt Helden der Erinnernden ihre Identität verlieren. Das gilt für Gesichtsdieb und Blutmagier am stärksten: Sie werden mächtiger und gefährlicher zugleich.

### Meisterklasse: Vollendeter

Nach der Vereinigung zu den Vollendeten kann je ein Held jeder Fraktion zum Vollendeten aufsteigen. Er nutzt Fleisch, Seelen und Blut gemeinsam. Fähigkeit „Drei Fragmente“: Er ist Geist, Leib und Blut zugleich, geht durch Mauern, heilt mit Blut und erhebt auf jedem Schlachtfeld Gefallene als Gebundene, auch ohne verseuchtes Land. Der Diener des ersten Toten beobachtet jeden Vollendeten: Ereignisse können ihn gegen das eigene Volk wenden.

## Elfen

Alle drei Elfenfraktionen wirken Magie und sind stark im Fernkampf. Viele Klassen können die Welke senken oder heben: Wer Nektar nutzt, nährt sie, wer Weltensaft opfert, drängt sie zurück.

### Dornenklingen (leicht) · Ressource Dornholz

| Klasse | Name | Spielweise | Nutzt Dornholz | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Dornenklinge | Schwertkämpfer mit Klingen aus Dornholz | Neue Klingen aus Dornholz: +1 Nahkampf gegen Untote | Eisdorn: Gebundene, die er trifft, erstarren eine Runde | Klingentänzerin: greift zweimal pro Runde an |
| Wächter | Wallhüter | Hält den Dornwall quer durch die Steppe | Repariert Dornwälle mit Dornholz in einer Runde | Nordkapwächter: am Nordkap können Schiffe der Fäulnisbrut nicht landen, solange er steht | Hochdornwache: Belagerungen ihrer Festung dauern doppelt so lange |
| Späher | Hirschreiter | Berittener Bogenschütze auf einem Sturmhirsch | Pfeile aus Dornholz durchschlagen Schilde | Sturmreiter: bewegt sich auf Grasland zwei Felder weiter | Hirschfürst: alle Hirschreiter in seinem Heer erhalten +1 Fernkampf |
| Magier | Dornweber | Lässt Dornenwälle wachsen und brennt Fäulnis aus | Jeder Wall kostet Dornholz | Wallweber: ein Dornwall wächst auch auf verseuchtem Land und stoppt dort die Fäulnis | Dornsturm: Flächenzauber, der Feinde mit Dornen durchbohrt |
| Heiler | Hainpriester | Hütet die Dornhaine, heilt mit Harz und Gesang | Heilung kostet Dornholz aus den Hainen | Hainsinger: ein zerstörter Dornhain wächst in drei Runden nach | Brandhüter: Dornhaine in seiner Provinz brennen nicht und widerstehen der Fäulnis |
| Schurke | Grenzläufer | Jagt Kundschafter der Fäulnisbrut in den Bergen | Legt Dornfallen aus Dornholz | Sporenjäger: findet und vernichtet versteckte Sporennester | Fährtenleser: verfolgt feindliche Späher über Grenzen und enttarnt einen Schurken |

### Schattenblüte (mittel) · Ressource Nektar

| Klasse | Name | Spielweise | Nutzt Nektar | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Rankenklinge | Schneller Kämpfer mit vergifteten Klingen | Nektargift auf der Klinge: Treffer schwächen den Feind | Nachtkelch: das Gift lähmt einen feindlichen Helden eine Runde | Sumpftänzer: in Sumpf und Dschungel +1 Nahkampf und unsichtbar |
| Wächter | Sumpfwächter | Verteidigt die Nebelmarschen mit gezähmten Rankenbestien | Füttert Rankenbestien mit Nektar | Bestienmeister: führt zwei Rankenbestien statt einer | Marschenherr: Feinde verirren sich in den Nebelmarschen und verlieren eine Runde |
| Späher | Giftschütze | Blasrohr und Bogen aus dem Hinterhalt | Vergiftete Pfeile kosten Nektar | Blasrohrmeister: Treffer aus der Unsichtbarkeit verraten ihn nicht | Ätzpfeil: sein Gift wirkt auch gegen Untote |
| Magier | Nebelweber | Trugheere, Nebel und Vergessen | Illusionen kosten Nektar | Traumweber: ein feindlicher Held vergisst seinen Auftrag | Trugheerführer: ruft das Trugheer zweimal pro Schlacht |
| Heiler | Kelchmischerin | Heilt mit Nektartränken, hält Helden jung | Jeder Trank kostet Nektar, stoppt aber das Altern | Blütenpriesterin: weiß um das Geheimnis des Nektars und kann die Ernte ohne Welke-Anstieg bremsen | Gegengiftmeisterin: ihre Gruppe ist immun gegen Gift |
| Schurke | Schleiertänzer | Attentäter in Nebel und Trugbildern | Nektar macht ihn unsichtbar | Stimme des Schleiers: führt das Schmuggelnetz und handelt Nektar heimlich an Zwerge | Schattenhand: kann einen feindlichen Helden im Schlaf töten |

Reicht der Nektar nicht, altern die Helden der Schattenblüte und verlieren jede Runde an Kraft. Jede Ernte hebt die Welke um 1.

### Hüter des Weltenbaums (schwer) · Ressource Weltensaft

| Klasse | Name | Spielweise | Nutzt Weltensaft | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Wurzelkrieger | Kämpfer mit Rindenhaut, zäh im alten Wald | Saft in die Haut: verhärtet sie für eine Schlacht | Rindenhand: kann einen Rindenwächter in die Schlacht führen | Eichenherz: im Wald hält er einmal pro Schlacht einen tödlichen Treffer aus |
| Wächter | Rindenrufer | Erweckt uralte Bäume zu Rindenwächtern | Jeder Rindenwächter kostet Weltensaft | Wurzelhüter: Waldprovinzen in seiner Nähe können nicht verseucht werden | Waldwanderer: Rindenwächter können auch außerhalb des Waldes erweckt werden |
| Späher | Hainwächter | Bogenschütze, im Wald unsichtbar | Saftgetränkte Pfeile heilen Verbündete, die sie streifen | Laubschatten: unsichtbar auch außerhalb des Waldes | Wipfelschütze: schießt aus den Baumkronen zwei Felder weiter |
| Magier | Baumsänger | Die mächtigsten Magier der Welt, heilen ganze Heere | Jeder Gesang kostet Weltensaft | Aschenast-Sänger: kann das Aschenlied mit den Orks singen (Aschenpakt, Glutleiste −15) | Heersänger: heilt einmal pro Schlacht ein ganzes Heer |
| Heiler | Grünheiler | Heilt Verwundete und zieht Gift aus der Wunde | Heilung kostet wenig Saft | Welkenheiler: opfert Weltensaft, um die Welke um 1 zu senken | Fäulnisbrenner: brennt Fäulnis aus Verwundeten, sie stehen nie als Gebundene auf |
| Schurke | Wurzelflüsterer | Hört über die Wurzeln alles, was im Wald gesprochen wird | Lauscht durch die Wurzeln, das kostet Saft | Wurzelauge: entdeckt Späher der Schattenblüte und den Diebstahl am Weltenbaum | Ratsflüsterer: beeinflusst den Wurzelrat und Verhandlungen mit anderen Völkern |

### Meisterklasse: Immergrüner Sänger

Nach der Vereinigung zum Immergrünen Reich kann je ein Held jeder Fraktion zum Immergrünen Sänger aufsteigen. Er nutzt Dornholz, Nektar und Weltensaft gemeinsam. Fähigkeit „Der Grüne Gesang“: Singt er beim Grünen Gesang mit Baumsänger, Dornweber und Nebelweber mit, sinkt die Welke doppelt so schnell. Außerhalb des Rituals senkt er die Welke in seiner Provinz jede Runde um 1.

## Orks

Orks sind das stärkste Kriegervolk, ihre Magie ist Ahnenmagie der drei Schamanenschulen. Nach jeder gewonnenen Schlacht erhalten alle Orkhelden eine Runde Kampfrausch.

### Grüne Banner (leicht) · Ressource Herden

| Klasse | Name | Spielweise | Nutzt Herden | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Bannerkrieger | Speerträger mit großem Schild, verlässlich in der Masse | Herden ernähren seine Bande, sie kämpft länger ohne Nachschub | Büffelreiter: reitet einen Hornbüffel, verheerend im ersten Ansturm | Bannerträger: Einheiten in seinem Heer fliehen erst später |
| Wächter | Herdwächter | Schützt Weiden, Grenzwälle und Herden vor Überfällen | Herden in seiner Provinz können nicht geraubt werden | Wallführer: baut in einer Runde einen Erdwall am Rand des Ödlands | Weidenherr: Herden in seiner Provinz wachsen 5 % schneller |
| Späher | Hirtenschleuderer | Hirte mit Schleuder, billig und überall | Spürt verlorene Tiere auf: jede Runde etwas mehr Herdenwachstum | Weitenläufer: deckt Raubzüge der Staubreiter zwei Runden vorher auf | Steinhagel: Schleuderer in seinem Heer feuern zwei Salven |
| Magier | Erdsänger | Schamane der Grasahnen, heilt und spürt Hinterhalte | Opfert ein Tier, um die Ahnen im Gras zu rufen | Ahnenstimme: Verbündete in seiner Nähe können nicht überrascht werden | Grasheiler: heilt benachbarte Einheiten doppelt so stark |
| Heiler | Kräutermutter | Heilt mit Milch, Salben und Steppenkräutern | Heilung kostet Herden, ist aber billig | Hornheilerin: heilt auch Reittiere und Hornbüffel | Friedensstifterin: Verträge mit anderen Völkern kosten noch weniger Ansehen |
| Schurke | Heimkehrer | Ehemaliger Söldner der Freien Häfen, kennt Städte der Menschen | Verkauft Herden heimlich und öffnet so Türen | Hafenwolf: kann Handelsverträge mit den Menschen ohne Ansehensverlust schließen | Stahlbringer: rüstet eine Einheit mit Stahlwaffen aus den Freien Häfen aus |

### Staubreiter (mittel) · Ressource Beute

| Klasse | Name | Spielweise | Nutzt Beute | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Dornechsenreiter | Schneller Reiter auf einer Wüstenechse mit Wurfspießen | Jeder Sieg bringt Beute, die Bande verlangt ihren Anteil | Echsenfürst: reitet eine Riesenechse und bewegt sich in Wüste zwei Felder weiter | Wurfspießmeister: wirft im Ritt, +1 Fernkampf |
| Wächter | Zeltstadtwächter | Schützt die wandernden Zeltstädte und Ur-Taal | Bewacht den Beuteanteil: Beute kann nicht gestohlen werden | Glasebenenwächter: Feinde auf der Glasebene verlieren jede Runde Kraft | Wanderlager: seine Zeltstadt zieht jede Runde ein Feld mit dem Heer |
| Späher | Sandschütze | Bogenschütze aus dem Hinterhalt in den Dünen | Plündert Tross und Karawanen | Dünengeist: unsichtbar in Wüste und Ödland | Karawanenjäger: Überfälle auf Karawanen bringen doppelte Beute |
| Magier | Windseher | Schamane, ruft Sandstürme und Gegenwind | Opfert Beute dem Wind, um Stürme zu rufen | Sturmrufer: ein Sturm treibt feindliche Schiffe zwei Felder ab | Wüstenauge: liest den Wind und sieht Heere fünf Felder weit |
| Heiler | Sandheilerin | Findet Wasser, heilt mit Sand und Salz | Heilung kostet Beute (Wasser und Salben werden geraubt) | Windmutter: Einheiten laufen bei zu wenig Beute nicht davon | Salzheilerin: heilt auf Schiffen und an Küsten vollständig |
| Schurke | Enterork | Plünderer mit Haken und Krummaxt | Raubt Küsten, ohne zu landen | Rostsegel-Kapitän: führt eine eigene Piratenflotte | Tributeintreiber: presst Küstendörfern Beute ab, ohne zu kämpfen |

### Aschenclan (schwer) · Ressource Ruhm

| Klasse | Name | Spielweise | Nutzt Ruhm | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Aschenkrieger | Schwer gerüsteter Ork mit Glutstahlklinge | Jeder Sieg bringt Ruhm | Narbenträger: kann den feindlichen Anführer zum Zweikampf fordern | Glutstahlklinge: seine Klinge glüht und richtet Feuerschaden an |
| Wächter | Schlackenwächter | Schützt Aschenthron, Schlackenschmieden und den Grauen Pass | Weicht nie: jede gehaltene Stellung bringt Ruhm | Thronwächter: solange er steht, kann der Häuptling nicht herausgefordert werden | Schmiedewächter: die Schlackenschmieden in seiner Provinz liefern doppelt |
| Späher | Aschenläufer | Kundschafter der Pässe und Kraterwände | Bringt Ruhm, wenn er einen feindlichen Späher stellt | Passjäger: kein Feind zieht unbemerkt über einen Pass | Rauchbote: legt Hinterhalte im Aschenrauch, Feinde sehen ihn erst im Kampf |
| Magier | Aschenrufer | Schamane, wirkt Kampfrausch und ruft Ahnengeister | Ruft mit Ruhm Glutschatten | Glutschattenrufer: Glutschatten bleiben zwei Schlachten statt einer | Rauschrufer: Kampfrausch hält zwei Runden statt einer |
| Heiler | Narbenheiler | Brennt Wunden zu, jede Narbe ehrt den Krieger | Heilung bringt keinen Ruhm, aber Narben schützen ihn bei der nächsten Niederlage | Ahnenhüterin: schützt Ahnenstätten, Glutleiste steigt dort langsamer | Kreisheiler: heilt jeden Zweikämpfer nach dem Kreis der Asche vollständig |
| Schurke | Herausforderer | Lauert auf Schwäche, intrigiert um den Thron | Gewinnt Ruhm, wenn ein Rivale scheitert | Thronräuber: kann den Häuptling herausfordern, ohne einen Bruderkrieg auszulösen | Blutfehde: fordert einen feindlichen Helden auch außerhalb der Schlacht zum Zweikampf |

### Meisterklasse: Glutkönig

Nach der Vereinigung zum Großbanner kann je ein Held jedes Clans zum Glutkönig aufsteigen, nach Urzhag dem Einen. Er nutzt Herden, Beute und Ruhm gemeinsam. Fähigkeit „Erbe Urzhags“: Alle Orkheere in seiner Nähe haben dauerhaft Kampfrausch, und kein Clan kann sich gegen ihn erheben. Ist er beim Ahnenfeuer mit Erdsänger, Windseher und Aschenrufer dabei, sinkt die Glutleiste doppelt so schnell.

## Zwerge

Zwergische Helden sind Meisterschmiede und verteidigen sich gut, besonders in Gebirge und unter Tage. Ihre Magie ist Stein- und Runenmagie. Wer Tiefenglut nutzt, wird stärker und hebt die Glutleiste.

### Tiefes Königreich (leicht) · Ressource Hort

| Klasse | Name | Spielweise | Nutzt Hort | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Axtbruder | Krieger mit Axt und Kettenhemd, Rückgrat des Heeres | Kauft Runenwaffen aus dem Hort | Felsbrecher: zerschlägt Tore und Schilde | Schwurbruder: schwört einen Eid am Amboss, +1 Nahkampf und flieht nie |
| Wächter | Eisenwächter | Schwere Infanterie mit Schild und Hammer | Wird aus dem Hort bezahlt, weicht in einer Festung nie zurück | Schildherr: Festung und Pass in seiner Nähe verteidigen sich zusätzlich besser | Passhalter: wer seinen Pass überqueren will, zahlt Zoll oder kämpft |
| Späher | Widderreiter | Leichter Reiter auf einem Bergwidder | Treibt Zoll an Pässen ein | Gipfelreiter: überquert Gebirge ohne Umweg | Bergbote: Verstärkung zwischen zwei Festungen kommt eine Runde früher |
| Magier | Steinsprecher | Spricht mit dem Stein, stärkt die Moral, ruft Beben | Edelsteine aus dem Hort stärken seine Beben | Bebenrufer: ein Beben bringt feindliche Mauern zum Einsturz | Steinwall: lässt einen Felswall aus dem Boden steigen |
| Priester | Steinpriester | Hütet die Steingräber, segnet und heilt | Heilung und Grabsegen kosten Hort | Gräberhüter: kein Zwerg in seiner Provinz kann als Untoter aufstehen, auch nicht auf verseuchtem Land | Ahnenruf: die Moral seiner Gruppe kann nicht sinken |
| Schurke | Schuldeneintreiber | Agent der Königsbank, führt das Schuldbuch | Verleiht Hort an andere Völker und treibt Zinsen ein | Goldzunge: kann einen Schuldner zwingen, ein Bündnis zu schließen oder Land abzutreten | Pfandmeister: pfändet Waren oder Schiffe eines säumigen Schuldners |

### Tiefgräber (mittel) · Ressource Erz

| Klasse | Name | Spielweise | Nutzt Erz | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Hauer | Bergmann mit schwerer Hacke, stark unter Tage | Erz für bessere Waffen | Tiefenhauer: nutzt Tiefenglut für doppelte Kraft, hebt aber die Glutleiste | Felsspalter: seine Hacke durchschlägt Rüstung wie Gestein |
| Wächter | Grubenwächter | Bergmann mit Hacke und schwerem Schild, zäh | Schützt Minen: eine Mine liefert auch im Krieg Erz | Stollenwächter: kann einen Stollen versiegeln (Glutleiste −10) | Kluftwächter: Minen und Grubenstädte in seiner Provinz verteidigen sich besser |
| Späher | Kohlenwerfer | Wirft Töpfe mit Pech und Pulver | Jeder Wurf kostet Erz und Kohle | Sprengmeister: bringt einen feindlichen Tunnel oder ein Tor zum Einsturz | Pechregen: setzt ein ganzes Feld in Brand |
| Magier | Erzspürer | Spürt Erzadern, Tunnel und Hinterhalte im Stein | Findet neue Erzadern: mehr Erz pro Runde | Tiefenspürer: findet Tiefenglut und weiß, wie viel davon der Berg verträgt | Adernleser: findet feindliche Tunnel, auch die der Tunnelräuber anderer Fraktionen |
| Heiler | Grubenbader | Heilt Bergleute nach Einstürzen und Gasunfällen | Heilung kostet Erz (Salben aus Mineralien) | Lampenträger: unter Tage sieht und heilt seine Gruppe doppelt so gut | Gasmeister: seine Gruppe ist immun gegen Gift und Grubengas |
| Schurke | Tunnelräuber | Gräbt unter feindlichen Linien und taucht hinter ihnen auf | Jeder Tunnel kostet Erz | Kluftschatten: kann unter einer Stadt hindurch bis in den Hauptsitz graben | Stollendieb: stiehlt Erz aus feindlichen Minen |

### Runenschmiede (schwer) · Ressource Runen

| Klasse | Name | Spielweise | Nutzt Runen | Spezialisierung A ab Stufe 3 | Spezialisierung B ab Stufe 3 |
| --- | --- | --- | --- | --- | --- |
| Krieger | Funkenhammer | Schmiedekrieger, lädt seine Waffe in der Schlacht auf | Eine Rune macht seinen Hammer dauerhaft stärker | Runenklinge: trägt drei Runen statt einer | Donnerhammer: sein Schlag wirft Feinde ein Feld zurück |
| Wächter | Runenwache | Krieger in Runenrüstung, die fast nichts durchdringt | Runen in der Rüstung schützen vor Zaubern | Torsiegler: versiegelt ein Tor mit einer Rune, das kein Feind öffnen kann | Runenschild: schützt die ganze Gruppe vor Zaubern |
| Späher | Donnerbüchse | Schütze mit Schwarzpulverwaffe | Runenladungen schießen doppelt so weit | Meisterschütze: trifft auch hinter Mauern | Salvenmeister: Schützen in seinem Heer feuern gemeinsam doppelt |
| Magier | Runenmeister | Lädt Waffen in der Schlacht auf, versiegelt Tore | Schneidet Runen aus Erz und Kohle | Großrunenmeister: schneidet Runen doppelt so schnell, ohne Tiefenglut | Kanonenrunen: Runenkanonen in seinem Heer schießen ein Feld weiter |
| Heiler | Runenheiler | Heilrunen in Haut und Verband | Jede Heilrune kostet eine Rune | Lebensrunenschneider: eine Rune bewahrt einen Helden einmal vor dem Tod | Schutzrunenschneider: seine Gruppe ist immun gegen Fäulnis |
| Schurke | Feuerschüttler | Pionier, legt Pulverminen unter Mauern | Runen verstärken jede Mine | Pulvermacher: kann Donnerpulver an Menschen verkaufen und so Hort für alle Zwerge holen | Mauerbrecher: eine Pulvermine bringt jede Mauer in einer Runde zum Einsturz |

### Meisterklasse: Siegelmeister

Nach der Vereinigung zum Reich unter dem Stein (Schwur am Amboss) kann je ein Held jeder Fraktion zum Siegelmeister aufsteigen. Er nutzt Hort, Erz und Runen gemeinsam. Fähigkeit „Was der Stein hält“: Er senkt das Erzfieber in seiner Provinz jede Runde um 1. Ist er bei der Siegelrune mit Steinsprecher, Runenmeister und Erzspürer dabei, wirkt sie einmal zusätzlich. Siegelmeister sind gegen den Kult nicht immun: Ein Siegelmeister mit großem Hort ist sein liebstes Ziel.

## Beispiel: ein Held vom Anfang bis zur Meisterklasse

Sylva ist eine Elfin der Dornenklingen und wählt die Klasse Späher, also Hirschreiterin.

Schritt 1, Grundwerte bei der Charakterwahl:

| Grundwert | Start | Elfen | Dornenklingen | Späher | Freie Punkte | Ergebnis |
| --- | --- | --- | --- | --- | --- | --- |
| Stärke | 10 | −1 | +1 | −1 | +1 | 10 |
| Geschick | 10 | +2 | +1 | +2 | +2 | 17 |
| Intelligenz | 10 | +1 |  | +1 | +1 | 13 |
| Willenskraft | 10 |  |  |  | +1 | 11 |
| Charisma | 10 |  | −1 |  |  | 9 |

Schritt 2, Fertigkeiten (18 Punkte): Ihre Hauptfertigkeiten Fernkampf und List brauchen mindestens 3. Mit Geschick 17 dürfen beide bis 5 steigen, Nahkampf (Stärke 10) nur bis 3.

| Fertigkeit | Grenze | Start (18) | Ab Quest-Stufe 3 (19) | Meisterklasse (20) |
| --- | --- | --- | --- | --- |
| Nahkampf | 3 | 3 | 3 | 3 |
| Fernkampf | 5 | 4 | 5 | 5 |
| Magie | 4 | 1 | 1 | 2 |
| Verteidigung | 3 | 2 | 2 | 2 |
| List | 5 | 3 | 3 | 3 |
| Führung | 3 | 2 | 2 | 2 |
| Mut | 3 | 3 | 3 | 3 |
| Titel |  | Hirschreiterin | Sturmreiterin | Immergrüne Sängerin |

Am Anfang verbraucht sie Dornholz für ihre Pfeile. Ab Stufe 3 wird sie Sturmreiterin und erhält Geschick +1 (18). Als Immergrüne Sängerin nach der Vereinigung erhält sie +2 Grundwerte, zum Beispiel Intelligenz 15, und darf nun auch Nektar und Weltensaft nutzen.

## Umsetzung im Browser-Spiel (Stand 17. 11. 2026)

**Spielwirksam**

- Charaktererstellung mit Volk, Fraktion und Klasse. Der Fraktionsname der Klasse steht im Charakterbereich, zum Beispiel „Huskarl“ oder „Hirschreiter“.
- Grundwerte nach den Tabellen oben, 5 freie Punkte, Höchstwert 20, bei Menschen +1 nach Wahl. Jeder neue Held hat 60 Punkte.
- 18 Fertigkeitspunkte mit Grenzen durch die Grundwerte, zwei Hauptfertigkeiten mit mindestens 3, keine Magie für Kronreich und Freie Häfen.
- Proben in Szenen laufen über Fertigkeiten: W20 + Fertigkeit + Bonus oder Malus des zugehörigen Grundwerts gegen die Schwierigkeit.
- Kampf: Waffenschaden über Nahkampf (mit Stärke-Bonus) oder Fernkampf (mit Geschick-Bonus), Glutangriff über die Fertigkeit der Klasse, Schutz über Verteidigung und Ausweichen (Geschick), Flucht über List. Willenskraft ab 16 hält die Irrglut fern. Lebenspunkte: 18 + Stärke + 2 × Verteidigung. Glut: 1 + Willenskraft ÷ 3.
- Orks erhalten nach jedem Sieg einen Kampfrausch für den ersten Angriff der nächsten Schlacht (+2 Schaden).
- Skalde, Pulvermeister und Feldscher/Schiffsarzt haben eigene Grundwerte, Hauptfertigkeiten und Glutfähigkeiten ohne Magie. Glut ist die Gabe aller Gezeichneten und steht jeder Klasse offen.
- Spezialisierung und Meisterklasse sind als Regeln umgesetzt (+1 Fertigkeitspunkt und +1 Grundwert beziehungsweise +1 Fertigkeitspunkt und +2 Grundwerte, Titel). Sie werden freigeschaltet, sobald der Spielstand Quest-Stufe 3 beziehungsweise die Vereinigung erreicht.
- Stufenaufstiege durch EP geben weiterhin je einen Punkt, der jetzt einen Grundwert um 1 erhöht (höchstens 20).
- Gefährten haben eine Grundklasse. Wer dieselbe Klasse wie die Spielfigur hat, schließt sich nicht an: Iven Wächter, Sela und Oren Magier, Heda und Bryn Heiler, Neri Späher, Tovin Schurke, Mira und Kelda Krieger.

**Hinterlegt, aber noch nicht spielwirksam**

- Fraktionsressourcen (Korn, Gold, Glaube, Fleisch, Seelen, Blut, Dornholz, Nektar, Weltensaft, Herden, Beute, Ruhm, Hort, Erz, Runen) und ihre Nutzung durch die Klassen. Das Spiel kennt bisher nur Glut.
- Die Fähigkeiten der Spezialisierungen und Meisterklassen. Fast alle betreffen Heere, Provinzen, Runden, Belagerungen, Flotten oder die Leisten der Welt. Diese Strategieebene gibt es noch nicht.
- Quest-Stufen der Hauptquests und die Vereinigung der Völker. Der Spielstand führt `questStufe` und `vereinigt`, die Kampagne setzt sie aber noch nicht.
- Tragkraft (Stärke), Bewegung ab Geschick 20, geringere Ressourcenkosten durch Intelligenz, Rabatt auf Rekruten und Söldner durch Charisma, Kult, Identitätsverlust der Erinnernden, Altern der Schattenblüte.

**Alte Spielstände**

Spielstände der Version 1 laden weiter. Die Herkunft wird zur Fraktion (Mensch → Kronreich, Elf → Hüter des Weltenbaums, Zwerg → Tiefes Königreich, Ork → Grüne Banner, Vampir → Die Erinnernden, Untoter → Hof der Bleichen Krone), die Klasse zur Grundklasse (Ritter → Wächter, Paladin und Krieger → Krieger, Magier und Nekromant → Magier, Priester und Druide → Heiler, Waldläufer → Späher, Dieb → Schurke). Aus den sechs alten Attributpunkten werden fünf freie Punkte, die Fertigkeiten werden vorgeschlagen. Danach kann der Held einmal im Charakterbereich Fraktion (passend zur Herkunft), Klasse, Grundwerte und Fertigkeiten neu wählen.
