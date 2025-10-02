import * as THREE from 'three';

/** Structure used to transform the Three.js scene into Mercator units. */
export type ModelTransform = {
    translateX: number;
    translateY: number;
    translateZ: number;
    rotateX: number;
    rotateY: number;
    rotateZ: number;
    /** Meters -> Mercator units */
    scale: number;
};

export type RouteStartPose = { position: THREE.Vector3; heading?: number; };

/** Private state we tack onto MapLibre's CustomLayerInterface. */
export type CustomLayerExtras = {
    dynamicCamera: THREE.Camera;
    dynamicScene: THREE.Scene;
    dynamicRenderer: THREE.WebGLRenderer;
    dynamicCar?: THREE.Object3D;
    map: maplibregl.Map;

    /** Simulation state for route following animation */
    _lastTs: number;
    _path: THREE.Vector3[] | null;
    _segmentIndex: number;
    /** Segment progress [0..1] */
    _segmentProgress: number;
    /** Speed */
    _speedMetersPerSecond: number;
    /** Y axis rotation */
    _headingOffset: number;
    /** Z axis offset to prevent moving model underground */
    _heightOffsetMeters: number;
    /** For changing camera view */
    _trackCarView: boolean;
    _userInteracting: boolean;
    /** Initial position for placing model */
    _routeStart?: RouteStartPose;
};
