const fs = require('fs');
let code = fs.readFileSync('src/NetworkManager.ts', 'utf8');

const target1 = `  public onTerrainEdit?: (edits: any[]) => void;`;
const replace1 = `  public onTerrainEdit?: (edits: any[]) => void;
  public onAdminStatus?: (isAdmin: boolean) => void;`;

code = code.replace(target1, replace1);

const target2 = `      room.onMessage("TERRAIN_EDIT", (edits: any[]) => {`;
const replace2 = `      room.onMessage("admin_status", (data: any) => {
        if (this.onAdminStatus) {
            this.onAdminStatus(data.isAdmin);
        }
      });
      room.onMessage("TERRAIN_EDIT", (edits: any[]) => {`;

code = code.replace(target2, replace2);
fs.writeFileSync('src/NetworkManager.ts', code);
