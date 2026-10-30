# LTL Phase 8 — Scheduled Subject Tests

## Features
- The Test resource now shows scheduled tests only after a learner selects an exam and subject.
- Admin-only `Create test` action appears inside that subject's Test area; no separate Test tab is added to the admin panel.
- Admin can set title, start date/time, duration in minutes, and add questions manually or scan a text-based PDF.
- PDF scanner attempts to read inline answers and answer keys formatted like `1.A 2.C`; every imported answer must be checked/selected before publishing.
- Learners see the scheduled start time before opening. The Start button stays disabled until the scheduled time.
- A unique `(test_id,user_id)` attempt prevents a learner from starting the same test again, including after logout/relogin.
- Timer auto-submits at the configured duration. Final score is calculated by a Supabase RPC; correct answers are not returned in the public question view.

## Supabase setup
Run `phase-8-tests-setup.sql` in Supabase SQL Editor after the existing Phase 7 setup. It creates test, test-question and attempt tables, RLS policies, a public question view, and the scoring RPC.

## Notes
- Schedule uses the browser's local timezone and is stored as UTC in Supabase.
- Duration is entered in minutes (60 = 1 hour).
- PDF scanning supports selectable text PDFs. Image-only/scanned PDFs require OCR and must be manually transcribed or OCR-processed first.
- Review all scanned questions and answer keys before publishing. The answer-key parser is best-effort and may need manual correction.
