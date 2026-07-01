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

const box = new THREE.Box3().setFromObject(object);
console.log('Box size:', box.getSize(new THREE.Vector3()));
console.log('Box min:', box.min);
console.log('Box max:', box.max);
