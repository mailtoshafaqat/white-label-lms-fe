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
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentPageHowItWorks } from "@/components/admin-how-it-works-guide";
import { AdminNav } from "@/components/admin-nav";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  coursesApi,
  adminApi,
  type BundleDto,
  type SubjectDto,
  type SubjectDefinitionDto,
  type UnitDto,
  type TopicDto,
} from "@/lib/api";
import { getSession, isAdmin, canManageInstitute, type TenantFeatures } from "@/lib/auth";
import {
  parseProductProfile,
  profileBundleInPhrase,
  profileBundleLabel,
  profileBundleLabelPlural,
  profileBundleLabelTitle,
  quickAddTopicExamples,
} from "@/lib/product-profile";
import { useClientMounted } from "@/lib/use-auth-session";

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

function childCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function LevelBadge({ level }: { level: "Subject" | "Unit" | "Topic" }) {
  const styles = {
    Subject: "bg-indigo-50 text-indigo-700",
    Unit: "bg-amber-50 text-amber-800",
    Topic: "bg-emerald-50 text-emerald-700",
  } as const;
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[level]}`}
    >
      {level}
    </span>
  );
}

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

function InlineRename({
  value,
  onSave,
  className = "text-sm text-slate-600",
  editable = true,
}: {
  value: string;
  onSave: (title: string) => Promise<void>;
  className?: string;
  editable?: boolean;
}) {
  if (!editable) {
    return <span className={`truncate ${className}`}>{value}</span>;
  }
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInput(value);
  }, [value]);

  async function save() {
    const next = input.trim();
    if (!next) {
      setError("Title is required.");
      return;
    }
    if (next === value) {
      setEditing(false);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") {
                setInput(value);
                setEditing(false);
                setError(null);
              }
            }}
            className="h-7 min-w-0 flex-1 rounded border border-slate-300 px-2 text-sm"
            autoFocus
          />
          <button
            type="button"
            className="text-emerald-600 disabled:opacity-50"
            disabled={busy}
            onClick={() => void save()}
            title="Save title"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="text-slate-400"
            disabled={busy}
            onClick={() => {
              setInput(value);
              setEditing(false);
              setError(null);
            }}
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mt-0.5 text-[10px] text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`group flex min-w-0 items-center gap-1 text-left hover:text-slate-900 ${className}`}
      onClick={() => setEditing(true)}
      title="Rename"
    >
      <span className="truncate">{value}</span>
      <Pencil className="h-3 w-3 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100" />
    </button>
  );
}

function AddBatchSubject({
  bundleId,
  catalog,
  existingDefinitionIds,
  order,
  tenant,
  onCreated,
}: {
  bundleId: string;
  catalog: SubjectDefinitionDto[];
  existingDefinitionIds: Set<string>;
  order: number;
  tenant?: TenantFeatures | null;
  onCreated: (subject: SubjectDto) => void;
}) {
  const bundlePhrase = profileBundleInPhrase(tenant);
  const available = catalog.filter((d) => d.isActive && !existingDefinitionIds.has(d.id));
  const [definitionId, setDefinitionId] = useState("");
  const [includeShared, setIncludeShared] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!definitionId) return;
    setBusy(true);
    try {
      const def = catalog.find((d) => d.id === definitionId);
      const s = await adminApi.createSubject(bundleId, {
        title: def?.displayName ?? "",
        order,
        subjectDefinitionId: definitionId,
        includeSharedContent: includeShared && (def?.libraryUnitCount ?? 0) > 0,
      });
      onCreated(s);
      setDefinitionId("");
    } finally {
      setBusy(false);
    }
  }

  if (catalog.length === 0) {
    return (
      <p className="text-xs text-slate-600">
        No subjects in catalog.{" "}
        <a href="/admin/subjects" className="font-medium text-[var(--brand)] hover:underline">
          Add subjects to the catalog
        </a>{" "}
        first, then return here.
      </p>
    );
  }

  if (available.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        All catalog subjects are already in {bundlePhrase}. Add more in{" "}
        <a href="/admin/subjects" className="text-[var(--brand)] hover:underline">
          Subject catalog
        </a>
        .
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={definitionId}
          onChange={(e) => setDefinitionId(e.target.value)}
          className="h-8 min-w-[12rem] flex-1 rounded-md border border-slate-300 px-2 text-sm"
        >
          <option value="">Select subject…</option>
          {available.map((d) => (
            <option key={d.id} value={d.id}>
              {d.displayName}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void submit()}
          disabled={busy || !definitionId}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {definitionId && (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={includeShared}
            onChange={(e) => setIncludeShared(e.target.checked)}
          />
          Include shared library content for this catalog subject
        </label>
      )}
    </div>
  );
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
  tenant,
  onCreated,
}: {
  bundles: BundleDto[];
  allowedSubjectIds: Set<string> | null;
  tenant?: TenantFeatures | null;
  onCreated: (topicId: string) => void;
}) {
  const examples = quickAddTopicExamples(tenant);
  const bundleLabel = profileBundleLabel(tenant);
  const bundleLabelTitle = profileBundleLabelTitle(tenant);
  const [bundleId, setBundleId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadSubjectsForBundle(id: string) {
    return coursesApi
      .bundle(id)
      .then((d) =>
        setSubjects(
          d.subjects.filter((s) => !allowedSubjectIds || allowedSubjectIds.has(s.id))
        )
      )
      .catch(() => setSubjects([]));
  }

  function loadUnitsForSubject(id: string) {
    return coursesApi.units(id).then(setUnits).catch(() => setUnits([]));
  }

  useEffect(() => {
    if (!bundleId) {
      setSubjects([]);
      setSubjectId("");
      return;
    }
    void loadSubjectsForBundle(bundleId);
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
    void loadUnitsForSubject(subjectId);
    setUnitId("");
  }, [subjectId]);

  const bundleTitle = bundles.find((b) => b.id === bundleId)?.title;
  const subjectTitle = subjects.find((s) => s.id === subjectId)?.title;
  const unitTitle = units.find((u) => u.id === unitId)?.title;

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
        Each dropdown is a different level: <strong>{bundleLabel}</strong> is your{" "}
        {bundleLabel} (e.g. {examples.bundle}), <strong>subject</strong> is the
        discipline or module inside it (e.g. {examples.subject}). Their titles are not meant to
        match. Pick {bundleLabel} → subject → unit, then enter the topic name.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {(bundleTitle || subjectTitle || unitTitle) && (
        <p className="mt-2 rounded-md bg-white px-2.5 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200">
          <span className="font-medium text-slate-700">Selected path: </span>
          {[bundleTitle, subjectTitle, unitTitle].filter(Boolean).join(" › ")}
        </p>
      )}
      <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <div>
          <label htmlFor="quick-bundle" className="mb-1 block text-xs font-medium text-slate-700">
            {bundleLabelTitle}
          </label>
          <select
            id="quick-bundle"
            value={bundleId}
            onChange={(e) => setBundleId(e.target.value)}
            className={selectCls}
            required
          >
            <option value="">Select {bundleLabel}…</option>
            {bundles.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quick-subject" className="mb-1 block text-xs font-medium text-slate-700">
            Subject
          </label>
          <select
            id="quick-subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            onFocus={() => bundleId && void loadSubjectsForBundle(bundleId)}
            className={selectCls}
            disabled={!bundleId || subjects.length === 0}
            required
          >
            <option value="">{bundleId ? "Select subject…" : "Choose a bundle first"}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quick-unit" className="mb-1 block text-xs font-medium text-slate-700">
            Unit
          </label>
          <select
            id="quick-unit"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            onFocus={() => subjectId && void loadUnitsForSubject(subjectId)}
            className={selectCls}
            disabled={!subjectId || units.length === 0}
            required
          >
            <option value="">{subjectId ? "Select unit…" : "Choose a subject first"}</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quick-topic-title" className="mb-1 block text-xs font-medium text-slate-700">
            Topic title
          </label>
          <input
            id="quick-topic-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Periodic Table Trends"
            className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            required
          />
        </div>
        {bundleId && subjects.length === 0 && (
          <p className="sm:col-span-2 text-xs text-amber-800">
            No subjects in this bundle yet — add one under the bundle in the tree below, then open
            this subject list again.
          </p>
        )}
        {subjectId && units.length === 0 && (
          <p className="sm:col-span-2 text-xs text-amber-800">
            <strong>{subjectTitle}</strong> has no units yet — expand the bundle in the tree below,
            add a unit (e.g. &ldquo;Chapter 1&rdquo;), then select it here.
          </p>
        )}
        <Button type="submit" size="sm" disabled={busy || !unitId} className="sm:col-span-2 w-fit">
          {busy ? "Creating…" : "Create topic & open content"}
        </Button>
      </form>
    </section>
  );
}

function UnitNode({
  unit,
  onRequestDelete,
  onDeleted,
  onRenamed,
  canRenameStructure,
}: {
  unit: UnitDto;
  onRequestDelete: (pending: PendingDelete) => void;
  onDeleted: () => void;
  onRenamed?: (unit: UnitDto) => void;
  canRenameStructure: boolean;
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
        <LevelBadge level="Unit" />
        {unit.isShared && (
          <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
            shared
          </span>
        )}
        <InlineRename
          value={unit.title}
          className="text-sm text-slate-700"
          editable={canRenameStructure && !unit.isShared}
          onSave={async (next) => {
            const updated = await adminApi.updateUnit(unit.id, { title: next });
            onRenamed?.(updated);
          }}
        />
        <span className="text-xs text-slate-400" title="Topics inside this unit">
          · {childCountLabel(unit.topicCount, "topic")}
        </span>
        <Link
          href={`/admin/units/${unit.id}/tests`}
          className="ml-auto text-xs text-[var(--brand)] hover:underline"
          title="Configure unit and PYQ tests"
        >
          Tests
        </Link>
        {!unit.isShared && (
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
            className="text-slate-400 hover:text-red-600"
            title="Delete unit"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="space-y-1 pb-2">
          {topics.map((t) => (
            <div key={t.id} className="ml-4 flex items-center gap-2 py-0.5">
              <LevelBadge level="Topic" />
              <InlineRename
                value={t.title}
                className="min-w-0 flex-1 text-sm text-slate-600"
                editable={canRenameStructure}
                onSave={async (next) => {
                  const updated = await adminApi.updateTopic(t.id, { title: next });
                  setTopics((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
                }}
              />
              <Link
                href={`/admin/topics/${t.id}`}
                className="flex shrink-0 items-center gap-1 text-xs text-[var(--brand)] hover:underline"
                title="Edit lectures, notes, MCQs and flashcards"
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
  tenant,
  catalog,
  onRequestDelete,
  onDeleted,
  canDelete,
  canRenameStructure,
  onSharedSynced,
}: {
  subject: SubjectDto;
  tenant?: TenantFeatures | null;
  catalog: SubjectDefinitionDto[];
  onRequestDelete: (pending: PendingDelete) => void;
  onDeleted: () => void;
  canDelete: boolean;
  canRenameStructure: boolean;
  onSharedSynced?: () => void;
}) {
  const bundlePhrase = profileBundleInPhrase(tenant);
  const catalogDef = subject.subjectDefinitionId
    ? catalog.find((d) => d.id === subject.subjectDefinitionId)
    : undefined;
  const libraryCount = catalogDef?.libraryUnitCount ?? 0;
  const linkedShared = subject.sharedUnitLinkCount ?? 0;
  const needsSharedSync =
    Boolean(subject.linkedToCatalog) && libraryCount > 0 && linkedShared < libraryCount;

  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function load() {
    setUnits(await coursesApi.units(subject.id));
    setLoaded(true);
  }
  function toggle() {
    setOpen((o) => !o);
    if (!loaded) load();
  }

  async function syncSharedLibrary() {
    setSyncBusy(true);
    setSyncError(null);
    try {
      await adminApi.linkSharedUnits(subject.id);
      await load();
      onSharedSynced?.();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Could not link shared units");
    } finally {
      setSyncBusy(false);
    }
  }

  return (
    <div className="ml-4 border-l border-slate-200 pl-3">
      <div className="flex items-center gap-1 py-1">
        <button type="button" onClick={toggle} className="text-slate-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <LevelBadge level="Subject" />
        <span className="text-sm font-medium text-slate-800">{subject.title}</span>
        {subject.linkedToCatalog ? (
          <span
            className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-[var(--brand)]"
            title="Name comes from Subject catalog. To swap subjects, remove this and pick another from the dropdown below."
          >
            catalog
          </span>
        ) : (
          <span
            className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
            title="Delete and re-add from the catalog dropdown"
          >
            legacy
          </span>
        )}
        <span className="text-xs text-slate-400" title="Units inside this subject">
          · {childCountLabel(subject.unitCount, "unit")}
        </span>
        {needsSharedSync && canRenameStructure && (
          <button
            type="button"
            disabled={syncBusy}
            onClick={() => void syncSharedLibrary()}
            className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800 hover:bg-sky-100 disabled:opacity-50"
            title="Link all shared library units from the subject catalog"
          >
            {syncBusy ? "Linking…" : "Link shared library"}
          </button>
        )}
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
            className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-red-50 hover:text-red-700"
            title={
              subject.linkedToCatalog
                ? `Remove from ${bundlePhrase}, then pick the correct subject from the catalog dropdown`
                : `Remove subject from ${bundlePhrase}`
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>
      {syncError && <p className="ml-8 text-xs text-red-600">{syncError}</p>}
      {open && (
        <div className="pb-2">
          {units.map((u) => (
            <UnitNode
              key={u.id}
              unit={u}
              canRenameStructure={canRenameStructure}
              onRequestDelete={onRequestDelete}
              onDeleted={() => setUnits((prev) => prev.filter((x) => x.id !== u.id))}
              onRenamed={(updated) =>
                setUnits((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
              }
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
  tenant,
  onRequestDelete,
  allowedSubjectIds,
  manageStructure,
  searchQuery,
  bundlePriceEdit,
  onBundleUpdated,
  catalog,
}: {
  bundle: BundleDto;
  tenant?: TenantFeatures | null;
  onRequestDelete: (pending: PendingDelete) => void;
  allowedSubjectIds: Set<string> | null;
  manageStructure: boolean;
  searchQuery: string;
  bundlePriceEdit: boolean;
  onBundleUpdated: (id: string, patch: Partial<BundleDto>) => void;
  catalog: SubjectDefinitionDto[];
}) {
  const bundleLabelTitle = profileBundleLabelTitle(tenant);
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(String(bundle.price));
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [videosOnly, setVideosOnly] = useState(bundle.videosOnly);

  useEffect(() => {
    setPriceInput(String(bundle.price));
    setVideosOnly(bundle.videosOnly);
  }, [bundle.price, bundle.videosOnly]);

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
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          {bundleLabelTitle}
        </span>
        <span className="font-semibold text-slate-900">{bundle.title}</span>
        {videosOnly && (
          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
            Videos only
          </span>
        )}
        {manageStructure && (
          <label className="ml-1 flex items-center gap-1 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={videosOnly}
              onChange={async (e) => {
                const next = e.target.checked;
                setVideosOnly(next);
                try {
                  const updated = await adminApi.updateBundle(bundle.id, {
                    price: bundle.price,
                    videosOnly: next,
                  });
                  onBundleUpdated(bundle.id, { videosOnly: updated.videosOnly });
                } catch {
                  setVideosOnly(!next);
                }
              }}
            />
            Video-lectures plan
          </label>
        )}
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
                    const updated = await adminApi.updateBundle(bundle.id, { price });
                    onBundleUpdated(bundle.id, { price: updated.price });
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
            <p className="ml-4 text-sm text-slate-500">
              No assigned subjects in {profileBundleInPhrase(tenant)}.
            </p>
          ) : (
            subjects.map((s) => (
              <SubjectNode
                key={s.id}
                subject={s}
                tenant={tenant}
                catalog={catalog}
                canDelete={manageStructure}
                canRenameStructure={manageStructure}
                onRequestDelete={onRequestDelete}
                onDeleted={() => setSubjects((prev) => prev.filter((x) => x.id !== s.id))}
                onSharedSynced={() => void load()}
              />
            ))
          )}
          {manageStructure && (
            <div className="ml-4 mt-1">
              <AddBatchSubject
                bundleId={bundle.id}
                tenant={tenant}
                catalog={catalog}
                existingDefinitionIds={
                  new Set(
                    subjects
                      .map((s) => s.subjectDefinitionId)
                      .filter((id): id is string => Boolean(id))
                  )
                }
                order={subjects.length + 1}
                onCreated={(s) => setSubjects((prev) => [...prev, s])}
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
  const [tenant, setTenant] = useState<TenantFeatures | null>(null);
  const [catalog, setCatalog] = useState<SubjectDefinitionDto[]>([]);
  const mounted = useClientMounted();
  const profileTenant = mounted ? tenant : null;

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
    setTenant(session.tenant ?? null);

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
                videosOnly: false,
              }))
            );
          });
        });

    Promise.all([
      load,
      institute ? adminApi.getBranding().catch(() => null) : Promise.resolve(null),
      institute ? adminApi.listSubjectDefinitions(true).catch(() => []) : Promise.resolve([]),
    ])
      .then(([, branding, catalogItems]) => {
        if (branding) setBundlePriceEdit(branding.bundlePriceEditEnabled);
        if (catalogItems) setCatalog(catalogItems);
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
          {manageStructure ? (
            <>
              Set up your course tree ({profileBundleLabel(profileTenant)} → subject → unit → topic).
              Subjects come from the{" "}
              <a href="/admin/subjects" className="font-medium text-[var(--brand)] hover:underline">
                subject catalog
              </a>
              . Use the pencil to rename units and topics; teachers use{" "}
              <span className="font-medium text-slate-700">Content</span> to add lectures, notes,
              MCQs and flashcards.
              {parseProductProfile(profileTenant?.productProfile) === "GeneralLms"
                ? " For a simple course, one unit per subject is enough."
                : " For a simple layout, use one unit per subject."}
            </>
          ) : (
            <>
              Open <span className="font-medium text-slate-700">Content</span> on your assigned topics
              to add lectures, notes, MCQs and flashcards. Ask your institute admin to rename or
              reorganize bundles, subjects, units, or topics.
            </>
          )}
        </p>

        <ContentPageHowItWorks manageStructure={manageStructure} />

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {!loading && bundles.length > 0 && manageStructure && (
          <QuickAddTopic
            bundles={bundles}
            allowedSubjectIds={allowedSubjectIds}
            tenant={profileTenant}
            onCreated={(topicId) => router.push(`/admin/topics/${topicId}`)}
          />
        )}

        {!loading && bundles.length > 0 && (
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
        )}

        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : bundles.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="font-medium text-slate-900">
                No {profileBundleLabelPlural(profileTenant)} yet
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {manageStructure
                  ? `Add your first ${profileBundleLabel(profileTenant)} below, then expand it with subjects, units, and topics — or use Quick add topic once the tree exists.`
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
                tenant={profileTenant}
                allowedSubjectIds={allowedSubjectIds}
                manageStructure={manageStructure}
                searchQuery={searchQuery}
                bundlePriceEdit={bundlePriceEdit}
                catalog={catalog}
                onBundleUpdated={(id, patch) =>
                  setBundles((prev) =>
                    prev.map((x) => (x.id === id ? { ...x, ...patch } : x))
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
        requireTypedConfirm="delete"
        loading={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deleteBusy) setPendingDelete(null);
        }}
      />
    </div>
  );
}
