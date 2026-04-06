import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "../../../lib/redis"; // Correct relative path from src/app/api/notify
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import {
  buildPushPayload,
  type PushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";

import {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
} from "../../../lib/vapid";

export const runtime = "edge";

async function handler(req: NextRequest) {
  console.log("[notify] Request received");

  // Type-safety check for environment variables
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("[notify] Missing VAPID keys. Check Cloudflare Dashboard.");
    return NextResponse.json(
      { error: "VAPID keys not configured" },
      { status: 500 }
    );
  }

  const vapid: VapidKeys = {
    subject: VAPID_SUBJECT!,
    publicKey: VAPID_PUBLIC_KEY!,
    privateKey: VAPID_PRIVATE_KEY!,
  };

  try {
    const { path, redisKey } = (await req.json()) as {
      path: string;
      redisKey: string;
    };
    console.log(`[notify] Processing redisKey: ${redisKey}`);

    if (!redisKey) {
      console.warn("[notify] Missing redisKey in request");
      return NextResponse.json({ error: "Missing redisKey" }, { status: 400 });
    }

    // Fetch the stored reminder
    const raw = await getRedis().get(redisKey);
    if (!raw) {
      console.log("[notify] Reminder not found or expired. Skipping.");
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { content, subscription } = (
      typeof raw === "string" ? JSON.parse(raw) : raw
    ) as {
      content: string;
      subscription: PushSubscription;
    };

    console.log("[notify] Building push payload...");
    const messageData = JSON.stringify({
      title: "remnd",
      body: content,
      path,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
    });

    // library expects an object with 'data'
    const payload = await buildPushPayload(
      { data: messageData },
      subscription,
      vapid
    );

    console.log(`[notify] Sending push via fetch to: ${subscription.endpoint}`);

    // Spread the payload into fetch options.
    // Cast to 'any' to avoid strict TypeScript differences in fetch implementations
    const res = await fetch(subscription.endpoint, {
      ...(payload as any),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        `[notify] Push service error ${res.status}: ${errorText.slice(0, 100)}`
      );
    } else {
      console.log("[notify] Push sent successfully");
    }

    // Delete the key immediately — ephemeral by design
    await getRedis().del(redisKey);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify] Internal exception:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Wrap with QStash signature verification so only QStash can call this
export const POST = verifySignatureAppRouter(handler);





