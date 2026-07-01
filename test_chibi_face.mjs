import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

global.document = { createElementNS: () => ({ setAttribute: () => {}, style: {} }), createElement: () => ({ setAttribute: () => {}, style: {} }) };
global.window = { navigator: {}, document: global.document, URL: { createObjectURL: () => 'mock-url' } };
global.self = global.window;
THREE.TextureLoader.prototype.load = function() { return new THREE.Texture(); };

const loader = new FBXLoader();
const data = fs.readFileSync('public/assets/character/peter/peteridle.fbx');
const arrayBuffer = new Uint8Array(data).buffer;
const object = loader.parse(arrayBuffer, '');

const box = new THREE.Box3().setFromObject(object);
const size = box.getSize(new THREE.Vector3());
const scaleAmount = 2.14 / size.y;

const faceGroup = new THREE.Group();
faceGroup.scale.setScalar(1 / scaleAmount);

// Eyes - Chibi style
const scleraGeo = new THREE.SphereGeometry(0.08, 16, 16);
scleraGeo.scale(1, 1, 0.4); // Flatten
const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true });

const pupilGeo = new THREE.SphereGeometry(0.04, 16, 16);
pupilGeo.scale(1, 1, 0.3); // Flatten
const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false, transparent: true });

const leftEyeGroup = new THREE.Group();
leftEyeGroup.position.set(-0.09, 0.10, 0.13); // Adjusted Z
const leftSclera = new THREE.Mesh(scleraGeo, scleraMat);
const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
leftPupil.position.set(0, 0, 0.035);
leftEyeGroup.add(leftSclera, leftPupil);

const rightEyeGroup = new THREE.Group();
rightEyeGroup.position.set(0.09, 0.10, 0.13); // Adjusted Z
const rightSclera = new THREE.Mesh(scleraGeo, scleraMat);
const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
rightPupil.position.set(0, 0, 0.035);
rightEyeGroup.add(rightSclera, rightPupil);

// Nose - Organic
const noseGeo = new THREE.SphereGeometry(0.05, 16, 16);
noseGeo.scale(1, 0.7, 1.2); // Organic oblong shape
const noseMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.6, depthTest: false, transparent: true });
const nose = new THREE.Mesh(noseGeo, noseMat);
nose.position.set(0, 0.02, 0.16); // Adjusted Z

faceGroup.add(leftEyeGroup);
faceGroup.add(rightEyeGroup);
faceGroup.add(nose);
console.log("Success")
