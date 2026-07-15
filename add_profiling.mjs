import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

const profUI = `
          <div className="flex justify-between"><span>Triangles:</span><span id="diag-triangles">0</span></div>
          <div className="flex justify-between"><span>CPU (ms):</span><span id="diag-cpu">0</span></div>
        </div>
`;

app = app.replace(/<div className="flex justify-between"><span>Triangles:<\/span><span id="diag-triangles">0<\/span><\/div>\n        <\/div>/, profUI);

const profCode = `
    const gameLoop = () => {
      const t0 = performance.now();
      frameId = requestAnimationFrame(gameLoop);
`;

app = app.replace(/const gameLoop = \(\) => \{\n      frameId = requestAnimationFrame\(gameLoop\);/, profCode);

const profEnd = `
      // Update diagnostics
      if (typeof document !== 'undefined') {
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
`;

app = app.replace(/\/\/ Update diagnostics[\s\S]*?\}\n      \}/, profEnd);

fs.writeFileSync('src/App.tsx', app);
