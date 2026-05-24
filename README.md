# Sportie — Trainer Web Dashboard (Frontend)

> A web application that gives fitness trainers a clean, modern dashboard to manage their trainees, track their progress, and run their coaching business — all in one place.

This repository contains the **frontend** portion of the larger **Sportie** project, a fitness and nutrition management ecosystem described in the project SRS (System Requirements Specification). While the SRS describes the full ecosystem (including a mobile app for trainees), this repository implements the **web dashboard used by trainers** to support those trainees.

---

## Table of Contents

1. [What is Sportie?](#what-is-sportie)
2. [What this frontend does](#what-this-frontend-does)
3. [Features](#features)
4. [Live tour of the pages](#live-tour-of-the-pages)
5. [Tech stack](#tech-stack)
6. [Project structure](#project-structure)
7. [How to run it](#how-to-run-it)
8. [Test accounts](#test-accounts)
9. [Design philosophy](#design-philosophy)
10. [Roadmap](#roadmap)
11. [Authors](#authors)

---

## What is Sportie?

Sportie is a fitness and nutrition management platform that helps people stay healthy by tracking workouts, meals, water intake, and daily goals. The full system has two sides:

- **The trainee side** — a mobile experience where end-users log meals, follow training plans, and get reminders from a friendly "Sportie Buddy."
- **The trainer side** — a web dashboard where personal trainers manage all of their trainees, monitor progress, and assign plans.

**This repository is the trainer side.** It is the cockpit a coach opens every morning to see how their clients are doing.

---

## What this frontend does

A fitness trainer logs in and lands on a dashboard that answers their three most important questions at a glance:

1. **How many people am I currently coaching?**
2. **Who needs my attention today?**
3. **Is my business growing or shrinking?**

From there, the trainer can drill into a full list of their trainees, search and filter them by status (active, paused, finished), and (in upcoming releases) send messages, assign workout templates, view analytics, and adjust settings.

---

## Features

### Implemented

- **Secure Login & Sign-up Flow**
  Email/password authentication with full client-side validation, friendly error messages, and a built-in "show password" toggle. The form switches smoothly between *Login* and *Sign Up* modes without reloading the page.

- **Personal Dashboard**
  At-a-glance summary cards (Total Clients, Active Clients, Workouts This Week, Average Progress), a 12-month "Active Trainees per Month" chart powered by Chart.js, and a "Most Active Clients" side panel.

- **Trainees List**
  A searchable, filterable table of every trainee assigned to the logged-in trainer. Includes avatar, name, status badge (Active / Paused / Finished), goal, progress bar, and last-activity timestamp.

- **Live Search**
  Type in the search bar and the trainee list filters instantly as you type.

- **Status Filters**
  One-click filtering by trainee status with a clean dropdown menu.

- **Persistent Session**
  The currently logged-in trainer stays logged in across page navigations via the browser's `sessionStorage`.

- **Empty States**
  Every data view shows a friendly empty-state message (with an icon) when there is no data to display — never a blank screen.

- **Responsive Sidebar Navigation**
  A consistent left-side navigation bar appears on every internal page so trainers always know where they are.

### Coming soon (placeholder pages already wired into navigation)

- **Messages** — In-app chat between trainer and trainee.
- **Templates** — Reusable workout and nutrition plan templates.
- **Trainee Analytics** — Deep-dive charts on individual trainee performance.
- **Settings** — Profile, password, and notification preferences.

---

## Live tour of the pages

| Page | What it does |
|---|---|
| `index.html` | Tiny landing page that points users to the login screen. |
| `login.html` | Login and sign-up form (the same form switches between the two modes). |
| `dashboard.html` | Main dashboard — stats, monthly chart, and most-active-clients panel. |
| `trainees.html` | Full trainee list with search, filter, status badges, and progress bars. |
| `messages.html` | Placeholder for the future messaging feature. |
| `templates.html` | Placeholder for the future workout/nutrition templates feature. |
| `analytics.html` | Placeholder for the future analytics feature. |
| `settings.html` | Placeholder for the future settings page. |

---

## Tech stack

This is a **pure-frontend, no-build-step** project. Anyone can clone it and open it in a browser — no `npm install`, no compiler, no toolchain.

- **HTML5** — Semantic markup for every page.
- **CSS3** — Hand-written, modular styles (one CSS file per page plus shared `base.css` and `sidebar.css`).
- **Vanilla JavaScript (ES6+)** — No frameworks. All interactivity (login validation, search, filters, chart rendering, session management) is written in plain JS.
- **Chart.js** (via CDN) — For the dashboard's monthly active-trainees chart.
- **Font Awesome** (via CDN) — For some icons in the login form. Most icons are hand-crafted inline SVGs for crispness at any zoom level.
- **Google Fonts** — *Inter* (UI) and *Playfair Display* (login screen logo).
- **JSON** — `ListOfTrainees.json` acts as a local mock database during development; it will be swapped for real API calls once the backend is connected.

---

## Project structure

```
FrontendWebAppProjectShenkar/
├── index.html                 # Landing page
├── login.html                 # Login / sign-up
├── dashboard.html             # Main dashboard
├── trainees.html              # Trainees list
├── messages.html              # Placeholder
├── templates.html             # Placeholder
├── analytics.html             # Placeholder
├── settings.html              # Placeholder
│
├── css/                       # One stylesheet per page + shared
│   ├── base.css               #   Shared base styles (resets, layout)
│   ├── sidebar.css            #   Shared left navigation
│   ├── login.css
│   ├── dashboard.css
│   ├── trainees.css
│   ├── messages.css
│   ├── templates.css
│   ├── analytics.css
│   └── settings.css
│
├── js/
│   ├── dataService.js         # Single source of truth for all data fetching
│   ├── authService.js         # Login / logout / session helpers
│   ├── formValidation.js      # Login & sign-up form validation
│   ├── base.js                # Sidebar + topbar behaviour shared by all pages
│   ├── dashboard.js           # Dashboard-specific logic (cards + chart)
│   └── trainees.js            # Trainees-list rendering, search, and filter
│
├── images/                    # Logos, icons, avatars, login background
└── ListOfTrainees.json        # Mock database — swap for real API later
```

### A note on the data layer

`js/dataService.js` is the **only** file that talks to the data source. Today it reads from a local JSON file; tomorrow it will read from a real backend. Every place in the app that needs data goes through `DataService.getTraineesByTrainerId(...)`, `DataService.getMonthlyActiveTrainees(...)`, etc., so swapping in a real database will be a one-file change. This is a deliberate architectural choice and is called out in the SRS Section 6.5 (Maintainability — "Modular Design").

---

## How to run it

This repository contains the frontend portion of the Sportie 
project only. It is a static HTML/CSS/JS implementation that 
represents the UI and client-side logic of the trainer dashboard.

To view the project open `login.html` in any modern browser 
using VS Code Live Server or any local HTTP server — the app 
uses `fetch()` to read the mock database which requires HTTP 
and will not work by opening the file directly from the 
file system.

Full functionality including real authentication, live trainee 
data, and backend integration will be available once the 
backend portion of the Sportie project is connected.

---

## Test accounts

The mock database `ListOfTrainees.json` contains test trainers you can log in as. Open that file to see the available email/password combinations.

---

## Design philosophy

A few principles guided how this frontend was built:

- **No framework, no build step.** A new contributor can clone the repo and be productive in minutes. Everything is just HTML, CSS, and JS that runs in any modern browser.
- **One file, one job.** Every page has its own CSS file and its own JS file. Shared concerns (the sidebar, the top bar, the data layer) live in their own dedicated files.
- **Data flows through a single funnel.** `DataService` is the only place that knows where data comes from. Swapping the mock JSON for a real API will not require touching any UI code.
- **Empty states are first-class citizens.** Every list, table, and chart has a designed empty state so the app never feels broken when there's no data yet.
- **Mobile-first colours, desktop-first layout.** The colour palette and typography were chosen to read well on phones, but the layout is optimised for the desktop screens a trainer is most likely to use during a coaching day.

---

## Roadmap

In rough order of priority:

1. **Wire up a real backend** - replace `dataService.js`'s JSON reads with REST calls to a Node/Express (or similar) API.
2. **Build out the Messages page** - real-time chat between trainer and trainee.
3. **Build out the Templates page** - let trainers create reusable workout and nutrition plans they can assign to many trainees at once.
4. **Build out the Trainee Analytics page** - per-trainee deep-dive charts (weight curve, calorie adherence, workout streak).
5. **Build out the Settings page** - trainer profile, password change, notification preferences.
6. **Add an "Add Trainee" flow** - currently the list is read-only.
7. **Mobile responsive pass** - the sidebar needs to collapse into a hamburger menu on small screens.

---

## Authors

- **Yaniv Cohen**
- **Eilon Greenberg** 

Built as a Software Engineering degree project at **Shenkar — Engineering. Design. Art.**
