const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `        // Interpolate visual positions smoothly
        remAnim.group.position.lerp(peer.state.position, dt * 10);`;
const replace = `        // Adjust remote player Y locally if their client is inactive (e.g. background tab)
        const pFloorH = worldGrid.getGroundHeight(peer.state.position.x, peer.state.position.z);
        const swimLevel = -0.5 - (remAnim.targetHeight * 0.7 || 1.5);
        const expectedY = Math.max(pFloorH, swimLevel);
        const isJumping = peer.state.animationState && (peer.state.animationState.toLowerCase().includes('jump') || peer.state.animationState.toLowerCase().includes('fall'));
        
        if (peer.state.position.y < pFloorH - 0.2) {
            peer.state.position.y = pFloorH;
        } else if (peer.state.position.y > expectedY + 0.5 && !isJumping) {
            peer.state.position.y = Math.max(expectedY, peer.state.position.y - dt * 12.0);
        }

        // Interpolate visual positions smoothly
        remAnim.group.position.lerp(peer.state.position, dt * 10);`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
