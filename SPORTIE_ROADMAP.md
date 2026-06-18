# Sportie — Roadmap to a Presentable Project

A practical checklist of what's done, what's left, and what would make this stand out in interviews. Ordered by priority: do the **Must-Have** items first (they make it *work*), then **Polish** (makes it *impressive*), then **Stretch** (makes it *memorable*).

---

## Where the project stands today

**Backend (Node/Express + TiDB Cloud)**
- Auth: signup + login with bcrypt, login returns the trainer profile.
- Trainers, trainees endpoints reading from TiDB.
- `status` column added to trainees (active / paused / finished).
- Three API integrations live over HTTP, each as service → controller → router:
  - ExerciseDB (RapidAPI) — exercises, body parts, targets, equipment, search.
  - TheMealDB — search, filters, categories, random.
  - Plan generator — rules engine that builds a workout from goal + days + body parts.

**Frontend (plain HTML/CSS/JS)**
- Converted to ES modules.
- `dataService.js` / `authService.js` talk to the real backend (no more JSON mock).
- Login, dashboard (stats + monthly chart), and trainees page all read live from TiDB.
- Status badges and filtering working end to end.

**What this means:** the spine of the app works. The remaining work is breadth (more pages), persistence (saving generated plans), and the production/presentation layer.

---

## 1. Must-Have — makes the project actually complete

These are the gaps that an interviewer would notice immediately if missing.

### 1.1 Plan-saving database layer
Right now the generator builds a plan **in memory** and throws it away. A trainer can't save a plan to a trainee. This is the single most important missing feature — it's the core promise of the product.

- [ ] Add two tables: `workout_plans` (id, trainer_id, trainee_id, name, goal, created_at) and `plan_exercises` (plan_id, exercise_id, day, sets, reps, rest, order).
- [ ] `services/planService.js` — DB layer (uses `dbConnection`), separate from the generator.
- [ ] `controllers/planController.js` — add save/read handlers alongside the existing generate handler.
- [ ] Endpoints: `POST /api/plans` (save), `GET /api/plans/trainee/:id` (a trainee's plans), `GET /api/plans/:id` (one plan).
- [ ] Store only the ExerciseDB **id** + sets/reps; hydrate full details from ExerciseDB on read.

### 1.2 Build the remaining pages
Each existing HTML mockup needs a page JS file (same pattern as `dashboard.js` / `trainees.js`): import service → fetch → render.

- [ ] **Templates page** — the plan generator UI (pick goal, days, body parts → generate → show plan → save to a trainee). This is your showcase page.
- [ ] **Trainee profile page** — clicking a trainee row currently only logs to console. Build the profile view: their info, status, progress, and saved plans.
- [ ] **Meals page** (or section) — search/browse TheMealDB, attach meals to a trainee's plan.
- [ ] **Analytics page** — at least one real chart beyond the dashboard (e.g. status breakdown, progress distribution).
- [ ] **Settings page** — even if minimal, wire the trainer's own profile (name, specialization, avatar).
- [ ] **Messages page** — if not building real messaging, make it an honest "coming soon" rather than a dead mockup.

### 1.3 Signup flow
The backend has `POST /api/auth/signup`, but the frontend never calls it. The login page has a sign-up toggle that currently routes through `login()`.

- [ ] Wire the sign-up branch in `formValidation.js` to actually POST to `/signup`.
- [ ] After signup, either auto-login or redirect to login with a success message.
- [ ] Note: signup currently only creates a `users` row, not a `trainers` row — a new trainer would have no profile. Decide how a trainer profile gets created on signup (this is a real gap worth solving and worth explaining in an interview).

### 1.4 Error & empty states
- [ ] Show user-friendly messages when a fetch fails (not just `console.error`).
- [ ] Handle empty data gracefully on every page (no trainees, no plans, no search results).
- [ ] Loading indicators while API calls are in flight (ExerciseDB calls can take a moment).

---

## 2. Polish — makes the project look professional

This is the difference between "it works" and "this person knows what they're doing."

### 2.1 Security & auth hardening
Strong talking points for interviews.

- [ ] **JWT tokens.** Currently auth relies on session storage with no token. Add a JWT returned on login, sent as a `Bearer` header, verified by middleware on protected routes. This is the #1 thing that signals real backend understanding.
- [ ] **Protect the API routes.** Right now anyone can hit `/api/trainees/...` without auth. Add auth middleware so only logged-in trainers can read their data.
- [ ] **Authorization checks.** A trainer should only see *their own* trainees — enforce `trainer_id` matches the logged-in user, server-side (not just in the UI).
- [ ] **Tighten CORS.** Currently `Access-Control-Allow-Origin: *`. Lock it to your frontend origin.

### 2.2 Caching ExerciseDB (quota protection)
Your RapidAPI BASIC tier has a monthly request cap. Generating plans hammers it.

- [ ] Cache exercise data in a DB table (or in-memory with TTL) so repeated lookups don't burn quota.
- [ ] Cache the body-part / equipment / target lists (they basically never change).

### 2.3 Input validation
- [ ] Validate request bodies on the backend (e.g. plan generation: goal is valid, daysPerWeek is 1–7). A library like `zod` or `express-validator` is a nice signal.
- [ ] Sanitize/guard route params before they hit SQL (you're using parameterized queries already — good — but validate types).

### 2.4 Code consistency
- [ ] Centralize the API base URL on the frontend (it's repeated in `dataService.js` and `authService.js` — pull into one shared constant/module).
- [ ] Consistent error response shape across all controllers (`{ message }` everywhere).
- [ ] Remove leftover `console.log` debugging statements.
- [ ] The optional env-var startup guard in `index.js` (fail fast if a key is missing).

### 2.5 README
- [ ] A real `README.md`: what the project is, architecture diagram (frontend → Express → TiDB + external APIs), setup steps, env variables needed, how to run it, screenshots.
- [ ] This is the first thing anyone looks at. Make it good.

---

## 3. Stretch — makes the project memorable

Only after 1 and 2. These are the "wow" items.

- [ ] **Deploy it.** A live URL beats a localhost demo every time. Frontend on Vercel/Netlify, backend on Render/Railway, DB already on TiDB Cloud. Update CORS + API base URL for production.
- [ ] **Progress tracking.** Let trainers log a trainee's workout completion and watch the progress number / chart update — closes the loop on the whole product.
- [ ] **Nutrition data.** TheMealDB has no macros. Supplement with a nutrition API (Edamam/Spoonacular) so meal plans show calories/protein — directly relevant for a fitness goal like fat loss.
- [ ] **LLM-personalized plans (Option B).** Layer Claude on top of the rules engine to personalize exercise selection by injury/preference, validated against ExerciseDB ids. Strong differentiator and ties to your AI interests.
- [ ] **PDF export.** Generate a printable workout/meal plan a trainer can hand to a trainee.
- [ ] **Responsive design.** The fixed 1440×1024 canvas scaling works but isn't truly responsive — real mobile support is a plus.
- [ ] **Tests.** Even a handful of backend endpoint tests (Jest + supertest) signals maturity.

---

## Suggested order of attack

1. **Plan-saving DB layer** (1.1) — unlocks the core feature.
2. **Templates page** (1.2) — the showcase; demonstrates the whole flow end to end.
3. **Trainee profile page** (1.2) — natural next click from the trainees list.
4. **JWT + route protection** (2.1) — biggest credibility boost for the effort.
5. **README + deploy** (2.5, 3) — so it's shareable and live.
6. Fill in remaining pages, caching, validation, polish.

Get items 1–5 done and this is a genuinely strong portfolio project. Everything in section 3 is bonus that makes it stand out further.

---

## Honest gaps worth being able to explain

Interviewers respect knowing your own system's weak points:

- **No JWT yet** — session storage only; you know the upgrade path.
- **Trainer profile on signup** — signup creates a user but not a trainer profile.
- **No authorization** — API trusts the caller; a trainer could request another trainer's data.
- **ExerciseDB BASIC tier** — no GIFs, limited request quota; caching mitigates.
- **TheMealDB** — recipes only, no nutrition/macros.
- **`DB_PORT` in `.env` is unused** — `db_connection.js` doesn't read it (defaults apply).

Being able to name these calmly is a feature, not a flaw.
