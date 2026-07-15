const fs = require('fs');
const files = ['public/assets/environment/willowtree.glb', 'public/assets/environment/oaktree.glb', 'public/assets/environment/bonsaitree.glb', 'public/assets/environment/pinetree.glb'];
for (const file of files) {
  try {
    const buffer = fs.readFileSync(file);
    const magic = buffer.toString('utf8', 0, 4);
    const version = buffer.readUInt32LE(4);
    const length = buffer.readUInt32LE(8);
    console.log(`${file}: Magic: ${magic}, Version: ${version}, Length: ${length}, Actual Size: ${buffer.length}`);
  } catch (err) {
    console.error(`Error reading ${file}: ${err}`);
  }
}
