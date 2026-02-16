import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();

export const accountCleanup = onSchedule("every 24 hours", async () => {
  const auth = admin.auth();
  const DAYS_OLD = 15;
  const msCutoff = Date.now() - (DAYS_OLD * 24 * 60 * 60 * 1000);
  const anonymousUserIds: string[] = [];

  const fetchAnonymousUsers = async (nextPageToken?: string): Promise<void> => {
    const result = await auth.listUsers(1000, nextPageToken);
    result.users.forEach((user) => {
      const lastLogin = Date.parse(user.metadata.lastSignInTime);
      if (user.providerData.length === 0 && lastLogin < msCutoff) {
        anonymousUserIds.push(user.uid);
      }
    });
    if (result.pageToken) {
      await fetchAnonymousUsers(result.pageToken);
    }
  };

  try {
    await fetchAnonymousUsers();
    if (anonymousUserIds.length === 0) {
      return;
    }
    const batches = [];
    while (anonymousUserIds.length > 0) {
      const batch = anonymousUserIds.splice(0, 1000);
      batches.push(auth.deleteUsers(batch));
    }
    await Promise.all(batches);
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
});
