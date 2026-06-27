import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import { XyrtaniaRoom } from "./server/rooms/XyrtaniaRoom";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(cors());
  app.use(express.json());

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
