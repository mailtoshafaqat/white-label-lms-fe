"use client";

import { useEffect, useRef, useState } from "react";
import { UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useErrorToast } from "@/components/error-toast-provider";
import { adminApi, API_BASE_URL, type StudentListItemDto } from "@/lib/api";

function photoSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
}

export function StudentProfilePanel({
  student,
  onClose,
  onUpdated,
}: {
  student: StudentListItemDto;
  onClose: () => void;
  onUpdated?: (pictureUrl: string | null, fullName: string) => void;
}) {
  const { showSuccess } = useErrorToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(student.fullName);
  const [phone, setPhone] = useState("");
  const [profileNotes, setProfileNotes] = useState("");
  const [pictureUrl, setPictureUrl] = useState<string | null>(student.profilePictureUrl);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getStudentProfile(student.userId)
      .then((p) => {
        setFullName(p.fullName);
        setPhone(p.phone ?? "");
        setProfileNotes(p.profileNotes ?? "");
        setPictureUrl(p.profilePictureUrl);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [student.userId]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const result = await adminApi.uploadStudentPhoto(file);
      setPictureUrl(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await adminApi.updateStudentProfile(student.userId, {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        profilePictureUrl: pictureUrl,
        profileNotes: profileNotes.trim() || null,
      });
      setPictureUrl(updated.profilePictureUrl);
      showSuccess("Profile saved.");
      onUpdated?.(updated.profilePictureUrl, updated.fullName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  const src = photoSrc(pictureUrl);

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">Profile for {student.fullName}</p>
        <button type="button" className="text-xs text-slate-500 hover:text-slate-800" onClick={onClose}>
          Close
        </button>
      </div>

      {loading ? (
        <p className="mt-2 text-xs text-slate-500">Loading…</p>
      ) : (
        <form className="mt-3 space-y-4" onSubmit={(e) => void handleSave(e)}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <UserCircle2 className="h-12 w-12" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Uploading…" : pictureUrl ? "Change photo" : "Upload photo"}
              </Button>
              {pictureUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPictureUrl(null)}
                >
                  Remove photo
                </Button>
              )}
              <p className="text-xs text-slate-500">PNG, JPEG, or WebP · max 2 MB</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Full name</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Login email</label>
              <input
                value={student.email}
                readOnly
                className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
              />
              <p className="mt-1 text-xs text-slate-500">Email is the login id and cannot be changed here.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Admin notes (internal)
              </label>
              <textarea
                value={profileNotes}
                onChange={(e) => setProfileNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes for your team — not visible to the student"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" size="sm" disabled={saving || uploading}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>
      )}
    </div>
  );
}
