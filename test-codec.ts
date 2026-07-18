import { encodeEdits, decodeEdits } from './src/TerrainCodec.ts';

const edits = [{ vx: 1, vz: 2, h: 3, c: '#00ff00' }];
const compressed = encodeEdits(edits);
const base64Data = Buffer.from(compressed).toString('base64');

console.log('Base64:', base64Data);
const buffer = Buffer.from(base64Data, 'base64');
const decoded = decodeEdits(buffer);
console.log('Decoded:', decoded);
