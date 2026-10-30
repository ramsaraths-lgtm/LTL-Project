# LTL Phase 9 — Privacy & Security Upgrade

## Included
- New direct-message request workflow: learners send a request first; recipients accept or decline in the Requests tab. Database policies prevent sending/reading DMs without an accepted connection.
- Safe learner directory view exposes only learner ID, display name and role; broad direct profile discovery policy removed.
- Learning video and PDF buckets are changed to private. Authenticated users receive short-lived signed viewing URLs; admin-only upload/update/delete policies are applied.
- Admin panel gains Security Activity with recent audit events.
- Audit trail records DM request creation/status changes and direct/group message sends without storing message bodies.
- Existing one-to-one message pairs are migrated as accepted contacts to preserve existing conversations.

## Deployment
1. Keep the Phase 6, 7 and 8 SQL migrations and all current environment variables.
2. Run `phase-9-security-setup.sql` once in Supabase SQL Editor after the previous phase migrations.
3. Upload the ZIP contents to the repository root and deploy through Vercel.
4. Test with two normal learner accounts: send request, confirm recipient sees it, accept, then verify both can chat. Decline a request and verify no DM can be sent.
5. Test a normal learner can open notes/videos after login, while anonymous access and direct public URLs no longer work.
6. Confirm an admin can see Security Activity and a normal learner cannot.

## Important limitations
- Browser content cannot be made impossible to save: signed URLs can be copied while valid, and viewers can still take screenshots, record video, or use browser/network tools. This change removes permanent public URLs and normal download links; it is not DRM.
- Existing files are not copied or re-uploaded. Their `storage_path` values are used to create signed URLs. Old public URLs stop working after buckets become private.
- The audit trail captures selected chat events, not every possible login failure or infrastructure event. Use Supabase Auth logs and project logs for those.
- Build verification could not complete in this environment because dependency installation timed out. Deploy to a preview first and check Vercel build logs before promoting to production.
