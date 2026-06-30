# family-ledger-template Project Guide

> Initialized: 2026-06-30

## Project Goal

- Purpose: Provide a public, reusable household ledger template that friends can fork, configure, deploy, and use without receiving any private ledger data.
- Primary users: Non-technical households who need shared expense entry, review, and multi-currency bookkeeping across desktop and mobile devices.
- User-visible success: A friend can create their own private cloud ledger from the public repo, sign in by email code, install it on iPhone, and later refresh template updates without losing their data.

## Technical Context

- Stack: TypeScript React PWA, Vite, Supabase PostgreSQL/Auth, Cloudflare Workers deployment via Wrangler.
- Main entry points: `src/main.tsx`, `src/App.tsx`, `supabase/migrations/`, `wrangler.jsonc`, `.env.example`.
- Important directories: `src/` for app code, `public/` for PWA assets, `supabase/` for database setup, `assets/` for documentation assets when present.

## Working Commands

- Install: `npm install`
- Run: `npm run dev`
- Test: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`
- Deploy: `npm run deploy`

Use `not applicable` when a command does not exist. Never invent a command.

## Project Rules

- Explain technical decisions in terms of why they are needed and their impact on users.
- Prefer the smallest change that solves the user goal without breaking existing behavior.
- Follow existing project patterns unless they conflict with the user experience or create a concrete risk.
- Keep credentials out of source code and documentation; record only their storage location.
- Use paths relative to the repository root so the project works on different computers.
- Run the relevant test, lint, or build command after changes.
- Do not disable errors or tests merely to make validation pass; fix the underlying cause.
- Do not push to Git unless the user explicitly requests it.
- Use the project's own deployment command rather than treating `git push` as deployment.

## Project-Specific Constraints

- This is a public template repo; never add private household ledger data, private Excel workbooks, migration bundles, exported backups, or real environment values.
- Documentation must be friendly to first-time users on Mac, Windows, and iPhone, not only developers.
- Keep setup guidance focused on the actual services used by this app: GitHub fork, Supabase, Gmail email OTP, Cloudflare Workers, and PWA install.
- Treat Supabase migrations as the database contract; users should run SQL files in `supabase/migrations/` in filename order.
- Keep `.env.example` generic and never replace placeholder values with personal project values.
- Future update instructions must protect user data by separating code updates from Supabase database data.

## Documentation And Memory

- Update this file before changing the project workflow it defines.
- Read `MEMORY.md` before starting project work.
- Add durable decisions, pitfalls, user corrections, and external resource locations to `MEMORY.md` as they are learned.
- Do not duplicate facts that are easy to discover from the codebase.
