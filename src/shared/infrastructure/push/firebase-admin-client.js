import fs from "node:fs";

import admin from "firebase-admin";

let initialized = false;

const loadServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (filePath && fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  return null;
};

export const getFirebaseMessaging = () => {
  if (initialized) {
    return admin.messaging();
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  initialized = true;
  return admin.messaging();
};

export const isFirebaseConfigured = () => Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_PATH
);
