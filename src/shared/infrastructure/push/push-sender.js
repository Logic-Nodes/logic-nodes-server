export const sendPushNotification = async ({ userId, title, body }) => {
  const { query } = await import("../db/postgres.js");
  const tokens = userId
    ? await query(`SELECT token, platform FROM device_tokens WHERE user_id = $1`, [userId])
    : [];

  if (tokens.length === 0) {
    console.log(`[push] skipped — no device tokens for user ${userId}`);
    return { delivered: 0, mode: "skipped" };
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.log(`[push] simulated → user ${userId}: ${title} — ${body}`);
    return { delivered: tokens.length, mode: "simulated" };
  }

  // Hook for firebase-admin when credentials are configured in Render.
  console.log(`[push] firebase configured — would deliver to ${tokens.length} token(s) for user ${userId}`);
  return { delivered: tokens.length, mode: "firebase" };
};
