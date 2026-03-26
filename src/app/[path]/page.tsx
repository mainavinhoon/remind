import { getRedis } from "@/lib/redis";
import RemindClient from "./RemindClient";

interface Props { params: Promise<{ path: string }> }

export default async function RemindPage({ params }: Props) {
  const { path } = await params;

  // Fetch existing clipboard content server-side (no flash)
  let initialContent = "";
  try {
    const raw = await getRedis().get(`remnd:clip:${path}`);
    initialContent = typeof raw === "string" ? raw : raw ? JSON.stringify(raw) : "";
  } catch { /* Redis not configured yet — ignore */ }

  return <RemindClient path={path} initialContent={initialContent} />;
}
