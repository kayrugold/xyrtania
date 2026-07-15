import fs from 'fs';
let code = fs.readFileSync('src/WorldGrid.ts', 'utf-8');

// Replace the tree loading second pass to force material properties
const search = `const clonedMesh = new THREE.Mesh(geom, mesh.material);`;
const replace = `
                  // Optimize material for foliage
                  const mat = (mesh.material as THREE.Material).clone();
                  if ((mat as any).map) {
                      mat.transparent = false;
                      mat.alphaTest = 0.5;
                      mat.depthWrite = true;
                  }
                  const clonedMesh = new THREE.Mesh(geom, mat);
`;

code = code.replace(search, replace);

fs.writeFileSync('src/WorldGrid.ts', code);
