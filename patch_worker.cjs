const fs = require('fs');
let code = fs.readFileSync('src/backend/index.ts', 'utf8');

const target1 = `        // Execute queries inside worker sandbox
        await stmt.bind(signerId, displayName, level, gold, currentChunk).run();`;
const replace1 = `        // Execute queries inside worker sandbox
        await stmt.bind(signerId, displayName, level, gold, currentChunk).run();`;

// We'll append the terrain routes
const target2 = `    if (request.method === 'GET' && url.pathname === '/api/character') {`;
const replace2 = `    if (request.method === 'POST' && url.pathname === '/api/terrain/sync') {
      try {
        const body = await request.json();
        const { regionId, data, secret } = body;
        
        // Very basic shared secret for server-to-server auth
        // In production, pass a proper SERVER_SECRET via wrangler.toml env var
        if (!secret || secret !== (env.SERVER_SECRET || 'dev-secret')) {
             return new Response(JSON.stringify({ error: 'Unauthorized server access' }), { status: 401 });
        }

        const stmt = env.DB.prepare(\`
          INSERT INTO terrain_regions (region_id, data, last_updated)
          VALUES (?1, ?2, CURRENT_TIMESTAMP)
          ON CONFLICT(region_id) DO UPDATE SET
            data=excluded.data,
            last_updated=CURRENT_TIMESTAMP;
        \`);
        await stmt.bind(regionId, data).run();

        return new Response(JSON.stringify({ success: true }));
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error while syncing terrain' }), { status: 500 });
      }
    }
    
    if (request.method === 'GET' && url.pathname === '/api/terrain/load') {
      try {
        const stmt = env.DB.prepare('SELECT region_id as regionId, data FROM terrain_regions');
        const { results } = await stmt.all();
        return new Response(JSON.stringify({ success: true, regions: results || [] }));
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error while loading terrain' }), { status: 500 });
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/character') {`;

code = code.replace(target2, replace2);

// Add Env typings
const target3 = `  // database_name = "xyrtania-characters"
  // database_id = "<uuid>"
  DB: any; // Using \`any\` type here for standalone compilation without \`@cloudflare/workers-types\``;
const replace3 = `  // database_name = "xyrtania-characters"
  // database_id = "<uuid>"
  DB: any; // Using \`any\` type here for standalone compilation without \`@cloudflare/workers-types\`
  SERVER_SECRET: string;`;
code = code.replace(target3, replace3);

fs.writeFileSync('src/backend/index.ts', code);
