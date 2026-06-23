import { verifyMessage } from 'ethers';

export interface Env {
  // Cloudflare D1 Database Binding
  // In wrangler.toml, this would be mapped, e.g.:
  // [[d1_databases]]
  // binding = "DB"
  // database_name = "xyrtania-characters"
  // database_id = "<uuid>"
  DB: any; // Using `any` type here for standalone compilation without `@cloudflare/workers-types`
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight for the frontend to be able to call this from github pages / cloudflare pages
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
       return new Response('Xyrtania D1 Backend API is online.', { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    if (request.method === 'POST' && url.pathname === '/api/sync') {
      try {
        const body = await request.json();
        const { payload, signature, timestamp, signerId } = body;

        // Verify that the payload isn't too stale (e.g., older than 5 mins) to prevent replay attacks
        if (Date.now() - timestamp > 5 * 60 * 1000) {
           return new Response(JSON.stringify({ error: 'Payload expired' }), { 
             status: 400,
             headers: { "Access-Control-Allow-Origin": "*" }
           });
        }

        // Reconstruct the message that was signed exactly as the client sent it
        const dataToSign = JSON.stringify({ ...payload, timestamp });
        
        // Recover the public address from the signed payload
        const recoveredAddress = verifyMessage(dataToSign, signature);
        
        // Ensure the signer is actually who they claim to be (Player ID Public Key Verification)
        if (recoveredAddress !== signerId) {
          return new Response(JSON.stringify({ error: 'Invalid cryptographic signature' }), { 
            status: 401,
            headers: { "Access-Control-Allow-Origin": "*" }
          });
        }

        // Extract payload data
        const { displayName = 'Anonymous', level = 1, gold = 0, currentChunk = '0,0' } = payload;

        // UPSERT the character into standard Cloudflare D1 SQL Serverless Database
        const stmt = env.DB.prepare(`
          INSERT INTO characters (player_id, display_name, level, gold, current_chunk, last_sync)
          VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
          ON CONFLICT(player_id) DO UPDATE SET
            display_name=excluded.display_name,
            level=excluded.level,
            gold=excluded.gold,
            current_chunk=excluded.current_chunk,
            last_sync=CURRENT_TIMESTAMP;
        `);

        // Execute queries inside worker sandbox
        await stmt.bind(signerId, displayName, level, gold, currentChunk).run();

        return new Response(JSON.stringify({ success: true, message: 'Character synced successfully' }), {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          }
        });
      } catch (error) {
        console.error('Sync error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error while syncing payload' }), { 
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    return new Response('Not found', { status: 404 });
  }
};
