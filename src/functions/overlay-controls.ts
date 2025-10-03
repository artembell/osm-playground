import * as THREE from 'three';

import { CustomLayerExtras, ModelTransform } from "../types";

import { fetchAndDrawSampleRoute } from './route-builder';
import maplibregl from 'maplibre-gl';

function ensureOverlayRoot(): HTMLElement {
    let root = document.getElementById('overlay');
    if (!root) {
        root = document.createElement('div');
        root.id = 'overlay';
        document.body.appendChild(root);
    }
    return root;
}

function createButton(text: string, id: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'overlay-btn';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
}

export function installOverlayControls(
    map: maplibregl.Map,
    modelAltitude: number,
    modelTransform: ModelTransform,
    layer: CustomLayerExtras
): void {
    const root = ensureOverlayRoot();
    root.innerHTML = '';
    let previousSpeed = 15;

    const startBtn = createButton('Start route from scratch', 'btn-start-route', () => {
        try {
            layer._path = null;
            layer._segmentIndex = 0;
            layer._segmentProgress = 0;
            layer._speedMetersPerSecond = 15;
            previousSpeed = 15;

            if (layer.dynamicCar) {
                const startPos = new THREE.Vector3(0, layer._heightOffsetMeters, 0);
                layer.dynamicCar.position.copy(startPos);
            }

            fetchAndDrawSampleRoute(map, modelAltitude, modelTransform, layer);

            const stopButtonEl = document.getElementById('btn-stop-car') as HTMLButtonElement | null;
            if (stopButtonEl) stopButtonEl.textContent = 'Stop car';
        } catch (e) {
            console.error('Failed to start route from scratch', e);
        }
    });

    const stopBtn = createButton('Stop car', 'btn-stop-car', () => {
        try {
            if (layer._speedMetersPerSecond > 0) {
                previousSpeed = layer._speedMetersPerSecond;
                layer._speedMetersPerSecond = 0;
                stopBtn.textContent = 'Resume car';
            } else {
                layer._speedMetersPerSecond = previousSpeed > 0 ? previousSpeed : 15;
                stopBtn.textContent = 'Stop car';
            }
        } catch (e) {
            console.error('Failed to stop car', e);
        }
    });

    const reverseBtn = createButton('Start moving in reverse direction', 'btn-reverse', () => {
        try {
            if (!layer._path || layer._path.length < 2) {
                return;
            }

            layer._path.reverse();
            layer._segmentIndex = 0;
            layer._segmentProgress = 0;

            const segmentStart = layer._path[0];
            const segmentEnd = layer._path[1];
            const segmentVec = new THREE.Vector3().subVectors(segmentEnd, segmentStart);

            if (layer.dynamicCar) {
                const pos = segmentStart.clone();
                pos.y = layer._heightOffsetMeters;
                layer.dynamicCar.position.copy(pos);
                layer.dynamicCar.rotation.y = Math.atan2(-segmentVec.z, segmentVec.x) + layer._headingOffset;
            } else {
                layer._routeStart = { position: segmentStart.clone(), heading: Math.atan2(-segmentVec.z, segmentVec.x) + layer._headingOffset };
            }

            if (layer._speedMetersPerSecond === 0) {
                layer._speedMetersPerSecond = 15;
                previousSpeed = 15;
            }

            const stopButtonEl = document.getElementById('btn-stop-car') as HTMLButtonElement | null;
            if (stopButtonEl) stopButtonEl.textContent = 'Stop car';
        } catch (e) {
            console.error('Failed to reverse direction', e);
        }
    });

    root.appendChild(startBtn);
    root.appendChild(stopBtn);
    root.appendChild(reverseBtn);
}


