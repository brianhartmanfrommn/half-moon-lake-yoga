import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatClassDate(timestamp: admin.firestore.Timestamp): string {
  return timestamp.toDate().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function getSubscriptionTokens(): Promise<string[]> {
  const snap = await admin.firestore().collection("subscriptions").get();
  return snap.docs.map((d) => d.id);
}

async function sendNotification(title: string, body: string): Promise<void> {
  const tokens = await getSubscriptionTokens();
  if (tokens.length === 0) return;

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {title, body},
    webpush: {
      notification: {icon: "/favicon.ico"},
    },
  });

  // Remove tokens that are no longer valid
  const staleTokens: string[] = [];
  response.responses.forEach((res, i) => {
    if (!res.success) staleTokens.push(tokens[i]);
  });

  if (staleTokens.length > 0) {
    const db = admin.firestore();
    await Promise.all(
      staleTokens.map((token) => db.collection("subscriptions").doc(token).delete())
    );
  }
}

// ── Class Notification Triggers ───────────────────────────────────────────────

export const onClassCreated = onDocumentCreated("classes/{classId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const dateStr = formatClassDate(data.date);
  await sendNotification(
    "New Class Added",
    `${dateStr} at ${data.location}`
  );
});

export const onClassUpdated = onDocumentUpdated("classes/{classId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  // Skip attendee-only changes (sign-ups/removals don't warrant a notification)
  const changedKeys = Object.keys(after).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])
  );
  if (changedKeys.length === 1 && changedKeys[0] === "attendees") return;

  const dateStr = formatClassDate(after.date);

  let title = "Class Updated";
  let body = `${dateStr} at ${after.location}`;

  if (!before.isCanceled && after.isCanceled) {
    title = "Class Canceled";
    body = `${dateStr} at ${after.location} has been canceled.`;
  } else if (before.isCanceled && !after.isCanceled) {
    title = "Class Reinstated";
    body = `${dateStr} at ${after.location} is back on!`;
  }

  await sendNotification(title, body);
});

export const onClassDeleted = onDocumentDeleted("classes/{classId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const dateStr = formatClassDate(data.date);
  await sendNotification(
    "Class Removed",
    `${dateStr} at ${data.location} has been removed.`
  );
});

// ── Account Cleanup ───────────────────────────────────────────────────────────

export const accountCleanup = onSchedule("every 24 hours", async () => {
  const auth = admin.auth();
  const DAYS_OLD = 15;
  const msCutoff = Date.now() - DAYS_OLD * 24 * 60 * 60 * 1000;
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
    if (anonymousUserIds.length === 0) return;

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
