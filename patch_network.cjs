const fs = require('fs');
let code = fs.readFileSync('src/NetworkManager.ts', 'utf8');

const replacement = `
      const joinOptions = {
          displayName: initialDisplayName,
          avatarId: initialAvatarId,
          playerId: session.playerId
      };

      const tryJoin = async () => {
          try {
              return await this.client.joinOrCreate("xyrtania_room", joinOptions);
          } catch (e) {
              if (e.message && e.message.includes("seat reservation expired")) {
                  console.log("Seat reservation expired, retrying join...");
                  return await this.client.joinOrCreate("xyrtania_room", joinOptions);
              }
              throw e;
          }
      };

      let room: Room;
      if (savedToken) {
        try {
          console.log(\`Attempting silent reconnect using stored reconnection token...\`);
          room = await this.client.reconnect(savedToken);
          console.log("Successfully reconnected using stored session credentials!");
        } catch (reconnectErr) {
          console.warn("Silent reconnection failed, falling back to join or create:", reconnectErr);
          room = await tryJoin();
        }
      } else {
        room = await tryJoin();
      }
`;

code = code.replace(/let room: Room;[\s\S]*?\}\s*else\s*\{[\s\S]*?\}\s*if \(this\.isDisconnected\)/g, replacement.trim() + "\n\n      if (this.isDisconnected)");
fs.writeFileSync('src/NetworkManager.ts', code);
