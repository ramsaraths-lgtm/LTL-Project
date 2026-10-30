import { useEffect, useMemo, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import * as pdfjsLib from 'pdfjs-dist'
import { CalendarClock, CheckCircle2, Clock3, FileUp, Plus, Search, Send, ShieldCheck } from 'lucide-react'

type Draft = { question: string; options: string[]; answer: number }
type TestRow = { id: string; title: string; exam: string; subject: string; starts_at: string; duration_minutes: number; total_marks: number; status: string }
type PublicQuestion = { id: string; question: string; options: string[] }

export default function TestCenter({ supabase, user, isAdmin, exam, subject }: { supabase: SupabaseClient | null; user: User | null; isAdmin: boolean; exam: string; subject: string }) {
  const [tests, setTests] = useState<TestRow[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [duration, setDuration] = useState(60)
  const [mode, setMode] = useState<'manual'|'pdf'>('manual')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState(['','','',''])
  const [answer, setAnswer] = useState(0)
  const [running, setRunning] = useState<TestRow|null>(null)
  const [questions, setQuestions] = useState<PublicQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string,number>>({})
  const [attemptId, setAttemptId] = useState<string|null>(null)
  const [deadline, setDeadline] = useState<number|null>(null)
  const [remaining, setRemaining] = useState(0)
  const [result, setResult] = useState<{score:number;total:number}|null>(null)
  const [attempted, setAttempted] = useState<string[]>([])

  async function load() {
    if (!supabase || !user) return
    const { data, error } = await supabase.from('ltl_tests').select('id,title,exam,subject,starts_at,duration_minutes,total_marks,status').eq('exam',exam).eq('subject',subject).eq('status','published').order('starts_at',{ascending:true})
    if (error) { setNotice(error.message); return }
    setTests((data||[]) as TestRow[])
    const { data: attempts } = await supabase.from('ltl_test_attempts').select('test_id').eq('user_id',user.id)
    setAttempted((attempts||[]).map((a:any)=>a.test_id))
  }
  useEffect(()=>{ void load() },[supabase,user,exam,subject])
  useEffect(()=>{ if(!deadline || !running || result) return; const tick=()=>{const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));setRemaining(left);if(left===0)void submit()};tick();const timer=window.setInterval(tick,1000);return()=>window.clearInterval(timer) },[deadline,running,result,answers])
  const timeText = (s:number)=>`${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
  async function addPdf(file:File){
    setBusy(true);setNotice('Reading PDF…')
    try { const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let text='';for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);const c=await p.getTextContent();text+=c.items.map((x:any)=>x.str||'').join(' ')+'\n'}
      const keyMap=new Map<number,number>(); for(const m of text.matchAll(/(?:^|\s)(\d{1,3})\s*[.)-]?\s*([A-D])(?=\s|$)/gim)){keyMap.set(Number(m[1])-1,m[2].toUpperCase().charCodeAt(0)-65)} const chunks=text.replace(/\r/g,'\n').split(/(?=(?:^|\s)(?:Q(?:uestion)?\s*)?\d{1,3}[.)、:-]\s*)/i).map(x=>x.trim()).filter(Boolean);const parsed:Draft[]=[]
      for(const chunk of chunks){const clean=chunk.replace(/^(?:Q(?:uestion)?\s*)?\d{1,3}[.)、:-]\s*/i,'').trim();const ms=[...clean.matchAll(/(?:^|\s)(?:\(([A-D])\)|([A-D])[.)])\s*/gi)];if(ms.length<4)continue;const question=clean.slice(0,ms[0].index).trim();const options=ms.slice(0,4).map((m,i)=>clean.slice((m.index||0)+m[0].length,i<3?(ms[i+1].index||clean.length):clean.length).replace(/\s*(?:Answer|Ans|Correct answer|Explanation)\s*[:=-].*$/i,'').trim());const a=clean.match(/(?:correct\s*answer|answer|ans\.?|key)\s*[:.\-=]?\s*\(?([A-D])\)?\b/i);if(question&&options.length===4&&options.every(Boolean)){const idx=parsed.length;parsed.push({question,options,answer:a?a[1].toUpperCase().charCodeAt(0)-65:(keyMap.get(idx)??-1)})}}
      setDrafts(parsed);setNotice(parsed.length?`${parsed.length} questions detected. Verify every answer before creating the test.`:'No readable questions found. Use a text-based PDF or manual entry; scanned image PDFs require OCR.')
    } catch(e){setNotice(e instanceof Error?e.message:'Could not read PDF')} finally{setBusy(false)}
  }
  async function createTest(){
    if(!supabase||!user||!isAdmin)return
    if(!title.trim()||!startsAt||!Number.isFinite(duration)||duration<1||!drafts.length||drafts.some(d=>!d.question.trim()||d.options.length!==4||d.options.some(x=>!x.trim())||d.answer<0||d.answer>3)){setNotice('Enter title, schedule, duration and confirm all four options and correct answers.');return}
    setBusy(true);const start=new Date(startsAt);if(Number.isNaN(start.getTime())||start.getTime()<=Date.now()){setNotice('Choose a future start time.');setBusy(false);return}
    const {data,error}=await supabase.from('ltl_tests').insert({title:title.trim(),exam,subject,starts_at:start.toISOString(),duration_minutes:duration,total_marks:drafts.length,status:'published',created_by:user.id}).select('id').single()
    if(error){setNotice(error.message);setBusy(false);return}
    const {error:qe}=await supabase.from('ltl_test_questions').insert(drafts.map((d,i)=>({test_id:data.id,position:i+1,question:d.question,options:d.options,correct_option:d.answer})))
    if(qe){await supabase.from('ltl_tests').delete().eq('id',data.id);setNotice(qe.message);setBusy(false);return}
    setNotice('Scheduled test published successfully.');setShowCreate(false);setTitle('');setDrafts([]);await load();setBusy(false)
  }
  async function startTest(test:TestRow){
    if(!supabase||!user)return
    const start=new Date(test.starts_at).getTime();if(Date.now()<start){setNotice(`Test starts at ${new Date(test.starts_at).toLocaleString()}`);return}if(attempted.includes(test.id)){setNotice('You have already started or submitted this test. Re-entry is not allowed.');return}
    setBusy(true);const {data:attempt,error}=await supabase.from('ltl_test_attempts').insert({test_id:test.id,user_id:user.id,started_at:new Date().toISOString(),status:'in_progress'}).select('id').single()
    if(error){setNotice(error.message.includes('duplicate')?'You have already attempted this test.':error.message);setBusy(false);return}
    const {data:qs,error:qe}=await supabase.from('ltl_test_questions_public').select('id,question,options').eq('test_id',test.id).order('position')
    if(qe||!qs?.length){setNotice(qe?.message||'No questions are available.');setBusy(false);return}
    const end=Date.now()+test.duration_minutes*60000;setAttemptId(attempt.id);setRunning(test);setQuestions(qs as PublicQuestion[]);setAnswers({});setDeadline(end);setRemaining(test.duration_minutes*60);setResult(null);setAttempted(prev=>[...prev,test.id]);setBusy(false)
  }
  async function submit(){
    if(!supabase||!attemptId||!running||result)return
    setBusy(true);const {data,error}=await supabase.rpc('ltl_submit_test_attempt',{p_attempt_id:attemptId,p_answers:answers})
    if(error){setNotice(error.message);setBusy(false);return}
    setResult({score:Number(data.score),total:Number(data.total)});setDeadline(null);setNotice('Test submitted successfully.');setBusy(false)
  }
  const scheduled = useMemo(()=>tests.map(t=>({...t,started:Date.now()>=new Date(t.starts_at).getTime()})),[tests])
  if(running) return <section className="admin-panel-card" style={{marginTop:20}}><div className="panel-title"><Clock3/><div><h2>{running.title}</h2><p>{running.exam} · {running.subject} · {running.duration_minutes} minute(s)</p></div><strong style={{marginLeft:'auto',fontSize:22}}>{result?`${result.score}/${result.total}`:timeText(remaining)}</strong></div>{result?<div className="notice-box"><CheckCircle2/> Your final mark: <b>{result.score} / {result.total}</b></div>:<>{questions.map((item,i)=><article className="learner-question" key={item.id}><strong>{i+1}. {item.question}</strong><div className="learner-options">{item.options.map((o,j)=><button key={j} className={answers[item.id]===j?'chosen':''} onClick={()=>setAnswers(p=>({...p,[item.id]:j}))}>{String.fromCharCode(65+j)}. {o}</button>)}</div></article>)}<button className="primary-button" disabled={busy} onClick={()=>void submit()}><Send size={16}/> Submit test</button></>}</section>
  return <section className="learner-materials" style={{marginTop:20}}><div className="panel-title"><CalendarClock/><div><h2>Scheduled tests · {subject}</h2><p>Tests open only at the scheduled time. Each account gets one attempt.</p></div></div>{isAdmin&&<button className="primary-button" onClick={()=>setShowCreate(v=>!v)}><Plus size={16}/> Create test</button>}{showCreate&&<div className="admin-panel-card" style={{margin:'16px 0'}}><h3><ShieldCheck size={18}/> Create subject test</h3><label className="profile-field"><span>Test title</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. General Studies Weekly Test"/></label><label className="profile-field"><span>Test start date & time</span><input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)}/></label><label className="profile-field"><span>Time limit (minutes)</span><input type="number" min="1" value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label><div style={{display:'flex',gap:8,margin:'12px 0'}}><button className={mode==='manual'?'primary-button':'outline-button'} onClick={()=>setMode('manual')}>Manual</button><button className={mode==='pdf'?'primary-button':'outline-button'} onClick={()=>setMode('pdf')}>PDF scanner</button></div>{mode==='pdf'?<label className="file-drop"><FileUp/><strong>Choose question PDF</strong><input type="file" accept="application/pdf" onChange={e=>e.target.files?.[0]&&void addPdf(e.target.files[0])}/></label>:<><label className="profile-field"><span>Question</span><textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="Enter question"/></label>{opts.map((o,i)=><label className="profile-field" key={i}><span>Option {String.fromCharCode(65+i)}</span><input value={o} onChange={e=>setOpts(p=>p.map((v,j)=>j===i?e.target.value:v))}/></label>)}<label className="profile-field"><span>Correct answer</span><select value={answer} onChange={e=>setAnswer(Number(e.target.value))}>{opts.map((o,i)=><option value={i} key={i}>{String.fromCharCode(65+i)} {o||'Option'}</option>)}</select></label><button className="outline-button" onClick={()=>{if(q.trim()&&opts.every(x=>x.trim())){setDrafts(p=>[...p,{question:q.trim(),options:opts,answer}]);setQ('');setOpts(['','','','']);setAnswer(0)}else setNotice('Enter the question and all four options.')}}><Plus size={15}/> Add question</button></>}{drafts.length>0&&<div className="draft-list"><b>{drafts.length} question(s)</b>{drafts.map((d,i)=><div key={i} style={{padding:'8px 0',borderBottom:'1px solid #e5e7eb'}}>{i+1}. {d.question}<label className="profile-field"><span>Confirm correct answer</span><select value={d.answer} onChange={e=>setDrafts(p=>p.map((item,j)=>j===i?{...item,answer:Number(e.target.value)}:item))}><option value={-1}>Select answer</option>{d.options.map((o,j)=><option value={j} key={j}>{String.fromCharCode(65+j)} — {o}</option>)}</select></label><button onClick={()=>setDrafts(p=>p.filter((_,j)=>j!==i))}>Remove</button></div>)}</div>}<button className="primary-button" disabled={busy||!drafts.length} onClick={()=>void createTest()}>{busy?'Publishing…':'Publish scheduled test'}</button></div>}{notice&&<div className="notice-box">{notice}</div>}{scheduled.length===0?<p className="muted-line">No tests scheduled for this subject yet.</p>:scheduled.map(t=><article className="learner-material" key={t.id}><CalendarClock/><div style={{flex:1}}><strong>{t.title}</strong><small>{new Date(t.starts_at).toLocaleString()} · {t.duration_minutes} min · {t.total_marks} marks</small><small>{t.started?'Available now':'Test starts at '+new Date(t.starts_at).toLocaleString()}</small></div><button className="primary-button" disabled={!t.started||attempted.includes(t.id)||busy} onClick={()=>void startTest(t)}>{attempted.includes(t.id)?'Attempt used':t.started?'Start test':'Not started'}</button></article>)}</section>
}
