import fs from 'fs';
let code = fs.readFileSync('src/WorldGrid.ts', 'utf-8');
code = code.replace(/rockMesh\.castShadow = true;/g, 'rockMesh.castShadow = false;');
code = code.replace(/rockMesh\.receiveShadow = true;/g, 'rockMesh.receiveShadow = false;');
fs.writeFileSync('src/WorldGrid.ts', code);
