const fs = require('fs');
let code = fs.readFileSync('src/WorldGrid.ts', 'utf8');

const target = `                 const newH = currentHeight + (targetHeight - currentHeight) * factor;
                 this.heightData.set(key, newH);`;
const replace = `                 const newH = currentHeight + (targetHeight - currentHeight) * factor;
                 this.heightData.set(key, newH);
                 edits.push({ vx, vz, h: newH });`;

code = code.replace(target, replace);
fs.writeFileSync('src/WorldGrid.ts', code);
