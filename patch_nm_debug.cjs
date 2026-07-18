const fs = require('fs');
let code = fs.readFileSync('src/NetworkManager.ts', 'utf8');

const target = `room.onMessage("TERRAIN_EDIT", (edits: any[]) => {`;
const replacement = `room.onMessage("terrain_edit_error", (data: any) => {
        console.error("Terrain edit rejected by server:", data);
        alert("Terrain edit rejected: " + JSON.stringify(data, null, 2));
      });
      room.onMessage("TERRAIN_EDIT", (edits: any[]) => {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/NetworkManager.ts', code);
