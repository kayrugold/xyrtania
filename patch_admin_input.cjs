const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `            <input 
              type="password" 
              value={devEditSecret}
              onChange={(e) => setDevEditSecret(e.target.value)}
              placeholder="Leave blank if admin..."
              className="bg-gray-900 border border-amber-500/50 rounded px-2 py-1 text-xs text-amber-400 w-full outline-none focus:border-amber-400"
            />`;

const replace = `            <input 
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
              placeholder="Enter secret and press Enter..."
              className="bg-gray-900 border border-amber-500/50 rounded px-2 py-1 text-xs text-amber-400 w-full outline-none focus:border-amber-400 pointer-events-auto"
            />`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
