# LTL Phase 6 — Complete Chat System (fixed build)

## Vercel build error — cause and fix
`src/ChatPage.tsx` in the GitHub repo was a copy of `App.tsx` (error lines were identical: `App.tsx(288,35)` and `ChatPage.tsx(288,35)`), so `ChatPage` had no `supabase/user/isAdmin` props. `src/ChatPage.tsx` is now the real chat component with typed props. **Replace the file in GitHub, do not just add it next to the old one.**

## What is included
- Chat UI (WhatsApp/Discord style): sidebar with Chats / Groups / Discover / People tabs, conversation pane, mobile single-pane mode.
- Direct messages: realtime, history saved in Supabase, sent/read ticks, block / unblock (blocked users cannot message you; enforced by RLS).
- Groups: Private (invite code + owner-selected members) and Public (searchable, member count, Join Group button).
- Private group security: invite codes live in a separate owner-only table; joining is verified on the server (`ltl_join_group_by_code`); messages are protected by membership, so knowing a code alone never exposes messages. Owner can add/remove members and regenerate the code.
- Online / offline status (Supabase Realtime presence), unread counts, user search, chat search, loading / empty / error states.
- Admin panel → new **Users & Chat** tab: list users, suspend / restore chat access, list all groups, view members, remove members, delete groups. (Admins do not see message contents.)

## Setup (required, in this order)
1. Supabase → SQL Editor → run `supabase-setup.sql` (only if not already done).
2. Run `phase-6-chat-setup.sql` (new version; safe to re-run; also fixes a security hole in the older version that let anyone self-join a private group).
3. Vercel env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; redeploy.
4. Supabase → Database → Replication: confirm `ltl_direct_messages` and `ltl_group_messages` are in the `supabase_realtime` publication (the SQL does this).
