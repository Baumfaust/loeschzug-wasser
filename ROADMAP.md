# Roadmap

_As of 2026-10-26. Update the status column when work starts or finishes, and move finished items to **Done**._

Since the DGM1 milestone the elevation input is good. The weakest links are now the **hydraulic model** and
**usability in the field**.

**Benefit:** ★★★ high · ★★ medium · ★ low
**Effort:** S (≤ ½ day) · M (1–2 days) · L (> 2 days)
**Status:** ☐ open · ◐ in progress · ☑ done

## P1: Correctness (safety-relevant, do first)

| # | Status | Topic | Benefit | Effort |
|---|---|---|---|---|
| 1 | ☐ | Flow-dependent friction loss | ★★★ | S–M |
| 2 | ☐ | Check the end pressure at the target | ★★★ | S |
| 3 | ☐ | Maximum-pressure warning in valleys | ★★★ | S |
| 4 | ☐ | Bridges and tunnels in the elevation profile | ★★ | M |
| 5 | ☐ | Reference tests from teaching material | ★★ | S |
| 5a | ☐ | Place pumps before the pressure drops below the minimum | ★★★ | S |

### 1. Flow-dependent friction loss
- **Finding:** `PumpConfig.targetFlowRate` is never used in the calculation. Friction is a fixed
  `HoseConfig.frictionPer100m` (default 1.0 bar/100 m), even though the default pump profile PFPN 10-1000 runs at
  1000 l/min. Friction rises roughly with the square of the flow (B hose at 1000 l/min ≈ 1.5 bar/100 m).
  **The app currently recommends too few pumps and spaces them too far apart.**
- **Idea:** extend `HoseConfig` with hose type (B 75 mm / A 110 mm / F 150 mm) and the number of parallel lines.
  Compute `friction = k_type × (Q / lines)²`, calibrated so B at 800 l/min = 1.0 bar/100 m (value from
  `REQUIREMENTS.md`). Take Q from the pump profile (`getPumpConfig` in `src/utils/hydraulics.ts`). Keep a manual override.

### 2. Check the end pressure
- **Finding:** `calculateWaterRelay` never places a pump at the last sample, and nothing warns if the pressure at the
  target is below the minimum input pressure. The result can show "0 pumps" even though the water doesn't arrive at
  the required pressure.
- **Idea:** add the end pressure to `CalculationResult`, show it in `ResultsPanel.tsx`, and warn if it's too low.

### 3. Maximum pressure in valleys
- **Finding:** downhill sections increase the pressure without limit. There is no warning when the hose or pump-inlet
  limit is exceeded.
- **Idea:** configurable maximum (e.g. 12 bar); mark the affected section in the chart; suggest a pressure-relief
  valve or a different pump position.

### 4. Bridges and tunnels
- **Finding:** a terrain model shows the ground under a bridge and the hill above a tunnel. That creates false dips,
  peaks and pumps.
- **Idea:** query OSM ways with `bridge=yes` / `tunnel=yes` along the route via Overpass (as in `src/utils/osm.ts`)
  and interpolate the profile linearly across them.

### 5. Reference tests
- Use worked examples from teaching material (e.g. LFKS RLP, "Wasserförderung über lange Wegstrecken") as tests for
  `calculateWaterRelay`. They secure items 1–3 against the textbook values.

**Suggested next PR:** items 1 + 2 + 3 + 5 together: "Hydraulic model: flow-dependent friction, end and maximum
pressure". Small effort, biggest gain in correctness.

### 5a. Pumps placed too late on steep climbs
- **Finding:** a pump is placed at the first 5 m sample where the pressure is already at or below the minimum. On
  steep climbs the pressure falls by several tenths of a bar per sample, so it ends up clearly below the minimum
  (visible in the new pressure panel, e.g. Koblenz → Ehrenbreitstein just before P3).
- **Idea:** interpolate the exact distance where the pressure reaches the minimum and place the pump there.

## P2: Usability in the field

| # | Status | Topic | Benefit | Effort |
|---|---|---|---|---|
| 6 | ☐ | PWA + offline mode | ★★★ | M |
| 7 | ☐ | Material list per pump section | ★★★ | S–M |
| 8 | ☐ | Print / PDF briefing sheet | ★★ | M |
| 9 | ☐ | Move pumps on map/profile, snap to accessible positions | ★★ | M |
| 10 | ☐ | Saved plans on the device + undo | ★★ | S–M |
| 11 | ☐ | Edit waypoints (drag, insert) and manual heights | ★★ | M |
| 12 | ☐ | Water source capacity check | ★ | S |

- **6. PWA + offline:** installable on phones; cache the app, map tiles and elevation tiles for the planned area;
  store plans on the device. Mobile coverage is often poor in the field. Store apps later only if needed (Capacitor).
- **7. Material list:** B hoses per pump section incl. reserve, couplings, transport (e.g. hose vehicle SW 2000),
  crew estimate.
- **8. Briefing sheet:** printable page or PDF with map, elevation profile, pump list and material.
- **9. Pump positions:** drag pumps on the map or in the profile, snap to roads; recommend positions before crests.
- **10. Saved plans:** list of plans on the device, plus undo for the last changes.
- **11. Waypoints:** drag and insert waypoints; manual height input (the store already has a
  `manualElevationOverride` flag, but there is no UI).
- **12. Water source:** show hydrant output (OSM `fire_hydrant:flow_capacity`) and warn if it's below the flow rate.

## P3: Operation and maintenance

| # | Status | Topic | Benefit | Effort |
|---|---|---|---|---|
| 13 | ☐ | Reduce dependence on free public services | ★★ (risk) | M |
| 14 | ☐ | End-to-end test of the main flow | ★★ | M |
| 15 | ☐ | Small code cleanup | ★ | S |
| 16 | ☐ | Laying-time estimate, accessibility, English UI | ★ | M |

- **13. External services:** the OSRM demo router and the OSM tile servers forbid heavy use. Plan a fallback or
  self-hosting before the app gets wider use.
- **14. E2E test** (e.g. Playwright): click a route → profile loads → pumps appear; also guards against the zoom bug.
- **15. Cleanup:** lint warning in `ElevationChart.tsx` (move `getPressureChartConfig` into a utility), and the
  misleading field name `pressureBeforePump`.

## Done

### 2026-10-26: elevation milestone
- ☑ Elevation from Mapterhorn terrain tiles: official DGM1 Rheinland-Pfalz (1 m laser scan), with AWS Terrain Tiles
  and Open-Elevation as fallbacks (PR #1)
- ☑ No more silent 0 m fallback: missing heights show a warning and a reload button (PR #1)
- ☑ Smoothing once in the calculation, matched to the data resolution (PR #1)
- ☑ Shared links reload the elevation profile (PR #1)
- ☑ The map no longer zooms out when waypoints are added (PR #1)
- ☑ README and requirements updated (PR #1)
- ☑ Licensed under EUPL-1.2 (PR #2)
- ☑ `main` protected by a ruleset (PRs only, CI must pass, squash merges); Dependabot enabled
- ☑ Readable elevation chart: key figures (ascent, descent, highest/lowest point, steepest spot), separate height and
  pressure panels, full width, hover tooltip, collapsible
- ☑ Light/dark theme with Auto / Hell / Dunkel switch (Auto follows the device)
- ☑ Shared links zoom to the route again
