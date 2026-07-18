import { encodeEdits, decodeEdits } from '../TerrainCodec';
import fs from 'fs';
import path from 'path';
import { Room, Client } from "@colyseus/core";
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") playerId: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") rotation: number = 0;
  @type("string") avatarId: string = "";
  @type("string") currentAnimation: string = "";
  @type("string") animationState: string = "";
  @type("string") displayName: string = "";
  @type("string") customColor: string = "";
  @type("number") customScale: number = 1.0;
  @type("boolean") isCrouching: boolean = false;
  @type("boolean") isProne: boolean = false;
  @type("string") morphTargetsJson: string = "{}";
}

export class XyrtaniaState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}

export class XyrtaniaRoom extends Room<XyrtaniaState> {
  private adminKeys: string[] = [];
  private devEditSecret: string = "";
  private terrainDataPath = path.join(process.cwd(), 'terrain_data.json');
  private saveTimeout: any = null;
  private terrainRegions = new Map<string, Map<string, any>>();
  private playerLoadedRegions = new Map<string, Set<string>>();
  private readonly REGION_SIZE = 1000;

  onCreate(options: any) {
    this.setState(new XyrtaniaState());

    // Asynchronously load from Cloudflare D1
    this.loadTerrainFromCloudflare();
    
    this.adminKeys = process.env.ADMIN_KEYS ? process.env.ADMIN_KEYS.split(',') : [];
    this.devEditSecret = process.env.DEV_EDIT_SECRET || "dev-secret";
    
    const adminKeys = this.adminKeys;
    const devEditSecret = this.devEditSecret;

    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        if (data.x !== undefined) player.x = data.x;
        if (data.y !== undefined) player.y = data.y;
        if (data.z !== undefined) player.z = data.z;
        if (data.x !== undefined || data.z !== undefined) {
            this.checkPlayerRegions(client, player.x, player.z);
        }
        if (data.rotation !== undefined) player.rotation = data.rotation;
        if (data.avatarId !== undefined) player.avatarId = data.avatarId;
        if (data.currentAnimation !== undefined) player.currentAnimation = data.currentAnimation;
        if (data.animationState !== undefined) player.animationState = data.animationState;
        if (data.displayName !== undefined) player.displayName = data.displayName;
        if (data.customColor !== undefined) player.customColor = data.customColor;
        if (data.customScale !== undefined) player.customScale = data.customScale;
        if (data.isCrouching !== undefined) player.isCrouching = data.isCrouching;
        if (data.isProne !== undefined) player.isProne = data.isProne;
        if (data.morphTargetsJson !== undefined) player.morphTargetsJson = data.morphTargetsJson;
      }
    });


    this.onMessage("verify_secret", (client, data) => {
      const isDevOverride = data.secret && data.secret.trim() === this.devEditSecret.trim();
      if (isDevOverride) {
        client.send("admin_status", { isAdmin: true });
      } else {
        client.send("admin_status", { isAdmin: false });
      }
    });

    this.onMessage("TERRAIN_EDIT", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const isAdmin = adminKeys.some(key => {
        const lowerKey = key.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        const lowerPlayerId = player.playerId.trim().toLowerCase();
        if (lowerKey.includes('...')) {
          const parts = lowerKey.split('...');
          return lowerPlayerId.startsWith(parts[0]) && lowerPlayerId.endsWith(parts[1]);
        }
        return lowerKey === lowerPlayerId;
      });
      const isDevOverride = data.secret && data.secret.trim() === devEditSecret.trim();
      console.log('TERRAIN_EDIT check:', {
        playerId: player.playerId,
        adminKeys,
        devEditSecret,
        providedSecret: data.secret,
        isAdmin,
        isDevOverride
      });

      if (isAdmin || isDevOverride) {
        // Store edits in regions
        for (const edit of data.edits) {
            const rx = Math.floor(edit.vx / this.REGION_SIZE);
            const rz = Math.floor(edit.vz / this.REGION_SIZE);
            const rKey = `${rx}_${rz}`;
            if (!this.terrainRegions.has(rKey)) this.terrainRegions.set(rKey, new Map());
            
            const region = this.terrainRegions.get(rKey);
            const key = `${edit.vx}_${edit.vz}`;
            const existing = region.get(key) || { vx: edit.vx, vz: edit.vz };
            if (edit.h !== undefined) existing.h = edit.h;
            if (edit.c !== undefined) existing.c = edit.c;
            region.set(key, existing);
            
            // Limit region size if it gets incredibly huge (e.g. 50k vertices per 1000x1000 region)
            if (region.size > 50000) {
                 const entries = Array.from(region.entries());
                 this.terrainRegions.set(rKey, new Map(entries.slice(-50000)));
            }
            this.pendingRegionSaves.add(rKey);
        }
        
        // Broadcast the edit ONLY to clients who have loaded the affected regions
        const binaryEdits = encodeEdits(data.edits);
        for (const c of this.clients) {
            if (c.sessionId === client.sessionId) continue;
            
            let shouldSend = false;
            const loaded = this.playerLoadedRegions.get(c.sessionId);
            if (loaded) {
                for (const edit of data.edits) {
                    const rKey = `${Math.floor(edit.vx / this.REGION_SIZE)}_${Math.floor(edit.vz / this.REGION_SIZE)}`;
                    if (loaded.has(rKey)) {
                        shouldSend = true;
                        break;
                    }
                }
            }
            if (shouldSend) {
                c.send("TERRAIN_EDIT_BIN", binaryEdits);
            }
        }
        
        this.scheduleSave();
      } else {
        console.warn(`Unauthorized terrain edit attempt by ${player.playerId}`);
        client.send("terrain_edit_error", {
            playerId: player.playerId,
            providedSecret: data.secret,
            expectedSecret: devEditSecret,
            adminKeys,
            isAdmin,
            isDevOverride
        });
      }
    });

    this.onMessage("setAnimation", (client, animationState) => {
      const player = this.state.players.get(client.sessionId);
      if (player && typeof animationState === 'string') {
        player.animationState = animationState;
        player.currentAnimation = animationState;
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined! Player ID:", options.playerId);
    
    // Disconnect any existing ghosts for the same player ID to prevent multiple spawns
    const pId = options.playerId || "";
    if (pId) {
        for (const [sessionId, existingPlayer] of this.state.players.entries()) {
            if (existingPlayer.playerId === pId && sessionId !== client.sessionId) {
                console.log(`Kicking ghost connection for player ${pId} (Session: ${sessionId})`);
                const existingClient = this.clients.find(c => c.sessionId === sessionId);
                if (existingClient) {
                    existingClient.leave(4000, "Joined from another session");
                } else {
                    // If client object isn't found for some reason, clean up manually
                    this.state.players.delete(sessionId);
                    this.playerLoadedRegions.delete(sessionId);
                }
            }
        }
    }
    const player = new Player();
    player.id = client.sessionId;
    player.playerId = options.playerId || "";
    player.x = 0;
    player.y = 0;
    player.z = 0;
    player.rotation = 0;
    player.avatarId = options.avatarId || "";
    player.displayName = options.displayName || "Anonymous";
    player.currentAnimation = "idle";
    player.animationState = "idle";
    player.isCrouching = false;
    player.isProne = false;
    
    this.state.players.set(client.sessionId, player);
    
    // Send admin status
    const lowerPlayerId = player.playerId.trim().toLowerCase();
    const isAdmin = this.adminKeys.some(key => {
        const lowerKey = key.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        if (lowerKey.includes('...')) {
          const parts = lowerKey.split('...');
          return lowerPlayerId.startsWith(parts[0]) && lowerPlayerId.endsWith(parts[1]);
        }
        return lowerKey === lowerPlayerId;
    });
    client.send("admin_status", { isAdmin });

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
              const rKey = `${rx + dx}_${rz + dz}`;
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
  }

  private pendingRegionSaves = new Set<string>();

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
                console.error(`Failed to save region ${rKey} to Cloudflare`, e);
                this.pendingRegionSaves.add(rKey); // retry next time
            }
        }
        if (savedCount > 0) {
            console.log(`Saved ${savedCount} terrain regions to Cloudflare D1`);
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
                  
                  let buffer = Buffer.from(base64Data, 'base64');
                  try {
                      let edits = decodeEdits(buffer);
                      
                      // Fallback for legacy binary string format
                      if (edits.length === 0 && base64Data.length > 20) {
                          try {
                              console.warn(`Trying legacy binary decode for ${rKey}...`);
                              buffer = Buffer.from(base64Data, 'binary');
                              edits = decodeEdits(buffer);
                          } catch (e2) {
                              // ignore
                          }
                      }

                      if (!this.terrainRegions.has(rKey)) this.terrainRegions.set(rKey, new Map());
                      const region = this.terrainRegions.get(rKey);
                      for (const edit of edits) {
                          region.set(`${edit.vx}_${edit.vz}`, edit);
                          totalEdits++;
                      }
                  } catch (err) {
                      console.error(`Failed to decode region ${rKey}, skipping...`, err.message);
                  }
              }
              console.log(`Loaded ${totalEdits} terrain edits from Cloudflare D1 across ${json.regions.length} regions`);
          }
      } catch (e) {
          console.error("Failed to load terrain from Cloudflare", e);
      }
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    
    // If they didn't explicitly close the connection (e.g., closed tab intentionally without network drop), give them a chance to reconnect
    if (!consented) {
        try {
            console.log(`Client ${client.sessionId} disconnected abruptly. Waiting for reconnection...`);
            // Allow 15 seconds for the client to reconnect
            await this.allowReconnection(client, 15);
            console.log(`Client ${client.sessionId} successfully reconnected!`);
            return;
        } catch (e) {
            console.log(`Client ${client.sessionId} failed to reconnect in time.`);
        }
    }

    this.state.players.delete(client.sessionId);
    this.playerLoadedRegions.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
