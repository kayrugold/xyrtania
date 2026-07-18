import { encodeEdits } from './server/TerrainCodec';
const compressed = encodeEdits([]);
const base64Data = Buffer.from(compressed).toString('base64');
console.log(base64Data);
