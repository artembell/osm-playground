import * as THREE from 'three';

import { CustomLayerExtras } from '../types';

/** Advances the car along the local `_path` in meters, honoring segment boundaries. */
export function advanceCarAlongPath(layer: CustomLayerExtras, deltaSec: number): void {
    if (!(layer.dynamicCar && layer._path && layer._path.length > 1 && deltaSec > 0)) {
        return;
    }

    let remainingTime = deltaSec;

    while (remainingTime > 0 && layer._segmentIndex < layer._path.length - 1) {
        const segmentStart = layer._path[layer._segmentIndex];
        const semgentEnd = layer._path[layer._segmentIndex + 1];

        const segmentVec = new THREE.Vector3().subVectors(semgentEnd, segmentStart);
        const segmentLength = segmentVec.length();

        const traveled = layer._segmentProgress * segmentLength;
        const remain = Math.max(0, segmentLength - traveled);

        /** Distance to move in this frame */
        const distanceToMove = layer._speedMetersPerSecond * remainingTime;

        if (distanceToMove < remain) {
            /** We stay in the same segment - need to update position */
            const newDist = traveled + distanceToMove;
            const t = newDist / segmentLength;
            const pos = new THREE.Vector3().lerpVectors(segmentStart, semgentEnd, t);

            /** Move car and set ground offset */
            pos.y = layer._heightOffsetMeters;
            layer.dynamicCar.position.copy(pos);

            layer.dynamicCar.rotation.y = Math.atan2(-segmentVec.z, segmentVec.x) + layer._headingOffset;
            layer._segmentProgress = t;
            remainingTime = 0;
        } else {
            /** We reached the end of current segment and start new one - change position and direction */
            remainingTime -= remain / layer._speedMetersPerSecond;

            /** Go to next segment */
            layer._segmentIndex += 1;
            layer._segmentProgress = 0;
            const endPos = semgentEnd.clone();

            endPos.y = layer._heightOffsetMeters;
            layer.dynamicCar.position.copy(endPos);

            /** Change heading direction, because we changed segment */
            if (layer._segmentIndex < layer._path.length - 1) {
                const nextVec = new THREE.Vector3().subVectors(
                    layer._path[layer._segmentIndex + 1],
                    layer._path[layer._segmentIndex]
                );
                layer.dynamicCar.rotation.y = Math.atan2(-nextVec.z, nextVec.x) + layer._headingOffset;
            }
        }
    }
}
