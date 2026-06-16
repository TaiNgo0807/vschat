import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import App from "./App.jsx";
import "./style.css";

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    console.log("Service Worker registered:", swUrl, registration);
  },
  onRegisterError(error) {
    console.log("Service Worker register error:", error);
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
