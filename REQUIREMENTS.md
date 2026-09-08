# Project: Firefighting Water Relay Calculator (PWA)

## 1. Project Overview
A client-side, offline-capable Progressive Web App (PWA) designed to calculate water transport over long distances ("Wasserförderung über lange Wegstrecken"). The app allows users to set GPS waypoints, fetches elevation data, and calculates required pump relays based on hydraulic friction, elevation changes, and real-world hose laying factors.

## 2. Tech Stack
*   **Frontend Framework:** React or Vue.js (via Vite)
*   **Styling:** Tailwind CSS
*   **Mapping:** Leaflet.js with OpenStreetMap tiles
*   **State Management:** Zustand (React) or Pinia (Vue)
*   **Deployment:** Cloudflare Pages (via GitHub Actions)
*   **APIs:** Open-Elevation API (for topography)

## 3. Core Features & User Inputs

### 3.1 Map & Routing
*   **Waypoint Placement:** Users can click on the map to place waypoints or use their device's GPS to drop a point at their current location.
*   **Distance Calculation:** Automatically calculate the shortest geographic distance between waypoints.
*   **Elevation Data:** Automatically fetch the altitude (in meters) for each waypoint via API, with an option for manual override if offline.

### 3.2 Hose Configuration
*   **Hose Types:** Dropdown to select hose type (B-Hose, C-Hose).
*   **Friction Loss:** Configurable internal resistance (e.g., 0.1 bar per 100m for B-Hose at 800 l/min).
*   **Hose Laying Factor (Real-World Offset):** A configurable multiplier to account for bights, curves, and terrain adaptation.
    *   *Default:* +10% (Factor 1.1).
    *   *Calculation:* `Effective Distance = Map Distance * Laying Factor`.

### 3.3 Pump Configuration (Relay Stations)
*   **Pre-defined Profiles:** Dropdown with standard equipment:
    *   PFPN 10-1000 (10 bar at 1000 l/min)
    *   TS 8/8 (8 bar at 800 l/min)
*   **Custom Pump Mode:** Manual input fields for:
    *   Target Flow Rate ($Q$ in l/min)
    *   Max Output Pressure (usually 8 to 10 bar)
    *   Minimum Required Input Pressure (default 1.5 bar to prevent cavitation).

## 4. Hydraulic Calculation Logic
The application must execute the following formulas continuously as waypoints are updated:

1.  **Effective Hose Length:**
    $$L_{eff} = L_{map} \times (1 + \frac{\text{Laying Factor \%}}{100})$$
2.  **Friction Loss ($p_{r}$):**
    $$p_{r} = \left( \frac{L_{eff}}{100} \right) \times \text{Friction per 100m}$$
3.  **Elevation Pressure Change ($\Delta p_{h}$):**
    $$\Delta p_{h} = \frac{\Delta h \text{ (in meters)}}{10}$$
    *(Note: Uphill adds required pressure, downhill subtracts required pressure).*
4.  **Pump Placement Algorithm:**
    *   Start at the water source with the configured Max Output Pressure.
    *   Iterate along the effective distance.
    *   If the calculated pressure drops to the Minimum Required Input Pressure (e.g., 1.5 bar), a new relay pump must be placed at that exact distance.

## 5. UI / UX Requirements
*   **Mobile-First:** The UI must be fully responsive and optimized for touch targets on smartphones.
*   **Offline Capability:** The PWA must cache core assets and the calculation logic via Service Worker.
*   **Visual Output:** 
    *   A 2D elevation profile chart (distance vs. altitude).
    *   Markers on the map indicating exactly where relay pumps need to be positioned.
    *   A summary panel showing total hoses needed (pieces of 20m), total effective distance, and number of pumps.

## 6. Testing & CI/CD
*   Unit tests for the calculation module (verifying friction loss, elevation loss, and correct pump placement).
*   A `.github/workflows/deploy.yml` file to automatically build and deploy to Cloudflare Pages on `main` branch pushes.