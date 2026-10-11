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
| bockt | Esel | bleibt stehen, bis ihn jemand überholt, höchstens 7 s |
| springt | Hirsch | 0,9 s lang 1,8-faches Tempo; jeder sechste Sprung endet als Sturz (purzelt); über einen Stier im Sturmlauf springt er hinweg |
| erstarrt | Reh, wenn bis 18 m entfernt etwas Lautes passiert (Sturmlauf, Rakete, Sturz, Jagd, Zoomies), sonst selten ohne Grund | steht 1,4 bis 2,6 s |
| Windschatten | Fuchs, bis 6 m hinter einem laufenden Starter | 1,12-faches Tempo, auf den letzten 150 m 1,3-faches |
| jagt | Wolf, wenn ein Starter 4 bis 20 m vor ihm läuft | 3 s lang 1,45-faches Tempo; der Gejagte rennt 3 s lang mit 1,25-fachem Tempo und wacht dafür auch aus Schlaf oder Bocken auf |
| schnüffelt | Shiba Inu | steht 1,8 bis 3,2 s |
| Zoomies | Shiba Inu | 2,5 s lang 1,9-faches Tempo im Zickzack |

### Bahnzustand

Vor jedem Rennen wird der Boden ausgelost: gut (50 %), weich (30 %), schwer (20 %). Er steht über dem Bild und in der Ansage, und die Quoten werden für genau diesen Boden gerechnet. So hat jedes Rennen eine eigene Ausgangslage, ohne dass dafür neue Starter nötig sind. Auf schwerem Boden werden die beiden Pferde langsamer, Husky und Stier kaum, und das Pferd auf zwei Beinen rutscht gelegentlich aus.

### Zielgerade

Auf den letzten 200 m sind Fressen, Sturmlauf und Rückwärtslaufen 1,5-mal so häufig, eine noch nicht gezündete Rakete zündet 2,5-mal so oft, und der Führende kann zu früh jubeln. In etwa 47 % der Rennen gewinnt nicht, wer bei 800 m vorn liegt (vorher 44 %). Ein verfrühter Jubel kommt in etwa einem Viertel der Rennen vor.

- Das Alpaka gewinnt im Ziel bis zu 4 m durch den gestreckten Hals.

### Wechselnde Felder

Es gibt 12 Starter (`ROSTER` in `js/sim.js`), pro Rennen laufen 6 davon. Das Feld wird wie der Boden vor dem Rennen ausgelost (`drawField`) und nach Startnummer auf die Bahnen verteilt. Die Simulation kennt keine festen Plätze mehr: Jede Eigenheit hängt an der Kennung des Starters (`id`), und Kommentarzeilen nennen den Namen aus dem Feld. Ergebnisse (`order`, `frames`, `ev`) zählen nach Bahn 0 bis 5, `field` sagt, wer auf welcher Bahn läuft.

Die Grundtempos sind so abgestimmt, dass jeder Starter über viele ausgeloste Felder ungefähr gleich oft gewinnt (fair wären 16,7 %). Wer in einem bestimmten Rennen Favorit ist, ergibt sich aus Feld und Boden.

- Aktuelle Siegchancen (`node tools/odds.js`): siehe Tabelle unten.

  Nach jeder Änderung an den Werten mit `node tools/odds.js` prüfen.

## Wetten

Gewettet wird an einem gemeinsamen Bildschirm mit Spielgeld. Einer bedient das Wettbüro unter dem Sendebild, die Runde sagt ihre Tipps an. Die Logik steht in `js/bets.js` (ohne Grafik, läuft auch in Node), die Bedienung in `js/betting.js`.

- **Mitspieler:** Jeder trägt sich mit Namen ein und bekommt 100 Taler. Kassen und offene Wetten bleiben im Browser gespeichert, auch nach dem Neuladen. „Kasse zurücksetzen“ löscht alles.
- **Wettarten:** Sieg (Starter gewinnt), Platz (Starter wird Erster oder Zweiter) und Zweierwette (Erster und Zweiter in genau dieser Reihenfolge).
- **Feste Quoten:** Alle drei kommen aus denselben Probeläufen mit 15 % Abzug, gerechnet für Boden und Feld des aktuellen Rennens. Das dauert nach „Neues Rennen“ einige Sekunden, das Wettbüro öffnet, sobald die Quoten stehen. Kommt ein neues Rennen („Neues Rennen“ oder Neuladen der Seite), gehen offene Wetten an die Kasse zurück, weil ihre Quoten für ein anderes Feld galten. Angezeigt wird eine Nachkommastelle, und genau diese Quote wird ausgezahlt. Sie gilt ab Abgabe der Wette. Obergrenze 99 für Sieg und Platz, 250 für die Zweierwette, Untergrenze 1,1.
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
- Gegen Ende spricht die Stimme schneller und höher.
- Längere Pausen füllt die Wiedergabe mit dem Stand an der Spitze („X führt mit 12 Metern vor Y“). Diese Sätze entstehen aus den Positionen beim Abspielen und stehen nicht im Textverlauf.
- Der Ton lässt sich über „Ton: an/aus“ abschalten; die Wahl merkt sich der Browser.
- Nicht umgesetzt: eigene Sprachaufnahmen oder eine KI-Stimme. Beides klänge besser, bräuchte aber Audiodateien pro Satz und Starter oder einen Dienst im Netz.

## Zielfoto und Siegerehrung

- **Zieldurchgang:** Die Simulation rechnet den Moment, in dem ein Starter die Linie erreicht, auf einen Bruchteil des Zeitschritts genau aus (`fin` im Ergebnis von `simulate`). Überqueren zwei Starter die Linie im selben Zeitschritt, entscheidet dieser genaue Zeitpunkt, vorher entschied die Reihenfolge der Starternummern. Das kann nur bei Abständen unter 1/30 s passieren, also in gut 1 % der Rennen; die Siegchancen haben sich dadurch nicht messbar verschoben.
- **Zielfoto:** Im Moment des Siegs rendert eine zweite Kamera das Feld genau von der Seite auf Höhe der Ziellinie. Die Linie steht dadurch senkrecht in der Bildmitte. Das Bild wird leicht sepia eingefärbt, bekommt die Siegerzeit und einen Satz zum Abstand („mit einer Kopflänge vor …“). Der Abstand ergibt sich aus der Strecke, die dem Zweiten zu diesem Zeitpunkt noch fehlt.
- **Siegerehrung:** Nach dem Rennen stehen die ersten drei auf einem Podest hinter dem Ziel, die übrigen daneben im Gras. Die Kamera fährt heran und pendelt langsam, es fällt Konfetti. Daneben (auf schmalen Bildschirmen darunter) zeigt eine Tafel den Einlauf mit Zeiten und Rückständen sowie das Zielfoto.
- Der Code dafür steht in `js/ceremony.js`. Er liest nur das fertige Simulationsergebnis; `sim.js` bleibt ohne Grafik.

## Warum diese Tiere

Das ursprüngliche Feld bestand aus Pferd, Giraffe, Elefant, Robbe, Pferd auf zwei Beinen und Schildkröte mit Rakete. Das kostenlose Modellpaket von Quaternius enthält davon nur das Pferd. Statt Modelle zuzukaufen, wurde das Feld an das Paket angepasst: Alpaka statt Giraffe, Stier statt Elefant, Husky statt Robbe, Kuh statt Schildkröte. Die Regeln blieben gleich.

Im Paket sind außerdem Esel, Hirsch, Reh, Fuchs, Wolf und Shiba Inu mit demselben Skelett. Sie sind inzwischen alle als Starter eingebaut (Nummern 7 bis 12). Damit ist das ganze Paket im Spiel; das weiße Pferd aus dem Paket wird nicht gebraucht, weil das Pferd auf zwei Beinen das braune Modell mit eigener Farbe nutzt. Die Modelle werden mit `node tools/slim-models.js <Ordner>` auf die benutzten Animationen verkleinert.

Ein kostenpflichtiges Paket mit Giraffe, Elefant und Robbe in einheitlichem Stil gibt es von ithappy („Animals Low-Poly“, 139 $).

## Offen

- **Wetten am Handy:** Wetten am eigenen Handy per QR-Code. Braucht einen kleinen Server; die Wettlogik in `js/bets.js` lässt sich dafür übernehmen. Ebenfalls offen: Totalisator statt fester Quoten, bei dem die Quote aus den Einsätzen der Runde entsteht.
- **Mehr Abwechslung:** Bahnzustand, Zielgeraden-Ereignisse, zwölf Starter und wechselnde Felder sind umgesetzt (siehe oben). Noch offen: Fehlschläge, die andere Starter mitreißen; Wettbewerbe mit anderer Distanz (800 oder 1200 m), die eine Bahn bräuchten, deren Länge nicht fest in `scene.js` steht.
- **Bekannte Schwächen:** Bei Schnitten auf einen Starter in einer hinteren Bahn läuft manchmal ein anderer Starter groß durchs Bild. Die Startnummer sehr großer Figuren wird in nahen Einstellungen oben angeschnitten.
