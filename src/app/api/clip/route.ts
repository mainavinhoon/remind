import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

// 7-day clipboard TTL
const CLIP_TTL = 60 * 60 * 24 * 7;

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ content: null });

  try {
    const raw = await getRedis().get(`remnd:clip:${path}`);
    const content = typeof raw === "string" ? raw : raw ? JSON.stringify(raw) : null;
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { path, content } = await req.json();
    if (!path || !content?.trim()) {
      return NextResponse.json({ error: "Missing path or content" }, { status: 400 });
    }
    await getRedis().set(`remnd:clip:${path}`, content.trim(), { ex: CLIP_TTL });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[clip] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ ok: true });
  try {
    await getRedis().del(`remnd:clip:${path}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
