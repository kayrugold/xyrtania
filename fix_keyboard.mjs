import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(/const keyPressHandler = \(e: KeyboardEvent\) => \{/, "const keyPressHandler = (e: KeyboardEvent) => {\n      if (e.key.toLowerCase() === 'p') {\n        setHideCharacter(prev => !prev);\n      }");

app = app.replace(/\{hideCharacter \? 'Show Character' : 'Hide Character'\}/, "{hideCharacter ? 'Show Character (P)' : 'Hide Character (P)'}");

fs.writeFileSync('src/App.tsx', app);
