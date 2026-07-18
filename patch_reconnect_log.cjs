const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

code = code.replace('console.log(`Client ${client.sessionId} failed to reconnect in time.`);', '// Expected timeout if user fully left');

fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
