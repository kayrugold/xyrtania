import fs from 'fs';
let world = fs.readFileSync('src/WorldGrid.ts', 'utf-8');
world = world.replace(/const clutterCount = 6 \+ Math\.floor\(this\.seededRandom\(baseSeed, 1\) \* 12\);/g, "const clutterCount = 1;");
fs.writeFileSync('src/WorldGrid.ts', world);
