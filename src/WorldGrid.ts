import * as THREE from 'three';
import { Chunk } from './types';

export class WorldGrid {
  private scene: THREE.Scene;
  private chunks: Map<string, Chunk> = new Map();
  private chunkSize = 40;
  private halfMapBounds = 42000; // Total conceptual bounds are 84,000 x 84,000

  // Shared geometry and material caches for the procedural assets to boost rendering speed
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
    const waterGeo = new THREE.PlaneGeometry(100, 100);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const waterPlane = new THREE.Mesh(waterGeo, waterMat);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.set(50, -0.5, 50); // Water level over the lake
    this.scene.add(waterPlane);

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
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `chunk_${cx}_${cz}`;

    // Determine coordinate-based checkerboarding coloring
    const isEven = (cx + cz) % 2 === 0;
    const groundMaterial = isEven ? this.sharedMaterials.groundLight : this.sharedMaterials.groundDark;

    const chunkWorldX = cx * this.chunkSize;
    const chunkWorldZ = cz * this.chunkSize;

    // Create Ground Mesh (with vertex displacement for lakes)
    const groundGeo = this.sharedGeometries.ground.clone();
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
    const clutterCount = 6 + Math.floor(this.seededRandom(baseSeed, 1) * 12);

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
        // --- SPAWN PROCEDURAL AUTUMN TREE ---
        if (groundH < -1.0) continue; // no trees underwater
        const treeGroup = new THREE.Group();
        treeGroup.position.set(spawnX, groundH, spawnZ);

        // Trunk
        const trunkMesh = new THREE.Mesh(this.sharedGeometries.trunk, this.sharedMaterials.trunk);
        trunkMesh.position.y = 1.5;
        trunkMesh.castShadow = true;
        trunkMesh.receiveShadow = true;
        treeGroup.add(trunkMesh);

        // Leaves / Foliage cones (cone-layered effect)
        const foliageStyleIdx = Math.floor(this.seededRandom(baseSeed, i * 14 + 1) * this.sharedMaterials.autumnFoliage.length);
        const leafMaterial = this.sharedMaterials.autumnFoliage[foliageStyleIdx];

        // Layer 1: Bottom Foliage cone
        const f1 = new THREE.Mesh(this.sharedGeometries.foliageCones[0], leafMaterial);
        f1.position.y = 3.2;
        f1.castShadow = true;
        treeGroup.add(f1);

        // Layer 2: Mid Foliage cone
        const f2 = new THREE.Mesh(this.sharedGeometries.foliageCones[1], leafMaterial);
        f2.position.y = 4.7;
        f2.castShadow = true;
        treeGroup.add(f2);

        // Layer 3: Top Foliage cone
        const f3 = new THREE.Mesh(this.sharedGeometries.foliageCones[2], leafMaterial);
        f3.position.y = 5.8;
        f3.castShadow = true;
        treeGroup.add(f3);

        // Subtle random scaling
        const treeScale = 0.75 + this.seededRandom(baseSeed, i * 19) * 0.5;
        treeGroup.scale.set(treeScale, treeScale, treeScale);
        
        treeGroup.userData = {
          isObstacle: true,
          type: 'tree',
          radius: 0.4 * treeScale,
          height: 8.0 * treeScale
        };

        chunkGroup.add(treeGroup);
        clutter.push(treeGroup);

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

        const stemsCount = 3 + Math.floor(this.seededRandom(baseSeed, i * 12) * 4);
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

  // Get current active chunks (for custom collision or positioning checks if needed)
  public getActiveChunks(): Map<string, Chunk> {
    return this.chunks;
  }
}
