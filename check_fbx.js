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

const fbxData = fs.readFileSync('public/base_male/Unarmed Idle 01.fbx');
const loader = new FBXLoader();
try {
  const model = loader.parse(fbxData.buffer, '');
  let skinnedMesh = null;
  model.traverse((child) => {
    if (child.isSkinnedMesh) {
       skinnedMesh = child.name;
    }
  });
  if (skinnedMesh) {
    console.log("Found SkinnedMesh:", skinnedMesh);
  } else {
    console.log("No SkinnedMesh found");
  }
} catch (e) {
  console.log("ERROR parsing", e);
}
