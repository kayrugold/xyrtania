import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const diagUI = `
      {showDiagnostics && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur border border-cyan-500/50 p-4 rounded text-cyan-400 font-mono text-[10px] z-[90] min-w-[200px] pointer-events-none">
          <h3 className="text-center font-bold mb-2 border-b border-cyan-500/30 pb-1">DIAGNOSTICS</h3>
          <div className="flex justify-between"><span>FPS:</span><span>{fps.toFixed(1)}</span></div>
          <div className="flex justify-between"><span>Pos:</span><span>X:{px.toFixed(1)} Z:{pz.toFixed(1)}</span></div>
          <div className="flex justify-between"><span>Chunk:</span><span>{chunkCx}, {chunkCz}</span></div>
          <div className="flex justify-between"><span>Draw Calls:</span><span id="diag-drawcalls">0</span></div>
          <div className="flex justify-between"><span>Triangles:</span><span id="diag-triangles">0</span></div>
        </div>
      )}
`;

code = code.replace(/\{\/\* Main Viewport Content - WebGL Canvas inside the underlaid layout \*\/\}/g, diagUI + '\n      {/* Main Viewport Content - WebGL Canvas inside the underlaid layout */}');

fs.writeFileSync('src/App.tsx', code);
