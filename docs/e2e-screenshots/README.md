# E2E Screenshots

Capture during manual regression and link from `05-E2E-Test-Report.md`.

Suggested filenames:

| File | Scenario |
|------|----------|
| `01-login-page.png` | Branded login (`/login?tenant=demo`) |
| `02-student-dashboard.png` | Student dashboard after login |
| `03-ask-teacher.png` | `/doubts` list |
| `04-admin-doubts-inbox.png` | `/admin/doubts` (teacher/admin) |
| `05-superadmin-tenants.png` | `/superadmin` tenant list |
| `06-topic-page.png` | Topic with video + Ask Teacher |
| `07-mentor-panel.png` | Syllabus Mentor on topic |

Re-capture after UI changes. Clear `frontend/.next` if dev server shows webpack errors, then restart `npm run dev`.
