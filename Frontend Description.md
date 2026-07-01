# Sportie — Frontend Technical Description

This document describes the implementation of the Sportie web client. It is written
against the source code in this repository; where behaviour is not derivable from the
code it is stated as such rather than assumed.

## 1. Purpose

Sportie is a dashboard for personal trainers. A trainer signs in and manages their roster
of trainees: tracking progress, building and editing workout and nutrition plans, reusing
saved templates, and reviewing analytics across all of their clients.

The trainer is the only interactive user of the application. Trainees are data records the
trainer operates on — there is no trainee-facing screen and no second login role. Every
piece of dynamic content (trainers, trainees, plans, templates, exercises, meals,
analytics) is loaded from the backend at runtime; nothing domain-specific is hard-coded in
the markup.

## 2. Technology stack

| Concern | Choice |
|---|---|
| Markup / styling | HTML5, hand-written CSS (no preprocessor, no framework) |
| Logic | Vanilla JavaScript, native ES modules (`<script type="module">`) |
| Charts | Chart.js (loaded from CDN) |
| Fonts | Google Fonts — Inter (app), Playfair Display (login) |
| Local dev server | `serve` (static file server, port 5500) |
| Build step | none — the browser loads the source files directly |

There is no framework (no React/Vue/Svelte), no bundler (no webpack/Vite/Rollup) and no
transpiler. The only npm dependency is `serve`, used in development to host the static
files; it ships nothing to the browser. This is a deliberate "platform-first" choice that
keeps the deliverable a set of plain static assets that can be hosted anywhere.

## 3. Folder structure

```
FrontendWebAppProjectShenkar/
├── index.html              Login / sign-up (entry point)
├── dashboard.html          KPI overview + monthly activity chart
├── trainees.html           Trainee roster (search + status filter)
├── trainee-profile.html    Single trainee: tabs, charts, active plans
├── templates.html          Workout & meal template library + builders
├── edit-training-plan.html  Weekly workout editor for a trainee
├── edit-meal-plan.html     Meal-slot editor for a trainee
├── analytics.html          Cross-trainee analytics
├── settings.html           Trainer profile, password, preferences
├── images/                 SVG nav icons, avatars, login background
├── style/                  base.css + components.css + per-page + per-widget CSS
└── js/
    ├── shared/             cross-cutting utilities and injected UI partials
    ├── services/           API / data access layer
    └── pages/              one controller module per page
```

`js/shared/` holds `config.js`, `http.js`, `base.js`, `sidebar.js`, `topbar.js`,
`toast.js`, `loader.js`, `skeleton.js`, `exerciseModal.js`, `imageUtils.js`.
`js/services/` holds `authService.js`, `dataService.js`, `analyticsService.js`.
`js/pages/` holds one module per page plus `formValidation.js` (login form) and
`editWorkout.js`.

## 4. Pages

| Page | Controller | Responsibility |
|---|---|---|
| `index.html` | `formValidation.js` | Single form that toggles between Login and Sign Up |
| `dashboard.html` | `dashboard.js` | Stat cards (total/active clients, average progress), monthly active-trainees line chart, most-active-clients panel |
| `trainees.html` | `trainees.js` | Searchable, status-filterable roster table |
| `trainee-profile.html` | `traineeProfile.js` | Header stats, Overview / Training Plan / Nutrition tabs, weekly-activity chart, recent sessions |
| `templates.html` | `templates.js` | Template library (workout/meal), workout builder, meal builder, assign-to-trainee modal |
| `edit-training-plan.html` | `editTrainingPlan.js` | Per-day workout editor with an exercise library |
| `edit-meal-plan.html` | `editMealPlan.js` | Meal slots/options editor with live macro totals |
| `analytics.html` | `analytics.js` | At-risk list, attendance distribution, leaderboard, volume-over-time, engagement heatmap |
| `settings.html` | `settings.js` | Profile, avatar upload, password change, preferences, delete account |

## 5. Routing and navigation

The application is a classic multi-page application (MPA). Each screen is a real HTML
document, and navigation is a full document load triggered by anchor links or
`window.location.href`. There is no client-side router and no History API view switching.

Context is carried between pages with query-string parameters — for example
`trainee-profile.html?id=<id>` and
`edit-training-plan.html?id=<id>&name=<name>&planId=<planId>`. The receiving page reads
them with `URLSearchParams(window.location.search)`.

The sidebar and topbar are not duplicated in every HTML file. Each page contains empty
mount points (`<div class="sidebar">`, the topbar container) that `sidebar.js` and
`topbar.js` populate at load time. Active-link highlighting is derived from the current
pathname, and the three trainee sub-pages highlight the "Trainees" nav item.

## 6. State management

There is no central store. State lives in three places, by design:

1. **Session / auth state** — a single `sessionStorage` entry under the key
   `sportieSession` holding `{ trainer, trainees }` as JSON, managed exclusively through
   `DataService.saveSession` / `getSession` / `clearSession`. Because it is
   `sessionStorage` (not `localStorage`), the trainer is signed out when the last tab is
   closed.
2. **A convenience global** — `window.sportieSession`, set during the shared bootstrap and
   read by pages that only need the current trainer id.
3. **Module-scoped page state** — transient UI state held in closures inside each page
   controller (current filter, builder draft, loaded chart instances, etc.).

Trainees are intentionally not cached in the session after login; each page re-fetches them
so the roster is always fresh. Settings keeps the cached trainer object in sync after an
edit.

## 7. API communication

The base URL is centralised in `js/shared/config.js`, which selects between a local and a
production backend by inspecting the current host:

```js
const LOCAL_API = 'http://localhost:3000/api';
const PROD_API  = 'https://sportie-server.onrender.com/api';
export const API_BASE = isLocal ? LOCAL_API : PROD_API; // isLocal = host contains localhost/127.0.0.1
```

Requests go through `js/shared/http.js`, a small Promise wrapper around `XMLHttpRequest`
that returns a `fetch`-like object (`{ ok, status, json() }`). JSON requests set
`Content-Type: application/json` and send `JSON.stringify(body)`. `analyticsService.js` is
the one module that uses the native `fetch` API directly instead of the wrapper.

`DataService` is the single gateway for almost every domain call. Because the backend uses
`snake_case` and the UI uses `camelCase`, `DataService` contains dedicated mapper functions
(`mapTrainer`, `mapTrainee`, `mapWorkoutTemplate`, `mapMealTemplate`, …) that normalise both
directions so that saved-then-reloaded data stays stable.

No authentication token or `Authorization` header is attached to any request — see §8.

## 8. Authentication flow

Login and sign-up share one form in `index.html` (the confirm-password field is hidden in
login mode). `formValidation.js` performs client-side checks before submitting: required
email/password, an email regex, a minimum 6-character password, and a password/confirm
match on sign-up. It then shows a button spinner and delegates to `AuthService`.

`AuthService.login` POSTs to `/auth/login` and maps backend statuses to typed errors
(401 → invalid credentials, 403 → no trainer profile). On success it maps the returned
trainer to camelCase and stores it in the session. Sign-up auto-logs-in and routes the new
trainer to `settings.html` to complete their profile; a successful login routes to
`dashboard.html`.

The backend issues **no token** — login returns only the trainer object — so on the client
"authenticated" means "a session object exists in `sessionStorage`". The route guard lives
in `base.js`, the shared bootstrap loaded by every inner page: on `DOMContentLoaded` it
redirects to `index.html` when no session is present. This is a usability guard, not a
security boundary; it is documented as such in §13.

## 9. Authorization

The client has a single role (trainer) and therefore no role-based UI, no permission checks
and no conditional rendering by role. The only gate is the binary authenticated/not
redirect. Where the UI appears to "restrict" something it is reacting to **data**, not
permissions — e.g. the Edit-Plan button is hidden when a trainee has no active plan, and
"New Template" is disabled once the per-trainer template cap is reached.

## 10. Forms and validation

`formValidation.js` validates only the login/sign-up form. Every other page validates
inline within its own controller:

- **Settings** — new-password must equal confirm; avatar must be an image and the
  compressed data URL must stay under a fixed character cap; blank password fields skip the
  password change.
- **Workout builder** — required name, goal and days-per-week, and at least one muscle
  group, with red inline field-error styling.
- **Meal builder / edit-meal-plan** — required name and at least one option in a slot; only
  slots that actually contain options are persisted.
- **Edit training plan** — required goal, a valid days-per-week, at least one exercise, and
  per-input clamping of sets/reps/rest to sane ranges.

Numeric inputs use `type="number"` with `min`/`max` and are coerced with
`parseInt`/`parseFloat` fallbacks.

## 11. Error handling, feedback and empty states

`js/shared/toast.js` is the single feedback system and the project's replacement for the
browser's `alert`/`confirm`/`prompt` dialogs (which the codebase does not use). It exposes:

- `showToast(message, type, duration)` — auto-dismissing success/error/warning/info toasts.
- `showConfirm(message, opts)` — a Promise-returning confirmation modal (used for
  destructive actions such as deleting a template or an account).
- `showInputModal(label, placeholder)` — a Promise-returning text-input modal (used to add
  custom exercise/meal names).

The standard service pattern is: a non-OK response throws `Error(body.message)`, the page
catches it and surfaces `err.message` through an error toast. Empty and degraded states are
handled deliberately throughout — the roster distinguishes "no trainees" from a load error,
analytics cards have explicit loading/empty/error states, and several reads return safe
defaults (an empty array, a zero-filled 12-month series) instead of throwing.

## 12. Loading states

Three complementary mechanisms cover loading feedback:

1. **`loader.js`** — a spinner that can replace a container's contents or overlay them; used
   for full-page initial loads (dashboard, settings, analytics cards).
2. **`skeleton.js`** — shimmer placeholder rows, used by the trainee roster while data
   loads.
3. **Button-level spinners** — buttons swap their label to "Saving…/Generating…" and
   disable while a request is in flight, then restore.

## 13. Responsive design

The desktop layout is a fixed 1440×1024 "canvas" that `base.js` scales with a CSS
`transform` to fit the viewport (`scale = min(width/1440, height/1024)`), recomputed on
resize. This mirrors the Figma artboard precisely. Below 768px the scaling is bypassed: the
canvas switches to normal document flow and a single mobile breakpoint (one
`@media (max-width: 767px)` block per page) drives a stacked layout. On mobile a hamburger
button in the topbar toggles the sidebar as an overlay drawer.

## 14. UI/UX components

- **Sidebar / topbar** — injected partials; the topbar has a plain-title variant and a
  breadcrumb variant for drill-down pages, and renders the trainer's avatar (uploaded photo
  or a coloured initial).
- **Exercise modal** — a lazily-created singleton overlay showing an exercise's tags,
  description, secondary muscles and numbered instructions; closes on overlay click or
  Escape; all dynamic text is HTML-escaped.
- **Template builders** — full-screen overlay panels for the workout builder (auto-generate,
  weekly/abstract blocks, drag-and-drop exercise library, per-exercise sets/reps/rest,
  workout/cardio/rest block types) and the meal builder (slots, TheMealDB search, per-100g
  macros with live scaled totals and a macro-target estimator).
- **Avatar compression** (`imageUtils.js`) — client-side downscaling to a compact data URL
  before upload, with SVGs passed through unchanged.

## 15. External libraries and APIs (client side)

- **Chart.js** (CDN) renders the dashboard line chart, the trainee weekly-activity bar
  chart and the analytics charts (bar, horizontal bar, line). The engagement heatmap is
  hand-built with a CSS grid. The code guards every draw with a `typeof Chart` check.
- **Google Fonts** supply Inter (all pages) and Playfair Display (login).
- The domain data (exercises, meals) reaches the client only through the Sportie backend;
  the client does not call ExerciseDB or TheMealDB directly.

## 16. Design patterns

- **Service layer / singleton modules** — `authService`, `dataService`, `analyticsService`
  are exported singleton objects that encapsulate all network access.
- **Adapter / mapper** — snake_case↔camelCase mappers isolate the UI from the backend
  schema.
- **Shared bootstrap** — `base.js` runs the same lifecycle (inject chrome, guard auth,
  paint the trainer profile, scale the canvas) on every inner page.
- **Page-controller** — one module per page, all following "import service → fetch →
  render".
- **Graceful degradation** — the template flow and exercise library fall back to in-memory
  records and a default exercise list when the backend is unreachable.

## 17. Implementation notes for reviewers

These are accurate observations from the code, useful when reviewing the client:

- **Authentication is a client-side convenience, not a security boundary.** No token is
  issued or sent; the guard only redirects unauthenticated visitors. Anyone can call the
  backend directly. This is a property of the system as designed; the matching backend note
  is in *Backend Description.md*.
- **Two HTTP mechanisms coexist** — a custom `XMLHttpRequest` wrapper for most calls and
  native `fetch` in `analyticsService.js`. Their error semantics differ (the wrapper
  resolves on HTTP errors and only rejects on network failure).
- **Login-page icons** reference Font Awesome classes (`fa-dumbbell`, `fa-eye-slash`) but no
  Font Awesome stylesheet is loaded on `index.html`, so those two glyphs do not render.
- **`templates.html`** contains one element whose `class` attribute uses smart quotes
  (`class=”tpl-meal-hint”`) instead of straight quotes, so that class is not applied.
- **`editWorkout.js`** has no corresponding `edit-workout.html` and is not loaded by any
  page; its save handler is a TODO. It is effectively dead code.
- **Some logic is duplicated** between the meal builder (`templates.js`) and
  `editMealPlan.js` (slot/option rendering, macro math, escape helpers) rather than shared
  through a common module.
- The Chart.js CDN URL is unpinned, so a future major Chart.js release could change chart
  behaviour.
