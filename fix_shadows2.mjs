import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(/sunLight\.castShadow = false;/g, "sunLight.castShadow = true;");
app = app.replace(/renderer\.shadowMap\.enabled = false;/g, "renderer.shadowMap.enabled = true;");
fs.writeFileSync('src/App.tsx', app);
