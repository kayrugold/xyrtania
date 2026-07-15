import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/camera\.position\.lerp\(targetCamPos, dt \* 10\.0\);/g, 'camera.position.lerp(targetCamPos, dt * 18.0);');
fs.writeFileSync('src/App.tsx', code);
