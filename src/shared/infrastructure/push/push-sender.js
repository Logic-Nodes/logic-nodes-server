import { query } from "../db/postgres.js";
import { getFirebaseMessaging } from "./firebase-admin-client.js";

const removeInvalidToken = async (token) => {
  await query(`DELETE FROM device_tokens WHERE token = $1`, [token]);
};

export const sendPushNotification = async ({ userId, title, body }) => {
  if (!userId) {
    return { delivered: 0, mode: "skipped", total: 0 };
  }

  const tokens = await query(
    `SELECT token, platform FROM device_tokens WHERE user_id = $1`,
    [userId]
  );

  if (tokens.length === 0) {
    console.log(`[push] skipped — no device tokens for user ${userId}`);
    return { delivered: 0, mode: "skipped", total: 0 };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    console.log(`[push] simulated → user ${userId}: ${title} — ${body}`);
    return { delivered: tokens.length, mode: "simulated", total: tokens.length };
  }

  let delivered = 0;
  for (const row of tokens) {
    try {
      await messaging.send({
        token: row.token,
        notification: {
          title: title || "OmniTrack",
          body: body || "Tienes una nueva notificación"
        }
      });
      delivered += 1;
    } catch (error) {
      const code = error?.code || error?.errorInfo?.code;
      console.error(`[push] token failed (${row.platform}):`, code || error.message);
      if (
        code === "messaging/registration-token-not-registered"
        || code === "messaging/invalid-registration-token"
      ) {
        await removeInvalidToken(row.token);
      }
    }
  }

  console.log(`[push] firebase delivered ${delivered}/${tokens.length} to user ${userId}`);
  return { delivered, mode: "firebase", total: tokens.length };
};
