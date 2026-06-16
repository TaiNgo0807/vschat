import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import messageRoutes from "./routes/message.routes.js";
import groupRoutes from "./routes/group.routes.js";
import pushRoutes from "./routes/push.routes.js";

const app = express();
app.use(compression());

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL,
  "https://vschat-rho.vercel.app",
  " https://www.vietsangchat.space/",
  "http://localhost:4173",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép request không có origin như Postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ---- Health ----
app.get("/health", (_req, res) =>
  res.json({ ok: true, uptime: process.uptime() }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ message: "VSChat API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/push", pushRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "API không tồn tại" });
});

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(400).json({
    message: err.message || "Request không hợp lệ",
  });
});

export default app;
