import { useEffect, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type ChatPageProps = { supabase: SupabaseClient | null; user: User | null; isAdmin: boolean }
type ChatMessage = { id: string; sender_id: string; content: string; created_at: string }
type ChatProfile = { id: string; full_name?: string | null; email?: string | null }

export default function ChatPage({ supabase, user, isAdmin }: ChatPageProps) {
  const [users, setUsers] = useState<ChatProfile[]>([])
  const [selectedUser, setSelectedUser] = useState<ChatProfile | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase || !user) return
    let active = true
    void (async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').neq('id', user.id).order('full_name')
      if (!active) return
      if (error) setNotice(`Could not load users: ${error.message}. Check your Supabase profiles table and RLS policies.`)
      else setUsers((data ?? []) as ChatProfile[])
    })()
    return () => { active = false }
  }, [supabase, user])

  useEffect(() => {
    if (!supabase || !user || !selectedUser) { setMessages([]); return }
    let active = true
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase.from('messages').select('id, sender_id, content, created_at').or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${user.id})`).order('created_at', { ascending: true }).limit(200)
      if (!active) return
      if (error) setNotice(`Could not load chat: ${error.message}. Confirm Phase 6 database SQL has been applied.`)
      else setMessages((data ?? []) as ChatMessage[])
      setLoading(false)
    }
    void load()
    const channel = supabase.channel(`direct-${[user.id, selectedUser.id].sort().join('-')}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const message = payload.new as ChatMessage & { recipient_id?: string }
      if ((message.sender_id === user.id && message.recipient_id === selectedUser.id) || (message.sender_id === selectedUser.id && message.recipient_id === user.id)) setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message])
    }).subscribe()
    return () => { active = false; void supabase.removeChannel(channel) }
  }, [supabase, user, selectedUser])

  const sendMessage = async () => {
    const content = draft.trim()
    if (!content || !supabase || !user || !selectedUser) return
    const { data, error } = await supabase.from('messages').insert({ sender_id: user.id, recipient_id: selectedUser.id, content }).select('id, sender_id, content, created_at').single()
    if (error) { setNotice(`Message was not sent: ${error.message}`); return }
    if (data) setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as ChatMessage])
    setDraft('')
  }

  if (!user) return <main className="inner-page"><section className="admin-panel-card"><h1>LTL Chat</h1><p>Please sign in to use individual and group chats.</p></section></main>
  if (!supabase) return <main className="inner-page"><section className="admin-panel-card"><h1>LTL Chat</h1><p>Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel environment variables.</p></section></main>

  return <main className="inner-page"><div className="page-title-block"><span className="eyebrow section-eyebrow">CONNECT & LEARN</span><h1>Chat</h1><p>Message other LTL learners. Group creation and membership are managed by the Phase 6 database setup.</p></div>
    {notice && <div className="notice-box" role="status">{notice}<button className="text-button" onClick={() => setNotice('')}>Dismiss</button></div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(0, 2fr)', gap: 18, minHeight: 420 }}>
      <section className="admin-panel-card"><h2>{isAdmin ? 'Users' : 'Learners'}</h2>{users.length === 0 ? <p className="muted-line">No other users found yet.</p> : users.map(person => <button key={person.id} onClick={() => { setSelectedUser(person); setNotice('') }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 12, marginTop: 8, borderRadius: 10, border: selectedUser?.id === person.id ? '2px solid #2563eb' : '1px solid #e2e8f0', background: selectedUser?.id === person.id ? '#eff6ff' : '#fff', cursor: 'pointer' }}><strong>{person.full_name || person.email || 'LTL Learner'}</strong>{person.email && <small style={{ display: 'block', color: '#64748b', marginTop: 4 }}>{person.email}</small>}</button>)}</section>
      <section className="admin-panel-card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><h2>{selectedUser ? (selectedUser.full_name || selectedUser.email || 'Direct chat') : 'Select a learner'}</h2><div style={{ flex: 1, minHeight: 260, maxHeight: 460, overflowY: 'auto', padding: 8 }} aria-live="polite">{!selectedUser ? <p className="muted-line">Choose a learner from the list to open a direct chat.</p> : loading ? <p className="muted-line">Loading messages…</p> : messages.length === 0 ? <p className="muted-line">No messages yet. Say hello!</p> : messages.map(message => <div key={message.id} style={{ display: 'flex', justifyContent: message.sender_id === user.id ? 'flex-end' : 'flex-start', margin: '8px 0' }}><div style={{ maxWidth: '85%', padding: '10px 13px', borderRadius: 14, background: message.sender_id === user.id ? '#dbeafe' : '#f1f5f9', overflowWrap: 'anywhere' }}><div>{message.content}</div><small style={{ display: 'block', color: '#64748b', marginTop: 5 }}>{new Date(message.created_at).toLocaleString()}</small></div></div>)}</div><form onSubmit={e => { e.preventDefault(); void sendMessage() }} style={{ display: 'flex', gap: 8, marginTop: 12 }}><input value={draft} onChange={e => setDraft(e.target.value)} disabled={!selectedUser} maxLength={4000} placeholder={selectedUser ? 'Write a message…' : 'Select a learner first'} aria-label="Message" style={{ flex: 1, minWidth: 0, padding: 12, border: '1px solid #cbd5e1', borderRadius: 10 }} /><button className="primary-button" type="submit" disabled={!selectedUser || !draft.trim()}>Send</button></form></section>
    </div>
    <p className="admin-footnote">Messages require the Phase 6 SQL schema and appropriate Supabase RLS policies. Never disable RLS on a public deployment.</p>
  </main>
}
