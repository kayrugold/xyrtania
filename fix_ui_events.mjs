import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(/className="w-full mt-2 bg-red-900\/50 hover:bg-red-700\/50 text-xs py-1 rounded"/, 'className="w-full mt-2 bg-red-900/50 hover:bg-red-700/50 text-xs py-1 rounded pointer-events-auto"');

fs.writeFileSync('src/App.tsx', app);
