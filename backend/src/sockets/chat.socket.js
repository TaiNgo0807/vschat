import jwt from "jsonwebtoken";
import User from "../models/User.js";

const ROOM_ID = "main-room";
const onlineUsers = new Map();

function getOnlineUsers() {
  return Array.from(onlineUsers.values()).map((item) => item.user);
}

function addOnlineSocket(user, socketId) {
  const userId = user._id.toString();
  const existed = onlineUsers.get(userId);

  if (existed) {
    existed.socketIds.add(socketId);
    onlineUsers.set(userId, existed);
    return;
  }

  onlineUsers.set(userId, {
    socketIds: new Set([socketId]),
    user: {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
  });
}

function removeOnlineSocket(userId, socketId) {
  const existed = onlineUsers.get(userId);
  if (!existed) return;

  existed.socketIds.delete(socketId);

  if (existed.socketIds.size === 0) {
    onlineUsers.delete(userId);
  } else {
    onlineUsers.set(userId, existed);
  }
}

export function initChatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Chưa đăng nhập"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId)
        .select("-password")
        .lean();

      if (!user) {
        return next(new Error("User không tồn tại"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Token không hợp lệ"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    const maxRoomUsers = Number(process.env.MAX_ROOM_USERS || 50);
    const isAlreadyOnline = onlineUsers.has(userId);

    if (!isAlreadyOnline && onlineUsers.size >= maxRoomUsers) {
      socket.emit("room:full", {
        message: `Phòng đã đủ ${maxRoomUsers} người online`,
      });
      socket.disconnect(true);
      return;
    }

    socket.join(ROOM_ID);
    addOnlineSocket(socket.user, socket.id);

    io.to(ROOM_ID).emit("users:online", getOnlineUsers());

    socket.on("disconnect", () => {
      removeOnlineSocket(userId, socket.id);
      io.to(ROOM_ID).emit("users:online", getOnlineUsers());
    });
  });
}
