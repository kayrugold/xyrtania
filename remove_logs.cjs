const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

code = code.replace(/fetch\('\/api\/log_error'[^)]*\)\.catch\(\(\)=>console\.log\('failed'\)\);/g, '');
fs.writeFileSync('src/main.tsx', code);

let anim = fs.readFileSync('src/CharacterAnimator.ts', 'utf8');
anim = anim.replace(/fetch\('\/api\/log_error'[\s\S]*?\}\)\.catch\(\(\) => \{\}\);/g, '');
fs.writeFileSync('src/CharacterAnimator.ts', anim);
