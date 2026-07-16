const fs = require('fs');
const data = fs.readFileSync('public/assets/character/Xyrtania_Male_NoMorphs.glb');
const jsonLength = data.readUInt32LE(12);
const jsonChunk = data.slice(20, 20 + jsonLength).toString('utf8');
const gltf = JSON.parse(jsonChunk);
if (gltf.materials) gltf.materials.forEach(m => console.log('Material:', m.name));
if (gltf.nodes) gltf.nodes.forEach(m => { if (m.name.toLowerCase().includes('eye')) console.log('Node:', m.name) });
