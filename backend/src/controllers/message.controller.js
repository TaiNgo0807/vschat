import Message from "../models/Message.js";
import Group from "../models/Group.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { ensureDefaultGroup } from "../utils/ensureDefaultGroup.js";
import {
  getPushRecipientsByGroup,
  sendPushToUsers,
} from "../services/push.service.js";

async function getAccessibleGroup(groupId, userId) {
  let group;

  if (groupId) {
    group = await Group.findById(groupId);
  } else {
    group = await ensureDefaultGroup();
  }

  if (!group) {
    throw new Error("Không tìm thấy nhóm");
  }

  if (group.isDefault) {
    return group;
  }

  const isMember = group.members.some(
    (memberId) => memberId.toString() === userId.toString(),
  );

  if (!isMember) {
    const error = new Error("Bạn không thuộc nhóm này");
    error.statusCode = 403;
    throw error;
  }

  return group;
}

export async function getMessages(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const group = await getAccessibleGroup(req.query.groupId, req.user._id);

    const messages = await Message.find({ group: group._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "username displayName avatarUrl")
      .populate("group", "name isDefault")
      .populate("seenBy.user", "username displayName avatarUrl")
      .populate("reactions.user", "username displayName avatarUrl")
      .lean();

    return res.json({
      group,
      messages: messages.reverse(),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
}

export async function createMessage(req, res) {
  try {
    const text = req.body.text?.trim() || "";
    const groupId = req.body.groupId;
    const clientTempId = req.body.clientTempId || "";

    const group = await getAccessibleGroup(groupId, req.user._id);

    const uploadFiles = req.files || [];

    if (!text && uploadFiles.length === 0) {
      return res.status(400).json({ message: "Tin nhắn không được rỗng" });
    }

    let filesData = [];

    // Có file thì upload Cloudinary song song, không upload tuần tự nữa
    if (uploadFiles.length > 0) {
      filesData = await Promise.all(
        uploadFiles.map(async (item) => {
          const result = await uploadToCloudinary(
            item.buffer,
            "vschat/messages",
            item.originalname,
          );

          return {
            url: result.secure_url,
            publicId: result.public_id,
            originalName: item.originalname,
            mimeType: item.mimetype,
            size: item.size,
            resourceType: result.resource_type,
          };
        }),
      );
    }

    const message = await Message.create({
      group: group._id,
      sender: req.user._id,
      clientTempId,
      text,
      files: filesData,
      file: filesData[0] || null,
      seenBy: [],
      reactions: [],
    });

    // Không query populate lại nữa, tự build object cho nhanh
    const populatedMessage = {
      _id: message._id,
      group: {
        _id: group._id,
        name: group.name,
        isDefault: group.isDefault,
      },
      sender: {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatarUrl: req.user.avatarUrl,
      },
      clientTempId: message.clientTempId,
      text: message.text,
      file: message.file,
      files: message.files,
      isRevoked: message.isRevoked,
      revokedAt: message.revokedAt,
      seenBy: [],
      reactions: [],
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };

    const io = req.app.get("io");
    io.to(group._id.toString()).emit("message:new", populatedMessage);

    // Trả response trước cho nhanh
    res.status(201).json({ message: populatedMessage });

    // Push notification chạy nền, không làm chậm gửi tin
    setImmediate(async () => {
      try {
        const recipientIds = await getPushRecipientsByGroup(
          group,
          req.user._id,
        );

        const body =
          populatedMessage.text ||
          (populatedMessage.files?.length > 0
            ? `Đã gửi ${populatedMessage.files.length} ảnh/file`
            : "Có tin nhắn mới");

        await sendPushToUsers(recipientIds, {
          title: `${req.user.displayName || "VSChat"} · ${group.name}`,
          body,
          icon: req.user.avatarUrl || "/icons/icon-192.png",
          url: "/",
          messageId: populatedMessage._id,
          groupId: group._id,
        });
      } catch (pushError) {
        console.log("Push background error:", pushError.message);
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
}

export async function downloadMessageFile(req, res) {
  try {
    const { id } = req.params;

    const message = await Message.findById(id).lean();

    if (!message || !message.file || !message.file.url) {
      return res.status(404).json({ message: "Không tìm thấy file" });
    }

    const cloudinaryResponse = await fetch(message.file.url);

    if (!cloudinaryResponse.ok) {
      return res
        .status(500)
        .json({ message: "Không tải được file từ Cloudinary" });
    }

    const arrayBuffer = await cloudinaryResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const originalName = message.file.originalName || "vschat-file";
    const fallbackName = originalName
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\]/g, "_");

    res.setHeader(
      "Content-Type",
      message.file.mimeType ||
        cloudinaryResponse.headers.get("content-type") ||
        "application/octet-stream",
    );

    res.setHeader("Content-Length", buffer.length);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(originalName)}`,
    );

    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function revokeMessage(req, res) {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn chỉ được thu hồi tin nhắn của mình" });
    }

    if (message.isRevoked) {
      return res.status(400).json({ message: "Tin nhắn đã được thu hồi rồi" });
    }

    message.text = "";
    message.file = null;
    message.isRevoked = true;
    message.revokedAt = new Date();

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username displayName avatarUrl")
      .populate("group", "name isDefault")
      .populate("seenBy.user", "username displayName avatarUrl")
      .populate("reactions.user", "username displayName avatarUrl")
      .lean();

    const io = req.app.get("io");
    io.to(message.group.toString()).emit("message:revoked", populatedMessage);

    return res.json({
      message: "Thu hồi tin nhắn thành công",
      data: populatedMessage,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function markMessagesAsSeen(req, res) {
  try {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.json({ message: "Không có tin nhắn cần đánh dấu đã xem" });
    }

    const messages = await Message.find({
      _id: { $in: messageIds },
      sender: { $ne: req.user._id },
      isRevoked: false,
      "seenBy.user": { $ne: req.user._id },
    });

    for (const message of messages) {
      message.seenBy.push({
        user: req.user._id,
        seenAt: new Date(),
      });

      await message.save();
    }

    const updatedMessages = await Message.find({
      _id: { $in: messages.map((item) => item._id) },
    })
      .populate("sender", "username displayName avatarUrl")
      .populate("seenBy.user", "username displayName avatarUrl")
      .lean();

    const io = req.app.get("io");

    io.to("main-room").emit("messages:seen", {
      viewer: {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatarUrl: req.user.avatarUrl,
      },
      messages: updatedMessages,
    });

    return res.json({
      message: "Đã cập nhật trạng thái đã xem",
      messages: updatedMessages,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getMediaMessages(req, res) {
  try {
    const group = await getAccessibleGroup(req.query.groupId, req.user._id);

    const messages = await Message.find({
      group: group._id,
      file: { $ne: null },
      isRevoked: false,
    })
      .sort({ createdAt: -1 })
      .populate("sender", "username displayName avatarUrl")
      .populate("group", "name isDefault")
      .populate("seenBy.user", "username displayName avatarUrl")
      .lean();

    return res.json({
      group,
      media: messages,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
}

export async function getMessageSeenUsers(req, res) {
  try {
    const { id } = req.params;

    const message = await Message.findById(id)
      .populate("sender", "username displayName avatarUrl")
      .populate("group", "name isDefault members")
      .populate("seenBy.user", "username displayName avatarUrl")
      .lean();

    if (!message) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
    }

    const group = await getAccessibleGroup(message.group._id, req.user._id);

    return res.json({
      messageId: message._id,
      seenBy: message.seenBy || [],
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
}

export async function reactMessage(req, res) {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    const allowedEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

    if (!allowedEmojis.includes(emoji)) {
      return res.status(400).json({ message: "Cảm xúc không hợp lệ" });
    }

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
    }

    if (message.isRevoked) {
      return res
        .status(400)
        .json({ message: "Không thể thả cảm xúc tin nhắn đã thu hồi" });
    }

    const group = await getAccessibleGroup(message.group, req.user._id);

    const userId = req.user._id.toString();

    const existedIndex = message.reactions.findIndex(
      (reaction) => reaction.user.toString() === userId,
    );

    if (existedIndex !== -1) {
      const oldEmoji = message.reactions[existedIndex].emoji;

      if (oldEmoji === emoji) {
        message.reactions.splice(existedIndex, 1);
      } else {
        message.reactions[existedIndex].emoji = emoji;
        message.reactions[existedIndex].reactedAt = new Date();
      }
    } else {
      message.reactions.push({
        user: req.user._id,
        emoji,
        reactedAt: new Date(),
      });
    }

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username displayName avatarUrl")
      .populate("group", "name isDefault")
      .populate("seenBy.user", "username displayName avatarUrl")
      .populate("reactions.user", "username displayName avatarUrl")
      .lean();

    const io = req.app.get("io");
    io.to(group._id.toString()).emit("message:reaction", populatedMessage);

    return res.json({
      message: "Cập nhật cảm xúc thành công",
      data: populatedMessage,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
}
