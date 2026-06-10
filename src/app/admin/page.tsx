"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  FileEdit,
  Search,
  ListChecks,
  Wand2,
  Check,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  coursesApi,
  adminApi,
  type BundleDto,
  type SubjectDto,
  type UnitDto,
  type TopicDto,
} from "@/lib/api";
import { getSession, isAdmin, canManageInstitute } from "@/lib/auth";

type DeleteKind = "bundle" | "subject" | "unit" | "topic";

type PendingDelete = {
  kind: DeleteKind;
  id: string;
  title: string;
  onDone: () => void;
};

type ContentPath = {
  bundleId: string;
  bundleTitle: string;
  subjectId: string;
  subjectTitle: string;
  unitId: string;
  unitTitle: string;
  topicId: string;
  topicTitle: string;
};

function deleteCopy(kind: DeleteKind, title: string): { title: string; description: string } {
  switch (kind) {
    case "bundle":
      return {
        title: "Delete bundle?",
        description: `Delete "${title}" and everything inside it (subjects, units, topics, and all content)? This cannot be undone.`,
      };
    case "subject":
      return {
        title: "Delete subject?",
        description: `Delete "${title}" and all its units and topics? This cannot be undone.`,
      };
    case "unit":
      return {
        title: "Delete unit?",
        description: `Delete "${title}" and all its topics? This cannot be undone.`,
      };
    case "topic":
      return {
        title: "Delete topic?",
        description: `Delete "${title}" and its lectures, notes, MCQs, and flashcards? This cannot be undone.`,
      };
  }
}

async function buildContentIndex(
  bundles: BundleDto[],
  allowedSubjectIds: Set<string> | null
): Promise<ContentPath[]> {
  const paths: ContentPath[] = [];
  for (const bundle of bundles) {
    const detail = await coursesApi.bundle(bundle.id);
    const subjects = detail.subjects.filter(
      (s) => !allowedSubjectIds || allowedSubjectIds.has(s.id)
    );
    for (const subject of subjects) {
      const units = await coursesApi.units(subject.id);
      for (const unit of units) {
        const topics = await coursesApi.topics(unit.id);
        for (const topic of topics) {
          paths.push({
            bundleId: bundle.id,
            bundleTitle: bundle.title,
            subjectId: subject.id,
            subjectTitle: subject.title,
            unitId: unit.id,
            unitTitle: unit.title,
            topicId: topic.id,
            topicTitle: topic.title,
          });
        }
      }
    }
  }
  return paths;
}

function InlineAdd({ label, onAdd }: { label: string; onAdd: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onAdd(title.trim());
      setTitle("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={label}
        className="h-8 flex-1 rounded-md border border-slate-300 px-2 text-sm"
      />
      <Button size="sm" variant="outline" onClick={submit} disabled={busy}>
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
    </div>
  );
}

function QuickAddTopic({
  bundles,
  allowedSubjectIds,
  onCreated,
}: {
  bundles: BundleDto[];
  allowedSubjectIds: Set<string> | null;
  onCreated: (topicId: string) => void;
}) {
  const [bundleId, setBundleId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bundleId) {
      setSubjects([]);
      setSubjectId("");
      return;
    }
    coursesApi
      .bundle(bundleId)
      .then((d) =>
        setSubjects(
          d.subjects.filter((s) => !allowedSubjectIds || allowedSubjectIds.has(s.id))
        )
      )
      .catch(() => setSubjects([]));
    setSubjectId("");
    setUnitId("");
    setUnits([]);
  }, [bundleId, allowedSubjectIds]);

  useEffect(() => {
    if (!subjectId) {
      setUnits([]);
      setUnitId("");
      return;
    }
    coursesApi
      .units(subjectId)
      .then(setUnits)
      .catch(() => setUnits([]));
    setUnitId("");
  }, [subjectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const topics = await coursesApi.topics(unitId);
      const topic = await adminApi.createTopic(unitId, {
        title: title.trim(),
        order: topics.length + 1,
        hasVideo: false,
      });
      setTitle("");
      onCreated(topic.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create topic");
    } finally {
      setBusy(false);
    }
  }

  const selectCls =
    "h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800";

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <h2 className="text-sm font-semibold text-slate-900">Quick add topic</h2>
      <p className="mt-0.5 text-xs text-slate-600">
        Pick bundle → subject → unit, name the topic, and jump straight to editing.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={submit}>
        <select
          value={bundleId}
          onChange={(e) => setBundleId(e.target.value)}
          className={selectCls}
          required
        >
          <option value="">Select bundle…</option>
          {bundles.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className={selectCls}
          disabled={!bundleId || subjects.length === 0}
          required
        >
          <option value="">Select subject…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className={selectCls}
          disabled={!subjectId || units.length === 0}
          required
        >
          <option value="">Select unit…</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.title}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New topic title"
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
          required
        />
        <Button type="submit" size="sm" disabled={busy || !unitId} className="sm:col-span-2 w-fit">
          {busy ? "Creating…" : "Create & edit content"}
        </Button>
      </form>
    </section>
  );
}

function UnitNode({
  unit,
  onRequestDelete,
  onDeleted,
}: {
  unit: UnitDto;
  onRequestDelete: (pending: PendingDelete) => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setTopics(await coursesApi.topics(unit.id));
    setLoaded(true);
  }
  function toggle() {
    setOpen((o) => !o);
    if (!loaded) load();
  }

  return (
    <div className="ml-4 border-l border-slate-200 pl-3">
      <div className="flex items-center gap-1 py-1">
        <button type="button" onClick={toggle} className="text-slate-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-sm text-slate-700">{unit.title}</span>
        <span className="text-xs text-slate-400">({unit.topicCount} topics)</span>
        <button
          type="button"
          onClick={() =>
            onRequestDelete({
              kind: "unit",
              id: unit.id,
              title: unit.title,
              onDone: onDeleted,
            })
          }
          className="ml-auto text-slate-400 hover:text-red-600"
          title="Delete unit"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && (
        <div className="space-y-1 pb-2">
          {topics.map((t) => (
            <div key={t.id} className="ml-4 flex items-center gap-2 py-0.5">
              <span className="text-sm text-slate-600">{t.title}</span>
              <Link
                href={`/admin/topics/${t.id}`}
                className="ml-auto flex items-center gap-1 text-xs text-[var(--brand)] hover:underline"
              >
                <FileEdit className="h-3.5 w-3.5" /> Content
              </Link>
              <button
                type="button"
                onClick={() =>
                  onRequestDelete({
                    kind: "topic",
                    id: t.id,
                    title: t.title,
                    onDone: () => setTopics((prev) => prev.filter((x) => x.id !== t.id)),
                  })
                }
                className="text-slate-400 hover:text-red-600"
                title="Delete topic"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="ml-4">
            <InlineAdd
              label="New topic title"
              onAdd={async (title) => {
                const topic = await adminApi.createTopic(unit.id, {
                  title,
                  order: topics.length + 1,
                  hasVideo: false,
                });
                setTopics((prev) => [...prev, topic]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SubjectNode({
  subject,
  onRequestDelete,
  onDeleted,
  canDelete,
}: {
  subject: SubjectDto;
  onRequestDelete: (pending: PendingDelete) => void;
  onDeleted: () => void;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setUnits(await coursesApi.units(subject.id));
    setLoaded(true);
  }
  function toggle() {
    setOpen((o) => !o);
    if (!loaded) load();
  }

  return (
    <div className="ml-4 border-l border-slate-200 pl-3">
      <div className="flex items-center gap-1 py-1">
        <button type="button" onClick={toggle} className="text-slate-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-sm font-medium text-slate-800">{subject.title}</span>
        <span className="text-xs text-slate-400">({subject.unitCount} units)</span>
        {canDelete && (
          <button
            type="button"
            onClick={() =>
              onRequestDelete({
                kind: "subject",
                id: subject.id,
                title: subject.title,
                onDone: onDeleted,
              })
            }
            className="ml-auto text-slate-400 hover:text-red-600"
            title="Delete subject"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="pb-2">
          {units.map((u) => (
            <UnitNode
              key={u.id}
              unit={u}
              onRequestDelete={onRequestDelete}
              onDeleted={() => setUnits((prev) => prev.filter((x) => x.id !== u.id))}
            />
          ))}
          <div className="ml-4 mt-1">
            <InlineAdd
              label="New unit title"
              onAdd={async (title) => {
                const u = await adminApi.createUnit(subject.id, { title, order: units.length + 1 });
                setUnits((prev) => [...prev, u]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function BundleNode({
  bundle,
  onRequestDelete,
  allowedSubjectIds,
  manageStructure,
  searchQuery,
  bundlePriceEdit,
  onPriceUpdated,
}: {
  bundle: BundleDto;
  onRequestDelete: (pending: PendingDelete) => void;
  allowedSubjectIds: Set<string> | null;
  manageStructure: boolean;
  searchQuery: string;
  bundlePriceEdit: boolean;
  onPriceUpdated: (id: string, price: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(String(bundle.price));
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    setPriceInput(String(bundle.price));
  }, [bundle.price]);

  const q = searchQuery.trim().toLowerCase();
  const titleMatch = !q || bundle.title.toLowerCase().includes(q);

  async function load() {
    const detail = await coursesApi.bundle(bundle.id);
    const subs = detail.subjects.filter(
      (s) => !allowedSubjectIds || allowedSubjectIds.has(s.id)
    );
    setSubjects(subs);
    setLoaded(true);
  }
  function toggle() {
    setOpen((o) => !o);
    if (!loaded) load();
  }

  useEffect(() => {
    if (q && titleMatch && !open) {
      setOpen(true);
      if (!loaded) load();
    }
  }, [q, titleMatch, open, loaded]);

  if (q && !titleMatch) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={toggle} className="text-slate-500">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
        <span className="font-semibold text-slate-900">{bundle.title}</span>
        {bundlePriceEdit && manageStructure ? (
          editingPrice ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">Rs.</span>
              <input
                type="number"
                min={0}
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="h-7 w-24 rounded border border-slate-300 px-2 text-xs"
              />
              <button
                type="button"
                className="text-emerald-600"
                disabled={priceSaving}
                onClick={async () => {
                  const price = Number(priceInput);
                  if (!Number.isFinite(price) || price < 0) {
                    setPriceError("Enter a valid price.");
                    return;
                  }
                  setPriceSaving(true);
                  setPriceError(null);
                  try {
                    await adminApi.updateBundle(bundle.id, { price });
                    onPriceUpdated(bundle.id, price);
                    setEditingPrice(false);
                  } catch (e) {
                    setPriceError(e instanceof Error ? e.message : "Could not save price");
                  } finally {
                    setPriceSaving(false);
                  }
                }}
              >
                <Check className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setEditingPrice(false)}>
                <Trash2 className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
              onClick={() => setEditingPrice(true)}
              title="Edit bundle price (Institute admin)"
            >
              Rs. {bundle.price.toLocaleString()}
              <Pencil className="h-3 w-3" />
            </button>
          )
        ) : (
          <span className="text-xs text-slate-400">Rs. {bundle.price.toLocaleString()}</span>
        )}
        {priceError && <span className="text-xs text-red-600">{priceError}</span>}
        {manageStructure && (
          <button
            type="button"
            onClick={() =>
              onRequestDelete({
                kind: "bundle",
                id: bundle.id,
                title: bundle.title,
                onDone: () => {},
              })
            }
            className="ml-auto text-slate-400 hover:text-red-600"
            title="Delete bundle"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2">
          {subjects.length === 0 ? (
            <p className="ml-4 text-sm text-slate-500">No assigned subjects in this bundle.</p>
          ) : (
            subjects.map((s) => (
              <SubjectNode
                key={s.id}
                subject={s}
                canDelete={manageStructure}
                onRequestDelete={onRequestDelete}
                onDeleted={() => setSubjects((prev) => prev.filter((x) => x.id !== s.id))}
              />
            ))
          )}
          {manageStructure && (
            <div className="ml-4 mt-1">
              <InlineAdd
                label="New subject title"
                onAdd={async (title) => {
                  const s = await adminApi.createSubject(bundle.id, {
                    title,
                    order: subjects.length + 1,
                  });
                  setSubjects((prev) => [...prev, s]);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [bundles, setBundles] = useState<BundleDto[]>([]);
  const [allowedSubjectIds, setAllowedSubjectIds] = useState<Set<string> | null>(null);
  const [manageStructure, setManageStructure] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [contentIndex, setContentIndex] = useState<ContentPath[]>([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [bundlePriceEdit, setBundlePriceEdit] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isAdmin(session)) {
      router.replace("/dashboard");
      return;
    }
    const institute = canManageInstitute(session);
    setManageStructure(institute);

    const load = institute
      ? coursesApi.bundles().then(setBundles)
      : adminApi.mySubjects().then((subs) => {
          setAllowedSubjectIds(new Set(subs.map((s) => s.subjectId)));
          const bundleIds = [...new Set(subs.map((s) => s.bundleId))];
          return Promise.all(bundleIds.map((id) => coursesApi.bundle(id))).then((details) => {
            setBundles(
              details.map((d) => ({
                id: d.id,
                title: d.title,
                subjectCount: d.subjects.length,
                price: 0,
              }))
            );
          });
        });

    Promise.all([
      load,
      institute ? adminApi.getBranding().catch(() => null) : Promise.resolve(null),
    ])
      .then(([, branding]) => {
        if (branding) setBundlePriceEdit(branding.bundlePriceEditEnabled);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadIndex = useCallback(async () => {
    if (bundles.length === 0) return;
    setIndexLoading(true);
    try {
      setContentIndex(await buildContentIndex(bundles, allowedSubjectIds));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed to load");
    } finally {
      setIndexLoading(false);
    }
  }, [bundles, allowedSubjectIds]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length >= 2 && bundles.length > 0) {
      void loadIndex();
    }
  }, [searchQuery, bundles.length, loadIndex]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return contentIndex.filter((p) => {
      const hay = [p.bundleTitle, p.subjectTitle, p.unitTitle, p.topicTitle]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [contentIndex, searchQuery]);

  function handleRequestDelete(pending: PendingDelete) {
    setPendingDelete(pending);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    setError(null);
    try {
      switch (pendingDelete.kind) {
        case "bundle":
          await adminApi.deleteBundle(pendingDelete.id);
          setBundles((prev) => prev.filter((x) => x.id !== pendingDelete.id));
          break;
        case "subject":
          await adminApi.deleteSubject(pendingDelete.id);
          break;
        case "unit":
          await adminApi.deleteUnit(pendingDelete.id);
          break;
        case "topic":
          await adminApi.deleteTopic(pendingDelete.id);
          break;
      }
      pendingDelete.onDone();
      if (searchQuery.trim().length >= 2) {
        void loadIndex();
      }
      setPendingDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  }

  const showSearchResults = searchQuery.trim().length >= 2;
  const deleteDialog = pendingDelete ? deleteCopy(pendingDelete.kind, pendingDelete.title) : null;

  return (
    <div className="min-h-screen">
      <AdminNav />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Course content</h1>
        <p className="mt-1 text-slate-600">
          Manage bundles → subjects → units → topics. Open a topic to edit its lectures, notes,
          MCQs and flashcards.
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {!loading && bundles.length > 0 && (
          <>
            <QuickAddTopic
              bundles={bundles}
              allowedSubjectIds={allowedSubjectIds}
              onCreated={(topicId) => router.push(`/admin/topics/${topicId}`)}
            />

            <div className="relative mt-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search topics by name or path…"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm"
              />
            </div>
          </>
        )}

        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : bundles.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="font-medium text-slate-900">No course bundles yet</p>
              <p className="mt-1 text-sm text-slate-600">
                {manageStructure
                  ? "Follow the setup checklist to launch your institute, then add your first bundle below."
                  : "Your institute admin has not assigned any subjects to you yet."}
              </p>
              {manageStructure && (
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/checklist">
                      <ListChecks className="h-4 w-4" />
                      Setup checklist
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/setup">
                      <Wand2 className="h-4 w-4" />
                      Setup wizard
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : showSearchResults ? (
            <>
              {indexLoading ? (
                <p className="text-sm text-slate-500">Searching…</p>
              ) : searchResults.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  No topics match &ldquo;{searchQuery.trim()}&rdquo;. Try another name or clear the
                  search to browse the tree.
                </p>
              ) : (
                <ul className="space-y-2">
                  {searchResults.map((p) => (
                    <li
                      key={p.topicId}
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <p className="text-xs text-slate-500">
                        {p.bundleTitle} › {p.subjectTitle} › {p.unitTitle}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">{p.topicTitle}</span>
                        <Link
                          href={`/admin/topics/${p.topicId}`}
                          className="inline-flex shrink-0 items-center gap-1 text-sm text-[var(--brand)] hover:underline"
                        >
                          <FileEdit className="h-3.5 w-3.5" />
                          Edit content
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                }}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Clear search and show full tree
              </button>
            </>
          ) : (
            bundles.map((b) => (
              <BundleNode
                key={b.id}
                bundle={b}
                allowedSubjectIds={allowedSubjectIds}
                manageStructure={manageStructure}
                searchQuery={searchQuery}
                bundlePriceEdit={bundlePriceEdit}
                onPriceUpdated={(id, price) =>
                  setBundles((prev) =>
                    prev.map((x) => (x.id === id ? { ...x, price } : x))
                  )
                }
                onRequestDelete={handleRequestDelete}
              />
            ))
          )}

          {manageStructure && !showSearchResults && (
            <div className="rounded-lg border border-dashed border-slate-300 p-3">
              <InlineAdd
                label="New bundle title"
                onAdd={async (title) => {
                  const b = await adminApi.createBundle({ title, price: 0, validityDays: 365 });
                  setBundles((prev) => [...prev, b]);
                }}
              />
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={deleteDialog?.title ?? ""}
        description={deleteDialog?.description ?? ""}
        confirmLabel="Delete"
        loading={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deleteBusy) setPendingDelete(null);
        }}
      />
    </div>
  );
}
