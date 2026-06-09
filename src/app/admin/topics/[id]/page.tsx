"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  Trash2,
  Video,
  FileText,
  ClipboardList,
  Layers,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminApi,
  type LectureDto,
  type NoteDto,
  type AdminQuestionDto,
  type FlashcardDto,
} from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";

type QuestionForm = {
  stem: string;
  options: string[];
  correctKey: string;
  explanation: string;
};

type CardForm = { front: string; back: string };

function reorder<T extends { id: string }>(items: T[], id: string, dir: -1 | 1): T[] {
  const idx = items.findIndex((x) => x.id === id);
  const next = idx + dir;
  if (idx < 0 || next < 0 || next >= items.length) return items;
  const copy = [...items];
  [copy[idx], copy[next]] = [copy[next], copy[idx]];
  return copy;
}

export default function AdminTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = use(params);
  const router = useRouter();

  const [lectures, setLectures] = useState<LectureDto[]>([]);
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [questions, setQuestions] = useState<AdminQuestionDto[]>([]);
  const [cards, setCards] = useState<FlashcardDto[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [editingQuizTitle, setEditingQuizTitle] = useState(false);
  const [editingDeckTitle, setEditingDeckTitle] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lec, setLec] = useState({ title: "", url: "" });
  const [note, setNote] = useState({ title: "", contentHtml: "" });
  const [q, setQ] = useState<QuestionForm>({
    stem: "",
    options: ["", "", "", ""],
    correctKey: "0",
    explanation: "",
  });
  const [editQ, setEditQ] = useState<QuestionForm>({
    stem: "",
    options: ["", "", "", ""],
    correctKey: "0",
    explanation: "",
  });
  const [card, setCard] = useState<CardForm>({ front: "", back: "" });
  const [editCard, setEditCard] = useState<CardForm>({ front: "", back: "" });

  useEffect(() => {
    const session = getSession();
    if (!session) return router.replace("/login");
    if (!isAdmin(session)) return router.replace("/dashboard");

    Promise.all([
      adminApi.topicContent(topicId),
      adminApi.quiz(topicId),
      adminApi.deck(topicId),
    ])
      .then(([content, quiz, deck]) => {
        setLectures(content.lectures);
        setNotes(content.notes);
        setQuestions(quiz?.questions ?? []);
        setQuizTitle(quiz?.title ?? "Quiz");
        setCards(deck?.cards ?? []);
        setDeckTitle(deck?.title ?? "Flashcards");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [topicId, router]);

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : "Action failed");
  }

  function startEditQuestion(qq: AdminQuestionDto) {
    setEditingQuestionId(qq.id);
    setEditQ({
      stem: qq.stem,
      options: [...qq.options],
      correctKey: qq.correctKey,
      explanation: qq.explanation ?? "",
    });
  }

  function startEditCard(c: FlashcardDto) {
    setEditingCardId(c.id);
    setEditCard({ front: c.front, back: c.back });
  }

  async function saveQuizTitle() {
    try {
      await adminApi.updateQuizTitle(topicId, quizTitle.trim());
      setEditingQuizTitle(false);
      setError(null);
    } catch (e) {
      fail(e);
    }
  }

  async function saveDeckTitle() {
    try {
      await adminApi.updateDeckTitle(topicId, deckTitle.trim());
      setEditingDeckTitle(false);
      setError(null);
    } catch (e) {
      fail(e);
    }
  }

  async function moveQuestion(id: string, dir: -1 | 1) {
    const next = reorder(questions, id, dir);
    if (next === questions) return;
    try {
      await adminApi.reorderQuestions(
        topicId,
        next.map((x) => x.id)
      );
      setQuestions(next);
      setError(null);
    } catch (e) {
      fail(e);
    }
  }

  async function moveCard(id: string, dir: -1 | 1) {
    const next = reorder(cards, id, dir);
    if (next === cards) return;
    try {
      await adminApi.reorderCards(
        topicId,
        next.map((x) => x.id)
      );
      setCards(next);
      setError(null);
    } catch (e) {
      fail(e);
    }
  }

  const field = "h-9 w-full rounded-md border border-slate-300 px-2 text-sm";

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/admin" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-slate-900">Edit topic content</span>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading && <p className="text-slate-500">Loading…</p>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4 text-[var(--brand)]" /> Lectures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lectures.map((l) => (
              <div key={l.id} className="flex items-center gap-2 text-sm">
                <span className="text-slate-700">{l.title}</span>
                <span className="truncate text-xs text-slate-400">{l.url}</span>
                <button
                  className="ml-auto text-slate-300 hover:text-red-600"
                  onClick={async () => {
                    try {
                      await adminApi.deleteLecture(l.id);
                      setLectures((p) => p.filter((x) => x.id !== l.id));
                    } catch (e) {
                      fail(e);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={lec.title}
                onChange={(e) => setLec({ ...lec, title: e.target.value })}
                placeholder="Lecture title"
                className={field}
              />
              <input
                value={lec.url}
                onChange={(e) => setLec({ ...lec, url: e.target.value })}
                placeholder="Video URL (mp4/HLS)"
                className={field}
              />
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (!lec.title.trim()) return;
                try {
                  const created = await adminApi.addLecture(topicId, {
                    title: lec.title.trim(),
                    url: lec.url.trim(),
                    durationSec: 0,
                    order: lectures.length + 1,
                  });
                  setLectures((p) => [...p, created]);
                  setLec({ title: "", url: "" });
                } catch (e) {
                  fail(e);
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add lecture
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-[var(--brand)]" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="flex items-center gap-2 text-sm">
                <span className="text-slate-700">{n.title}</span>
                <button
                  className="ml-auto text-slate-300 hover:text-red-600"
                  onClick={async () => {
                    try {
                      await adminApi.deleteNote(n.id);
                      setNotes((p) => p.filter((x) => x.id !== n.id));
                    } catch (e) {
                      fail(e);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <input
              value={note.title}
              onChange={(e) => setNote({ ...note, title: e.target.value })}
              placeholder="Note title"
              className={field}
            />
            <textarea
              value={note.contentHtml}
              onChange={(e) => setNote({ ...note, contentHtml: e.target.value })}
              placeholder="Note content (HTML allowed)"
              rows={3}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <Button
              size="sm"
              onClick={async () => {
                if (!note.title.trim()) return;
                try {
                  const created = await adminApi.addNote(topicId, {
                    title: note.title.trim(),
                    contentHtml: note.contentHtml,
                    order: notes.length + 1,
                  });
                  setNotes((p) => [...p, created]);
                  setNote({ title: "", contentHtml: "" });
                } catch (e) {
                  fail(e);
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add note
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-[var(--brand)]" /> MCQs
              </CardTitle>
              {editingQuizTitle ? (
                <div className="ml-auto flex items-center gap-2">
                  <input
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="h-8 rounded-md border border-slate-300 px-2 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => void saveQuizTitle()}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingQuizTitle(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ml-auto flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
                  onClick={() => setEditingQuizTitle(true)}
                >
                  <span>{quizTitle}</span>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.map((qq, i) => (
              <div key={qq.id} className="rounded-md border border-slate-100 p-3">
                {editingQuestionId === qq.id ? (
                  <div className="space-y-2">
                    <input
                      value={editQ.stem}
                      onChange={(e) => setEditQ({ ...editQ, stem: e.target.value })}
                      className={field}
                    />
                    {editQ.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={editQ.correctKey === String(idx)}
                          onChange={() => setEditQ({ ...editQ, correctKey: String(idx) })}
                        />
                        <input
                          value={opt}
                          onChange={(e) => {
                            const options = [...editQ.options];
                            options[idx] = e.target.value;
                            setEditQ({ ...editQ, options });
                          }}
                          className={`${field} flex-1`}
                        />
                      </div>
                    ))}
                    <input
                      value={editQ.explanation}
                      onChange={(e) => setEditQ({ ...editQ, explanation: e.target.value })}
                      placeholder="Explanation"
                      className={field}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const updated = await adminApi.updateQuestion(qq.id, {
                              stem: editQ.stem.trim(),
                              options: editQ.options.map((o) => o.trim()),
                              correctKey: editQ.correctKey,
                              explanation: editQ.explanation.trim() || null,
                            });
                            setQuestions((p) => p.map((x) => (x.id === qq.id ? updated : x)));
                            setEditingQuestionId(null);
                            setError(null);
                          } catch (e) {
                            fail(e);
                          }
                        }}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingQuestionId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-slate-700">
                      {i + 1}. {qq.stem}{" "}
                      <span className="text-xs text-green-600">
                        (ans: {qq.options[Number(qq.correctKey)]})
                      </span>
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        disabled={i === 0}
                        onClick={() => void moveQuestion(qq.id, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        disabled={i === questions.length - 1}
                        onClick={() => void moveQuestion(qq.id, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        onClick={() => startEditQuestion(qq)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-300 hover:text-red-600"
                        onClick={async () => {
                          try {
                            await adminApi.deleteQuestion(qq.id);
                            setQuestions((p) => p.filter((x) => x.id !== qq.id));
                          } catch (e) {
                            fail(e);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="space-y-2 rounded-md bg-slate-50 p-3">
              <input
                value={q.stem}
                onChange={(e) => setQ({ ...q, stem: e.target.value })}
                placeholder="Question stem"
                className={field}
              />
              {q.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={q.correctKey === String(idx)}
                    onChange={() => setQ({ ...q, correctKey: String(idx) })}
                    title="Mark correct"
                  />
                  <input
                    value={opt}
                    onChange={(e) => {
                      const options = [...q.options];
                      options[idx] = e.target.value;
                      setQ({ ...q, options });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="h-8 flex-1 rounded-md border border-slate-300 px-2 text-sm"
                  />
                </div>
              ))}
              <input
                value={q.explanation}
                onChange={(e) => setQ({ ...q, explanation: e.target.value })}
                placeholder="Explanation (optional)"
                className={field}
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (!q.stem.trim() || q.options.some((o) => !o.trim())) {
                    setError("Fill the stem and all four options.");
                    return;
                  }
                  try {
                    const created = await adminApi.addQuestion(topicId, {
                      stem: q.stem.trim(),
                      options: q.options.map((o) => o.trim()),
                      correctKey: q.correctKey,
                      explanation: q.explanation.trim(),
                    });
                    setQuestions((p) => [...p, created]);
                    setQ({ stem: "", options: ["", "", "", ""], correctKey: "0", explanation: "" });
                    setError(null);
                  } catch (e) {
                    fail(e);
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Add question
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-[var(--brand)]" /> Flashcards
              </CardTitle>
              {editingDeckTitle ? (
                <div className="ml-auto flex items-center gap-2">
                  <input
                    value={deckTitle}
                    onChange={(e) => setDeckTitle(e.target.value)}
                    className="h-8 rounded-md border border-slate-300 px-2 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => void saveDeckTitle()}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingDeckTitle(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ml-auto flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
                  onClick={() => setEditingDeckTitle(true)}
                >
                  <span>{deckTitle}</span>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {cards.map((c, i) => (
              <div key={c.id} className="rounded-md border border-slate-100 p-3">
                {editingCardId === c.id ? (
                  <div className="space-y-2">
                    <input
                      value={editCard.front}
                      onChange={(e) => setEditCard({ ...editCard, front: e.target.value })}
                      placeholder="Front"
                      className={field}
                    />
                    <input
                      value={editCard.back}
                      onChange={(e) => setEditCard({ ...editCard, back: e.target.value })}
                      placeholder="Back"
                      className={field}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const updated = await adminApi.updateCard(c.id, {
                              front: editCard.front.trim(),
                              back: editCard.back.trim(),
                            });
                            setCards((p) => p.map((x) => (x.id === c.id ? updated : x)));
                            setEditingCardId(null);
                            setError(null);
                          } catch (e) {
                            fail(e);
                          }
                        }}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCardId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-700">{c.front}</span>
                    <span className="text-xs text-slate-400">→ {c.back}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        disabled={i === 0}
                        onClick={() => void moveCard(c.id, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        disabled={i === cards.length - 1}
                        onClick={() => void moveCard(c.id, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-700"
                        onClick={() => startEditCard(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-300 hover:text-red-600"
                        onClick={async () => {
                          try {
                            await adminApi.deleteCard(c.id);
                            setCards((p) => p.filter((x) => x.id !== c.id));
                          } catch (e) {
                            fail(e);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={card.front}
                onChange={(e) => setCard({ ...card, front: e.target.value })}
                placeholder="Front (question)"
                className={field}
              />
              <input
                value={card.back}
                onChange={(e) => setCard({ ...card, back: e.target.value })}
                placeholder="Back (answer)"
                className={field}
              />
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (!card.front.trim() || !card.back.trim()) return;
                try {
                  const created = await adminApi.addCard(topicId, {
                    front: card.front.trim(),
                    back: card.back.trim(),
                  });
                  setCards((p) => [...p, created]);
                  setCard({ front: "", back: "" });
                } catch (e) {
                  fail(e);
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add flashcard
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
