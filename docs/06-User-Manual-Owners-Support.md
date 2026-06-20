# White-Label AI LMS — User Manual for Institute Owners & Support Engineers

**Document version:** 1.0  
**Date:** 9 June 2026  
**Audience:** Institute Owners (InstituteAdmin role), Support Engineers, Implementation consultants  
**Companion documents:** `03-Technical-Architecture-LMS.md`, `05-E2E-Test-Report.md`, `04-Build-Progress-Tracker.md`

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Prerequisites and Deployment](#3-prerequisites-and-deployment)
4. [Roles and Permissions](#4-roles-and-permissions)
5. [Getting Started — Institute Owner Checklist](#5-getting-started--institute-owner-checklist)
6. [Configuration Guide](#6-configuration-guide)
7. [User Provisioning](#7-user-provisioning)
8. [Course CMS Workflow](#8-course-cms-workflow)
9. [Student Learning Experience](#9-student-learning-experience)
10. [Assessments and Progress](#10-assessments-and-progress)
11. [Live Classes and Recordings](#11-live-classes-and-recordings)
12. [Syllabus Mentor (AI)](#12-syllabus-mentor-ai)
13. [Ask Teacher (Doubts)](#13-ask-teacher-doubts)
14. [SuperAdmin Operations (Support)](#14-superadmin-operations-support)
15. [Troubleshooting and FAQ](#15-troubleshooting-and-faq)
16. [Screenshot Reference Index](#16-screenshot-reference-index)

---

## 1. System Overview

The White-Label AI LMS is a multi-tenant learning platform that lets each institute operate under its own brand, domain, and feature set. A single codebase serves many institutes; isolation is enforced at the database row level (`TenantId`) and through JWT claims.

**What institute owners can do:**

- Brand the portal (logo, colours, landing page, email templates)
- Build course content (video, notes, MCQs, flashcards)
- Provision students and teachers (no public self-registration)
- Schedule live classes (Zoom or manual join links)
- Enable AI Syllabus Mentor and in-app teacher Q&A
- Configure SMTP and Zoom credentials per tenant

**What students experience:**

- Branded login and dashboard
- Enrolled course bundles with expiry dates
- Topic-based learning: video, notes, quiz, flashcards
- Grades, leaderboard, mistake diary
- Live class join links, recordings, AI mentor, doubt threads

---

## 2. Architecture

### 2.1 High-Level Diagram

```
┌─────────────────┐     HTTPS      ┌─────────────────┐
│  Next.js 15 FE  │ ◄────────────► │  .NET 10 API    │
│  localhost:3000 │   JWT + REST   │  localhost:5237 │
└────────┬────────┘                └────────┬────────┘
         │                                  │
         │  subdomain / cookie              │  EF Core
         │  tenant resolution               ▼
         │                         ┌─────────────────┐
         └────────────────────────►│  SQL Server     │
                                   │  localhost:14330│
                                   └─────────────────┘
```

### 2.2 Modular Backend

The API is a **modular monolith**. Each feature (Courses, Content, Assessments, Enrollment, LiveClasses, Platform, SyllabusMentor, QnA, etc.) owns its schema and endpoints. Modules communicate through shared contracts — never by reading each other's tables directly.

### 2.3 Multi-Tenancy

| Mechanism | Purpose |
|-----------|---------|
| `TenantId` on every row | Data isolation |
| Subdomain (`demo.localhost:3000`) or cookie | Frontend tenant resolution |
| JWT tenant claim | API tenant context |
| Per-tenant feature flags | Plug-and-play modules per institute |

### 2.4 Key Frontend Routes

| Route | Role | Purpose |
|-------|------|---------|
| `/` | Public | Branded landing page |
| `/login` | All | Authentication |
| `/dashboard` | Student, Teacher | Learning home |
| `/topic/[id]` | Student | Video, notes, quiz links |
| `/quiz/[topicId]` | Student | MCQ runner |
| `/flashcards/[topicId]` | Student | Flashcard review |
| `/mistakes` | Student | Mistake diary |
| `/mentor` | Student | Syllabus Mentor chat |
| `/doubts` | Student | Ask Teacher threads |
| `/admin` | Teacher, InstituteAdmin | Content tree CMS |
| `/admin/students` | InstituteAdmin | Student provisioning |
| `/admin/teachers` | InstituteAdmin | Teacher provisioning |
| `/admin/live-classes` | Teacher, InstituteAdmin | Live class scheduler |
| `/admin/doubts` | Teacher, InstituteAdmin | Doubt inbox |
| `/admin/settings/*` | InstituteAdmin | Branding, landing, email, Zoom |
| `/superadmin` | SuperAdmin | Tenant registry |

---

## 3. Prerequisites and Deployment

### 3.1 Requirements

| Component | Version |
|-----------|---------|
| Docker Desktop | Latest (for SQL Server) |
| .NET SDK | 10.x |
| Node.js | 20+ |
| Browser | Chrome / Edge (latest) |

### 3.2 Local Deployment (Support Engineers)

**Step 1 — Start SQL Server**

```bash
cd backend
docker compose up -d
```

Container: `lms-sqlserver` · Port: **14330** · SA password: `Password123!` · Database: `WhiteLabelLms` (auto-created)

**Step 2 — Start API**

```bash
cd backend
dotnet run --project src/Lms.Api
```

API listens on **http://localhost:5237**. EF migrations apply automatically on startup.

**Step 3 — Start Frontend**

```bash
cd frontend
npm install
npm run dev
```

App: **http://localhost:3000**

Optional `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5237
```

**Step 4 — Seed E2E test data (optional)**

```powershell
.\scripts\e2e-seed-testdata.ps1
```

Credentials saved to `scripts/e2e-test-credentials.json`.

### 3.3 Default Accounts

| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | `superadmin@platform.com` | `SuperAdmin123!` |
| Institute Admin (demo) | `admin@demo.com` | `Admin123!` |

> **Security note:** Change all default passwords before any shared or production deployment.

### 3.4 Production Considerations

| Area | Recommendation |
|------|----------------|
| Database | Azure SQL Serverless or managed SQL Server |
| File storage | **`IFileStorage`** — set `FileStorage.Provider` to `Local`, `R2`, or `Azure` in appsettings (see `12-Technical-Handover.md` §8.2) |
| HTTPS | Terminate TLS at reverse proxy / CDN |
| Email | Configure real SMTP per tenant (see §6.3) |
| Secrets | Store Zoom OAuth and SMTP passwords in a secrets manager |

---

## 4. Roles and Permissions

### 4.1 Role Comparison

| Capability | SuperAdmin | InstituteAdmin | Teacher | Student |
|------------|:----------:|:--------------:|:-------:|:-------:|
| Manage tenants / flags | ✅ | — | — | — |
| Branding & landing | View all | ✅ Own tenant | — | — |
| CMS (full tree) | — | ✅ | Scoped* | — |
| Create students | — | ✅ | — | — |
| Create teachers | — | ✅ | — | — |
| Schedule live classes | — | ✅ | ✅** | — |
| Reply to doubts | — | ✅ | ✅* | — |
| Enroll in bundles | — | ✅ (provision) | — | Flag-dependent |
| Take quizzes / view content | — | — | — | ✅ (if enrolled) |
| Syllabus Mentor | — | Configure | — | ✅ (if enrolled) |

\* Teachers see CMS and doubt inbox only for **assigned subjects**.  
\** Teachers must be assigned as **host** on live classes for their subjects.

### 4.2 Tenant Feature Flags

Configured by SuperAdmin; enforced on login and API:

| Flag | Effect when `false` |
|------|---------------------|
| `AllowStudentSelfEnroll` | Students cannot self-enroll; admin must provision |
| `AllowAdminCreateStudent` | Admin student creation disabled |
| `LiveClassesEnabled` | Live class features hidden |
| `SyllabusMentorEnabled` | AI mentor disabled for tenant |

Demo tenant defaults: self-enroll **off**, admin create student **on**, live classes **on**.

---

## 5. Getting Started — Institute Owner Checklist

Use this sequence when onboarding a new institute:

1. **SuperAdmin** creates tenant + institute admin account
2. **InstituteAdmin** logs in and completes forced password change (if applicable)
3. Configure **branding** (logo, colours, display name)
4. Configure **landing page** (hero, features, footer)
5. Configure **SMTP** (or accept dev-outbox for testing)
6. Configure **Zoom** (optional — or use manual join URLs)
7. Build **course hierarchy** (bundle → subject → unit → topic)
8. Add **content** (videos, notes, MCQs, flashcards)
9. **Provision students** with bundle enrollment
10. **Assign teachers** to subjects
11. Schedule **live classes**
12. Verify student login → dashboard → topic → quiz flow

![Branded login screen](e2e-screenshots/branding-admin-update-pass.png)  
*Screenshot placeholder — capture after branding is configured.*

---

## 6. Configuration Guide

### 6.1 Branding

**Path:** `/admin/settings/branding`

| Setting | Description |
|---------|-------------|
| Display Name | Shown in header and emails (e.g. "Demo Academy") |
| Logo URL | Direct URL or upload via file picker (max 2 MB, images only) |
| Primary Colour | Hex code applied as CSS `--brand` (e.g. `#0b3d91`) |
| Favicon URL | Browser tab icon |
| Support Email | Shown in footer and transactional emails |
| Mentor Display Name | Overrides "Syllabus Mentor" label in AI UI |

**Steps:**

1. Log in as InstituteAdmin
2. Navigate to **Admin → Settings → Branding**
3. Upload logo or paste URL; set primary colour
4. Save — refresh dashboard to confirm header theme

![Branding settings](e2e-screenshots/branding-admin-update-pass.png)

### 6.2 Landing Page Builder

**Path:** `/admin/settings/landing`

The landing page is composed of **typed sections** stored as JSON:

| Section type | Typical content |
|--------------|-----------------|
| Hero | Title, subtitle, CTA button, background image |
| Features | Card grid (icon, title, description) |
| CoursesShowcase | Highlight enrolled/public bundles |
| Testimonials | Quotes + author |
| Stats | Numeric highlights |
| Footer | Links, copyright, support email |

**Steps:**

1. Open landing editor
2. Add, remove, or reorder sections
3. Edit section JSON content in the form fields
4. Save and preview at `/` (public, no login required)

![Landing editor](e2e-screenshots/landing-admin-editor-pass.png)

### 6.3 Email / SMTP Settings

**Path:** `/admin/settings/email`

| Field | Notes |
|-------|-------|
| SMTP Host | e.g. `smtp.gmail.com` |
| Port | Usually 587 (STARTTLS) or 465 (SSL) |
| Username / Password | App password recommended; password never returned on GET |
| From Name / From Email | White-label sender identity |

When SMTP is **not** configured, emails are written to the API `dev-emails/` folder as HTML files (development only).

**Used for:**

- Student welcome emails (temp password)
- Password reset links
- Branded templates via `IBrandedEmailRenderer`

![Email settings](e2e-screenshots/students-email-outbox-pass.png)

### 6.4 Zoom Integration

**Path:** `/admin/settings/zoom`

Supports **Zoom Server-to-Server OAuth** per tenant:

| Field | Purpose |
|-------|---------|
| Account ID | Zoom account identifier |
| Client ID / Client Secret | OAuth app credentials |
| Secret | Stored encrypted; never returned on GET |

**Behaviour:**

- When configured, new live classes auto-create Zoom meetings
- When not configured, admin must supply a **manual join URL**
- Students see join link only; **start URL is hidden** from students

Check status via admin live-classes page or `GET /api/v1/admin/live-classes/zoom-status`.

![Zoom settings](e2e-screenshots/zoom-settings-pass.png)

### 6.5 Tenant Flags (Support / SuperAdmin)

**Path:** `/superadmin/tenants/[id]`

| Flag | Institute impact |
|------|------------------|
| `AllowStudentSelfEnroll` | Shows/hides Enroll button on dashboard |
| `AllowAdminCreateStudent` | Enables `/admin/students` create form |
| `LiveClassesEnabled` | Shows live class sections |
| `SyllabusMentorEnabled` | Enables `/mentor` and topic AI panel |
| `Status` | `Active` / `Suspended` — suspended blocks login |

---

## 7. User Provisioning

### 7.1 Students (Admin-Managed)

**Path:** `/admin/students`

There is **no public registration**. All students are created by InstituteAdmin.

**Create student:**

1. Click **Add Student**
2. Enter full name and email
3. Optionally select a **bundle** for immediate enrollment
4. Submit — system generates a **temporary password**
5. If SMTP configured, credentials email is sent; otherwise check dev-outbox

**First login:**

- Student is redirected to `/account/password` to set a permanent password
- Then dashboard loads with enrolled bundles (if provisioned)

**Manual enrollment** (when `AllowStudentSelfEnroll=false`):

- Use **Enroll** action on student row, or include `bundleId` at creation
- Admin enrollment uses `ProvisionEnrollmentAsync` — **not** blocked by self-enroll flag

**Block / activate student:**

1. Open `/admin/students` → find the student in the grid (search + pagination)
2. Click **Block** — student cannot sign in while inactive
3. Click **Activate** to restore access

**Reset student password** (Institute Admin):

1. Click **Reset password** on the student row
2. Confirm in the dialog — a new temporary password is shown once
3. If SMTP is configured, credentials are emailed; otherwise copy and share manually
4. Student must change password on next login at `/account/password`

| Role | Can reset password for |
|------|------------------------|
| **SuperAdmin** | Institute admins only (`/superadmin/tenants/{id}`) |
| **Institute Admin** | Students (`/admin/students`) and teachers (`/admin/teachers`) |

![Student creation](e2e-screenshots/students-create-pass.png)

**Test accounts:** See `scripts/e2e-test-credentials.json` for seeded `e2e.student1@demo.com` … `e2e.student5@demo.com`.

### 7.2 Teachers (Subject-Scoped)

**Path:** `/admin/teachers`

**Create teacher:**

1. Add full name and email
2. System returns temporary password
3. Assign one or more **subjects** via subject picker

**Block / activate teacher:**

- Use **Block** on the teacher card — login is denied while inactive
- Use **Activate** to restore access

**Reset teacher password:**

- Click **Reset password** on the teacher card
- Share the new temporary password (or rely on SMTP email)
- Teacher must set a new password on next login

**Teacher capabilities after assignment:**

- Edit CMS content for assigned subjects only
- Host live classes for those subjects
- View and reply to doubts routed to those subjects

![Teacher assignment](e2e-screenshots/teachers-subject-assign-pass.png)

### 7.3 Institute Admin (SuperAdmin Provisioning)

**Path:** `/superadmin/tenants/[id]` → **Add Admin**

SuperAdmin creates the first InstituteAdmin when standing up a new tenant. Additional admins can be provisioned the same way.

---

## 8. Course CMS Workflow

### 8.1 Content Hierarchy

```
Bundle (course package, price, validity days)
 └── Subject
      └── Unit
           └── Topic
                ├── Video lecture(s)
                ├── Note(s)
                ├── Quiz (MCQs)
                └── Flashcard deck
```

### 8.2 Building the Tree

**Path:** `/admin`

1. Open content tree manager
2. Expand bundle → click **Add Subject**
3. Expand subject → **Add Unit**
4. Expand unit → **Add Topic**
5. Click topic name to open **topic editor** at `/admin/topics/[id]`

![Content tree](e2e-screenshots/cms-content-tree-pass.png)

### 8.3 Topic Editor

**Path:** `/admin/topics/[id]`

| Tab / Section | Actions |
|---------------|---------|
| Lectures | Upload video file or URL; set MembersOnly for recordings |
| Notes | Rich HTML or file upload; triggers AI ingest on save |
| MCQs | Add/edit/delete questions; reorder; view answer keys |
| Flashcards | Add/edit/delete cards; reorder deck |

**Cascade delete:** Deleting a topic removes all child content.

### 8.4 Publishing

Bundles must be **published** for enrollment and student visibility. Verify bundle status in admin tree before provisioning students.

---

## 9. Student Learning Experience

### 9.1 Dashboard

**Path:** `/dashboard`

Shows:

- Enrolled bundles with expiry badges
- Recent topics (continue learning)
- Live upcoming classes (enrolled bundles only)
- My Grades summary
- Leaderboard
- Links to Mistakes, Mentor, Doubts

![Student dashboard](e2e-screenshots/courses-dashboard-bundles-pass.png)

### 9.2 Topic Page

**Path:** `/topic/[id]`

- Video player with lecture stream
- Notes viewer
- Buttons: **Take Quiz**, **Flashcards**, **Ask Teacher**, **Syllabus Mentor** (side panel)

![Topic detail](e2e-screenshots/courses-topic-detail-pass.png)

### 9.3 Enrollment

| Scenario | Behaviour |
|----------|-----------|
| Self-enroll enabled | Student clicks Enroll on bundle card |
| Self-enroll disabled (default) | No enroll button; admin must provision |
| Expired enrollment | Content gated; contact institute |

---

## 10. Assessments and Progress

### 10.1 MCQ Quizzes

**Path:** `/quiz/[topicId]`

1. Student answers all questions
2. Submit — server scores attempt (answers never trusted from client)
3. Results screen shows score, correct/incorrect, **explanations**
4. Wrong answers auto-logged to **Mistake Diary**

![Quiz results](e2e-screenshots/mcq-quiz-results-pass.png)

### 10.2 Flashcards

**Path:** `/flashcards/[topicId]`

Flip-card review with previous/next navigation. No grading — practice only.

### 10.3 My Grades and Leaderboard

Grades appear on dashboard after quiz submission. Leaderboard ranks students by best score per quiz within the tenant.

### 10.4 Mistake Diary

**Path:** `/mistakes`

- Lists MCQs answered incorrectly
- Mark as **resolved** when reviewed
- Use as a re-test study list

![Mistakes list](e2e-screenshots/mistakes-list-pass.png)

---

## 11. Live Classes and Recordings

### 11.1 Scheduling Live Classes

**Path:** `/admin/live-classes`

**Required fields:**

| Field | Notes |
|-------|-------|
| Subject | Must match teacher assignment |
| Host | Teacher user ID |
| Title / Description | Shown to students |
| Scheduled start (UTC) | Determines Upcoming / Live / Ended state |
| Duration | Minutes |
| Join URL | Manual link **or** auto from Zoom |

**Student view:** Dashboard lists upcoming sessions for enrolled bundles. **Join** opens join URL. Start URL never shown to students.

![Live class admin](e2e-screenshots/live-admin-create-pass.png)

### 11.2 Cancelling a Class

Delete or cancel from admin list → status becomes **Cancelled** → removed from student dashboard.

### 11.3 Recordings

After a class ends, admin can attach a **Recording URL**. The system creates a **MembersOnly** lecture on the linked topic:

- Enrolled students can watch from topic page
- Unenrolled users are blocked

![Recording access](e2e-screenshots/recordings-members-only-pass.png)

---

## 12. Syllabus Mentor (AI)

### 12.1 Overview

Syllabus Mentor answers questions **strictly from institute syllabus content** (notes ingested into `mentor.KnowledgeChunks`). No open web search.

**Requires:** `SyllabusMentorEnabled` tenant flag + student enrollment in relevant bundle.

### 12.2 Student Usage

**Paths:** `/mentor` or topic page side panel

1. Select scope (topic or subject)
2. Type question in English or Urdu
3. Receive answer with **citations** to source notes

![Mentor chat](e2e-screenshots/mentor-ask-en-pass.png)

### 12.3 Content Ingestion

- **Automatic:** Saving or deleting notes in CMS triggers re-ingest
- **Manual:** `POST /api/v1/admin/ai/ingest` (admin API)

Optional OpenAI enhancement when `SyllabusMentor:OpenAiApiKey` is configured in API settings.

### 12.4 Branding

Set **Mentor Display Name** in branding settings to rename the assistant (e.g. "Physics Buddy").

---

## 13. Ask Teacher (Doubts)

### 13.1 Student Flow

**Path:** `/doubts`

1. Click **New Doubt**
2. Select subject (and optional topic)
3. Enter question text
4. Thread appears in list; await teacher reply

Also available from topic page **Ask Teacher** link.

![Student doubt](e2e-screenshots/qna-student-create-pass.png)

### 13.2 Teacher / Admin Inbox

**Path:** `/admin/doubts`

- Threads filtered by **teacher's assigned subjects**
- Open thread → reply with message
- InstituteAdmin sees all subjects

![Teacher reply](e2e-screenshots/qna-teacher-reply-pass.png)

---

## 14. SuperAdmin Operations (Support)

### 14.1 Tenant Registry

**Path:** `/superadmin`

| Action | Steps |
|--------|-------|
| List tenants | View name, subdomain, plan, status |
| Create tenant | POST new row with subdomain slug |
| Suspend | Set status Suspended — blocks institute login |
| Feature flags | Toggle enroll, live classes, mentor, etc. |
| Branding override | Set branding for any tenant |
| Provision admin | Create InstituteAdmin for tenant |

![SuperAdmin tenants](e2e-screenshots/superadmin-tenant-list-pass.png)

### 14.2 Support Engineer Workflow

1. Confirm tenant slug and status in SuperAdmin
2. Impersonate debugging: use institute admin credentials (never share SuperAdmin creds with clients)
3. Check API logs and `dev-emails/` for delivery issues
4. Verify SQL connectivity (`localhost,14330` in dev)
5. Re-run `e2e-seed-testdata.ps1` to reset demo data if needed

---

## 15. Troubleshooting and FAQ

### FAQ-01 — Student cannot log in after admin created account

**Cause:** Student has not changed temporary password, or typo in email.  
**Fix:** Admin verifies email in `/admin/students`; student uses temp password then forced reset at `/account/password`.

### FAQ-02 — Student sees empty dashboard / no courses

**Cause:** Not enrolled in any bundle, or enrollment expired.  
**Fix:** Admin enrolls student via `/admin/students` → Enroll. When `AllowStudentSelfEnroll=false`, admin provisioning is mandatory.

### FAQ-03 — Admin cannot enroll student (self-enroll disabled error)

**Cause:** Pre-fix bug (BUG-001) routed admin enroll through self-enroll check.  
**Fix:** Ensure API includes `ProvisionEnrollmentAsync` fix. Use `POST /api/v1/admin/students/{id}/enroll` or create with `bundleId`.

### FAQ-04 — Emails not received

**Cause:** SMTP not configured.  
**Fix:** Configure `/admin/settings/email`. In development, inspect `backend/dev-emails/*.html`.

### FAQ-05 — Zoom meetings not auto-created

**Cause:** Zoom OAuth not configured or invalid credentials.  
**Fix:** Complete `/admin/settings/zoom`; check `zoom-status`. Alternatively use manual join URL.

### FAQ-06 — Live class not visible to student

**Cause:** Student not enrolled in the bundle linked to the class subject, or class cancelled/ended.  
**Fix:** Verify enrollment and class schedule; confirm `LiveClassesEnabled` flag is on.

### FAQ-07 — Teacher cannot edit CMS for a subject

**Cause:** Teacher not assigned to that subject.  
**Fix:** InstituteAdmin → `/admin/teachers` → assign subject IDs.

### FAQ-08 — Syllabus Mentor returns "no information found"

**Cause:** Notes not ingested, or question outside enrolled syllabus.  
**Fix:** Save notes in CMS (triggers ingest) or run admin ingest API; confirm student enrollment and `SyllabusMentorEnabled` flag.

### FAQ-09 — Branding not updating on login page

**Cause:** Browser cache or wrong tenant subdomain.  
**Fix:** Hard refresh; verify `demo.localhost:3000` or `lms.tenantSlug` cookie matches tenant.

### FAQ-10 — API returns 401 / redirect loop on login

**Cause:** JWT expired, clock skew, or API not running.  
**Fix:** Confirm API on port 5237; clear cookies; re-login.

### FAQ-11 — CORS error from frontend

**Cause:** Frontend origin not allowed.  
**Fix:** API CORS must include `http://localhost:3000` and `*.localhost:3000` for subdomain tenants.

### FAQ-12 — Database connection failed on API startup

**Cause:** Docker SQL not running or wrong port.  
**Fix:** `docker compose up -d` in `backend/`; connection string port **14330** in `appsettings.json`.

### FAQ-13 — Quiz submit succeeds but grade missing

**Cause:** Progress module event handler error (rare).  
**Fix:** Check API logs for `QuizSubmittedEvent` handler; verify `progress` schema migrated.

### FAQ-14 — Doubt thread not appearing in teacher inbox

**Cause:** Doubt filed under subject not assigned to teacher.  
**Fix:** Assign subject to teacher; InstituteAdmin can view all doubts.

---

## 16. Screenshot Reference Index

All paths relative to `frontend/docs/`. Status as of 9 June 2026: **planned** (capture during next E2E run).

| Screenshot | Module | Status |
|------------|--------|--------|
| `e2e-screenshots/auth-login-institute-admin-pass.png` | Auth | Planned |
| `e2e-screenshots/auth-forced-password-reset-pass.png` | Auth | Planned |
| `e2e-screenshots/branding-admin-update-pass.png` | Branding | Planned |
| `e2e-screenshots/landing-admin-editor-pass.png` | Landing | Planned |
| `e2e-screenshots/students-create-pass.png` | Students | Planned |
| `e2e-screenshots/students-email-outbox-pass.png` | Email | Planned |
| `e2e-screenshots/cms-content-tree-pass.png` | Admin CMS | Planned |
| `e2e-screenshots/courses-topic-detail-pass.png` | Content | Planned |
| `e2e-screenshots/mcq-quiz-results-pass.png` | MCQ | Planned |
| `e2e-screenshots/flashcards-review-pass.png` | Flashcards | Planned |
| `e2e-screenshots/grades-leaderboard-pass.png` | Grades | Planned |
| `e2e-screenshots/enrollment-admin-provision-pass.png` | Enrollment | Planned |
| `e2e-screenshots/live-admin-create-pass.png` | Live Classes | Planned |
| `e2e-screenshots/zoom-settings-pass.png` | Zoom | Planned |
| `e2e-screenshots/recordings-members-only-pass.png` | Recordings | Planned |
| `e2e-screenshots/mentor-ask-en-pass.png` | Syllabus Mentor | Planned |
| `e2e-screenshots/teachers-subject-assign-pass.png` | Subject Teachers | Planned |
| `e2e-screenshots/qna-student-create-pass.png` | Ask Teacher | Planned |
| `e2e-screenshots/qna-teacher-reply-pass.png` | Ask Teacher | Planned |
| `e2e-screenshots/mistakes-list-pass.png` | Mistakes | Planned |
| `e2e-screenshots/superadmin-tenant-list-pass.png` | SuperAdmin | Planned |

Full test-case-to-screenshot mapping: see **`05-E2E-Test-Report.md` §4**.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-09 | Initial release for institute owners and support engineers |

---

*For engineering internals, see `03-Technical-Architecture-LMS.md`. For build status, see `04-Build-Progress-Tracker.md`.*
