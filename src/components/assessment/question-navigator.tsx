"use client";



import { Flag } from "lucide-react";



export type QuestionNavItem = {

  id: string;

  number: number;

  sectionTitle?: string;

};



export type NavigatorSection = {

  title: string;

  startIndex: number;

  count: number;

};



type QuestionNavigatorProps = {

  questions: QuestionNavItem[];

  currentIndex: number;

  answers: Record<string, string>;

  flagged: Set<string>;

  onSelect: (index: number) => void;

  sections?: NavigatorSection[];

};



export function QuestionNavigator({

  questions,

  currentIndex,

  answers,

  flagged,

  onSelect,

  sections = [],

}: QuestionNavigatorProps) {

  const hasSections = sections.length > 0;



  function renderQuestionButton(q: QuestionNavItem, idx: number) {

    const answered = Boolean(answers[q.id]);

    const isCurrent = idx === currentIndex;

    const isFlagged = flagged.has(q.id);

    return (

      <button

        key={q.id}

        type="button"

        onClick={() => onSelect(idx)}

        className={`relative flex h-9 min-w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors ${

          isCurrent

            ? "border-[var(--brand)] bg-[var(--brand)] text-white"

            : answered

              ? "border-green-300 bg-green-50 text-green-800"

              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"

        }`}

        aria-label={`Question ${q.number}${isFlagged ? ", flagged" : ""}${answered ? ", answered" : ""}`}

        aria-current={isCurrent ? "true" : undefined}

      >

        {q.number}

        {isFlagged && (

          <Flag

            className={`absolute -right-1 -top-1 h-3 w-3 ${

              isCurrent ? "fill-white text-white" : "fill-amber-400 text-amber-500"

            }`}

          />

        )}

      </button>

    );

  }



  return (

    <div className="rounded-lg border border-slate-200 bg-white p-3">

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">

        Question navigator

      </p>

      {hasSections ? (

        <div className="space-y-3">

          {sections.map((section) => (

            <div key={section.title}>

              <p className="mb-1.5 text-xs font-semibold text-slate-700">{section.title}</p>

              <div className="flex flex-wrap gap-2">

                {questions

                  .slice(section.startIndex, section.startIndex + section.count)

                  .map((q, offset) => renderQuestionButton(q, section.startIndex + offset))}

              </div>

            </div>

          ))}

        </div>

      ) : (

        <div className="flex flex-wrap gap-2">

          {questions.map((q, idx) => renderQuestionButton(q, idx))}

        </div>

      )}

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">

        <span className="flex items-center gap-1">

          <span className="inline-block h-3 w-3 rounded border border-green-300 bg-green-50" />

          Answered

        </span>

        <span className="flex items-center gap-1">

          <span className="inline-block h-3 w-3 rounded border border-slate-200 bg-slate-50" />

          Unanswered

        </span>

        <span className="flex items-center gap-1">

          <Flag className="h-3 w-3 fill-amber-400 text-amber-500" />

          Flagged

        </span>

      </div>

    </div>

  );

}

