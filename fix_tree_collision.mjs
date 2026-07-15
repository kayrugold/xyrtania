import fs from 'fs';
let code = fs.readFileSync('src/WorldGrid.ts', 'utf-8');

const search = `radius: 0.2 * treeScale, // Adjusted collision radius to match the visual trunk of the custom mesh`;
const replace = `radius: 0.8 * treeScale, // Adjusted collision radius to match the visual trunk of the custom mesh`;

code = code.replace(search, replace);
fs.writeFileSync('src/WorldGrid.ts', code);
