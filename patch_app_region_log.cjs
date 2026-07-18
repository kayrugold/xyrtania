const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `// Handle Terrain Edits`;
const replace = `// Handle Terrain Edits (Binary, Region-Batched)`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
