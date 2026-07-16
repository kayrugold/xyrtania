const fs = require('fs');
const data = fs.readFileSync('public/assets/character/Xyrtania_Male_NoMorphs.glb');
const jsonLength = data.readUInt32LE(12);
const jsonChunk = data.slice(20, 20 + jsonLength).toString('utf8');
const gltf = JSON.parse(jsonChunk);
const eyeL = gltf.nodes.find(n => n.name === 'eye_L');
console.log(eyeL);
