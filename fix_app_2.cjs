const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(`        <button
          onClick={() => {
              const newMode = !isEditorMode;`, `        {(isAdmin || devEditSecret !== '') && (
        <button
          onClick={() => {
              const newMode = !isEditorMode;`);

code = code.replace(`          MAP EDITOR
        </button>
        )}
        <button
          onClick={() => setShowCustomizer(!showCustomizer)}`, `          MAP EDITOR
        </button>
        )}
        <button
          onClick={() => setShowCustomizer(!showCustomizer)}`);
          
fs.writeFileSync('src/App.tsx', code);
