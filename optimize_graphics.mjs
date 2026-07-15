import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

// Optimize pixel ratio
app = app.replace(/maxPixelRatio = document\.fullscreenElement \? 1\.25 : 1\.5;/g, "maxPixelRatio = document.fullscreenElement ? 1.0 : 1.0;");
app = app.replace(/maxPixelRatio = 1\.0;/g, "maxPixelRatio = 0.75;");
app = app.replace(/maxPixelRatio = 0\.85;/g, "maxPixelRatio = 0.5;");

// Optimize shadow map type
app = app.replace(/renderer\.shadowMap\.type = THREE\.PCFSoftShadowMap;/g, "renderer.shadowMap.type = THREE.PCFShadowMap;");

// Optimize light shadow map size
app = app.replace(/sunLight\.shadow\.mapSize\.width = 1024;/g, "sunLight.shadow.mapSize.width = 512;");
app = app.replace(/sunLight\.shadow\.mapSize\.height = 1024;/g, "sunLight.shadow.mapSize.height = 512;");

fs.writeFileSync('src/App.tsx', app);

let world = fs.readFileSync('src/WorldGrid.ts', 'utf-8');

// Optimize water
world = world.replace(/side: THREE\.DoubleSide/g, "// side: THREE.DoubleSide");
world = world.replace(/waterGeo = new THREE\.PlaneGeometry\(100, 100\);/g, "waterGeo = new THREE.PlaneGeometry(200, 200, 1, 1);");

// Optimize grass to only spawn rarely or be flat
world = world.replace(/const stemsCount = 3 \+ Math\.floor\(this\.seededRandom\(baseSeed, i \* 12\) \* 4\);/g, "const stemsCount = 1 + Math.floor(this.seededRandom(baseSeed, i * 12) * 2);");

fs.writeFileSync('src/WorldGrid.ts', world);
