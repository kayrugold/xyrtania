import fs from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

global.self = global;
global.self.URL = { createObjectURL: () => '', revokeObjectURL: () => '' };

async function run() {
    const gltfBuf = fs.readFileSync('public/assets/character/teacher_body_modular.glb').buffer;
    const gltfLoader = new GLTFLoader();
    const gltf = await new Promise(res => gltfLoader.parse(gltfBuf, '', res));
    const object = gltf.scene;

    object.traverse(c => {
        if (c.isBone) {
            console.log(c.name, "parent:", c.parent ? c.parent.name : 'null', "pos:", c.position);
        }
    });
}
run();
