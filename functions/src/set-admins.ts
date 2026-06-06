import * as admin from "firebase-admin";

/**
 * One-time utility script to grant admin custom claims to specific users.
 * To execute:
 * 1. cd functions
 * 2. In Firebase Console: Project Settings > Service Accounts > "Generate new private key".
 * 3. Save the file (e.g., to C:\keys\service-account.json). 
 *    DO NOT save it inside your git repo unless it is in .gitignore.
 * 4. In PowerShell, set the environment variable using the FULL path:
 *    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\www\keys\service-account.json"
 * 4. Run: npx ts-node src/set-admins.ts
 */

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const adminUids = [
  "faNuQ0lClXZVsknyt7NEUgR9MYj2",
  "RISXUint2cetEaNfW5nMdWd4RV43",
];

async function setAdminClaims() {
  await Promise.all(adminUids.map(uid => admin.auth().setCustomUserClaims(uid, { admin: true })));
  console.log("Successfully updated custom claims for admin users.");
}

setAdminClaims().catch(console.error);