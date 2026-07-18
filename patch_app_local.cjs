const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const [connectionMode, setConnectionMode] = useState<'colyseus_render' | 'colyseus_local' | 'p2p'>(() => {
    let saved = localStorage.getItem('xyrtania_connection_mode') as 'colyseus_render' | 'colyseus_local' | 'p2p' | 'colyseus';
    if (saved === 'colyseus' || saved === 'colyseus_render' || saved === 'p2p') {
      saved = 'colyseus_local';
      localStorage.setItem('xyrtania_connection_mode', 'colyseus_local');
    }
    return saved || 'colyseus_local';
  });`;

const replace = `  const [connectionMode, setConnectionMode] = useState<'colyseus_render' | 'colyseus_local' | 'p2p'>(() => {
    let saved = localStorage.getItem('xyrtania_connection_mode') as 'colyseus_render' | 'colyseus_local' | 'p2p' | 'colyseus';
    if (saved === 'colyseus' || saved === 'colyseus_render' || saved === 'p2p') {
      saved = 'colyseus_local';
      localStorage.setItem('xyrtania_connection_mode', 'colyseus_local');
    }
    return 'colyseus_local'; // Always default to local workspace server to ensure latest fixes apply
  });`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
