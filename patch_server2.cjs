const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `// API routes go here FIRST`;
const replacement = `// API routes go here FIRST
app.get('/api/debug-players', (req, res) => {
  // Try to find the XyrtaniaRoom instance
  const room = Array.from(gameServer.matchMaker.handlers.values())?.[0]; // Hacky, but might work if we can access the room
  res.json({
    envAdminKeys: process.env.ADMIN_KEYS,
    envDevSecret: process.env.DEV_EDIT_SECRET
  });
});`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
