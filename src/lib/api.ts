import { getSession, isAuthApiPath, redirectToLogin, type AuthSession } from "@/lib/auth";
import { buildQueryString, type PagedListParams, type PagedResult } from "@/lib/paged-list";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5237";

export type { PagedListParams, PagedResult } from "@/lib/paged-list";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function errorMessageFrom(res: Response): Promise<string> {
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    message = body.error ?? message;
  } catch {
    /* ignore non-JSON error bodies */
  }
  return message;
}

async function failResponse(res: Response, path: string): Promise<never> {
  const message = await errorMessageFrom(res);
  if (res.status === 401 && !isAuthApiPath(path)) {
    redirectToLogin();
  }
  throw new ApiError(res.status, message);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (session?.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    await failResponse(res, path);
  }

  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const authApi = {
  login: (body: { email: string; password: string }) =>
    request<AuthSession>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ changed: boolean }>("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  forgotPassword: (body: { email: string }) =>
    request<{ sent: boolean }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resetPassword: (body: { token: string; newPassword: string }) =>
    request<{ reset: boolean }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<{ userId: string; email: string; fullName: string; role: string }>(
    "/api/v1/auth/me"
  ),
};

export type BundleDto = { id: string; title: string; subjectCount: number; price: number };
export type SubjectDto = { id: string; title: string; order: number; unitCount: number };
export type UnitDto = { id: string; title: string; order: number; topicCount: number };
export type BundleDetailDto = { id: string; title: string; subjects: SubjectDto[] };
export type TopicDto = {
  id: string;
  title: string;
  order: number;
  hasVideo: boolean;
  mcqCount: number;
  flashcardCount: number;
};

export const coursesApi = {
  bundles: () => request<BundleDto[]>("/api/v1/bundles"),
  bundle: (id: string) => request<BundleDetailDto>(`/api/v1/bundles/${id}`),
  units: (subjectId: string) => request<UnitDto[]>(`/api/v1/subjects/${subjectId}/units`),
  topics: (unitId: string) => request<TopicDto[]>(`/api/v1/units/${unitId}/topics`),
  recentTopics: (take = 3) => request<TopicDto[]>(`/api/v1/topics/recent?take=${take}`),
};

export const API_BASE_URL = BASE_URL;

export type LectureDto = {
  id: string;
  title: string;
  url: string | null;
  durationSec: number;
  order: number;
  membersOnly: boolean;
  locked: boolean;
};
export type NoteDto = {
  id: string;
  title: string;
  contentHtml: string | null;
  downloadUrl: string | null;
  order: number;
};
export type TopicContentDto = {
  topicId: string;
  lectures: LectureDto[];
  notes: NoteDto[];
};

export const contentApi = {
  topicContent: (topicId: string) =>
    request<TopicContentDto>(`/api/v1/topics/${topicId}/content`),
};

export type QuizQuestionDto = {
  id: string;
  stem: string;
  options: string[];
  order: number;
};
export type ActiveAttemptDto = {
  attemptId: string;
  startedAtUtc: string;
  expiresAtUtc: string | null;
};

export type QuizAvailabilityStatus = "Open" | "NotYetOpen" | "Closed";

export type ResultVisibilityMode = "Immediate" | "AfterClose" | "ManualPublish";
export type ResultsStatus = "Visible" | "PendingAfterClose" | "PendingManual";

export type QuizDto = {
  id: string;
  topicId: string;
  title: string;
  timeLimitMinutes: number | null;
  availableFromUtc: string | null;
  availableUntilUtc: string | null;
  availabilityStatus: QuizAvailabilityStatus;
  resultVisibility: ResultVisibilityMode;
  showExplanations: boolean;
  activeAttempt: ActiveAttemptDto | null;
  questions: QuizQuestionDto[];
};

export type StartAttemptResultDto = {
  attemptId: string;
  startedAtUtc: string;
  expiresAtUtc: string | null;
  questions: QuizQuestionDto[];
};
export type QuestionResultDto = {
  questionId: string;
  stem: string;
  options: string[];
  correctKey: string;
  selectedKey: string | null;
  isCorrect: boolean;
  explanation: string | null;
};
export type AttemptResultDto = {
  attemptId: string;
  score: number;
  total: number;
  resultsVisible: boolean;
  resultsStatus: ResultsStatus;
  resultsMessage: string | null;
  resultsAvailableAtUtc: string | null;
  showExplanations: boolean;
  questions: QuestionResultDto[];
};

export const assessmentsApi = {
  topicQuiz: (topicId: string) => request<QuizDto>(`/api/v1/topics/${topicId}/quiz`),
  startAttempt: (quizId: string) =>
    request<StartAttemptResultDto>(`/api/v1/quizzes/${quizId}/attempts/start`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  submit: (
    quizId: string,
    answers: { questionId: string; selectedKey: string }[],
    attemptId?: string | null
  ) =>
    request<AttemptResultDto>(`/api/v1/quizzes/${quizId}/attempts`, {
      method: "POST",
      body: JSON.stringify({ answers, attemptId: attemptId ?? null }),
    }),
  attemptResult: (quizId: string) =>
    request<AttemptResultDto>(`/api/v1/quizzes/${quizId}/attempts/result`),
};

export const mockExamsApi = {
  list: () => request<MockExamSummaryDto[]>("/api/v1/me/mock-exams"),
  get: (id: string) => request<MockExamSummaryDto>(`/api/v1/mock-exams/${id}`),
  startAttempt: (id: string) =>
    request<{
      attemptId: string;
      startedAtUtc: string;
      expiresAtUtc: string | null;
      questions: MockExamQuestionDto[];
    }>(`/api/v1/mock-exams/${id}/attempts/start`, { method: "POST", body: JSON.stringify({}) }),
  submit: (
    id: string,
    answers: { questionId: string; selectedKey: string }[],
    attemptId: string
  ) =>
    request<MockExamAttemptResultDto>(`/api/v1/mock-exams/${id}/attempts`, {
      method: "POST",
      body: JSON.stringify({ answers, attemptId }),
    }),
  attemptResult: (id: string) =>
    request<MockExamAttemptResultDto>(`/api/v1/mock-exams/${id}/attempts/result`),
};

export type FlashcardDto = { id: string; front: string; back: string; order: number };
export type FlashcardDeckDto = {
  id: string;
  topicId: string;
  title: string;
  cards: FlashcardDto[];
};

export const flashcardsApi = {
  topicDeck: (topicId: string) =>
    request<FlashcardDeckDto>(`/api/v1/topics/${topicId}/flashcards`),
};

export type GradeDto = {
  quizId: string;
  topicId: string;
  quizTitle: string;
  score: number;
  total: number;
  percentage: number;
  submittedAt: string;
};
export type LeaderboardRowDto = {
  rank: number;
  userId: string;
  name: string;
  points: number;
  isMe: boolean;
};

export const progressApi = {
  myGrades: () => request<GradeDto[]>(`/api/v1/me/grades`),
  leaderboard: (take = 10) => request<LeaderboardRowDto[]>(`/api/v1/leaderboard?take=${take}`),
};

export type EnrollmentDto = {
  bundleId: string;
  bundleTitle: string;
  pricePaid: number;
  enrolledAt: string;
  expiresAt: string;
  isActive: boolean;
};

export const enrollmentApi = {
  myEnrollments: () => request<EnrollmentDto[]>(`/api/v1/me/enrollments`),
  enroll: (bundleId: string) =>
    request<EnrollmentDto>(`/api/v1/bundles/${bundleId}/enroll`, { method: "POST" }),
};

export type LiveClassState = "Upcoming" | "Live" | "Ended" | "Cancelled";
export type LiveClassDto = {
  id: string;
  bundleId: string;
  bundleTitle: string;
  subjectId: string;
  subjectTitle: string;
  hostUserId: string;
  hostName: string;
  title: string;
  description: string | null;
  scheduledStartUtc: string;
  durationMinutes: number;
  state: LiveClassState;
  provider: string;
  joinUrl: string;
  passcode: string | null;
  recordingUrl: string | null;
};

export const liveClassesApi = {
  mine: () => request<LiveClassDto[]>(`/api/v1/me/live-classes`),
  recordJoin: (id: string) =>
    post<{ joinUrl: string }>(`/api/v1/live-classes/${id}/join`, {}),
};

export type LiveClassAttendanceRowDto = {
  userId: string;
  userName: string;
  joinedAtUtc: string;
};

export type LiveClassAttendanceDto = {
  liveClassId: string;
  title: string;
  totalJoined: number;
  attendees: LiveClassAttendanceRowDto[];
};

// ----- Admin CMS -----
export type AdminQuestionDto = {
  id: string;
  stem: string;
  options: string[];
  correctKey: string;
  explanation: string | null;
  order: number;
  isPyq: boolean;
  pyqYear: number | null;
  pyqExam: string | null;
};

export type QuestionAnalyticsDto = {
  questionId: string;
  stem: string;
  attemptCount: number;
  wrongCount: number;
  wrongPercentage: number;
};

export type QuizAnalyticsDto = {
  quizId: string;
  topicId: string;
  title: string;
  totalAttempts: number;
  questions: QuestionAnalyticsDto[];
};
export type McqImportRowInput = {
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct: string;
  explanation: string | null;
  isPyq: boolean;
  pyqYear: number | null;
  pyqExam: string | null;
};

export type McqImportPreviewRowDto = {
  rowNumber: number;
  row: McqImportRowInput;
  isValid: boolean;
  errors: string[];
  correctKey: string | null;
};

export type McqImportPreviewDto = {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: McqImportPreviewRowDto[];
};

export type McqImportResultDto = {
  importedCount: number;
  skippedCount: number;
  questions: AdminQuestionDto[];
};

export type AdminQuizDto = {
  id: string;
  topicId: string;
  title: string;
  timeLimitMinutes: number | null;
  availableFromUtc: string | null;
  availableUntilUtc: string | null;
  resultVisibility: ResultVisibilityMode;
  showExplanations: boolean;
  resultsPublishedAtUtc: string | null;
  notifyTeachersOnBatchComplete: boolean;
  batchCompleteThresholdPercent: number;
  questions: AdminQuestionDto[];
} | null;

function post<T>(path: string, body: unknown) {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}
function del(path: string) {
  return request<void>(path, { method: "DELETE" });
}

export const adminApi = {
  // Course tree
  createBundle: (b: { title: string; price: number; validityDays: number }) =>
    post<BundleDto>("/api/v1/admin/bundles", b),
  updateBundle: (id: string, b: { price: number; validityDays?: number }) =>
    request<BundleDto>(`/api/v1/admin/bundles/${id}`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  deleteBundle: (id: string) => del(`/api/v1/admin/bundles/${id}`),
  createSubject: (bundleId: string, b: { title: string; order: number }) =>
    post<SubjectDto>(`/api/v1/admin/bundles/${bundleId}/subjects`, b),
  deleteSubject: (id: string) => del(`/api/v1/admin/subjects/${id}`),
  createUnit: (subjectId: string, b: { title: string; order: number }) =>
    post<UnitDto>(`/api/v1/admin/subjects/${subjectId}/units`, b),
  deleteUnit: (id: string) => del(`/api/v1/admin/units/${id}`),
  createTopic: (unitId: string, b: { title: string; order: number; hasVideo: boolean }) =>
    post<TopicDto>(`/api/v1/admin/units/${unitId}/topics`, b),
  deleteTopic: (id: string) => del(`/api/v1/admin/topics/${id}`),

  // Topic content
  topicContent: (topicId: string) =>
    request<TopicContentDto>(`/api/v1/admin/topics/${topicId}/content`),
  addLecture: (topicId: string, b: { title: string; url: string; durationSec: number; order: number }) =>
    post<LectureDto>(`/api/v1/admin/topics/${topicId}/lectures`, b),
  deleteLecture: (id: string) => del(`/api/v1/admin/lectures/${id}`),
  addNote: (topicId: string, b: { title: string; contentHtml: string; order: number }) =>
    post<NoteDto>(`/api/v1/admin/topics/${topicId}/notes`, b),
  deleteNote: (id: string) => del(`/api/v1/admin/notes/${id}`),

  // MCQs
  quiz: (topicId: string) => request<AdminQuizDto>(`/api/v1/admin/topics/${topicId}/quiz`),
  quizAnalytics: (topicId: string) =>
    request<QuizAnalyticsDto>(`/api/v1/admin/topics/${topicId}/quiz/analytics`),
  addQuestion: (
    topicId: string,
    b: {
      stem: string;
      options: string[];
      correctKey: string;
      explanation: string;
      isPyq?: boolean;
      pyqYear?: number | null;
      pyqExam?: string | null;
    }
  ) => post<AdminQuestionDto>(`/api/v1/admin/topics/${topicId}/questions`, b),
  deleteQuestion: (id: string) => del(`/api/v1/admin/questions/${id}`),
  updateQuestion: (
    id: string,
    b: {
      stem: string;
      options: string[];
      correctKey: string;
      explanation: string | null;
      isPyq?: boolean;
      pyqYear?: number | null;
      pyqExam?: string | null;
    }
  ) =>
    request<AdminQuestionDto>(`/api/v1/admin/questions/${id}`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  updateQuizTitle: (topicId: string, title: string) =>
    request<{ updated: boolean }>(`/api/v1/admin/topics/${topicId}/quiz/title`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    }),
  reorderQuestions: (topicId: string, questionIds: string[]) =>
    request<{ reordered: boolean }>(`/api/v1/admin/topics/${topicId}/quiz/reorder`, {
      method: "PUT",
      body: JSON.stringify({ questionIds }),
    }),
  updateQuizSettings: (
    topicId: string,
    b: {
      timeLimitMinutes: number | null;
      availableFromUtc: string | null;
      availableUntilUtc: string | null;
      resultVisibility?: ResultVisibilityMode;
      showExplanations?: boolean;
      notifyTeachersOnBatchComplete?: boolean;
      batchCompleteThresholdPercent?: number;
    }
  ) =>
    request<NonNullable<AdminQuizDto>>(`/api/v1/admin/topics/${topicId}/quiz/settings`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  publishQuizResults: (topicId: string) =>
    request<NonNullable<AdminQuizDto>>(`/api/v1/admin/topics/${topicId}/quiz/publish-results`, {
      method: "PUT",
      body: JSON.stringify({}),
    }),
  previewMcqImport: (topicId: string, rows: McqImportRowInput[]) =>
    post<McqImportPreviewDto>(`/api/v1/admin/topics/${topicId}/questions/import/preview`, {
      rows,
    }),
  importMcq: (topicId: string, rows: McqImportRowInput[]) =>
    post<McqImportResultDto>(`/api/v1/admin/topics/${topicId}/questions/import`, { rows }),

  // Flashcards
  deck: (topicId: string) => request<FlashcardDeckDto | null>(`/api/v1/admin/topics/${topicId}/flashcards`),
  addCard: (topicId: string, b: { front: string; back: string }) =>
    post<FlashcardDto>(`/api/v1/admin/topics/${topicId}/cards`, b),
  deleteCard: (id: string) => del(`/api/v1/admin/cards/${id}`),
  updateCard: (id: string, b: { front: string; back: string }) =>
    request<FlashcardDto>(`/api/v1/admin/cards/${id}`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  updateDeckTitle: (topicId: string, title: string) =>
    request<{ updated: boolean }>(`/api/v1/admin/topics/${topicId}/flashcards/title`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    }),
  reorderCards: (topicId: string, cardIds: string[]) =>
    request<{ reordered: boolean }>(`/api/v1/admin/topics/${topicId}/flashcards/reorder`, {
      method: "PUT",
      body: JSON.stringify({ cardIds }),
    }),

  // Students (admin-managed accounts)
  listStudents: (params: PagedListParams = {}) =>
    request<PagedResult<StudentListItemDto>>(
      `/api/v1/admin/students${buildQueryString(params)}`
    ),
  createStudent: (b: { fullName: string; email: string; bundleId: string | null }) =>
    post<CreatedStudentDto>("/api/v1/admin/students", b),
  setStudentStatus: (userId: string, isActive: boolean) =>
    request<StudentListItemDto>(`/api/v1/admin/students/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify({ isActive }),
    }),
  resetStudentPassword: (userId: string) =>
    post<ResetStudentPasswordDto>(`/api/v1/admin/students/${userId}/reset-password`, {}),
  listGuardians: (userId: string) =>
    request<StudentGuardianDto[]>(`/api/v1/admin/students/${userId}/guardians`),
  createGuardian: (
    userId: string,
    b: { name: string; email: string; weeklyReportsEnabled: boolean }
  ) => post<StudentGuardianDto>(`/api/v1/admin/students/${userId}/guardians`, b),
  updateGuardian: (
    userId: string,
    guardianId: string,
    b: { name: string; email: string; weeklyReportsEnabled: boolean }
  ) =>
    request<StudentGuardianDto>(`/api/v1/admin/students/${userId}/guardians/${guardianId}`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  deleteGuardian: (userId: string, guardianId: string) =>
    del(`/api/v1/admin/students/${userId}/guardians/${guardianId}`),
  sendGuardianReport: (userId: string, guardianId: string) =>
    post<{ emailSent: boolean }>(
      `/api/v1/admin/students/${userId}/guardians/${guardianId}/send-report`,
      {}
    ),

  // Email / SMTP settings (per-tenant, white-label)
  getEmailSettings: () => request<EmailSettingsDto>("/api/v1/admin/settings/email"),
  saveEmailSettings: (b: UpdateEmailSettingsRequest) =>
    request<EmailSettingsDto>("/api/v1/admin/settings/email", {
      method: "PUT",
      body: JSON.stringify(b),
    }),

  // Zoom settings (per-tenant, white-label)
  getZoomSettings: () => request<ZoomSettingsDto>("/api/v1/admin/settings/zoom"),
  saveZoomSettings: (b: UpdateZoomSettingsRequest) =>
    request<ZoomSettingsDto>("/api/v1/admin/settings/zoom", {
      method: "PUT",
      body: JSON.stringify(b),
    }),

  getBranding: () => request<BrandingDto>("/api/v1/admin/settings/branding"),
  saveBranding: (b: UpdateBrandingRequest) =>
    request<BrandingDto>("/api/v1/admin/settings/branding", {
      method: "PUT",
      body: JSON.stringify(b),
    }),

  getLanding: () => request<LandingPageDto>("/api/v1/admin/settings/landing"),
  saveLanding: (b: UpdateLandingPageRequest) =>
    request<LandingPageDto>("/api/v1/admin/settings/landing", {
      method: "PUT",
      body: JSON.stringify(b),
    }),

  uploadFile: async (file: File, folder = "uploads") => {
    const session = getSession();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/api/v1/admin/files?folder=${encodeURIComponent(folder)}`, {
      method: "POST",
      headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
      body: form,
    });
    if (!res.ok) {
      await failResponse(res, "/api/v1/admin/files");
    }
    return (await res.json()) as { key: string; url: string };
  },

  // Live classes
  listLiveClasses: (
    params: PagedListParams & { state?: "upcoming" | "live" | "ended" | "cancelled" | "all" } = {}
  ) =>
    request<PagedResult<AdminLiveClassDto>>(
      `/api/v1/admin/live-classes${buildQueryString(params)}`
    ),
  zoomStatus: () => request<{ configured: boolean }>("/api/v1/admin/live-classes/zoom-status"),
  createLiveClass: (b: {
    subjectId: string;
    hostUserId: string;
    title: string;
    description: string | null;
    scheduledStartUtc: string;
    durationMinutes: number;
    manualJoinUrl: string | null;
  }) => post<AdminLiveClassDto>("/api/v1/admin/live-classes", b),

  listTeachers: (params: PagedListParams = {}) =>
    request<PagedResult<TeacherListItemDto>>(
      `/api/v1/admin/teachers${buildQueryString(params)}`
    ),
  createTeacher: (b: { fullName: string; email: string }) =>
    post<CreatedTeacherDto>("/api/v1/admin/teachers", b),
  setTeacherStatus: (userId: string, isActive: boolean) =>
    request<TeacherListItemDto>(`/api/v1/admin/teachers/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify({ isActive }),
    }),
  resetTeacherPassword: (userId: string) =>
    post<ResetTeacherPasswordDto>(`/api/v1/admin/teachers/${userId}/reset-password`, {}),
  listSubjectTeachers: () =>
    request<TeacherSubjectAssignmentDto[]>("/api/v1/admin/subject-teachers"),
  setTeacherSubjects: (userId: string, subjectIds: string[]) =>
    request<{ saved: boolean }>(`/api/v1/admin/teachers/${userId}/subjects`, {
      method: "PUT",
      body: JSON.stringify({ subjectIds }),
    }),
  mySubjects: () => request<AssignedSubjectDto[]>("/api/v1/admin/my-subjects"),
  myProfile: () => request<AdminProfileDto>("/api/v1/admin/me/profile"),
  subjectProgress: (subjectId: string) =>
    request<SubjectProgressDto>(`/api/v1/admin/subjects/${subjectId}/progress`),
  studentDetail: (subjectId: string, userId: string) =>
    request<StudentDetailDto>(`/api/v1/admin/subjects/${subjectId}/students/${userId}`),
  subjectLeaderboard: (subjectId: string, take = 10) =>
    request<LeaderboardRowDto[]>(
      `/api/v1/admin/subjects/${subjectId}/leaderboard?take=${take}`
    ),
  listMockExams: (subjectId: string) =>
    request<AdminMockExamDto[]>(`/api/v1/admin/subjects/${subjectId}/mock-exams`),
  getMockExam: (id: string) => request<AdminMockExamDto>(`/api/v1/admin/mock-exams/${id}`),
  createMockExam: (b: CreateMockExamRequest) =>
    post<AdminMockExamDto>("/api/v1/admin/mock-exams", b),
  updateMockExam: (id: string, b: UpdateMockExamRequest) =>
    request<AdminMockExamDto>(`/api/v1/admin/mock-exams/${id}`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  publishMockExamResults: (id: string) =>
    request<AdminMockExamDto>(`/api/v1/admin/mock-exams/${id}/publish-results`, {
      method: "PUT",
      body: JSON.stringify({}),
    }),
  deleteMockExam: (id: string) => del(`/api/v1/admin/mock-exams/${id}`),
  liveClassAttendance: (id: string) =>
    request<LiveClassAttendanceDto>(`/api/v1/admin/live-classes/${id}/attendance`),
  cancelLiveClass: (id: string) => del(`/api/v1/admin/live-classes/${id}`),
  attachRecording: (
    id: string,
    b: { recordingUrl: string; topicId: string; lectureTitle: string | null }
  ) =>
    request<AdminLiveClassDto>(`/api/v1/admin/live-classes/${id}/recording`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
};

export type ZoomSettingsDto = {
  enabled: boolean;
  accountId: string;
  clientId: string;
  hasClientSecret: boolean;
};
export type UpdateZoomSettingsRequest = {
  enabled: boolean;
  accountId: string;
  clientId: string;
  clientSecret: string | null;
};
export type AssignedSubjectDto = {
  subjectId: string;
  subjectTitle: string;
  bundleId: string;
  bundleTitle: string;
};

export type AdminProfileDto = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  subjects: AssignedSubjectDto[];
};

export type SubjectQuizResultDto = {
  quizId: string;
  topicId: string;
  quizTitle: string;
  bestScore: number;
  total: number;
  percentage: number;
  submittedAt: string;
};

export type StudentSubjectProgressDto = {
  userId: string;
  studentName: string;
  quizzesCompleted: number;
  averagePercentage: number;
  results: SubjectQuizResultDto[];
};

export type SubjectProgressDto = {
  subjectId: string;
  subjectTitle: string;
  students: StudentSubjectProgressDto[];
};

export type StudentDoubtSummaryDto = {
  openCount: number;
  resolvedCount: number;
  lastActivityAt: string | null;
};

export type StudentMistakeSummaryDto = {
  unresolvedCount: number;
  totalWrongAttempts: number;
  lastSeenAt: string | null;
};

export type StudentDetailDto = {
  userId: string;
  studentName: string;
  subjectId: string;
  subjectTitle: string;
  quizzesCompleted: number;
  averagePercentage: number;
  grades: SubjectQuizResultDto[];
  doubts: StudentDoubtSummaryDto;
  mistakes: StudentMistakeSummaryDto;
  lastActiveAt: string | null;
};

export type StudentGuardianDto = {
  id: string;
  studentUserId: string;
  name: string;
  email: string;
  weeklyReportsEnabled: boolean;
};

export type MockExamTopicDto = {
  topicId: string;
  topicTitle: string;
  questionCount: number;
  order: number;
};

export type AdminMockExamDto = {
  id: string;
  subjectId: string;
  subjectTitle: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number;
  availableFromUtc: string | null;
  availableUntilUtc: string | null;
  isPublished: boolean;
  resultVisibility: ResultVisibilityMode;
  showExplanations: boolean;
  resultsPublishedAtUtc: string | null;
  notifyTeachersOnBatchComplete: boolean;
  batchCompleteThresholdPercent: number;
  topics: MockExamTopicDto[];
};

export type CreateMockExamRequest = {
  subjectId: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number;
  availableFromUtc: string | null;
  availableUntilUtc: string | null;
  isPublished: boolean;
  resultVisibility?: ResultVisibilityMode;
  showExplanations?: boolean;
  notifyTeachersOnBatchComplete?: boolean;
  batchCompleteThresholdPercent?: number;
  topics: { topicId: string; questionCount: number }[];
};

export type UpdateMockExamRequest = Omit<CreateMockExamRequest, "subjectId">;

export type MockExamSummaryDto = {
  id: string;
  subjectId: string;
  subjectTitle: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number;
  availableFromUtc: string | null;
  availableUntilUtc: string | null;
  availabilityStatus: QuizAvailabilityStatus;
  totalQuestions: number;
  activeAttempt: { attemptId: string; startedAtUtc: string; expiresAtUtc: string | null } | null;
};

export type MockExamQuestionDto = {
  id: string;
  stem: string;
  options: string[];
  order: number;
};

export type MockExamAttemptResultDto = {
  attemptId: string;
  score: number;
  total: number;
  resultsVisible: boolean;
  resultsStatus: ResultsStatus;
  resultsMessage: string | null;
  resultsAvailableAtUtc: string | null;
  showExplanations: boolean;
  questions: QuestionResultDto[];
};

export type TeacherSubjectAssignmentDto = {
  userId: string;
  subjectIds: string[];
};

export type TeacherListItemDto = {
  userId: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export type CreatedTeacherDto = {
  userId: string;
  fullName: string;
  email: string;
  tempPassword: string;
  emailSent: boolean;
};
export type ResetTeacherPasswordDto = {
  userId: string;
  fullName: string;
  email: string;
  tempPassword: string;
  emailSent: boolean;
};

export type AdminLiveClassDto = {
  id: string;
  bundleId: string;
  bundleTitle: string;
  subjectId: string;
  subjectTitle: string;
  hostUserId: string;
  hostName: string;
  title: string;
  description: string | null;
  scheduledStartUtc: string;
  durationMinutes: number;
  state: LiveClassState;
  provider: string;
  joinUrl: string;
  startUrl: string | null;
  meetingId: string | null;
  passcode: string | null;
  recordingUrl: string | null;
  recordingTopicId: string | null;
  recordingLectureId: string | null;
};

export type StudentListItemDto = {
  userId: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};
export type ResetStudentPasswordDto = {
  userId: string;
  fullName: string;
  email: string;
  tempPassword: string;
  emailSent: boolean;
};
export type CreatedStudentDto = {
  userId: string;
  fullName: string;
  email: string;
  tempPassword: string;
  emailSent: boolean;
  bundleTitle: string | null;
  expiresAt: string | null;
};
export type EmailSettingsDto = {
  enabled: boolean;
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  hasPassword: boolean;
  useSsl: boolean;
};
export type UpdateEmailSettingsRequest = {
  enabled: boolean;
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string | null;
  useSsl: boolean;
};

// ----- SuperAdmin (platform / tenants) -----
export type TenantListItemDto = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  createdAt: string;
};
export type TenantDetailDto = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  status: string;
  plan: string;
  liveClassesEnabled: boolean;
  zoomMode: string;
  paymentMode: string;
  allowStudentSelfEnroll: boolean;
  allowAdminCreateStudent: boolean;
  syllabusMentorEnabled: boolean;
  bundlePriceEditEnabled: boolean;
  mcqBulkImportEnabled: boolean;
  createdAt: string;
};
export type CreatedInstituteAdminDto = {
  userId: string;
  fullName: string;
  email: string;
  tempPassword: string;
  tenantId: string;
};
export type InstituteAdminListItemDto = {
  userId: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};
export type ResetInstituteAdminPasswordDto = {
  userId: string;
  fullName: string;
  email: string;
  tempPassword: string;
};

export const superAdminApi = {
  listTenants: () => request<TenantListItemDto[]>("/api/v1/superadmin/tenants"),
  getTenant: (id: string) => request<TenantDetailDto>(`/api/v1/superadmin/tenants/${id}`),
  createTenant: (b: { name: string; slug: string; plan: string }) =>
    post<TenantDetailDto>("/api/v1/superadmin/tenants", b),
  updateFlags: (
    id: string,
    b: {
      status: string;
      plan: string;
      customDomain: string | null;
      liveClassesEnabled: boolean;
      zoomMode: string;
      paymentMode: string;
      allowStudentSelfEnroll: boolean;
      allowAdminCreateStudent: boolean;
      syllabusMentorEnabled: boolean;
      bundlePriceEditEnabled: boolean;
      mcqBulkImportEnabled: boolean;
    }
  ) =>
    request<TenantDetailDto>(`/api/v1/superadmin/tenants/${id}/flags`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  listInstituteAdmins: (tenantId: string) =>
    request<InstituteAdminListItemDto[]>(`/api/v1/superadmin/tenants/${tenantId}/admins`),
  createInstituteAdmin: (tenantId: string, b: { fullName: string; email: string }) =>
    post<CreatedInstituteAdminDto>(`/api/v1/superadmin/tenants/${tenantId}/admins`, b),
  resetInstituteAdminPassword: (tenantId: string, userId: string) =>
    post<ResetInstituteAdminPasswordDto>(
      `/api/v1/superadmin/tenants/${tenantId}/admins/${userId}/reset-password`,
      {}
    ),
  getTenantBranding: (tenantId: string) =>
    request<BrandingDto>(`/api/v1/superadmin/tenants/${tenantId}/branding`),
  saveTenantBranding: (tenantId: string, b: UpdateBrandingRequest) =>
    request<BrandingDto>(`/api/v1/superadmin/tenants/${tenantId}/branding`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
};

export type BrandingDto = {
  slug: string;
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  supportEmail: string | null;
  mentorDisplayName: string;
  syllabusMentorEnabled: boolean;
  bundlePriceEditEnabled: boolean;
  mcqBulkImportEnabled: boolean;
};
export type UpdateBrandingRequest = {
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  supportEmail: string | null;
  mentorDisplayName: string | null;
};

export type CitationDto = {
  sourceType: string;
  sourceTitle: string;
  topicId: string | null;
  excerpt: string;
};

export type AskResponse = {
  answer: string;
  language: string;
  scopeLabel: string;
  syllabusLocked: boolean;
  citations: CitationDto[];
};

export const mentorApi = {
  ask: (body: {
    question: string;
    topicId?: string;
    subjectId?: string;
    language?: "en" | "ur";
  }) =>
    request<AskResponse>("/api/v1/ai/ask", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  ingestTopic: (topicId: string) =>
    request<{ chunksIndexed: number; message: string }>("/api/v1/admin/ai/ingest", {
      method: "POST",
      body: JSON.stringify({ topicId }),
    }),
};

export type MistakeDto = {
  id: string;
  questionId: string;
  topicId: string;
  quizId: string;
  quizTitle: string;
  stem: string;
  options: string[];
  correctKey: string;
  lastSelectedKey: string | null;
  explanation: string | null;
  timesWrong: number;
  lastSeenAt: string;
};

export const mistakesApi = {
  list: () => request<MistakeDto[]>("/api/v1/me/mistakes"),
  resolve: (id: string) =>
    request<{ resolved: boolean }>(`/api/v1/me/mistakes/${id}/resolve`, { method: "POST" }),
};

export type DoubtThreadStatus = "Open" | "Resolved";

export type DoubtThreadSummaryDto = {
  id: string;
  subjectId: string;
  subjectTitle: string;
  bundleTitle: string;
  topicId: string | null;
  topicTitle: string | null;
  title: string;
  status: DoubtThreadStatus;
  studentName: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type DoubtMessageDto = {
  id: string;
  authorUserId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
};

export type DoubtThreadDetailDto = {
  id: string;
  subjectId: string;
  subjectTitle: string;
  bundleTitle: string;
  topicId: string | null;
  topicTitle: string | null;
  title: string;
  status: DoubtThreadStatus;
  studentName: string;
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
  messages: DoubtMessageDto[];
};

export type EnrolledSubjectOption = AssignedSubjectDto;

export const doubtsApi = {
  listSubjects: () => request<EnrolledSubjectOption[]>("/api/v1/me/doubts/subjects"),
  list: () => request<DoubtThreadSummaryDto[]>("/api/v1/me/doubts"),
  create: (body: { subjectId: string; topicId?: string; question: string }) =>
    request<DoubtThreadDetailDto>("/api/v1/me/doubts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  get: (id: string) => request<DoubtThreadDetailDto>(`/api/v1/me/doubts/${id}`),
  addMessage: (id: string, body: string) =>
    request<DoubtThreadDetailDto>(`/api/v1/me/doubts/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  adminList: (
    params: PagedListParams & { status?: "open" | "resolved" | "all" } = {}
  ) =>
    request<PagedResult<DoubtThreadSummaryDto>>(
      `/api/v1/admin/doubts${buildQueryString(params)}`
    ),
  adminGet: (id: string) => request<DoubtThreadDetailDto>(`/api/v1/admin/doubts/${id}`),
  adminReply: (id: string, body: string) =>
    request<DoubtThreadDetailDto>(`/api/v1/admin/doubts/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  adminResolve: (id: string) =>
    request<DoubtThreadDetailDto>(`/api/v1/admin/doubts/${id}/resolve`, { method: "PUT" }),
  listTemplates: () => request<DoubtReplyTemplateDto[]>("/api/v1/admin/doubt-templates"),
  createTemplate: (b: { title: string; body: string }) =>
    post<DoubtReplyTemplateDto>("/api/v1/admin/doubt-templates", b),
  updateTemplate: (id: string, b: { title: string; body: string }) =>
    request<DoubtReplyTemplateDto>(`/api/v1/admin/doubt-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  deleteTemplate: (id: string) => del(`/api/v1/admin/doubt-templates/${id}`),
};

export type DoubtReplyTemplateDto = {
  id: string;
  title: string;
  body: string;
  order: number;
};

export type PageSectionDto = {
  id: string | null;
  sectionType: string;
  sortOrder: number;
  contentJson: string;
  isEnabled: boolean;
};
export type LandingPageDto = {
  slug: string;
  sections: PageSectionDto[];
};
export type UpdateLandingPageRequest = {
  sections: PageSectionDto[];
};

export { request };
