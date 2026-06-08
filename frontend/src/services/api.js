import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vschat_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export async function apiRequest(url, options = {}) {
  try {
    const response = await api({ url, ...options });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || "Có lỗi xảy ra";
    throw new Error(message);
  }
}

export default api;
