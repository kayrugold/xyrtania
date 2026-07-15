import fs from 'fs';
let log = fs.readFileSync('src/CharacterAnimator.ts', 'utf-8');
console.log(log.length);
