import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { MessageCircle, Users, LockKeyhole, Globe, Send, Plus, RefreshCw } from 'lucide-react'

type ChatPageProps = { supabase: SupabaseClient | null; user: User | null; isAdmin: boolean }
type Group = { id: string; name: string; visibility: 'public' | 'private'; invite_code: string | null; created_by: string; created_at: string }
type Message = { id: string; group_id?: string; sender_id: string; body: string; created_at: string }

export default function ChatPage({ supabase, user, isAdmin }: ChatPageProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [selected, setSelected] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [groupName, setGroupName] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [inviteCode, setInviteCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const loadGroups = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data, error } = await supabase.from('ltl_chat_groups').select('*').order('created_at', { ascending: false })
    if (error) setNotice(error.message)
    else setGroups((data ?? []) as Group[])
    setLoading(false)
  }, [supabase, user])

  const loadMessages = useCallback(async (group: Group) => {
    if (!supabase || !user) return
    const { data, error } = await supabase.from('ltl_group_messages').select('*').eq('group_id', group.id).order('created_at', { ascending: true }).limit(200)
    if (error) setNotice(error.message)
    else setMessages((data ?? []) as Message[])
  }, [supabase, user])

  useEffect(() => { void loadGroups() }, [loadGroups])
  useEffect(() => {
    if (!selected) { setMessages([]); return }
    void loadMessages(selected)
    if (!supabase) return
    const channel = supabase.channel(`ltl-group-${selected.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ltl_group_messages', filter: `group_id=eq.${selected.id}` }, payload => {
      const next = payload.new as Message
      setMessages(prev => prev.some(m => m.id === next.id) ? prev : [...prev, next])
    }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [selected, supabase, loadMessages])

  async function createGroup() {
    if (!supabase || !user) return setNotice('Please sign in to create a group.')
    if (groupName.trim().length < 2) return setNotice('Group name must contain at least 2 characters.')
    const code = visibility === 'private' ? (inviteCode.trim() || Math.random().toString(36).slice(2, 8).toUpperCase()) : null
    const { data, error } = await supabase.from('ltl_chat_groups').insert({ name: groupName.trim(), visibility, invite_code: code, created_by: user.id }).select('*').single()
    if (error) return setNotice(error.message)
    const group = data as Group
    const { error: memberError } = await supabase.from('ltl_chat_members').insert({ group_id: group.id, user_id: user.id })
    if (memberError) setNotice(`Group created, but membership setup failed: ${memberError.message}`)
    else setNotice(code ? `Private group created. Save this invite code: ${code}` : 'Public group created.')
    setGroupName(''); setInviteCode(''); setGroups(prev => [group, ...prev.filter(g => g.id !== group.id)]); setSelected(group)
  }

  async function joinGroup(group: Group) {
    if (!supabase || !user) return setNotice('Please sign in to join a group.')
    const { error } = await supabase.rpc('ltl_join_chat_group', { p_group_id: group.id, p_invite_code: group.visibility === 'private' ? joinCode.trim() : null })
    if (error) return setNotice(error.message)
    setNotice(`Joined ${group.name}.`); setJoinCode(''); setSelected(group); await loadGroups()
  }

  async function sendMessage() {
    const body = draft.trim()
    if (!supabase || !user || !selected || !body) return
    const { data, error } = await supabase.from('ltl_group_messages').insert({ group_id: selected.id, sender_id: user.id, body }).select('*').single()
    if (error) return setNotice(error.message)
    setMessages(prev => prev.some(m => m.id === (data as Message).id) ? prev : [...prev, data as Message]); setDraft('')
  }

  if (!user) return <main className="inner-page"><div className="page-title-block"><h1>Community chat</h1><p>Please sign in to use LTL chat.</p></div></main>
  if (!supabase) return <main className="inner-page"><div className="notice-box">Chat is unavailable because Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.</div></main>

  return <main className="inner-page" style={{ maxWidth: 1100 }}>
    <div className="page-title-block"><span className="eyebrow section-eyebrow">LEARN TOGETHER</span><h1><MessageCircle size={27} style={{ verticalAlign: 'middle' }} /> Community chat</h1><p>Create a public learning group or a private group with an invite code.</p></div>
    {notice && <div className="notice-box" role="status" style={{ marginBottom: 16 }}>{notice}<button className="text-button" onClick={() => setNotice('')}>Dismiss</button></div>}
    <section className="admin-panel-card" style={{ marginBottom: 20 }}><div className="panel-title"><Plus size={21}/><div><h2>Create a group</h2><p>Choose who can join.</p></div></div>
      <label className="profile-field"><span>Group name</span><input value={groupName} onChange={e => setGroupName(e.target.value)} maxLength={60} placeholder="e.g. TNPSC Study Circle" /></label>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '12px 0' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="radio" checked={visibility === 'public'} onChange={() => setVisibility('public')} /> <Globe size={17}/> Public group</label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="radio" checked={visibility === 'private'} onChange={() => setVisibility('private')} /> <LockKeyhole size={17}/> Private group</label>
      </div>
      {visibility === 'private' && <label className="profile-field"><span>Invite code (optional — auto-generate if empty)</span><input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Set a private invite code" maxLength={32}/></label>}
      <button className="primary-button" onClick={() => void createGroup()}><Plus size={16}/> Create group</button>
    </section>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 0.8fr) minmax(300px, 1.5fr)', gap: 18 }}>
      <section className="admin-panel-card"><div className="panel-title"><Users size={20}/><div><h2>Groups</h2><p>{groups.length} groups found</p></div><button className="icon-button" aria-label="Refresh groups" onClick={() => void loadGroups()}><RefreshCw size={16}/></button></div>
        {loading ? <p>Loading groups…</p> : groups.length === 0 ? <p className="muted-line">No groups yet. Create the first one.</p> : groups.map(group => <article key={group.id} style={{ padding: 12, border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, marginBottom: 10 }}><strong>{group.name}</strong><p style={{ margin: '6px 0', fontSize: 13 }}>{group.visibility === 'public' ? '🌍 Public' : '🔒 Private'}</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="outline-button" onClick={() => { setSelected(group); setNotice('') }}>Open chat</button>{group.created_by !== user.id && <button className="outline-button" onClick={() => void joinGroup(group)}>{group.visibility === 'private' ? 'Join with code' : 'Join group'}</button>}</div>{group.visibility === 'private' && group.created_by !== user.id && <input style={{ width: '100%', marginTop: 8 }} value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Private invite code"/>}{group.visibility === 'private' && group.created_by === user.id && group.invite_code && <small>Invite code: <strong>{group.invite_code}</strong></small>}</article>)}
      </section>
      <section className="admin-panel-card" style={{ minHeight: 420, display: 'flex', flexDirection: 'column' }}><div className="panel-title"><MessageCircle size={20}/><div><h2>{selected?.name ?? 'Select a group'}</h2><p>{selected ? `${selected.visibility === 'public' ? 'Public' : 'Private'} group chat` : 'Choose a group from the list to view messages.'}</p></div></div>
        <div style={{ flex: 1, minHeight: 260, maxHeight: 460, overflowY: 'auto', padding: 8 }}>{selected && messages.map(message => <div key={message.id} style={{ margin: '8px 0', textAlign: message.sender_id === user.id ? 'right' : 'left' }}><span style={{ display: 'inline-block', maxWidth: '85%', padding: '10px 12px', borderRadius: 12, background: message.sender_id === user.id ? '#dbeafe' : '#f3f4f6', color: '#111827', textAlign: 'left', overflowWrap: 'anywhere' }}>{message.body}<small style={{ display: 'block', marginTop: 5, opacity: .65 }}>{new Date(message.created_at).toLocaleString()}</small></span></div>)}{selected && messages.length === 0 && <p className="muted-line">No messages yet. Start the conversation!</p>}</div>
        <form onSubmit={e => { e.preventDefault(); void sendMessage() }} style={{ display: 'flex', gap: 8, marginTop: 12 }}><input aria-label="Message" value={draft} onChange={e => setDraft(e.target.value)} placeholder={selected ? 'Write a message…' : 'Select a group first'} disabled={!selected} maxLength={4000} style={{ flex: 1 }}/><button className="primary-button" type="submit" disabled={!selected || !draft.trim()}><Send size={16}/> Send</button></form>
      </section>
    </div>
    {isAdmin && <p className="admin-footnote">Admin account detected. User administration remains controlled by your Supabase admin policies.</p>}
  </main>
}
