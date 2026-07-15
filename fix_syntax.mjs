import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(/} } else { \/\/ 'potato'/g, "} else { // 'potato'");
fs.writeFileSync('src/App.tsx', app);
