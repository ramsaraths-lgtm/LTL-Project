# Phase 14 fix – group picture RLS error
- Cause: `ltl-group-avatars` bucket had insert/update policies but no SELECT policy, and the upload used `upsert:true`, which needs SELECT. Result: "new row violates row-level security policy".
- Fix 1: run `phase-14-fix-group-avatar.sql` in Supabase SQL Editor.
- Fix 2: `src/ChatPage.tsx` upload now uses `upsert:false` (each path is already unique with Date.now()).
- Only the group owner (creator) can set the picture; members will not see the button.
