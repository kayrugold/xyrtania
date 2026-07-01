import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

global.document = { createElementNS: () => ({ setAttribute: () => {}, style: {} }), createElement: () => ({ setAttribute: () => {}, style: {} }) };
global.window = { navigator: {}, document: global.document, URL: { createObjectURL: () => 'mock-url' } };
global.self = global.window;
THREE.TextureLoader.prototype.load = function() { return new THREE.Texture(); };

const loader = new FBXLoader();
const bobData = fs.readFileSync('public/assets/character/bob.fbx');
const bobObj = loader.parse(new Uint8Array(bobData).buffer, '');

let rootMeshName = '';
bobObj.traverse((child) => {
    if (child.isMesh && !rootMeshName) {
        rootMeshName = child.name;
        console.log("Original pos:", child.position);
    }
});
