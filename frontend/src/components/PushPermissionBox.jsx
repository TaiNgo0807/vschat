import { useState } from "react";
import { enableWebPush } from "../utils/pushNotification";

export default function PushPermissionBox() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(
    localStorage.getItem("vschat_push_enabled") === "true",
  );

  async function handleEnablePush() {
    try {
      setLoading(true);

      await enableWebPush();

      localStorage.setItem("vschat_push_enabled", "true");
      setEnabled(true);

      alert("Đã bật thông báo VSChat");
    } catch (error) {
      console.log("Enable push error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (enabled) return null;

  return (
    <div className="push-permission-box">
      <div>
        <strong>Bật thông báo tin nhắn</strong>
        <p>Nhận thông báo khi có tin nhắn mới trong VSChat.</p>
      </div>

      <button type="button" onClick={handleEnablePush} disabled={loading}>
        {loading ? "Đang bật..." : "Bật thông báo"}
      </button>
    </div>
  );
}
