const fs = require('fs');

let nmCode = fs.readFileSync('src/NetworkManager.ts', 'utf8');
nmCode = nmCode.replace(/\/assets\/character\/Xyrtania_Male_Prototype\.glb/g, '/assets/character/teacher_body_modular.glb');
fs.writeFileSync('src/NetworkManager.ts', nmCode);

let charAnimCode = fs.readFileSync('src/CharacterAnimator.ts', 'utf8');
charAnimCode = charAnimCode.replace(/falling back to Xyrtania_Male_Prototype\.glb/g, 'falling back to teacher_body_modular.glb');
fs.writeFileSync('src/CharacterAnimator.ts', charAnimCode);

