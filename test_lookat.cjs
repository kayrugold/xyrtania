const fs = require('fs');
let code = fs.readFileSync('src/CharacterAnimator.ts', 'utf8');

// replace lookAt with a milder rotation or just remove it temporarily
code = code.replace(
    /if \(this\.lookTarget\) \{\s*if \(this\.leftEyeBone\) \{\s*this\.leftEyeBone\.lookAt\(this\.lookTarget\);\s*\}\s*if \(this\.rightEyeBone\) \{\s*this\.rightEyeBone\.lookAt\(this\.lookTarget\);\s*\}\s*\}/,
    `if (this.lookTarget) {
      // Instead of raw lookAt which might break bone orientation, let's just do a subtle rotation
      // For now, let's disable direct lookAt since it usually twists blender bones by 90 degrees
      // We can implement a proper eye tracking by rotating relative to the head bone.
      // this.leftEyeBone.lookAt(this.lookTarget);
    }`
);

fs.writeFileSync('src/CharacterAnimator.ts', code);
