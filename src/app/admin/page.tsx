"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import {
  coursesApi,
  adminApi,
  type BundleDto,
  type SubjectDto,
  type UnitDto,
  type TopicDto,
} from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";

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

function UnitNode({ unit, onDelete }: { unit: UnitDto; onDelete: () => void }) {
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
        <button onClick={toggle} className="text-slate-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-sm text-slate-700">{unit.title}</span>
        <span className="text-xs text-slate-400">({unit.topicCount} topics)</span>
        <button onClick={onDelete} className="ml-auto text-slate-300 hover:text-red-600">
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
                onClick={async () => {
                  await adminApi.deleteTopic(t.id);
                  setTopics((prev) => prev.filter((x) => x.id !== t.id));
                }}
                className="text-slate-300 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="ml-4">
            <InlineAdd
              label="New topic title"
              onAdd={async (title) => {
                const t = await adminApi.createTopic(unit.id, {
                  title,
                  order: topics.length + 1,
                  hasVideo: false,
                });
                setTopics((prev) => [...prev, t]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SubjectNode({ subject, onDelete }: { subject: SubjectDto; onDelete: () => void }) {
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
        <button onClick={toggle} className="text-slate-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-sm font-medium text-slate-800">{subject.title}</span>
        <span className="text-xs text-slate-400">({subject.unitCount} units)</span>
        <button onClick={onDelete} className="ml-auto text-slate-300 hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && (
        <div className="pb-2">
          {units.map((u) => (
            <UnitNode
              key={u.id}
              unit={u}
              onDelete={async () => {
                await adminApi.deleteUnit(u.id);
                setUnits((prev) => prev.filter((x) => x.id !== u.id));
              }}
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

function BundleNode({ bundle, onDelete }: { bundle: BundleDto; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const detail = await coursesApi.bundle(bundle.id);
    setSubjects(detail.subjects);
    setLoaded(true);
  }
  function toggle() {
    setOpen((o) => !o);
    if (!loaded) load();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <button onClick={toggle} className="text-slate-500">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
        <span className="font-semibold text-slate-900">{bundle.title}</span>
        <span className="text-xs text-slate-400">Rs. {bundle.price.toLocaleString()}</span>
        <button onClick={onDelete} className="ml-auto text-slate-300 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="mt-2">
          {subjects.map((s) => (
            <SubjectNode
              key={s.id}
              subject={s}
              onDelete={async () => {
                await adminApi.deleteSubject(s.id);
                setSubjects((prev) => prev.filter((x) => x.id !== s.id));
              }}
            />
          ))}
          <div className="ml-4 mt-1">
            <InlineAdd
              label="New subject title"
              onAdd={async (title) => {
                const s = await adminApi.createSubject(bundle.id, { title, order: subjects.length + 1 });
                setSubjects((prev) => [...prev, s]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [bundles, setBundles] = useState<BundleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    coursesApi
      .bundles()
      .then(setBundles)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen">
      <AdminNav />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Course content</h1>
        <p className="mt-1 text-slate-600">
          Manage bundles → subjects → units → topics. Open a topic to edit its lectures, notes, MCQs and flashcards.
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : (
            bundles.map((b) => (
              <BundleNode
                key={b.id}
                bundle={b}
                onDelete={async () => {
                  await adminApi.deleteBundle(b.id);
                  setBundles((prev) => prev.filter((x) => x.id !== b.id));
                }}
              />
            ))
          )}

          <div className="rounded-lg border border-dashed border-slate-300 p-3">
            <InlineAdd
              label="New bundle title"
              onAdd={async (title) => {
                const b = await adminApi.createBundle({ title, price: 0, validityDays: 365 });
                setBundles((prev) => [...prev, b]);
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
