const fs = require('fs');
const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
const { JSDOM } = require('jsdom');
const { window } = new JSDOM();
global.window = window;
global.document = window.document;

const toArrayBuffer = (buf) => {
    const ab = new ArrayBuffer(buf.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
};

const loader = new GLTFLoader();
const data = fs.readFileSync('public/assets/character/Xyrtania_Male_NoMorphs.glb');
const arrayBuffer = toArrayBuffer(data);

loader.parse(arrayBuffer, '', (gltf) => {
    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            console.log('Mesh:', child.name);
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(m => console.log('  Material:', m.name));
        }
    });
}, (err) => console.error(err));
