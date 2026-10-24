# LTL – Live To Learn (Phase 3)

Responsive React + TypeScript + Vite frontend with Supabase authentication, admin content management, PDF notes/video uploads, quiz/test question authoring, a text-based PDF question scanner, and an About page.

## Phase 3 features

- Email/password sign-up and sign-in through Supabase Auth.
- Admin access is determined by `public.profiles.role = 'admin'`; hiding the admin page is not the security boundary. Database/storage Row Level Security policies are included.
- Admin-only training video uploads and PDF notes uploads to Supabase Storage.
- Quiz/Test authoring with two options: automatic extraction of selectable PDF text, or manual question entry with four options and correct answer.
- Scanner lets admin review detected questions and choose the answer before publishing. It does not infer correct answers. Image-only scanned PDFs need OCR and are not automatically parsed in this version.
- Learners can browse published training videos, PDFs, and quiz/test questions by exam and subject. Questions are currently visible to signed-in users.
- About page with Founder & CEO and Developer details.

## 1. Configure Supabase

1. Create a project at https://supabase.com/.
2. In Project Settings > API, copy the Project URL and publishable/anon key.
3. Copy `.env.example` to `.env.local` and fill:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   ```

4. Open Supabase Dashboard > SQL Editor and run `supabase-setup.sql`.
5. Sign up in LTL with the email that should be the administrator.
6. In Supabase SQL Editor, run the final promotion query from `supabase-setup.sql`, replacing `YOUR_ADMIN_EMAIL` with that account's email. This is a privileged action; never allow normal users to change their own role.
7. Check Storage for buckets `ltl-videos` and `ltl-notes`. The SQL creates public-read buckets with admin-only uploads. Public-read means anyone with a file URL may access uploaded files; switch to private buckets and signed URLs if materials should be restricted.

## 2. Run locally

```bash
npm install
npm run dev
```

## 3. Deploy on Vercel

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project Settings > Environment Variables for Production, Preview and Development as needed.
- Redeploy after setting environment variables.

The anon/publishable key is designed for frontend use with RLS enabled. Never put a Supabase service-role key in this frontend project.

## Important notes

- PDF scanner uses `pdfjs-dist` to extract selectable text from PDF pages and applies common multiple-choice patterns. It is not OCR; scanned image PDFs need OCR. Review all extracted questions/options before publishing.
- Question correct answers are currently readable by signed-in users because the quiz client checks answers in-browser. For high-stakes exams, store answer keys separately and validate answers server-side.
- The upload SQL allows public file reads. Do not upload copyrighted/private materials unless you have permission and are comfortable with this access model.
- Exam subjects are starter categories and should be adapted to each exam notification.
