import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(/sunLight\.castShadow = true;/g, "sunLight.castShadow = false;");
app = app.replace(/renderer\.shadowMap\.enabled = true;/g, "renderer.shadowMap.enabled = false;");
fs.writeFileSync('src/App.tsx', app);
