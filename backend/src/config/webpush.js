import webPush from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:admin@vietsangchat.space";

if (!publicKey || !privateKey) {
  console.error("Thiếu VAPID key cho Web Push");
}

webPush.setVapidDetails(subject, publicKey, privateKey);

export default webPush;
