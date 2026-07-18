const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let target = `        {(isAdmin || devEditSecret !== '') && (`;
let replace = `        {(isAdmin || connectionMode === 'p2p') && (`;
code = code.replace(target, replace);

target = `              <input 
                type="password" 
                value={devEditSecret}
                onChange={(e) => setDevEditSecret(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
                placeholder="Enter secret..."
                className="bg-gray-900 border border-cyan-500/50 rounded px-2 py-1 text-xs text-cyan-400 w-full outline-none focus:border-cyan-400 pointer-events-auto"
              />`;
replace = `              <input 
                type="password" 
                value={devEditSecret}
                onChange={(e) => setDevEditSecret(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    if (networkManagerRef.current) {
                      networkManagerRef.current.verifyAdminSecret(devEditSecret);
                    }
                  }
                }}
                onKeyUp={(e) => e.stopPropagation()}
                placeholder="Enter secret (Press Enter)..."
                className="bg-gray-900 border border-cyan-500/50 rounded px-2 py-1 text-xs text-cyan-400 w-full outline-none focus:border-cyan-400 pointer-events-auto"
              />`;
code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
