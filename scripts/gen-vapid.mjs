// Run once to generate VAPID keys:
//   node scripts/gen-vapid.mjs
//
// Then copy the output into your .env.local file.

import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log("\n VAPID keys generated — add these to .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log("");
 