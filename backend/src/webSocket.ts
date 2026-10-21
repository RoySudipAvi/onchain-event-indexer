import { server } from "./server.ts";
import { WebSocketServer } from "ws";
import { eventEmitter } from "./config.ts";

export const wsServer = new WebSocketServer({ server: server });
wsServer.on("error", console.error);
wsServer.on("connection", (client) => {
  console.log("client connected");
  client.on("message", function message(data) {
    console.log("received: %s", data);
  });
  const emitterCallBack = (events) => {
    console.log("message: ", events);
    client.send(events.length);
  };
  console.log(eventEmitter);
  eventEmitter.on("publish-events", emitterCallBack);
  client.on("close", () => {
    eventEmitter.off("publish-events", emitterCallBack);
  });
});
