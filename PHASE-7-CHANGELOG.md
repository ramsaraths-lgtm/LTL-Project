# LTL Phase 7 – Account, Quiz Search & Support Improvements

## Included
- Removed the guest-profile presentation and ensured the profile page is available only to signed-in users. The existing app did not contain a separate guest sign-in action; authentication remains email/password sign-in and registration.
- Persisted the user's display name in `public.profiles.full_name`, load it after sign-in/session restore, and added a Save profile action that updates the profile and Auth user metadata.
- Added search in Admin Panel → Manage questions. Search matches question text, exam, subject, and quiz/test mode while retaining edit/delete actions.
- Added a Help Centre page and navigation/footer entry with a support email link to bugzen.ai28@gmail.com.
- Added an Admin Panel → New users inbox with unread count, mark-as-read action, and Supabase Realtime updates.
- Added `phase-7-setup.sql` for profile-name update permissions, role-change protection for ordinary signed-in users, and secure new-user notification table/trigger/RLS/Realtime setup.

## Required Supabase step
1. Open Supabase Dashboard → SQL Editor.
2. Run `phase-7-setup.sql` once, after the existing Phase 5 and Phase 6 SQL setup files.
3. Deploy the updated app to Vercel.

The new-user notification feature only records registrations created after its database trigger is installed. Existing accounts are not backfilled as notifications.

## Notes
- Existing chat files, chat schema, authentication provider, and quiz data are retained from the uploaded Phase 6 Fixed 4 ZIP.
- No Supabase keys or credentials are included in this ZIP.
