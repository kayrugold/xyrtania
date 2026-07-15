import fs from 'fs';
let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
lines.splice(2393, 2622 - 2393 + 1); // Remove lines 2394 to 2622 (inclusive)
fs.writeFileSync('src/App.tsx', lines.join('\n'));
