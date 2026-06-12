import jwt from "jsonwebtoken";
import User from "../models/User.js";

import Group from "../models/Group.js";
import { ensureDefaultGroup } from "../utils/ensureDefaultGroup.js";

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

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();

    console.log("Socket connected:", socket.id, socket.user.username);

    socket.join(`user:${userId}`);

    const defaultGroup = await ensureDefaultGroup();

    const groups = await Group.find({
      $or: [{ _id: defaultGroup._id }, { members: socket.user._id }],
    }).select("_id");

    for (const group of groups) {
      socket.join(group._id.toString());
    }

    addOnlineSocket(socket.user, socket.id);
    io.emit("users:online", getOnlineUsers());

    socket.on("group:join", async (groupId, callback) => {
      try {
        const group = await Group.findById(groupId);

        if (!group) {
          return callback?.({ ok: false, message: "Không tìm thấy nhóm" });
        }

        const canJoin =
          group.isDefault ||
          group.members.some(
            (memberId) => memberId.toString() === socket.user._id.toString(),
          );

        if (!canJoin) {
          return callback?.({ ok: false, message: "Không có quyền vào nhóm" });
        }

        socket.join(group._id.toString());
        return callback?.({ ok: true });
      } catch (error) {
        return callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id, socket.user.username);

      removeOnlineSocket(userId, socket.id);
      io.emit("users:online", getOnlineUsers());
    });
  });
}
