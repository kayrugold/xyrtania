const pako = require('pako');
const { encodeEdits } = require('./server/TerrainCodec');
const compressed = encodeEdits([]);
const base64Data = Buffer.from(compressed).toString('base64');
console.log(base64Data);
