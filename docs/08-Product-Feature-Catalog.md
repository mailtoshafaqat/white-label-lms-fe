# White-Label LMS — Product Feature Catalog

**Last updated:** June 2026  
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
- Admin create students, reset passwords, activate/block
- Self-enroll toggle per tenant
- Guardian weekly report stub (email when SMTP configured)

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
| Teachers | — | — | ✅ | — | — |
| Live classes (manage) | — | — | ✅ | ✅* | — |
| Doubts (reply) | — | — | ✅ | ✅* | — |
| Mock exams (manage) | — | — | ✅ | ✅* | — |
| Cohort analytics + CSV | — | — | ✅ | ✅* | — |
| Question bank search | — | — | ✅ | ✅* | — |
| Certificates (manage / template) | — | — | ✅ | ✅* | — |
| Storage quota (view / override) | ✅ | — | ✅ | — | — |
| Video watch progress | — | — | — | — | ✅ |
| Earn / download certificates | — | — | — | — | ✅ |
| Dashboard & topics | — | — | — | — | ✅ |
| Quizzes & flashcards | — | — | — | — | ✅ |
| Grades & leaderboard | — | — | — | — | ✅ |
| Global search | — | — | — | — | ✅ |
| Bookmarks | — | — | — | — | ✅ |
| Mistake diary | — | — | — | — | ✅† |
| Weakness quiz | — | — | — | — | ✅† |
| Syllabus Mentor | — | — | — | — | ✅‡ |
| Ask Teacher | — | — | — | — | ✅‡ |
| Live class join | — | — | — | — | ✅‡ |

\* Teacher: only for **assigned subjects**.  
† Requires **Mistake diary** enabled (ExamPrep / Both).  
‡ Requires tenant flag + enrollment where applicable.

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

---

## Automated test

```powershell
cd backend/scripts
.\test-student-learning-features.ps1
.\test-product-profiles.ps1
.\test-roadmap-features.ps1
.\test-certificate-student1.ps1
.\test-storage-quota.ps1
```

Seeds quiz mistakes, then exercises bookmarks, search, and weakness quiz against the **demo** tenant (`student1@demo.com`).

**Client-facing summary:** [10-Client-Feature-List-By-Role.md](./10-Client-Feature-List-By-Role.md)

---

## Not yet built (roadmap)

### Client-selected (General LMS + Academy)

| Item | Profiles | Priority |
|------|----------|----------|
| Course reviews / ratings | GeneralLms (+ optional Academy) | Medium |
| Discussions / forums | GeneralLms; overlaps with doubts in ExamPrep | Medium |
| Proctoring / anti-cheat mocks | ExamPrep | Medium |
| Usage metering / billing (beyond storage quota) | Platform SaaS | Medium |
| Tenant API keys / webhooks | Platform / enterprise | Medium–Low |
| Certificates Phase B (custom fields, email delivery) | Both | Medium |

### Other

- Mobile apps  
- Payments & parent portal (student checkout)  
- Bookmarks for AI mentor answers (proposal only)  
- **Configurable file storage (pending — discuss)** — `appsettings.json` `FileStorage` section with provider `Local` | `R2` | `Azure` for lecture video and note (PDF/DOC) uploads. MVP uses `LocalDiskFileStorage` only; swap via DI not implemented.
