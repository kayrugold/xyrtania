const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `editorCameraTargetRef.current.x -= (Math.cos(editorCameraYaw) * mx + Math.sin(editorCameraYaw) * my) * panSpeed;
           editorCameraTargetRef.current.z -= (-Math.sin(editorCameraYaw) * mx + Math.cos(editorCameraYaw) * my) * panSpeed;`;

// wait, this is correct for mouse too.

