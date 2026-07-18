const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `          <div className="flex justify-between items-center border-b border-amber-500/30 pb-2">
            <h3 className="text-amber-400 font-mono text-sm uppercase tracking-wider">Map Editor</h3>
          </div>`;

const replace = `          <div className="flex justify-between items-center border-b border-amber-500/30 pb-2">
            <h3 className="text-amber-400 font-mono text-sm uppercase tracking-wider">Map Editor</h3>
            <button onClick={() => { setIsEditorMode(false); if (document.pointerLockElement) document.exitPointerLock(); }} className="text-gray-400 hover:text-white pointer-events-auto text-xs font-mono">Close [X]</button>
          </div>`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
