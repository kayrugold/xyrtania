const fs = require('fs');
let code = fs.readFileSync('src/NetworkManager.ts', 'utf8');

const target = `    // Support upgrading old 'colyseus' string if it is stored in localStorage
    if (savedMode as any === 'colyseus' || savedMode as any === 'colyseus_render' || savedMode as any === 'p2p') {
      savedMode = 'colyseus_local';
      localStorage.setItem('xyrtania_connection_mode', 'colyseus_local');
    }`;

const replace = `    // Force upgrade to colyseus_local so users get the latest ghost-sweeping fixes and terrain updates
    if (savedMode as any === 'colyseus' || savedMode as any === 'colyseus_render' || savedMode as any === 'p2p') {
      savedMode = 'colyseus_local';
      localStorage.setItem('xyrtania_connection_mode', 'colyseus_local');
    }
    savedMode = 'colyseus_local'; // Force it
    this.connectionMode = 'colyseus_local';`;

code = code.replace(target, replace);
fs.writeFileSync('src/NetworkManager.ts', code);
