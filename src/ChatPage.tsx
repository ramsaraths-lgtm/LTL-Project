import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import {
  ArrowLeft, Ban, Check, CheckCheck, Copy, Globe, Info, LoaderCircle, LockKeyhole, LogOut,
  MessageCircle, Plus, RefreshCw, Search, Send, Trash2, UserPlus, Users, X,
} from 'lucide-react'

export type ChatPageProps = { supabase: SupabaseClient | null; user: User | null; isAdmin: boolean }

type Profile = { id: string; full_name: string | null; role?: string | null }
type GroupRow = {
  id: string; name: string; description: string; visibility: 'public' | 'private'; created_by: string
  created_at: string; role: string; member_count: number; unread: number; last_message_at: string | null
}
type DmRow = { other_id: string; last_body: string | null; last_at: string | null; unread: number }
type DiscoverRow = { id: string; name: string; description: string; member_count: number; is_member: boolean; created_at: string }
type ChatMsg = { id: string; sender_id: string; body: string; created_at: string; read_at?: string | null }
type Conv = { kind: 'dm' | 'group'; id: string }
type Tab = 'chats' | 'groups' | 'discover' | 'people'
type ListItem = { key: string; kind: 'dm' | 'group'; id: string; title: string; sub: string; at: string; unread: number; online: boolean; icon: 'dm' | 'public' | 'private' }

const friendly = (message: string) => {
  if (/row-level security|permission denied/i.test(message)) return 'Not allowed. You may be blocked, suspended, or no longer a member.'
  if (/could not find the function|does not exist|schema cache/i.test(message)) return 'Chat database is not set up yet. Run phase-6-chat-setup.sql in the Supabase SQL Editor, then refresh.'
  return message
}
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const dayLabel = (iso: string) => {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}
const initials = (name: string) => (name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('') || '?').toUpperCase()
// Supabase query builders are lazy: they only send the request once .then() is called.
const fire = (query: PromiseLike<unknown>) => { void Promise.resolve(query).then(() => undefined, () => undefined) }

export default function ChatPage({ supabase, user, isAdmin }: ChatPageProps) {
  const uid = user?.id ?? ''
  const [people, setPeople] = useState<Profile[]>([])
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [dms, setDms] = useState<DmRow[]>([])
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [banned, setBanned] = useState(false)
  const [online, setOnline] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<Tab>('chats')
  const [search, setSearch] = useState('')
  const [active, setActive] = useState<Conv | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [discover, setDiscover] = useState<DiscoverRow[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const activeRef = useRef<Conv | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const nameMap = useMemo(() => {
    const map = new Map<string, string>()
    people.forEach(p => map.set(p.id, p.full_name?.trim() || 'Learner'))
    return map
  }, [people])
  const nameOf = useCallback((id: string) => (id === uid ? 'You' : nameMap.get(id) ?? 'Learner'), [nameMap, uid])

  // ---------- loading ----------
  const loadOverview = useCallback(async () => {
    if (!supabase || !uid) return
    const [g, d, b, ban] = await Promise.all([
      supabase.rpc('ltl_my_chat_groups'),
      supabase.rpc('ltl_dm_overview'),
      supabase.from('ltl_user_blocks').select('blocked_id').eq('blocker_id', uid),
      supabase.from('ltl_chat_bans').select('user_id').eq('user_id', uid).maybeSingle(),
    ])
    const firstError = g.error ?? d.error ?? b.error
    if (firstError) setError(friendly(firstError.message))
    else setError('')
    if (!g.error) setGroups(((g.data ?? []) as GroupRow[]).map(row => ({ ...row, member_count: Number(row.member_count), unread: Number(row.unread) })))
    if (!d.error) setDms(((d.data ?? []) as DmRow[]).map(row => ({ ...row, unread: Number(row.unread) })))
    if (!b.error) setBlocked(new Set(((b.data ?? []) as { blocked_id: string }[]).map(row => row.blocked_id)))
    setBanned(Boolean(ban.data))
  }, [supabase, uid])

  const loadPeople = useCallback(async () => {
    if (!supabase || !uid) return
    const { data, error: e } = await supabase.from('profiles').select('id, full_name, role').order('full_name', { ascending: true }).limit(1000)
    if (e) setError(friendly(e.message))
    else setPeople((data ?? []) as Profile[])
  }, [supabase, uid])

  useEffect(() => {
    if (!supabase || !uid) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    void Promise.all([loadPeople(), loadOverview()]).then(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [supabase, uid, loadPeople, loadOverview])

  // messages of the open conversation
  useEffect(() => {
    activeRef.current = active
    setShowInfo(false)
    if (!supabase || !uid || !active) { setMessages([]); return }
    let cancelled = false
    setMsgLoading(true)
    setMessages([])
    const run = async () => {
      let rows: ChatMsg[] = []
      if (active.kind === 'dm') {
        const { data, error: e } = await supabase.from('ltl_direct_messages').select('*')
          .or(`and(sender_id.eq.${uid},recipient_id.eq.${active.id}),and(sender_id.eq.${active.id},recipient_id.eq.${uid})`)
          .order('created_at', { ascending: false }).limit(300)
        if (e) setNotice(friendly(e.message))
        rows = ((data ?? []) as ChatMsg[]).slice().reverse()
        await supabase.rpc('ltl_mark_dm_read', { p_other: active.id })
      } else {
        const { data, error: e } = await supabase.from('ltl_group_messages').select('*')
          .eq('group_id', active.id).order('created_at', { ascending: false }).limit(300)
        if (e) setNotice(friendly(e.message))
        rows = ((data ?? []) as ChatMsg[]).slice().reverse()
        await supabase.rpc('ltl_mark_group_read', { p_group: active.id })
      }
      if (cancelled) return
      setMessages(rows)
      setMsgLoading(false)
      void loadOverview()
    }
    void run()
    return () => { cancelled = true }
  }, [active, supabase, uid, loadOverview])

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }) }, [messages, msgLoading])

  // realtime: new messages, read receipts
  useEffect(() => {
    if (!supabase || !uid) return
    const append = (msg: ChatMsg) => setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
    const channel = supabase.channel(`ltl-chat-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ltl_direct_messages', filter: `recipient_id=eq.${uid}` }, payload => {
        const msg = payload.new as unknown as ChatMsg & { sender_id: string }
        const a = activeRef.current
        if (a && a.kind === 'dm' && a.id === msg.sender_id) {
          append(msg)
          fire(supabase.rpc('ltl_mark_dm_read', { p_other: msg.sender_id }))
        }
        void loadOverview()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ltl_direct_messages', filter: `sender_id=eq.${uid}` }, payload => {
        const msg = payload.new as unknown as ChatMsg & { recipient_id: string }
        const a = activeRef.current
        if (a && a.kind === 'dm' && a.id === msg.recipient_id) append(msg)
        void loadOverview()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ltl_direct_messages', filter: `sender_id=eq.${uid}` }, payload => {
        const msg = payload.new as unknown as ChatMsg
        setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, read_at: msg.read_at } : m)))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ltl_group_messages' }, payload => {
        const msg = payload.new as unknown as ChatMsg & { group_id: string }
        const a = activeRef.current
        if (a && a.kind === 'group' && a.id === msg.group_id) {
          append(msg)
          if (msg.sender_id !== uid) fire(supabase.rpc('ltl_mark_group_read', { p_group: msg.group_id }))
        }
        void loadOverview()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [supabase, uid, loadOverview])

  // realtime: online / offline presence
  useEffect(() => {
    if (!supabase || !uid) return
    const channel = supabase.channel('ltl-presence', { config: { presence: { key: uid } } })
    channel
      .on('presence', { event: 'sync' }, () => { setOnline(new Set(Object.keys(channel.presenceState()))) })
      .subscribe(async status => { if (status === 'SUBSCRIBED') await channel.track({ at: new Date().toISOString() }) })
    return () => { void supabase.removeChannel(channel) }
  }, [supabase, uid])

  // public group discovery
  const loadDiscover = useCallback(async (query: string) => {
    if (!supabase || !uid) return
    setDiscoverLoading(true)
    const { data, error: e } = await supabase.rpc('ltl_discover_public_groups', { p_query: query })
    if (e) setNotice(friendly(e.message))
    else setDiscover(((data ?? []) as DiscoverRow[]).map(row => ({ ...row, member_count: Number(row.member_count) })))
    setDiscoverLoading(false)
  }, [supabase, uid])

  useEffect(() => {
    if (tab !== 'discover') return
    const timer = window.setTimeout(() => { void loadDiscover(search.trim()) }, 250)
    return () => window.clearTimeout(timer)
  }, [tab, search, loadDiscover])

  // ---------- actions ----------
  const openConv = (conv: Conv) => { setActive(conv); setNotice('') }

  async function send() {
    const body = draft.trim()
    if (!supabase || !uid || !active || !body || sending) return
    setSending(true)
    if (active.kind === 'dm') {
      const { data, error: e } = await supabase.from('ltl_direct_messages').insert({ sender_id: uid, recipient_id: active.id, body }).select('*').single()
      if (e) setNotice(friendly(e.message))
      else { const row = data as ChatMsg; setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row])); setDraft('') }
    } else {
      const { data, error: e } = await supabase.from('ltl_group_messages').insert({ group_id: active.id, sender_id: uid, body }).select('*').single()
      if (e) setNotice(friendly(e.message))
      else { const row = data as ChatMsg; setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row])); setDraft('') }
    }
    setSending(false)
    void loadOverview()
  }

  async function toggleBlock(otherId: string) {
    if (!supabase || !uid) return
    const isBlocked = blocked.has(otherId)
    const { error: e } = isBlocked
      ? await supabase.from('ltl_user_blocks').delete().eq('blocker_id', uid).eq('blocked_id', otherId)
      : await supabase.from('ltl_user_blocks').insert({ blocker_id: uid, blocked_id: otherId })
    if (e) return setNotice(friendly(e.message))
    setNotice(isBlocked ? `${nameOf(otherId)} unblocked.` : `${nameOf(otherId)} blocked. They can no longer message you.`)
    await loadOverview()
  }

  async function joinByCode() {
    if (!supabase || !uid || !joinCode.trim() || joining) return
    setJoining(true)
    const { data, error: e } = await supabase.rpc('ltl_join_group_by_code', { p_code: joinCode.trim() })
    setJoining(false)
    if (e) return setNotice(friendly(e.message))
    setJoinCode('')
    setNotice('Joined the private group.')
    await loadOverview()
    openConv({ kind: 'group', id: data as string })
    setTab('chats')
  }

  async function joinPublic(group: DiscoverRow) {
    if (!supabase || !uid) return
    const { error: e } = await supabase.rpc('ltl_join_public_group', { p_group_id: group.id })
    if (e) return setNotice(friendly(e.message))
    setNotice(`Joined ${group.name}.`)
    await loadOverview()
    void loadDiscover(search.trim())
    openConv({ kind: 'group', id: group.id })
  }

  async function createGroup(name: string, description: string, visibility: 'public' | 'private', memberIds: string[]): Promise<string | null> {
    if (!supabase || !uid) return 'Please sign in first.'
    const { data, error: e } = await supabase.rpc('ltl_create_chat_group', { p_name: name, p_description: description, p_visibility: visibility, p_member_ids: memberIds })
    if (e) return friendly(e.message)
    await loadOverview()
    setShowCreate(false)
    setTab('chats')
    openConv({ kind: 'group', id: data as string })
    setNotice(visibility === 'private' ? 'Private group created. Open group info to see the invite code.' : 'Public group created. Anyone can find and join it.')
    return null
  }

  // ---------- derived ----------
  const q = search.trim().toLowerCase()
  const items = useMemo<ListItem[]>(() => {
    const list: ListItem[] = []
    dms.forEach(d => list.push({
      key: `dm:${d.other_id}`, kind: 'dm', id: d.other_id, title: nameOf(d.other_id), sub: d.last_body ?? '', at: d.last_at ?? '',
      unread: d.unread, online: online.has(d.other_id), icon: 'dm',
    }))
    groups.forEach(g => list.push({
      key: `group:${g.id}`, kind: 'group', id: g.id, title: g.name, sub: `${g.member_count} member${g.member_count === 1 ? '' : 's'}`,
      at: g.last_message_at ?? g.created_at, unread: g.unread, online: false, icon: g.visibility,
    }))
    return list.sort((a, b) => b.at.localeCompare(a.at))
  }, [dms, groups, nameOf, online])
  const filteredItems = items.filter(i => !q || i.title.toLowerCase().includes(q))
  const groupItems = filteredItems.filter(i => i.kind === 'group')
  const filteredPeople = people.filter(p => p.id !== uid && (!q || (p.full_name ?? 'learner').toLowerCase().includes(q)))
  const totalUnread = items.reduce((sum, i) => sum + i.unread, 0)
  const activeGroup = active?.kind === 'group' ? groups.find(g => g.id === active.id) ?? null : null
  const activeTitle = !active ? '' : active.kind === 'dm' ? nameOf(active.id) : activeGroup?.name ?? 'Group'
  const iBlockedActive = active?.kind === 'dm' && blocked.has(active.id)

  if (!user) return <main className="inner-page"><div className="page-title-block"><h1>Community chat</h1><p>Please sign in to use LTL chat.</p></div></main>
  if (!supabase) return <main className="inner-page"><div className="notice-box">Chat is unavailable because Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.</div></main>

  return <main className="inner-page chat-page">
    <div className="chat-title">
      <div><span className="eyebrow section-eyebrow">LEARN TOGETHER</span><h1><MessageCircle size={26} /> Chat</h1></div>
      <button className="primary-button small-action" onClick={() => setShowCreate(true)} disabled={banned}><Plus size={16} /> New group</button>
    </div>
    {banned && <div className="notice-box" role="alert">Your chat access has been suspended by an admin. You can read old messages but cannot send new ones.</div>}
    {error && <div className="notice-box chat-error" role="alert">{error}<button className="text-button" onClick={() => void loadOverview()}>Retry</button></div>}
    {notice && <div className="notice-box" role="status">{notice}<button className="text-button" onClick={() => setNotice('')}>Dismiss</button></div>}

    <div className={`chat-shell ${active ? 'has-active' : ''}`}>
      <aside className="chat-side">
        <label className="chat-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'people' ? 'Search users' : tab === 'discover' ? 'Search public groups' : 'Search chats'} aria-label="Search" />{search && <button className="icon-button" aria-label="Clear search" onClick={() => setSearch('')}><X size={14} /></button>}</label>
        <div className="chat-tabs" role="tablist">
          {([['chats', 'Chats'], ['groups', 'Groups'], ['discover', 'Discover'], ['people', 'People']] as [Tab, string][]).map(([id, label]) =>
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}{id === 'chats' && totalUnread > 0 && <span className="chat-badge">{totalUnread}</span>}</button>)}
        </div>
        <div className="chat-list">
          {loading ? <p className="chat-empty"><LoaderCircle className="spin" size={16} /> Loading chats…</p> : <>
            {tab === 'chats' && (filteredItems.length === 0
              ? <p className="chat-empty">{q ? 'No chats match your search.' : 'No chats yet. Open the People tab to message someone, or create a group.'}</p>
              : filteredItems.map(i => <ChatRow key={i.key} item={i} selected={active?.kind === i.kind && active.id === i.id} onOpen={() => openConv({ kind: i.kind, id: i.id })} />))}
            {tab === 'groups' && <>
              <form className="chat-join" onSubmit={(e: FormEvent) => { e.preventDefault(); void joinByCode() }}>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Private group invite code" maxLength={16} aria-label="Invite code" />
                <button className="outline-button" type="submit" disabled={!joinCode.trim() || joining}>{joining ? <LoaderCircle className="spin" size={14} /> : <LockKeyhole size={14} />} Join</button>
              </form>
              {groupItems.length === 0 ? <p className="chat-empty">{q ? 'No groups match your search.' : 'You are not in any group yet.'}</p>
                : groupItems.map(i => <ChatRow key={i.key} item={i} selected={active?.kind === 'group' && active.id === i.id} onOpen={() => openConv({ kind: 'group', id: i.id })} />)}
            </>}
            {tab === 'discover' && (discoverLoading ? <p className="chat-empty"><LoaderCircle className="spin" size={16} /> Searching…</p>
              : discover.length === 0 ? <p className="chat-empty">No public groups found.</p>
              : discover.map(g => <div className="chat-row chat-discover" key={g.id}>
                <span className="chat-avatar"><Globe size={18} /></span>
                <span className="chat-row-copy"><strong>{g.name}</strong><small>{g.member_count} member{g.member_count === 1 ? '' : 's'}{g.description ? ` · ${g.description}` : ''}</small></span>
                {g.is_member ? <button className="outline-button chat-mini" onClick={() => openConv({ kind: 'group', id: g.id })}>Open</button>
                  : <button className="primary-button chat-mini" onClick={() => void joinPublic(g)} disabled={banned}>Join Group</button>}
              </div>))}
            {tab === 'people' && (filteredPeople.length === 0 ? <p className="chat-empty">No users found.</p>
              : filteredPeople.map(p => <button key={p.id} className="chat-row" onClick={() => { openConv({ kind: 'dm', id: p.id }); setTab('chats') }}>
                <span className="chat-avatar">{initials(p.full_name ?? 'Learner')}{online.has(p.id) && <i className="chat-dot" />}</span>
                <span className="chat-row-copy"><strong>{p.full_name?.trim() || 'Learner'}</strong><small>{online.has(p.id) ? 'Online' : 'Offline'}{p.role === 'admin' ? ' · Admin' : ''}</small></span>
              </button>))}
          </>}
        </div>
      </aside>

      <section className="chat-main">
        {!active ? <div className="chat-placeholder"><MessageCircle size={42} /><h2>Select a chat</h2><p>Pick a conversation, search for a learner, or join a group to start chatting.</p></div> : <>
          <header className="chat-head">
            <button className="icon-button chat-back" aria-label="Back to chats" onClick={() => setActive(null)}><ArrowLeft size={18} /></button>
            <span className="chat-avatar">{active.kind === 'dm' ? initials(activeTitle) : activeGroup?.visibility === 'private' ? <LockKeyhole size={17} /> : <Users size={17} />}{active.kind === 'dm' && online.has(active.id) && <i className="chat-dot" />}</span>
            <div className="chat-head-copy"><strong>{activeTitle}</strong>
              <small>{active.kind === 'dm' ? (online.has(active.id) ? 'Online' : 'Offline') : activeGroup ? `${activeGroup.visibility === 'public' ? 'Public' : 'Private'} group · ${activeGroup.member_count} members` : ''}</small></div>
            {active.kind === 'dm'
              ? <button className="outline-button chat-mini" onClick={() => void toggleBlock(active.id)}><Ban size={14} /> {iBlockedActive ? 'Unblock' : 'Block'}</button>
              : <button className="outline-button chat-mini" onClick={() => setShowInfo(v => !v)} disabled={!activeGroup}><Info size={14} /> Info</button>}
          </header>
          {showInfo && activeGroup && <GroupInfo supabase={supabase} group={activeGroup} me={uid} isAdmin={isAdmin} people={people} nameOf={nameOf} online={online}
            onClose={() => setShowInfo(false)} onChanged={() => void loadOverview()} onNotice={setNotice}
            onLeft={() => { setShowInfo(false); setActive(null); void loadOverview() }} />}
          <div className="chat-messages">
            {msgLoading ? <p className="chat-empty"><LoaderCircle className="spin" size={16} /> Loading messages…</p>
              : messages.length === 0 ? <p className="chat-empty">No messages yet. Say hello!</p>
              : messages.map((m, i) => {
                const mine = m.sender_id === uid
                const newDay = i === 0 || dayLabel(messages[i - 1].created_at) !== dayLabel(m.created_at)
                return <div key={m.id}>
                  {newDay && <div className="chat-day"><span>{dayLabel(m.created_at)}</span></div>}
                  <div className={`chat-msg ${mine ? 'mine' : ''}`}>
                    <div className="chat-bubble">
                      {active.kind === 'group' && !mine && <b className="chat-sender">{nameOf(m.sender_id)}</b>}
                      <span className="chat-text">{m.body}</span>
                      <small className="chat-meta">{timeOf(m.created_at)}{mine && active.kind === 'dm' && (m.read_at ? <CheckCheck size={14} className="chat-read" aria-label="Read" /> : <Check size={14} aria-label="Sent" />)}</small>
                    </div>
                  </div>
                </div>
              })}
            <div ref={bottomRef} />
          </div>
          {iBlockedActive
            ? <div className="chat-blocked">You blocked {activeTitle}. <button className="text-button" onClick={() => void toggleBlock(active.id)}>Unblock to send messages</button></div>
            : <form className="chat-composer" onSubmit={(e: FormEvent) => { e.preventDefault(); void send() }}>
              <input aria-label="Message" value={draft} onChange={e => setDraft(e.target.value)} placeholder={banned ? 'Chat access suspended' : 'Write a message…'} disabled={banned} maxLength={4000} autoComplete="off" />
              <button className="primary-button" type="submit" disabled={banned || sending || !draft.trim()} aria-label="Send message">{sending ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}<span className="chat-send-label"> Send</span></button>
            </form>}
        </>}
      </section>
    </div>

    {showCreate && <CreateGroupModal people={people.filter(p => p.id !== uid)} onClose={() => setShowCreate(false)} onCreate={createGroup} />}
  </main>
}

function ChatRow({ item, selected, onOpen }: { item: ListItem; selected: boolean; onOpen: () => void }) {
  return <button className={`chat-row ${selected ? 'selected' : ''}`} onClick={onOpen}>
    <span className="chat-avatar">{item.icon === 'dm' ? initials(item.title) : item.icon === 'private' ? <LockKeyhole size={17} /> : <Globe size={17} />}{item.online && <i className="chat-dot" />}</span>
    <span className="chat-row-copy"><strong>{item.title}</strong><small>{item.sub || (item.kind === 'dm' ? 'Say hello' : '')}</small></span>
    <span className="chat-row-side">{item.at && <small>{dayLabel(item.at) === 'Today' ? timeOf(item.at) : dayLabel(item.at)}</small>}{item.unread > 0 && <span className="chat-badge">{item.unread > 99 ? '99+' : item.unread}</span>}</span>
  </button>
}

function CreateGroupModal({ people, onClose, onCreate }: {
  people: Profile[]; onClose: () => void
  onCreate: (name: string, description: string, visibility: 'public' | 'private', memberIds: string[]) => Promise<string | null>
}) {
  const [visibility, setVisibility] = useState<'public' | 'private' | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const visible = people.filter(p => !filter.trim() || (p.full_name ?? 'learner').toLowerCase().includes(filter.trim().toLowerCase()))

  async function submit() {
    if (!visibility) return
    if (name.trim().length < 2) return setErr('Group name must contain at least 2 characters.')
    setBusy(true); setErr('')
    const result = await onCreate(name.trim(), description.trim(), visibility, Array.from(picked))
    setBusy(false)
    if (result) setErr(result)
  }

  return <div className="chat-modal-backdrop" role="dialog" aria-modal="true" aria-label="Create group" onClick={onClose}>
    <div className="chat-modal" onClick={e => e.stopPropagation()}>
      <div className="chat-modal-head"><h2>{visibility ? (visibility === 'private' ? 'New private group' : 'New public group') : 'Create a group'}</h2><button className="icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
      {!visibility ? <div className="chat-type-grid">
        <button className="chat-type" onClick={() => setVisibility('private')}><LockKeyhole size={26} /><strong>🔒 Private Group</strong><span>Invite-only, e.g. Friends Group. Only added members can read messages. Joining needs an invite code.</span></button>
        <button className="chat-type" onClick={() => setVisibility('public')}><Globe size={26} /><strong>🌍 Public Group</strong><span>Open to everyone, e.g. TNPSC Preparation Group. Users can search it and press Join Group.</span></button>
      </div> : <>
        <label className="profile-field"><span>Group name</span><input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder={visibility === 'private' ? 'e.g. Friends Group' : 'e.g. TNPSC Preparation Group'} autoFocus /></label>
        <label className="profile-field"><span>Description (optional)</span><textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={300} rows={2} placeholder="What is this group about?" /></label>
        <div className="chat-picker">
          <strong>{visibility === 'private' ? 'Add members' : 'Add members (optional)'} · {picked.size} selected</strong>
          <label className="chat-search"><Search size={15} /><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search users" aria-label="Search users" /></label>
          <div className="chat-picker-list">{visible.length === 0 ? <p className="chat-empty">No users found.</p> : visible.map(p => <label key={p.id} className="chat-pick">
            <input type="checkbox" checked={picked.has(p.id)} onChange={() => setPicked(prev => { const next = new Set(prev); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next })} />
            <span>{p.full_name?.trim() || 'Learner'}</span></label>)}</div>
        </div>
        {visibility === 'private' && <p className="chat-hint">An invite code is generated automatically. Only you (the owner) can see and regenerate it.</p>}
        {err && <div className="notice-box" role="alert">{err}</div>}
        <div className="chat-modal-actions"><button className="outline-button" onClick={() => setVisibility(null)} disabled={busy}>Back</button>
          <button className="primary-button" onClick={() => void submit()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Create group</button></div>
      </>}
    </div>
  </div>
}

type MemberRow = { user_id: string; role: string }

function GroupInfo({ supabase, group, me, isAdmin, people, nameOf, online, onClose, onChanged, onLeft, onNotice }: {
  supabase: SupabaseClient; group: GroupRow; me: string; isAdmin: boolean; people: Profile[]
  nameOf: (id: string) => string; online: Set<string>
  onClose: () => void; onChanged: () => void; onLeft: () => void; onNotice: (message: string) => void
}) {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [addId, setAddId] = useState('')
  const isOwner = group.created_by === me

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: e } = await supabase.from('ltl_chat_members').select('user_id, role').eq('group_id', group.id)
    if (e) onNotice(friendly(e.message)); else setMembers((data ?? []) as MemberRow[])
    if (isOwner && group.visibility === 'private') {
      const res = await supabase.from('ltl_chat_group_codes').select('invite_code').eq('group_id', group.id).maybeSingle()
      setCode((res.data as { invite_code: string } | null)?.invite_code ?? null)
    }
    setLoading(false)
  }, [supabase, group.id, group.visibility, isOwner, onNotice])
  useEffect(() => { void load() }, [load])

  const candidates = people.filter(p => !members.some(m => m.user_id === p.id))

  async function addMember() {
    if (!addId) return
    const { error: e } = await supabase.rpc('ltl_add_chat_member', { p_group_id: group.id, p_user_id: addId })
    if (e) return onNotice(friendly(e.message))
    setAddId(''); onNotice('Member added.'); await load(); onChanged()
  }
  async function removeMember(userId: string) {
    if (!window.confirm(`Remove ${nameOf(userId)} from this group?`)) return
    const { error: e } = await supabase.from('ltl_chat_members').delete().eq('group_id', group.id).eq('user_id', userId)
    if (e) return onNotice(friendly(e.message))
    onNotice('Member removed.'); await load(); onChanged()
  }
  async function regenerate() {
    if (!window.confirm('Generate a new invite code? The old code will stop working.')) return
    const { data, error: e } = await supabase.rpc('ltl_regenerate_invite_code', { p_group_id: group.id })
    if (e) return onNotice(friendly(e.message))
    setCode(data as string); onNotice('New invite code generated.')
  }
  async function copyCode() {
    if (!code) return
    try { await navigator.clipboard.writeText(code); onNotice('Invite code copied.') } catch { onNotice(`Invite code: ${code}`) }
  }
  async function leave() {
    if (!window.confirm('Leave this group?')) return
    const { error: e } = await supabase.from('ltl_chat_members').delete().eq('group_id', group.id).eq('user_id', me)
    if (e) return onNotice(friendly(e.message))
    onNotice('You left the group.'); onLeft()
  }
  async function deleteGroup() {
    if (!window.confirm(`Delete "${group.name}" and all of its messages? This cannot be undone.`)) return
    const { error: e } = await supabase.from('ltl_chat_groups').delete().eq('id', group.id)
    if (e) return onNotice(friendly(e.message))
    onNotice('Group deleted.'); onLeft()
  }

  return <div className="chat-info">
    <div className="chat-info-head"><strong>Group info</strong><button className="icon-button" aria-label="Close info" onClick={onClose}><X size={16} /></button></div>
    {group.description && <p className="chat-hint">{group.description}</p>}
    <p className="chat-hint">{group.visibility === 'public' ? '🌍 Public group' : '🔒 Private group'} · {members.length || group.member_count} members</p>
    {isOwner && group.visibility === 'private' && <div className="chat-code">
      <span>Invite code</span><strong>{code ?? '—'}</strong>
      <button className="outline-button chat-mini" onClick={() => void copyCode()} disabled={!code}><Copy size={13} /> Copy</button>
      <button className="outline-button chat-mini" onClick={() => void regenerate()}><RefreshCw size={13} /> Regenerate</button>
    </div>}
    {isOwner && <div className="chat-add">
      <select value={addId} onChange={e => setAddId(e.target.value)} aria-label="Add member"><option value="">Add a member…</option>{candidates.map(p => <option key={p.id} value={p.id}>{p.full_name?.trim() || 'Learner'}</option>)}</select>
      <button className="primary-button chat-mini" onClick={() => void addMember()} disabled={!addId}><UserPlus size={14} /> Add</button>
    </div>}
    <div className="chat-members">{loading ? <p className="chat-empty"><LoaderCircle className="spin" size={14} /> Loading members…</p> : members.map(m => <div className="chat-member" key={m.user_id}>
      <span className="chat-avatar sm">{initials(nameOf(m.user_id))}{online.has(m.user_id) && <i className="chat-dot" />}</span>
      <span>{nameOf(m.user_id)}{m.role === 'owner' && <em> · Owner</em>}</span>
      {isOwner && m.user_id !== me && <button className="icon-button" aria-label={`Remove ${nameOf(m.user_id)}`} onClick={() => void removeMember(m.user_id)}><Trash2 size={14} /></button>}
    </div>)}</div>
    <div className="chat-info-actions">
      {!isOwner && <button className="outline-button" onClick={() => void leave()}><LogOut size={14} /> Leave group</button>}
      {(isOwner || isAdmin) && <button className="outline-button chat-danger" onClick={() => void deleteGroup()}><Trash2 size={14} /> Delete group</button>}
    </div>
  </div>
}
