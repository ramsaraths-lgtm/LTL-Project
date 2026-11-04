# LTL Phase 13

## Added
- Added TNUSRB as a fourth exam category alongside TNPSC, RRB and SSC.
- Added TNUSRB recruitment tracks: Sub-Inspector (Taluk), Sub-Inspector (Armed Reserve), Grade II Police Constable, Grade II Jail Warder and Fireman.
- Added TNUSRB subject lists with a distinct SI subject set and common constable/jail warder/fireman subjects.
- Added TNUSRB to the admin upload exam selectors so training videos, notes, quiz questions and test questions can be uploaded against the same exam/subject hierarchy.
- Added an admin-only Delete content tab with exact exam category + specific recruitment + subject + content category selection.
- Scoped deletion supports quiz questions, test questions, training videos, PDF notes, or all learning content for the selected subject only.
- Added a typed DELETE confirmation and attempts to remove associated Storage objects before deleting content rows.

## Safety boundaries
- Deletes are filtered by the exact stored exam label (`CATEGORY / SPECIFIC EXAM`) and subject.
- Deleting learning content does not delete user profiles, scheduled test definitions/attempt history, leaderboard points, chat, bookmarks for unrelated questions, or content under other exams/subjects.
- Existing database schema is reused; no SQL migration is required for this phase.

## Deployment
- Replace repository files with this ZIP and commit to GitHub.
- Vercel should deploy from the connected repository.
- No Supabase SQL or Edge Function redeployment is required for Phase 13.
