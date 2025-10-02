export type Position = [number, number];

export type LngLatInput = string | Position;

export type OSRMGeometries = 'geojson' | 'polyline' | 'polyline6';
export type OSRMOverview = 'full' | 'simplified' | 'false';

export interface FetchRouteOptions {
    baseUrl?: string;
    steps?: boolean;
    geometries?: OSRMGeometries;
    overview?: OSRMOverview;
}

export interface OSRMRoute {
    geometry: unknown;
    distance: number;
    duration: number;
    [k: string]: unknown;
}

export interface OSRMResponse {
    routes?: OSRMRoute[];
    [k: string]: unknown;
}


