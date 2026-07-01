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
    if (child.isBone && child.name.includes('Head') && !child.name.includes('Top')) {
        headBone = child;
    }
});

if (headBone) {
    console.log('Found head bone:', headBone.name);
    console.log('Head bone scale:', headBone.scale.x, headBone.scale.y, headBone.scale.z);
    
    // Calculate global position by computing world matrix
    object.updateMatrixWorld(true);
    const pos = new THREE.Vector3();
    pos.setFromMatrixPosition(headBone.matrixWorld);
    console.log('Head global position:', pos.x, pos.y, pos.z);

    const faceScale = new THREE.Vector3();
    faceScale.setFromMatrixScale(headBone.matrixWorld);
    console.log('Head global scale:', faceScale.x, faceScale.y, faceScale.z);

} else {
    console.log('No head bone found.');
}
