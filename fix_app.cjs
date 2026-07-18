const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `          MAP EDITOR
        </button>
        )}
        <button
          onClick={() => setShowCustomizer(!showCustomizer)}`;
const replace = `          MAP EDITOR
        </button>
        )}
        <button
          onClick={() => setShowCustomizer(!showCustomizer)}`;
// Wait, is it `)}` or something else? Let's print out lines 2530 to 2560

fs.writeFileSync('src/App.tsx', code);
