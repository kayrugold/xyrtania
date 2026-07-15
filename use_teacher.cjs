const fs = require('fs');
let code = fs.readFileSync('src/CharacterAnimator.ts', 'utf8');

code = code.replace(/\/assets\/character\/Xyrtania_Male_Prototype\.glb/g, '/assets/character/teacher_body_modular.glb');
fs.writeFileSync('src/CharacterAnimator.ts', code);

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/\/assets\/character\/Xyrtania_Male_Prototype\.glb/g, '/assets/character/teacher_body_modular.glb');
fs.writeFileSync('src/App.tsx', appCode);

