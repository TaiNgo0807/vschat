import PushSubscription from "../models/PushSubscription.js";

export async function getPublicVapidKey(req, res) {
  return res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY,
  });
}

export async function subscribePush(req, res) {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Subscription không hợp lệ" });
    }

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: req.user._id,
        endpoint,
        keys,
        userAgent: req.headers["user-agent"] || "",
      },
      { upsert: true, new: true },
    );

    return res.json({
      message: "Đã bật thông báo",
      subscription,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function unsubscribePush(req, res) {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ message: "Thiếu endpoint" });
    }

    await PushSubscription.deleteOne({
      endpoint,
      user: req.user._id,
    });

    return res.json({ message: "Đã tắt thông báo" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
