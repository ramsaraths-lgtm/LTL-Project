# LTL Phase 14

## Included
- Direct-message and group-chat image attachments (5 MB max; private storage with signed URLs).
- Public/private group owners can set a group profile image in Group Info.
- Profile avatar uploads now use a unique object path per save and cache-busted URLs to prevent the old image appearing after crop/save.
- Mistake Notebook page for signed-in learners.
- Scheduled-test submission now automatically stores every incorrect or unanswered question with the selected option and correct answer in the learner's private notebook.
- Learners can filter the notebook by exam and remove individual saved mistakes.

## Supabase setup
Run `phase-14-setup.sql` once in Supabase SQL Editor after Phase 13. It adds message image paths, group avatar path, storage buckets/policies, the private mistake table, and replaces the test submission RPC to save mistakes. It preserves the existing test-points trigger.

## Notes
- Chat images are private and use short-lived signed URLs. Only message participants/group members can read the linked attachment.
- Group avatar images are public so members/discovery can display them; only the group owner can upload/update them.
- Previously submitted test attempts are not backfilled into the notebook. Mistakes are saved on new submissions after this migration.
- A production build was not run because dependencies are not installed in this environment. Verify Vercel build logs before treating the release as production-ready.
