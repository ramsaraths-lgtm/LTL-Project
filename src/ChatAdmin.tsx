import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Ban, LoaderCircle, MessageCircle, RefreshCw, Search, ShieldCheck, Trash2, Users } from 'lucide-react'

type Props = { supabase: SupabaseClient | null }
type UserRow = { id: string; full_name: string | null; role: string; created_at: string }
type GroupRow = { id: string; name: string; visibility: string; owner_id: string; owner_name: string | null; member_count: number; message_count: number; created_at: string }
type MemberRow = { user_id: string; role: string }

const friendly = (message: string) =>
  /could not find the function|schema cache|does not exist/i.test(message)
    ? 'Chat database is not set up yet. Run phase-6-chat-setup.sql in the Supabase SQL Editor.'
    : message

export default function ChatAdmin({ supabase }: Props) {
  const [view, setView] = useState<'users' | 'groups'>('users')
  const [users, setUsers] = useState<UserRow[]>([])
  const [suspended, setSuspended] = useState<Set<string>>(new Set())
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [u, b, g] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role, created_at').order('created_at', { ascending: false }).limit(1000),
      supabase.from('ltl_chat_bans').select('user_id'),
      supabase.rpc('ltl_admin_chat_overview'),
    ])
    const firstError = u.error ?? b.error ?? g.error
    setMessage(firstError ? friendly(firstError.message) : '')
    if (!u.error) setUsers((u.data ?? []) as UserRow[])
    if (!b.error) setSuspended(new Set(((b.data ?? []) as { user_id: string }[]).map(row => row.user_id)))
    if (!g.error) setGroups(((g.data ?? []) as GroupRow[]).map(row => ({ ...row, member_count: Number(row.member_count), message_count: Number(row.message_count) })))
    setLoading(false)
  }, [supabase])
  useEffect(() => { void load() }, [load])

  const nameOf = (id: string) => users.find(u => u.id === id)?.full_name?.trim() || 'Learner'

  async function toggleSuspend(user: UserRow) {
    if (!supabase) return
    const isSuspended = suspended.has(user.id)
    if (!isSuspended && !window.confirm(`Suspend chat access for ${user.full_name?.trim() || 'this user'}? They will not be able to send messages.`)) return
    const { error } = isSuspended
      ? await supabase.from('ltl_chat_bans').delete().eq('user_id', user.id)
      : await supabase.from('ltl_chat_bans').insert({ user_id: user.id })
    if (error) return setMessage(friendly(error.message))
    setMessage(isSuspended ? 'Chat access restored.' : 'Chat access suspended.')
    await load()
  }

  async function deleteGroup(group: GroupRow) {
    if (!supabase || !window.confirm(`Delete group "${group.name}" and all its messages?`)) return
    const { error } = await supabase.from('ltl_chat_groups').delete().eq('id', group.id)
    if (error) return setMessage(friendly(error.message))
    setMessage('Group deleted.')
    if (openGroup === group.id) setOpenGroup(null)
    await load()
  }

  async function toggleMembers(group: GroupRow) {
    if (!supabase) return
    if (openGroup === group.id) { setOpenGroup(null); return }
    setOpenGroup(group.id)
    setMembers([])
    const { data, error } = await supabase.from('ltl_chat_members').select('user_id, role').eq('group_id', group.id)
    if (error) setMessage(friendly(error.message))
    else setMembers((data ?? []) as MemberRow[])
  }

  async function removeMember(group: GroupRow, userId: string) {
    if (!supabase || !window.confirm(`Remove ${nameOf(userId)} from "${group.name}"?`)) return
    const { error } = await supabase.from('ltl_chat_members').delete().eq('group_id', group.id).eq('user_id', userId)
    if (error) return setMessage(friendly(error.message))
    setMembers(prev => prev.filter(m => m.user_id !== userId))
    setMessage('Member removed.')
    await load()
    setOpenGroup(group.id)
  }

  const q = search.trim().toLowerCase()
  const shownUsers = users.filter(u => !q || (u.full_name ?? 'learner').toLowerCase().includes(q))
  const shownGroups = groups.filter(g => !q || g.name.toLowerCase().includes(q) || (g.owner_name ?? '').toLowerCase().includes(q))

  if (!supabase) return <section className="admin-panel-card"><p className="muted-line">Supabase is not configured.</p></section>

  return <section className="admin-panel-card">
    <div className="panel-title"><MessageCircle size={22} /><div><h2>Users &amp; Chat Management</h2><p>View registered users, suspend chat access, and manage public and private groups. Message contents are not shown here.</p></div>
      <button className="icon-button" aria-label="Refresh" onClick={() => void load()}><RefreshCw size={16} /></button></div>
    <div className="quiz-mode-switch">
      <button className={view === 'users' ? 'selected' : ''} onClick={() => setView('users')}><Users size={17} /> Users ({users.length})</button>
      <button className={view === 'groups' ? 'selected' : ''} onClick={() => setView('groups')}><MessageCircle size={17} /> Groups ({groups.length})</button>
    </div>
    <label className="chat-search" style={{ margin: '14px 0' }}><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={view === 'users' ? 'Search users' : 'Search groups or owners'} aria-label="Search" /></label>
    {message && <div className="notice-box" role="status">{message}<button className="text-button" onClick={() => setMessage('')}>Dismiss</button></div>}
    {loading ? <p className="muted-line"><LoaderCircle className="spin" size={16} /> Loading…</p> : view === 'users'
      ? (shownUsers.length === 0 ? <p className="muted-line">No users found.</p> : <div className="content-list">{shownUsers.map(u => <div className="content-row" key={u.id}>
        <span className="content-row-icon">{u.role === 'admin' ? <ShieldCheck size={19} /> : <Users size={19} />}</span>
        <span className="content-row-copy"><strong>{u.full_name?.trim() || 'Learner'}</strong><small>{u.role} · joined {new Date(u.created_at).toLocaleDateString()}{suspended.has(u.id) ? ' · chat suspended' : ''}</small></span>
        {u.role !== 'admin' && <button className="text-button" onClick={() => void toggleSuspend(u)}><Ban size={14} /> {suspended.has(u.id) ? 'Restore chat' : 'Suspend chat'}</button>}
      </div>)}</div>)
      : (shownGroups.length === 0 ? <p className="muted-line">No groups found.</p> : <div className="content-list">{shownGroups.map(g => <div key={g.id}>
        <div className="content-row">
          <span className="content-row-icon"><Users size={19} /></span>
          <span className="content-row-copy"><strong>{g.name}</strong><small>{g.visibility} · owner {g.owner_name?.trim() || 'Learner'} · {g.member_count} members · {g.message_count} messages</small></span>
          <button className="text-button" onClick={() => void toggleMembers(g)}>{openGroup === g.id ? 'Hide members' : 'Members'}</button>
          <button className="icon-button" aria-label={`Delete ${g.name}`} onClick={() => void deleteGroup(g)}><Trash2 size={16} /></button>
        </div>
        {openGroup === g.id && <div className="chat-members" style={{ margin: '4px 0 12px 48px' }}>{members.length === 0 ? <p className="muted-line">Loading members…</p> : members.map(m => <div className="chat-member" key={m.user_id}>
          <span>{nameOf(m.user_id)}{m.role === 'owner' && <em> · Owner</em>}</span>
          {m.role !== 'owner' && <button className="icon-button" aria-label={`Remove ${nameOf(m.user_id)}`} onClick={() => void removeMember(g, m.user_id)}><Trash2 size={14} /></button>}
        </div>)}</div>}
      </div>)}</div>)}
  </section>
}
