import AuthForm from "./components/AuthForm";
import { useAuth } from "./context/AuthContext";
import ChatPage from "./pages/ChatPage";

export default function App() {
  const { user } = useAuth();
  return user ? <ChatPage /> : <AuthForm />;
}
