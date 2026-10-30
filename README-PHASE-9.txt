LTL PHASE 9 — PRIVACY & SECURITY

IMPORTANT: This ZIP is based on the Phase 8 package. Keep your existing Phase 6, Phase 7 and Phase 8 SQL setup and Vercel environment variables.

1) Supabase > SQL Editor: run phase-9-security-setup.sql AFTER Phase 6, 7 and 8 migrations.
2) Upload/replace the ZIP contents in the GitHub repository ROOT (do not upload the ZIP as a nested folder).
3) Commit changes and allow Vercel to deploy. Check the build log.
4) Test with two user accounts before public launch.

WHAT CHANGED
- Users must send a message request before starting a one-to-one chat.
- Recipient sees Requests and can Accept or Decline. Only accepted connections can exchange DMs.
- Learner directory now exposes only ID, display name and role, not the full profiles table.
- Notes/videos buckets become private; users must sign in and open materials through temporary signed view URLs.
- Admin panel has Security Activity for recorded chat events.

FILE ACCESS LIMIT
The system removes permanent public URLs and ordinary download links, but no website can fully prevent a viewer from saving displayed content, taking screenshots, recording a video, or capturing a temporary signed URL. Do not advertise this as absolute download prevention/DRM.

Build check note: npm dependency installation timed out in the preparation environment, so a successful production build has NOT been verified. Use a Vercel Preview deployment first.
