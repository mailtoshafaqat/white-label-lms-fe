# White-Label LMS — Customization Policy

**Last updated:** June 2026  
**Audience:** Sales, support, institute admins, engineering  
**Companion:** [03-Technical-Architecture-LMS.md](./03-Technical-Architecture-LMS.md) §7.1.1, [08-Product-Feature-Catalog.md](./08-Product-Feature-Catalog.md)

---

## Principle

Customization is **configuration and content**, not **per-tenant code**. One codebase serves every institute. That keeps security, upgrades, and support predictable.

---

## What institutes can change (included)

| Layer | Examples | Where |
|-------|----------|--------|
| **Branding** | Logo, colours, display name, favicon, mentor label | Institute settings / branding API |
| **Landing page** | Hero, feature cards, course showcase, footer (section-based builder) | Public site per tenant |
| **Product profile** | `ExamPrep`, `GeneralLms`, or `Both` — toggles academy modules and UI labels (e.g. “batch” vs “course”) | SuperAdmin tenant setup |
| **Feature flags** | Mock exams, doubts, mistake diary, unit PYQ tests, live classes, self-enrollment, bundle pricing | SuperAdmin + tenant features |
| **Content** | Course tree, videos, notes, MCQs, mock exams, live classes | Admin / teacher CMS |
| **Operations** | SMTP, Zoom, teachers, students, enrollments | Institute admin settings |

---

## What is not customized per tenant (by default)

| Request | Policy |
|---------|--------|
| Custom HTML/CSS/JS on admin or student app | ❌ Not supported — XSS and fork risk |
| One-off screens only for one client | ❌ Becomes a **product feature** for all tenants, or a paid professional-services SOW |
| Different quiz engine or auth system for one tenant | ❌ Use feature flags or a new product module |
| Renaming internal API fields (`bundleId`, etc.) | ❌ UI labels only; data model stays shared |

---

## Product profiles vs white-label

- **White-label** = same product, their brand and toggles.
- **Product profile** = which *shape* of the product they bought:
  - **ExamPrep** — batches, mocks, doubts, academy wording.
  - **GeneralLms** — courses/modules, academy menus hidden unless enabled.
  - **Both** — dual wording (“batch or course”) and academy tools where flagged.

Labels in the UI follow the profile (`profileBundleLabel`, etc.). The database still uses `Bundle` everywhere.

---

## Paid customization (professional services)

When a client needs something outside config/content:

1. **Estimate** as a scoped SOW (hours + maintenance impact).
2. **Prefer** a reusable feature behind a flag so other tenants can use it later.
3. **Never** merge tenant-specific branches into `main` without a generalization plan.

Examples that belong here: custom reports, SSO integration, payment gateway, mobile app skin — not “change this one button for Acme Academy only.”

---

## Support quick answers

| Question | Answer |
|----------|--------|
| “Can we change the logo?” | Yes — branding settings. |
| “Can we hide mock exams?” | Yes — product profile + feature flags. |
| “Can we call batches ‘courses’?” | Yes — set profile to **GeneralLms** (automatic UI labels). |
| “Can we redesign the student dashboard layout?” | Not per tenant; request a product improvement or SOW. |
| “Can we add a custom login field?” | Product change or SOW; not a config toggle today. |

---

## Engineering checklist (new tenant-facing UI)

1. Use **tenant feature flags** and **product profile helpers** — no hard-coded “batch” if the label should vary.
2. Gate academy modules with `hasMockExams`, `hasDoubts`, etc.
3. New landing sections = **new section type in the registry**, available to all tenants.
4. Document new flags in [08-Product-Feature-Catalog.md](./08-Product-Feature-Catalog.md).
