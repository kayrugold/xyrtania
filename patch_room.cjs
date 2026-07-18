const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

const target = `  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined! Player ID:", options.playerId);`;

const replace = `  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined! Player ID:", options.playerId);
    
    // Disconnect any existing ghosts for the same player ID to prevent multiple spawns
    const pId = options.playerId || "";
    if (pId) {
        for (const [sessionId, existingPlayer] of this.state.players.entries()) {
            if (existingPlayer.playerId === pId && sessionId !== client.sessionId) {
                console.log(\`Kicking ghost connection for player \${pId} (Session: \${sessionId})\`);
                const existingClient = this.clients.find(c => c.sessionId === sessionId);
                if (existingClient) {
                    existingClient.leave(4000, "Joined from another session");
                }
                this.state.players.delete(sessionId);
                this.playerLoadedRegions.delete(sessionId);
            }
        }
    }`;

code = code.replace(target, replace);
fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
