const fs = require('fs');
const buf = fs.readFileSync('public/assets/environment/tree_prototype.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
const gltf = JSON.parse(jsonStr);
console.log(JSON.stringify(gltf.nodes, null, 2));
console.log(JSON.stringify(gltf.meshes, null, 2));
