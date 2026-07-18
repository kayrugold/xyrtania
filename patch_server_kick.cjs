const fs = require('fs');
let code = fs.readFileSync('server/rooms/XyrtaniaRoom.ts', 'utf8');

const target = `                const existingClient = this.clients.find(c => c.sessionId === sessionId);
                if (existingClient) {
                    existingClient.leave(4000, "Joined from another session");
                }
                this.state.players.delete(sessionId);
                this.playerLoadedRegions.delete(sessionId);`;

const replace = `                const existingClient = this.clients.find(c => c.sessionId === sessionId);
                if (existingClient) {
                    existingClient.leave(4000, "Joined from another session");
                } else {
                    // If client object isn't found for some reason, clean up manually
                    this.state.players.delete(sessionId);
                    this.playerLoadedRegions.delete(sessionId);
                }`;

code = code.replace(target, replace);
fs.writeFileSync('server/rooms/XyrtaniaRoom.ts', code);
