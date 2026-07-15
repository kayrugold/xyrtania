import fs from 'fs';

const path = 'public/assets/character/customization/teacher_head_style_1.glb';
const buf = fs.readFileSync(path);

console.log("File size:", buf.length);
console.log("First 64 bytes (hex):");
console.log(buf.slice(0, 64).toString('hex'));

console.log("First 64 bytes (ascii):");
console.log(buf.slice(0, 64).toString('ascii').replace(/[^\x20-\x7E]/g, '.'));
