import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

global.document = { createElementNS: () => ({ setAttribute: () => {}, style: {} }), createElement: () => ({ setAttribute: () => {}, style: {} }) };
global.window = { navigator: {}, document: global.document, URL: { createObjectURL: () => 'mock-url' } };
global.self = global.window;
THREE.ImageLoader.prototype.load = function(url, onLoad) { if (onLoad) onLoad({}); return {}; };

function toArrayBuffer(buffer) {
   const ab = new ArrayBuffer(buffer.length);
   const view = new Uint8Array(ab);
   for (let i = 0; i < buffer.length; ++i) { view[i] = buffer[i]; }
   return ab;
}

const glbData = fs.readFileSync('public/assets/character/xbot.glb');
const loader = new GLTFLoader();

try {
  loader.parse(toArrayBuffer(glbData), '', (gltf) => {
    let bones = [];
    gltf.scene.traverse((child) => {
      if (child.isBone) bones.push(child.name);
    });
    console.log("Xbot Bones:", bones.length > 0 ? bones.slice(0, 10) : "None", "Total:", bones.length);
  }, (e) => {
    console.log("ERROR parsing", e);
  });
} catch(e) { console.error(e); }
