import fs from 'fs';
let code = fs.readFileSync('src/WorldGrid.ts', 'utf-8');
code = code.replace(/radius: 0\.15 \* treeScale,/g, 'radius: 0.03 * treeScale,');
fs.writeFileSync('src/WorldGrid.ts', code);
