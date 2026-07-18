const { encodeEdits, decodeEdits } = require('./server/TerrainCodec.ts');
const edits = [{vx: 0, vz: 0, h: 5.5, c: 0xff0000}];
console.log(encodeEdits(edits));
