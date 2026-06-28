# Sportie — Roadmap (Frontend & Backend Missions)

A practical checklist of what's left to make the project complete, split into
**Frontend Missions** (what we build/finish on the client) and **Backend
Missions** (everything else). Within each, items are ordered Must-Have →
Polish → Stretch.

---

## Where the project stands today

**Backend (Node/Express + TiDB Cloud)**
- Auth: signup + login with bcrypt, login returns the trainer profile.
- Trainers, trainees endpoints reading from TiDB.
- `status` column on trainees (active / paused / finished).
- Three API integrations live (service → controller → router):
  - ExerciseDB (RapidAPI) — exercises, body parts, targets, equipment, search.
  - TheMealDB — search, filters, categories, random.
  - Plan generator — rules engine that builds a workout from goal + days + body parts.

**Frontend (plain HTML/CSS/JS)**
- Converted to ES modules.
- `dataService.js` / `authService.js` talk to the real backend (no more JSON mock).
- Login, dashboard (stats + monthly chart), and trainees page read live from TiDB.
- Status badges and filtering working end to end.
- **Settings** page complete (profile, avatar photo upload, change password, preferences, delete).
- **Analytics** page complete (5 analyses with Chart.js, Graph/List + range toggles, heatmap drilldown).
- API base URL centralized in `config.js`; all HTTP now goes through a shared **`XMLHttpRequest`** wrapper (`http.js`).
- Sidebar + top bar extracted into shared injected partials (`sidebar.js` / `topbar.js`).
- `trainee-profile` and `edit-workout` pages scaffolded (navigation works; data wiring still pending).

**What this means:** the spine works. The remaining work is breadth (more
pages), persistence (saving generated plans), and the production layer.

---

# Frontend Missions

What we need to build or finish on the client side.

## Must-Have

### Build the remaining pages
Each existing HTML mockup needs a page JS file (same pattern as `dashboard.js` /
`trainees.js`): import service → fetch → render.

- [ ] **Templates page** — the plan generator UI (pick goal, days, body parts → generate → show plan → save to a trainee). The showcase page.
- [ ] **Trainee profile page** — 🟡 partial. `trainee-profile.html` + `traineeProfile.js` exist and the trainees list navigates to it (plus an `edit-workout` page), but it does **not** yet fetch/render the trainee's info, status, progress, or saved plans.
- [ ] **Meals page** (or section) — search/browse TheMealDB, attach meals to a trainee's plan.
- [x] **Analytics page** — ✅ done. 5 analyses (at-risk, attendance distribution, improvement leaderboard, volume over time, engagement heatmap) with a Graph/List toggle, range selectors, and a per-trainee heatmap drilldown (Chart.js). `analytics.js` + `analyticsService.js` + `analytics.css`.
- [x] **Settings page** — ✅ done. Profile (name, specialization, avatar with photo upload), change password, preferences (units / notifications), delete account.

### Top bar — notifications & profile windows
The bell and user area in the top-right corner currently only `console.log`.
Build them out so the top bar is complete (and not dead UI).

- [ ] **Notifications window** — clicking the bell opens a dropdown panel listing notifications (e.g. trainee activity, status changes, reminders), with an unread indicator/badge and an empty state ("No new notifications").
- [ ] **Profile window** — clicking the user area opens a menu (e.g. trainer name + avatar header, "Settings", "Log out"), positioned under the avatar and closing on outside-click.
- [ ] Both windows must match the app's visual style and replace the existing `console.log` handlers in `base.js`.

### Signup flow (client side)
- [ ] Wire the sign-up branch in `formValidation.js` to actually POST to `/signup` (today the toggle routes through `login()`).
- [ ] After signup, either auto-login or redirect to login with a success message.

### Error & empty states
- [ ] Show user-friendly messages when a request fails (not just `console.error`).
- [ ] Handle empty data gracefully on every page (no trainees, no plans, no search results).
- [ ] Loading indicators while API calls are in flight (ExerciseDB calls can take a moment).

## Polish

- [ ] **Send the JWT** as a `Bearer` header on API calls (once the backend issues one).
- [x] **Centralize the API base URL** — ✅ done. Now in `config.js`, imported by `dataService.js` and `authService.js`.
- [ ] **Remove leftover `console.log`** debugging statements on the client.
- [ ] **Responsive design.** The fixed 1440×1024 canvas scaling works but isn't truly responsive — real mobile support is a plus.

## Stretch

- [ ] **Progress tracking (UI).** Let trainers log a trainee's workout completion and watch the progress number / chart update.
- [ ] **PDF export.** Generate a printable workout/meal plan a trainer can hand to a trainee.

---

## Page scope — 2-day build detail

Confirmed scope for the four remaining pages. Realistic for two people over two days.

### templates.html
- Workout plan generator: pick goal, days per week, body parts → generate a plan shown day by day (exercises with sets/reps/rest).
- Meal plan builder: search/browse meals from TheMealDB and add them to a plan.
- Save a plan as a reusable template (workout or meal) to use again later.
- Assign a plan to a specific trainee.
- "My templates" library: view, reuse, rename, or duplicate saved plans.

### analytics.html
- Status breakdown (active / paused / finished).
- Progress distribution (trainees per progress range).
- Goal breakdown (Fat Loss / Muscle Gain / Endurance).
- Average progress overall.
- A selector to choose what to analyze and how to sort it (by progress, goal, status).
- Show results as either a graph or a list, depending on the selection.

### settings.html
- Trainer profile: name, specialization, avatar.
- Account info: email (Gmail), date of birth.
- Change password.
- Delete account.
- Simple preferences: units (kg / lb) and notifications toggle.

---

# Backend Missions

Everything else needed to make the project complete.

## Must-Have

### Plan-saving database layer
The generator builds a plan **in memory** and throws it away — a trainer can't
save a plan to a trainee. This is the single most important missing feature.

- [x] Add two tables: `workout_plans` (id, trainer_id, trainee_id, name, goal, created_at) and `plan_exercises` (plan_id, exercise_id, day, sets, reps, rest, order). ✅ `db_init.sql` + migrations.
- [x] `services/planService.js` — DB layer (uses `dbConnection`), separate from the generator. ✅
- [x] `controllers/planController.js` — add save/read handlers alongside the existing generate handler. ✅
- [x] Endpoints: `POST /api/plans/save` (save), `GET /api/plans/active/:traineeId` (trainee's active plan), `GET /api/plans/:planId` (one plan), `PUT /api/plans/:planId` (update), `GET /api/plans/meal-plan/:traineeId`, `PUT /api/plans/meal-plan/:planId`. ✅ all live in `planRouter.js`.
- [x] Store only the ExerciseDB **id** + sets/reps; hydrate full details from ExerciseDB on read. ✅

### Trainer profile on signup
- [x] Signup currently creates a `users` row but not a `trainers` row — a new trainer would have no profile. Fixed: `authService.signup` atomically creates both the `users` row and the `trainers` row. ✅

## Polish

### Security & auth hardening
- [ ] **JWT tokens.** Return a JWT on login, verify it via middleware on protected routes.
- [ ] **Protect the API routes.** Anyone can hit `/api/trainees/...` without auth — add auth middleware so only logged-in trainers can read their data.
- [ ] **Authorization checks.** A trainer should only see *their own* trainees — enforce `trainer_id` matches the logged-in user, server-side.
- [ ] **Tighten CORS.** Currently `Access-Control-Allow-Origin: *`. Lock it to the frontend origin.

### Caching ExerciseDB (quota protection)
- [ ] Cache exercise data in a DB table (or in-memory with TTL) so repeated lookups don't burn quota.
- [ ] Cache the body-part / equipment / target lists (they basically never change).

### Input validation
- [ ] Validate request bodies (e.g. plan generation: goal is valid, daysPerWeek is 1–7) — `zod` or `express-validator`.
- [ ] Sanitize/guard route params before they hit SQL (parameterized queries already used — also validate types).

### Code consistency
- [ ] Consistent error response shape across all controllers (`{ message }` everywhere).
- [ ] Remove leftover `console.log` debugging statements on the server.
- [ ] Env-var startup guard in `index.js` (fail fast if a key is missing).

## Stretch

- [ ] **Progress tracking (persistence).** Store trainee workout completion so the progress number / chart can update.
- [ ] **Nutrition data.** TheMealDB has no macros — supplement with a nutrition API (Edamam/Spoonacular) so meal plans show calories/protein.
- [ ] **LLM-personalized plans.** Layer Claude on top of the rules engine to personalize exercise selection by injury/preference, validated against ExerciseDB ids.
- [ ] **Tests.** A handful of backend endpoint tests (Jest + supertest).

---

# Shared / Production

Touches both sides.

- [ ] **README.** What the project is, architecture diagram (frontend → Express → TiDB + external APIs), setup steps, env variables, how to run it, screenshots.
- [ ] **Deploy.** Frontend on Vercel/Netlify, backend on Render/Railway, DB already on TiDB Cloud. Update CORS + API base URL for production.

---

## Known gaps worth being able to explain

- **No JWT yet** — session storage only; the upgrade path is known.
- **Trainer profile on signup** — signup creates a user but not a trainer profile.
- **No authorization** — API trusts the caller; a trainer could request another trainer's data.
- **ExerciseDB BASIC tier** — no GIFs, limited request quota; caching mitigates.
- **TheMealDB** — recipes only, no nutrition/macros.
- **`DB_PORT` in `.env` is unused** — `db_connection.js` doesn't read it (defaults apply).

---

# Course submission requirements — frontend alignment

From the course submission brief (frontend items only; backend listed only where
the client must talk to it). ✓ = already aligned, [ ] = still to do.

## Rule compliance (lose points directly if missing)

- [ ] **No `alert` / `confirm` / `prompt`.** `settings.js` delete-account uses `confirm(...)` — replace with a styled in-page modal/popup.
- [ ] **No inline `style="..."` in HTML.** Move to CSS classes — e.g. stat-card positions in `dashboard.html`, the `top:` values on sidebar nav items, the absolute positions in `edit-workout.html`.
- [ ] **No `!important` without justification.** 3 uses: `trainees.css` (`.filter-btn-active` ×2) and `sidebar.css` (`.nav-item { top: unset }`). Refactor or justify.
- [ ] **Folder structure** must be `index.html`, `/js`, `/style`, `/images`. We use `/css` (not `/style`) and have no `index.html` — rename `css/` → `style/` (update all `<link>` hrefs) and add an `index.html` entry point.
- [x] **No `node_modules` committed** — `.gitignore` added. ✓
- [x] **ES6 / ES modules** — used throughout. ✓

## UX — everything shown must work

- [ ] **No dead UI.** Implement or remove: the "coming soon" pages (templates / analytics ) and the notifications bell + user-menu (currently `console.log` only).
- [ ] **Remove leftover `console.log`** (`base.js`, `dashboard.js`, `trainees.js`) — also keeps the Console clean during normal use (a brief requirement).
- [ ] **Server-action states on every API page:** loading, success, error, and "no data" (partly done on dashboard / trainees / settings).

## Completeness & graded items

- [ ] **Build the remaining pages so the external API is actually used on the client** — templates → ExerciseDB / plan generator, meals → TheMealDB. The external API must be a real part of the system, not a stray call.
- [ ] **Finish the trainee profile page** (fetch + render the trainee's info / status / progress / plans; today it only reads `name` from the URL).
- [ ] **Signup flow** wired to the backend (user management is a graded item).
- [ ] **Figma fidelity** — match the Figma design precisely; pages not in Figma keep the same visual style.
- [x] **JS library embedded** — Chart.js on the dashboard. ✓ (reuse it on the analytics page.)
- [x] **Dynamic data from the DB** — trainees / trainers load from the backend, not hard-coded. ✓

## Production & submission (not localhost only)

- [ ] **Deploy the frontend** to a live URL (Vercel/Netlify) and set `PROD_API` in `config.js` — the project must be testable via an active link, not localhost.
- [ ] **Moodle artifacts:** project home-page link, Figma link, **frontend** GitHub repo, ZIP, and a testing-notes doc naming the external API and the JS library (Chart.js) used.
- [ ] **Meaningful Git history** — commits throughout the work, not one final dump.
- [x] **API base URL is env-aware** (`config.js` switches local ↔ prod). ✓
