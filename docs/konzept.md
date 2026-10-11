# Konzept und Entscheidungen

Dieses Dokument hält fest, was beim Entwurf entschieden wurde und was noch offen ist.

## Ziel

Eine Runde sitzt zusammen, sieht sich ein Rennen an und wettet vorher darauf. Drei Dinge müssen dafür stimmen:

1. Die Rennen sehen aus wie eine ernst gemeinte Fernsehübertragung mit völlig unernsten Startern.
2. Jedes Rennen verläuft anders, und bis zur Zielgeraden ist offen, wer gewinnt.
3. Die Quoten passen ungefähr zu den wahren Chancen.

## Erst simulieren, dann zeigen

Das Rennen wird im Hintergrund komplett berechnet (`simulate(seed, true)` in `js/sim.js`) und danach nur noch abgespielt. Das löst mehrere Probleme zugleich:

- **Quoten:** Vor dem Rennen laufen 6000 Simulationen ohne Aufzeichnung. Aus den gezählten Chancen ergibt sich die Wettquote als `0,85 / Chance`, also mit 15 % Abzug für die Bank. Neue Ereignisse verändern die Quoten automatisch mit.
- **Regie:** Die Kamera weiß, wann der Sieger die Linie überquert, und kann die Zeitlupe genau darum legen.
- **Wiederholung:** Ein Rennen ist durch seinen Startwert (`seed`) festgelegt und lässt sich identisch noch einmal zeigen.

## Die Simulation

- Strecke 1000 m, Zeitschritt 1/30 s, ein Rennen dauert etwa 45 s.
- Jeder Starter hat ein Grundtempo, ein leichtes Tempo-Rauschen, einen Faktor für die zweite Rennhälfte, einen Faktor bei Regen und je einen Faktor für die drei Bahnzustände.
- Ereignisse haben eine Wahrscheinlichkeit pro Sekunde und setzen einen Zustand für eine begrenzte Zeit:

| Zustand | Auslöser | Wirkung |
|---|---|---|
| schläft | Pferd, nur in Führung | steht mehrere Sekunden |
| frisst | Alpaka | steht 2 bis 3,5 s |
| Sturmlauf | Stier | 4 s lang 1,7-faches Tempo; wer im Umkreis von 5 m ist, purzelt |
| purzelt | vom Stier getroffen, ausgerutscht, Rakete explodiert | steht 2 bis 3 s |
| läuft zurück | Pferd auf zwei Beinen | läuft kurz in die falsche Richtung |
| Rakete | Kuh, einmal pro Rennen | 70 m/s, bis die Rakete explodiert |
| Regen | in knapp der Hälfte der Rennen, 10 s lang | Husky wird sehr schnell, alle anderen etwas langsamer |
| jubelt zu früh | Pferd oder Pferd auf zwei Beinen, zwischen 80 und 35 m vor dem Ziel mit mehr als 9 m Vorsprung, einmal pro Rennen | bleibt 1 bis 1,6 s stehen und hüpft |
| Rakete verkehrt herum | 15 % aller Zündungen der Kuh | fliegt gut 1 s mit 35 m/s rückwärts, dann explodiert sie |
| Husky heult | Husky, nur wenn es noch nicht geregnet hat | 1,5 s später regnet es 10 s lang |

### Bahnzustand

Vor jedem Rennen wird der Boden ausgelost: gut (50 %), weich (30 %), schwer (20 %). Er steht über dem Bild und in der Ansage, und die Quoten werden für genau diesen Boden gerechnet. So hat jedes Rennen eine eigene Ausgangslage, ohne dass dafür neue Starter nötig sind. Auf schwerem Boden werden die beiden Pferde langsamer, Husky und Stier kaum, und das Pferd auf zwei Beinen rutscht gelegentlich aus.

### Zielgerade

Auf den letzten 200 m sind Fressen, Sturmlauf und Rückwärtslaufen 1,5-mal so häufig, eine noch nicht gezündete Rakete zündet 2,5-mal so oft, und der Führende kann zu früh jubeln. In etwa 47 % der Rennen gewinnt nicht, wer bei 800 m vorn liegt (vorher 44 %). Ein verfrühter Jubel kommt in etwa einem Viertel der Rennen vor.

- Das Alpaka gewinnt im Ziel bis zu 4 m durch den gestreckten Hals.
- Aktuelle Siegchancen (`node tools/odds.js`, 6000 Rennen je Boden):

| Starter | gemischt | gut | weich | schwer |
|---|---|---|---|---|
| Pferd | 25 % | 31 % | 22 % | 17 % |
| Alpaka | 22 % | 20 % | 24 % | 21 % |
| Stier | 15 % | 12 % | 17 % | 18 % |
| Husky | 13 % | 8 % | 12 % | 22 % |
| Pferd auf zwei Beinen | 14 % | 17 % | 13 % | 9 % |
| Kuh | 12 % | 11 % | 12 % | 13 % |

  Nach jeder Änderung an den Werten mit `node tools/odds.js` prüfen.

## Wetten

Gewettet wird an einem gemeinsamen Bildschirm mit Spielgeld. Einer bedient das Wettbüro unter dem Sendebild, die Runde sagt ihre Tipps an. Die Logik steht in `js/bets.js` (ohne Grafik, läuft auch in Node), die Bedienung in `js/betting.js`.

- **Mitspieler:** Jeder trägt sich mit Namen ein und bekommt 100 Taler. Kassen und offene Wetten bleiben im Browser gespeichert, auch nach dem Neuladen. „Kasse zurücksetzen“ löscht alles.
- **Wettarten:** Sieg (Starter gewinnt), Platz (Starter wird Erster oder Zweiter) und Zweierwette (Erster und Zweiter in genau dieser Reihenfolge).
- **Feste Quoten:** Alle drei kommen aus denselben Probeläufen mit 15 % Abzug, gerechnet für den Boden des aktuellen Rennens. Das Spiel rechnet zuerst den aktuellen Boden und die übrigen danach im Leerlauf, jeden nur einmal. Wird der Boden neu ausgelost („Neues Rennen“ oder Neuladen der Seite), gehen offene Wetten an die Kasse zurück, weil ihre Quoten für einen anderen Boden galten. Angezeigt wird eine Nachkommastelle, und genau diese Quote wird ausgezahlt. Sie gilt ab Abgabe der Wette. Obergrenze 99 für Sieg und Platz, 250 für die Zweierwette, Untergrenze 1,1.
- **Ablauf:** Der Einsatz geht sofort von der Kasse ab, bis zum Start lässt sich eine Wette zurücknehmen. Mit dem Start schließt das Wettbüro. Nach dem Zieleinlauf wird einmal abgerechnet, eine Wiederholung zahlt nicht noch einmal aus. „Neues Rennen“ startet nicht mehr sofort, sondern öffnet zuerst das Wettbüro.
- **Gegenprobe:** `node tools/odds.js` setzt in 3000 Rennen mit ausgelostem Boden, die nicht in die Quoten eingeflossen sind, auf jede Möglichkeit einen Taler, jeweils zur Quote dieses Bodens. Ergebnis zuletzt: Sieg zahlt 0,86 je Taler aus, Platz 0,85, Zweierwette 0,80. Platz kann durch das Runden kleiner Quoten (Pferd auf gutem Boden 1,3) etwas unter 0,85 liegen, die Zweierwette durch seltene Einläufe und die Obergrenze. Für ein Partyspiel reicht das.

## Darstellung

- Three.js r128, klassische Skriptdateien ohne Build-Schritt.
- Die Tiere sind fertige Modelle mit Skelett. Standardbewegungen (Galopp, Schritt, Stehen, Fressen, Umfallen) kommen aus den mitgelieferten Animationen. Die Sonderbewegungen entstehen per Code über einzelne Knochen: Aufrichten des weißen Pferds mit angewinkelten, im Schrittwechsel rudernden Vorderbeinen, Halsstrecken des Alpakas, gesenkter Kopf des Stiers.
- Die Hufe hängen im Modell an eigenen IK-Knochen, nicht am Unterschenkel. Wer die Vorderbeine dreht, muss diese Knochen mitführen (`followBone` in `js/figures.js`), sonst bleiben die Hufe am Boden stehen.
- Der Mixer von Three.js schreibt unveränderte Werte nicht neu. Zusatzdrehungen müssen deshalb vor jedem Bild zurückgenommen werden (siehe `poseModel` in `js/figures.js`), sonst summieren sie sich auf.
- Jockeys, Rakete, Bahn und Tribünen bestehen aus Grundformen.
- Kamera: Startfahrt vor dem Feld, mitfahrende Seitenkamera auf die Führungsgruppe, Schnitt auf den betroffenen Starter bei Ereignissen, feste Kamera an der Ziellinie mit Zeitlupe.
- Liegt der Erste lange allein vorn, wechselt die Regie zwischen ihm (4 s) und den Verfolgern (3 s), bis 150 m vor dem Ziel. Sonst sähe man oft 15 s lang nur ein einzelnes Tier.
- Jede Einstellung läuft mindestens 1,5 s. Ab 70 m vor dem Ziel bleibt die Einstellung stehen, bis die Zielkamera übernimmt. Die Breite der Führungsgruppe wird geglättet, damit die Kamera nicht reißt, wenn jemand die Gruppe verlässt oder einholt.
- `node tools/regie.js 60` spielt Rennen im Browser ab und misst, ob Führender, betroffener Starter und Sieger im Bild sind, wie oft die Kamera ohne Schnitt springt und welche Einstellungen zu kurz sind. Vorher (60 Rennen): 515 Kamerasprünge, 21 Einstellungen unter 1,2 s. Nachher: 0 Sprünge, 1 kurze Einstellung.

## Gesprochener Kommentar

- Die Kommentarzeilen werden zusätzlich vorgelesen, über die Sprachausgabe des Browsers (Web Speech API, `js/voice.js`). Das kostet keine Audiodateien und funktioniert ohne Server. Wie die Stimme klingt, hängt vom Gerät ab: Chrome und Edge bringen gute deutsche Stimmen mit, unter Linux ist die Auswahl oft dürftig.
- Die Zeilen kommen schneller, als man sie sprechen kann. Jede Zeile bekommt deshalb in der Simulation ein Gewicht (`p`): 3 für den Zieleinlauf, 2 für Ereignisse, 1 für Führungswechsel und Ähnliches. Es wartet höchstens eine Zeile; eine neue mit mindestens gleichem Gewicht verdrängt sie, und was zu lange gewartet hat, fällt weg. Der Sieg unterbricht alles, danach kommt nur noch das Ergebnis.
- **Japanischer Sprecher (Standard):** Wie in einer japanischen Rennübertragung kommentiert ein Sprecher auf Japanisch (`js/jikkyo.js`), die deutschen Zeilen bleiben als Untertitel. Dafür trägt jedes Ereignis in der Simulation eine Art (`k`), aus der die Wiedergabe den japanischen Satz baut. Die Namen der Starter spricht er in Katakana aus, so wie ein Japaner die deutschen Namen lesen würde.
- **Er dreht ab:** Die Aufregung steigt mit dem Rennfortschritt und mit jedem Chaos-Ereignis und sinkt bis zum Ziel nicht mehr. Sie hat vier Stufen: sachlich, lebhaft („おっと…“), aufgeregt (Ausrufe statt Punkte) und außer sich (Schreie, Namen doppelt, Sätze wie „Das Kommentatorenpult ist im Chaos!“, in Pausen Ausbrüche ohne Anlass). Dazu wird die Stimme schneller, höher und lauter. Nach dem Sieg sagt er außer Atem, aber wieder gefasst, den Einlauf an.
- Der Knopf „Ton“ wechselt zwischen Japanisch, Deutsch und aus. Hat das Gerät keine japanische Stimme, liest die deutsche Stimme die Textzeilen vor, und der Knopf sagt das. Japanische Stimmen bringen Windows, macOS, Android und Chrome in der Regel mit.
- Der deutsche Sprecher spricht gegen Ende schneller und höher.
- Längere Pausen füllt die Wiedergabe mit dem Stand an der Spitze („X führt mit 12 Metern vor Y“). Diese Sätze entstehen aus den Positionen beim Abspielen und stehen nicht im Textverlauf.
- Die Wahl beim Ton merkt sich der Browser.
- Nicht umgesetzt: eigene Sprachaufnahmen oder eine KI-Stimme. Beides klänge besser, bräuchte aber Audiodateien pro Satz und Starter oder einen Dienst im Netz.

## Zielfoto und Siegerehrung

- **Zieldurchgang:** Die Simulation rechnet den Moment, in dem ein Starter die Linie erreicht, auf einen Bruchteil des Zeitschritts genau aus (`fin` im Ergebnis von `simulate`). Überqueren zwei Starter die Linie im selben Zeitschritt, entscheidet dieser genaue Zeitpunkt, vorher entschied die Reihenfolge der Starternummern. Das kann nur bei Abständen unter 1/30 s passieren, also in gut 1 % der Rennen; die Siegchancen haben sich dadurch nicht messbar verschoben.
- **Zielfoto:** Im Moment des Siegs rendert eine zweite Kamera das Feld genau von der Seite auf Höhe der Ziellinie. Die Linie steht dadurch senkrecht in der Bildmitte. Das Bild wird leicht sepia eingefärbt, bekommt die Siegerzeit und einen Satz zum Abstand („mit einer Kopflänge vor …“). Der Abstand ergibt sich aus der Strecke, die dem Zweiten zu diesem Zeitpunkt noch fehlt.
- **Siegerehrung:** Nach dem Rennen stehen die ersten drei auf einem Podest hinter dem Ziel, die übrigen daneben im Gras. Die Kamera fährt heran und pendelt langsam, es fällt Konfetti. Daneben (auf schmalen Bildschirmen darunter) zeigt eine Tafel den Einlauf mit Zeiten und Rückständen sowie das Zielfoto.
- Der Code dafür steht in `js/ceremony.js`. Er liest nur das fertige Simulationsergebnis; `sim.js` bleibt ohne Grafik.

## Warum diese Tiere

Das ursprüngliche Feld bestand aus Pferd, Giraffe, Elefant, Robbe, Pferd auf zwei Beinen und Schildkröte mit Rakete. Das kostenlose Modellpaket von Quaternius enthält davon nur das Pferd. Statt Modelle zuzukaufen, wurde das Feld an das Paket angepasst: Alpaka statt Giraffe, Stier statt Elefant, Husky statt Robbe, Kuh statt Schildkröte. Die Regeln blieben gleich.

Im Paket sind außerdem Esel, Hirsch, Reh, Fuchs, Wolf und Shiba Inu mit demselben Skelett. Sie lassen sich als weitere Starter einbauen.

Ein kostenpflichtiges Paket mit Giraffe, Elefant und Robbe in einheitlichem Stil gibt es von ithappy („Animals Low-Poly“, 139 $).

## Offen

- **Wetten am Handy:** Wetten am eigenen Handy per QR-Code. Braucht einen kleinen Server; die Wettlogik in `js/bets.js` lässt sich dafür übernehmen. Ebenfalls offen: Totalisator statt fester Quoten, bei dem die Quote aus den Einsätzen der Runde entsteht.
- **Mehr Abwechslung:** Bahnzustand, Zielgeraden-Ereignisse und drei neue Ereignisse sind umgesetzt (siehe oben). Offen sind weitere Starter und wechselnde Felder; beides braucht neue Modelle. Vorschlag:
  - Neue Starter aus demselben Quaternius-Paket (gleiches Skelett, gleiche Animationen): **Esel**, der an einer beliebigen Stelle stur stehen bleibt und erst weiterläuft, wenn ein anderer Starter vorbeizieht; **Hirsch**, der über die Bahn springt und dabei Meter gewinnt oder im Nachbarn landet; **Fuchs**, der sich in den Windschatten des Führenden hängt und ihn auf den letzten Metern überholt; **Shiba Inu**, der bei jedem Kommentar zur Tribüne schaut. Namen müssen noch gefunden werden.
  - Wechselnde Felder: Mit acht bis zehn Startern laufen pro Rennen sechs, ausgelost wie der Boden. Dafür muss `sim.js` statt fester Indizes (`i===0`, `rs[2]` usw.) mit Starterkennungen arbeiten, und Bahnbelegung, Figuren und Quotentafel müssen sich nach dem Feld richten.
  - Wettbewerbe mit anderer Distanz (800 oder 1200 m) wären eine weitere Abwechslung ohne neue Modelle, brauchen aber eine Bahn, deren Länge nicht fest in `scene.js` steht.
- **Bekannte Schwächen:** Bei Schnitten auf einen Starter in einer hinteren Bahn läuft manchmal ein anderer Starter groß durchs Bild. Die Startnummer sehr großer Figuren wird in nahen Einstellungen oben angeschnitten.
