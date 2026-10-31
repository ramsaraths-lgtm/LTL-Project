import { useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { Bot, Send, Sparkles, LoaderCircle, MessageCircleQuestion } from 'lucide-react'

type Props = { supabase: SupabaseClient | null; user: User | null; exam: string; subject: string }
export default function AiDoubtSolver({ supabase, user, exam, subject }: Props) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function ask() {
    if (!supabase || !user) { setError('Please sign in to use the AI Doubt Solver.'); return }
    if (!question.trim()) { setError('Type your doubt first.'); return }
    setBusy(true); setError(''); setAnswer('')
    try {
      // Always send the signed-in user's own access token (refresh it if it expired).
      let { data: sess } = await supabase.auth.getSession()
      if (!sess.session) { setError('Your session expired. Please sign out and sign in again.'); return }
      const expiresSoon = (sess.session.expires_at ?? 0) * 1000 < Date.now() + 60_000
      if (expiresSoon) { const r = await supabase.auth.refreshSession(); if (r.data.session) sess = r.data }
      const token = sess.session?.access_token
      const { data, error: invokeError } = await supabase.functions.invoke('ltl-ai-doubt-solver', {
        body: { question: question.trim(), exam, subject },
        headers: { Authorization: `Bearer ${token}` },
      })
      if (invokeError) {
        // Show the REAL reason instead of the generic supabase-js message.
        const ctx = (invokeError as { context?: Response }).context
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json().catch(() => null)
          throw new Error(body?.error || body?.message || body?.msg || `Edge Function returned HTTP ${ctx.status}`)
        }
        if (invokeError.name === 'FunctionsFetchError') {
          throw new Error('Cannot reach the AI function. Check that "ltl-ai-doubt-solver" is deployed in Supabase (exact name) and that VITE_SUPABASE_URL is correct.')
        }
        throw invokeError
      }
      if (!data?.answer) throw new Error(data?.error || 'The AI tutor did not return an answer. Check the Edge Function and API secret setup.')
      setAnswer(String(data.answer))
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not contact the AI tutor.') }
    finally { setBusy(false) }
  }
  return <section className="ai-tutor-card">
    <div className="ai-tutor-heading"><span className="ai-tutor-icon"><Bot size={24}/></span><div><span className="eyebrow section-eyebrow">LTL AI LEARNING ASSISTANT</span><h2>Ask your doubt</h2><p>Get a clear, step-by-step explanation for {subject} ({exam}).</p></div></div>
    <label className="profile-field"><span>Your question</span><textarea value={question} onChange={e=>setQuestion(e.target.value)} rows={4} maxLength={4000} placeholder="Type a question, concept or problem you are stuck on…" /></label>
    <button className="primary-button" onClick={()=>void ask()} disabled={busy || !question.trim()}>{busy?<LoaderCircle className="spin" size={17}/>:<Send size={17}/>} {busy?'Thinking…':'Ask AI tutor'}</button>
    {error&&<div className="notice-box">{error}</div>}
    {answer&&<div className="ai-answer"><div><Sparkles size={17}/><strong>AI explanation</strong></div><p>{answer}</p></div>}
    <small className="ai-disclaimer"><MessageCircleQuestion size={14}/> AI answers can make mistakes. Verify important exam facts with trusted study materials.</small>
  </section>
}
  
