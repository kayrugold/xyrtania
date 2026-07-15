import fs from 'fs';

let gridCode = fs.readFileSync('src/WorldGrid.ts', 'utf-8');
const loadAssetsRegex = /await Promise\.all\(treeFiles\.map\(\(url\) => \{[\s\S]*?\}\)\);/m;
const loadAssetsReplacement = `await Promise.all(treeFiles.map((url) => {
      return new Promise<void>((resolve) => {
        loader.load(url, (gltf) => {
          try {
              gltf.scene.updateMatrixWorld(true);
              const treeMeshes: THREE.Mesh[] = [];
              gltf.scene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh;
                  mesh.castShadow = true;
                  mesh.receiveShadow = true;
                  const geom = mesh.geometry.clone();
                  geom.applyMatrix4(mesh.matrixWorld);
                  geom.computeBoundingBox();
                  const clonedMesh = new THREE.Mesh(geom, mesh.material);
                  clonedMesh.castShadow = true;
                  clonedMesh.receiveShadow = true;
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
gridCode = gridCode.replace(loadAssetsRegex, loadAssetsReplacement);

// Fix tree scale logic:
gridCode = gridCode.replace(/const baseTreeScale = 10\.0;/g, 'const baseTreeScale = 1.0;');
gridCode = gridCode.replace(/const treeScale = \(0\.75 \+ this\.seededRandom\(baseSeed, i \* 19\) \* 0\.5\) \* baseTreeScale;/g, 
  'const treeScale = (0.5 + this.seededRandom(baseSeed, i * 19) * 2.5) * baseTreeScale;');

fs.writeFileSync('src/WorldGrid.ts', gridCode);

let appCode = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix camera lerp to remove jitter but stay smooth
appCode = appCode.replace(/camera\.position\.lerp\(targetCamPos, dt \* 25\.0\);/g, 'camera.position.copy(targetCamPos);');

// Decouple moveVec from camera.quaternion to stop feedback loop jitter!
const moveVecRegex = /const camForward = new THREE\.Vector3\(0, 0, -1\)\.applyQuaternion\(camera\.quaternion\);[\s\S]*?const camRight = new THREE\.Vector3\(1, 0, 0\)\.applyQuaternion\(camera\.quaternion\);[\s\S]*?camRight\.normalize\(\);/m;
const moveVecReplacement = `const camForward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw)).normalize();
        const camRight = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw)).normalize();`;
appCode = appCode.replace(moveVecRegex, moveVecReplacement);

fs.writeFileSync('src/App.tsx', appCode);

console.log("Patched trees robustness, scale, and camera jitter.");
