import fs from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// GLTFLoader requires a DOM environment or specific setup to run in node,
// instead we can just read the JSON part of the GLB.
const buf = fs.readFileSync('Xyrtania_Male_Prototype.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
const gltf = JSON.parse(jsonStr);

console.log("Nodes:");
gltf.nodes.forEach((n, i) => {
    if (n.name && (n.name.toLowerCase().includes('eye') || n.name.toLowerCase().includes('beard') || n.name.toLowerCase().includes('head') || n.name.toLowerCase().includes('neck'))) {
        console.log(` - ${i}: ${n.name}`);
    }
});
console.log("\nMeshes with morph targets:");
if (gltf.meshes) {
    gltf.meshes.forEach((m, i) => {
        if (m.primitives && m.primitives[0].targets) {
            console.log(`Mesh ${i}: ${m.name}`);
            if (m.extras && m.extras.targetNames) {
                console.log(`  Target Names: ${m.extras.targetNames.join(', ')}`);
            } else if (m.primitives[0].extras && m.primitives[0].extras.targetNames) {
                console.log(`  Target Names: ${m.primitives[0].extras.targetNames.join(', ')}`);
            } else {
                 console.log(`  Target count: ${m.primitives[0].targets.length}`);
                 // Try looking in nodes
                 const node = gltf.nodes.find(n => n.mesh === i);
                 if (node && node.extras && node.extras.targetNames) {
                     console.log(`  Target Names (from node): ${node.extras.targetNames.join(', ')}`);
                 }
            }
        }
    });
}
