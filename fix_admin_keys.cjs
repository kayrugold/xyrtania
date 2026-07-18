const fs = require('fs');

let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

const target = `const isAdmin = adminKeys.includes(player.playerId);`;
const replacement = `const isAdmin = adminKeys.some(key => {
        const lowerKey = key.trim().toLowerCase();
        const lowerPlayerId = player.playerId.trim().toLowerCase();
        if (lowerKey.includes('...')) {
          const parts = lowerKey.split('...');
          return lowerPlayerId.startsWith(parts[0]) && lowerPlayerId.endsWith(parts[1]);
        }
        return lowerKey === lowerPlayerId;
      });`;

code = code.replace(target, replacement);
fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
