import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(/} else { \/\/ 'low'\n        \/\/ Low quality: 0.85 max pixel ratio \(sub-sampled\), shadows disabled completely for peak performance\n        maxPixelRatio = 0.5;\n        sunLight\.castShadow = true;\n        renderer\.shadowMap\.enabled = true;\n      }/, "} else { // 'low'\n        // Low quality: 0.5 max pixel ratio (sub-sampled), shadows disabled completely for peak performance\n        maxPixelRatio = 0.5;\n        sunLight.castShadow = false;\n        renderer.shadowMap.enabled = false;\n      }");
fs.writeFileSync('src/App.tsx', app);
