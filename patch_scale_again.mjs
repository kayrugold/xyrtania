import fs from 'fs';
let code = fs.readFileSync('src/WorldGrid.ts', 'utf-8');
code = code.replace(/const treeScale = \(0\.5 \+ this\.seededRandom\(baseSeed, i \* 19\) \* 4\.5\) \* baseTreeScale;/g,
  'const treeScale = (1.5 + this.seededRandom(baseSeed, i * 19) * 4.5) * baseTreeScale;');
fs.writeFileSync('src/WorldGrid.ts', code);
