import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Sign in required.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
    const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')
    const model = Deno.env.get('CLOUDFLARE_AI_MODEL') || '@cf/qwen/qwen3-30b-a3b-fp8'

    if (!supabaseUrl || !anonKey) return json({ error: 'Supabase function environment is not configured.' }, 503)
    if (!accountId || !apiToken) {
      return json({ error: 'Cloudflare AI is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to Supabase Edge Function secrets.' }, 503)
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return json({ error: 'Your session is invalid. Please sign in again.' }, 401)

    let body: { question?: unknown; exam?: unknown; subject?: unknown }
    try { body = await req.json() } catch { return json({ error: 'Invalid request body.' }, 400) }

    const question = typeof body.question === 'string' ? body.question.trim() : ''
    if (!question || question.length > 4000) return json({ error: 'Enter a question up to 4,000 characters.' }, 400)

    // Enforce a per-user daily allowance in the database, not in the browser.
    const { data: usage, error: usageError } = await supabase.rpc('consume_ltl_ai_request')
    if (usageError) {
      if (usageError.message?.toLowerCase().includes('daily ai request limit')) {
        return json({ error: 'You have reached today’s AI doubt limit (20 questions). Please try again tomorrow.' }, 429)
      }
      console.error('AI usage limit check failed:', usageError.message)
      return json({ error: 'Could not verify your AI usage limit. Please try again later.' }, 503)
    }
    if (usage === null || usage === false) {
      return json({ error: 'You have reached today’s AI doubt limit. Please try again tomorrow.' }, 429)
    }

    const exam = typeof body.exam === 'string' ? body.exam.slice(0, 80) : 'Competitive exam'
    const subject = typeof body.subject === 'string' ? body.subject.slice(0, 100) : 'General'
    const systemPrompt = [
      "You are the official AI Tutor of LTL Live To Learn.",
      "You teach TNPSC, RRB and SSC students.",
      "",
      "FACTUAL ACCURACY RULES:",
      "1. Always prioritize factual accuracy.",
      "2. Never invent names, dates, authors, books or historical facts.",
      "3. Understand the exact question before answering.",
      "4. Give the direct answer first.",
      "5. If uncertain, clearly say you are unsure. Never guess.",
      "6. For Tamil literature, history, geography and polity, use established facts.",
      "7. Respond in the same language as the student: Tamil, Tanglish or English.",
      "8. Keep explanations simple and exam-oriented.",
      "9. Never confuse similar authors or historical personalities.",
      "10. Do not present an unverified answer as confirmed.",
      "",
      "ANSWER FORMAT:",
      "Direct Answer: Give the exact answer first.",
      "Explanation: Explain it simply.",
      "Exam Tip: Give one useful exam point when relevant.",
      "",
      "VERIFIED EXAMPLE:",
      "Question: பாரதிதாசனின் இயற்பெயர் என்ன?",
      "Answer: கனகசுப்புரத்தினம் (Kanaka Subburathinam).",
      "Do not confuse Bharathidasan with Subramania Bharati.",
      "",
      "EXAM CONTEXT:",
      "Exam: " + exam,
      "Subject: " + subject,
      "",
      "Always prioritize correctness over confidence or answer length."
    ].join("\n")

    const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 0.1,
        max_tokens: 1200,
        stream: false,
      }),
    })

    const payload = await cfResponse.json().catch(() => null)
    if (!cfResponse.ok) {
      console.error('Cloudflare Workers AI request failed:', cfResponse.status, payload?.errors || payload?.error)
      const message = cfResponse.status === 401 || cfResponse.status === 403
        ? 'Cloudflare rejected the API token. Check the token permissions and secrets.'
        : cfResponse.status === 429
          ? 'Cloudflare AI is temporarily rate-limited. Please wait and try again.'
          : 'Cloudflare AI could not process the request. Please try again shortly.'
      return json({ error: message }, cfResponse.status === 429 ? 429 : 502)
    }

    const answer = payload?.choices?.[0]?.message?.content
    if (typeof answer !== 'string' || !answer.trim()) {
      console.error('Cloudflare Workers AI returned no answer:', payload)
      return json({ error: 'The AI tutor returned an empty answer. Please try again.' }, 502)
    }

    const cleaned = answer.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    return json({ answer: cleaned || answer.trim(), remainingToday: typeof usage === 'number' ? Math.max(0, 20 - usage) : undefined })
  } catch (error) {
    console.error('LTL AI tutor error:', error)
    return json({ error: 'Unexpected AI tutor error. Please try again.' }, 500)
  }
})
