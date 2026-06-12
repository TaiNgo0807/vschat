import Group from "../models/Group.js";
import User from "../models/User.js";
import { ensureDefaultGroup } from "../utils/ensureDefaultGroup.js";

function isMember(group, userId) {
  if (group.isDefault) return true;

  return group.members.some(
    (memberId) => memberId.toString() === userId.toString(),
  );
}

export async function getGroups(req, res) {
  try {
    const defaultGroup = await ensureDefaultGroup();

    const customGroups = await Group.find({
      isDefault: false,
      members: req.user._id,
    })
      .populate("members", "username displayName avatarUrl")
      .populate("createdBy", "username displayName avatarUrl")
      .sort({ updatedAt: -1 })
      .lean();

    const populatedDefault = await Group.findById(defaultGroup._id)
      .populate("members", "username displayName avatarUrl")
      .populate("createdBy", "username displayName avatarUrl")
      .lean();

    return res.json({
      groups: [populatedDefault, ...customGroups],
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function createGroup(req, res) {
  try {
    const { name, memberIds = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên nhóm không được rỗng" });
    }

    if (!Array.isArray(memberIds)) {
      return res
        .status(400)
        .json({ message: "Danh sách thành viên không hợp lệ" });
    }

    const uniqueMemberIds = [
      ...new Set([
        req.user._id.toString(),
        ...memberIds.map((id) => id.toString()),
      ]),
    ];

    if (uniqueMemberIds.length < 2) {
      return res.status(400).json({
        message: "Nhóm riêng cần ít nhất 2 người",
      });
    }

    const existingUsers = await User.find({
      _id: { $in: uniqueMemberIds },
    }).select("_id");

    if (existingUsers.length !== uniqueMemberIds.length) {
      return res.status(400).json({
        message: "Có user không tồn tại trong DB",
      });
    }

    const group = await Group.create({
      name: name.trim(),
      isDefault: false,
      createdBy: req.user._id,
      members: uniqueMemberIds,
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "username displayName avatarUrl")
      .populate("createdBy", "username displayName avatarUrl")
      .lean();

    const io = req.app.get("io");

    for (const memberId of uniqueMemberIds) {
      io.to(`user:${memberId}`).emit("group:created", populatedGroup);
    }

    return res.status(201).json({
      message: "Tạo nhóm thành công",
      group: populatedGroup,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getGroupDetail(req, res) {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "username displayName avatarUrl")
      .populate("createdBy", "username displayName avatarUrl");

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm" });
    }

    if (!isMember(group, req.user._id)) {
      return res.status(403).json({ message: "Bạn không thuộc nhóm này" });
    }

    return res.json({ group });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
