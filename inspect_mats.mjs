import fs from 'fs';
const buf = fs.readFileSync('Xyrtania_Male_Prototype.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
const gltf = JSON.parse(jsonStr);

console.log("Materials:");
if (gltf.materials) {
    gltf.materials.forEach((m, i) => {
        console.log(` - ${i}: ${m.name}`);
    });
}
