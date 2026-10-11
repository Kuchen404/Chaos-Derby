# Chaos-Derby

Ein Partyspiel für eine große Runde: Auf dem Fernseher oder Beamer läuft ein absurdes Tierrennen, und alle wetten vorher auf den Ausgang. In jedem Rennen passieren unvorhersehbare Dinge, trotzdem stimmen die Quoten.

Die Idee ist von der japanischen DVD-Reihe „Japan World Cup“ inspiriert. Figuren, Namen und Code sind eigene.

## Stand

- **3D-Rennen** (`index.html`): zwölf Starter als Tiermodelle mit Skelett, pro Rennen ein ausgelostes Feld von sechs, Fehlschläge, die andere Starter mitreißen, Kameraregie mit Schnitten auf die Ereignisse, Zeitlupe im Ziel, Zielfoto und Siegerehrung auf dem Podest, vor dem Start eine Vorstellung aller Starter in Nahaufnahme mit eigener Szene je Tier, Musik und Geräusche (im Browser erzeugt), Live-Kommentar als Text und gesprochen von einem japanischen Sprecher, der im Rennverlauf immer mehr abdreht (wahlweise deutsch), Quotentafel.
- **2D-Rennen** (`classic/index.html`): die erste, flache Fassung in Seitenansicht. Sie zeigt noch das alte Starterfeld (Giraffe, Elefant, Robbe, Schildkröte) und wird nicht weiterentwickelt.
- **Wetten** am gemeinsamen Bildschirm mit Spielgeld: Mitspieler anlegen, Sieg, Platz oder Zweierwette zu festen Quoten setzen, nach dem Rennen wird ausgezahlt. Wetten am Handy fehlt noch.
- **Bahnzustand:** Vor jedem Rennen wird der Boden ausgelost (gut, weich, schwer). Quoten und Wetten gelten für diesen Boden.

## Online spielen

Die Seite wird bei jedem Push auf `main` automatisch auf GitHub Pages veröffentlicht: https://kuchen404.github.io/Chaos-Derby/ (die 2D-Fassung unter `classic/`).

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
| 7 | Sturkopf | Esel | bleibt stur stehen, bis ihn einer überholt |
| 8 | Platzhirsch | Hirsch | springt in großen Sätzen, landet nicht immer |
| 9 | Schreckhaft | Reh | sehr schnell, erstarrt aber bei jedem Krach |
| 10 | Schlitzohr | Fuchs | hängt sich in den Windschatten und zieht spät vorbei |
| 11 | Hetzjagd | Wolf | jagt den Vordermann, der rennt dann um sein Leben |
| 12 | Schnüffelnase | Shiba Inu | schnüffelt herum, bekommt dann seine fünf Minuten |

Pro Rennen laufen sechs davon, ausgelost vor jedem Rennen.

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
| `js/ceremony.js` | Zielfoto und Siegerehrung |
| `js/parade.js` | Vorstellung der Starter vor dem Rennen (Kamerafahrt, Szenen, Bauchbinde) |
| `js/sfx.js` | Hintergrundmusik und Geräusche, per Web Audio erzeugt |
| `js/voice.js` | gesprochener Kommentar über die Sprachausgabe des Browsers |
| `js/jikkyo.js` | japanische Ansagen mit steigender Aufregung (Quelle für die Aufnahmen) |
| `audio/` | die japanischen Ansagen als Aufnahmen, erzeugt mit VOICEVOX |
| `js/betting.js` | Wettbüro auf der Seite: Mitspieler, Wettschein, Abrechnung |
| `js/main.js` | Abspielen, Bedienung, Quotentafel |
| `models/` | die elf Tiermodelle, auf die benutzten Animationen verkleinert |
| `vendor/` | Three.js r128 und der glTF-Lader |
| `tools/jikkyo-render.js` | Aufnahmen des Kommentators neu erzeugen (braucht VOICEVOX und ffmpeg) |
| `tools/odds.js` | Balance und Quoten prüfen: `node tools/odds.js 3000` |
| `tools/bets-test.js` | Wettlogik prüfen: `node tools/bets-test.js` |
| `tools/sfx-test.js` | Geräusche prüfen: `node tools/sfx-test.js` (braucht Playwright) |
| `tools/regie.js` | Kameraregie in Bewegung prüfen: `node tools/regie.js 60` (braucht Playwright) |
| `tools/slim-models.js` | Modelle aus den Originaldateien neu erzeugen |

Die Skripte sind einfache Skriptdateien ohne Build-Schritt. Sie teilen sich globale Namen und müssen in der Reihenfolge aus `index.html` geladen werden.

Mehr zu den Entscheidungen und den offenen Punkten steht in [`docs/konzept.md`](docs/konzept.md).

## Lizenzen fremder Bestandteile

- **Tiermodelle:** Quaternius, „Ultimate Animated Animals“, CC0. https://quaternius.com/packs/ultimateanimatedanimals.html
- **Stimme des Kommentators:** VOICEVOX:青山龍星. https://voicevox.hiroshiba.jp/ , Nutzungsbedingungen der Stimme: https://www.virvoxproject.com/voicevoxの利用規約
- **Musik und Geräusche:** eigener Code (Web-Audio-Synthese), keine fremden Tondateien.
- **Three.js** und GLTFLoader: MIT, siehe `vendor/THREE-LICENSE.txt`.

Für den eigenen Code ist noch keine Lizenz festgelegt.
