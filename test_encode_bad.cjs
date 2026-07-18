const { encodeEdits } = require('./server/TerrainCodec.ts');
const edits = [{vx: 0, vz: 0, h: undefined, c: undefined}];
console.log(encodeEdits(edits));
