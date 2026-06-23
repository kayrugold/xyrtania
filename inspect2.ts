import * as fs from 'fs';
const data = fs.readFileSync('public/bob.fbx', 'utf-8');
const matches = data.match(/Model(::|S)[a-zA-Z0-9_]{1,30}/gi) || [];
console.log(matches);

const meshes = data.match(/Mesh(::|S)[a-zA-Z0-9_]{1,30}/gi) || [];
console.log("Meshes:", meshes);
