import * as THREE from 'three';

import { CustomLayerExtras, ModelTransform } from "../types";

import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { advanceCarAlongPath } from "./move-car";
import maplibregl from 'maplibre-gl';
import { updateMapCenterIfTracking } from './track-center';

function buildViewProjection(
    args: any,
    modelTransform: ModelTransform
): { viewProj: THREE.Matrix4; } {
    const rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), modelTransform.rotateX);
    const rotationY = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), modelTransform.rotateY);
    const rotationZ = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), modelTransform.rotateZ);

    const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix as number[]);

    const l = new THREE.Matrix4()
        .makeTranslation(modelTransform.translateX, modelTransform.translateY, modelTransform.translateZ)
        .scale(new THREE.Vector3(modelTransform.scale, -modelTransform.scale, modelTransform.scale)) // flip Y
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

    const viewProj = m.multiply(l);

    return { viewProj };
}

/** Creates a MapLibre CustomLayer that hosts a Three.js scene. */
export function createCustomThreeLayer(
    modelAltitude: number,
    modelTransform: ModelTransform
): maplibregl.CustomLayerInterface & CustomLayerExtras {
    const layer: maplibregl.CustomLayerInterface & CustomLayerExtras = {
        id: '3d-model',
        type: 'custom',
        renderingMode: '3d',


        dynamicCamera: new THREE.Camera(),
        dynamicScene: new THREE.Scene(),
        dynamicRenderer: undefined as unknown as THREE.WebGLRenderer,
        map: undefined as unknown as maplibregl.Map,
        _lastTs: 0,
        _path: null,
        _segmentIndex: 0,
        _segmentProgress: 0,
        _speedMetersPerSecond: 0,
        _headingOffset: 0,
        _heightOffsetMeters: 0,
        _trackCarView: false,
        _userInteracting: false,

        /** Called once when the layer is first added to the map. */
        onAdd(map: maplibregl.Map, gl: WebGLRenderingContext) {
            this.dynamicCamera = new THREE.Camera();
            this.dynamicScene = new THREE.Scene();

            /** TODO: add shadow effects later */
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(100, 100, 100);
            light.castShadow = true;
            this.dynamicScene.add(light);

            light.shadow.camera.near = 0.1;
            light.shadow.camera.far = 2000;
            light.shadow.camera.left = -500;
            light.shadow.camera.right = 500;
            light.shadow.camera.top = 500;
            light.shadow.camera.bottom = -500;
            light.shadow.mapSize.width = 4096;
            light.shadow.mapSize.height = 4096;

            const groundGeom = new THREE.PlaneGeometry(1000, 1000);
            const groundMat = new THREE.ShadowMaterial({ opacity: 0.5 });
            const ground = new THREE.Mesh(groundGeom, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = 0;
            ground.receiveShadow = true;
            this.dynamicScene.add(ground);

            /** Just load model */
            const loader = new GLTFLoader();
            const carModelUrl = `${import.meta.env.BASE_URL}models/car.gltf`;
            loader.load(
                carModelUrl,
                (gltf) => {
                    /** TODO: for now shadows are disabled */
                    gltf.scene.traverse((node: THREE.Object3D & { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean; }) => {
                        if (node.isMesh) {
                            node.castShadow = false;
                            node.receiveShadow = false;
                        }
                    });

                    this.dynamicCar = gltf.scene;

                    /** Scale car to be real size */
                    const bbox = new THREE.Box3().setFromObject(this.dynamicCar);
                    const size = new THREE.Vector3();
                    bbox.getSize(size);
                    const desiredLengthMeters = 3;
                    const currentLengthUnits = Math.max(size.x, size.y, size.z) || 1;
                    const uniformScale = desiredLengthMeters / currentLengthUnits;
                    this.dynamicCar.scale.set(uniformScale, uniformScale, uniformScale);


                    this.dynamicCar.position.set(0, 0, 0);
                    this.dynamicScene.add(this.dynamicCar);


                    if (this._routeStart) {
                        this.dynamicCar.position.copy(this._routeStart.position);
                        if (this._routeStart.heading != null) {
                            this.dynamicCar.rotation.y = this._routeStart.heading;
                        }
                    }
                },
                undefined,
                (err) => {
                    console.error('Failed to load car model', err);
                }
            );

            this.map = map;


            this.dynamicRenderer = new THREE.WebGLRenderer({
                canvas: map.getCanvas(),
                context: gl,
                antialias: true,
            });
            this.dynamicRenderer.shadowMap.enabled = true;
            this.dynamicRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.dynamicRenderer.autoClear = false;

            /** Init state for simulation render */
            this._lastTs = performance.now();
            this._path = null;
            this._segmentIndex = 0;
            this._segmentProgress = 0;
            this._speedMetersPerSecond = 15;
            this._headingOffset = -Math.PI / 2;
            this._heightOffsetMeters = 0.3;
            this._trackCarView = false;
            this._userInteracting = false;
        },

        /** Called every frame - we progress animation on every frame */
        render(gl: WebGLRenderingContext, args: any) {
            const now = performance.now();
            const deltaSec = (now - this._lastTs) / 1000;
            this._lastTs = now;

            advanceCarAlongPath(this, deltaSec);

            updateMapCenterIfTracking(this, modelAltitude, modelTransform);

            const { viewProj } = buildViewProjection(args, modelTransform);

            this.dynamicCamera.projectionMatrix = viewProj;

            this.dynamicRenderer.resetState();
            this.dynamicRenderer.render(this.dynamicScene, this.dynamicCamera);

            this.map.triggerRepaint();
        },
    };

    return layer;
}