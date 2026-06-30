# family-ledger-template Memory

> Initialized: 2026-06-30
> Last reviewed: 2026-06-30

## Project Identity

- Purpose: Public household ledger template that friends can fork, configure, deploy, and use without private source data.
- Primary users: Non-technical households using shared bookkeeping across desktop and mobile devices.
- Current stage: Public template documentation and onboarding hardening.

## Durable Decisions

Record decisions that constrain future work. Include the date, decision, why it was made, and user impact.

| Date | Decision | Why | User impact |
| --- | --- | --- | --- |
| 2026-06-30 | README should be written as a Chinese first-use guide for friends, covering GitHub fork, Supabase, Gmail OTP, Cloudflare, iPhone install, and future updates. | The public repo is meant to be reused by non-technical friends, so setup clarity matters more than developer brevity. | New users can follow one document from account setup to daily use and updates. |

## Known Pitfalls

Record non-obvious failure modes and the proven way to avoid or diagnose them.

| Date | Pitfall | Resolution |
| --- | --- | --- |
| 2026-06-30 | Public template repos can accidentally leak private data or credentials through copied env files, workbooks, backups, or build outputs. | Keep README and project rules explicit: never commit `.env.local`, personal ledgers, migration bundles, exported backups, `dist/`, or `outputs/`. |

## User Corrections

Record corrections that should change future behavior in this project.

| Date | Correction | Future behavior |
| --- | --- | --- |

## External Resources

Record locations only. Never record credential values, tokens, passwords, or secrets.

| Resource | Location | Purpose |
| --- | --- | --- |
| Supabase | https://supabase.com | Database and email-code authentication setup. |
| Cloudflare Workers | https://dash.cloudflare.com | Public deployment hosting. |
| GitHub | https://github.com | Forking the public template and receiving future updates. |

## Open Context

Keep only context that is likely to matter in a future session. Remove resolved or stale items.

- None.

## Memory Maintenance

- Keep this file concise and durable.
- Do not copy source code, configuration values, or facts easily found by searching the repository.
- Update `Last reviewed` whenever entries are added, corrected, or removed.
- At the end of a work session, report what was added to this file.
