const fs = require('fs');
let code = fs.readFileSync('src/NetworkManager.ts', 'utf8');

code = `import { encodeEdits, decodeEdits } from './TerrainCodec';\n` + code;

const target1 = `      room.onMessage("TERRAIN_EDIT", (edits: any[]) => {
        if (this.onTerrainEdit) {
          this.onTerrainEdit(edits);
        }
      });`;
const replace1 = `      room.onMessage("TERRAIN_EDIT", (edits: any[]) => {
        if (this.onTerrainEdit) {
          this.onTerrainEdit(edits);
        }
      });
      room.onMessage("TERRAIN_EDIT_BIN", (binaryData: any) => {
        if (this.onTerrainEdit) {
          const edits = decodeEdits(binaryData);
          this.onTerrainEdit(edits);
        }
      });`;
code = code.replace(target1, replace1);

const target2 = `        if (this.room && this.terrainEditBuffer.size > 0) {
          const batchedEdits = Array.from(this.terrainEditBuffer.values());
          this.room.send("TERRAIN_EDIT", { secret, edits: batchedEdits });
          this.terrainEditBuffer.clear();
        }`;
const replace2 = `        if (this.room && this.terrainEditBuffer.size > 0) {
          const batchedEdits = Array.from(this.terrainEditBuffer.values());
          // Send edits as JSON for ease to server, server broadcasts as binary.
          // Or we can send binary to server too? For now JSON is fine for client->server,
          // as the payload is small per batch. We keep it as JSON to avoid updating server schema.
          this.room.send("TERRAIN_EDIT", { secret, edits: batchedEdits });
          this.terrainEditBuffer.clear();
        }`;
code = code.replace(target2, replace2);

fs.writeFileSync('src/NetworkManager.ts', code);
