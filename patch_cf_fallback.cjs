const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

const target = `                  const buffer = Buffer.from(base64Data, 'base64');
                  try {
                      const edits = decodeEdits(buffer);
                      
                      if (!this.terrainRegions.has(rKey)) this.terrainRegions.set(rKey, new Map());
                      const region = this.terrainRegions.get(rKey);
                      for (const edit of edits) {
                          region.set(\`\${edit.vx}_\${edit.vz}\`, edit);
                          totalEdits++;
                      }
                  } catch (err) {
                      console.error(\`Failed to decode region \${rKey}, skipping...\`, err.message);
                  }`;

const replace = `                  let buffer = Buffer.from(base64Data, 'base64');
                  try {
                      let edits = decodeEdits(buffer);
                      
                      // Fallback for legacy binary string format
                      if (edits.length === 0 && base64Data.length > 20) {
                          try {
                              console.warn(\`Trying legacy binary decode for \${rKey}...\`);
                              buffer = Buffer.from(base64Data, 'binary');
                              edits = decodeEdits(buffer);
                          } catch (e2) {
                              // ignore
                          }
                      }

                      if (!this.terrainRegions.has(rKey)) this.terrainRegions.set(rKey, new Map());
                      const region = this.terrainRegions.get(rKey);
                      for (const edit of edits) {
                          region.set(\`\${edit.vx}_\${edit.vz}\`, edit);
                          totalEdits++;
                      }
                  } catch (err) {
                      console.error(\`Failed to decode region \${rKey}, skipping...\`, err.message);
                  }`;

code = code.replace(target, replace);
fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
