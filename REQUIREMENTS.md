# Project: Firefighting Water Relay Calculator (Desktop Web App)

## 1. Project Overview
A client-side web application designed to calculate water transport over long distances ("Wasserförderung über lange Wegstrecken"). The initial focus is on a robust Desktop UI. The app allows users to set waypoints on a map, fetches elevation data, and calculates required relay pumps and the exact number of standard B-Hoses.

## 2. Tech Stack
* **Frontend Framework:** React (via Vite)
* **Styling:** Tailwind CSS
* **Mapping:** Leaflet.js with OpenStreetMap tiles
* **State Management:** Zustand
* **Deployment:** Cloudflare Pages (via GitHub Actions)
* **APIs:** Open-Elevation API (for topography)

## 3. Core Features & User Inputs

### 3.1 Desktop Map & Routing
* **Split-Screen Layout:** A large map area on one side, and a fixed calculation dashboard/sidebar on the other side.
* **Waypoint Placement:** Users click on the map to place start, intermediate, and end waypoints.
* **Elevation Fetching:** Automatically fetch altitude (in meters) for each waypoint via API, with manual override inputs.

### 3.2 Hose Calculation (Focus on B-Hoses)
* **Standard Hose Logic:** Calculations default to standard B-Hoses (20 meters length per piece).
* **Friction Loss:** Configurable internal resistance (Default: 1.0 bar per 100m for B-Hose at 800 l/min).
* **Laying Factor (Real-World Offset):** A configurable multiplier to account for bights, curves, and terrain adaptation.
    * *Default:* +10% (Factor 1.1).
    * *Calculation:* `Effective Distance = Map Distance * Laying Factor`.
* **Output:** The app must explicitly output the required total number of B-Hoses (calculated as `Effective Distance / 20m`, rounded up).

### 3.3 Pump Configuration (Relay Stations)
* **Pre-defined Profiles:**
    * PFPN 10-1000 (10 bar at 1000 l/min)
    * TS 8/8 (8 bar at 800 l/min)
* **Custom Pump Mode:** Manual input fields for Target Flow Rate, Max Output Pressure, and Minimum Required Input Pressure (default 1.5 bar).

## 4. Hydraulic Calculation Logic
1. **Effective Hose Length:**
   $$L_{eff} = L_{map} \times (1 + \frac{\text{Laying Factor \%}}{100})$$
2. **Friction Loss ($p_{r}$):**
   $$p_{r} = \left( \frac{L_{eff}}{100} \right) \times \text{Friction per 100m}$$
3. **Elevation Pressure Change ($\Delta p_{h}$):**
   $$\Delta p_{h} = \frac{\Delta h \text{ (in meters)}}{10}$$
4. **Pump Placement Algorithm:**
   * Start at the water source with the configured Max Output Pressure.
   * Iterate along the effective distance.
   * If the calculated pressure drops to the Minimum Required Input Pressure (e.g., 1.5 bar), place a relay pump.

## 5. UI Requirements (Desktop)
* A fixed sidebar for configuration (Hose factor, Pump selection).
* A large, interactive Leaflet map taking up the majority of the screen.
* A results panel showing:
    * Total distance (Map vs. Effective).
    * Total number of standard 20m B-Hoses required.
    * Number of relay pumps required.
    * A distance/elevation chart.