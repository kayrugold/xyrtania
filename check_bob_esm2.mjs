import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

global.document = { createElementNS: () => ({ setAttribute: () => {}, style: {} }), createElement: () => ({ setAttribute: () => {}, style: {} }) };
global.window = { navigator: {}, document: global.document, URL: { createObjectURL: () => 'mock-url' } };
global.self = global.window;
THREE.TextureLoader.prototype.load = function() { return new THREE.Texture(); };

const loader = new FBXLoader();
const data = fs.readFileSync('public/assets/character/bob.fbx');
const arrayBuffer = new Uint8Array(data).buffer;
const object = loader.parse(arrayBuffer, '');
let names = [];
object.traverse((child) => {
    names.push(child.type + ': ' + child.name);
});
console.log('Nodes in Bob:', names.slice(0, 30));
