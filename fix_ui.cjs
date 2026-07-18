const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<div className="mt-2 text-xs text-amber-500/70 font-mono leading-tight">
            Click & drag to edit terrain. Use WASD to pan camera.
          </div>`;

const replacement = `<div className="flex flex-col gap-2">
            <label className="text-amber-300 font-mono text-xs">Admin Override Secret</label>
            <input 
              type="password" 
              value={devEditSecret}
              onChange={(e) => setDevEditSecret(e.target.value)}
              placeholder="Leave blank if admin..."
              className="bg-gray-900 border border-amber-500/50 rounded px-2 py-1 text-xs text-amber-400 w-full outline-none focus:border-amber-400"
            />
          </div>
          
          <div className="mt-2 text-xs text-amber-500/70 font-mono leading-tight">
            Click & drag to edit terrain. Use WASD to pan camera.
          </div>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
