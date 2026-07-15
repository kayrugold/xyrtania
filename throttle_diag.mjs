import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

const diagUpdateCode = `
      // Update diagnostics
      if (typeof document !== 'undefined') {
        if (!window.lastDiagUpdate || currentTime - window.lastDiagUpdate > 250) {
          window.lastDiagUpdate = currentTime;
          const diagDrawCalls = document.getElementById('diag-drawcalls');
          const diagTriangles = document.getElementById('diag-triangles');
          const diagCpu = document.getElementById('diag-cpu');
          if (diagDrawCalls && diagTriangles) {
            diagDrawCalls.innerText = totalCalls.toString();
            diagTriangles.innerText = totalTriangles.toString();
          }
          if (diagCpu) {
            diagCpu.innerText = (performance.now() - t0).toFixed(1);
          }
        }
      }
`;

app = app.replace(/\/\/ Update diagnostics[\s\S]*?\}\n      \}/, diagUpdateCode);
fs.writeFileSync('src/App.tsx', app);
