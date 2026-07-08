import { query } from "../shared/infrastructure/db/postgres.js";
import { createNotification, sendNotificationNow } from "../contexts/alerts/application/alert-service.js";

const NOTICE_DAYS = Number(process.env.SUBSCRIPTION_NOTICE_DAYS || 7);

export const runRenewalNotificationsJob = async () => {
  const expiring = await query(
    `
      SELECT s.id AS "subscriptionId",
             s.user_id AS "userId",
             s.renewal,
             u.email
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      WHERE s.status = 'ACTIVE'
        AND s.renewal <= CURRENT_DATE + ($1 || ' days')::interval
    `,
    [String(NOTICE_DAYS)]
  );

  for (const subscription of expiring) {
    const existing = await query(
      `
        SELECT n.id
        FROM notifications n
        JOIN alerts a ON a.id = n.alert_id
        WHERE n.message ILIKE $1
          AND n.created_at >= CURRENT_DATE
        LIMIT 1
      `,
      [`%subscription ${subscription.subscriptionId}%`]
    );
    if (existing.length > 0) {
      continue;
    }

    const alertRows = await query(
      `
        INSERT INTO alerts (alert_type, alert_status)
        VALUES ('OTHER', 'OPEN')
        RETURNING id
      `
    );
    const alertId = alertRows[0].id;

    const notification = await createNotification({
      alertId,
      notificationChannel: "PUSH",
      message: `Subscription ${subscription.subscriptionId} renews on ${subscription.renewal}. Update your payment method to avoid interruption.`
    });

    await sendNotificationNow(notification.id, subscription.userId);
    console.log(`[job:renewal] notification ${notification.id} for user ${subscription.userId}`);
  }
};
