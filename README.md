# 90 Day Project Flow

React + Vite application for a 90-day project dashboard.

## Start

```bash
npm install
npm run dev
```

## Cloud sync

1. Create a Supabase project and execute `supabase.sql` in SQL Editor.
2. The supplied ZIP includes `.env.local` with the provided Supabase URL and publishable key for local development. This file is gitignored. For a different Supabase project, copy `.env.example` to `.env.local` and replace both values. Never use service-role keys.
3. Restart Vite, register and sign in. Email confirmation may be required.
4. Deploy on Cloudflare Pages: framework **Vite**, build command **npm run build**, output directory **dist**. Set the same environment variables in Cloudflare Pages.
5. Add your Cloudflare site URL under Supabase Authentication > URL Configuration (Site URL and Redirect URLs) for email confirmation flows.

Without environment variables, the app runs in browser-only localStorage mode. Data is not shared across devices.

## Integration scope

The app does **not** yet automatically read data from Income Flow, Style Flow, Home Fit, or other independent apps. Their Supabase schemas, per-user access policies, and source endpoints must be reviewed before implementing read-only synchronization. Linked-project KPI values are shown as unconnected, never fabricated. Users can register original-app links and configure KPI targets. Social is the first self-managed project; project tasks and general progress notes can be stored for other projects, but only self-managed KPI entries count toward the dashboard.

## Current features

- 90-day start/end dates and day progress
- Ten projects and project selector
- Five tabs: Home, Strategy, Calendar, Change, Analysis
- Social direct management: tasks, events, KPI logs, analytics
- Read-only integration placeholders and app URL links
- Four separate Daily Maintenance references, excluded from 90-day progress
- Responsive iPhone/iPad layout and modal width limits
- Optional Supabase account login and RLS-protected state sync

## Data caution

Data is stored as a single JSON document per user. This is an MVP and does not provide concurrent multi-device conflict resolution, offline merge, or source-app integration yet. Do not use it as a sole backup of important records.


## v1.1 UI/Auth patch (2026-11-01)
- Focus Flow-inspired compact purple mobile-first layout, responsive project cards, unified dialog sizing.
- Login/signup segmented screen with visible errors, loading state, and 16px input sizing to avoid iOS zoom.
- Cloud data is fetched before editing; a failed fetch blocks editing rather than overwriting existing Supabase data.
- Removed global localStorage hydration to avoid cross-account data leakage.
- Cloud save status shown in the header.
- Only Social is editable; linked projects remain read-only until verified integrations exist.
- This patch modifies only `src/main.jsx` and `src/style.css`. Keep the existing `.env.local`, `supabase.sql`, and other project files unchanged.
- Build validation was attempted but npm dependency installation timed out in this environment; deployment/build and live Supabase login are **not verified**.
