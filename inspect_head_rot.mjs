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

object.updateMatrixWorld(true);
const rot = new THREE.Euler().setFromRotationMatrix(headBone.matrixWorld);
console.log("Head Bone Global Rotation (Euler):", rot);
console.log("Head Bone Local Rotation:", headBone.rotation);

const vecUp = new THREE.Vector3(0, 1, 0).applyMatrix4(headBone.matrixWorld).sub(new THREE.Vector3().setFromMatrixPosition(headBone.matrixWorld)).normalize();
const vecForward = new THREE.Vector3(0, 0, 1).applyMatrix4(headBone.matrixWorld).sub(new THREE.Vector3().setFromMatrixPosition(headBone.matrixWorld)).normalize();
const vecRight = new THREE.Vector3(1, 0, 0).applyMatrix4(headBone.matrixWorld).sub(new THREE.Vector3().setFromMatrixPosition(headBone.matrixWorld)).normalize();

console.log("Head Local Y in World Space:", vecUp);
console.log("Head Local Z in World Space:", vecForward);
console.log("Head Local X in World Space:", vecRight);

