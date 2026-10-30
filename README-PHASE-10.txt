LTL PHASE 10 SETUP — CLOUDFLARE WORKERS AI EDITION

A) GitHub / Vercel
1. Extract this ZIP.
2. Upload all files and folders from the ZIP root into the existing LTL-Project GitHub repository root, replacing matching files.
3. Commit changes and wait for the Vercel deployment.
4. The frontend continues calling the same Supabase Edge Function name: ltl-ai-doubt-solver. No VITE_ AI key or Vercel AI key is needed.

B) Supabase database
1. Open Supabase Dashboard > SQL Editor.
2. Run phase-10-setup.sql if you have not already run the original Phase 10 setup.
3. Run phase-10-cloudflare-ai-setup.sql once. This adds a database-enforced limit of 20 AI questions per user per UTC day. It does not delete existing Phase 6-9 or Phase 10 data.

C) Create Cloudflare credentials
1. Open Cloudflare Dashboard > Workers AI.
2. Select Use REST API / Create a Workers AI API Token.
3. Create a token with the Workers AI permissions required by Cloudflare (Workers AI Read and Edit, as shown in the current dashboard/docs).
4. Copy your Cloudflare Account ID from the Workers AI page.
5. Do not share the token in chat, GitHub, source files, Vercel frontend variables, or screenshots.

D) Deploy / update the Supabase Edge Function
1. Open Supabase Dashboard > Edge Functions.
2. Open the existing function named ltl-ai-doubt-solver. If it does not exist, create it with that exact name.
3. Replace its source with supabase/functions/ltl-ai-doubt-solver/index.ts from this ZIP and deploy.
4. In Edge Function Secrets, add:
   CLOUDFLARE_ACCOUNT_ID = your Cloudflare Account ID
   CLOUDFLARE_API_TOKEN = your Cloudflare Workers AI API token
   CLOUDFLARE_AI_MODEL = @cf/qwen/qwen3-30b-a3b-fp8 (optional; this is the default)
5. Remove the old GEMINI_API_KEY secret after the Cloudflare function is deployed and tested. The new function does not use Gemini.

E) Test
1. Sign in to LTL and open AI Doubt Solver.
2. Ask a simple English question, then a Tamil/Tanglish question.
3. Confirm answers are returned.
4. Confirm a user can make up to 20 successful daily AI requests; further requests should be blocked until the next UTC day.
5. Check Supabase Edge Function logs if a request fails.

Security notes
- Cloudflare credentials stay in Supabase Edge Function secrets; never put them in frontend code.
- The Edge Function validates the Supabase user JWT before calling Cloudflare.
- The daily request cap is enforced atomically in Supabase, not by a client-side counter.
- Workers AI is not unlimited. Cloudflare's current documentation lists a 10,000 Neurons/day free allocation; model usage and limits vary. Check the Cloudflare dashboard for actual consumption and current billing.
- Default model: @cf/qwen/qwen3-30b-a3b-fp8. You can change it with CLOUDFLARE_AI_MODEL if you select another available Workers AI text-generation model.
