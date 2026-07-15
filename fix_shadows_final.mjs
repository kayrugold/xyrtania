import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(/maxPixelRatio = document\.fullscreenElement \? 1\.0 : 1\.0;\n\s*sunLight\.castShadow = true;\n\s*renderer\.shadowMap\.enabled = true;/g, "maxPixelRatio = document.fullscreenElement ? 1.0 : 1.0;\n        sunLight.castShadow = false;\n        renderer.shadowMap.enabled = false;");

app = app.replace(/maxPixelRatio = 0\.75;\n\s*sunLight\.castShadow = true;\n\s*renderer\.shadowMap\.enabled = true;/g, "maxPixelRatio = 0.75;\n        sunLight.castShadow = false;\n        renderer.shadowMap.enabled = false;");

fs.writeFileSync('src/App.tsx', app);
