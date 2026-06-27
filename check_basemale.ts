import fs from 'fs';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

if (typeof window === 'undefined') {
  (global as any).window = global;
  (global as any).document = {
    createElement: () => ({ setAttribute: () => {} }),
    createElementNS: () => ({ setAttribute: () => {}, addEventListener: () => {}, removeEventListener: () => {} })
  };
}

const loader = new FBXLoader();
const buffer = fs.readFileSync('./public/base_male/base_male.fbx');
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

try {
  const object = loader.parse(arrayBuffer as ArrayBuffer, '');
  object.traverse((child) => {
    console.log(child.name, (child as any).type);
  });
} catch(e) {
  console.error(e);
}
