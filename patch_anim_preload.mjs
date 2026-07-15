import fs from 'fs';
let code = fs.readFileSync('src/CharacterAnimator.ts', 'utf-8');

const search = `'/assets/character/animations/treading_water.fbx',`;
const replace = `'/assets/character/animations/treading_water.fbx',
        '/assets/character/animations/crouchedwalking.fbx',`;

code = code.replace(search, replace);
fs.writeFileSync('src/CharacterAnimator.ts', code);
