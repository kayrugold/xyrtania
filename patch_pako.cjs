const fs = require('fs');
let code = fs.readFileSync('src/TerrainCodec.ts', 'utf8');
code = code.replace("import pako from 'pako';", "import * as pako from 'pako';");
fs.writeFileSync('src/TerrainCodec.ts', code);
fs.writeFileSync('server/TerrainCodec.ts', code);
