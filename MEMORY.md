# family-ledger-template Memory

> Initialized: 2026-06-30
> Last reviewed: 2026-08-23

## Project Identity

- Purpose: Public household ledger template that friends can fork, configure, deploy, and use without private source data.
- Primary users: Non-technical households using shared bookkeeping across desktop and mobile devices.
- Current stage: Public template documentation and onboarding hardening.

## Durable Decisions

Record decisions that constrain future work. Include the date, decision, why it was made, and user impact.

| Date | Decision | Why | User impact |
| --- | --- | --- | --- |
| 2026-06-30 | README should be written as a Chinese first-use guide for friends, covering GitHub fork, Supabase, Gmail OTP, Cloudflare, iPhone install, and future updates. | The public repo is meant to be reused by non-technical friends, so setup clarity matters more than developer brevity. | New users can follow one document from account setup to daily use and updates. |
| 2026-07-30 | Month detail rows keep compact ellipsis in the list, but tapping the merchant/detail area opens a full transaction detail modal. | Mobile lists need to stay scannable, while long merchant/detail text must remain recoverable without editing the transaction. | Template users can read complete long notes on iPhone without widening rows or losing list density. |
| 2026-08-23 | Sync the reusable editing and analysis improvements from private main: modal editing, history-based detail suggestions, safe fixed-expense update scope, year-to-date summaries, comparison charts, and composition charts. | These features improve common bookkeeping and review workflows without depending on private data or credentials. | Template users get faster entry, clearer editing feedback, fewer duplicate fixed expenses, and richer annual analysis. |
| 2026-08-23 | Keep the generic expense category `其他` inside public-template `家庭日常` analysis and use `转售` for resale wording. | The private household's exceptional-spending meaning for `其他` and its personal category labels are not universal. | Friends' uncategorized daily expenses remain visible in household totals, and public wording stays reusable. |

## Known Pitfalls

Record non-obvious failure modes and the proven way to avoid or diagnose them.

| Date | Pitfall | Resolution |
| --- | --- | --- |
| 2026-06-30 | Public template repos can accidentally leak private data or credentials through copied env files, workbooks, backups, or build outputs. | Keep README and project rules explicit: never commit `.env.local`, personal ledgers, migration bundles, exported backups, `dist/`, or `outputs/`. |
| 2026-07-01 | Windows PowerShell can fail on `npm -v` because `npm.ps1` is blocked by execution policy. | In Windows docs prefer `npm.cmd -v`; if users need `npm -v`, set CurrentUser execution policy to RemoteSigned. |
| 2026-07-01 | Some Windows machines cannot start the local launcher without Microsoft Visual C++ Redistributable. | Check/install VC++ Redistributable 2015-2022 x64 and x86 before running the ledger launcher. |
| 2026-07-01 | Supabase first-time email flow may send `Confirm sign up` before normal OTP. | Document first-account activation separately from day-to-day Magic Link/OTP code login. |

## User Corrections

Record corrections that should change future behavior in this project.

| Date | Correction | Future behavior |
| --- | --- | --- |
| 2026-06-30 | Node.js setup docs should distinguish macOS and Windows and include command-line installation options. | When documenting first-time setup, provide OS-specific GUI and CLI paths instead of one generic install sentence. |
| 2026-06-30 | Cloudflare docs need a first-time setup path, not only `wrangler login` and deploy. | Explain Cloudflare account setup, Wrangler authorization, workers.dev subdomain, Worker naming, first deploy checks, redeploys, and optional custom domains. |
| 2026-06-30 | Supabase default email sending should not be documented as enough for real OTP login on the free setup. | Treat custom SMTP, typically Gmail SMTP for this family template, as required for stable验证码登录; clarify that the Supabase project can be free but default email should not be relied on. |
| 2026-07-01 | Supabase dashboard may not show a field literally named Project URL in the old location. | Tell users to find Project ID/Reference ID in Project Settings and construct `https://PROJECT_ID.supabase.co`, with Data API/API URL as an alternate location. |
| 2026-07-01 | Avoid wording that says "Supabase sends the verification code" without mentioning Gmail/custom SMTP. | Describe the actual flow as Supabase Auth generates the code and Gmail/custom SMTP sends the email. |
| 2026-07-01 | Cloudflare first setup should include verifying Wrangler login before deployment. | Document `npx wrangler login`, `npx wrangler whoami`, editing `wrangler.jsonc`, deploying, and finding the final URL in Workers & Pages. |
| 2026-07-04 | Friend-facing update docs should explain Windows GitHub Desktop to Cloudflare redeploy flow. | Tell users to Fetch/Pull in GitHub Desktop, `cd` to the project, optionally `npm install`, then run `npm run deploy` to update the phone web app. |

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
