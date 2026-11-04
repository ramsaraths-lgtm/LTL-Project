LTL PHASE 13 – TNUSRB + SAFE SCOPED CONTENT DELETION

1. Download and extract this ZIP.
2. Upload the contents of LTL-Project-main to the existing GitHub repository root, replacing matching files.
3. Commit the changes. Vercel should start its connected deployment.
4. No new Supabase SQL migration is required for this phase.

TNUSRB learner flow:
Explore exams -> TNUSRB -> choose recruitment -> choose Teaching / Notes / Quiz / Test -> choose subject -> normal learning page.

Admin:
Training videos, PDF notes and Quiz & Test upload forms now include TNUSRB. Select category, recruitment and subject before uploading.

Scoped deletion:
Admin panel -> Delete content -> select exam category -> specific recruitment -> subject -> content category -> Delete selected content.
The app shows the scope, asks for confirmation, and requires typing DELETE. Only rows matching the exact exam label and subject are targeted. Choose Quiz, Test, Training, Notes or All content for that selected subject. Other exams/subjects are not targeted.

Important:
- Test history and learner points are intentionally not deleted by this content-cleanup tool.
- Storage objects are removed from ltl-videos / ltl-notes before their matching content rows are deleted.
- If Storage removal fails, the operation stops and reports the error rather than silently deleting the database records.
