const fs = require('fs');
const buf = fs.readFileSync('public/assets/environment/willowtree.glb');
const magic = buf.readUInt32LE(0);
const version = buf.readUInt32LE(4);
const length = buf.readUInt32LE(8);
const chunkLength = buf.readUInt32LE(12);
const chunkType = buf.readUInt32LE(16); // 0x4E4F534A
const json = buf.toString('utf-8', 20, 20 + chunkLength);
console.log(JSON.stringify(JSON.parse(json), null, 2));
