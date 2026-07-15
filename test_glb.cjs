const fs = require('fs');

function checkGlb(path) {
  try {
    const buffer = fs.readFileSync(path);
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0x46546C67) {
      console.log(path, 'Invalid magic:', magic);
      return false;
    }
    const version = buffer.readUInt32LE(4);
    const length = buffer.readUInt32LE(8);
    console.log(path, 'Version:', version, 'Length:', length, 'Actual size:', buffer.length);
    if (length > buffer.length) {
      console.log(path, 'Length in header exceeds actual file size!');
      return false;
    }
    return true;
  } catch (e) {
    console.log(path, e.message);
    return false;
  }
}

checkGlb('public/assets/character/Xyrtania_Male_Prototype.glb');
checkGlb('public/assets/character/teacher_body_modular.glb');
