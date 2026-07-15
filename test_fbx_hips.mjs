import fs from 'fs';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

global.self = global;
global.self.URL = { createObjectURL: () => '', revokeObjectURL: () => '' };

const fbxBuf = fs.readFileSync('public/assets/character/animations/walk.fbx').buffer;
const fbxLoader = new FBXLoader();
const fbx = fbxLoader.parse(fbxBuf, '');
const clip = fbx.animations[0];

const hipTrack = clip.tracks.find(t => t.name.includes('Hips.position'));
if (hipTrack) {
    console.log("Hips position track found. First few values:");
    console.log(hipTrack.values.slice(0, 9));
} else {
    console.log("No Hips position track.");
}
