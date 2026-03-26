"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToPush } from "@/lib/push";

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseDelay(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const hM = s.match(/(\d+)\s*h(?:our)?s?/);
  const mM = s.match(/(\d+)\s*m(?:in(?:ute)?s?)?(?!\s*s)/);
  const sM = s.match(/(\d+)\s*s(?:ec(?:ond)?s?)?/);
  const h = hM ? parseInt(hM[1]) : 0;
  const m = mM ? parseInt(mM[1]) : 0;
  const sc = sM ? parseInt(sM[1]) : 0;
  const total = h * 3600 + m * 60 + sc;
  if (total > 0) return total;
  const plain = parseInt(s);
  if (!isNaN(plain) && plain > 0) return plain * 60;
  return null;
}

function fmtDelay(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return [h && `${h}h`, m && `${m}m`, s && `${s}s`].filter(Boolean).join(" ");
}

function fmtCountdown(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60]
    .map((v) => String(v).padStart(2, "0")).join(":");
}

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 5)    return "just now";
  if (d < 60)   return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

interface ActiveReminder { content: string; fireAt: number; }

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { path: string; initialContent: string; }

export default function RemindClient({ path, initialContent }: Props) {
  const storageKey = `remnd_active_${path}`;

  const [content, setContent]         = useState(initialContent);
  const [delayRaw, setDelayRaw]       = useState("");
  const [delayErr, setDelayErr]       = useState(false);
  const [notifStatus, setNotifStatus] = useState<"unknown"|"granted"|"denied">("unknown");
  const [active, setActive]           = useState<ActiveReminder | null>(null);
  const [loading, setLoading]         = useState(false);
  const [msg, setMsg]                 = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [countdown, setCountdown]     = useState("--:--:--");
  const [clipSavedAt, setClipSavedAt] = useState<number | null>(null);
  const [clipLoaded, setClipLoaded]   = useState(!!initialContent);
  const [, tick]                      = useState(0);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  // ── Restore active reminder ───────────────────────────────────────────────
  useEffect(() => {
    const st = localStorage.getItem(storageKey);
    if (!st) return;
    try {
      const p: ActiveReminder = JSON.parse(st);
      if (p.fireAt > Date.now()) setActive(p);
      else localStorage.removeItem(storageKey);
    } catch { localStorage.removeItem(storageKey); }
  }, [storageKey]);

  // ── Countdown ticker ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) { clearInterval(timerRef.current!); setCountdown("--:--:--"); return; }
    const run = () => {
      const left = active.fireAt - Date.now();
      if (left <= 0) {
        clearInterval(timerRef.current!); setCountdown("00:00:00");
        setTimeout(() => { localStorage.removeItem(storageKey); setActive(null); }, 1500);
      } else setCountdown(fmtCountdown(left));
    };
    run(); timerRef.current = setInterval(run, 1000);
    return () => clearInterval(timerRef.current!);
  }, [active, storageKey]);

  // Refresh "saved X ago"
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // ── Register SW quietly ──────────────────────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    // Sync current permission state (no prompt)
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "granted") setNotifStatus("granted");
      else if (Notification.permission === "denied") setNotifStatus("denied");
    }
  }, []);

  // ── Get push subscription on demand (lazy) ────────────────────────────────
  const getSubscription = async (): Promise<PushSubscription | null> => {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    const sub = await subscribeToPush();
    if (sub) setNotifStatus("granted");
    else     setNotifStatus("denied");
    return sub;
  };

  // ── Create — handles both clipboard save and optional reminder ────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!content.trim()) { textareaRef.current?.focus(); return; }

    const delay = parseDelay(delayRaw);
    if (delayRaw.trim() && !delay) { setDelayErr(true); return; }

    setLoading(true);
    try {
      // Always save to clipboard
      const clipRes = await fetch("/api/clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: content.trim() }),
      });
      if (clipRes.ok) { setClipSavedAt(Date.now()); setClipLoaded(true); }

      // If a delay is set, also schedule a reminder
      if (delay) {
        const sub = await getSubscription();
        if (!sub) {
          setMsg({ type: "err", text: "Notification permission denied — reminder not set. Content was saved." });
          setLoading(false);
          return;
        }

        const res = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, content: content.trim(), delaySeconds: delay, subscription: sub }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Error"); }

        const fireAt = Date.now() + delay * 1000;
        localStorage.setItem(storageKey, JSON.stringify({ content: content.trim(), fireAt }));
        setActive({ content: content.trim(), fireAt });
        setDelayRaw("");
        setMsg({ type: "ok", text: `Saved + reminder in ${fmtDelay(delay)}.` });
      } else {
        setMsg({ type: "ok", text: "Saved to this URL." });
      }
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await fetch(`/api/clip?path=${encodeURIComponent(path)}`, { method: "DELETE" });
    setContent(""); setClipSavedAt(null); setClipLoaded(false); setMsg(null);
    textareaRef.current?.focus();
  };

  const canCreate = !loading && !!content.trim();
  const savedHint = clipSavedAt ? `Saved ${timeAgo(clipSavedAt)}` : clipLoaded ? "Loaded" : null;

  return (
    <div className="shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-inner">
          <span className="logo">remnd<span className="slug">.com/{path}</span></span>
          {savedHint && <span className="topbar-right">{savedHint}</span>}
        </div>
      </header>

      {/* Main */}
      <main className="main">
        {/* Active reminder bubble */}
        {active && (
          <div className="bubble-wrap">
            <div className="bubble">
              <div className="bubble-meta">
                <span className="bubble-tag">reminder</span>
                <span className="bubble-clock">{countdown}</span>
                <button className="btn-cancel" onClick={() => { localStorage.removeItem(storageKey); setActive(null); setMsg(null); }}>
                  cancel
                </button>
              </div>
              <p className="bubble-body">{active.content}</p>
            </div>
          </div>
        )}

        {msg && <p className={`status-msg ${msg.type}`}>{msg.text}</p>}

        {/* Writing area centered */}
        <div className="compose">
          {!content && (
            <div className="compose-placeholder">
              Whatever you've got, I've got you.
              So Drop Anything Here
            </div>
          )}
          <textarea
            ref={textareaRef}
            id="reminder-content"
            className="compose-textarea"
            placeholder=""
            rows={1}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              autoResize(e.target);
            }}
            disabled={loading}
            autoFocus={!initialContent}
          />
        </div>
      </main>

      {/* Bottom bar */}
      <div className="bottom-wrap">
        <form className="bottom-card" onSubmit={handleCreate} id="reminder-form">
          <input
            id="reminder-delay"
            type="text"
            className={`delay-input${delayErr ? " err" : ""}`}
            placeholder="want a reminder? try 30m, 1h, 2h30m…"
            value={delayRaw}
            onChange={(e) => { setDelayRaw(e.target.value); setDelayErr(false); }}
            disabled={loading}
            autoComplete="off"
          />

          {/* Show enable-notifications chip inline when delay is typed + not yet granted */}
          {delayRaw.trim() && notifStatus !== "granted" && notifStatus !== "denied" && (
            <button
              type="button"
              className="notif-chip"
              id="enable-notifications"
              onClick={async () => {
                const sub = await getSubscription();
                if (sub) setNotifStatus("granted");
              }}
            >
              <span className="ndot" />
              Allow notifications
            </button>
          )}
          {delayRaw.trim() && notifStatus === "denied" && (
            <span style={{ fontSize: "0.7rem", color: "var(--error)", flexShrink: 0, whiteSpace: "nowrap" }}>
              Notifications blocked
            </span>
          )}

          <button
            type="submit"
            id="create-btn"
            className="btn-create"
            disabled={!canCreate}
          >
            {loading ? <><span className="spinner" />Saving…</> : "Create"}
          </button>
        </form>

        <div className="bottom-hint">
          {clipLoaded
            ? <><span>{savedHint ?? "Synced to this URL"}</span><button className="hint-link" onClick={handleClear}>Clear</button></>
            : <span>Save syncs to this URL — open on any device to access</span>
          }
        </div>
      </div>
    </div>
  );
}
