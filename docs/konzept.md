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
- Jeder Starter hat ein Grundtempo, ein leichtes Tempo-Rauschen, einen Faktor für die zweite Rennhälfte und einen Faktor bei Regen.
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

- Das Alpaka gewinnt im Ziel bis zu 4 m durch den gestreckten Hals.
- Aktuelle Siegchancen: Pferd rund 30 %, Alpaka 20 %, Pferd auf zwei Beinen 17 %, Kuh 14 %, Stier 12 %, Husky 6 %. Nach jeder Änderung an den Werten mit `node tools/odds.js` prüfen.

## Wetten

Gewettet wird an einem gemeinsamen Bildschirm mit Spielgeld. Einer bedient das Wettbüro unter dem Sendebild, die Runde sagt ihre Tipps an. Die Logik steht in `js/bets.js` (ohne Grafik, läuft auch in Node), die Bedienung in `js/betting.js`.

- **Mitspieler:** Jeder trägt sich mit Namen ein und bekommt 100 Taler. Kassen und offene Wetten bleiben im Browser gespeichert, auch nach dem Neuladen. „Kasse zurücksetzen“ löscht alles.
- **Wettarten:** Sieg (Starter gewinnt), Platz (Starter wird Erster oder Zweiter) und Zweierwette (Erster und Zweiter in genau dieser Reihenfolge).
- **Feste Quoten:** Alle drei kommen aus denselben Probeläufen mit 15 % Abzug. Angezeigt wird eine Nachkommastelle, und genau diese Quote wird ausgezahlt. Sie gilt ab Abgabe der Wette. Obergrenze 99 für Sieg und Platz, 250 für die Zweierwette, Untergrenze 1,1.
- **Ablauf:** Der Einsatz geht sofort von der Kasse ab, bis zum Start lässt sich eine Wette zurücknehmen. Mit dem Start schließt das Wettbüro. Nach dem Zieleinlauf wird einmal abgerechnet, eine Wiederholung zahlt nicht noch einmal aus. „Neues Rennen“ startet nicht mehr sofort, sondern öffnet zuerst das Wettbüro.
- **Gegenprobe:** `node tools/odds.js` setzt in 3000 Rennen, die nicht in die Quoten eingeflossen sind, auf jede Möglichkeit einen Taler. Ergebnis zuletzt: Sieg zahlt 0,86 je Taler aus, Platz 0,81, Zweierwette 0,78. Platz liegt durch das Runden kleiner Quoten (Pferd 1,3) etwas unter 0,85, die Zweierwette durch seltene Einläufe und die Obergrenze. Für ein Partyspiel reicht das.

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

- **Wetten am Handy:** Wetten am eigenen Handy per QR-Code. Braucht einen kleinen Server; die Wettlogik in `js/bets.js` lässt sich dafür übernehmen. Ebenfalls offen: Totalisator statt fester Quoten, bei dem die Quote aus den Einsätzen der Runde entsteht.
- **Mehr Abwechslung:** weitere Starter und Ereignisse, wechselnde Felder pro Rennen, Ereignisse, die gezielt auf die Zielgerade fallen.
- **Kommentar als Sprache** statt nur als Text.
- **Zielfoto** und Siegerehrung nach dem Rennen.
- **Bekannte Schwächen:** Die Vorderbeine des aufrechten Pferds hängen steif nach unten. Die Kameraregie wurde nur an Standbildern geprüft.
