import fs from 'fs';
let gridCode = fs.readFileSync('src/WorldGrid.ts', 'utf-8');
gridCode = gridCode.replace(/console\.warn\(\`Failed to load tree prototype \$\{url\}\.\`, err\);/g, 
  'console.error(`CRITICAL TREE LOAD ERROR ${url}:`, err);');
gridCode = gridCode.replace(/if \(this\.treePrototypes\.length > 0\) \{/g, 
  'console.log("Tree prototypes loaded count:", this.treePrototypes.length);\n    if (this.treePrototypes.length > 0) {');
fs.writeFileSync('src/WorldGrid.ts', gridCode);
