import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/const handleDiagKey = \(e\) => \{/, "const handleDiagKey = (e: KeyboardEvent) => {");
fs.writeFileSync('src/App.tsx', code);
