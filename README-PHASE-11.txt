LTL PHASE 11 — INSTALLATION GUIDE

1) BACK UP
Download a copy of your current GitHub repository before replacing files.

2) UPDATE GITHUB
Extract this ZIP. Open the LTL-Project-main folder and upload its contents to the ROOT of your existing GitHub repository. Replace matching files when asked. Do not upload the outer LTL-Project-main folder itself as a nested folder.

3) SUPABASE DATABASE PATCH (REQUIRED)
Open Supabase Dashboard → SQL Editor → New query.
Open phase-11-setup.sql from this ZIP, copy its complete contents, paste into SQL Editor and click Run.
This creates the restricted ltl_chat_people_directory() RPC and ensures the private avatar bucket/policies exist.
Do not skip this step: without it, ordinary users may still see an empty People list.

4) EDGE FUNCTION
Phase 11 does not modify the Cloudflare AI Edge Function. Do not redeploy ltl-ai-doubt-solver for this phase.

5) VERCEL
After GitHub commit, wait for Vercel deployment to finish. Check the deployment build log.

6) TEST AS A NORMAL USER
- Sign in with a normal learner account (not admin).
- Chat → People: learner list should appear.
- Open Profile → Change profile photo: choose an image, adjust zoom in crop dialog, save.
- Explore exams → choose TNPSC/RRB/SSC → choose a specific exam → choose learning mode → choose subject.
- Repeat the same path in Admin → Training videos, PDF notes, and Quiz & Test; confirm the specific exam dropdown is available.
- Publish one test question or upload one item under a specific exam, then verify the matching learner track can see it.

IMPORTANT DATA NOTE
New uploads/questions use exam labels such as "TNPSC / Group I", "RRB / NTPC (Graduate Level)" and "SSC / Combined Graduate Level (CGL)".
Existing materials tagged only "TNPSC", "RRB" or "SSC" remain visible under all corresponding specific exam tracks for backward compatibility.
