import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const useWebSocket = () => {
  const [wsData, setWsData] = useState(null);
  const socketRef = useRef(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    const clientId = crypto.randomUUID();
    const socket = new WebSocket("ws://localhost:3000");
    socketRef.current = socket;
    const handleOpen = () => {
      console.log("server connected");
      socket.send(`From Client : ${clientId}`);
    };
    const handleMessage = (msg) => {
      console.log(JSON.parse(msg.data));
      queryClient.invalidateQueries({ queryKey: ["event-list"] });
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
