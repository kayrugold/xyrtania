import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/camera\.position\.copy\(targetCamPos\);/g, 'camera.position.lerp(targetCamPos, dt * 10.0);');

const keyboardMoveRegex = /const camForward = new THREE\.Vector3\(0, 0, -1\)\.applyQuaternion\(camera\.quaternion\);[\s\S]*?const camRight = new THREE\.Vector3\(1, 0, 0\)\.applyQuaternion\(camera\.quaternion\);[\s\S]*?camRight\.normalize\(\);/m;
const keyboardMoveReplacement = `const camForward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw)).normalize();
        const camRight = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw)).normalize();`;

code = code.replace(keyboardMoveRegex, keyboardMoveReplacement);

fs.writeFileSync('src/App.tsx', code);
