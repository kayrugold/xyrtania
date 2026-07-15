import fs from 'fs';
let appCode = fs.readFileSync('src/App.tsx', 'utf-8');
appCode = appCode.replace(/const targetPitch = Math\.min\(state\.speed \* 0\.02, 0\.35\);/g, 'const targetPitch = 0;');
fs.writeFileSync('src/App.tsx', appCode);
