# White-Label LMS — Product Feature Catalog

**Last updated:** 18 June 2026  
**Scope:** Features implemented in the web app today (not roadmap-only items).

Use with [07-Role-Based-Operations-Guide.md](./07-Role-Based-Operations-Guide.md) for login URLs and step-by-step flows.  
Customization boundaries: [09-Customization-Policy.md](./09-Customization-Policy.md).

---

## Platform overview

| Area | What it does |
|------|----------------|
| **Multi-tenant** | Each institute (tenant) has isolated data, branding, and feature flags |
| **Product profiles** | `ExamPrep`, `GeneralLms`, or `Both` — controls academy modules (mocks, doubts, mistake diary, etc.) |
| **Subject catalog** | Standardized exam subjects (MDCAT, ECAT, etc.) with optional shared content library |
| **Trial & billing labels** | SuperAdmin sets Trial/Active/Suspended, trial end date, plan (MVP/Pro) |

---

## Feature list by module

### Auth & accounts
- Email/password login (institute + platform)
- JWT access + refresh tokens
- Roles: SuperAdmin, Support, InstituteAdmin, Teacher, Student
- Forced password change on first login (temp passwords)
- Forgot / reset password (institute tenants)
- Platform login (`/login/platform`) for SuperAdmin & Support

### Dashboard & courses
- Bundle → subject → unit → topic hierarchy
- Published bundles with pricing display
- Student enrollment (self-serve or admin-provisioned)
- Recent topics on dashboard
- **Global search** — topics & subjects (`/dashboard` search bar, `GET /api/v1/search`)

### Content (video + notes)
- Video lectures per topic (members-only when configured)
- **Enrollment-gated access** — students must have active bundle enrollment for topic content, quizzes, flashcards, and lecture/note file downloads (admins/teachers exempt)
- **Video watch progress** — monotonic 0–100% per lecture; topic complete when all lectures ≥90% **or** quiz submitted
- Student video library (`/videos`) with progress bars; dashboard bundle completion bars
- Rich HTML notes + file upload
- Auto re-index notes for Syllabus Mentor on save
- Admin content tree with topic search (admin only)

### Assessments
- Daily Practice Test (DPT) per topic
- Unit tests & PYQ-style quizzes (exam-prep profile)
- Timed attempts where configured
- Results with explanations
- Question flagging during attempt
- Admin quiz & flashcard builders (reorder, edit)
- MCQ bulk import (tenant flag)
- **Question bank search** — search MCQ stems institute-wide (`GET /api/v1/admin/questions/search`, `/admin/question-bank`)

### Flashcards
- Per-topic flashcard decks
- Student review UI
- **Enrollment-gated** — `GET /topics/{topicId}/flashcards` returns **403** for students not enrolled in the topic's bundle (same guard as content/quizzes)

### Progress & learning tools
- **My Grades** — quiz history and scores
- **Leaderboard** — top students (5 or 10)
- **Mistake diary** — auto-captures wrong MCQs; mark resolved
- **Bookmarks** — save topics & questions for revision (`/bookmarks`)
- **Weakness practice quiz** — adaptive quiz from mistakes + weak topics (`/weakness-quiz`)
- Admin subject progress, per-student detail (grades, doubts, mistakes)
- **Cohort analytics** — bundle/subject KPIs, student table, CSV export (`/admin/analytics`)
- **Completion certificates (Phase A)** — auto-issue on full bundle completion; per-tenant template; PDF + QR public verify

### Syllabus Mentor (AI)
- RAG over institute notes (no open web)
- English / Urdu questions
- Per-topic side panel + full `/mentor` page
- Custom mentor display name in branding
- Tenant on/off flag

### Live classes
- Schedule classes (Zoom integration)
- Student join links
- Recordings → members-only lecture on topic
- Teacher/host scoped classes

### Ask Teacher (Q&A)
- Student doubt threads per subject/topic
- Teacher replies; mark resolved
- Enrollment-gated for students

### Mock exams
- Full-length exam structure (sections, topics, timers)
- Student attempt flow (exam-prep profile)

### Enrollment & students
- Bundle enrollment with expiry
- **Per-batch enrollment cap** — optional `maxEnrollments` per bundle (not tenant-wide)
- **Batch calendar** — enrollment window (`enrollmentOpensAt` / `enrollmentClosesAt`), content start (`startsAt`), batch end (`endsAt`); students see status on dashboard (Open / Full / Not yet open / Closed)
- Admin create students, reset passwords, activate/block
- **Admin enroll existing student** in a bundle (`POST /api/v1/admin/students/{userId}/enroll`) — bypasses cap and enrollment window via `ProvisionEnrollAsync`
- **Extend enrollment** expiry per bundle
- Self-enroll toggle per tenant
- Guardian weekly report stub (email when SMTP configured)

### Payments (student checkout)
- Per-tenant payment settings — Stripe, JazzCash, Easypaisa, manual bank transfer; currency; manual instructions
- Student checkout (`/checkout/{bundleId}`) with country-aware gateway list
- **Manual payment** — student submits transaction reference + optional note → admin approve/reject; **emails all active institute admins** on submit (requires tenant SMTP)
- **Online payment** — Stripe / JazzCash / Easypaisa webhooks mark paid and enroll
- **Admin record offline payment** — `POST /api/v1/admin/payments/record-manual` for existing students (paid + enrolled immediately)
- Redirect URLs use `App:BaseUrl` / `App:ApiBaseUrl` in `appsettings.json` (not hardcoded localhost)

### Teachers
- Provision teachers; assign catalog subjects
- Scoped CMS (only assigned subjects)
- Scoped live classes & doubts

### Admin CMS & setup
- Content management (`/admin`)
- Subject catalog (`/admin/subjects`) — seed, archive, shared library
- Setup wizard & checklist
- Teachers, students, live classes, doubts, mock exams (profile-dependent)
- **Storage usage widget** on admin home (plan quota, warnings, block at 100%)
- **Batch settings** on content CMS — seat cap, enrollment window, content start/end dates per bundle
- **Certificates** — issued list (`/admin/certificates`), template editor (`/admin/certificates/template`)

### Branding & landing
- Logo, favicon, primary color, display name
- Public landing page builder (hero, features, footer)
- Theme preview
- Custom domain field (SuperAdmin)

### SuperAdmin (platform)
- Tenant CRUD, trial end date, extend +30 days
- Per-tenant feature flags & product profile
- Institute admin provisioning
- Tenant branding override
- **Storage quota** — per-tenant usage vs plan limit; override bytes or enable bypass
- Request incident log (Support)

### Support
- Support role login
- Trace ID on API errors; incident search UI

---

## Role × feature matrix

| Feature | SuperAdmin | Support | Institute Admin | Teacher | Student |
|---------|:----------:|:-------:|:---------------:|:-------:|:-------:|
| Platform / tenants | ✅ | — | — | — | — |
| Incident search | — | ✅ | — | — | — |
| Institute settings & branding | — | — | ✅ | — | — |
| Subject catalog | — | — | ✅ | — | — |
| Content CMS | — | — | ✅ | ✅* | — |
| Students & enrollment | — | — | ✅ | — | — |
| Payments (settings, approve, record offline) | — | — | ✅ | — | — |
| Teachers | — | — | ✅ | — | — |
| Live classes (manage) | — | — | ✅ | ✅* | — |
| Doubts (reply) | — | — | ✅ | ✅* | — |
| Mock exams (manage) | — | — | ✅ | ✅* | — |
| Cohort analytics + CSV | — | — | ✅ | ✅* | — |
| Question bank search | — | — | ✅ | ✅* | — |
| Certificates (manage / template) | — | — | ✅ | ✅* | — |
| Storage quota (view / override) | ✅ | — | ✅ | — | — |
| Per-batch enrollment cap & calendar | — | — | ✅ | — | — |
| Video watch progress | — | — | — | — | ✅ |
| Earn / download certificates | — | — | — | — | ✅ |
| Dashboard & topics | — | — | — | — | ✅ |
| Quizzes & flashcards | — | — | — | — | ✅‡ |
| Checkout & pay | — | — | — | — | ✅§ |
| Grades & leaderboard | — | — | — | — | ✅ |
| Global search | — | — | — | — | ✅ |
| Bookmarks | — | — | — | — | ✅ |
| Mistake diary | — | — | — | — | ✅† |
| Weakness quiz | — | — | — | — | ✅† |
| Syllabus Mentor | — | — | — | — | ✅¶ |
| Ask Teacher | — | — | — | — | ✅¶ |
| Live class join | — | — | — | — | ✅¶ |

\* Teacher: only for **assigned subjects**.  
† Requires **Mistake diary** enabled (ExamPrep / Both).  
‡ Requires **active enrollment** in the bundle for topic content, quizzes, and flashcards.  
§ When paid checkout is enabled for the bundle.  
¶ Requires tenant flag + enrollment where applicable.

---

## Tenant feature flags (SuperAdmin)

| Flag | Effect when OFF |
|------|-----------------|
| `Status = Suspended` | All institute users blocked at login |
| `Status = Trial` + past `TrialEndsAt` | Students/teachers blocked; institute admin can still log in |
| `AllowStudentSelfEnroll` | No self-enroll on dashboard |
| `AllowAdminCreateStudent` | Cannot create students in admin |
| `LiveClassesEnabled` | Live class UI hidden |
| `SyllabusMentorEnabled` | Mentor hidden |
| `ProductProfile = GeneralLms` | Mock exams, doubts, mistake diary off by default |

---

## API quick reference (student + admin features)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/search?q=` | Global content search |
| GET | `/api/v1/me/bookmarks` | List bookmarks |
| POST | `/api/v1/me/bookmarks` | Create bookmark |
| DELETE | `/api/v1/me/bookmarks/{id}` | Remove bookmark |
| GET | `/api/v1/me/bookmarks/status` | Check if target is bookmarked |
| GET | `/api/v1/me/weakness-quiz` | Build weakness quiz |
| POST | `/api/v1/me/weakness-quiz/submit` | Submit weakness quiz |
| PUT | `/api/v1/me/lectures/{id}/progress` | Save video watch progress (0–100%) |
| GET | `/api/v1/me/lectures/{id}/progress` | Get progress for one lecture |
| GET | `/api/v1/me/lectures/progress?lectureIds=` | Bulk lecture progress |
| GET | `/api/v1/me/certificates` | Student's earned certificates |
| GET | `/api/v1/me/certificates/{id}/pdf` | Download certificate PDF |
| GET | `/api/v1/public/certificates/verify/{number}?tenant=` | Public QR verify (no auth) |
| GET | `/api/v1/admin/certificate-template` | Get certificate template |
| PUT | `/api/v1/admin/certificate-template` | Save certificate template |
| GET | `/api/v1/admin/certificates` | List issued certificates |
| GET | `/api/v1/admin/certificates/{id}/pdf` | Admin download certificate PDF |
| GET | `/api/v1/admin/analytics/cohort` | Cohort overview KPIs |
| GET | `/api/v1/admin/analytics/cohort/students` | Per-student cohort rows |
| GET | `/api/v1/admin/analytics/cohort/export` | CSV export |
| GET | `/api/v1/admin/questions/search?q=` | MCQ stem search (min 2 chars) |
| GET | `/api/v1/admin/storage` | Institute storage usage vs quota |
| GET | `/api/v1/superadmin/tenants/storage` | All tenants storage summary |
| PUT | `/api/v1/superadmin/tenants/{id}/storage` | Override quota or bypass |
| GET | `/api/v1/topics/{topicId}/content` | Topic lectures & notes (enrollment required for students) |
| GET | `/api/v1/topics/{topicId}/flashcards` | Topic flashcards (enrollment required for students) |
| GET | `/api/v1/files/{*key}` | Lecture/note download (enrollment required for students) |
| GET | `/api/v1/topics/{topicId}/quiz` | Topic quiz (enrollment required for students) |
| GET | `/api/v1/payments/available-gateways` | Gateways for a bundle |
| POST | `/api/v1/payments/checkout` | Start online checkout |
| POST | `/api/v1/payments/manual` | Student submit manual payment proof |
| GET | `/api/v1/admin/payments` | List payment orders |
| POST | `/api/v1/admin/payments/{id}/approve` | Approve manual payment → enroll |
| POST | `/api/v1/admin/payments/{id}/reject` | Reject manual payment |
| POST | `/api/v1/admin/payments/record-manual` | Admin record offline payment + enroll |
| POST | `/api/v1/admin/students/{userId}/enroll` | Admin enroll existing student `{ bundleId }` |
| GET | `/api/v1/admin/students/{userId}/enrollments` | List student enrollments |
| PUT | `/api/v1/admin/students/{userId}/enrollments/{bundleId}` | Extend enrollment expiry |

---

## Automated test

```powershell
cd backend/scripts
.\test-student-learning-features.ps1
.\test-product-profiles.ps1
.\test-roadmap-features.ps1
.\test-certificate-student1.ps1
.\test-storage-quota.ps1
.\test-payments.ps1
.\test-seat-flashcards-storage.ps1
```

Exercises flashcards enrollment gate and Local file upload smoke against the **demo** tenant (`admin@demo.com`, `student1@demo.com`, `?tenant=demo`).

**Client-facing summary:** [10-Client-Feature-List-By-Role.md](./10-Client-Feature-List-By-Role.md)

---

## Not yet built (roadmap)

### Client-selected (General LMS + Academy)

| Item | Profiles | Priority |
|------|----------|----------|
| Course reviews / ratings | GeneralLms (+ optional Academy) | Medium |
| Discussions / forums | GeneralLms; overlaps with doubts in ExamPrep | Medium |
| Proctoring / anti-cheat mocks | ExamPrep | Medium |
| Usage metering / billing (beyond storage quota) | Platform SaaS | Medium — tenant API metering still roadmap; **per-batch enrollment caps shipped** (Jun 2026) |
| Tenant API keys / webhooks | Platform / enterprise | Medium–Low |
| Certificates Phase B (custom fields, email delivery) | Both | Medium |

### Other

- Mobile apps  
- Parent portal (guardian email reports exist; no parent login yet)  
- Flashcards / mentor API enrollment gates — **flashcards gated** (Jun 2026); mentor was already enrollment-gated  
- **Configurable file storage** — shipped: `FileStorage.Provider` = `Local` | `R2` | `Azure` in `appsettings.json` (DI swap; no code changes per upload)

### Shipped June 2026 — KIPS Phase 1 batch engine

- Per-bundle **max enrollments**, enrollment window, content start/end dates on `courses.Bundles`
- Student catalog exposes `enrollmentStatus`; checkout and self-enroll respect cap/window
- Admin batch settings in content CMS; admin provision enroll bypasses policy
- Content access gated by `StartsAt` for students (`IEnrollmentAccessGuard`)

### Shipped June 2026 — payments, enrollment, platform metering

- Student checkout (Stripe, JazzCash, Easypaisa, manual txn reference)  
- Admin payment inbox + record offline payment & enroll  
- **Manual payment admin email** — on student submit, emails all active institute admins (requires tenant SMTP)  
- `IEnrollmentAccessGuard` on topic content, quizzes, lecture/note files, **flashcards**  
- **File storage providers** — `LocalDiskFileStorage`, `R2FileStorage`, `AzureBlobFileStorage` via `FileStorage.Provider`
