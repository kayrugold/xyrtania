import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

global.document = { createElementNS: () => ({ setAttribute: () => {}, style: {} }), createElement: () => ({ setAttribute: () => {}, style: {} }) };
global.window = { navigator: {}, document: global.document, URL: { createObjectURL: () => 'mock-url' } };
global.self = global.window;
THREE.TextureLoader.prototype.load = function() { return new THREE.Texture(); };

const loader = new FBXLoader();
const bobData = fs.readFileSync('public/assets/character/bob.fbx');
const bobObj = loader.parse(new Uint8Array(bobData).buffer, '');

const animData = fs.readFileSync('public/assets/character/animations/idle.fbx');
const animObj = loader.parse(new Uint8Array(animData).buffer, '');

let rootMeshName = '';
const meshHipsRestingPosition = new THREE.Vector3(0,0,0);

bobObj.traverse((child) => {
    if (child.isMesh && !rootMeshName) rootMeshName = child.name;
});

const anim = animObj.animations[0];
const tracks = anim.tracks.map(t => t.clone());
tracks.forEach(track => {
    if (track.name.includes('Hips')) {
        track.name = rootMeshName + '.' + track.name.split('.')[1];
        if (track.name.includes('.position')) {
            const diffX = meshHipsRestingPosition.x - track.values[0];
            const diffY = meshHipsRestingPosition.y - track.values[1];
            const diffZ = meshHipsRestingPosition.z - track.values[2];
            for (let i = 0; i < track.values.length; i += 3) {
                track.values[i] += diffX;
                track.values[i+1] += diffY;
                track.values[i+2] += diffZ;
            }
        }
    } else {
        track.name = 'ignored.' + track.name.split('.')[1];
    }
});
const clip = new THREE.AnimationClip(anim.name, anim.duration, tracks);

const mixer = new THREE.AnimationMixer(bobObj);
const action = mixer.clipAction(clip);
action.play();

mixer.update(0.1);
bobObj.updateMatrixWorld(true);

bobObj.traverse(child => {
    if (child.name === rootMeshName) {
        console.log("Root mesh pos:", child.position);
        console.log("Root mesh rot:", child.quaternion);
    }
});
