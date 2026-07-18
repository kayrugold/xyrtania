const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

code = `import { encodeEdits } from '../TerrainCodec';\n` + code;

// Broadcast live edits as binary
const target1 = `        // Broadcast the edit to all OTHER clients
        this.broadcast("TERRAIN_EDIT", data.edits, { except: client });`;
const replace1 = `        // Broadcast the edit to all OTHER clients (compressed binary)
        const binaryEdits = encodeEdits(data.edits);
        this.broadcast("TERRAIN_EDIT_BIN", binaryEdits, { except: client });`;
code = code.replace(target1, replace1);

// Send historical edits as binary
const target2 = `    // Send all historical terrain edits to the new player
    if (this.state.terrainEditsLog.size > 0) {
        client.send("TERRAIN_EDIT", Array.from(this.state.terrainEditsLog.values()));
    }`;
const replace2 = `    // Send all historical terrain edits to the new player (compressed binary)
    if (this.state.terrainEditsLog.size > 0) {
        const binaryEdits = encodeEdits(Array.from(this.state.terrainEditsLog.values()));
        client.send("TERRAIN_EDIT_BIN", binaryEdits);
    }`;
code = code.replace(target2, replace2);

fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
