"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Archive, ChevronDown, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/components/admin-nav";
import { SubjectCatalogHowItWorks } from "@/components/admin-how-it-works-guide";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { adminApi, type SubjectDefinitionDto, type UnitDto } from "@/lib/api";
import { getSession, canManageInstitute } from "@/lib/auth";
import { profileBundleLabel } from "@/lib/product-profile";

function AdminSubjectsContent() {
  const router = useRouter();
  const [items, setItems] = useState<SubjectDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [libraryUnits, setLibraryUnits] = useState<Record<string, UnitDto[]>>({});
  const [unitTitle, setUnitTitle] = useState("");
  const [unitBusy, setUnitBusy] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState<SubjectDefinitionDto | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const tenant = getSession()?.tenant;
  const bundleLabel = profileBundleLabel(tenant);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminApi.listSubjectDefinitions());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!canManageInstitute(session)) {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [router, load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await adminApi.createSubjectDefinition({
        displayName,
        sortOrder,
      });
      setDisplayName("");
      setSortOrder((items.length || 0) + 2);
      setItems((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create subject");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!libraryUnits[id]) {
      try {
        const units = await adminApi.listLibraryUnits(id);
        setLibraryUnits((prev) => ({ ...prev, [id]: units }));
      } catch {
        setLibraryUnits((prev) => ({ ...prev, [id]: [] }));
      }
    }
  }

  async function addLibraryUnit(definitionId: string) {
    if (!unitTitle.trim()) return;
    setUnitBusy(true);
    try {
      const order = (libraryUnits[definitionId]?.length ?? 0) + 1;
      const unit = await adminApi.createLibraryUnit(definitionId, {
        title: unitTitle.trim(),
        order,
      });
      setLibraryUnits((prev) => ({
        ...prev,
        [definitionId]: [...(prev[definitionId] ?? []), unit],
      }));
      setUnitTitle("");
      setItems((prev) =>
        prev.map((d) =>
          d.id === definitionId ? { ...d, libraryUnitCount: d.libraryUnitCount + 1 } : d
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add library unit");
    } finally {
      setUnitBusy(false);
    }
  }

  async function confirmArchive() {
    if (!archiveConfirm) return;
    setArchiveBusy(true);
    setError(null);
    try {
      const updated = await adminApi.archiveSubjectDefinition(archiveConfirm.id);
      setItems((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setArchiveConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not archive");
    } finally {
      setArchiveBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Subject catalog</h1>
        <p className="mt-1 text-slate-600">
          Define subjects once for your institute, then link them to courses on the Content page.
        </p>

        <SubjectCatalogHowItWorks />

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Add catalog subject</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-3" onSubmit={handleCreate}>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name (e.g. Physics)"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                title="Sort order"
              />
              <Button type="submit" disabled={submitting} className="w-fit sm:col-span-3">
                <Plus className="h-4 w-4" /> {submitting ? "Adding…" : "Add to catalog"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 space-y-3">
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-slate-500">
              No catalog subjects yet. Exam-prep tenants get a default template on first run.
            </p>
          ) : (
            items.map((item) => (
              <CatalogRow
                key={item.id}
                item={item}
                bundleLabel={bundleLabel}
                expanded={expandedId === item.id}
                units={libraryUnits[item.id]}
                unitTitle={expandedId === item.id ? unitTitle : ""}
                unitBusy={unitBusy}
                onToggle={() => void toggleExpand(item.id)}
                onArchive={() => setArchiveConfirm(item)}
                onUnitTitleChange={setUnitTitle}
                onAddUnit={() => void addLibraryUnit(item.id)}
                onUpdated={(updated) =>
                  setItems((prev) =>
                    prev
                      .map((d) => (d.id === updated.id ? updated : d))
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                  )
                }
              />
            ))
          )}
        </div>
      </main>

      <ConfirmDialog
        open={archiveConfirm !== null}
        title="Archive catalog subject?"
        description={
          archiveConfirm
            ? `"${archiveConfirm.displayName}" will be hidden from the "Select subject" dropdown when adding subjects to a ${bundleLabel}. ` +
              (archiveConfirm.linkedBatchCount > 0
                ? `${archiveConfirm.linkedBatchCount} existing ${bundleLabel} placement${
                    archiveConfirm.linkedBatchCount === 1 ? "" : "s"
                  } and any shared library units stay in place. `
                : "") +
              "You can add a new catalog entry later if you need this subject again."
            : ""
        }
        confirmLabel="Archive subject"
        loading={archiveBusy}
        onConfirm={() => void confirmArchive()}
        onCancel={() => {
          if (!archiveBusy) setArchiveConfirm(null);
        }}
      />
    </div>
  );
}

function CatalogRow({
  item,
  bundleLabel,
  expanded,
  units,
  unitTitle,
  unitBusy,
  onToggle,
  onArchive,
  onUnitTitleChange,
  onAddUnit,
  onUpdated,
}: {
  item: SubjectDefinitionDto;
  bundleLabel: string;
  expanded: boolean;
  units?: UnitDto[];
  unitTitle: string;
  unitBusy: boolean;
  onToggle: () => void;
  onArchive: () => void;
  onUnitTitleChange: (v: string) => void;
  onAddUnit: () => void;
  onUpdated: (item: SubjectDefinitionDto) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.displayName);
  const [order, setOrder] = useState(item.sortOrder);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const updated = await adminApi.updateSubjectDefinition(item.id, {
        displayName: name,
        sortOrder: order,
        isActive: item.isActive,
        category: item.category,
      });
      onUpdated(updated);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={!item.isActive ? "opacity-70" : undefined}>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">{item.displayName}</h2>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
              {item.code}
            </span>
            {!item.isActive && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                Archived
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {item.linkedBatchCount} {bundleLabel} placement{item.linkedBatchCount === 1 ? "" : "s"} ·{" "}
            {item.libraryUnitCount} shared unit{item.libraryUnitCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          {item.isActive && (
            <>
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onArchive}
                className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                title={`Archive — hide from new ${bundleLabel}s`}
              >
                <Archive className="h-3.5 w-3.5" />
                <span className="sr-only">Archive</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Shared library
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {editing && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 rounded border border-slate-300 px-2 text-sm"
          />
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="h-8 w-20 rounded border border-slate-300 px-2 text-sm"
          />
          <Button size="sm" disabled={busy} onClick={() => void save()}>
            <Check className="h-3.5 w-3.5" /> Save
          </Button>
          <button type="button" onClick={() => setEditing(false)} className="text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {expanded && (
        <CardContent className="border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">
            Shared units appear in every {bundleLabel} that links this catalog subject (via &quot;include
            shared content&quot; on the Content page).
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {(units ?? []).length === 0 ? (
              <li className="text-slate-500">No shared units yet.</li>
            ) : (
              units!.map((u) => (
                <li key={u.id} className="flex items-center gap-2 text-slate-700">
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                    shared
                  </span>
                  {u.title}
                  <span className="text-xs text-slate-400">({u.topicCount} topics)</span>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={unitTitle}
              onChange={(e) => onUnitTitleChange(e.target.value)}
              placeholder="New shared unit title"
              className="h-8 flex-1 rounded-md border border-slate-300 px-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && onAddUnit()}
            />
            <Button size="sm" variant="outline" disabled={unitBusy} onClick={onAddUnit}>
              <Plus className="h-3.5 w-3.5" /> Add unit
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function AdminSubjectsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-slate-500">Loading…</div>}>
      <AdminSubjectsContent />
    </Suspense>
  );
}
