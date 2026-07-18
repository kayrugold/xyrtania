const fs = require('fs');
let code = fs.readFileSync('src/NetworkManager.ts', 'utf8');

const target = `          // 1000 is normal/consented close
          if (code !== 1000 && !this.isDisconnected) {
              const token = room.reconnectionToken || localStorage.getItem('xyrtania_reconnection_token');
              if (token) {
                  this.handleReconnection(token);
              } else {
                  this.connectToServer();
              }
          } else {`;

const replace = `          // 1000 is normal/consented close
          // 4000 is our custom code for "Joined from another session" (kicked)
          if (code !== 1000 && code !== 4000 && !this.isDisconnected) {
              const token = room.reconnectionToken || localStorage.getItem('xyrtania_reconnection_token');
              if (token) {
                  this.handleReconnection(token);
              } else {
                  this.connectToServer();
              }
          } else {
              if (code === 4000) {
                  console.warn("Disconnected because you joined from another tab/device.");
                  this.status = 'disconnected';
                  if (this.onStatusChange) this.onStatusChange(this.status);
              }`;

code = code.replace(target, replace);
fs.writeFileSync('src/NetworkManager.ts', code);
