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
  // We keep a simple log of edits to send to new players
  terrainEditsLog: Map<string, any> = new Map();
}

export class XyrtaniaRoom extends Room<XyrtaniaState> {
  onCreate(options: any) {
    this.setState(new XyrtaniaState());
    
    const adminKeys = process.env.ADMIN_KEYS ? process.env.ADMIN_KEYS.split(',') : [];
    const devEditSecret = process.env.DEV_EDIT_SECRET || "dev-secret";

    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        if (data.x !== undefined) player.x = data.x;
        if (data.y !== undefined) player.y = data.y;
        if (data.z !== undefined) player.z = data.z;
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
        // Broadcast the edit to all OTHER clients
        this.broadcast("TERRAIN_EDIT", data.edits, { except: client });
        
        // Store for late-joiners, deduplicating by vertex
        for (const edit of data.edits) {
            const key = `${edit.vx}_${edit.vz}`;
            const existing = this.state.terrainEditsLog.get(key) || { vx: edit.vx, vz: edit.vz };
            if (edit.h !== undefined) existing.h = edit.h;
            if (edit.c !== undefined) existing.c = edit.c;
            this.state.terrainEditsLog.set(key, existing);
        }
        
        // Prevent unbounded memory growth by keeping only the latest 10,000 unique vertices
        if (this.state.terrainEditsLog.size > 10000) {
            // Convert to array, slice the oldest, and rebuild map
            const entries = Array.from(this.state.terrainEditsLog.entries());
            this.state.terrainEditsLog = new Map(entries.slice(-10000));
        }
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
    
    // Send all historical terrain edits to the new player
    if (this.state.terrainEditsLog.size > 0) {
        client.send("TERRAIN_EDIT", Array.from(this.state.terrainEditsLog.values()));
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
