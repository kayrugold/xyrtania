const fs = require('fs');
console.log('--- base_male_0.fbx ---');
console.log(fs.readFileSync('public/assets/character/base_male_0.fbx', 'utf8').substring(0, 100));
console.log('--- bob.fbx ---');
console.log(fs.readFileSync('public/assets/character/bob.fbx', 'utf8').substring(0, 100));
console.log('--- idle.fbx ---');
console.log(fs.readFileSync('public/assets/character/animations/idle.fbx', 'utf8').substring(0, 100));
