import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const replaceStr = `      // PASS 1: Render 3D World (Main scene)
      renderer.render(scene, camera);
      let totalCalls = renderer.info.render.calls;
      let totalTriangles = renderer.info.render.triangles;

      // PASS 2: Render our canvas-primitives HUD overlays on top of the 3D main viewport
      renderer.clearDepth();
      renderer.render(hudScene, hudCamera);
      totalCalls += renderer.info.render.calls;
      totalTriangles += renderer.info.render.triangles;

      // Update diagnostics
      if (typeof document !== 'undefined') {
        const diagDrawCalls = document.getElementById('diag-drawcalls');
        const diagTriangles = document.getElementById('diag-triangles');
        if (diagDrawCalls && diagTriangles) {
          diagDrawCalls.innerText = totalCalls.toString();
          diagTriangles.innerText = totalTriangles.toString();
        }
      }`;

code = code.replace(/\/\/ PASS 1: Render 3D World \(Main scene\)[\s\S]*?\}\n      \}/, replaceStr);

fs.writeFileSync('src/App.tsx', code);
