import * as THREE from 'three';
import { Chunk, resolveAssetUrl } from './types';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class WorldGrid {
  private scene: THREE.Scene;
  private chunks: Map<string, Chunk> = new Map();
  private chunkSize = 40;
  private halfMapBounds = 42000; // Total conceptual bounds are 84,000 x 84,000

  // Shared geometry and material caches for the procedural assets to boost rendering speed
  public treePrototypes: { meshes: THREE.Mesh[] }[] = [];

  private sharedGeometries: {
    ground: THREE.PlaneGeometry;
    trunk: THREE.CylinderGeometry;
    foliageCones: THREE.ConeGeometry[];
    grass: THREE.ConeGeometry;
    rock: THREE.DodecahedronGeometry;
  };
  private sharedMaterials: {
    groundLight: THREE.MeshStandardMaterial;
    groundDark: THREE.MeshStandardMaterial;
    trunk: THREE.MeshStandardMaterial;
    autumnFoliage: THREE.MeshStandardMaterial[];
    grass: THREE.MeshStandardMaterial;
    rock: THREE.MeshStandardMaterial;
  };

  public async loadAssets(customUrl?: string) {
    const loader = new GLTFLoader(); loader.setCrossOrigin("");
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(dracoLoader); 
    
    // 4 tree models
    const treeFiles = customUrl ? [customUrl] : [
      resolveAssetUrl('/assets/environment/willowtree.glb'),
      resolveAssetUrl('/assets/environment/oaktree.glb'),
      resolveAssetUrl('/assets/environment/bonsaitree.glb'),
      resolveAssetUrl('/assets/environment/pinetree.glb')
    ];

    if (customUrl) {
      this.treePrototypes = [];
    }
    
    await Promise.all(treeFiles.map((url) => {
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
                  
                  // Optimize material for foliage
                  const mat = (mesh.material as THREE.Material).clone();
                  if ((mat as any).map) {
                      mat.transparent = false;
                      mat.alphaTest = 0.5;
                      mat.depthWrite = true;
                  }
                  const clonedMesh = new THREE.Mesh(geom, mat);

                  clonedMesh.castShadow = true; // Turn off shadows for huge fps boost
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
          console.error(`CRITICAL TREE LOAD ERROR ${url}:`, err);
          resolve();
        });
      });
    }));
    
    console.log("Tree prototypes loaded count:", this.treePrototypes.length);
    if (this.treePrototypes.length > 0) {
       this.clearChunks();
    }
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Initialize shared geometries
    this.sharedGeometries = {
      ground: new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 10, 10),
      trunk: new THREE.CylinderGeometry(0.3, 0.45, 3, 6),
      foliageCones: [
        new THREE.ConeGeometry(1.8, 3.5, 5),
        new THREE.ConeGeometry(1.4, 2.5, 5),
        new THREE.ConeGeometry(1.0, 1.8, 5)
      ],
      grass: new THREE.ConeGeometry(0.12, 0.6, 3),
      rock: new THREE.DodecahedronGeometry(1, 0)
    };

    // Global water plane for the lake
    const waterGeo = new THREE.PlaneGeometry(200, 200, 1, 1);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
      // side: THREE.DoubleSide
    });
    const waterPlane = new THREE.Mesh(waterGeo, waterMat);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.set(50, -0.5, 50); // Water level over the lake
    
    const isPotato = localStorage.getItem('xyrtania_quality') === 'potato';
    if (!isPotato) {
      this.scene.add(waterPlane);
    }


    // Low-poly material set representing beautiful stylized environment
    this.sharedMaterials = {
      groundLight: new THREE.MeshStandardMaterial({
        color: 0x8ab07d, // Stylized grass color
        roughness: 0.9,
        metalness: 0.05,
        flatShading: true
      }),
      groundDark: new THREE.MeshStandardMaterial({
        color: 0x7c9c70, // Alternate dark grass color for checkering tile pattern
        roughness: 0.9,
        metalness: 0.05,
        flatShading: true
      }),
      trunk: new THREE.MeshStandardMaterial({
        color: 0x6e5040, // Nice flat brown
        roughness: 0.9,
        flatShading: true
      }),
      autumnFoliage: [
        new THREE.MeshStandardMaterial({ color: 0xd96b27, roughness: 0.8, flatShading: true }), // Vibrant Autumn Orange
        new THREE.MeshStandardMaterial({ color: 0xe6a119, roughness: 0.8, flatShading: true }), // Yellow/Golden
        new THREE.MeshStandardMaterial({ color: 0xc23b22, roughness: 0.8, flatShading: true }), // Maple Red
        new THREE.MeshStandardMaterial({ color: 0x8a3324, roughness: 0.8, flatShading: true })  // Maroon
      ],
      grass: new THREE.MeshStandardMaterial({
        color: 0x9fbf7c,
        roughness: 0.9,
        flatShading: true
      }),
      rock: new THREE.MeshStandardMaterial({
        color: 0x948e89, // Warm low-poly gray
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true
      })
    };
  }

  // Generates a seed based on integers coordinates
  private getSeededSeed(cx: number, cz: number): number {
    // Elegant spatial pairing hashing function
    const x = cx + 5000;
    const y = cz + 5000;
    return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  }

  // Deterministic random generator from continuous seeds
  private seededRandom(seedValue: number, idx: number): number {
    const val = Math.sin(seedValue + idx * 87.23) * 54321.123;
    return Math.abs(val - Math.floor(val));
  }

  private lakeRadius = 40;
  
  public getGroundHeight(x: number, z: number): number {
     const dx = x - 50;
     const dz = z - 50;
     const distFromCenter = Math.sqrt(dx*dx + dz*dz);
     if (distFromCenter < this.lakeRadius) {
         // creating a deep lake off center
         const depth = Math.cos((distFromCenter / this.lakeRadius) * (Math.PI / 2));
         return -6 * depth;
     }
     return 0;
  }

  // Clamps player position vector cleanly within 84,000 boundaries
  public clampPositionToBounds(pos: THREE.Vector3): void {

    if (pos.x < -this.halfMapBounds) pos.x = -this.halfMapBounds;
    if (pos.x > this.halfMapBounds) pos.x = this.halfMapBounds;
    if (pos.z < -this.halfMapBounds) pos.z = -this.halfMapBounds;
    if (pos.z > this.halfMapBounds) pos.z = this.halfMapBounds;
  }

  // Updates chunk pooling based on current player position
  public update(playerPosition: THREE.Vector3): void {
    this.clampPositionToBounds(playerPosition);

    // Calculate active chunk coords
    const currentCx = Math.floor((playerPosition.x + this.chunkSize / 2) / this.chunkSize);
    const currentCz = Math.floor((playerPosition.z + this.chunkSize / 2) / this.chunkSize);

    const activeKeys = new Set<string>();

    // Generate surrounding 3x3 chunks
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cx = currentCx + dx;
        const cz = currentCz + dz;

        // Ensure within overall map boundaries
        const chunkXPos = cx * this.chunkSize;
        const chunkZPos = cz * this.chunkSize;
        if (Math.abs(chunkXPos) > this.halfMapBounds || Math.abs(chunkZPos) > this.halfMapBounds) {
          continue;
        }

        const key = `${cx},${cz}`;
        activeKeys.add(key);

        if (!this.chunks.has(key)) {
          this.generateChunk(cx, cz);
        }
      }
    }

    // Cull and destroy chunks outside the 3x3 visibility grid
    for (const [key, chunk] of this.chunks.entries()) {
      if (!activeKeys.has(key)) {
        this.disposeChunk(chunk);
        this.chunks.delete(key);
      }
    }
  }

  // Procedurally creates a terrain block of 40x40 size
  
  private generateChunk(cx: number, cz: number): void {
    const isPotato = localStorage.getItem('xyrtania_quality') === 'potato';

    const chunkGroup = new THREE.Group();
    chunkGroup.name = `chunk_${cx}_${cz}`;

    // Determine coordinate-based checkerboarding coloring
    const isEven = (cx + cz) % 2 === 0;
    const groundMaterial = isEven ? this.sharedMaterials.groundLight : this.sharedMaterials.groundDark;

    const chunkWorldX = cx * this.chunkSize;
    const chunkWorldZ = cz * this.chunkSize;

    // Create Ground Mesh (with vertex displacement for lakes)
    const groundGeo = isPotato ? new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 1, 1) : this.sharedGeometries.ground.clone();
    const positions = groundGeo.attributes.position;
    for (let j = 0; j < positions.count; j++) {
       // Plane is placed at chunkWorldX, chunkWorldZ, but geometry is centered at 0,0 locally
       const vx = positions.getX(j);
       const vz = positions.getY(j); // Y in plane geo is Z in world after rotation
       
       const worldX = chunkWorldX + vx;
       const worldZ = chunkWorldZ - vz; // Because plane rotation.x = -Math.PI / 2 flips the Y axis to Z
       
       const h = this.getGroundHeight(worldX, worldZ);
       positions.setZ(j, h); // Z in plane geo is Y in world
    }
    groundGeo.computeVertexNormals();

    const groundMesh = new THREE.Mesh(groundGeo, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    // Set position centered in the 40x40 boundaries
    groundMesh.position.set(chunkWorldX, 0, chunkWorldZ);
    chunkGroup.add(groundMesh);

    // Seed for procedural features in this chunk
    const baseSeed = this.getSeededSeed(cx, cz);
    const clutter: THREE.Object3D[] = [];

    // Determine obstacle density [5 to 15 assets per chunk]
    const clutterCount = isPotato ? 0 : 1;

    for (let i = 0; i < clutterCount; i++) {
      const rollType = this.seededRandom(baseSeed, i * 3 + 2);
      const randX = (this.seededRandom(baseSeed, i * 7 + 3) - 0.5) * (this.chunkSize - 4);
      const randZ = (this.seededRandom(baseSeed, i * 11 + 5) - 0.5) * (this.chunkSize - 4);

      const spawnX = chunkWorldX + randX;
      const spawnZ = chunkWorldZ + randZ;

      // Ensure objects don't spawn exactly at the origin (spawn zone safety)
      if (Math.abs(spawnX) < 4 && Math.abs(spawnZ) < 4) {
        continue;
      }
      
      const groundH = this.getGroundHeight(spawnX, spawnZ);

      if (rollType < 0.45) {
        // --- GATHER TREE TRANSFORMS ---
        if (groundH < -1.0) continue; // no trees underwater
        
        // The custom tree mesh is likely authored at a different scale, applying a multiplier
        const baseTreeScale = 1.0;
        const treeScale = (5.0 + this.seededRandom(baseSeed, i * 19) * 20.0) * baseTreeScale;
        const treeRotY = this.seededRandom(baseSeed, i * 23) * Math.PI * 2;
        
        // We will store the transforms and create an InstancedMesh at the end of the chunk generation
        if (!chunkGroup.userData.treeTransforms) {
            chunkGroup.userData.treeTransforms = [];
        }
        
        // Choose a random tree prototype if available
        const treeTypeIndex = this.treePrototypes.length > 0 ? Math.floor(this.seededRandom(baseSeed, i * 29) * this.treePrototypes.length) : 0;
        
        chunkGroup.userData.treeTransforms.push({
            position: new THREE.Vector3(spawnX, groundH, spawnZ),
            rotation: new THREE.Euler(0, treeRotY, 0),
            scale: new THREE.Vector3(treeScale, treeScale, treeScale),
            radius: 0.03 * treeScale, // Adjusted collision radius to match the visual trunk of the custom mesh
            height: 8.0 * treeScale,
            treeTypeIndex
        });

      } else if (rollType < 0.70) {
        // --- SPAWN STYLIZED ROCK MOUNDS ---
        const rockSize = 0.6 + this.seededRandom(baseSeed, i * 22) * 1.4;
        const rockMesh = new THREE.Mesh(this.sharedGeometries.rock, this.sharedMaterials.rock);
        rockMesh.position.set(spawnX, groundH + rockSize * 0.4, spawnZ);
        const scaleY = rockSize * 0.9 + this.seededRandom(baseSeed, i * 5) * 0.5;
        rockMesh.scale.set(rockSize, scaleY, rockSize);
        rockMesh.rotation.set(
          this.seededRandom(baseSeed, i * 3) * Math.PI,
          this.seededRandom(baseSeed, i * 9) * Math.PI,
          0
        );
        rockMesh.castShadow = true;
        rockMesh.receiveShadow = true;
        
        rockMesh.userData = {
          isObstacle: true,
          type: 'rock',
          radius: rockSize * 0.9,
          height: scaleY * 0.95
        };

        chunkGroup.add(rockMesh);
        clutter.push(rockMesh);

      } else {
        // --- SPAWN CLUSTERS OF GRASS CLUMPS ---
        if (groundH < -0.5) continue; // no grass under deep water
        const grassGroup = new THREE.Group();
        grassGroup.position.set(spawnX, groundH + 0.2, spawnZ);
        
        grassGroup.userData = {
          isObstacle: false
        };

        const stemsCount = 1 + Math.floor(this.seededRandom(baseSeed, i * 12) * 2);
        for (let g = 0; g < stemsCount; g++) {
          const grassStem = new THREE.Mesh(this.sharedGeometries.grass, this.sharedMaterials.grass);
          const stemGX = (this.seededRandom(baseSeed, i * 15 + g) - 0.5) * 0.8;
          const stemGZ = (this.seededRandom(baseSeed, i * 19 + g) - 0.5) * 0.8;
          grassStem.position.set(stemGX, 0.1, stemGZ);
          
          const angleX = (this.seededRandom(baseSeed, g) - 0.5) * 0.3;
          const angleZ = (this.seededRandom(baseSeed, g + 4) - 0.5) * 0.3;
          grassStem.rotation.set(angleX, this.seededRandom(baseSeed, g * 2) * Math.PI, angleZ);

          const rScaleHeight = 0.7 + this.seededRandom(baseSeed, g + 8) * 0.7;
          grassStem.scale.set(1.0, rScaleHeight, 1.0);
          grassGroup.add(grassStem);
        }

        chunkGroup.add(grassGroup);
        clutter.push(grassGroup);
      }
    }

    // Instantiate the instanced mesh for trees if we have any
    if (chunkGroup.userData.treeTransforms && chunkGroup.userData.treeTransforms.length > 0) {
        const transforms = chunkGroup.userData.treeTransforms;
        if (this.treePrototypes && this.treePrototypes.length > 0) {
            // Group by treeTypeIndex
            const groupedTransforms: Record<number, any[]> = {};
            transforms.forEach((t: any) => {
                const index = t.treeTypeIndex || 0;
                if (!groupedTransforms[index]) groupedTransforms[index] = [];
                groupedTransforms[index].push(t);
            });
            
            for (const [indexStr, tGroup] of Object.entries(groupedTransforms)) {
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
            }
        } else {
            // FALLBACK PROCEDURAL TREES (Cylinder trunk + stacked cones)
            transforms.forEach((t) => {
                const treeGroup = new THREE.Group();
                treeGroup.position.copy(t.position);
                treeGroup.rotation.copy(t.rotation);
                
                // Scale is based on baseTreeScale = 10.0. Scale down to human proportions
                const s = t.scale.x * 0.12;
                treeGroup.scale.set(s, s, s);
                
                // 1. Create Trunk
                const trunkMesh = new THREE.Mesh(this.sharedGeometries.trunk, this.sharedMaterials.trunk);
                trunkMesh.position.y = 1.5; // half height of CylinderGeometry(0.3, 0.45, 3)
                trunkMesh.castShadow = true;
                trunkMesh.receiveShadow = true;
                treeGroup.add(trunkMesh);
                
                // 2. Select a stable random foliage material from the autumn list
                const colorIndex = Math.abs(Math.floor(t.position.x * 17 + t.position.z * 23)) % this.sharedMaterials.autumnFoliage.length;
                const foliageMat = this.sharedMaterials.autumnFoliage[colorIndex];
                
                // 3. Create Stacked Foliage Cones
                const yOffsets = [3.8, 5.3, 6.5];
                this.sharedGeometries.foliageCones.forEach((coneGeo, idx) => {
                    const coneMesh = new THREE.Mesh(coneGeo, foliageMat);
                    coneMesh.position.y = yOffsets[idx];
                    coneMesh.castShadow = true;
                    coneMesh.receiveShadow = true;
                    treeGroup.add(coneMesh);
                });
                
                chunkGroup.add(treeGroup);
                
                // Add logical collision object to clutter
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
        }
    }

    this.scene.add(chunkGroup);
    this.chunks.set(`${cx},${cz}`, {
      cx,
      cz,
      group: chunkGroup,
      terrainMesh: groundMesh,
      clutterMeshes: clutter
    });
  }

  // Traverse, dispose, and delete unneeded chunks to keep memory usage flat
  private disposeChunk(chunk: Chunk): void {
    this.scene.remove(chunk.group);

    // Recursively dispose geometries and materials inside the chunk group
    chunk.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Do NOT dispose shared geometries or materials directly from the caches,
        // unless you're tearing down the entire app, because other chunks rely on them.
        // We only detach the mesh, Three.js handles parent collection cleanup.
      }
    });

    chunk.clutterMeshes.length = 0;
  }

  // Full teardown during app unmounting
  public disposeAll(): void {
    for (const chunk of this.chunks.values()) {
      this.disposeChunk(chunk);
    }
    this.chunks.clear();

    // Dispose all cached geometries
    Object.values(this.sharedGeometries).forEach((geom) => {
      if (Array.isArray(geom)) {
        geom.forEach((g) => g.dispose());
      } else {
        geom.dispose();
      }
    });

    // Dispose cached materials
    Object.values(this.sharedMaterials).forEach((mat) => {
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat.dispose();
      }
    });
  }

  public rebuildWorld(): void {
    this.treePrototypes = []; // Reset mesh to reload properly
    this.clearChunks();
  }

  public clearChunks(): void {
    for (const chunk of this.chunks.values()) {
      this.disposeChunk(chunk);
    }
    this.chunks.clear();
  }

  // Get current active chunks (for custom collision or positioning checks if needed)
  public getActiveChunks(): Map<string, Chunk> {
    return this.chunks;
  }
}
