import { server } from "./server.ts";
import { WebSocketServer, WebSocket } from "ws";
import { getAddress, type Address } from "viem";
import { config, eventEmitter } from "./config.ts";
import { sessionMiddleware } from "./routes.ts";
import { watchersByAddress } from "./repositories.ts";

type AuthedSocket = WebSocket & { userAddress: Address };

export const wsServer = new WebSocketServer({ noServer: true });
wsServer.on("error", console.error);

const reject = (socket: any, status: string) => {
  socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
};

server.on("upgrade", (req, socket, head) => {
  // Browsers don't apply CORS to WebSockets, so check the origin ourselves
  const origin = req.headers.origin;
  if (!origin || !config.corsOrigins.includes(origin)) {
    return reject(socket, "403 Forbidden");
  }
  sessionMiddleware(req as any, {} as any, (err?: unknown) => {
    if (err) {
      console.error("ws session error:", err);
      return reject(socket, "500 Internal Server Error");
    }
    const siwe = (req as any).session?.siwe;
    if (!siwe) return reject(socket, "401 Unauthorized");
    wsServer.handleUpgrade(req, socket, head, (ws) => {
      (ws as AuthedSocket).userAddress = getAddress(siwe.address);
      wsServer.emit("connection", ws, req);
    });
  });
});

// Drop dead connections; also keeps idle sockets alive behind host proxies
const alive = new WeakSet<WebSocket>();
wsServer.on("connection", (ws) => {
  alive.add(ws);
  ws.on("pong", () => alive.add(ws));
});
setInterval(() => {
  for (const c of wsServer.clients) {
    if (!alive.has(c)) {
      c.terminate();
      continue;
    }
    alive.delete(c);
    c.ping();
  }
}, 30000);

// One listener and one DB query per publish, however many clients are connected
eventEmitter.on("publish-events", async (events: { addresses: string[] }[]) => {
  try {
    const all = [...new Set(events.flatMap((e) => e.addresses))];
    const watchers = await watchersByAddress(all);
    const counts = new Map<string, number>();
    for (const e of events) {
      const users = new Set(e.addresses.flatMap((a) => watchers.get(a) ?? []));
      for (const u of users) counts.set(u, (counts.get(u) ?? 0) + 1);
    }
    for (const c of wsServer.clients) {
      const n = counts.get((c as AuthedSocket).userAddress);
      if (n && c.readyState === WebSocket.OPEN) {
        c.send(JSON.stringify({ type: "new-events", count: n }));
      }
    }
  } catch (err) {
    console.error("ws publish failed:", err);
  }
});
