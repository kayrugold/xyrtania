import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(/onClick=\{\(\) => setHideCharacter\(!hideCharacter\)\}>/, "onClick={(e) => { e.stopPropagation(); setHideCharacter(!hideCharacter); }} onPointerDown={(e) => e.stopPropagation()}>");

fs.writeFileSync('src/App.tsx', app);
