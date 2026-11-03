# LTL Phase 12

## UI fixes
- Reworked the mobile header profile control and constrained the avatar to a circular, cropped frame.
- Added responsive request-row layout so sender names wrap and remain fully readable instead of being ellipsized.

## Shared profile photos
- Chat People and incoming Requests now render each learner's profile photo when available, with initials as fallback.
- The Phase 12 SQL makes the `ltl-avatars` bucket public for image reads while retaining owner-only upload/update/delete policies. Profile images are intentionally public; do not upload sensitive images.
- The learner directory RPC now returns only id, display name, role and avatar object path.

## Test-only points and leaderboard
- Added a points ledger that increments only when a scheduled test attempt transitions from `in_progress` to `submitted`.
- Points equal the awarded test mark (correct answers); quizzes, chat, AI usage and other activity do not add points.
- Added authenticated RPCs for a learner's own points and the top 100 leaderboard.
- Added points to the learner profile and a Leaderboard navigation page.
- Existing completed attempts are not backfilled; points start accruing after the Phase 12 SQL is installed.

## Deployment
1. Upload the project files to the GitHub repository root and commit.
2. In Supabase SQL Editor, run `phase-12-setup.sql` once.
3. Allow Vercel to deploy the GitHub commit.
4. Test avatar visibility using two different learner accounts, incoming request names on mobile, a newly submitted scheduled test, profile points and leaderboard.

No Edge Function or Cloudflare secret changes are required.
