import fs from 'fs';
let code = fs.readFileSync('src/WorldGrid.ts', 'utf-8');

const loadAssetsRegex = /await Promise\.all\(treeFiles\.map\(\(url\) => \{[\s\S]*?\}\)\);/m;
const loadAssetsReplacement = `await Promise.all(treeFiles.map((url) => {
      return new Promise<void>((resolve) => {
        loader.load(url, (gltf) => {
          try {
              gltf.scene.updateMatrixWorld(true);
              const treeMeshes: THREE.Mesh[] = [];
              let minY = Infinity;

              // First pass: find the minimum Y
              gltf.scene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh;
                  const geom = mesh.geometry.clone();
                  geom.applyMatrix4(mesh.matrixWorld);
                  geom.computeBoundingBox();
                  if (geom.boundingBox && geom.boundingBox.min.y < minY) {
                      minY = geom.boundingBox.min.y;
                  }
                }
              });

              // Second pass: clone, translate by -minY so bottom is at 0, and save
              gltf.scene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh;
                  const geom = mesh.geometry.clone();
                  geom.applyMatrix4(mesh.matrixWorld);
                  if (minY !== Infinity) {
                      geom.translate(0, -minY, 0);
                  }
                  geom.computeBoundingBox();
                  const clonedMesh = new THREE.Mesh(geom, mesh.material);
                  clonedMesh.castShadow = false; // Turn off shadows for huge fps boost
                  clonedMesh.receiveShadow = false;
                  treeMeshes.push(clonedMesh);
                }
              });
              
              if (treeMeshes.length > 0) {
                this.treePrototypes.push({ meshes: treeMeshes });
              }
          } catch(e) {
              console.error("Error processing tree gltf", e);
          }
          resolve();
        }, undefined, (err) => {
          console.error(\`CRITICAL TREE LOAD ERROR \${url}:\`, err);
          resolve();
        });
      });
    }));`;

code = code.replace(loadAssetsRegex, loadAssetsReplacement);

// Instanced tree shadows off
code = code.replace(/instancedTree\.castShadow = true;/g, 'instancedTree.castShadow = false;');
code = code.replace(/instancedTree\.receiveShadow = true;/g, 'instancedTree.receiveShadow = false;');

// Increase size dramatically
code = code.replace(/const treeScale = \(1\.5 \+ this\.seededRandom\(baseSeed, i \* 19\) \* 4\.5\) \* baseTreeScale;/g,
  'const treeScale = (5.0 + this.seededRandom(baseSeed, i * 19) * 20.0) * baseTreeScale;');

fs.writeFileSync('src/WorldGrid.ts', code);
