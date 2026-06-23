import fs from 'fs';
import path from 'path';
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
const dir = 'public/base_male';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.fbx'));

for (const file of files) {
  try {
    const fbxData = fs.readFileSync(path.join(dir, file));
    const model = loader.parse(fbxData.buffer, '');
    let skins = [];
    model.traverse((child) => {
      if (child.isSkinnedMesh) {
         skins.push(child.name);
      }
    });
    if (skins.length > 0) {
      console.log(`[${file}] SkinnedMeshes:`, skins);
    }
  } catch (e) {
  }
}
