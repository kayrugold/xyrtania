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

const glbData = fs.readFileSync('humanoid+character+3d+model.glb');
const loader = new GLTFLoader();

try {
  loader.parse(toArrayBuffer(glbData), '', (gltf) => {
    let bones = [];
    let skinnedMeshes = [];
    gltf.scene.traverse((child) => {
      if (child.isBone) bones.push(child.name);
      if (child.isSkinnedMesh) skinnedMeshes.push(child.name);
    });
    console.log("Found Bones:", bones.length > 0 ? bones.slice(0, 10) : "None", "Total:", bones.length);
    console.log("SkinnedMeshes:", skinnedMeshes);
  }, (e) => {
    console.log("ERROR parsing", e);
  });
} catch(e) { console.error(e); }
