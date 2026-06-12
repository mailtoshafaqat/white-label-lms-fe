# Roadmap Features — E2E Report

**Date:** 2026-06-12  
**Tenant:** `demo` (`?tenant=demo`)  
**API:** `http://localhost:5237`  
**Test script:** `backend/scripts/test-roadmap-features.ps1`

## Summary

| Feature | Backend | Frontend | API tests |
|---------|---------|----------|-----------|
| Video watch progress % | Done | Done | 4/4 pass |
| Certificates on completion | Done | Done | 2/2 pass |
| MCQ question-bank search | Done | Done | 2/2 pass |
| Cohort analytics + CSV export | Done | Done | 2/2 pass |
| Dashboard bundle progress (video+quiz) | Done | Done | 1/1 pass |

**Overall: 11/11 automated API tests passed.**

Deferred (out of scope): reviews, forums, proctoring, platform metering.

---

## 1. Video watch progress

### Backend
- Entity: `progress.LectureWatchProgress` (per user + lecture, monotonic 0–100%).
- Endpoints:
  - `PUT /api/v1/me/lectures/{lectureId}/progress`
  - `GET /api/v1/me/lectures/{lectureId}/progress`
  - `GET /api/v1/me/lectures/progress?lectureIds=…`
- Migration: `20260612182135_AddLectureWatchProgress`

### Frontend
- `ProtectedVideo` reports progress every ~8s (and on pause/end).
- Progress shown on `/videos`, `/topic/[id]`, and dashboard bundle bars.

### Completion rule (per topic)
- **Quiz path:** student submitted the topic quiz → topic complete.
- **Video path:** all lectures in the topic watched ≥ **90%** → topic complete.
- Topics with both quiz and video: **either** path completes the topic.

---

## 2. Certificates on completion

### Criteria
A **bundle certificate** is auto-issued once when:
1. Student is actively enrolled in the bundle, and
2. **Every topic** in the bundle is complete (quiz **or** video rule above).

One certificate per user per bundle (`CERT-{year}-{6-char}`).

### Backend
- Entity: `progress.CompletionCertificates`
- `GET /api/v1/me/certificates`
- `GET /api/v1/admin/certificates?bundleId=&page=&pageSize=`
- Issued after video progress save or quiz submit when bundle becomes complete.

### Frontend
- Student: `/certificates` + dashboard quick action
- Admin: `/admin/certificates`

---

## 3. MCQ question-bank search

### Backend
- `GET /api/v1/admin/questions/search?q=&page=&pageSize=` — searches question **stem** text (min 2 chars).

### Frontend
- `/admin/question-bank` — paginated search with link to topic editor.

---

## 4. Cohort analytics + export

### Backend
- `GET /api/v1/admin/analytics/cohort?bundleId=&subjectId=`
- `GET /api/v1/admin/analytics/cohort/students?bundleId=&subjectId=`
- `GET /api/v1/admin/analytics/cohort/export?bundleId=` → CSV

### Frontend
- `/admin/analytics` — overview KPIs, student table, CSV download.

---

## Role coverage (manual)

| Role | What to verify |
|------|----------------|
| **Student** (`student1@demo.com`) | Watch video → % updates; `/certificates` lists earned certs |
| **Teacher** | Question bank search; subject-scoped content unchanged |
| **Institute Admin** (`admin@demo.com`) | Analytics, certificates list, CSV export |
| **Support / SuperAdmin** | Platform routes unchanged; demo tenant isolation |

---

## Automated test results

```
PASS Video library loads
PASS Save lecture progress
PASS Get lecture progress
PASS Bulk lecture progress
PASS Student certificates list
PASS Admin certificates list
PASS MCQ search (admin)
PASS MCQ search short query empty
PASS Cohort analytics overview
PASS Cohort students + CSV export
PASS Dashboard bundle progress
```

Results JSON: `backend/scripts/test-roadmap-features-results.json`

---

## Manual verify commands

```powershell
# Terminal 1 — API
cd backend/src/Lms.Api
dotnet run

# Terminal 2 — Frontend
cd frontend
npm run dev

# Terminal 3 — API tests
powershell -File backend/scripts/test-roadmap-features.ps1

# Browser (demo tenant)
# Admin:  http://localhost:3000/login?tenant=demo  admin@demo.com / Dell123#
# Student: student1@demo.com (or e2e.student1@demo.com / E2eStudent1!)
# Pages:   /videos, /topic/{id}, /dashboard, /certificates
#          /admin/analytics, /admin/question-bank, /admin/certificates
```

---

## Known limits

- Certificate is metadata only (no PDF render yet).
- Question search matches stem substring only (no full-text index).
- Cohort analytics loads all enrolled students for a bundle in one request (fine for typical academy sizes).
