"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { API_BASE_URL, authApi, progressApi, type NotificationDto } from "@/lib/api";
import { loadAndApplyBranding, type BrandingDto } from "@/lib/branding";
import { clearSession, getSession, isAdmin, isSuperAdmin } from "@/lib/auth";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type StudentNavProps = {
  branding?: BrandingDto | null;
  showAdminLink?: boolean;
};

export function StudentNav({ branding: brandingProp, showAdminLink }: StudentNavProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [branding, setBranding] = useState<BrandingDto | null>(brandingProp ?? null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const session = getSession();
  const admin = session ? isAdmin(session) : false;
  const superAdmin = session ? isSuperAdmin(session) : false;

  useEffect(() => {
    if (!session) return;
    setName(session.fullName);
    void authApi.me().then((p) => {
      setName(p.fullName);
      setProfilePictureUrl(p.profilePictureUrl);
    });
    if (!brandingProp) {
      loadAndApplyBranding().then(setBranding);
    }
    void refreshNotifications();
  }, [brandingProp, session]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function refreshNotifications() {
    try {
      const res = await progressApi.notifications();
      setUnreadCount(res.unreadCount);
      setNotifications(res.items);
    } catch {
      /* optional */
    }
  }

  async function markRead(n: NotificationDto) {
    if (!n.isRead) {
      await progressApi.markNotificationRead(n.id).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
      );
    }
    setOpen(false);
    if (n.linkUrl) router.push(n.linkUrl);
  }

  async function markAllRead() {
    await progressApi.markAllNotificationsRead().catch(() => {});
    setUnreadCount(0);
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <BrandHeader branding={branding} />
        <div className="flex items-center gap-3 text-sm">
          {showAdminLink !== false && superAdmin && (
            <Link href="/superadmin" className="font-medium text-slate-800 hover:underline">
              Platform
            </Link>
          )}
          {showAdminLink !== false && admin && !superAdmin && (
            <Link href="/admin" className="font-medium text-[var(--brand)] hover:underline">
              Admin
            </Link>
          )}
          <div className="relative" ref={panelRef}>
            <button
              type="button"
              onClick={() => {
                setOpen((v) => !v);
                if (!open) void refreshNotifications();
              }}
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {open && (
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <span className="text-sm font-semibold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      className="text-xs font-medium text-[var(--brand)] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <ul className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet</li>
                  ) : (
                    notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => void markRead(n)}
                          className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${
                            !n.isRead ? "bg-[var(--brand)]/5" : ""
                          }`}
                        >
                          <p className="text-sm font-medium text-slate-900">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.body}</p>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
          <Link href="/account/password" className="hidden text-slate-500 hover:text-slate-800 sm:inline">
            Password
          </Link>
          <button type="button" onClick={logout} className="text-slate-500 hover:text-slate-800">
            Log out
          </button>
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[var(--brand)] text-sm font-semibold text-white ring-2 ring-white shadow">
            {profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  profilePictureUrl.startsWith("http")
                    ? profilePictureUrl
                    : `${API_BASE_URL}${profilePictureUrl}`
                }
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initials(name || "A")
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
