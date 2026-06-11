"use client";

import { useEffect, useState } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminApi, type StudentGuardianDto, type StudentListItemDto } from "@/lib/api";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

export function StudentGuardiansPanel({
  student,
  onClose,
}: {
  student: StudentListItemDto;
  onClose: () => void;
}) {
  const [guardians, setGuardians] = useState<StudentGuardianDto[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [weekly, setWeekly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function reload() {
    return adminApi.listGuardians(student.userId).then(setGuardians);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [student.userId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await adminApi.createGuardian(student.userId, {
      name: name.trim(),
      email: email.trim(),
      weeklyReportsEnabled: weekly,
    });
    setName("");
    setEmail("");
    setWeekly(false);
    await reload();
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">
          Guardians for {student.fullName}
        </p>
        <button type="button" className="text-xs text-slate-500 hover:text-slate-800" onClick={onClose}>
          Close
        </button>
      </div>

      {message && <p className="mt-2 text-xs text-emerald-700">{message}</p>}

      {loading ? (
        <p className="mt-2 text-xs text-slate-500">Loading…</p>
      ) : (
        <>
          {guardians.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">No guardians added.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {guardians.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-slate-800">{g.name}</span>
                    <span className="ml-2 text-slate-500">{g.email}</span>
                    {g.weeklyReportsEnabled && (
                      <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                        Weekly
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-[var(--brand)] hover:underline"
                      onClick={async () => {
                        const res = await adminApi.sendGuardianReport(student.userId, g.id);
                        setMessage(
                          res.emailSent
                            ? `Report sent to ${g.email}`
                            : `Report prepared but email not sent (check SMTP)`
                        );
                      }}
                    >
                      <Mail className="h-3 w-3" /> Send report
                    </button>
                    <button
                      type="button"
                      className="text-slate-300 hover:text-red-600"
                      onClick={() =>
                        confirm({
                          title: "Remove guardian?",
                          description: `Remove ${g.name} (${g.email}) from this student?`,
                          confirmLabel: "Remove",
                          onConfirm: async () => {
                            await adminApi.deleteGuardian(student.userId, g.id);
                            await reload();
                          },
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form className="mt-3 grid gap-2 sm:grid-cols-3" onSubmit={handleAdd}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Guardian name"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              required
            />
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} />
              Weekly reports
            </label>
            <Button type="submit" size="sm" className="sm:col-span-3 w-fit">
              <Plus className="h-3.5 w-3.5" /> Add guardian
            </Button>
          </form>
        </>
      )}
      {confirmDialog}
    </div>
  );
}
