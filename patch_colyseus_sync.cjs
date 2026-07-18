const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

// Update onCreate
const target1 = `    try {
      if (fs.existsSync(this.terrainDataPath)) {
        const data = fs.readFileSync(this.terrainDataPath, 'utf8');
        const parsed = JSON.parse(data);
        for (const edit of parsed) {
            const rx = Math.floor(edit.vx / this.REGION_SIZE);
            const rz = Math.floor(edit.vz / this.REGION_SIZE);
            const rKey = \`\${rx}_\${rz}\`;
            if (!this.terrainRegions.has(rKey)) this.terrainRegions.set(rKey, new Map());
            this.terrainRegions.get(rKey).set(\`\${edit.vx}_\${edit.vz}\`, edit);
        }
        console.log(\`Loaded \${parsed.length} terrain edits from disk into regions\`);
      }
    } catch(e) {
      console.error("Failed to load terrain data", e);
    }`;

const replace1 = `    // Asynchronously load from Cloudflare D1
    this.loadTerrainFromCloudflare();`;
code = code.replace(target1, replace1);

const target2 = `  private scheduleSave() {
     if (this.saveTimeout) clearTimeout(this.saveTimeout);
     this.saveTimeout = setTimeout(() => {
        try {
            const data: any[] = [];
            for (const region of this.terrainRegions.values()) {
                for (const edit of region.values()) {
                    data.push(edit);
                }
            }
            fs.writeFileSync(this.terrainDataPath, JSON.stringify(data));
            console.log(\`Saved \${data.length} terrain edits to disk\`);
        } catch (e) {
            console.error("Failed to save terrain data", e);
        }
     }, 5000);
  }`;

const replace2 = `  private pendingRegionSaves = new Set<string>();

  private scheduleSave() {
      // Use pendingRegionSaves in a debounced way
     if (this.saveTimeout) clearTimeout(this.saveTimeout);
     this.saveTimeout = setTimeout(async () => {
        const regionsToSave = Array.from(this.pendingRegionSaves);
        this.pendingRegionSaves.clear();
        
        let savedCount = 0;
        for (const rKey of regionsToSave) {
            const region = this.terrainRegions.get(rKey);
            if (!region) continue;
            
            try {
                const data = Array.from(region.values());
                const compressed = encodeEdits(data);
                // Convert Uint8Array to base64 for JSON transport
                const base64Data = Buffer.from(compressed).toString('base64');
                
                const workerUrl = process.env.VITE_CF_WORKER_URL || 'https://xyrtania.andy-596.workers.dev/api/terrain/sync';
                
                await fetch(workerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        regionId: rKey,
                        data: base64Data,
                        secret: this.devEditSecret // Use shared secret
                    })
                });
                savedCount++;
            } catch (e) {
                console.error(\`Failed to save region \${rKey} to Cloudflare\`, e);
                this.pendingRegionSaves.add(rKey); // retry next time
            }
        }
        if (savedCount > 0) {
            console.log(\`Saved \${savedCount} terrain regions to Cloudflare D1\`);
        }
     }, 5000);
  }
  
  private async loadTerrainFromCloudflare() {
      try {
          console.log("Loading terrain from Cloudflare D1...");
          const workerUrl = process.env.VITE_CF_WORKER_URL || 'https://xyrtania.andy-596.workers.dev/api/terrain/load';
          const fetchUrl = workerUrl.replace('/sync', '/load');
          
          const res = await fetch(fetchUrl);
          const json = await res.json();
          if (json.success && json.regions) {
              let totalEdits = 0;
              for (const row of json.regions) {
                  const rKey = row.regionId;
                  const base64Data = row.data;
                  if (!base64Data) continue;
                  
                  const buffer = Buffer.from(base64Data, 'base64');
                  const edits = require('../TerrainCodec').decodeEdits(buffer);
                  
                  if (!this.terrainRegions.has(rKey)) this.terrainRegions.set(rKey, new Map());
                  const region = this.terrainRegions.get(rKey);
                  for (const edit of edits) {
                      region.set(\`\${edit.vx}_\${edit.vz}\`, edit);
                      totalEdits++;
                  }
              }
              console.log(\`Loaded \${totalEdits} terrain edits from Cloudflare D1 across \${json.regions.length} regions\`);
          }
      } catch (e) {
          console.error("Failed to load terrain from Cloudflare", e);
      }
  }`;
code = code.replace(target2, replace2);

// Add to pendingRegionSaves when a region is edited
const target3 = `            if (region.size > 50000) {
                 const entries = Array.from(region.entries());
                 this.terrainRegions.set(rKey, new Map(entries.slice(-50000)));
            }
        }
        
        // Broadcast the edit ONLY to clients who have loaded the affected regions`;
const replace3 = `            if (region.size > 50000) {
                 const entries = Array.from(region.entries());
                 this.terrainRegions.set(rKey, new Map(entries.slice(-50000)));
            }
            this.pendingRegionSaves.add(rKey);
        }
        
        // Broadcast the edit ONLY to clients who have loaded the affected regions`;
code = code.replace(target3, replace3);


fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
