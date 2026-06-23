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
const fbxData = fs.readFileSync('public/base_male/bob.fbx');
const model = loader.parse(fbxData.buffer, '');
const dump = (obj, indent) => {
  console.log(indent + obj.name + " (" + obj.type + ")");
  obj.children.forEach((c) => dump(c, indent + "  "));
};
dump(model, "");
