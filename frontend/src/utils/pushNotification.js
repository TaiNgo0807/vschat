import { apiRequest } from "../services/api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index++) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

async function ensureServiceWorkerReady() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Trình duyệt không hỗ trợ Service Worker");
  }

  if (!window.isSecureContext) {
    throw new Error("Web Push cần HTTPS hoặc localhost");
  }

  let registration = await navigator.serviceWorker.getRegistration("/");

  if (!registration) {
    try {
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      console.log("Manual SW registered:", registration);
    } catch (error) {
      console.log("Manual SW register failed:", error);
      throw new Error(
        "Không đăng ký được Service Worker. Kiểm tra /sw.js có tồn tại sau khi build/deploy chưa.",
        { cause: error }
      );
    }
  } else {
    registration.update().catch(() => {});
  }

  return withTimeout(
    navigator.serviceWorker.ready,
    15000,
    "Service Worker chưa sẵn sàng. Hãy kiểm tra vite.config.js, main.jsx và build/deploy lại.",
  );
}

export async function enableWebPush() {
  if (!("PushManager" in window)) {
    throw new Error("Trình duyệt không hỗ trợ Web Push");
  }

  if (!("Notification" in window)) {
    throw new Error("Trình duyệt không hỗ trợ thông báo");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Bạn chưa cấp quyền thông báo");
  }

  const registration = await ensureServiceWorkerReady();

  const { publicKey } = await apiRequest("/api/push/public-key");

  if (!publicKey) {
    throw new Error("Backend chưa cấu hình VAPID_PUBLIC_KEY");
  }

  const existedSubscription = await registration.pushManager.getSubscription();

  if (existedSubscription) {
    await apiRequest("/api/push/subscribe", {
      method: "POST",
      data: existedSubscription.toJSON(),
    });

    return existedSubscription;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await apiRequest("/api/push/subscribe", {
    method: "POST",
    data: subscription.toJSON(),
  });

  return subscription;
}
