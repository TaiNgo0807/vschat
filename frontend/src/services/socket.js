import { io } from "socket.io-client";
import { API_URL } from "./api";

export function createSocket(token) {
  return io(API_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });
}
