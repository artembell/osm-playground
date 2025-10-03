## osm-playground

### What is this?
An experimental playground for rendering and animating OpenStreetMap-based scenes in the browser using `maplibre-gl` and `three`. It includes simple utilities to animate a moving object and to visualize a route geometry. By default, a static route geometry is used from local code for quick demos.

### Run locally
Prerequisites:
- Node.js 18+ and npm

Install and start the dev server (Vite):

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

### Connect an OSRM backend (routing)
This project can be pointed at an OSRM server to fetch live routes instead of using the bundled static route. OSRM is the Open Source Routing Machine.

Run OSRM quickly with Docker (example: Berlin extract):

```bash
# 1) Download a PBF extract
wget http://download.geofabrik.de/europe/germany/berlin-latest.osm.pbf

# 2) Extract with car profile
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/berlin-latest.osm.pbf || echo "osrm-extract failed"

# 3) Partition and customize (MLD pipeline)
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/berlin-latest.osrm || echo "osrm-partition failed"
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/berlin-latest.osrm || echo "osrm-customize failed"

# 4) Start the HTTP server (port 5000)
docker run -t -i -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/berlin-latest.osrm
```

Test the OSRM server:

```bash
curl "http://127.0.0.1:5000/route/v1/driving/13.388860,52.517037;13.385983,52.496891?steps=true"
```

OSRM reference: see the official repository and quick start docs at [`https://github.com/Project-OSRM/osrm-backend`](https://github.com/Project-OSRM/osrm-backend).

### Point this app at your OSRM
Currently, the app returns a local, static `LineString` from `src/services/route.ts` via `src/services/routeService.ts` for demos. To use your OSRM backend:

Option A: Minimal code change – replace the static route fetcher with a real OSRM call.

```ts
// src/services/routeService.ts (example replacement)
import type { Feature, LineString } from "geojson";

const DEFAULT_BASE_URL = "http://127.0.0.1:5000"; // your osrm-routed host

export async function fetchRouteLineString(): Promise<{ lineString: LineString }>{
  // Example coordinates (lon,lat;lon,lat). Replace with your inputs.
  const coords = "13.388860,52.517037;13.385983,52.496891";
  const url = `${DEFAULT_BASE_URL}/route/v1/driving/${coords}?geometries=geojson&overview=full`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM request failed: ${res.status}`);
  const data = await res.json();
  const lineString = data.routes?.[0]?.geometry as LineString;
  if (!lineString) throw new Error("No route geometry returned by OSRM");
  return { lineString };
}

export function lineStringToFeature(lineString: LineString): Feature<LineString> {
  return { type: "Feature", geometry: lineString, properties: {} };
}
```

Option B: Use an environment variable for the OSRM base URL.

1) Create a `.env.local` in the project root:
```bash
echo "VITE_OSRM_BASE_URL=http://127.0.0.1:5000" > .env.local
```
2) Read it in your service code with `import.meta.env.VITE_OSRM_BASE_URL` and build the request URL as shown above.

Notes:
- The current codebase ships a static route for simplicity. Switching to OSRM just requires swapping the static provider with a `fetch` to your OSRM instance as in Option A.
- OSRM usage and Docker commands are summarized from the official docs. See the upstream repo for details and API options: [`https://github.com/Project-OSRM/osrm-backend`](https://github.com/Project-OSRM/osrm-backend).

### Scripts
- `npm run dev`: start Vite dev server
- `npm run build`: production build
- `npm run preview`: preview the production build
