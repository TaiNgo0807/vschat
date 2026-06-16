import { useState } from "react";
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from "../utils/notification";

export default function NotificationPermissionModal({ onDone }) {
  const [permission, setPermission] = useState(getNotificationPermission());
  const [loading, setLoading] = useState(false);

  async function handleEnableNotification() {
    try {
      setLoading(true);

      const result = await requestNotificationPermission();
      setPermission(result);

      if (result === "granted") {
        localStorage.setItem("vschat_notification_checked", "true");
        onDone();
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    localStorage.setItem("vschat_notification_checked", "true");
    onDone();
  }

  if (!isNotificationSupported()) {
    return (
      <div className="notify-overlay">
        <div className="notify-modal">
          <h2>Trình duyệt không hỗ trợ thông báo</h2>
          <p>Thiết bị hoặc trình duyệt này chưa hỗ trợ thông báo của VSChat.</p>

          <button type="button" onClick={onDone}>
            Tiếp tục
          </button>
        </div>
      </div>
    );
  }

  if (permission === "granted") {
    return null;
  }

  return (
    <div className="notify-overlay">
      <div className="notify-modal">
        <h2>Bật thông báo VSChat</h2>

        <p>Bật thông báo để nhận tin nhắn mới ngay cả khi đang mở tab khác.</p>

        <ul>
          <li>Nhận thông báo khi có tin nhắn mới.</li>
          <li>Biết nhanh ai vừa gửi tin.</li>
          <li>Bấm vào thông báo để quay lại VSChat.</li>
        </ul>

        {permission === "denied" && (
          <div className="notify-warning">
            Bạn đã chặn thông báo. Hãy mở cài đặt trình duyệt và cho phép thông
            báo của trang web này.
          </div>
        )}

        <div className="notify-actions">
          {permission !== "denied" && (
            <button
              type="button"
              className="notify-primary"
              onClick={handleEnableNotification}
              disabled={loading}
            >
              {loading ? "Đang mở..." : "Bật thông báo"}
            </button>
          )}

          <button
            type="button"
            className="notify-secondary"
            onClick={handleSkip}
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}
