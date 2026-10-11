# Chaos-Derby

Ein Partyspiel für eine große Runde: Auf dem Fernseher oder Beamer läuft ein absurdes Tierrennen, und alle wetten vorher auf den Ausgang. In jedem Rennen passieren unvorhersehbare Dinge, trotzdem stimmen die Quoten.

Die Idee ist von der japanischen DVD-Reihe „Japan World Cup“ inspiriert. Figuren, Namen und Code sind eigene.

## Stand

- **3D-Rennen** (`index.html`): sechs Starter als Tiermodelle mit Skelett, Kameraregie mit Schnitten auf die Ereignisse, Zeitlupe im Ziel, Live-Kommentar als Text und Quotentafel.
- **2D-Rennen** (`classic/index.html`): die erste, flache Fassung in Seitenansicht. Sie zeigt noch das alte Starterfeld (Giraffe, Elefant, Robbe, Schildkröte) und wird nicht weiterentwickelt.
- **Wetten** am gemeinsamen Bildschirm mit Spielgeld: Mitspieler anlegen, Sieg, Platz oder Zweierwette zu festen Quoten setzen, nach dem Rennen wird ausgezahlt. Wetten am Handy fehlt noch.

## Starten

Die 3D-Fassung lädt ihre Modelle nach und braucht deshalb einen Webserver. Ein Doppelklick auf `index.html` reicht nicht.

```
python3 -m http.server 8000
```

Danach im Browser `http://localhost:8000` öffnen. Alternativ lässt sich das Repository über GitHub Pages veröffentlichen, dann läuft das Spiel unter einer festen Adresse.

Das Spiel läuft ohne Internet. Nur die Schriften kommen von Google Fonts; ohne Verbindung erscheinen Ersatzschriften.

## Die Starter

| Nr | Name | Tier | Besonderheit |
|---|---|---|---|
| 1 | Sekundenschlaf | Pferd | schnell, schläft in Führung aber gern ein |
| 2 | Hals über Kopf | Alpaka | frisst unterwegs, streckt im Ziel den Hals |
| 3 | Dampfwalze | Stier | langsam, räumt beim Sturmlauf alles ab |
| 4 | Schmuddelwetter | Husky | trottet lustlos, außer es regnet |
| 5 | Aufrechter Gang | Pferd auf zwei Beinen | der Schnellste, läuft manchmal zurück |
| 6 | Spätzünder | Kuh mit Rakete | trottet, bis die Rakete zündet |

## Aufbau

Der wichtigste Grundsatz: **erst simulieren, dann zeigen.** Ein Rennen wird vollständig ausgerechnet, bevor es jemand sieht. Dadurch kennt die Regie den Verlauf im Voraus, und die Quoten lassen sich aus vielen unsichtbaren Probeläufen ableiten.

| Datei | Aufgabe |
|---|---|
| `js/sim.js` | Rennsimulation: Starterwerte, Ereignisse, Kommentarzeilen. Kennt keine Grafik und läuft auch in Node. |
| `js/bets.js` | Wetten: Quoten für Sieg, Platz und Zweierwette, Kasse, Abrechnung. Ohne Grafik, läuft auch in Node. |
| `js/state.js` | gemeinsame Konstanten und Zustand der 3D-Ansicht |
| `js/figures.js` | Tiermodelle laden, Jockeys und Rakete, Animation je Bild |
| `js/scene.js` | Bahn, Tribünen, Licht, Regen, Partikel |
| `js/director.js` | Kameraregie |
| `js/betting.js` | Wettbüro auf der Seite: Mitspieler, Wettschein, Abrechnung |
| `js/main.js` | Abspielen, Bedienung, Quotentafel |
| `models/` | die fünf Tiermodelle, auf die benutzten Animationen verkleinert |
| `vendor/` | Three.js r128 und der glTF-Lader |
| `tools/odds.js` | Balance und Quoten prüfen: `node tools/odds.js` |
| `tools/bets-test.js` | Wettlogik prüfen: `node tools/bets-test.js` |
| `tools/slim-models.js` | Modelle aus den Originaldateien neu erzeugen |

Die Skripte sind einfache Skriptdateien ohne Build-Schritt. Sie teilen sich globale Namen und müssen in der Reihenfolge aus `index.html` geladen werden.

Mehr zu den Entscheidungen und den offenen Punkten steht in [`docs/konzept.md`](docs/konzept.md).

## Lizenzen fremder Bestandteile

- **Tiermodelle:** Quaternius, „Ultimate Animated Animals“, CC0. https://quaternius.com/packs/ultimateanimatedanimals.html
- **Three.js** und GLTFLoader: MIT, siehe `vendor/THREE-LICENSE.txt`.

Für den eigenen Code ist noch keine Lizenz festgelegt.
