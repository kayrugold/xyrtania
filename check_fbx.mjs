import fs from 'fs';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

global.self = global;
global.self.URL = { createObjectURL: () => '', revokeObjectURL: () => '' };

async function run() {
    const fbxBuf = fs.readFileSync('public/assets/character/animations/walk.fbx').buffer;
    const fbxLoader = new FBXLoader();
    const fbxGroup = fbxLoader.parse(fbxBuf, '');

    const clip = fbxGroup.animations[0];
    console.log("Animation Name:", clip.name);
    const hipsTrack = clip.tracks.find(t => t.name.includes('Hips.position'));
    if (hipsTrack) {
        console.log("FBX Hips position track values (first 12):");
        console.log(hipsTrack.values.slice(0, 12));
    } else {
        console.log("No Hips position track in FBX!");
    }
}
run();
