import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";

const AuthContext = createContext(null);

function getSavedUser() {
  const savedUser = localStorage.getItem("vschat_user");

  if (!savedUser || savedUser === "undefined" || savedUser === "null") {
    localStorage.removeItem("vschat_user");
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    console.log("Parse saved user failed:", error);
    localStorage.removeItem("vschat_user");
    return null;
  }
}

function getSavedToken() {
  const savedToken = localStorage.getItem("vschat_token");

  if (!savedToken || savedToken === "undefined" || savedToken === "null") {
    localStorage.removeItem("vschat_token");
    return null;
  }

  return savedToken;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getSavedToken());
  const [user, setUser] = useState(() => getSavedUser());
  const [loading, setLoading] = useState(false);

  function logout() {
    localStorage.removeItem("vschat_token");
    localStorage.removeItem("vschat_user");
    setToken(null);
    setUser(null);
  }

  useEffect(() => {
    async function loadMe() {
      if (!token) return;

      try {
        const data = await apiRequest("/api/auth/me");

        if (!data?.user) {
          throw new Error("API /api/auth/me không trả về user");
        }

        setUser(data.user);
        localStorage.setItem("vschat_user", JSON.stringify(data.user));
      } catch (error) {
        console.log("Load me failed:", error);
        logout();
      }
    }

    loadMe();
  }, [token]);

  function saveAuth(data) {
    if (!data?.token || !data?.user) {
      console.log("Auth response sai format:", data);
      throw new Error("API login/register phải trả về token và user");
    }

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
      return data;
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
      return data;
    } finally {
      setLoading(false);
    }
  }

  function updateUser(newUser) {
    if (!newUser) return;

    setUser(newUser);
    localStorage.setItem("vschat_user", JSON.stringify(newUser));
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
    }),
    [token, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth phải nằm trong AuthProvider");
  }

  return value;
}
