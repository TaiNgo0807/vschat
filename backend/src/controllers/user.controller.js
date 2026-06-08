import User from "../models/User.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

export async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn ảnh avatar" });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Avatar phải là file ảnh" });
    }

    const result = await uploadToCloudinary(req.file.buffer, "vschat/avatars");

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        avatarUrl: result.secure_url,
        avatarPublicId: result.public_id,
      },
      { new: true },
    ).select("-password");

    return res.json({
      message: "Cập nhật avatar thành công",
      user: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
