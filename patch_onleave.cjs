const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

const target = `  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
    this.playerLoadedRegions.delete(client.sessionId);
  }`;

const replace = `  async onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    
    // If they didn't explicitly close the connection (e.g., closed tab intentionally without network drop), give them a chance to reconnect
    if (!consented) {
        try {
            console.log(\`Client \${client.sessionId} disconnected abruptly. Waiting for reconnection...\`);
            // Allow 15 seconds for the client to reconnect
            await this.allowReconnection(client, 15);
            console.log(\`Client \${client.sessionId} successfully reconnected!\`);
            return;
        } catch (e) {
            console.log(\`Client \${client.sessionId} failed to reconnect in time.\`);
        }
    }

    this.state.players.delete(client.sessionId);
    this.playerLoadedRegions.delete(client.sessionId);
  }`;

code = code.replace(target, replace);
fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
