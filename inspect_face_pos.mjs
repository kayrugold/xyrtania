import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

global.document = { createElementNS: () => ({ setAttribute: () => {}, style: {} }), createElement: () => ({ setAttribute: () => {}, style: {} }) };
global.window = { navigator: {}, document: global.document, URL: { createObjectURL: () => 'mock-url' } };
global.self = global.window;
THREE.TextureLoader.prototype.load = function() { return new THREE.Texture(); };

const loader = new FBXLoader();
const data = fs.readFileSync('public/assets/character/peter/peteridle.fbx');
const arrayBuffer = new Uint8Array(data).buffer;
const object = loader.parse(arrayBuffer, '');

let headBone = null;
object.traverse((child) => {
    if (!headBone && child.isBone && child.name.toLowerCase().includes('head') && !child.name.toLowerCase().includes('top')) {
        headBone = child;
    }
});

const scaleAmount = 0.01; // roughly
const faceGroup = new THREE.Group();
faceGroup.scale.setScalar(1 / scaleAmount);
faceGroup.position.set(0, 0.10 / scaleAmount, 0.05 / scaleAmount);
headBone.add(faceGroup);

object.updateMatrixWorld(true);

const facePos = new THREE.Vector3();
facePos.setFromMatrixPosition(faceGroup.matrixWorld);
console.log("Head Bone Global:", new THREE.Vector3().setFromMatrixPosition(headBone.matrixWorld));
console.log("Face Group Global:", facePos);

const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), new THREE.MeshBasicMaterial());
leftEye.position.set(-0.05, 0.08, 0.12);
faceGroup.add(leftEye);

object.updateMatrixWorld(true);
const leftEyePos = new THREE.Vector3();
leftEyePos.setFromMatrixPosition(leftEye.matrixWorld);
console.log("Left Eye Global:", leftEyePos);

