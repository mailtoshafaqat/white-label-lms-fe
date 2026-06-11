import type { QuizDto } from "@/lib/api";

export function requiresStartAttempt(quiz: QuizDto): boolean {
  return (
    quiz.type === "UnitTest" ||
    quiz.type === "PyqTest" ||
    (quiz.timeLimitMinutes ?? 0) > 0 ||
    quiz.availableFromUtc !== null ||
    quiz.availableUntilUtc !== null
  );
}

export function toggleFlagged(flagged: Set<string>, questionId: string): Set<string> {
  const next = new Set(flagged);
  if (next.has(questionId)) next.delete(questionId);
  else next.add(questionId);
  return next;
}
