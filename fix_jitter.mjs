import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace("camera.position.lerp(targetCamPos, dt * 18.0);", "// Use exact follow to eliminate camera-lag framerate jitter\\n      camera.position.lerp(targetCamPos, 1.0);");

fs.writeFileSync('src/App.tsx', app);
