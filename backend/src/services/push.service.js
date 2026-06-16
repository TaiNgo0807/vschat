import webPush from "../config/webpush.js";
import PushSubscription from "../models/PushSubscription.js";
import User from "../models/User.js";

export async function sendPushToUsers(userIds = [], payload = {}) {
  if (!userIds.length) return;

  const subscriptions = await PushSubscription.find({
    user: { $in: userIds },
  }).lean();

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          body,
        );
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await PushSubscription.deleteOne({ endpoint: sub.endpoint });
        } else {
          console.log("Push error:", error.message);
        }
      }
    }),
  );
}

export async function getPushRecipientsByGroup(group, senderId) {
  if (group.isDefault) {
    const users = await User.find({
      _id: { $ne: senderId },
    })
      .select("_id")
      .lean();

    return users.map((user) => user._id);
  }

  return (group.members || []).filter((memberId) => {
    return memberId.toString() !== senderId.toString();
  });
}
