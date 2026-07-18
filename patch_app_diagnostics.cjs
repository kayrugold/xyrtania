const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `          <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-wider border-b border-cyan-500/30 pb-2 mb-2">Diagnostics</h3>`;
const replace = `          <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-wider border-b border-cyan-500/30 pb-2 mb-2">Diagnostics</h3>
          {!isAdmin && (
            <div className="flex flex-col gap-2 mb-2 border-b border-cyan-500/30 pb-2">
              <label className="text-cyan-300 font-mono text-xs">Admin Override Secret</label>
              <input 
                type="password" 
                value={devEditSecret}
                onChange={(e) => setDevEditSecret(e.target.value)}
                placeholder="Enter secret..."
                className="bg-gray-900 border border-cyan-500/50 rounded px-2 py-1 text-xs text-cyan-400 w-full outline-none focus:border-cyan-400"
              />
            </div>
          )}`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
