import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Activity, RefreshCw } from 'lucide-react'

type AuditRow = { id: number; actor_id: string | null; action: string; target_type: string; target_id: string | null; metadata: Record<string, unknown>; created_at: string }
export default function SecurityAudit({ supabase }: { supabase: SupabaseClient }) {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  async function load() {
    setBusy(true)
    const { data, error: e } = await supabase.from('ltl_security_audit').select('*').order('created_at', { ascending: false }).limit(200)
    if (e) setError(e.message); else { setError(''); setRows((data ?? []) as AuditRow[]) }
    setBusy(false)
  }
  useEffect(() => { void load() }, [supabase])
  return <section className="admin-panel-card">
    <div className="panel-title"><Activity size={22}/><div><h2>Security activity</h2><p>Latest 200 recorded security events. Message contents and passwords are never displayed here.</p></div><button className="outline-button" onClick={() => void load()}><RefreshCw size={15}/> Refresh</button></div>
    {error && <div className="notice-box">{error}<br/>Run phase-9-security-setup.sql in Supabase SQL Editor.</div>}
    {busy ? <p className="muted-line">Loading security events…</p> : rows.length === 0 ? <p className="muted-line">No security events recorded yet.</p> : <div className="content-list">{rows.map(row => <div className="content-row" key={row.id}><span className="content-row-icon"><Activity size={18}/></span><span className="content-row-copy"><strong>{row.action.replace(/_/g, ' ')}</strong><small>{row.target_type} · {row.actor_id ? `User ${row.actor_id.slice(0,8)}…` : 'System'} · {new Date(row.created_at).toLocaleString()}</small></span></div>)}</div>}
  </section>
}
