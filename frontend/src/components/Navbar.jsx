import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

export default function Navbar() {
  const { user, logout, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploading(true);

      const data = await apiRequest("/api/users/avatar", {
        method: "PATCH",
        data: formData,
      });

      updateUser(data.user);
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <header className="navbar">
      <div className="nav-brand">
        <h2>VSChat</h2>
        <p>Phòng chat nông nghiệp</p>
      </div>

      <div className="nav-user">
        <label className="avatar-box" title="Đổi avatar">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} />
          ) : (
            <span>{user?.displayName?.charAt(0)?.toUpperCase()}</span>
          )}

          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarChange}
          />
        </label>

        <div className="nav-user-info">
          <strong>{user?.displayName}</strong>
          <small>{uploading ? "Đang upload..." : `@${user?.username}`}</small>
        </div>

        <button className="logout-btn" onClick={logout} title="Đăng xuất">
          <span className="logout-text">Đăng xuất</span>
          <span className="logout-icon">↪</span>
        </button>
      </div>
    </header>
  );
}
