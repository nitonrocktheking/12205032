import http from "http";
import { WebSocketServer } from "ws";
import app from "./app";
import { setupWebSocket } from "./ws/rooms";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/api/ws" });
setupWebSocket(wss, logger);

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
