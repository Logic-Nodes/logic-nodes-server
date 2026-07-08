import { runRenewalNotificationsJob } from "../../../jobs/renewal-notifications.job.js";

const minutes = (value) => value * 60 * 1000;

export const startBackgroundJobs = () => {
  if (process.env.ENABLE_BACKGROUND_JOBS === "false") {
    console.log("Background jobs disabled");
    return;
  }

  const renewalInterval = minutes(Number(process.env.RENEWAL_JOB_INTERVAL_MINUTES || 720));

  setInterval(async () => {
    try {
      await runRenewalNotificationsJob();
    } catch (error) {
      console.error("[job:renewal] failed:", error.message);
    }
  }, renewalInterval);

  console.log("Background jobs scheduled (renewal notifications)");
};
