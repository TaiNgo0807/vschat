import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username là bắt buộc"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username tối thiểu 3 ký tự"],
      maxlength: [30, "Username tối đa 30 ký tự"],
    },
    displayName: {
      type: String,
      required: [true, "Tên hiển thị là bắt buộc"],
      trim: true,
      maxlength: [50, "Tên hiển thị tối đa 50 ký tự"],
    },
    password: {
      type: String,
      required: [true, "Mật khẩu là bắt buộc"],
      minlength: [6, "Mật khẩu tối thiểu 6 ký tự"],
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    avatarPublicId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    username: this.username,
    displayName: this.displayName,
    avatarUrl: this.avatarUrl,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);
export default User;
