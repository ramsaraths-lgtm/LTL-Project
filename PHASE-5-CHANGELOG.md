# LTL — Live To Learn · Phase 5

## Included
- Fixed the dangerous scanner default: scanned questions no longer silently mark Option A as correct. If a clear per-question `Answer: B`/`Ans: C` style key is detected, it is used; otherwise the answer remains unconfirmed and the admin must choose it before publishing.
- Publish validation rejects incomplete questions and any scanned question without a confirmed correct answer.
- Admin question management panel to edit question text, all four options, answer key and explanation, or delete a bad question.
- Admin content management can edit a video/note title and delete the content-library row. Deleting the row does not automatically remove the object from Supabase Storage; clean up the file separately if needed.
- Supabase SQL extended with admin content-update policy and direct/group chat tables plus baseline RLS policies.

## Apply
1. Back up your existing project and database first.
2. Replace the project files with this ZIP (keep your real `.env` values private; `.env.example` is only a template).
3. In Supabase Dashboard → SQL Editor, run the updated `supabase-setup.sql` against the existing project. Review it before running; it contains `create policy` statements and table definitions.
4. Ensure the intended admin account has `profiles.role = 'admin'`.
5. Run `npm install`, then `npm run build`, and test sign-in, admin content management, question publishing, and learner answer feedback before deploying.

## Important limitations
- PDF parsing reads selectable PDF text. Image-only/scanned PDFs still require OCR and should be converted to searchable PDFs or entered manually. Always review extracted questions before publishing.
- Chat database tables/policies are provided as Phase 5 backend groundwork; a finished in-app chat interface and real-time subscriptions are not yet wired into the React screens in this ZIP.
- Existing incorrect answer keys are not automatically guessed or rewritten. Use Admin → Manage questions to verify and correct each one. The learner quiz compares the selected option against the saved `correct_option` (A=0, B=1, C=2, D=3).
- Supabase policies must be reviewed and tested in your own project. Never expose a service-role key in frontend environment variables.
