# LTL Phase 10 — Cloudflare Workers AI Migration

- Replaced Gemini API call in the existing `ltl-ai-doubt-solver` Supabase Edge Function with Cloudflare Workers AI Chat Completions API.
- Default model: `@cf/qwen/qwen3-30b-a3b-fp8`, configurable using the `CLOUDFLARE_AI_MODEL` Supabase function secret.
- Added server-side Supabase JWT validation before AI inference.
- Added database-enforced per-user daily AI usage cap (20 requests per UTC day) through `consume_ltl_ai_request()`.
- Cloudflare Account ID and API token are read only from Supabase Edge Function secrets.
- Preserved the existing frontend function name and request/response shape, so no frontend Gemini SDK or key is required.
- Added Cloudflare migration and setup instructions.

## Required setup
Run `phase-10-cloudflare-ai-setup.sql`, deploy the updated Edge Function, and set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets in Supabase.
