import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    originalName: String,
    mimeType: String,
    size: Number,
    resourceType: String,
  },
  { _id: false },
);

const seenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    seenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    emoji: {
      type: String,
      enum: ["👍", "❤️", "😂", "😮", "😢", "🙏"],
    },
    reactedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);
const messageSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: [2000, "Tin nhắn tối đa 2000 ký tự"],
      default: "",
    },
    file: {
      type: fileSchema,
      default: null,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    seenBy: {
      type: [seenSchema],
      default: [],
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
