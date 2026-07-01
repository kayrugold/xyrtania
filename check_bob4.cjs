const fs = require('fs');
const THREE = require('three');
const { FBXLoader } = require('three/examples/jsm/loaders/FBXLoader.js');

global.document = { createElementNS: () => ({ setAttribute: () => {}, style: {} }), createElement: () => ({ setAttribute: () => {}, style: {} }) };
global.window = { navigator: {}, document: global.document, URL: { createObjectURL: () => 'mock-url' } };
global.self = global.window;

THREE.TextureLoader.prototype.load = function(url, onLoad) {
    const tex = new THREE.Texture();
    if (onLoad) setTimeout(() => onLoad(tex), 0);
    return tex;
};

const loader = new FBXLoader();
const data = fs.readFileSync('public/assets/character/bob.fbx');
const arrayBuffer = new Uint8Array(data).buffer;
const object = loader.parse(arrayBuffer, '');
let bones = [];
object.traverse((child) => {
    if (child.isBone) bones.push(child.name);
});
console.log("Bob Bones:", bones.length > 0 ? bones.slice(0, 20) : "None", "Total:", bones.length);
