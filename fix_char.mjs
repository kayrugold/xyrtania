import fs from 'fs';
let code = fs.readFileSync('src/CharacterAnimator.ts', 'utf-8');
code = code.replace(/child\.receiveShadow = true;/g, 'child.receiveShadow = false;');
fs.writeFileSync('src/CharacterAnimator.ts', code);
