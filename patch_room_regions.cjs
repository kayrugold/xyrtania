const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

// 1. Add class properties
const target1 = `  private terrainDataPath = path.join(process.cwd(), 'terrain_data.json');
  private saveTimeout: any = null;`;
const replace1 = `  private terrainDataPath = path.join(process.cwd(), 'terrain_data.json');
  private saveTimeout: any = null;
  private terrainRegions = new Map<string, Map<string, any>>();
  private playerLoadedRegions = new Map<string, Set<string>>();
  private readonly REGION_SIZE = 1000;`;
code = code.replace(target1, replace1);

// 2. Remove terrainEditsLog from XyrtaniaState
const target2 = `export class XyrtaniaState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  // We keep a simple log of edits to send to new players
  terrainEditsLog: Map<string, any> = new Map();
}`;
const replace2 = `export class XyrtaniaState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}`;
code = code.replace(target2, replace2);

// 3. Update onCreate JSON load
const target3 = `        const parsed = JSON.parse(data);
        for (const edit of parsed) {
           this.state.terrainEditsLog.set(\`\${edit.vx}_\${edit.vz}\`, edit);
        }
        console.log(\`Loaded \${parsed.length} terrain edits from disk\`);`;
const replace3 = `        const parsed = JSON.parse(data);
        for (const edit of parsed) {
            const rx = Math.floor(edit.vx / this.REGION_SIZE);
            const rz = Math.floor(edit.vz / this.REGION_SIZE);
            const rKey = \`\${rx}_\${rz}\`;
            if (!this.terrainRegions.has(rKey)) this.terrainRegions.set(rKey, new Map());
            this.terrainRegions.get(rKey).set(\`\${edit.vx}_\${edit.vz}\`, edit);
        }
        console.log(\`Loaded \${parsed.length} terrain edits from disk into regions\`);`;
code = code.replace(target3, replace3);

// 4. Update onMessage "move"
const target4 = `        if (data.x !== undefined) player.x = data.x;
        if (data.y !== undefined) player.y = data.y;
        if (data.z !== undefined) player.z = data.z;`;
const replace4 = `        if (data.x !== undefined) player.x = data.x;
        if (data.y !== undefined) player.y = data.y;
        if (data.z !== undefined) player.z = data.z;
        if (data.x !== undefined || data.z !== undefined) {
            this.checkPlayerRegions(client, player.x, player.z);
        }`;
code = code.replace(target4, replace4);

// 5. Update onMessage "TERRAIN_EDIT" storage and broadcast
const target5 = `        // Broadcast the edit to all OTHER clients (compressed binary)
        const binaryEdits = encodeEdits(data.edits);
        this.broadcast("TERRAIN_EDIT_BIN", binaryEdits, { except: client });
        
        // Store for late-joiners, deduplicating by vertex
        for (const edit of data.edits) {
            const key = \`\${edit.vx}_\${edit.vz}\`;
            const existing = this.state.terrainEditsLog.get(key) || { vx: edit.vx, vz: edit.vz };
            if (edit.h !== undefined) existing.h = edit.h;
            if (edit.c !== undefined) existing.c = edit.c;
            this.state.terrainEditsLog.set(key, existing);
        }
        
        // Prevent unbounded memory growth by keeping only the latest 10,000 unique vertices
        if (this.state.terrainEditsLog.size > 100000) { // Bumped to 100k
            // Convert to array, slice the oldest, and rebuild map
            const entries = Array.from(this.state.terrainEditsLog.entries());
            this.state.terrainEditsLog = new Map(entries.slice(-100000));
        }`;
const replace5 = `        // Store edits in regions
        for (const edit of data.edits) {
            const rx = Math.floor(edit.vx / this.REGION_SIZE);
            const rz = Math.floor(edit.vz / this.REGION_SIZE);
            const rKey = \`\${rx}_\${rz}\`;
            if (!this.terrainRegions.has(rKey)) this.terrainRegions.set(rKey, new Map());
            
            const region = this.terrainRegions.get(rKey);
            const key = \`\${edit.vx}_\${edit.vz}\`;
            const existing = region.get(key) || { vx: edit.vx, vz: edit.vz };
            if (edit.h !== undefined) existing.h = edit.h;
            if (edit.c !== undefined) existing.c = edit.c;
            region.set(key, existing);
            
            // Limit region size if it gets incredibly huge (e.g. 50k vertices per 1000x1000 region)
            if (region.size > 50000) {
                 const entries = Array.from(region.entries());
                 this.terrainRegions.set(rKey, new Map(entries.slice(-50000)));
            }
        }
        
        // Broadcast the edit ONLY to clients who have loaded the affected regions
        const binaryEdits = encodeEdits(data.edits);
        for (const c of this.clients) {
            if (c.sessionId === client.sessionId) continue;
            
            let shouldSend = false;
            const loaded = this.playerLoadedRegions.get(c.sessionId);
            if (loaded) {
                for (const edit of data.edits) {
                    const rKey = \`\${Math.floor(edit.vx / this.REGION_SIZE)}_\${Math.floor(edit.vz / this.REGION_SIZE)}\`;
                    if (loaded.has(rKey)) {
                        shouldSend = true;
                        break;
                    }
                }
            }
            if (shouldSend) {
                c.send("TERRAIN_EDIT_BIN", binaryEdits);
            }
        }`;
code = code.replace(target5, replace5);

// 6. Update onJoin
const target6 = `    client.send("admin_status", { isAdmin });

    // Send all historical terrain edits to the new player (compressed binary)
    if (this.state.terrainEditsLog.size > 0) {
        const binaryEdits = encodeEdits(Array.from(this.state.terrainEditsLog.values()));
        client.send("TERRAIN_EDIT_BIN", binaryEdits);
    }
  }`;
const replace6 = `    client.send("admin_status", { isAdmin });

    this.playerLoadedRegions.set(client.sessionId, new Set());
    this.checkPlayerRegions(client, player.x, player.z);
  }

  private checkPlayerRegions(client: Client, x: number, z: number) {
      const rx = Math.floor(x / this.REGION_SIZE);
      const rz = Math.floor(z / this.REGION_SIZE);
      const loaded = this.playerLoadedRegions.get(client.sessionId);
      if (!loaded) return;

      const newEdits: any[] = [];
      // 3x3 regions around player
      for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
              const rKey = \`\${rx + dx}_\${rz + dz}\`;
              if (!loaded.has(rKey)) {
                  loaded.add(rKey);
                  const regionEdits = this.terrainRegions.get(rKey);
                  if (regionEdits) {
                      for (const edit of regionEdits.values()) newEdits.push(edit);
                  }
              }
          }
      }
      
      // Batch send to avoid huge payload if many regions
      if (newEdits.length > 0) {
          // split into chunks of 10000 edits so we don't blow up the message size
          for (let i = 0; i < newEdits.length; i += 10000) {
              const batch = newEdits.slice(i, i + 10000);
              client.send("TERRAIN_EDIT_BIN", encodeEdits(batch));
          }
      }
  }`;
code = code.replace(target6, replace6);

// 7. Update scheduleSave
const target7 = `            const data = Array.from(this.state.terrainEditsLog.values());`;
const replace7 = `            const data: any[] = [];
            for (const region of this.terrainRegions.values()) {
                for (const edit of region.values()) {
                    data.push(edit);
                }
            }`;
code = code.replace(target7, replace7);

// 8. Update onLeave
const target8 = `  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }`;
const replace8 = `  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
    this.playerLoadedRegions.delete(client.sessionId);
  }`;
code = code.replace(target8, replace8);

fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
