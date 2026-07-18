const fs = require('fs');

const codecCode = `
import pako from 'pako';

export function encodeEdits(edits: any[]): Uint8Array {
    const buffer = new Float32Array(edits.length * 4);
    for (let i = 0; i < edits.length; i++) {
        const edit = edits[i];
        buffer[i * 4] = edit.vx;
        buffer[i * 4 + 1] = edit.vz;
        buffer[i * 4 + 2] = edit.h !== undefined ? edit.h : NaN;
        buffer[i * 4 + 3] = edit.c !== undefined ? edit.c : -1;
    }
    return pako.deflate(new Uint8Array(buffer.buffer));
}

export function decodeEdits(binaryData: Uint8Array | ArrayBuffer | Buffer): any[] {
    let uintData = binaryData instanceof Uint8Array ? binaryData : new Uint8Array(binaryData as ArrayBuffer);
    const inflated = pako.inflate(uintData);
    // Be careful with byteOffsets when wrapping buffers
    const buffer = new Float32Array(inflated.buffer, inflated.byteOffset, inflated.byteLength / 4);
    const edits = [];
    for (let i = 0; i < buffer.length; i += 4) {
        const edit: any = { vx: buffer[i], vz: buffer[i+1] };
        if (!Number.isNaN(buffer[i+2])) edit.h = buffer[i+2];
        if (buffer[i+3] !== -1) edit.c = buffer[i+3];
        edits.push(edit);
    }
    return edits;
}
`;

fs.writeFileSync('src/TerrainCodec.ts', codecCode);
fs.writeFileSync('server/TerrainCodec.ts', codecCode);

