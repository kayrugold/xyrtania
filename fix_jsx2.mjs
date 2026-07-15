import fs from 'fs';
let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
lines.splice(2392, 4, 
'            </p>',
'          </div>',
'        </div>',
'      )}'
);
fs.writeFileSync('src/App.tsx', lines.join('\n'));
