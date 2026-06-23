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

const loader = new FBXLoader();
const fbxData = fs.readFileSync('public/base_male/Unarmed Idle 01.fbx');
const model = loader.parse(fbxData.buffer, '');
let hasMesh = false;
model.traverse((child) => {
  if (child.isMesh || child.isSkinnedMesh) {
    hasMesh = true;
    console.log("Found mesh:", child.name, child.type);
  }
});
if (!hasMesh) console.log("No meshes in Unarmed Idle 01 either.");
