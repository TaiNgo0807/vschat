import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 5050;

// Import sau khi dotenv.config() chạy xong
const { default: app } = await import("./app.js");
const { connectDB } = await import("./config/db.js");
const { initChatSocket } = await import("./sockets/chat.socket.js");

await connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      process.env.CLIENT_URL,
      "https://vschat-rho.vercel.app",
      " https://www.vietsangchat.space/",
    ],
    credentials: true,
    methods: ["GET", "POST"],
  },
});

app.set("io", io);
initChatSocket(io);

server.listen(PORT, () => {
  console.log(`VSChat backend running on${PORT}`);
});
