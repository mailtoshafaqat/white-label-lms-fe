"use client";

import { useState } from "react";
import { Brain, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mentorApi, type AskResponse } from "@/lib/api";
import { mentorLabel, type BrandingDto } from "@/lib/branding";

type Props = {
  topicId?: string;
  subjectId?: string;
  branding: BrandingDto | null;
  compact?: boolean;
};

export function MentorPanel({ topicId, subjectId, branding, compact }: Props) {
  const [language, setLanguage] = useState<"en" | "ur">("en");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);

  if (branding && !branding.syllabusMentorEnabled) return null;

  const title = mentorLabel(branding);

  async function handleAsk() {
    if (!question.trim() || (!topicId && !subjectId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await mentorApi.ask({
        question: question.trim(),
        topicId,
        subjectId,
        language,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ask failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={compact ? "border-[var(--brand)]/20" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-[var(--brand)]" />
          {title}
        </CardTitle>
        <p className="text-xs text-slate-500">
          Syllabus-only · no open web · citations from your notes
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={language === "en" ? "default" : "outline"}
            onClick={() => setLanguage("en")}
          >
            English
          </Button>
          <Button
            type="button"
            size="sm"
            variant={language === "ur" ? "default" : "outline"}
            onClick={() => setLanguage("ur")}
          >
            اردو
          </Button>
        </div>
        <textarea
          className="min-h-[88px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={
            language === "ur"
              ? "اپنا سوال لکھیں (صرف اسی ٹاپک/سبجیکٹ کی نوٹس سے جواب)…"
              : "Ask about this topic (answers from syllabus notes only)…"
          }
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button
          type="button"
          className="w-full"
          disabled={loading || !question.trim()}
          onClick={handleAsk}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
            </>
          ) : (
            "Ask"
          )}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && (
          <div className="space-y-3 rounded-md bg-slate-50 p-3 text-sm text-slate-800">
            <p className="whitespace-pre-wrap">{result.answer}</p>
            {result.citations.length > 0 && (
              <div className="space-y-2 border-t border-slate-200 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sources
                </p>
                {result.citations.map((c, i) => (
                  <div key={i} className="flex gap-2 text-xs text-slate-600">
                    <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
                    <div>
                      <span className="font-medium">{c.sourceTitle}</span>
                      <p className="text-slate-500">{c.excerpt}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
