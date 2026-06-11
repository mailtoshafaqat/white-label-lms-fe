"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionNavigator, type NavigatorSection, type QuestionNavItem } from "./question-navigator";

export type McqQuestion = {
  id: string;
  stem: string;
  options: string[];
  order: number;
  sectionTitle?: string;
};

type McqAttemptViewProps = {
  questions: McqQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, key: string) => void;
  flagged: Set<string>;
  onToggleFlag: (questionId: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel?: string;
  disabled?: boolean;
  sections?: NavigatorSection[];
};

export function McqAttemptView({
  questions,
  answers,
  onAnswer,
  flagged,
  onToggleFlag,
  onSubmit,
  submitting,
  submitLabel = "Submit answers",
  disabled = false,
  sections = [],
}: McqAttemptViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = questions[currentIndex];
  const navItems: QuestionNavItem[] = questions.map((q) => ({
    id: q.id,
    number: q.order,
    sectionTitle: q.sectionTitle,
  }));

  if (!current) return null;

  const unanswered = questions.filter((q) => !answers[q.id]).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              {current.sectionTitle && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {current.sectionTitle}
                </p>
              )}
              <CardTitle className="text-base">
                {current.order}. {current.stem}
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onToggleFlag(current.id)}
              className={flagged.has(current.id) ? "border-amber-300 bg-amber-50 text-amber-800" : ""}
            >
              <Flag className={`mr-1 h-4 w-4 ${flagged.has(current.id) ? "fill-amber-400" : ""}`} />
              {flagged.has(current.id) ? "Flagged" : "Flag for review"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {current.options.map((opt, i) => {
              const key = i.toString();
              return (
                <label
                  key={i}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                    answers[current.id] === key
                      ? "border-[var(--brand)] bg-blue-50"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={current.id}
                    checked={answers[current.id] === key}
                    onChange={() => onAnswer(current.id, key)}
                  />
                  {opt}
                </label>
              );
            })}
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            {currentIndex + 1} of {questions.length}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={currentIndex >= questions.length - 1}
            onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={onSubmit} disabled={submitting || disabled}>
            {submitting ? "Submitting…" : submitLabel}
          </Button>
          {unanswered > 0 && (
            <p className="text-sm text-amber-700">
              {unanswered} question{unanswered === 1 ? "" : "s"} unanswered
            </p>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <QuestionNavigator
          questions={navItems}
          currentIndex={currentIndex}
          answers={answers}
          flagged={flagged}
          onSelect={setCurrentIndex}
          sections={sections}
        />
      </aside>
    </div>
  );
}
