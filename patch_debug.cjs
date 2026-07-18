const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

const target = `console.warn(\`Unauthorized terrain edit attempt by \${player.playerId}\`);`;
const replacement = `console.warn(\`Unauthorized terrain edit attempt by \${player.playerId}\`);
        client.send("terrain_edit_error", {
            playerId: player.playerId,
            providedSecret: data.secret,
            expectedSecret: devEditSecret,
            adminKeys,
            isAdmin,
            isDevOverride
        });`;

code = code.replace(target, replacement);
fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
