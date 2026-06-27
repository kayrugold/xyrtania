import { Room, Client } from "@colyseus/core";
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") rotation: number = 0;
  @type("string") avatarId: string = "";
  @type("string") currentAnimation: string = "";
  @type("boolean") isCrouching: boolean = false;
  @type("boolean") isProne: boolean = false;
}

export class XyrtaniaState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}

export class XyrtaniaRoom extends Room<XyrtaniaState> {
  onCreate(options: any) {
    this.setState(new XyrtaniaState());

    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        if (data.x !== undefined) player.x = data.x;
        if (data.y !== undefined) player.y = data.y;
        if (data.z !== undefined) player.z = data.z;
        if (data.rotation !== undefined) player.rotation = data.rotation;
        if (data.avatarId !== undefined) player.avatarId = data.avatarId;
        if (data.currentAnimation !== undefined) player.currentAnimation = data.currentAnimation;
        if (data.isCrouching !== undefined) player.isCrouching = data.isCrouching;
        if (data.isProne !== undefined) player.isProne = data.isProne;
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const player = new Player();
    player.id = client.sessionId;
    player.x = 0;
    player.y = 0;
    player.z = 0;
    player.rotation = 0;
    player.avatarId = options.avatarId || "";
    player.currentAnimation = "idle";
    player.isCrouching = false;
    player.isProne = false;
    
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
