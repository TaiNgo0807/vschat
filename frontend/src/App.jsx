import AuthForm from "./components/AuthForm";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ChatPage from "./pages/ChatPage";

// 1. Tạo một component phụ để check login bên trong Provider
function MainLayout() {
  const { user } = useAuth(); // ✅ Hợp lệ vì MainLayout nằm ĐẰNG TRONG AuthProvider
  return user ? <ChatPage /> : <AuthForm />;
}

// 2. Component App đóng vai trò bọc cấu hình tổng
export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
