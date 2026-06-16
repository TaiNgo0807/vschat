import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  let data = {
    title: "VSChat",
    body: "Có tin nhắn mới",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    url: "/",
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "VSChat", {
      body: data.body || "Có tin nhắn mới",
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/icon-192.png",
      data: {
        url: data.url || "/",
        groupId: data.groupId || null,
        messageId: data.messageId || null,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();

            client.postMessage({
              type: "OPEN_CHAT_FROM_NOTIFICATION",
              groupId: event.notification.data?.groupId || null,
              messageId: event.notification.data?.messageId || null,
            });

            return;
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      }),
  );
});
