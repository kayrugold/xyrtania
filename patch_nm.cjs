const fs = require('fs');
let code = fs.readFileSync('src/NetworkManager.ts', 'utf8');

code = code.replace(
`      if (this.isDisconnected) {
          room.leave();
          this.status = 'disconnected';`,
`      if (this.isDisconnected) {
          try {
              if (room.connection) room.connection.close();
          } catch(e) {}
          room.leave();
          this.status = 'disconnected';`
);

code = code.replace(
`  public disconnect() {
      this.isDisconnected = true;
      if (this.room) {
          this.room.leave();
          this.room = undefined;
      }`,
`  public disconnect() {
      this.isDisconnected = true;
      if (this.room) {
          try {
              if (this.room.connection) this.room.connection.close();
          } catch(e) {}
          this.room.leave();
          this.room = undefined;
      }`
);

fs.writeFileSync('src/NetworkManager.ts', code);
