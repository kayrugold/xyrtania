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
const buffer = fs.readFileSync('./public/base_male/bob.fbx');
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

try {
  const object = loader.parse(arrayBuffer as ArrayBuffer, '');
  let nodeCount = 0;
  object.traverse((child) => {
    console.log("Node:", child.name, "type:", (child as any).type);
    nodeCount++;
  });
  console.log("Total nodes:", nodeCount);
} catch(e) {
  console.error(e);
}
