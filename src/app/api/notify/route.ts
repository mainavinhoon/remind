import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import webpush from "web-push";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from "@/lib/vapid";

export const runtime = "edge"; 

async function handler(req: NextRequest) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("[notify] Missing VAPID keys. Skipping notification.");
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  try {
    const { path, redisKey } = await req.json();

    if (!redisKey) {
      return NextResponse.json({ error: "Missing redisKey" }, { status: 400 });
    }

    // Fetch the stored reminder
    const raw = await getRedis().get(redisKey);
    if (!raw) {
      // Already expired or never set — silently succeed
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { content, subscription } = JSON.parse(
      typeof raw === "string" ? raw : JSON.stringify(raw)
    ) as {
      content: string;
      subscription: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
    };

    const wpSub: webpush.PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    // Fire the Web Push notification
    await webpush.sendNotification(
      wpSub,
      JSON.stringify({
        title: "remnd",
        body: content,
        path,
        icon: "/icon-192.png",
        badge: "/badge-72.png",
      })
    );

    // Delete the key immediately — ephemeral by design
    await getRedis().del(redisKey);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Wrap with QStash signature verification so only QStash can call this
export const POST = verifySignatureAppRouter(handler);
