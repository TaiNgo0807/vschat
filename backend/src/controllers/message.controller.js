import Message from "../models/Message.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

const ROOM_ID = "main-room";

export async function getMessages(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const messages = await Message.find({ roomId: ROOM_ID })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "username displayName avatarUrl")
      .populate("seenBy.user", "username displayName avatarUrl")
      .lean();

    return res.json({ messages: messages.reverse() });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function createMessage(req, res) {
  try {
    const text = req.body.text?.trim() || "";

    if (!text && !req.file) {
      return res.status(400).json({ message: "Tin nhắn không được rỗng" });
    }

    let fileData = null;

    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "vschat/messages",
        req.file.originalname,
      );
      fileData = {
        url: result.secure_url,
        publicId: result.public_id,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        resourceType: result.resource_type,
      };
    }

    const message = await Message.create({
      roomId: ROOM_ID,
      sender: req.user._id,
      text,
      file: fileData,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username displayName avatarUrl")
      .populate("seenBy.user", "username displayName avatarUrl")
      .lean();
    const io = req.app.get("io");
    io.to(ROOM_ID).emit("message:new", populatedMessage);

    return res.status(201).json({ message: populatedMessage });
  } catch (error) {
    return res.status(500).json({ message: error.message });
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
      .populate("seenBy.user", "username displayName avatarUrl")
      .lean();

    const io = req.app.get("io");
    io.to("main-room").emit("message:revoked", populatedMessage);

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
