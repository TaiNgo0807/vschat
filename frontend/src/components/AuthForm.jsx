import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthForm() {
  const { login, register, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        await register(form);
      } else {
        await login({ username: form.username, password: form.password });
      }
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>VSChat</h1>
        <p className="auth-subtitle">
          {isRegister ? "Tạo tài khoản mới" : "Đăng nhập để vào phòng chat"}
        </p>

        {error && <div className="error-box">{error}</div>}

        <label>Username</label>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="VD: ngotai"
        />

        {isRegister && (
          <>
            <label>Tên hiển thị</label>
            <input
              name="displayName"
              value={form.displayName}
              onChange={handleChange}
              placeholder="VD: Ngô Văn Tài"
            />
          </>
        )}

        <label>Mật khẩu</label>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Tối thiểu 6 ký tự"
        />

        <button disabled={loading}>
          {loading ? "Đang xử lý..." : isRegister ? "Đăng ký" : "Đăng nhập"}
        </button>

        <p className="switch-auth">
          {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <span onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Đăng nhập" : "Đăng ký"}
          </span>
        </p>
      </form>
    </main>
  );
}
