import type { Feature, LineString } from "geojson";
import { FetchRouteOptions, LngLatInput, OSRMResponse } from "./types";

import { lineString } from "./route";

export async function fetchRouteLineString(): Promise<{ lineString: LineString; }> {
    return {
        lineString: lineString
    };
}

export function lineStringToFeature(
    lineString: LineString
): Feature<LineString, Record<string, never>> {
    return {
        type: "Feature",
        geometry: lineString,
        properties: {},
    };
}
