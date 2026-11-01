<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Data access lives in `src/lib/api.ts` (React Query hooks over the browser Supabase client, RLS as `authenticated`) — one place for queries, mutations and friendly error mapping.
- Business rules (validation, priority ordering) live in `src/lib/validation.ts` with tests beside it — so rules are testable without the UI.
- Integrity rules are enforced in the database (FK RESTRICT, partial unique index on booked slots, CHECK on priority, `process_next_emergency` RPC) — the UI pre-checks only for friendlier messages.
- All management pages sit under `src/routes/_authenticated/` — records are staff-only.
