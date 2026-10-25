import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const WS_URL = import.meta.env.VITE_WS_URL;
if (!WS_URL) throw new Error("VITE_WS_URL is not set");
if (window.location.protocol === "https:" && !WS_URL.startsWith("wss://")) {
  throw new Error(
    "VITE_WS_URL must start with wss:// when the site is served over https",
  );
}

const MAX_DELAY_MS = 30000;

export const useWebSocket = () => {
  const [newEventsCount, setNewEventsCount] = useState<number>(0);
  const queryClient = useQueryClient();
  useEffect(() => {
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let stopped = false;

    const connect = () => {
      socket = new WebSocket(WS_URL);

      socket.addEventListener("open", () => {
        console.log("server connected");
        // events may have arrived while we were disconnected
        if (attempts > 0) {
          queryClient.invalidateQueries({ queryKey: ["event-list"] });
        }
        attempts = 0;
      });
      socket.addEventListener("message", (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.type === "new-events" && typeof data.count === "number") {
            setNewEventsCount((old) => old + data.count);
          }
        } catch {
          // ignore malformed messages
        }
        queryClient.invalidateQueries({ queryKey: ["event-list"] });
      });
      socket.addEventListener("error", (err: Event) => {
        console.error(err);
      });
      socket.addEventListener("close", () => {
        if (stopped) return;
        const delay = Math.min(1000 * 2 ** attempts, MAX_DELAY_MS);
        attempts += 1;
        timer = setTimeout(connect, delay);
      });
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
    };
  }, [queryClient]);
  return { newEventsCount, setNewEventsCount };
};
