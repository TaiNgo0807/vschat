export function isNotificationSupported() {
  return "Notification" in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export function showMessageNotification({ title, body, icon, tag, onClick }) {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;

  const notification = new Notification(title, {
    body,
    icon: icon || "/favicon.ico",
    tag,
    requireInteraction: false,
    silent: false,
  });

  notification.onclick = () => {
    window.focus();
    if (typeof onClick === "function") {
      onClick();
    }
    notification.close();
  };
}
