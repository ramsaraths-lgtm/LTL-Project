# LTL Phase 6 — Chat System

## Included
- Chat workspace integrated into the existing LTL navigation.
- Direct messages and group message history backed by Supabase.
- Public and private group creation; private groups use an invite code and selected members.
- Group owner can add members; admin users tab lists registered profiles for admin accounts.
- Responsive chat layout for desktop and mobile.

## Required Supabase setup
1. Open Supabase Dashboard → SQL Editor.
2. Run the existing `supabase-setup.sql` first if this is a new project.
3. Run `phase-6-chat-setup.sql`.
4. Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured in Vercel Project Settings → Environment Variables.
5. Redeploy after setting environment variables.

## Important
- Chat is available to signed-in users only.
- Supabase RLS must remain enabled. Never put a service-role key in the frontend.
- Realtime publication additions may require checking Database → Replication in Supabase if your project uses a custom publication setup.
- The admin user list displays rows in `public.profiles`; admin privileges still depend on the `profiles.role` value and existing RLS setup.
