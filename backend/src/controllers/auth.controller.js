import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

export async function register(req, res) {
  try {
    const { username, displayName, password } = req.body;

    if (!username || !displayName || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu tối thiểu 6 ký tự" });
    }

    const existedUser = await User.findOne({
      username: username.toLowerCase(),
    });

    if (existedUser) {
      return res.status(409).json({ message: "Username đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      displayName,
      password: hashedPassword,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      message: "Đăng ký thành công",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập username và mật khẩu" });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Sai username hoặc mật khẩu" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Sai username hoặc mật khẩu" });
    }

    const token = generateToken(user._id);

    return res.json({
      message: "Đăng nhập thành công",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getMe(req, res) {
  return res.json({ user: req.user.toSafeObject() });
}
