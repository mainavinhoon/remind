import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { Client } from "@upstash/qstash";

export const runtime = "nodejs";

const qstash = new Client({   baseUrl: process.env.QSTASH_UR, token: process.env.QSTASH_TOKEN! });

export async function POST(req: NextRequest) {
  try {
    const { path, content, delaySeconds, subscription } = await req.json();

    if (!path || !content || !delaySeconds || !subscription) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate delay: between 10 seconds and 7 days
    const delay = Math.max(10, Math.min(delaySeconds, 60 * 60 * 24 * 7));

    // Store reminder data in Redis with TTL = delay + 1 hour grace period
    const redisKey = `remnd:${path}`;
    const payload = { path, content, subscription };
    await getRedis().set(redisKey, JSON.stringify(payload), { ex: delay + 3600 });

    // Build the absolute URL for the notify endpoint
    const host = req.headers.get("host") ?? "localhost:3000";
    const proto = host.startsWith("localhost") ? "http" : "https";
    const notifyUrl = `${proto}://${host}/api/notify`;

    // Schedule QStash to call /api/notify after `delay` seconds
    await qstash.publishJSON({
      url: notifyUrl,
      delay,
      body: { path, redisKey },
    });

    return NextResponse.json({ ok: true, delay });
  } catch (err) {
    console.error("[schedule] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
