import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

global.document = { createElementNS: () => ({ setAttribute: () => {}, style: {} }), createElement: () => ({ setAttribute: () => {}, style: {} }) };
global.window = { navigator: {}, document: global.document, URL: { createObjectURL: () => 'mock-url' } };
global.self = global.window;
THREE.TextureLoader.prototype.load = function() { return new THREE.Texture(); };

const stat = fs.statSync('public/assets/character/peter/peteridle.fbx');
console.log('File size:', stat.size);

const loader = new FBXLoader();
const data = fs.readFileSync('public/assets/character/peter/peteridle.fbx');
const arrayBuffer = new Uint8Array(data).buffer;
const object = loader.parse(arrayBuffer, '');

let headBone = null;
object.traverse((child) => {
    if (child.isBone && child.name.toLowerCase().includes('head')) {
        headBone = child;
    }
});

if (headBone) {
    console.log('Found head bone:', headBone.name);
    console.log('Head bone scale:', headBone.scale.x, headBone.scale.y, headBone.scale.z);
    console.log('Head bone position:', headBone.position.x, headBone.position.y, headBone.position.z);
    
    // Check global scale of head
    let node = headBone;
    let globalScale = node.scale.clone();
    while (node.parent) {
        node = node.parent;
        globalScale.multiply(node.scale);
    }
    console.log('Global scale roughly:', globalScale.x, globalScale.y, globalScale.z);
} else {
    console.log('No head bone found.');
}
