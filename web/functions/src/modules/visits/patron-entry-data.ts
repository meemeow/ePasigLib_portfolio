/**
 * NFC entry logging — paused, not abandoned. Read this before deleting anything.
 *
 * Every handler below is commented out, and so is the export block in
 * `index.ts` under "Patron Entry Data NFC". That makes this file look like dead
 * code from the inside. It is not: the Realtime Database it reads,
 * `epasiglib-default-rtdb`, holds live data — a roster under `patrons/{cardUID}`
 * mapping physical NFC card UIDs to patron names and public UIDs.
 *
 * That roster is the thing to be careful about. It is the only record of which
 * card belongs to whom, and it exists nowhere else in the project — not in
 * Firestore, not in a fixture, not in a backup. Deleting the RTDB instance
 * because "the code that uses it is commented out" would destroy it, and
 * rebuilding it means physically re-tapping every card at the reader.
 *
 * So the instance stays, deliberately, while the feature is paused. It is
 * locked down (unauthenticated reads are refused) and it is not referenced from
 * `firebase.json`, which has no `database` block — meaning `firebase deploy`
 * never touches its rules, and they are managed in the console instead.
 *
 * Nothing currently writes Firestore `visits`, which is what the reports read;
 * `report-reads.ts` says the same where it reads them. Turning this back on
 * means uncommenting here, restoring the export in `index.ts`, and confirming
 * the reader hardware is still pointed at this instance.
 */

// import { getFirestore } from "firebase-admin/firestore";
// import { onValueUpdated, onValueCreated } from "firebase-functions/database";
// import { getDatabase } from "firebase-admin/database";
// import { onSchedule } from "firebase-functions/v2/scheduler";

// async function writeDataToFirestore(uid: string, data: any) {
//     const db = getFirestore();
//     const now = new Date();
//     const dateStr = now.toISOString().slice(0, 10);
//     const dayStr = now.toLocaleDateString("en-US", { weekday: "long" });
//     const docId = `${dateStr}_${dayStr}`;

//     const visitDocRef = db.collection("visits").doc(docId);
//     await visitDocRef.set({ exists: true }, { merge: true });

//     const visitsRef = visitDocRef.collection("patrons").doc(uid);

//     const visits = data.visits
//         ? Object.fromEntries(Object.entries(data.visits).filter(([k]) => k !== "0"))
//         : {};

//     await visitsRef.set({
//         uid: data.id ?? "",
//         publicUID: data.publicUID ?? "",
//         name: data.name ?? "",
//         visits: visits,
//         visitCount: data.visitCount ?? 0,
//     }, { merge: true });
// }

// export const logVisitDataCreated = onValueCreated("patrons/{uid}", async (event) => {
//     const uid = event.params.uid;
//     const data = event.data.val();
//     if (!data) return;
//     if (
//         (data.visits || Object.keys(data.visits).length >= 1) ||
//         (data.visitCount || data.visitCount >= 1)
//     ) {
//         return;
//     }
//     writeDataToFirestore(uid, data);
// }); 

// export const logVisitDataUpdated = onValueUpdated("patrons/{uid}", async (event) => {
//     const uid = event.params.uid;
//     const data = event.data.after.val();
//     if (!data) return;
//     if (
//         (!data.visits || Object.keys(data.visits).length === 0) ||
//         (!data.visitCount || data.visitCount === 0)
//     ) {
//         return;
//     }
//     writeDataToFirestore(uid, data);
// });

// export const resetPatronVisits = onSchedule(
//   {
//     schedule: "every day 18:00",
//     timeZone: "Asia/Manila",
//   },
//   async () => {
//     const rtdb = getDatabase();
//     const patronsRef = rtdb.ref("patrons");
//     const snapshot = await patronsRef.get();

//     if (!snapshot.exists()) return;

//     const updates: Record<string, any> = {};
//     Object.keys(snapshot.val()).forEach((uid) => {
//       updates[`${uid}/isVisited`] = false;
//       updates[`${uid}/visitCount`] = 0;
//       updates[`${uid}/visits`] = {};
//     });

//     await patronsRef.update(updates);
//   }
// );