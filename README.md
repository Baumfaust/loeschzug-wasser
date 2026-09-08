# Loeschzug Wasser

Ein Desktop-Webtool zur Berechnung von Wasserförderung über lange Wegstrecken mit interaktiver Karte, Höhenprofil und Pumpenlogik für Einsatzsituationen im Feuerwehr- und Hilfsdienstbereich.

<div align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript 6" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet" alt="Leaflet" />
  <img src="https://img.shields.io/badge/Zustand-5-000000?style=for-the-badge&logo=zustand" alt="Zustand" />
</div>

## Überblick

Das Projekt ist eine clientseitige Webanwendung, mit der Strecken für die Wasserförderung über längere Distanzen modelliert und berechnet werden können. Dabei werden Wegpunkte auf einer Karte gesetzt, Höhenwerte über eine API abgerufen und anschließend die benötigten B-Schläuche sowie mögliche Zwischenpumpen automatisch ermittelt.

Die Anwendung ist bewusst als Desktop-UI aufgebaut und fokussiert sich auf eine klare, schnelle Arbeitsfläche mit Karte, Konfigurationsbereich und Ergebnisübersicht.

## Kernfunktionen

- Interaktive Karte mit OpenStreetMap-Kacheln
- Platzierung von Start-, Zwischen- und Zielpunkten direkt auf der Karte
- automatische Höhenabfrage für einzelne Wegpunkte
- Berechnung der effektiven Strecke mit Laying-Faktor
- Bestimmung der benötigten B-Schläuche (20 m pro Stück)
- Simulation von Relaispumpen anhand von Druckverlusten und Höhenunterschieden
- Ergebnisanzeige mit Gesamtdistanz, Pumpenbedarf und Segmentübersicht
- einfache Anpassung der Schlauch- und Pumpenparameter

## Tech Stack

- React + TypeScript
- Vite
- Leaflet + react-leaflet
- Tailwind CSS
- Zustand
- Open-Elevation API
- PWA-Support via vite-plugin-pwa

## Projektstruktur

```text
src/
├── components/
│   ├── Dashboard/
│   │   ├── ElevationChart.tsx
│   │   └── ResultsPanel.tsx
│   ├── Map/
│   │   └── MapView.tsx
│   └── Sidebar/
│       └── Sidebar.tsx
├── store/
│   └── useWaterStore.ts
├── types/
│   └── water.ts
├── utils/
│   ├── elevation.ts
│   └── hydraulics.ts
├── App.tsx
├── index.css
└── main.tsx
```

## So funktioniert die Berechnung

Die Anwendung berücksichtigt drei zentrale Faktoren:

1. Laufweg der Wasserstrecke
2. Reibungsverlust im Schlauch
3. Höhenunterschiede zwischen den Wegpunkten

Die Berechnung folgt dabei dem Grundprinzip:

- Effektive Strecke = Kartenstrecke × Laying-Faktor
- Reibungsverlust = (effektive Strecke / 100) × Reibung pro 100 m
- Höhenänderung = Höhenunterschied / 10 in bar
- Wenn der Druck unter den Mindestwert fällt, wird eine Pumpe platziert

## Schnellstart

### Voraussetzungen

- Node.js 18 oder höher
- npm oder pnpm

### Installation

```bash
npm install
```

### Entwicklung starten

```bash
npm run dev
```

Danach öffnest du die lokale App im Browser, normalerweise unter:

```text
http://localhost:5173
```

### Build erzeugen

```bash
npm run build
```

### Vorschau des Builds

```bash
npm run preview
```

## Verwendungsablauf

1. Karte öffnen und Wegpunkte setzen
2. Startpunkt und Zielpunkt definieren
3. Zwischenpunkte je nach Bedarf ergänzen
4. Höhenwerte automatisch abrufen lassen
5. Schlauchfaktor und Pumpenprofil anpassen
6. Berechnung prüfen und Ergebnisse im Dashboard auswerten

## Konfigurierbare Parameter

- Schlauchlänge pro B-Schlauch: Standard 20 m
- Reibungsverlust pro 100 m
- Laying-Faktor für reale Leitungsführung
- Pumpenprofil:
  - PFPN 10-1000
  - TS 8/8
  - custom
- Mindestdruck am Pumpeneingang
- maximale Ausgangsleistung der Pumpe

## Hinweise

- Die App nutzt OpenStreetMap-Karten und eine externe Höhen-API.
- Ein stabiler Internetzugang ist für die Höhenabfrage erforderlich.
- Die Berechnung dient als Planungs- und Entscheidungsunterstützung und ist nicht als regulatorische oder technisch verbindliche Norm anzusehen.

## Lizenz

Dieses Projekt ist frei für den internen und experimentellen Einsatz im Rahmen des jeweiligen Repository- oder Teamkontexts.

## Entwicklerhinweis

Für die lokale Qualitätssicherung kannst du zusätzlich folgenden Check ausführen:

```bash
npm run lint
```

Wenn du das Projekt weiterentwickeln möchtest, ist die Struktur in `src/components`, `src/store` und `src/utils` bereits auf eine einfache Erweiterung vorbereitet.

