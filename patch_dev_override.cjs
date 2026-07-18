const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

const target = `const isDevOverride = data.secret === devEditSecret;`;
const replacement = `const isDevOverride = data.secret && data.secret.trim() === devEditSecret.trim();`;

code = code.replace(target, replacement);
fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
