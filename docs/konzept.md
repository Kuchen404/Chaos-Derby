# Konzept und Entscheidungen

Dieses Dokument hält fest, was beim Entwurf entschieden wurde und was noch offen ist.

## Ziel

Eine Runde sitzt zusammen, sieht sich ein Rennen an und wettet vorher darauf. Drei Dinge müssen dafür stimmen:

1. Die Rennen sehen aus wie eine ernst gemeinte Fernsehübertragung mit völlig unernsten Startern.
2. Jedes Rennen verläuft anders, und bis zur Zielgeraden ist offen, wer gewinnt.
3. Die Quoten passen ungefähr zu den wahren Chancen.

## Erst simulieren, dann zeigen

Das Rennen wird im Hintergrund komplett berechnet (`simulate(seed, true)` in `js/sim.js`) und danach nur noch abgespielt. Das löst mehrere Probleme zugleich:

- **Quoten:** Vor dem Rennen laufen 1200 Simulationen ohne Aufzeichnung. Aus den Siegquoten ergibt sich die Wettquote als `0,85 / Siegchance`, also mit 15 % Abzug für die Bank. Neue Ereignisse verändern die Quoten automatisch mit.
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
- Aktuelle Siegchancen (`node tools/odds.js 3000`):

| Starter | gemischt | gut | weich | schwer |
|---|---|---|---|---|
| Pferd | 25 % | 31 % | 22 % | 16 % |
| Alpaka | 21 % | 20 % | 24 % | 21 % |
| Stier | 16 % | 13 % | 17 % | 18 % |
| Husky | 13 % | 8 % | 13 % | 22 % |
| Pferd auf zwei Beinen | 13 % | 15 % | 13 % | 9 % |
| Kuh | 12 % | 12 % | 13 % | 13 % |

  Nach jeder Änderung an den Werten mit `node tools/odds.js` prüfen.

## Darstellung

- Three.js r128, klassische Skriptdateien ohne Build-Schritt.
- Die Tiere sind fertige Modelle mit Skelett. Standardbewegungen (Galopp, Schritt, Stehen, Fressen, Umfallen) kommen aus den mitgelieferten Animationen. Die Sonderbewegungen entstehen per Code über einzelne Knochen: Aufrichten des weißen Pferds, Halsstrecken des Alpakas, gesenkter Kopf des Stiers.
- Der Mixer von Three.js schreibt unveränderte Werte nicht neu. Zusatzdrehungen müssen deshalb vor jedem Bild zurückgenommen werden (siehe `poseModel` in `js/figures.js`), sonst summieren sie sich auf.
- Jockeys, Rakete, Bahn und Tribünen bestehen aus Grundformen.
- Kamera: Startfahrt vor dem Feld, mitfahrende Seitenkamera auf die Führungsgruppe, Schnitt auf den betroffenen Starter bei Ereignissen, feste Kamera an der Ziellinie mit Zeitlupe.

## Warum diese Tiere

Das ursprüngliche Feld bestand aus Pferd, Giraffe, Elefant, Robbe, Pferd auf zwei Beinen und Schildkröte mit Rakete. Das kostenlose Modellpaket von Quaternius enthält davon nur das Pferd. Statt Modelle zuzukaufen, wurde das Feld an das Paket angepasst: Alpaka statt Giraffe, Stier statt Elefant, Husky statt Robbe, Kuh statt Schildkröte. Die Regeln blieben gleich.

Im Paket sind außerdem Esel, Hirsch, Reh, Fuchs, Wolf und Shiba Inu mit demselben Skelett. Sie lassen sich als weitere Starter einbauen.

Ein kostenpflichtiges Paket mit Giraffe, Elefant und Robbe in einheitlichem Stil gibt es von ithappy („Animals Low-Poly“, 139 $).

## Offen

- **Wetten:** Entweder ein gemeinsamer Bildschirm mit Spielgeld, bei dem einer die Tipps einträgt, oder Wetten am eigenen Handy per QR-Code. Die zweite Variante braucht einen kleinen Server. Als Wettarten reichen Sieg, Platz und Zweierwette. Alternative zu festen Quoten: Totalisator, bei dem die Quote aus den Einsätzen der Runde entsteht.
- **Mehr Abwechslung:** Bahnzustand, Zielgeraden-Ereignisse und drei neue Ereignisse sind umgesetzt (siehe oben). Offen sind weitere Starter und wechselnde Felder; beides braucht neue Modelle. Vorschlag:
  - Neue Starter aus demselben Quaternius-Paket (gleiches Skelett, gleiche Animationen): **Esel**, der an einer beliebigen Stelle stur stehen bleibt und erst weiterläuft, wenn ein anderer Starter vorbeizieht; **Hirsch**, der über die Bahn springt und dabei Meter gewinnt oder im Nachbarn landet; **Fuchs**, der sich in den Windschatten des Führenden hängt und ihn auf den letzten Metern überholt; **Shiba Inu**, der bei jedem Kommentar zur Tribüne schaut. Namen müssen noch gefunden werden.
  - Wechselnde Felder: Mit acht bis zehn Startern laufen pro Rennen sechs, ausgelost wie der Boden. Dafür muss `sim.js` statt fester Indizes (`i===0`, `rs[2]` usw.) mit Starterkennungen arbeiten, und Bahnbelegung, Figuren und Quotentafel müssen sich nach dem Feld richten.
  - Wettbewerbe mit anderer Distanz (800 oder 1200 m) wären eine weitere Abwechslung ohne neue Modelle, brauchen aber eine Bahn, deren Länge nicht fest in `scene.js` steht.
- **Kommentar als Sprache** statt nur als Text.
- **Zielfoto** und Siegerehrung nach dem Rennen.
- **Bekannte Schwächen:** Die Vorderbeine des aufrechten Pferds hängen steif nach unten. Die Kameraregie wurde nur an Standbildern geprüft.
