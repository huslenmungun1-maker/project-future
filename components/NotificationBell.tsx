"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/browserClient";

type Notification = {
  id: string;
  type: string;
  data: Record<string, string>;
  is_read: boolean;
  created_at: string;
};

function formatNotif(n: Notification): string {
  switch (n.type) {
    case "application_approved":
      return "Your creator application was approved.";
    case "application_rejected":
      return n.data?.review_notes
        ? `Application rejected: ${n.data.review_notes}`
        : "Your creator application was not approved.";
    case "new_follower":
      return `${n.data?.follower_name || "Someone"} started following you.`;
    default:
      return "New notification.";
  }
}

export default function NotificationBell() {
  const supabase = getBrowserClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    let alive = true;
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !alive) return;
      setUserId(session.user.id);

      const { data } = await supabase
        .from("notifications")
        .select("id,type,data,is_read,created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (alive) setNotifications((data as Notification[]) || []);
    }
    init();
    return () => { alive = false; };
  }, [supabase]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function markAllRead() {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  if (!userId) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
        style={{
          position: "relative", width: 34, height: 34,
          borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#eceae4", fontSize: 16,
        }}
      >
        {/* Bell SVG */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -3, right: -3,
            width: 16, height: 16, borderRadius: "50%",
            background: "#b6a07c", color: "#0a0a0c",
            fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 320, maxHeight: 400, overflowY: "auto",
          background: "#111113", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          zIndex: 9999,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#eceae4" }}>Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: 11, color: "#b6a07c", background: "none", border: "none", cursor: "pointer" }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: "20px 16px", color: "#7a7870", fontSize: 13, textAlign: "center" }}>
              No notifications yet.
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: n.is_read ? "transparent" : "rgba(182,160,124,0.05)",
                }}
              >
                {!n.is_read && (
                  <span style={{
                    display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                    background: "#b6a07c", marginRight: 8, verticalAlign: "middle",
                  }} />
                )}
                <span style={{ fontSize: 12, color: "#eceae4", lineHeight: 1.5 }}>
                  {formatNotif(n)}
                </span>
                <p style={{ fontSize: 10, color: "#7a7870", marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
