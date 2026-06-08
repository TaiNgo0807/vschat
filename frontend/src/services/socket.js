import { io } from "socket.io-client";
import { API_URL } from "./api";

export function createSocket(token) {
  return io(API_URL, {
    auth: {
      token,
    },
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
}
