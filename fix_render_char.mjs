import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(/animator\.lookTarget = camera\.position;\n\s*animator\.update\(state, dt\);/, "animator.group.visible = !hideCharacterRef.current;\n      if (!hideCharacterRef.current) {\n        animator.lookTarget = camera.position;\n        animator.update(state, dt);\n      }");

fs.writeFileSync('src/App.tsx', app);
