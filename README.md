# Löschzug Wasser

**Löschzug Wasser** unterstützt bei der Planung von Wasserförderung über lange Wegstrecken. Auf einer Karte werden Strecke und Wegpunkte festgelegt. Daraus berechnet die Anwendung Schlauchbedarf, Höhenprofil, Druckverluste und mögliche Relaispumpen.

Die Anwendung funktioniert auf Desktop, Tablet und Smartphone. Eine Planung kann über einen Link oder QR-Code mit anderen Einsatzkräften geteilt werden.

## Anwendung öffnen

Die aktuelle Version ist online verfügbar:

**https://baumfaust.github.io/loeschzug-wasser/**

Für die Nutzung werden eine Internetverbindung und ein moderner Browser benötigt.

<div align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript 6" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet" alt="Leaflet" />
  <img src="https://img.shields.io/badge/Zustand-5-000000?style=for-the-badge&logo=zustand" alt="Zustand" />
</div>

## Eine Strecke planen

1. **Startpunkt setzen:** Auf die Karte tippen oder klicken.
2. **Zwischenpunkte setzen:** Bei längeren oder kurvigen Strecken zusätzliche Punkte einfügen.
3. **Zielpunkt setzen:** Der letzte Wegpunkt ist das Ziel.
4. **Routenführung auswählen:** Mit „Straßen folgen“ wird die Strecke entlang des Straßennetzes geführt. Ist die Option deaktiviert, wird die direkte Verbindung verwendet.
5. **Ergebnisse prüfen:** Die Anwendung zeigt Entfernung, effektive Schlauchstrecke, Höhenprofil, Druckverluste und Pumpenbedarf.

Die Wegpunkte können über die Kartenmarker bearbeitet oder gelöscht werden. Mit „Löschen“ wird die gesamte aktuelle Strecke entfernt.

## Berechnungsergebnisse

Die Berechnung berücksichtigt:

- die tatsächliche Karten- bzw. Straßenentfernung,
- den eingestellten Wegreservefaktor,
- Reibungsverluste in der Schlauchleitung,
- Druckänderungen durch Steigungen und Gefälle,
- das gewählte Pumpenprofil und den Mindestdruck.

Steigungen verursachen einen zusätzlichen Druckverlust. Gefälle wirken sich umgekehrt als Druckgewinn aus. Auf dieser Grundlage werden Relaispumpen vorgeschlagen, wenn der verfügbare Druck unter den Mindestwert fällt.

Das Höhenprofil basiert auf Geländeproben entlang der Strecke und nicht nur auf den gesetzten Wegpunkten. Die Darstellung wird geglättet, damit der Verlauf besser lesbar ist.

## Einstellungen

Im Menü können folgende Werte angepasst werden:

- **Reibungsverlust pro 100 m:** Reibungswert der Schlauchleitung.
- **Wegreserve:** Zuschlag für die reale Verlegung der Schläuche.
- **Pumpen-Profil:** PFPN 10-1000, TS 8/8 oder ein eigenes Profil.
- **Maximaler Pumpendruck:** Ausgangsdruck der Pumpe bei einem eigenen Profil.
- **Mindestdruck am Pumpeneingang:** Druckgrenze für die Pumpenplatzierung.
- **Straßen folgen:** Routenberechnung entlang vorhandener Straßen.
- **Hydranten anzeigen:** Zeigt bekannte OpenStreetMap-Hydranten im Umfeld der Wegpunkte an.

## Nutzung auf dem Smartphone

Auf kleinen Bildschirmen bleibt die Karte als Hauptansicht sichtbar:

- Das Menü wird über **☰ Menü** geöffnet und wieder geschlossen.
- Das Berechnungsergebnis kann als **Normal**, **Kompakt** oder **Aus** angezeigt werden.
- Im kompakten Modus bleiben nur die wichtigsten Werte sichtbar.
- Das Höhenprofil liegt am unteren Rand und kann bei Bedarf genutzt werden.

## Planung teilen

Jede Änderung an Wegpunkten und Einstellungen wird automatisch in der URL gespeichert.

1. Menü öffnen.
2. Unter **Teilen** auf **Link kopieren** tippen oder klicken.
3. Den Link an eine andere Person senden.

Die empfangende Person sieht nach dem Öffnen dieselbe Planung mit denselben Wegpunkten und Einstellungen.

Für die Übernahme auf ein Smartphone:

1. **QR-Code** im Menü auswählen.
2. Den angezeigten QR-Code mit dem Smartphone scannen.
3. Den geöffneten Link im mobilen Browser aufrufen.

## Hinweise

- Karten-, Höhen- und Routendaten stammen von externen Diensten und benötigen eine Internetverbindung.
- Hydrantendaten sind OpenStreetMap-Daten und möglicherweise nicht vollständig oder aktuell.
- Die Ergebnisse dienen der Planung und Entscheidungsunterstützung. Sie ersetzen keine örtliche Prüfung, Einsatzleitung oder verbindliche technische Berechnung.
- Vor einer Verwendung im Einsatz müssen Strecke, Wasserentnahmestelle, Schlauchmaterial und Pumpen vor Ort überprüft werden.

## Lokale Entwicklung

Voraussetzungen: Node.js 18 oder höher und npm.

```bash
npm install
npm run dev
```

Die lokale Anwendung ist anschließend normalerweise unter `http://localhost:5173` erreichbar.

Für einen Produktions-Build und die Qualitätsprüfung:

```bash
npm run build
npm run lint
```

## Lizenz

Dieses Projekt ist für den internen und experimentellen Einsatz im jeweiligen Repository- oder Teamkontext vorgesehen.

