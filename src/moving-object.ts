import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

import * as THREE from 'three';

import { CustomLayerExtras, ModelTransform } from './types';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { installKeyboardToggle, installUserInteractionGuards } from './functions/track-center';
import maplibregl, { LngLatLike } from 'maplibre-gl';

import { createCustomThreeLayer } from './functions/dynamic-layer';
import { fetchAndDrawSampleRoute } from './functions/route-builder';
import { installOverlayControls } from './functions/overlay-controls';
import { mapResources } from './functions/map-resources';

const origin: LngLatLike = [148.9819, -35.39847];
const berlinOrigin: LngLatLike = [13.405, 52.52];

function main(): void {
    const map = createMap();
    const { modelAltitude, modelTransform } = createModelTransform(origin);
    const layer = createCustomThreeLayer(modelAltitude, modelTransform);
    map.on('style.load', () => {
        map.addLayer(layer);

        anchorSceneToBerlin(map, modelAltitude, modelTransform, layer);
        ensureEmptyRouteSourceAndLayer(map);
        fetchAndDrawSampleRoute(map, modelAltitude, modelTransform, layer);

        installKeyboardToggle(map, layer);
        installUserInteractionGuards(map, layer);
        installOverlayControls(map, modelAltitude, modelTransform, layer);
    });
}

function createMap(): maplibregl.Map {
    return new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/bright',
        zoom: 18,
        center: origin,
        pitch: 60,
        canvasContextAttributes: { antialias: true },
    });
}

function createModelTransform(origin: maplibregl.LngLatLike): {
    modelAltitude: number;
    modelTransform: ModelTransform;
} {
    const modelAltitude = 0;
    const modelRotate: [number, number, number] = [Math.PI / 2, 0, 0];
    const asMerc = maplibregl.MercatorCoordinate.fromLngLat(origin, modelAltitude);

    /** Object for camera positioning in Three.js scene */
    const modelTransform: ModelTransform = {
        translateX: asMerc.x,
        translateY: asMerc.y,
        translateZ: asMerc.z,
        rotateX: modelRotate[0],
        rotateY: modelRotate[1],
        rotateZ: modelRotate[2],
        scale: asMerc.meterInMercatorCoordinateUnits(),
    };

    return { modelAltitude, modelTransform };
}

function anchorSceneToBerlin(
    map: maplibregl.Map,
    modelAltitude: number,
    modelTransform: ModelTransform,
    layer: CustomLayerExtras
): void {
    const berlinCenter: maplibregl.LngLatLike = berlinOrigin;
    const berlinMerc = maplibregl.MercatorCoordinate.fromLngLat(berlinCenter, modelAltitude);

    modelTransform.translateX = berlinMerc.x;
    modelTransform.translateY = berlinMerc.y;
    modelTransform.translateZ = berlinMerc.z;
    modelTransform.scale = berlinMerc.meterInMercatorCoordinateUnits();

    const berlinHeading = 0;

    if (layer.dynamicCar) {
        layer.dynamicCar.position.set(0, 0, 0);
        layer.dynamicCar.rotation.y = berlinHeading;
    } else {
        layer._routeStart = {
            position: new THREE.Vector3(0, 0, 0),
            heading: berlinHeading
        };
    }
}

function ensureEmptyRouteSourceAndLayer(map: maplibregl.Map): void {
    if (!map.getSource(mapResources.sources.ROUTE_LINE)) {
        const empty: FeatureCollection<LineString> = {
            type: 'FeatureCollection',
            features: []
        };

        const source: maplibregl.GeoJSONSourceSpecification = {
            type: 'geojson',
            data: empty,
        };
        map.addSource(mapResources.sources.ROUTE_LINE, source);
    }

    if (!map.getLayer(mapResources.layers.ROUTE_LINE)) {
        map.addLayer({
            id: mapResources.layers.ROUTE_LINE,
            type: 'line',
            source: mapResources.sources.ROUTE_LINE,
            paint: {
                'line-color': '#ff5722',
                'line-width': 4,
                'line-opacity': 0.9,
            },
        } as maplibregl.LineLayerSpecification);
    }

    if (!map.getSource(mapResources.sources.ROUTE_JOINTS)) {
        const emptyJoints: FeatureCollection<Point> = {
            type: 'FeatureCollection',
            features: []
        };
        const source: maplibregl.GeoJSONSourceSpecification = {
            type: 'geojson',
            data: emptyJoints,
        };
        map.addSource(mapResources.sources.ROUTE_JOINTS, source);
    }

    if (!map.getLayer(mapResources.layers.ROUTE_JOINTS)) {
        const layer: maplibregl.CircleLayerSpecification = {
            id: mapResources.layers.ROUTE_JOINTS,
            type: 'circle',
            source: mapResources.sources.ROUTE_JOINTS,
            paint: {
                'circle-radius': 5,
                'circle-color': '#00c853',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 1.5,
            },
        };
        map.addLayer(layer);
    }
}

main();
