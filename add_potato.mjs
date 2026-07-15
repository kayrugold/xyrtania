import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(/useState<'high' \| 'medium' \| 'low'>\('high'\)/g, "useState<'high' | 'medium' | 'low' | 'potato'>('potato')");

app = app.replace(/\(\['low', 'medium', 'high'\] as const\)\.map/g, "(['potato', 'low', 'medium', 'high'] as const).map");

app = app.replace(/} else { \/\/ 'low'/g, "} else if (quality === 'low') { // 'low'");

const potatoCode = `} else { // 'potato'
        maxPixelRatio = 0.25;
        sunLight.castShadow = false;
        renderer.shadowMap.enabled = false;
      }`;

app = app.replace(/maxPixelRatio = 0\.5;\n\s*sunLight\.castShadow = false;\n\s*renderer\.shadowMap\.enabled = false;\n\s*}/g, "maxPixelRatio = 0.5;\n        sunLight.castShadow = false;\n        renderer.shadowMap.enabled = false;\n      } " + potatoCode);

fs.writeFileSync('src/App.tsx', app);
