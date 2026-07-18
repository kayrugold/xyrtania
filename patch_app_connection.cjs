const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const handleConnectionModeChange = (mode: 'colyseus_render' | 'colyseus_local' | 'p2p') => {
    setConnectionMode(mode);
    if (networkManagerRef.current) {
      networkManagerRef.current.setConnectionMode(mode);
    }
  };`;
const replace = `  const handleConnectionModeChange = (mode: 'colyseus_render' | 'colyseus_local' | 'p2p') => {
    setConnectionMode(mode);
    if (networkManagerRef.current) {
      networkManagerRef.current.setConnectionMode(mode);
    }
    if (worldGridRef.current) {
      worldGridRef.current.heightData.clear();
      worldGridRef.current.colorData.clear();
      worldGridRef.current.clearChunks();
    }
  };`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
