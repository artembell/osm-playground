import * as THREE from 'three';

import { CustomLayerExtras, ModelTransform } from "../types";
import { Feature, FeatureCollection, LineString, Point, Position } from "geojson";
import { fetchRouteLineString, lineStringToFeature } from "../services/routeService";

import maplibregl from 'maplibre-gl';

const addSegmentJoints = (
    map: maplibregl.Map,
    lineString: LineString
) => {
    const coords: Position[] = lineString.coordinates;
    const jointFeatures: Feature<Point>[] = [];
    for (let i = 0; i < coords.length; i++) {
        const p = coords[i] as Position;
        jointFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: p },
            properties: {},
        });
    }
    const jointsCollection: FeatureCollection<Point> = { type: 'FeatureCollection', features: jointFeatures };
    const jointsSrc = map.getSource('route-joints') as maplibregl.GeoJSONSource | undefined;
    if (jointsSrc) {
        jointsSrc.setData(jointsCollection);
    }

    return { coords };
};

export function fetchAndDrawSampleRoute(
    map: maplibregl.Map,
    modelAltitude: number,
    modelTransform: ModelTransform,
    layer: CustomLayerExtras
): void {
    (async () => {
        try {
            /** TODO: insert dynamically chosen coordinates here and pass to `fetchRouteLineString` */
            const start: Position = [13.38886, 52.517037];
            const end: Position = [13.385983, 52.496891];

            const { lineString } = await fetchRouteLineString();

            const feature: Feature<LineString> = lineStringToFeature(lineString);
            const collection: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [feature] };
            (map.getSource('route') as maplibregl.GeoJSONSource).setData(collection);


            const { coords } = addSegmentJoints(map, lineString);

            /** This is needed to fit loaded route into camera view frame */
            const bounds = coords.reduce(
                (b, c) => b.extend(c as maplibregl.LngLatLike),
                new maplibregl.LngLatBounds(
                    coords[0] as maplibregl.LngLatLike,
                    coords[0] as maplibregl.LngLatLike
                )
            );
            map.fitBounds(bounds, { padding: 60, duration: 800 });

            /** Car is directed correctly along the path usign this coordinates */
            const startLngLat: Position = coords[0];
            const nextLngLat: Position = (coords[1] ?? coords[0]) as Position;
            const startMerc = maplibregl.MercatorCoordinate.fromLngLat(
                startLngLat as maplibregl.LngLatLike,
                modelAltitude
            );
            const nextMerc = maplibregl.MercatorCoordinate.fromLngLat(
                nextLngLat as maplibregl.LngLatLike,
                modelAltitude
            );

            modelTransform.translateX = startMerc.x;
            modelTransform.translateY = startMerc.y;
            modelTransform.translateZ = startMerc.z;
            modelTransform.scale = startMerc.meterInMercatorCoordinateUnits();

            /** Calculate exact car heading direction */
            const dirX = (nextMerc.x - startMerc.x) / modelTransform.scale;
            const dirZ = -(nextMerc.y - startMerc.y) / modelTransform.scale;
            const heading = Math.atan2(dirZ, dirX);
            if (layer.dynamicCar) {
                layer.dynamicCar.position.set(0, layer._heightOffsetMeters, 0);
                layer.dynamicCar.rotation.y = heading;
            } else {
                layer._routeStart = { position: new THREE.Vector3(0, layer._heightOffsetMeters, 0), heading };
            }


            /** Calculate values for Three.js */
            const toLocal = (lnglat: Position): THREE.Vector3 => {
                const m = maplibregl.MercatorCoordinate.fromLngLat(
                    lnglat as maplibregl.LngLatLike,
                    modelAltitude
                );
                const lx = (m.x - startMerc.x) / modelTransform.scale;
                const lz = (m.y - startMerc.y) / modelTransform.scale;
                return new THREE.Vector3(lx, 0, lz);
            };
            layer._path = coords.map((c) => toLocal(c));
            layer._segmentIndex = 0;
            layer._segmentProgress = 0;
            layer._speedMetersPerSecond = 15;
            layer._heightOffsetMeters = 0.3;
            layer._headingOffset = -Math.PI / 2;
        } catch (e) {
            console.error('Failed to fetch/draw route', e);
        }
    })();
}
