const fs = require('fs');
const THREE = require('three');
const { FBXLoader } = require('three/examples/jsm/loaders/FBXLoader.js');

global.document = { createElementNS: () => ({ setAttribute: () => {}, style: {} }), createElement: () => ({ setAttribute: () => {}, style: {} }) };
global.window = { navigator: {}, document: global.document, URL: { createObjectURL: () => 'mock-url' } };
global.self = global.window;
THREE.ImageLoader.prototype.load = function(url, onLoad) { if (onLoad) onLoad({}); return {}; };

const loader = new FBXLoader();
try {
  const data = fs.readFileSync('public/assets/character/base_male_0.fbx');
  const arrayBuffer = new Uint8Array(data).buffer;
  loader.parse(arrayBuffer, '');
  console.log('Success: base_male_0.fbx');
} catch(e) {
  console.error('Error base_male_0.fbx:', e.message);
}

try {
  const data2 = fs.readFileSync('public/assets/character/animations/idle.fbx');
  const arrayBuffer2 = new Uint8Array(data2).buffer;
  loader.parse(arrayBuffer2, '');
  console.log('Success: idle.fbx');
} catch(e) {
  console.error('Error idle.fbx:', e.message);
}
