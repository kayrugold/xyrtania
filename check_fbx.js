import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

global.document = {
  createElementNS: () => ({ setAttribute: () => {}, style: {} }),
  createElement: () => ({ setAttribute: () => {}, style: {} }),
};
global.window = {
  navigator: {},
  document: global.document,
  URL: { createObjectURL: () => 'mock-url' }
};
global.self = global.window;

THREE.ImageLoader.prototype.load = function(url, onLoad) {
   if (onLoad) onLoad({});
   return {};
};

const fbxData = fs.readFileSync('public/assets/character/bob.fbx');
const loader = new FBXLoader();
try {
  const model = loader.parse(fbxData.buffer, '');
  let bones = [];
  let skinnedMeshes = [];
  model.traverse((child) => {
    if (child.isBone) {
       bones.push(child.name);
    }
    if (child.isSkinnedMesh) {
       skinnedMeshes.push(child.name);
    }
  });
  console.log("Found Bones:", bones.slice(0, 10), "Total:", bones.length);
  console.log("SkinnedMeshes:", skinnedMeshes);
  console.log("Animations:", model.animations.map(a => a.name));
  
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  console.log("Box Size:", size);
  console.log("Model Rotation:", model.rotation);
} catch (e) {
  console.log("ERROR parsing", e);
}
