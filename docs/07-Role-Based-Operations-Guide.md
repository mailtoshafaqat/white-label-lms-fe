# White-Label LMS — Role-Based Operations Guide

**One document for everyone:** pick your role → open your login link → follow the steps below.

**Local URLs (development):**

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| API | http://localhost:5237 |
| Swagger | http://localhost:5237/swagger |

**Before you start (support / first-time setup):**

```bash
cd backend && docker compose up -d
cd backend && dotnet run --project src/Lms.Api
cd frontend && npm run dev
```

Optional test data: `.\scripts\e2e-seed-testdata.ps1` → passwords in `scripts/e2e-test-credentials.json`

Student features smoke test: `cd backend/scripts` → `.\test-student-learning-features.ps1` (bookmarks, search, weakness quiz)

Payment flows smoke test: `cd backend/scripts` → `.\test-payments.ps1` (manual, JazzCash, Easypaisa, approve/reject, admin record-manual)

---

## Pick your role

| Role | Who you are | Login link | After login, go to |
|------|-------------|------------|-------------------|
| **SuperAdmin** | Platform operator (multi-tenant SaaS) | [Login](http://localhost:3000/login) | [SuperAdmin console](http://localhost:3000/superadmin) |
| **Institute Admin** | Institute owner / head admin | [Login (demo tenant)](http://localhost:3000/login?tenant=demo) | [Admin](http://localhost:3000/admin) |
| **Teacher** | Subject teacher | [Login (demo tenant)](http://localhost:3000/login?tenant=demo) | [Admin (scoped)](http://localhost:3000/admin) |
| **Student** | Learner | [Login (demo tenant)](http://localhost:3000/login?tenant=demo) | [Dashboard](http://localhost:3000/dashboard) |

> **First login with a temp password?** You will be sent to http://localhost:3000/account/password — set a new password, then continue.

---

## Default & test credentials

### Built-in (always available after API seed)

| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | `superadmin@platform.com` | `SuperAdmin123!` |
| Institute Admin | `admin@demo.com` | `Admin123!` |

### E2E test users (after running seed script)

Open **`scripts/e2e-test-credentials.json`** for the latest emails/passwords (each seed run uses a new `runId` in emails).

Example (run `20260609-152955`):

| Role | Email | Password |
|------|-------|----------|
| Student | `e2e.student.amina.khan.20260609-152955@demo.com` | `E2eStudent!20260609-152955` |
| Teacher (Biology) | `e2e.teacher.bio.20260609-152955@demo.com` | see JSON |
| Teacher (Physics) | `e2e.teacher.phy.20260609-152955@demo.com` | see JSON |

---

# SuperAdmin

**Login:** http://localhost:3000/login  
**Home:** http://localhost:3000/superadmin

### What you can do

- Create and manage **tenants** (institutes)
- Set **feature flags** per tenant (live classes, mentor, self-enroll, etc.)
- Provision **institute admin** accounts
- Configure **tenant branding** at platform level
- View and override **storage quota** per tenant (usage vs plan limit, byte override, bypass)

### Your menu

| Task | URL |
|------|-----|
| Tenant list | http://localhost:3000/superadmin |
| Tenant detail & flags | http://localhost:3000/superadmin/tenants/{tenantId} |
| Storage quota (all tenants) | SuperAdmin tenant list + tenant detail storage section |

### Step-by-step: onboard a new institute

1. Open http://localhost:3000/superadmin
2. **Create tenant** — name, slug (e.g. `acme`), plan
3. Open the new tenant → set **flags**:
   - `AllowAdminCreateStudent` = on (admin can add students)
   - `AllowStudentSelfEnroll` = off (typical for institutes)
   - `LiveClassesEnabled` = on/off
   - `SyllabusMentorEnabled` = on/off
4. **Add institute admin** — email + temp password
5. Tell the owner to log in at `http://localhost:3000/login?tenant={slug}` and change password
6. **Reset institute admin password** later from tenant page → Institute admins row → **Reset password**

### Quick test checklist

- [ ] Login as SuperAdmin
- [ ] List tenants
- [ ] Open demo tenant → toggle `SyllabusMentorEnabled` → save
- [ ] Log out

---

# Institute Admin (Owner)

**Login:** http://localhost:3000/login?tenant=demo  
**Home:** http://localhost:3000/admin

### What you can do

Everything for **your institute**: branding, landing page, courses, students, teachers, live classes, doubts, email, Zoom, analytics, certificates, storage.

### Your admin menu (all links)

| Area | URL |
|------|-----|
| Admin home (KPIs + storage) | http://localhost:3000/admin/home |
| Content tree (CMS) | http://localhost:3000/admin |
| Progress | http://localhost:3000/admin/progress |
| Cohort analytics | http://localhost:3000/admin/analytics |
| Question bank | http://localhost:3000/admin/question-bank |
| Certificates | http://localhost:3000/admin/certificates |
| Certificate template | http://localhost:3000/admin/certificates/template |
| Teachers | http://localhost:3000/admin/teachers |
| Students | http://localhost:3000/admin/students |
| Payments | http://localhost:3000/admin/payments |
| Payment settings | http://localhost:3000/admin/settings/payments |
| Doubts inbox | http://localhost:3000/admin/doubts |
| Live classes | http://localhost:3000/admin/live-classes |
| Branding | http://localhost:3000/admin/settings/branding |
| Landing page | http://localhost:3000/admin/settings/landing |
| Email (SMTP) | http://localhost:3000/admin/settings/email |
| Zoom | http://localhost:3000/admin/settings/zoom |
| Public landing (preview) | http://localhost:3000/ |

### Configuration order (new institute)

Do these **once**, in order:

| Step | URL | What to set |
|------|-----|-------------|
| 1 | `/admin/settings/branding` | Display name, logo, primary colour, favicon |
| 2 | `/admin/settings/landing` | Hero, features, footer sections |
| 3 | `/admin/settings/email` | SMTP (or use dev-outbox in `backend/dev-emails/`) |
| 4 | `/admin/settings/payments` | Enable gateways (Stripe, JazzCash, Easypaisa, manual); currency; bank instructions |
| 5 | `/admin/settings/zoom` | Zoom OAuth **or** skip and use manual join URLs |
| 6 | `/admin` | Build bundle → subject → unit → topic |
| 7 | `/admin/topics/{id}` | Add video, notes, MCQs, flashcards |
| 8 | `/admin/teachers` | Create teachers + assign subjects |
| 9 | `/admin/students` | Create students **with bundle** (enrollment) |
| 10 | `/admin/certificates/template` | Enable certificate template + branding (required for auto-issue) |
| 11 | `/admin/live-classes` | Schedule classes (pick subject + host teacher) |

### Setup wizard vs checklist

| Tool | Purpose | When |
|------|---------|------|
| **Setup wizard** (`/admin/setup`) | First-login tour; links to key screens | Once, on first Institute Admin login |
| **Setup checklist** (`/admin/checklist`) | Tracks real completion; auto-detects progress | Ongoing until launch-ready |

**Set up later** on a wizard step only advances the tour — it does **not** mark the checklist item done. When you actually save branding (or other settings), the checklist updates automatically.

### Step-by-step: add a student with enrollment

1. Go to http://localhost:3000/admin/students
2. **Add student** — name, email, select **bundle**
3. Copy the **temporary password** shown on screen
4. Send credentials to the student (email if SMTP is configured)
5. Student logs in at http://localhost:3000/login?tenant=demo → changes password → sees dashboard

### Step-by-step: enroll an existing student

Use when the student account already exists but needs access to another bundle (or was created without a bundle).

1. Go to http://localhost:3000/admin/students
2. Find the student → click the **calendar** icon (enrollments)
3. Click **Enroll in course/batch** → select bundle → optional expiry date → **Enroll**
4. Student refreshes dashboard — enrolled content appears

> If enrollment already exists but **expired**, use **Extend access** instead of enrolling again.

### Step-by-step: record offline payment & enroll

Use when a student **already has an account** and paid offline (bank/cash). No student checkout required.

1. Go to http://localhost:3000/admin/payments
2. In **Record offline payment & enroll**, select **student**, **bundle**, enter **transaction reference** (required) and optional note
3. Submit — order is marked **Paid** and student is enrolled immediately

Manual proof is **text only** (transaction reference + note). There is no screenshot upload in the app.

### Step-by-step: student pays via checkout (manual or online)

Use when the student should submit payment themselves.

1. Configure gateways at `/admin/settings/payments`
2. Student logs in → dashboard → **Enroll** or **Checkout** on a paid bundle → `/checkout/{bundleId}`
3. **Manual:** enter transaction reference + optional note → waits for admin approval at `/admin/payments` (institute admins receive email if SMTP is configured)
4. **Online:** Stripe / JazzCash / Easypaisa → auto-enroll on successful payment
5. Use **Back to dashboard** on checkout to cancel without paying

### Student account actions (Institute Admin)

| Action | Effect |
|--------|--------|
| **Block** | Sets `isActive=false` — login rejected |
| **Activate** | Restores login |
| **Reset password** | New temp password; forced change on next login |

### Teacher account actions (Institute Admin)

| Action | Effect |
|--------|--------|
| **Block** | Teacher cannot sign in |
| **Activate** | Restores login |
| **Reset password** | New temp password; forced change on next login |

> **Password reset scope:** Institute Admin resets **students and teachers**. SuperAdmin resets **institute admins** on the tenant page.

> **Important:** Demo tenant has self-enroll **off**. Students must be enrolled by admin at creation, via **Enroll in course/batch**, via **record offline payment**, or after **checkout approval**. This is expected.

### Step-by-step: assign a teacher

1. http://localhost:3000/admin/teachers → **Add teacher**
2. Copy temp password
3. Select subjects for that teacher → **Save assignments**
4. Teacher logs in → sees only assigned subjects in CMS and doubts

### Step-by-step: schedule a live class

1. http://localhost:3000/admin/live-classes
2. **Create** — pick **subject**, **host** (teacher assigned to that subject), date/time
3. If Zoom not configured: paste a **manual join URL**
4. Student sees class on http://localhost:3000/dashboard

### Quick test checklist

- [ ] Login as `admin@demo.com`
- [ ] Update branding → refresh dashboard header
- [ ] Create one student with bundle
- [ ] Enroll an existing student in a second bundle (enrollments panel)
- [ ] Record one offline payment at `/admin/payments` (optional)
- [ ] Create one teacher + assign subject
- [ ] Schedule one live class
- [ ] Open doubts inbox http://localhost:3000/admin/doubts
- [ ] Log out

---

# Teacher

**Login:** http://localhost:3000/login?tenant=demo  
**Home:** http://localhost:3000/admin (scoped to your subjects)

### What you can do

- Edit **content** only for **assigned subjects**
- View **cohort analytics** and **question bank** for assigned subjects
- View **certificates** for students in assigned bundles
- Schedule **live classes** (you must be host for your subjects)
- Reply to **student doubts** for your subjects

### Your menu

| Area | URL |
|------|-----|
| Admin home | http://localhost:3000/admin/home |
| Content (your subjects only) | http://localhost:3000/admin |
| Progress | http://localhost:3000/admin/progress |
| Cohort analytics | http://localhost:3000/admin/analytics |
| Question bank | http://localhost:3000/admin/question-bank |
| Certificates | http://localhost:3000/admin/certificates |
| Doubts inbox | http://localhost:3000/admin/doubts |
| Live classes | http://localhost:3000/admin/live-classes |
| Student dashboard (your view) | http://localhost:3000/dashboard |

> Teachers do **not** see: Students, Teachers, Branding, Landing, Email, Zoom tabs.

### Step-by-step: reply to a student doubt

1. http://localhost:3000/admin/doubts
2. Filter **open** threads
3. Open a thread → read question
4. Type **reply** → Send
5. Click **Mark resolved** when done

### Step-by-step: edit topic content

1. http://localhost:3000/admin
2. Expand your subject → unit → topic
3. Click topic → http://localhost:3000/admin/topics/{id}
4. Add/edit lectures, notes, MCQs, or flashcards
5. Optional: **Index for Syllabus Mentor** button (re-indexes notes for AI)

### Quick test checklist

- [ ] Login with teacher credentials from JSON
- [ ] Confirm only assigned subjects appear in content tree
- [ ] Reply to one doubt
- [ ] Create one live class as host
- [ ] Log out

---

# Student

**Login:** http://localhost:3000/login?tenant=demo  
**Home:** http://localhost:3000/dashboard

### What you can do

- View **enrolled courses** and topics
- Watch videos, read notes; **video progress** saves automatically on topic player and `/videos`
- Take **quizzes**, review **flashcards**
- View **certificates** and download PDF when bundle is fully complete
- See **grades** and **leaderboard**
- Join **live classes**
- Use **Syllabus Mentor** (AI) and **Ask Teacher** (human doubts)
- Review **mistake diary**
- **Bookmark** topics and questions for revision
- **Search** topics and subjects from the dashboard
- **Weakness practice quiz** (from mistakes + low-score topics)

### Your links

| Task | URL |
|------|-----|
| Dashboard (+ global search) | http://localhost:3000/dashboard |
| Video library (watch progress) | http://localhost:3000/videos |
| Topic (video + notes) | http://localhost:3000/topic/{topicId} |
| Daily Practice Test (quiz) | http://localhost:3000/quiz/{topicId} |
| Flashcards | http://localhost:3000/flashcards/{topicId} |
| Certificates | http://localhost:3000/certificates |
| Bookmarks | http://localhost:3000/bookmarks |
| Weakness quiz | http://localhost:3000/weakness-quiz |
| Syllabus Mentor | http://localhost:3000/mentor |
| Ask Teacher | http://localhost:3000/doubts |
| Mistake diary | http://localhost:3000/mistakes |
| Checkout (paid bundle) | http://localhost:3000/checkout/{bundleId} |
| Forgot password | http://localhost:3000/forgot-password?tenant=demo |

### Step-by-step: daily learning flow

1. Login → http://localhost:3000/dashboard
2. Click a **topic card** → watch video, read notes
3. Click **Take the Daily Practice Test** → submit answers → see explanations
4. Click **Review flashcards**
5. Wrong answers appear later in http://localhost:3000/mistakes

### Step-by-step: bookmarks

1. Open a **topic** → click **Save** in the header (or save a question from **Mistake diary**)
2. Open http://localhost:3000/bookmarks to see all saved items
3. Click **Open** to jump back to the topic

### Step-by-step: global search

1. On http://localhost:3000/dashboard, use the **Search topics and subjects** box
2. Type at least 2 characters (e.g. `bio`, `physics`)
3. Click a result to open the topic

### Step-by-step: weakness practice quiz

1. Complete at least one topic quiz with some wrong answers (feeds mistake diary)
2. Go to http://localhost:3000/weakness-quiz **or** Mistake diary → **Start weakness practice quiz**
3. Answer questions → submit → see score; correct answers clear matching mistakes

### Step-by-step: ask a teacher

1. http://localhost:3000/doubts (or **Ask Teacher** on topic page)
2. **Ask a question** → choose **subject** → type question → Submit
3. Return to `/doubts` to see replies
4. Add **follow-up** while thread is Open

### Step-by-step: pay for a course (checkout)

1. On dashboard, find a **paid** bundle with checkout enabled → click to open `/checkout/{bundleId}`
2. Select country (JazzCash/Easypaisa show for Pakistan)
3. Choose payment method:
   - **Manual** — pay per institute instructions → enter **transaction reference** → submit → admin approves at `/admin/payments`
   - **Online** — continue to Stripe / JazzCash / Easypaisa
4. After enrollment, open topics from dashboard — content requires active enrollment

### Step-by-step: use Syllabus Mentor (AI)

1. http://localhost:3000/mentor **or** side panel on topic page
2. Pick topic or subject scope
3. Ask in English or Urdu
4. Read answer with citations from course notes

### Quick test checklist

- [ ] Login as seeded student (must be enrolled in a bundle)
- [ ] Dashboard shows courses and live classes
- [ ] Complete one quiz
- [ ] Save one bookmark; open `/bookmarks`
- [ ] Search for a topic from dashboard
- [ ] Run weakness quiz after wrong answers
- [ ] Submit one doubt
- [ ] Ask Mentor one question
- [ ] Log out

---

# Configuration reference (all roles)

| Setting | Who configures | URL |
|---------|----------------|-----|
| Institute branding | Institute Admin | `/admin/settings/branding` |
| Public landing page | Institute Admin | `/admin/settings/landing` |
| Outbound email | Institute Admin | `/admin/settings/email` |
| Zoom meetings | Institute Admin | `/admin/settings/zoom` |
| Payment gateways | Institute Admin | `/admin/settings/payments` |
| Tenant flags | SuperAdmin | `/superadmin/tenants/{id}` |
| Storage quota override | SuperAdmin | `/superadmin/tenants/{id}` (storage section) |
| Institute storage usage | Institute Admin | `/admin/home` |
| Course structure | Institute Admin / Teacher | `/admin` |
| Student accounts | Institute Admin | `/admin/students` |
| Teacher + subjects | Institute Admin | `/admin/teachers` |

### Tenant flags (what students/admins see)

| Flag | When OFF |
|------|----------|
| `AllowStudentSelfEnroll` | No Enroll button on dashboard — admin must enroll |
| `AllowAdminCreateStudent` | Cannot create students in admin |
| `LiveClassesEnabled` | Live class UI hidden |
| `SyllabusMentorEnabled` | Mentor links and AI panel hidden |
| `Status = Suspended` | Login blocked for that institute |

---

# Troubleshooting (quick fixes)

| Problem | Fix |
|---------|-----|
| Login fails | Check API is running on 5237; use correct `?tenant=demo` for institute users |
| Student login fails after block | Institute admin must **Activate** the student at `/admin/students` |
| Forgot student password | Institute admin uses **Reset password** on `/admin/students` |
| Forgot teacher password | Institute admin uses **Reset password** on `/admin/teachers` |
| Teacher login fails after block | Institute admin must **Activate** at `/admin/teachers` |
| Student sees no courses | Admin must enroll student in a bundle (`/admin/students` — create with bundle, **Enroll in course/batch**, or **record offline payment** at `/admin/payments`) |
| Student gets 403 on topic/quiz | Student is logged in but **not enrolled** in that bundle — enroll or extend access |
| Topic content visible without login | Members-only lectures hide URL; full enrollment enforcement applies once logged in as student |
| Teacher sees empty CMS | Institute admin must assign subjects at `/admin/teachers` |
| Doubts return error | Student must be enrolled in the subject’s bundle |
| Emails not sent | Configure SMTP or check `backend/dev-emails/*.html` |
| Zoom meetings not created | Configure `/admin/settings/zoom` or use manual join URL |
| Frontend blank / 500 error | Stop dev server, delete `frontend/.next`, run `npm run dev` again |
| Page “Loading…” forever | Confirm API is up; check browser console |
| Upload fails with 413 | Institute over storage quota — free space or ask SuperAdmin for override/bypass |
| Certificate not issued | Enable template at `/admin/certificates/template`; student must complete all topics in bundle |
| Storage widget shows 0 used | Files uploaded before metering may need backfill — re-upload or run storage backfill |

---

# Related documents

| Document | Use when |
|----------|----------|
| `06-User-Manual-Owners-Support.md` | Deep dive on every feature |
| `05-E2E-Test-Report.md` | Formal QA test cases |
| `scripts/e2e-test-credentials.json` | Latest test logins |
| `04-Build-Progress-Tracker.md` | Module completion status |
| `12-Technical-Handover.md` | Architecture + codebase orientation |
| `09-Customization-Policy.md` | What institutes can customize (branding, flags) vs paid bespoke work |

---

**Tip for handing this to someone new:**  
1. Start the stack (Docker + API + frontend).  
2. Run `.\scripts\e2e-seed-testdata.ps1`.  
3. Open this doc → pick role → click login link → follow that role’s checklist.
