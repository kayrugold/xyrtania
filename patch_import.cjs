const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');
code = code.replace("import { encodeEdits } from '../TerrainCodec';", "import { encodeEdits, decodeEdits } from '../TerrainCodec';");
code = code.replace("const edits = require('../TerrainCodec').decodeEdits(buffer);", "const edits = decodeEdits(buffer);");
fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
