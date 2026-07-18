import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import { XyrtaniaRoom } from "./server/rooms/XyrtaniaRoom";

function restoreAssets() {
  console.log("[Asset Restore] Checking integrity of critical 3D models...");
  const assetsToRestore = [
    {
      glb: "public/assets/character/customization/teacher_head_style_1.glb",
      b64: "backup_assets/teacher_head_style_1.b64"
    }
  ];

  for (const asset of assetsToRestore) {
    let needsRestore = false;
    if (!fs.existsSync(asset.glb)) {
      console.log(`[Asset Restore] ${asset.glb} does not exist. Restoring...`);
      needsRestore = true;
    } else {
      try {
        const buffer = fs.readFileSync(asset.glb);
        if (buffer.length < 12) {
          needsRestore = true;
        } else {
          const magic = buffer.readUInt32LE(0);
          const version = buffer.readUInt32LE(4);
          const length = buffer.readUInt32LE(8);
          if (magic !== 0x46546C67 || length > buffer.length) {
            console.log(`[Asset Restore] ${asset.glb} is corrupted (magic: ${magic.toString(16)}, header length: ${length}, file length: ${buffer.length}). Restoring...`);
            needsRestore = true;
          }
        }
      } catch (err) {
        console.log(`[Asset Restore] Error reading ${asset.glb}:`, err);
        needsRestore = true;
      }
    }

    if (needsRestore) {
      if (!fs.existsSync(asset.b64)) {
        console.error(`[Asset Restore] Critical error: backup file ${asset.b64} not found!`);
        continue;
      }
      try {
        const b64Str = fs.readFileSync(asset.b64, "utf8").trim();
        const binaryBuffer = Buffer.from(b64Str, "base64");
        const parentDir = path.dirname(asset.glb);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(asset.glb, binaryBuffer);
        console.log(`[Asset Restore] Successfully restored ${asset.glb} (${binaryBuffer.length} bytes)`);
      } catch (restoreErr) {
        console.error(`[Asset Restore] Failed to restore ${asset.glb}:`, restoreErr);
      }
    } else {
      console.log(`[Asset Restore] ${asset.glb} is healthy (valid magic and header length).`);
    }
  }
}

async function startServer() {
  restoreAssets();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Enforce correct Content-Type and Content-Encoding for 3D model files (FBX, GLB, GLTF) to prevent proxy-level compression/corruption
  app.use((req, res, next) => {
    const cleanPath = req.path || "";
    const lowerPath = cleanPath.toLowerCase();
    if (lowerPath.endsWith('.fbx') || lowerPath.endsWith('.glb') || lowerPath.endsWith('.gltf')) {
      if (lowerPath.endsWith('.glb')) {
        res.setHeader('Content-Type', 'model/gltf-binary');
      } else if (lowerPath.endsWith('.gltf')) {
        res.setHeader('Content-Type', 'application/json');
      } else {
        res.setHeader('Content-Type', 'application/octet-stream');
      }
      res.setHeader('Content-Encoding', 'identity');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
    next();
  });

  
  const globalClientErrors = [];
  app.get("/api/get_errors", (req, res) => res.json(globalClientErrors));
  app.post("/api/log_error", express.json(), (req, res) => {
    console.log("CLIENT ERROR:", req.body);
    globalClientErrors.push(req.body);
    res.json({ ok: true });
  });
  app.use("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);

  const colyseusServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer,
    })
  });

  colyseusServer.define("xyrtania_room", XyrtaniaRoom as any);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack Colyseus + Vite server running on http://localhost:${PORT}`);
  });
}

startServer();
