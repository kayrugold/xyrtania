import fs from 'fs';
let world = fs.readFileSync('src/WorldGrid.ts', 'utf-8');

const waterCheck = `
    const isPotato = localStorage.getItem('xyrtania_quality') === 'potato';
    if (!isPotato) {
      this.scene.add(waterPlane);
    }
`;
world = world.replace(/this\.scene\.add\(waterPlane\);/, waterCheck);
fs.writeFileSync('src/WorldGrid.ts', world);
