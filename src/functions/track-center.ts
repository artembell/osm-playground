import { CustomLayerExtras, ModelTransform } from "../types";
import maplibregl, { LngLatLike } from 'maplibre-gl';

export function updateMapCenterIfTracking(
    layer: CustomLayerExtras,
    modelAltitude: number,
    modelTransform: ModelTransform
): void {
    if (!(layer._trackCarView && layer.dynamicCar && !layer._userInteracting)) {
        return;
    }

    /** Convert local coordinates of Three into Mercators coordinates */
    const worldX = modelTransform.translateX + layer.dynamicCar.position.x * modelTransform.scale;
    const worldY = modelTransform.translateY + layer.dynamicCar.position.z * modelTransform.scale;

    /* Create a Mercator coordinate and convert to longitude/latitude */
    const mc = new maplibregl.MercatorCoordinate(worldX, worldY, modelAltitude);
    const lngLat = mc.toLngLat();

    layer.map.setCenter(lngLat);
}


export function installKeyboardToggle(map: maplibregl.Map, layer: CustomLayerExtras): void {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'v' || e.key === 'V') {
            layer._trackCarView = !layer._trackCarView;
        }
    });
}

export function installUserInteractionGuards(map: maplibregl.Map, layer: CustomLayerExtras): void {
    map.on('dragstart', () => {
        layer._userInteracting = true;
    });
    map.on('dragend', () => {
        layer._userInteracting = false;
    });
    map.on('rotatestart', () => {
        layer._userInteracting = true;
    });
    map.on('rotateend', () => {
        layer._userInteracting = false;
    });
    map.on('zoomstart', () => {
        layer._userInteracting = true;
    });
    map.on('zoomend', () => {
        layer._userInteracting = false;
    });
}
