import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Need a simple buffer parse
function toArrayBuffer(buffer) {
   const ab = new ArrayBuffer(buffer.length);
   const view = new Uint8Array(ab);
   for (let i = 0; i < buffer.length; ++i) {
       view[i] = buffer[i];
   }
   return ab;
}

const glbData = fs.readFileSync('humanoid+character+3d+model.glb');
const loader = new GLTFLoader();

// GLTFLoader might require DOM environment, but let's try reading the binary just to see what's in it, or we can use standard three.js GLTFLoader if it works in node.
// Actually GLTFLoader in node can be tricky without JSDOM. Let's just use a quick check.
// If it fails, we will see.
try {
  loader.parse(toArrayBuffer(glbData), '', (gltf) => {
    let bones = [];
    let skinnedMeshes = [];
    gltf.scene.traverse((child) => {
      if (child.isBone) {
         bones.push(child.name);
      }
      if (child.isSkinnedMesh) {
         skinnedMeshes.push(child.name);
      }
    });
    console.log("Found Bones:", bones.length > 0 ? bones.slice(0, 10) : "None", "Total:", bones.length);
    console.log("SkinnedMeshes:", skinnedMeshes);
  }, (e) => {
    console.log("ERROR parsing", e);
  });
} catch(e) {
    console.error(e);
}
