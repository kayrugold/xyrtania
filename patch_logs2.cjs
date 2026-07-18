const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

const target = `    console.log(client.sessionId, "joined!");`;
const replacement = `    console.log(client.sessionId, "joined! Player ID:", options.playerId);`;

code = code.replace(target, replacement);
fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
