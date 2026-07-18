const fs = require('fs');
let code = fs.readFileSync('src/NetworkManager.ts', 'utf8');

const target1 = `      room.onMessage("terrain_edit_error", (data: any) => {
        console.error("Terrain edit rejected by server:", data);
        alert("Terrain edit rejected: " + JSON.stringify(data, null, 2));
      });`;
const replace1 = `      room.onMessage("terrain_edit_error", (data: any) => {
        console.error("Terrain edit rejected by server:", data);
        alert("Terrain edit rejected: " + JSON.stringify(data, null, 2));
        if (this.onAdminStatus) {
            this.onAdminStatus(false);
        }
      });`;

const target2 = `  public verifyAdminSecret(secret: string) {
    if (this.room) {
      this.room.send("verify_secret", { secret });
    }
  }`;
const replace2 = `  public verifyAdminSecret(secret: string) {
    if (this.room) {
      if (this.connectionMode === 'colyseus_render') {
        // Older Render server doesn't support verify_secret message and will crash.
        // Send a probe TERRAIN_EDIT instead.
        this.room.send("TERRAIN_EDIT", { secret, edits: [] });
        if (this.onAdminStatus) {
            this.onAdminStatus(true);
        }
      } else {
        this.room.send("verify_secret", { secret });
      }
    }
  }`;

code = code.replace(target1, replace1);
code = code.replace(target2, replace2);
fs.writeFileSync('src/NetworkManager.ts', code);
