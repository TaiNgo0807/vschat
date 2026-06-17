import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import App from "./App.jsx";
import "./style.css";

const CHECK_UPDATE_INTERVAL = 10 * 60 * 1000;

registerSW({
  immediate: true,

  onOfflineReady() {
    console.log("VSChat đã sẵn sàng chạy offline.");
  },

  onNeedRefresh() {
    console.log("VSChat có bản cập nhật mới.");
  },

  onRegisteredSW(swUrl, registration) {
    console.log("Service Worker registered:", swUrl, registration);

    if (!registration) return;

    setInterval(async () => {
      try {
        if (registration.installing) return;
        if (!navigator.onLine) return;

        const response = await fetch(swUrl, {
          cache: "no-store",
          headers: {
            cache: "no-store",
            "cache-control": "no-cache",
          },
        });

        if (response?.status === 200) {
          await registration.update();
        }
      } catch (error) {
        console.log("Check SW update error:", error);
      }
    }, CHECK_UPDATE_INTERVAL);
  },

  onRegisterError(error) {
    console.log("Service Worker register error:", error);
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
