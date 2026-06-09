import { getSession, type AuthSession } from "@/lib/auth";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5237";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
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
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new ApiError(res.status, message);
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
export type QuizDto = {
  id: string;
  topicId: string;
  title: string;
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
  questions: QuestionResultDto[];
};

export const assessmentsApi = {
  topicQuiz: (topicId: string) => request<QuizDto>(`/api/v1/topics/${topicId}/quiz`),
  submit: (quizId: string, answers: { questionId: string; selectedKey: string }[]) =>
    request<AttemptResultDto>(`/api/v1/quizzes/${quizId}/attempts`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
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
};

// ----- Admin CMS -----
export type AdminQuestionDto = {
  id: string;
  stem: string;
  options: string[];
  correctKey: string;
  explanation: string | null;
  order: number;
};
export type AdminQuizDto = {
  id: string;
  topicId: string;
  title: string;
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
  addQuestion: (
    topicId: string,
    b: { stem: string; options: string[]; correctKey: string; explanation: string }
  ) => post<AdminQuestionDto>(`/api/v1/admin/topics/${topicId}/questions`, b),
  deleteQuestion: (id: string) => del(`/api/v1/admin/questions/${id}`),
  updateQuestion: (
    id: string,
    b: { stem: string; options: string[]; correctKey: string; explanation: string | null }
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
  listStudents: () => request<StudentListItemDto[]>("/api/v1/admin/students"),
  createStudent: (b: { fullName: string; email: string; bundleId: string | null }) =>
    post<CreatedStudentDto>("/api/v1/admin/students", b),

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
      let message = `Upload failed (${res.status})`;
      try {
        const body = await res.json();
        message = body.error ?? message;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, message);
    }
    return (await res.json()) as { key: string; url: string };
  },

  // Live classes
  listLiveClasses: () => request<AdminLiveClassDto[]>("/api/v1/admin/live-classes"),
  zoomStatus: () => request<{ configured: boolean }>("/api/v1/admin/live-classes/zoom-status"),
  createLiveClass: (b: {
    bundleId: string;
    title: string;
    description: string | null;
    scheduledStartUtc: string;
    durationMinutes: number;
    manualJoinUrl: string | null;
  }) => post<AdminLiveClassDto>("/api/v1/admin/live-classes", b),
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
export type AdminLiveClassDto = {
  id: string;
  bundleId: string;
  bundleTitle: string;
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
  createdAt: string;
};
export type CreatedInstituteAdminDto = {
  userId: string;
  fullName: string;
  email: string;
  tempPassword: string;
  tenantId: string;
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
    }
  ) =>
    request<TenantDetailDto>(`/api/v1/superadmin/tenants/${id}/flags`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  createInstituteAdmin: (tenantId: string, b: { fullName: string; email: string }) =>
    post<CreatedInstituteAdminDto>(`/api/v1/superadmin/tenants/${tenantId}/admins`, b),
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
};
export type UpdateBrandingRequest = {
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  supportEmail: string | null;
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
