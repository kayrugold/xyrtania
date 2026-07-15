import fs from 'fs';

let appCode = fs.readFileSync('src/App.tsx', 'utf-8');
// Fix mouse sensitivity
appCode = appCode.replace(/cameraYaw -= e\.movementX \* 0\.002;/g, 'cameraYaw -= e.movementX * 0.008;');
appCode = appCode.replace(/cameraPitch = Math\.max\(-1\.5, Math\.min\(1\.4, cameraPitch \+ e\.movementY \* 0\.002\)\);/g, 'cameraPitch = Math.max(-1.5, Math.min(1.4, cameraPitch + e.movementY * 0.006));');

// Fix camera lerp speed to reduce rubber-banding zoom
appCode = appCode.replace(/camera\.position\.lerp\(targetCamPos, dt \* 6\.5\);/g, 'camera.position.lerp(targetCamPos, dt * 25.0);');

fs.writeFileSync('src/App.tsx', appCode);

let gridCode = fs.readFileSync('src/WorldGrid.ts', 'utf-8');

gridCode = gridCode.replace(
  /public treePrototypes: THREE\.Mesh\[\] = \[\];/g,
  'public treePrototypes: { meshes: THREE.Mesh[] }[] = [];'
);

// We need to replace the loadAssets logic carefully
const loadAssetsRegex = /await Promise\.all\(treeFiles\.map\(\(url\) => \{[\s\S]*?\}\)\);/m;
const loadAssetsReplacement = `await Promise.all(treeFiles.map((url) => {
      return new Promise<void>((resolve) => {
        loader.load(url, (gltf) => {
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
          resolve();
        }, undefined, (err) => {
          console.warn(\`Failed to load tree prototype \${url}.\`, err);
          resolve();
        });
      });
    }));`;

gridCode = gridCode.replace(loadAssetsRegex, loadAssetsReplacement);

const instancedTreeRegex = /for \(const \[indexStr, tGroup\] of Object\.entries\(groupedTransforms\)\) \{[\s\S]*?instancedTree\.instanceMatrix\.needsUpdate = true;\s*chunkGroup\.add\(instancedTree\);\s*\}/m;

const instancedTreeReplacement = `for (const [indexStr, tGroup] of Object.entries(groupedTransforms)) {
                const index = parseInt(indexStr);
                const proto = this.treePrototypes[index % this.treePrototypes.length];
                
                // Add an InstancedMesh for EVERY sub-mesh in the tree prototype
                proto.meshes.forEach((protoMesh) => {
                    const instancedTree = new THREE.InstancedMesh(
                        protoMesh.geometry,
                        protoMesh.material,
                        tGroup.length
                    );
                    instancedTree.castShadow = true;
                    instancedTree.receiveShadow = true;
                    
                    const dummy = new THREE.Object3D();
                    tGroup.forEach((t: any, i: number) => {
                        dummy.position.copy(t.position);
                        dummy.rotation.copy(t.rotation);
                        dummy.scale.copy(t.scale);
                        dummy.updateMatrix();
                        instancedTree.setMatrixAt(i, dummy.matrix);
                    });
                    instancedTree.instanceMatrix.needsUpdate = true;
                    chunkGroup.add(instancedTree);
                });

                // Add logic objects for collision just once per tree group
                tGroup.forEach((t: any) => {
                    const logicObj = new THREE.Object3D();
                    logicObj.position.copy(t.position);
                    logicObj.userData = {
                        isObstacle: true,
                        type: 'tree',
                        radius: t.radius,
                        height: t.height
                    };
                    clutter.push(logicObj);
                });
            }`;

gridCode = gridCode.replace(instancedTreeRegex, instancedTreeReplacement);
fs.writeFileSync('src/WorldGrid.ts', gridCode);
console.log('Patched App.tsx and WorldGrid.ts successfully.');
