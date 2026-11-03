LTL PHASE 12 - DEPLOYMENT GUIDE

1) Extract this ZIP.
2) Upload the contents of LTL-Project-main to the ROOT of your existing GitHub repository. Replace matching files and commit.
3) Supabase Dashboard -> SQL Editor -> New query.
4) Open phase-12-setup.sql from this ZIP, copy the complete file, paste it into SQL Editor and Run ONCE.
5) Wait for Vercel to finish deploying the GitHub commit.
6) Sign in using two learner accounts and test:
   - Profile icon stays circular and aligned on mobile.
   - Incoming chat request displays the sender's complete name.
   - People and Requests show profile photos where uploaded.
   - Submit a scheduled test: points increase by the earned mark.
   - Profile displays the accumulated test points.
   - Leaderboard displays users ranked by total scheduled-test marks.

Important:
- Phase 12 makes profile avatar images publicly readable so other learners can see them. Upload only an image you are comfortable making public. Other users cannot upload, replace or delete your avatar.
- Points are awarded only when a scheduled test attempt is successfully submitted. Quizzes, chat messages, AI Tutor usage and other activity do not award points.
- Existing test attempts completed before Phase 12 SQL is installed are not backfilled.
- Keep all existing Supabase environment variables and Cloudflare Edge Function secrets unchanged.
- If the SQL reports an error, stop and share the exact error before deploying.
