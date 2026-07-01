import fs from 'fs';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';

if (typeof window === 'undefined') {
  (global as any).window = global;
  (global as any).document = {
    createElement: () => ({ setAttribute: () => {} }),
    createElementNS: () => ({ setAttribute: () => {}, addEventListener: () => {}, removeEventListener: () => {} })
  };
}

const loader = new FBXLoader();
try {
  const buffer = fs.readFileSync('./public/assets/character/humanoid/humanoid.fbx');
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const object = loader.parse(arrayBuffer as ArrayBuffer, '');
  
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  console.log("humanoid.fbx dimensions:");
  console.log("Width (X):", size.x);
  console.log("Height (Y):", size.y);
  console.log("Depth (Z):", size.z);
  console.log("Rotation of object:", object.rotation);
  
} catch (e: any) {
  console.error("Error:", e);
}
