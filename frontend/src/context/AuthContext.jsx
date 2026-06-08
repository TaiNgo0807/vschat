import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    localStorage.getItem("vschat_token"),
  );
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("vschat_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMe() {
      if (!token) return;

      try {
        const data = await apiRequest("/api/auth/me");
        setUser(data.user);
        localStorage.setItem("vschat_user", JSON.stringify(data.user));
      } catch (error) {
        logout();
      }
    }

    loadMe();
  }, [token]);

  function saveAuth(data) {
    localStorage.setItem("vschat_token", data.token);
    localStorage.setItem("vschat_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }

  async function login(formData) {
    setLoading(true);
    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        data: formData,
      });
      saveAuth(data);
    } finally {
      setLoading(false);
    }
  }

  async function register(formData) {
    setLoading(true);
    try {
      const data = await apiRequest("/api/auth/register", {
        method: "POST",
        data: formData,
      });
      saveAuth(data);
    } finally {
      setLoading(false);
    }
  }

  function updateUser(newUser) {
    setUser(newUser);
    localStorage.setItem("vschat_user", JSON.stringify(newUser));
  }

  function logout() {
    localStorage.removeItem("vschat_token");
    localStorage.removeItem("vschat_user");
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout, updateUser }),
    [token, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth phải nằm trong AuthProvider");
  return value;
}
