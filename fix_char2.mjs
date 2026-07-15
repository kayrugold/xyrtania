import fs from 'fs';
let code = fs.readFileSync('src/CharacterAnimator.ts', 'utf-8');
code = code.replace(/child\.castShadow = true;/g, 'child.castShadow = false;');
fs.writeFileSync('src/CharacterAnimator.ts', code);
