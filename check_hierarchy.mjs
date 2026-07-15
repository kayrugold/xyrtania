import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

global.self = global;
global.self.URL = { createObjectURL: () => '', revokeObjectURL: () => '' };

async function run() {
    const gltfBuf = fs.readFileSync('public/assets/character/teacher_body_modular.glb').buffer;
    const gltfLoader = new GLTFLoader();
    const gltf = await new Promise(res => gltfLoader.parse(gltfBuf, '', res));
    const object = gltf.scene;

    object.traverse(child => {
        if (child.isMesh || child.isBone || child.name.includes('Armature')) {
            console.log(child.type, "Name:", child.name, "Pos:", child.position, "Scale:", child.scale);
        }
    });
}
run();
