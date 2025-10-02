import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

import * as THREE from 'three';

import { CustomLayerExtras, ModelTransform } from './types';
import type { FeatureCollection, LineString } from 'geojson';
import { installKeyboardToggle, installUserInteractionGuards } from './functions/track-center';
import maplibregl, { LngLatLike } from 'maplibre-gl';

import { createCustomThreeLayer } from './functions/dynamic-layer';
import { fetchAndDrawSampleRoute } from './functions/route-builder';

const origin: LngLatLike = [148.9819, -35.39847];
const berlinOrigin: LngLatLike = [13.405, 52.52];

function main(): void {
    const map = createMap();
    const { modelAltitude, modelTransform } = createModelTransform(origin);
    const layer = createCustomThreeLayer(modelAltitude, modelTransform);
    map.on('style.load', () => {
        addCustomLayer(map, layer);
        anchorSceneToBerlin(map, modelAltitude, modelTransform, layer);
        ensureEmptyRouteSourceAndLayer(map);
        fetchAndDrawSampleRoute(map, modelAltitude, modelTransform, layer);
        installKeyboardToggle(map, layer);
        installUserInteractionGuards(map, layer);
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

function addCustomLayer(map: maplibregl.Map, layer: maplibregl.CustomLayerInterface): void {
    map.addLayer(layer as any);
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
    if (!map.getSource('route')) {
        const empty: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] };
        map.addSource('route', {
            type: 'geojson',
            data: empty,
        } as maplibregl.GeoJSONSourceSpecification);
    }

    if (!map.getLayer('route-line')) {
        map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            paint: {
                'line-color': '#ff5722',
                'line-width': 4,
                'line-opacity': 0.9,
            },
        } as maplibregl.LineLayerSpecification);
    }
}

main();
