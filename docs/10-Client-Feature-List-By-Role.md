# White-Label LMS — Feature List by Role

**Document for:** Institute owners, clients, and stakeholders  
**Product version:** June 2026 (current web release)  
**Validation:** Automated API smoke tests + student learning suite run on **12 June 2026**; payment & enrollment flows verified **18 June 2026** (`test-payments.ps1` 23/23)

---

## Executive summary

This is a **multi-tenant, white-label learning platform** for exam-prep academies and general course providers. Each institute gets its own branding, users, content, and configurable feature set — on **one shared product**, not custom code per client.

**Five user roles** are supported today:

| Role | Who uses it |
|------|-------------|
| **SuperAdmin** | Platform operator (your SaaS team) |
| **Support** | Platform support staff (error investigation) |
| **Institute Admin** | Academy owner / head administrator |
| **Teacher** | Subject teachers (scoped access) |
| **Student** | Learners |

**Three product profiles** (set per institute by SuperAdmin):

| Profile | Best for |
|---------|----------|
| **ExamPrep** | MDCAT, ECAT, NUMS-style academies (batches, mocks, doubts) |
| **GeneralLms** | Course-based institutes (labels show “courses” not “batches”) |
| **Both** | Academies that also sell standalone online courses |

---

## Validation summary (12 June 2026)

| Test suite | Result |
|------------|--------|
| All-role API smoke (SuperAdmin, Support, Institute Admin, Teacher, Student) | **19 / 19 passed** |
| Product profiles (ExamPrep, GeneralLms, Both + flag gating) | **22 / 22 passed** |
| Student learning (bookmarks, search, weakness quiz, dashboard, profile) | **15 / 16 passed** |

The single non-blocking failure was an edge case in unit-quiz “not yet enabled” handling; core learning flows passed.

**Demo logins (development / UAT):**

| Role | Login URL | Example account |
|------|-----------|-----------------|
| SuperAdmin | `/login` | `superadmin@platform.com` |
| Support | `/login/platform` | `support@platform.com` |
| Institute Admin | `/login?tenant=demo` | `admin@demo.com` |
| Teacher | `/login?tenant=demo` | See seeded teachers in admin |
| Student | `/login?tenant=demo` | `student1@demo.com` |

> Passwords for your environment are in the institute handover pack or `scripts/e2e-test-credentials.json` after seeding.

---

## 1. SuperAdmin (platform operator)

**Purpose:** Create and operate multiple institutes on one platform.

### Features

| Area | Capability |
|------|------------|
| **Tenants** | Create institutes (name, URL slug, plan MVP/Pro) |
| **Trial & status** | Trial / Active / Suspended; trial end date; extend trial |
| **Product profile** | Set ExamPrep, GeneralLms, or Both per tenant |
| **Feature flags** | Live classes, Syllabus Mentor, self-enrollment, admin student creation, MCQ bulk import, bundle pricing edit, Zoom mode, payment mode |
| **Institute admins** | Provision owner accounts; reset passwords |
| **Branding override** | Platform-level branding for any tenant |
| **Storage quota** | Per-tenant usage vs plan limit (MVP 20 GB, Pro 100 GB); override quota or enable bypass for ops |
| **Checklist** | Internal launch checklist for platform staff |

### Typical URLs

- Tenant list: `/superadmin`
- Tenant detail (flags, admins, branding): `/superadmin/tenants/{id}`

---

## 2. Support (platform support)

**Purpose:** Help institutes when something goes wrong — without full SuperAdmin powers.

### Features

| Area | Capability |
|------|------------|
| **Incident search** | Find API errors by trace ID, user, institute, date |
| **Developer report** | Copy structured error detail for engineering |
| **Platform login** | Dedicated `/login/platform` entry |

### Typical URLs

- Support console: `/support`

---

## 3. Institute Admin (owner / head admin)

**Purpose:** Run one institute end-to-end — brand, content, people, and academy tools.

### Home & operations

| Feature | Description |
|---------|-------------|
| **Admin home** | KPIs (students, teachers, courses/batches, doubts), **storage usage** (plan quota, 80% warning, block at 100%), quick actions, live class snapshot |
| **Setup wizard** | Guided first-time setup |
| **Launch checklist** | Step-by-step institute onboarding (browser-saved progress) |
| **Progress** | Institute-wide student progress by subject — KPIs, 7-day trend, score distribution, leaderboard, per-student drill-down |
| **Cohort analytics** | Bundle/subject cohort KPIs, per-student table, CSV export (`/admin/analytics`) |
| **Storage usage** | Plan quota (MVP 20 GB, Pro 100 GB), usage bar, 80% warning, upload blocked at 100% |

### Content & curriculum

| Feature | Description |
|---------|-------------|
| **Subject catalog** | Master subject list; shared content library; archive subjects |
| **Content CMS** | Course/batch → subject → unit → topic tree; quick-add topic; search |
| **Topic editor** | Video lectures, HTML notes, file uploads, MCQs, flashcards, quiz scheduling |
| **Unit tests / PYQ** | Unit-level timed tests (exam-prep profile) |
| **MCQ bulk import** | CSV import when enabled for tenant |
| **Mock exams** | Full-length exams with sections (exam-prep / Both) |
| **Question bank search** | Search MCQ stems across the institute (`/admin/question-bank`) |

### Certificates & completion

| Feature | Description |
|---------|-------------|
| **Certificate template** | Per-tenant title, colours, logo/background/signature; enable/disable issuance |
| **Issued certificates** | List certificates earned by students; download PDF per certificate |
| **Auto-issue** | Certificate issued when student completes every topic in a bundle (quiz **or** ≥90% video watch per topic) |

### People & enrollment

| Feature | Description |
|---------|-------------|
| **Teachers** | Create accounts; assign catalog subjects or per-course placements; reset password; block/activate |
| **Students** | Create accounts with optional course enrollment; reset password; block/activate |
| **Student profile** | Phone, address, date of birth, photo (admin-managed) |
| **Enrollments** | View enrollments; **enroll existing student** in a new bundle; **extend** course access expiry |
| **Guardians** | Link parent/guardian emails for weekly report emails (when SMTP configured) |

### Payments (student checkout & admin)

| Feature | Description |
|---------|-------------|
| **Payment settings** | Enable gateways per institute (Stripe, JazzCash, Easypaisa, manual bank transfer); currency; manual instructions |
| **Student checkout** | Paid bundles → checkout with country-aware gateway list (`/checkout/{bundleId}`) |
| **Manual payment (student)** | Student submits **transaction reference** + optional note; admin approves or rejects |
| **Online payment** | Stripe, JazzCash, Easypaisa — webhook marks order paid and enrolls student |
| **Admin payment inbox** | List orders; approve/reject pending manual submissions (`/admin/payments`) |
| **Record offline payment** | Admin records bank/cash payment for an **existing** student → marks paid and enrolls immediately (no student checkout) |
| **Enrollment enforcement** | Topic content, quizzes, and lecture/note file downloads require **active enrollment** (admins/teachers exempt) |

### Academy & engagement (profile / flags)

| Feature | Description |
|---------|-------------|
| **Live classes** | Schedule classes; Zoom or manual join URL; recordings to topic |
| **Doubts inbox** | Answer student questions; resolve threads |
| **Doubt templates** | Reusable reply templates for teachers |

### Settings & white-label

| Feature | Description |
|---------|-------------|
| **Branding** | Logo, colours, display name, favicon, mentor label |
| **Landing page** | Section-based public site (hero, features, footer, etc.) |
| **Email (SMTP)** | Outbound mail for welcome emails, password reset, guardian reports |
| **Zoom** | OAuth integration for auto-created meetings |
| **Trial banner** | In-app notice when institute is on trial |

### Typical URLs

| Area | URL |
|------|-----|
| Home | `/admin/home` |
| Content | `/admin` |
| Progress | `/admin/progress` |
| Cohort analytics | `/admin/analytics` |
| Question bank | `/admin/question-bank` |
| Certificates | `/admin/certificates` |
| Certificate template | `/admin/certificates/template` |
| Subject catalog | `/admin/subjects` |
| Teachers | `/admin/teachers` |
| Students | `/admin/students` |
| Payments | `/admin/payments` |
| Payment settings | `/admin/settings/payments` |
| Live classes | `/admin/live-classes` |
| Doubts | `/admin/doubts` |
| Mock exams | `/admin/mock-exams` |
| Settings | `/admin/settings` |

---

## 4. Teacher

**Purpose:** Deliver content and support learners for **assigned subjects only**.

### Features

| Feature | Description |
|---------|-------------|
| **Admin home** | Personal dashboard — assigned subjects, doubts, live classes |
| **Content CMS** | Edit topics/units for assigned subjects only |
| **Student progress** | Subject progress, 7-day class trend, at-risk students, leaderboard |
| **Per-student detail** | Quiz history, doubts summary, mistake summary |
| **Cohort analytics** | Same as institute admin, scoped to assigned subjects |
| **Question bank** | Search MCQs in assigned subjects |
| **Certificates** | View issued certificates for students in assigned bundles |
| **Live classes** | Create/host classes for assigned subjects |
| **Doubts** | Reply to student threads |
| **Mock exams** | Manage mocks for assigned subjects (when profile allows) |
| **Profile** | View assigned subjects |

### Access rule

Teachers **cannot** manage institute settings, all students, or subjects they are not assigned to.

### Typical URLs

Same admin URLs as institute admin, but menus and data are **scoped** to assigned subjects.

---

## 5. Student

**Purpose:** Learn, practice, and track progress.

### Dashboard & discovery

| Feature | Description |
|---------|-------------|
| **Student dashboard** | Greeting, KPIs (accuracy, rank, streak, MCQs this month), subject accuracy chart, 7-day trend, leaderboard, live classes, recent topics |
| **Global search** | Find topics and subjects by keyword |
| **Course catalog** | Browse published courses/batches; self-enroll when institute allows; **checkout** for paid bundles |
| **Checkout** | Pay online (Stripe / JazzCash / Easypaisa) or submit manual payment proof (txn reference + note) |
| **Topic learning** | Watch video, read notes, take topic quiz, flashcards — **requires enrollment** |
| **Video library** | All lectures with watch progress (`/videos`) |
| **Bundle progress** | Dashboard bars show video + quiz completion per enrolled bundle |

### Practice & assessment

| Feature | Description |
|---------|-------------|
| **Topic quizzes (DPT)** | Daily practice tests with timer, explanations, question flagging |
| **Unit tests** | Timed unit-level tests (exam-prep profile) |
| **Mock exams** | Full exam simulation with sections (exam-prep profile) |
| **Flashcards** | Review decks per topic |
| **Weakness quiz** | Targeted quiz from mistakes and weak areas |
| **Mistake diary** | Auto-captured wrong answers; mark resolved; re-practice |

### Progress & engagement

| Feature | Description |
|---------|-------------|
| **Grades** | Quiz history and scores (via dashboard / API) |
| **Leaderboard** | Institute ranking (top 5 or 10) |
| **Bookmarks** | Save topics and questions for revision |
| **Ask teacher** | Post doubts per subject (enrollment required) |
| **Live classes** | Join scheduled classes |
| **Syllabus Mentor** | AI Q&A over institute notes only (no open web) — English/Urdu |
| **Student profile** | Update phone, address, DOB, profile photo |
| **Certificates** | View earned completion certificates; download PDF (`/certificates`) |
| **Public verify** | Anyone can verify a certificate via QR link (`/verify/{number}?tenant=slug`) |

### Account

| Feature | Description |
|---------|-------------|
| **Login / logout** | Email + password per institute |
| **Forgot / reset password** | Institute-branded reset flow |
| **Change password** | Required on first login with temporary password |

### Typical URLs

| Area | URL |
|------|-----|
| Dashboard | `/dashboard` |
| Video library | `/videos` |
| Topic | `/topic/{id}` |
| Quiz | `/quiz/{topicId}` |
| Certificates | `/certificates` |
| Bookmarks | `/bookmarks` |
| Mistakes | `/mistakes` |
| Weakness quiz | `/weakness-quiz` |
| Mentor | `/mentor` |
| Doubts | `/doubts` |
| Mock exams | `/mock-exams` |
| Checkout | `/checkout/{bundleId}` |
| Live classes | From dashboard |

---

## Feature availability by product profile

| Feature | ExamPrep | GeneralLms | Both |
|---------|:--------:|:----------:|:----:|
| Batches wording | Batches | Courses | Batches or courses |
| Mock exams | ✅ | ❌ default | ✅ |
| Doubts (Ask teacher) | ✅ | ❌ default | ✅ |
| Mistake diary & weakness quiz | ✅ | ❌ default | ✅ |
| Unit PYQ / unit tests | ✅ | ❌ default | ✅ |
| Topic quizzes & flashcards | ✅ | ✅ | ✅ |
| Live classes | Flag | Flag | Flag |
| Syllabus Mentor | Flag | Flag | Flag |
| Self-enrollment | Flag | Flag | Flag |

SuperAdmin can override individual flags per institute. See [09-Customization-Policy.md](./09-Customization-Policy.md).

---

## Role × feature matrix (quick reference)

| Capability | SuperAdmin | Support | Institute Admin | Teacher | Student |
|------------|:----------:|:-------:|:---------------:|:-------:|:-------:|
| Manage tenants & flags | ✅ | — | — | — | — |
| Storage quota override / bypass | ✅ | — | — | — | — |
| Search error incidents | — | ✅ | — | — | — |
| Branding & landing page | — | — | ✅ | — | — |
| Full content CMS | — | — | ✅ | ✅* | — |
| All students & teachers | — | — | ✅ | — | — |
| Payments (approve / record offline) | — | — | ✅ | — | — |
| Student progress analytics | — | — | ✅ | ✅* | — |
| Cohort analytics + CSV | — | — | ✅ | ✅* | — |
| Question bank search | — | — | ✅ | ✅* | — |
| Certificates (manage / template) | — | — | ✅ | ✅* | — |
| Storage quota (view) | — | — | ✅ | — | — |
| Video watch progress | — | — | — | — | ✅ |
| Earn / download certificates | — | — | — | — | ✅ |
| Live classes (manage) | — | — | ✅ | ✅* | — |
| Doubts (reply) | — | — | ✅ | ✅* | — |
| Learn & take quizzes | — | — | — | — | ✅‡ |
| Checkout & pay for course | — | — | — | — | ✅§ |
| Dashboard & leaderboard | — | — | — | — | ✅ |
| Bookmarks & search | — | — | — | — | ✅ |
| AI mentor | — | — | — | — | ✅† |
| Join live class | — | — | — | — | ✅† |

\* Scoped to **assigned subjects** only.  
† Requires tenant flag and enrollment where applicable.  
‡ Topic quizzes and content require **active enrollment** in the bundle.  
§ When institute enables paid checkout and bundle has a price > 0.

---

## Customization model (for owners)

| Included in product | Not per-tenant custom code |
|---------------------|----------------------------|
| Logo, colours, name, landing page | ✅ | — |
| Turn features on/off per institute | ✅ | — |
| Exam prep vs general LMS profile | ✅ | — |
| Custom layouts or one-off screens | — | ❌ (paid SOW or new product feature) |

Full policy: [09-Customization-Policy.md](./09-Customization-Policy.md).

---

## Planned / not in current release

Items below are **not in the June 2026 release**. Priority and fit are recommendations for the next roadmap discussion.

### Client-selected backlog (General LMS + Academy)

| Feature | Best for | Recommended priority | Notes |
|---------|----------|----------------------|-------|
| **Course reviews / ratings** | General LMS · optional for Academy | **Medium** | Valuable for self-enroll course catalog and trust; less critical when enrollment is institute-managed. |
| **Discussions / forums** | General LMS · partial Academy overlap | **Medium** | Academy already has **doubts (Ask Teacher)** per topic. Forums add peer discussion and unit-wide threads — decide if doubts are enough first. |
| **Proctoring / anti-cheat (mocks)** | ExamPrep / Academy | **Medium** | Important for high-stakes mock exams; complex to build in-house. Consider integrate-first (Proctorio, etc.) before custom. |
| **Usage metering / billing tenants** | Platform (SuperAdmin SaaS) | **Medium** | **Storage quota** shipped (Jun 2026). Broader billing/metering (seats, API, payments) still roadmap. |
| **Tenant API keys / webhooks** | Platform + enterprise institutes | **Medium–Low** | Webhooks for enrollments, completions, payments; API keys for CRM/ERP sync. Defer until core LMS gaps above are closed unless a client requires it. |
| **Certificates Phase B** | Both | **Medium** | Phase A shipped (PDF + QR verify). Phase B: custom fields, batch re-issue, email delivery. |

### Other roadmap (previously listed)

- Native mobile apps (iOS / Android)
- Parent portal (guardian email reports exist; no parent login yet)
- **Configurable file storage (pending — discuss)** — `appsettings` provider switch for video and PDF/DOC uploads: **Local disk** (current MVP), **Cloudflare R2**, or **Azure Blob**. Today uploads work on local disk only (`IFileStorage` abstraction exists; R2/Azure implementations and `FileStorage` config section not built yet).

### Shipped June 2026 (payments)

- **Student checkout** — Stripe, JazzCash, Easypaisa, manual bank transfer (txn reference only; no screenshot upload)
- **Admin payment inbox** — approve/reject manual submissions; **record offline payment & enroll** for existing students
- **Enrollment API enforcement** — topic content, quizzes, lecture/note files gated by active bundle enrollment

---

## Related documents

| Document | Audience |
|----------|----------|
| [07-Role-Based-Operations-Guide.md](./07-Role-Based-Operations-Guide.md) | Step-by-step URLs and setup order |
| [08-Product-Feature-Catalog.md](./08-Product-Feature-Catalog.md) | Technical feature catalog |
| [09-Customization-Policy.md](./09-Customization-Policy.md) | What can be customized vs bespoke work |
| [11-Roadmap-Features-E2E-Report.md](./11-Roadmap-Features-E2E-Report.md) | Jun 2026 shipped features — E2E validation |
| [12-Technical-Handover.md](./12-Technical-Handover.md) | Architecture + codebase handover (engineers) |
| [02-White-Label-AI-LMS-Proposal.md](./02-White-Label-AI-LMS-Proposal.md) | Original product proposal |

---

*This list reflects features implemented and verified in the June 2026 codebase. Share this document with clients as the current product scope; use the operations guide for hands-on UAT.*
