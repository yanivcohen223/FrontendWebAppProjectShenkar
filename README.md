# Sportie — Web Client

The web client for Sportie, a management platform for personal trainers. It is a vanilla
JavaScript multi-page application (HTML, CSS, ES modules) that talks to the Sportie API
server, which lives in a separate repository.

## Overview

A trainer signs in and lands on a dashboard summarising their roster. From there they can
browse and filter trainees, open a trainee's profile to see progress and active plans,
generate and edit workout and meal plans, build reusable templates and assign them, and
review analytics across all of their clients. All domain content is loaded from the backend
at runtime — nothing is hard-coded into the pages.

## Motivation

The client is built deliberately without a framework or build step, as a set of plain static
assets: fast to load, trivial to host, and easy to read end to end. The structure
(shared utilities, a service layer, one controller per page) keeps that simplicity
maintainable as the app grows.

## Main features

- Login and sign-up with client-side validation
- Dashboard with KPI cards and a monthly active-trainees chart
- Trainee roster with live search and a status filter
- Trainee profile with Overview / Training Plan / Nutrition tabs and activity charts
- Workout-plan generator and a per-day plan editor with an exercise library
- Meal-plan editor with per-100g macros and live totals
- Reusable workout and meal templates with builder overlays and assign-to-trainee
- Analytics: at-risk list, attendance distribution, leaderboard, volume trend, heatmap
- Trainer settings: profile, avatar upload (client-side compressed), password, preferences
- Toast/modal feedback, loading spinners and skeletons, and explicit empty states

## Architecture

A multi-page application with no client-side router — each screen is a real document and
navigation is a full page load, with context passed via query strings. Cross-cutting code is
factored out of the pages:

```
js/shared/     config, HTTP wrapper, shared bootstrap, injected sidebar/topbar,
               toast/modal, loader, skeleton, exercise modal, image utils
js/services/   authService, dataService (the main API gateway), analyticsService
js/pages/      one controller module per HTML page
```

The sidebar and topbar are injected at runtime, a shared bootstrap (`base.js`) guards auth
and lays out every inner page, and `dataService` centralises backend access and the
snake_case↔camelCase mapping.

## Technologies

HTML5, CSS3 (hand-written, no preprocessor), vanilla JavaScript with native ES modules.
Chart.js (via CDN) renders the charts; Google Fonts supply Inter and Playfair Display. The
only development dependency is `serve`, used to host the static files locally.

## Folder structure

```
FrontendWebAppProjectShenkar/
├── index.html / *.html     9 pages (login, dashboard, trainees, profile, templates,
│                           edit-training-plan, edit-meal-plan, analytics, settings)
├── images/                 SVG nav icons, avatars, login background
├── style/                  base.css + components.css + per-page + per-widget CSS
├── js/
│   ├── shared/             utilities and injected UI partials
│   ├── services/           API / data access layer
│   └── pages/              page controllers
└── Frontend Description.md  Architecture write-up
```

## Installation

```bash
git clone <client-repo-url>
cd FrontendWebAppProjectShenkar
npm install
```

## Environment / configuration

There is no `.env`. The API base URL is selected automatically in `js/shared/config.js`: a
host containing `localhost`/`127.0.0.1` targets `http://localhost:3000/api`, otherwise the
deployed backend at `https://sportie-server.onrender.com/api`.

## Running locally

```bash
npm start          # serves the static site on http://localhost:5500
```

Run the API server (separate repository) on port 3000 so the local client can reach it. Any
static server works; the app needs no build because the browser loads the ES modules
directly.

## Build instructions

No build step. The source files are the deliverable.

## Deployment

Deploy the folder to any static host (Netlify, Vercel, GitHub Pages, etc.). When the site is
served from a non-localhost host, the client automatically uses the production API base URL.
The specific hosting target for this submission is provided with the project links.

## Backend integration

The client calls the Sportie REST API under `/api`. Requests go through a small
`XMLHttpRequest` wrapper (and native `fetch` in the analytics service); `dataService`
normalises field naming between the API and the UI.

## User roles

The client has a single user — the trainer. Trainees are records the trainer manages, not
application users, so there is no role-based UI; the only gate is the authenticated/not
redirect performed by the shared bootstrap.

## External libraries

- **Chart.js** (CDN) — dashboard, trainee-activity and analytics charts (the heatmap is a
  hand-built CSS grid).
- **Google Fonts** — Inter and Playfair Display.

## Screenshots

Screenshots are not included in this repository. Suggested placeholders:

```
docs/screenshots/login.png
docs/screenshots/dashboard.png
docs/screenshots/trainee-profile.png
docs/screenshots/templates-builder.png
docs/screenshots/analytics.png
```

## Future improvements

- Consolidate the two HTTP mechanisms (`XMLHttpRequest` wrapper and `fetch`) into one
- Share the meal slot/option logic between the builder and the meal-plan editor
- Pin the Chart.js CDN version
- Add the missing Font Awesome include used by the login-page icons
- Remove the unused `editWorkout.js` scaffold

## Contributors

Eilon and Yaniv (project authors).
