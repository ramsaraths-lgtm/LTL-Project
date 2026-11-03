# LTL Phase 11

## Changes
- Chat > People now loads a minimal learner directory through `ltl_chat_people_directory()` for every authenticated user, not only admins. The RPC returns only user ID, display name and role.
- Added TNPSC, RRB and SSC exam-specific selection step after choosing the exam category.
- Added specific exam selection to admin training-video, notes-PDF and quiz/test question publishing forms.
- Newly uploaded content/questions are tagged with `CATEGORY / SPECIFIC EXAM` (for example `TNPSC / Group I`).
- Learners see materials/questions for their specific exam and legacy category-level materials are also included for backward compatibility.
- Added square crop preview and zoom control before profile-photo upload. Cropped images are saved as 512x512 JPEGs for all signed-in users.
- Added `phase-11-setup.sql` for the minimal people-directory RPC and private avatar bucket policies.

## Supabase setup
Run `phase-11-setup.sql` in Supabase SQL Editor after Phase 10. The migration is safe to rerun.

## Deploy
1. Upload the ZIP contents to the GitHub repository root.
2. Run `phase-11-setup.sql` in Supabase.
3. Deploy the updated `ltl-ai-doubt-solver` Edge Function only if its code changed (Phase 11 does not change it).
4. Allow Vercel to build the updated frontend.
