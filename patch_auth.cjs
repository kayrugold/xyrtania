const fs = require('fs');
let code = fs.readFileSync('src/auth/useCryptoAuth.ts', 'utf8');

const target1 = `  const updateCharacter = async (stats: any) => {
    if (!session) return;`;
const replace1 = `  const updateCharacter = async (stats: any) => {
    if (!session) return;
    
    // Inject customization into stats payload for Cloudflare
    stats.customColor = localStorage.getItem('xy_customColor');
    stats.customScale = localStorage.getItem('xy_customScale');
    stats.torsoVisible = localStorage.getItem('xy_torsoVisible');
    stats.morphTargets = localStorage.getItem('xy_morphTargets');
    stats.headStyle = localStorage.getItem('xy_headStyle');
`;
code = code.replace(target1, replace1);

const target2 = `        if (res && res.success && res.character && res.character.displayName) {
             setDisplayName(res.character.displayName);
             localStorage.setItem('xyrtania_display_name', res.character.displayName);
             localStorage.setItem('xyrtania_setup_complete', 'true');
          }`;
const replace2 = `        if (res && res.success && res.character && res.character.displayName) {
             setDisplayName(res.character.displayName);
             localStorage.setItem('xyrtania_display_name', res.character.displayName);
             localStorage.setItem('xyrtania_setup_complete', 'true');
             
             // Restore customization if present
             if (res.character.customColor) localStorage.setItem('xy_customColor', res.character.customColor);
             if (res.character.customScale) localStorage.setItem('xy_customScale', res.character.customScale);
             if (res.character.torsoVisible) localStorage.setItem('xy_torsoVisible', res.character.torsoVisible);
             if (res.character.morphTargets) localStorage.setItem('xy_morphTargets', res.character.morphTargets);
             if (res.character.headStyle) localStorage.setItem('xy_headStyle', res.character.headStyle);
          }`;
code = code.replace(target2, replace2);

const target3 = `        if (res && res.success && res.character && res.character.displayName) {
          setDisplayName(res.character.displayName);
          localStorage.setItem('xyrtania_display_name', res.character.displayName);
          localStorage.setItem('xyrtania_setup_complete', 'true');
        }`;
const replace3 = `        if (res && res.success && res.character && res.character.displayName) {
          setDisplayName(res.character.displayName);
          localStorage.setItem('xyrtania_display_name', res.character.displayName);
          localStorage.setItem('xyrtania_setup_complete', 'true');
          
          if (res.character.customColor) localStorage.setItem('xy_customColor', res.character.customColor);
          if (res.character.customScale) localStorage.setItem('xy_customScale', res.character.customScale);
          if (res.character.torsoVisible) localStorage.setItem('xy_torsoVisible', res.character.torsoVisible);
          if (res.character.morphTargets) localStorage.setItem('xy_morphTargets', res.character.morphTargets);
          if (res.character.headStyle) localStorage.setItem('xy_headStyle', res.character.headStyle);
        }`;
code = code.replace(target3, replace3);

fs.writeFileSync('src/auth/useCryptoAuth.ts', code);
