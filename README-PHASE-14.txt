LTL PHASE 14 – CHAT MEDIA + MISTAKE NOTEBOOK
1. Chat: send images in accepted direct chats and public/private groups.
2. Group owners: set a group profile image from Group Info.
3. Profile photo: each new crop is stored at a unique path to avoid stale cached avatars.
4. Mistake Notebook: wrong and unanswered scheduled-test questions are automatically saved after submission.

MANDATORY: Run phase-14-setup.sql once in Supabase SQL Editor after Phase 13, then deploy the GitHub update to Vercel.
Existing test attempts are not backfilled. New submissions after SQL migration are recorded.
Chat images use a private bucket and signed URLs. Group avatar bucket is public for display; only the owner can upload/update.
