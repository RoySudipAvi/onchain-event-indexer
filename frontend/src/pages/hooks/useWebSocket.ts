import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const WS_URL = import.meta.env.VITE_WS_URL;
if (!WS_URL) throw new Error("VITE_WS_URL is not set");
export const useWebSocket = () => {
  const [wsData, setWsData] = useState(null);
  const socketRef = useRef(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    const clientId = crypto.randomUUID();
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;
    const handleOpen = () => {
      console.log("server connected");
      socket.send(`From Client : ${clientId}`);
    };
    const handleMessage = (msg) => {
      console.log(JSON.parse(msg.data));
      queryClient.setQueryData(["event-list"], (old) => {});
    };
    const handleError = (err) => {
      console.error(err);
    };
    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleError);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
      socket.close();
    };
  }, []);

  return { wsData };
};
