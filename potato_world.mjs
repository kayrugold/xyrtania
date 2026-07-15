import fs from 'fs';
let world = fs.readFileSync('src/WorldGrid.ts', 'utf-8');

// Inside generateChunk, if global graphics quality is potato, skip trees and grass and use flat plane.
// We can check it via localStorage.

const addCheck = `
  private generateChunk(cx: number, cz: number): void {
    const isPotato = localStorage.getItem('xyrtania_quality') === 'potato';
`;

world = world.replace(/private generateChunk\(cx: number, cz: number\): void \{/, addCheck);

const planeCheck = `const groundGeo = isPotato ? new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 1, 1) : this.sharedGeometries.ground.clone();`;
world = world.replace(/const groundGeo = this\.sharedGeometries\.ground\.clone\(\);/, planeCheck);

const clutterCheck = `const clutterCount = isPotato ? 0 : 1;`;
world = world.replace(/const clutterCount = 1;/, clutterCheck);

const treesCheck = `if (isPotato) return; // Skip trees in potato mode
    
    // (B) GENERATE TREES`;
world = world.replace(/\/\/ \(B\) GENERATE TREES/, treesCheck);

fs.writeFileSync('src/WorldGrid.ts', world);
