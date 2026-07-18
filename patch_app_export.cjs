const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `        {(isAdmin || connectionMode === 'p2p') && (
        <button
          onClick={() => {`;
const replace = `        {(isAdmin || connectionMode === 'p2p') && (
        <>
        <button
          onClick={() => {
              if (worldGridRef.current) {
                  const data = Array.from(worldGridRef.current.heightData.entries()).map(([k, v]) => {
                      const [x, z] = k.split('_');
                      const color = worldGridRef.current?.colorData.get(k);
                      return { vx: parseFloat(x), vz: parseFloat(z), h: v, c: color };
                  });
                  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'terrain_data.json';
                  a.click();
                  URL.revokeObjectURL(url);
              }
          }}
          className="bg-black/60 border border-green-500/30 text-green-400 px-3 py-2 rounded hover:bg-black/80 hover:border-green-400 transition-colors backdrop-blur pointer-events-auto flex items-center justify-center font-mono text-xs tracking-wider"
          title="Download current terrain modifications"
        >
          EXPORT
        </button>
        <button
          onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                      const reader = new FileReader();
                      reader.onload = (re) => {
                          try {
                              const parsed = JSON.parse(re.target?.result as string);
                              if (Array.isArray(parsed) && worldGridRef.current) {
                                  worldGridRef.current.applyEdits(parsed);
                                  if (networkManagerRef.current) {
                                      networkManagerRef.current.sendTerrainEdit(devEditSecretRef.current || "", parsed);
                                  }
                              }
                          } catch (err) {
                              alert("Invalid terrain file");
                          }
                      };
                      reader.readAsText(file);
                  }
              };
              input.click();
          }}
          className="bg-black/60 border border-blue-500/30 text-blue-400 px-3 py-2 rounded hover:bg-black/80 hover:border-blue-400 transition-colors backdrop-blur pointer-events-auto flex items-center justify-center font-mono text-xs tracking-wider"
          title="Upload terrain modifications"
        >
          IMPORT
        </button>
        <button
          onClick={() => {`;
code = code.replace(target, replace);

const target2 = `          MAP EDITOR
        </button>
        )}`;
const replace2 = `          MAP EDITOR
        </button>
        </>
        )}`;
code = code.replace(target2, replace2);

fs.writeFileSync('src/App.tsx', code);
