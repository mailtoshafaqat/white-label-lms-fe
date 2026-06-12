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

## API quick reference (new student features)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/search?q=` | Global content search |
| GET | `/api/v1/me/bookmarks` | List bookmarks |
| POST | `/api/v1/me/bookmarks` | Create bookmark |
| DELETE | `/api/v1/me/bookmarks/{id}` | Remove bookmark |
| GET | `/api/v1/me/bookmarks/status` | Check if target is bookmarked |
| GET | `/api/v1/me/weakness-quiz` | Build weakness quiz |
| POST | `/api/v1/me/weakness-quiz/submit` | Submit weakness quiz |

---

## Automated test

```powershell
cd backend/scripts
.\test-student-learning-features.ps1
.\test-product-profiles.ps1
```

Seeds quiz mistakes, then exercises bookmarks, search, and weakness quiz against the **demo** tenant (`student1@demo.com`).

**Client-facing summary:** [10-Client-Feature-List-By-Role.md](./10-Client-Feature-List-By-Role.md)

---

## Not yet built (roadmap)

### Client-selected (General LMS + Academy)

| Item | Profiles | Priority |
|------|----------|----------|
| Video watch progress % | Both | High |
| Certificates on completion | Both | High |
| MCQ search in question bank | ExamPrep | High |
| Full analytics (cohort, export) | Both | High |
| Course reviews / ratings | GeneralLms (+ optional Academy) | Medium |
| Discussions / forums | GeneralLms; overlaps with doubts in ExamPrep | Medium |
| Proctoring / anti-cheat mocks | ExamPrep | Medium |
| Usage metering / billing tenants | Platform SaaS | Medium |
| Tenant API keys / webhooks | Platform / enterprise | Medium–Low |

### Other

- Mobile apps  
- Payments & parent portal (student checkout)  
- Bookmarks for AI mentor answers (proposal only)  
- **Configurable file storage (pending — discuss)** — `appsettings.json` `FileStorage` section with provider `Local` | `R2` | `Azure` for lecture video and note (PDF/DOC) uploads. MVP uses `LocalDiskFileStorage` only; swap via DI not implemented.
