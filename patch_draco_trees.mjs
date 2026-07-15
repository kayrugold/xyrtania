import fs from 'fs';
let code = fs.readFileSync('src/WorldGrid.ts', 'utf-8');

// add DRACOLoader import
code = code.replace(/import { GLTFLoader } from 'three\/examples\/jsm\/loaders\/GLTFLoader\.js';/g,
  "import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';\nimport { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';");

// modify the loader initialization
code = code.replace(/const loader = new GLTFLoader\(\); loader\.setCrossOrigin\(""\);/g,
  `const loader = new GLTFLoader(); loader.setCrossOrigin("");
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(dracoLoader);`);

fs.writeFileSync('src/WorldGrid.ts', code);
