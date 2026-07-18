const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

// Replace local constants with class properties
const targetOnCreate = `  onCreate(options: any) {
    this.setState(new XyrtaniaState());
    
    const adminKeys = process.env.ADMIN_KEYS ? process.env.ADMIN_KEYS.split(',') : [];
    const devEditSecret = process.env.DEV_EDIT_SECRET || "dev-secret";`;

const replaceOnCreate = `  private adminKeys: string[] = [];
  private devEditSecret: string = "";

  onCreate(options: any) {
    this.setState(new XyrtaniaState());
    
    this.adminKeys = process.env.ADMIN_KEYS ? process.env.ADMIN_KEYS.split(',') : [];
    this.devEditSecret = process.env.DEV_EDIT_SECRET || "dev-secret";
    
    const adminKeys = this.adminKeys;
    const devEditSecret = this.devEditSecret;`;

code = code.replace(targetOnCreate, replaceOnCreate);

const targetOnJoin = `    // Send all historical terrain edits to the new player`;
const replaceOnJoin = `    // Send admin status
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

    // Send all historical terrain edits to the new player`;

code = code.replace(targetOnJoin, replaceOnJoin);

fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
