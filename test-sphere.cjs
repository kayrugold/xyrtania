const THREE = require('three');
const geo = new THREE.SphereGeometry(1, 8, 8);
const uv = geo.attributes.uv;
const pos = geo.attributes.position;
for(let i=0; i<uv.count; i++) {
    if (Math.abs(uv.getX(i) - 0.5) < 0.1 && Math.abs(uv.getY(i) - 0.5) < 0.1) {
        console.log('Center UV at:', pos.getX(i), pos.getY(i), pos.getZ(i));
    }
}
