import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(/setHealth\(Math\.round\(state\.health\)\);\n\s*setStamina\(Math\.round\(currentStamina\)\);\n\s*setPx\(state\.position\.x\);\n\s*setPz\(state\.position\.z\);\n\s*setJumpPhase\(state\.jumpPhase\);/, "if (showDiagnosticsRef.current) {\n          setPx(state.position.x);\n          setPz(state.position.z);\n        }");

app = app.replace(/const currentCx = Math\.floor\(\(state\.position\.x \+ worldGrid\.chunkSize \/ 2\) \/ worldGrid\.chunkSize\);\n\s*const currentCz = Math\.floor\(\(state\.position\.z \+ worldGrid\.chunkSize \/ 2\) \/ worldGrid\.chunkSize\);\n\s*setChunkCx\(currentCx\);\n\s*setChunkCz\(currentCz\);/, "if (showDiagnosticsRef.current) {\n          const currentCx = Math.floor((state.position.x + worldGrid.chunkSize / 2) / worldGrid.chunkSize);\n          const currentCz = Math.floor((state.position.z + worldGrid.chunkSize / 2) / worldGrid.chunkSize);\n          setChunkCx(currentCx);\n          setChunkCz(currentCz);\n        }");

fs.writeFileSync('src/App.tsx', app);
