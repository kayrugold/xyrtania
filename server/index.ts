import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { createServer } from "http";
import { XyrtaniaRoom } from "./rooms/XyrtaniaRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "xyrtania-server" });
});

const server = new Server({
  server: createServer(app),
});

server.define("xyrtania_room", XyrtaniaRoom);

server.listen(port).then(() => {
  console.log(`Colyseus server is listening on port ${port}`);
});
