import { useEffect, useState } from 'react'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import * as pdfjsLib from 'pdfjs-dist'
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, ClipboardList,
  GraduationCap, Home, Menu, NotebookPen, Search, Settings2, Sparkles, UserRound,
  X, Zap, BookMarked, Brain, Calculator, Globe2, Languages, Landmark, Train,
  BadgeCheck, Target, LockKeyhole, LogIn, LogOut, ShieldCheck, Upload, FileText, Video, Plus, Trash2, ScanText, Info, LoaderCircle, Eye,
} from 'lucide-react'

type Exam = { id: string; name: string; subtitle: string; short: string; color: string; tint: string; icon: string }
type Resource = { id: string; title: string; subtitle: string; description: string; color: string; tint: string; icon: typeof GraduationCap }
type Subject = { name: string; description: string; icon: typeof BookOpen }
type Page = 'home' | 'exams' | 'options' | 'subjects' | 'profile' | 'login' | 'admin' | 'about'

type QuestionDraft = { question: string; options: [string, string, string, string]; answer: number; explanation: string }
type ContentRow = { id: string; title: string; exam: string; subject: string; type: string; file_url: string; created_at?: string }

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const exams: Exam[] = [
  { id: 'tnpsc', name: 'TNPSC', subtitle: 'Tamil Nadu Public Service Commission', short: 'Tamil Nadu government exams', color: '#2563eb', tint: '#eaf1ff', icon: 'தமிழ்' },
  { id: 'rrb', name: 'RRB', subtitle: 'Railway Recruitment Board', short: 'Railway recruitment exams', color: '#0f8b72', tint: '#e4f7f1', icon: 'RR' },
  { id: 'ssc', name: 'SSC', subtitle: 'Staff Selection Commission', short: 'Central government exams', color: '#8b5cf6', tint: '#f0eaff', icon: 'SC' },
]

const resources: Resource[] = [
  { id: 'teaching', title: 'Teaching', subtitle: 'Learn concepts step by step', description: 'Understand each subject through simple, structured lessons.', color: '#2563eb', tint: '#eaf1ff', icon: GraduationCap },
  { id: 'notes', title: 'Notes', subtitle: 'Revise anytime, anywhere', description: 'Choose a subject to find concise revision notes.', color: '#0f8b72', tint: '#e4f7f1', icon: NotebookPen },
  { id: 'quiz', title: 'Quiz', subtitle: 'Practice and improve daily', description: 'Choose a subject and prepare with topic-based questions.', color: '#d97706', tint: '#fff2dc', icon: Zap },
  { id: 'test', title: 'Test', subtitle: 'Check your preparation', description: 'Choose a subject to practise with exam-style tests.', color: '#8b5cf6', tint: '#f0eaff', icon: ClipboardList },
]

const subjects: Record<string, Subject[]> = {
  tnpsc: [
    { name: 'General Tamil', description: 'Grammar, literature and Tamil language skills', icon: Languages },
    { name: 'General English', description: 'Grammar, vocabulary and comprehension', icon: BookOpen },
    { name: 'General Studies', description: 'History, polity, geography, economy and science', icon: Globe2 },
    { name: 'Aptitude & Mental Ability', description: 'Numerical ability, reasoning and problem solving', icon: Brain },
    { name: 'Current Affairs', description: 'Important national, international and Tamil Nadu events', icon: Landmark },
  ],
  rrb: [
    { name: 'Mathematics', description: 'Arithmetic, algebra, geometry and mensuration', icon: Calculator },
    { name: 'General Intelligence & Reasoning', description: 'Analytical, logical and verbal reasoning', icon: Brain },
    { name: 'General Science', description: 'Physics, chemistry and life science basics', icon: Sparkles },
    { name: 'General Awareness & Current Affairs', description: 'General knowledge and recent events', icon: Globe2 },
  ],
  ssc: [
    { name: 'General Intelligence & Reasoning', description: 'Verbal and non-verbal reasoning practice', icon: Brain },
    { name: 'General Awareness', description: 'History, geography, polity, science and current affairs', icon: Globe2 },
    { name: 'Quantitative Aptitude', description: 'Arithmetic, algebra, geometry and data interpretation', icon: Calculator },
    { name: 'English Comprehension', description: 'Grammar, vocabulary and reading comprehension', icon: Languages },
    { name: 'Computer Knowledge', description: 'Computer fundamentals and digital awareness', icon: Settings2 },
  ],
}

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [activeResource, setActiveResource] = useState<Resource | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileName, setProfileName] = useState('Guest Learner')
  const [profileGoal, setProfileGoal] = useState('Prepare consistently')
  const [subjectSearch, setSubjectSearch] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [notice, setNotice] = useState('')
  const [adminTab, setAdminTab] = useState<'training' | 'notes' | 'quiz' | 'content'>('training')
  const [uploadExam, setUploadExam] = useState('TNPSC')
  const [uploadSubject, setUploadSubject] = useState('General Studies')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [contentRows, setContentRows] = useState<ContentRow[]>([])
  const [draft, setDraft] = useState<QuestionDraft>({ question: '', options: ['', '', '', ''], answer: 0, explanation: '' })
  const [manualQuestions, setManualQuestions] = useState<QuestionDraft[]>([])
  const [scannedQuestions, setScannedQuestions] = useState<QuestionDraft[]>([])
  const [scanBusy, setScanBusy] = useState(false)
  const [quizMode, setQuizMode] = useState<'scan' | 'manual'>('scan')
  const [quizContentMode, setQuizContentMode] = useState<'quiz' | 'test'>('quiz')
  const [learningContent, setLearningContent] = useState<ContentRow[]>([])
  const [learnerQuestions, setLearnerQuestions] = useState<Array<{id:string;question:string;options:string[];correct_option:number;explanation:string}>>([])
  const [learnerAnswers, setLearnerAnswers] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function loadRoleAndContent() {
      if (!supabase || !user) { setIsAdmin(false); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      const admin = data?.role === 'admin'
      setIsAdmin(admin)
      if (admin) {
        const { data: rows } = await supabase.from('ltl_content').select('*').order('created_at', { ascending: false }).limit(100)
        setContentRows((rows ?? []) as ContentRow[])
      }
    }
    void loadRoleAndContent()
  }, [user, page])

  function goHome() {
    setPage('home'); setSelectedExam(null); setActiveResource(null); setSelectedSubject(null); setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function openExams() { setPage('exams'); setSelectedExam(null); setActiveResource(null); setSelectedSubject(null); setMenuOpen(false); window.scrollTo(0, 0) }
  function chooseExam(exam: Exam) { setSelectedExam(exam); setActiveResource(null); setSelectedSubject(null); setPage('options'); window.scrollTo(0, 0) }
  function chooseResource(resource: Resource) { setActiveResource(resource); setSelectedSubject(null); setSubjectSearch(''); setPage('subjects'); window.scrollTo(0, 0) }
  function goBack() {
    if (page === 'subjects') setPage('options')
    else if (page === 'options') setPage('exams')
    else if (page === 'exams' || page === 'profile' || page === 'about' || page === 'login' || page === 'admin') setPage('home')
    window.scrollTo(0, 0)
  }
  async function handleAuth() {
    if (!supabase) { setNotice('Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file and Vercel settings.'); return }
    setAuthLoading(true); setNotice('')
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { full_name: authName } } })
        if (error) throw error
        setNotice('Account created. If email confirmation is enabled, verify your email before signing in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        if (error) throw error
        setNotice('Signed in successfully.')
        setPage('profile')
      }
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Authentication failed.') }
    finally { setAuthLoading(false) }
  }

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
    setIsAdmin(false); setPage('home'); setNotice('Signed out.')
  }

  async function uploadContent(kind: 'video' | 'note') {
    if (!supabase || !user || !isAdmin) { setNotice('Only a signed-in admin can upload content. Configure Supabase and grant your account admin role first.'); return }
    if (!uploadFile || !uploadTitle.trim()) { setNotice('Enter a title and choose a file first.'); return }
    if (kind === 'video' && !uploadFile.type.startsWith('video/')) { setNotice('Please choose a video file.'); return }
    if (kind === 'note' && uploadFile.type !== 'application/pdf') { setNotice('Please choose a PDF file.'); return }
    setUploading(true); setNotice('')
    try {
      const bucket = kind === 'video' ? 'ltl-videos' : 'ltl-notes'
      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const path = `${user.id}/${Date.now()}-${safeName}`
      const { error: storageError } = await supabase.storage.from(bucket).upload(path, uploadFile, { upsert: false, contentType: uploadFile.type })
      if (storageError) throw storageError
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
      const { error: rowError } = await supabase.from('ltl_content').insert({ title: uploadTitle.trim(), exam: uploadExam, subject: uploadSubject, type: kind, file_url: urlData.publicUrl, storage_path: path, created_by: user.id })
      if (rowError) throw rowError
      setNotice(`${kind === 'video' ? 'Training video' : 'Notes PDF'} uploaded successfully.`); setUploadTitle(''); setUploadFile(null)
      const { data: rows } = await supabase.from('ltl_content').select('*').order('created_at', { ascending: false }).limit(100)
      setContentRows((rows ?? []) as ContentRow[])
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Upload failed. Check your Supabase buckets and policies.') }
    finally { setUploading(false) }
  }

  async function scanPdf(file: File) {
    setScanBusy(true); setNotice('')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
      let allText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        allText += content.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n'
      }
      const parsed = parseQuestions(allText)
      setScannedQuestions(parsed)
      setNotice(parsed.length ? `Found ${parsed.length} possible questions. Review them and correct anything the scanner missed before publishing.` : 'No selectable text questions found. This scanner works with text-based PDFs; scanned image PDFs need OCR, so try a searchable PDF or type questions manually.')
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not read this PDF.') }
    finally { setScanBusy(false) }
  }

  function parseQuestions(text: string): QuestionDraft[] {
    const normalized = text.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n')
    const chunks = normalized.split(/(?=(?:^|\s)(?:Q(?:uestion)?\s*)?\d{1,3}[.)、:-]\s*)/i).map(s => s.trim()).filter(Boolean)
    const result: QuestionDraft[] = []
    for (const chunk of chunks) {
      const cleaned = chunk.replace(/^(?:Q(?:uestion)?\s*)?\d{1,3}[.)、:-]\s*/i, '').trim()
      const optionMatches = [...cleaned.matchAll(/(?:^|\s)(?:\(([A-D])\)|([A-D])[.)])\s*/gi)]
      if (optionMatches.length < 4) continue
      const qText = cleaned.slice(0, optionMatches[0].index).trim()
      const opts: string[] = []
      for (let i = 0; i < 4; i++) {
        const start = (optionMatches[i].index ?? 0) + optionMatches[i][0].length
        const end = i < 3 ? (optionMatches[i + 1].index ?? cleaned.length) : cleaned.length
        opts.push(cleaned.slice(start, end).replace(/\s*(?:Answer|Ans|Correct answer|Explanation)\s*[:=-].*$/i, '').trim())
      }
      if (qText && opts.every(Boolean)) result.push({ question: qText, options: opts as [string, string, string, string], answer: 0, explanation: '' })
    }
    return result
  }

  async function publishQuestions(questions: QuestionDraft[]) {
    if (!supabase || !user || !isAdmin) { setNotice('Only an authenticated admin can publish questions.'); return }
    const valid = questions.filter(q => q.question.trim() && q.options.every(o => o.trim()))
    if (!valid.length) { setNotice('Add at least one complete question with four options.'); return }
    setUploading(true)
    try {
      const { error } = await supabase.from('ltl_questions').insert(valid.map(q => ({ exam: uploadExam, subject: uploadSubject, mode: quizContentMode, question: q.question.trim(), options: q.options, correct_option: q.answer, explanation: q.explanation, created_by: user.id })))
      if (error) throw error
      setNotice(`${valid.length} questions published. They are available to signed-in users through the quiz question table.`)
      setManualQuestions([]); setScannedQuestions([]); setDraft({ question: '', options: ['', '', '', ''], answer: 0, explanation: '' })
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not publish questions. Check the SQL setup.') }
    finally { setUploading(false) }
  }

  useEffect(() => {
    async function loadLearningMaterials() {
      setLearningContent([]); setLearnerQuestions([]); setLearnerAnswers({})
      if (!supabase || !selectedExam || !selectedSubject || !activeResource) return
      if (activeResource.id === 'teaching' || activeResource.id === 'notes') {
        const type = activeResource.id === 'teaching' ? 'video' : 'note'
        const { data } = await supabase.from('ltl_content').select('*').eq('exam', selectedExam.name).eq('subject', selectedSubject).eq('type', type).order('created_at', { ascending: false })
        setLearningContent((data ?? []) as ContentRow[])
      } else if (user) {
        const { data } = await supabase.from('ltl_questions').select('id,question,options,correct_option,explanation').eq('exam', selectedExam.name).eq('subject', selectedSubject).eq('mode', activeResource.id).order('created_at', { ascending: true })
        setLearnerQuestions((data ?? []) as Array<{id:string;question:string;options:string[];correct_option:number;explanation:string}>)
      }
    }
    void loadLearningMaterials()
  }, [selectedExam, selectedSubject, activeResource, user])

  const filteredSubjects = selectedExam ? (subjects[selectedExam.id] || []).filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase())) : []

  return <div className="app-shell">
    <header className="topbar">
      <div className="nav-inner">
        <button className="brand" onClick={goHome} aria-label="LTL home"><span className="brand-mark"><BookOpen size={21} strokeWidth={2.4} /></span><span className="brand-copy"><strong>LTL<span>.</span></strong><small>LIVE TO LEARN</small></span></button>
        <nav className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`} aria-label="Main navigation">
          <button className={`nav-link ${page === 'home' ? 'active' : ''}`} onClick={goHome}>Home</button>
          <button className={`nav-link ${page !== 'home' && page !== 'profile' ? 'active' : ''}`} onClick={openExams}>Explore exams</button>
          <button className={`nav-link ${page === 'about' ? 'active' : ''}`} onClick={() => { setPage('about'); setMenuOpen(false); window.scrollTo(0, 0) }}>About LTL</button>
          <button className={`nav-link ${page === 'admin' ? 'active' : ''}`} onClick={() => { setPage(isAdmin ? 'admin' : 'login'); setMenuOpen(false); window.scrollTo(0, 0) }}>{isAdmin ? 'Admin panel' : 'Sign in'}</button>
        </nav>
        <div className="nav-right"><button className="profile-button" onClick={() => { setPage(user ? 'profile' : 'login'); setMenuOpen(false); window.scrollTo(0, 0) }}><span className="profile-avatar"><UserRound size={17} /></span><span>{user ? (user.email?.split('@')[0] || 'Profile') : 'Login'}</span></button><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
      </div>
    </header>

    {page === 'home' && <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><Sparkles size={14} /> YOUR GOALS, YOUR PACE</div><h1>One small step.<br /><span>A bigger future.</span></h1><p className="hero-description">Your exam journey doesn't have to feel overwhelming. Choose your path, learn at your pace, and keep moving forward.</p><button className="primary-button" onClick={openExams}>Find your exam <ArrowRight size={17} /></button><div className="hero-footnote"><span className="footnote-icon"><CheckCircle2 size={16} /></span>Simple learning. Steady progress.</div></div>
        <div className="hero-art" aria-label="Illustration of a student learning"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="float-card note-float"><span className="mini-icon blue"><BookOpen size={17} /></span><span><strong>Learn something new</strong><small>One topic at a time</small></span></div><div className="study-card"><div className="study-card-top"><div className="study-avatar"><GraduationCap size={28} /></div><div><strong>Your journey</strong><span>Starts with a choice</span></div><span className="sparkle-dot">✦</span></div><div className="study-lines"><span className="line line-wide" /><span className="line line-short" /></div><div className="study-progress"><div className="progress-head"><span>Keep showing up</span><b>01 / 03</b></div><div className="progress-track"><span /></div></div><div className="study-checks"><span><CheckCircle2 size={15} /> Learn</span><span><span className="empty-check" /> Practice</span><span><span className="empty-check" /> Grow</span></div></div><div className="float-card streak-float"><span className="streak-icon">✦</span><span><strong>Progress, not pressure</strong><small>Every step counts</small></span></div><div className="art-sun" /></div>
      </section>
      <section className="home-callout"><div className="callout-icon"><Target size={23} /></div><div><span className="eyebrow section-eyebrow">YOUR NEXT CHAPTER</span><h2>Which exam are you preparing for?</h2><p>Pick your exam first. We'll guide you to the right subjects and learning tools.</p></div><button className="primary-button" onClick={openExams}>Explore exams <ArrowRight size={17} /></button></section>
      <section className="how-section" id="how-it-works"><div className="how-intro"><span className="eyebrow section-eyebrow">A SIMPLE WAY FORWARD</span><h2>Learn at your pace.<br /><span>Grow with every step.</span></h2></div><div className="how-steps"><div className="how-step"><span className="step-number">01</span><div><strong>Choose your exam</strong><p>Start with the path that matches your goal.</p></div></div><div className="how-step"><span className="step-number">02</span><div><strong>Pick your learning mode</strong><p>Teaching, notes, quizzes, or tests — you choose.</p></div></div><div className="how-step"><span className="step-number">03</span><div><strong>Choose a subject</strong><p>Focus on one subject and build consistency.</p></div></div></div></section>
    </main>}

    {page === 'exams' && <main className="inner-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Back to home</button><div className="page-title-block"><span className="eyebrow section-eyebrow">STEP 01 · PICK YOUR PATH</span><h1>Find your exam</h1><p>Choose the exam you're preparing for. Your learning options will be tailored to that exam.</p></div><div className="exam-grid phase-grid">{exams.map((exam, index) => <button key={exam.id} className="exam-card" onClick={() => chooseExam(exam)} style={{ '--exam-color': exam.color, '--exam-tint': exam.tint } as React.CSSProperties}><div className="exam-card-top"><span className="exam-symbol">{exam.icon}</span><span className="card-arrow"><ArrowRight size={17} /></span></div><div className="exam-card-body"><span className="exam-index">0{index + 1} / EXAM TRACK</span><h3>{exam.name}</h3><p>{exam.short}</p><span className="exam-full-name">{exam.subtitle}</span></div><div className="card-bottom-line" /></button>)}</div></main>}

    {page === 'options' && selectedExam && <main className="inner-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> All exams</button><div className="page-title-block"><span className="eyebrow section-eyebrow">STEP 02 · {selectedExam.name.toUpperCase()}</span><h1>How would you like to learn?</h1><p>Choose a learning mode. Next, you'll pick a subject for {selectedExam.name}.</p><div className="current-exam-pill" style={{ background: selectedExam.tint, color: selectedExam.color }}><CheckCircle2 size={15} /> {selectedExam.name} selected</div></div><div className="resource-grid phase-resource-grid">{resources.map((resource, index) => { const Icon = resource.icon; return <button key={resource.id} className="resource-card" onClick={() => chooseResource(resource)} style={{ '--resource-color': resource.color, '--resource-tint': resource.tint } as React.CSSProperties}><span className="resource-icon"><Icon size={22} /></span><span className="resource-number">0{index + 1}</span><strong>{resource.title}</strong><span className="resource-subtitle">{resource.subtitle}</span><span className="resource-link">Choose {resource.title.toLowerCase()} <ArrowRight size={14} /></span></button> })}</div></main>}

    {page === 'subjects' && selectedExam && activeResource && <main className="inner-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Learning options</button><div className="page-title-block"><span className="eyebrow section-eyebrow">STEP 03 · CHOOSE A SUBJECT</span><h1>{selectedExam.name} {activeResource.title}</h1><p>{activeResource.description} Select a subject below to continue.</p><div className="selection-pills"><span style={{ background: selectedExam.tint, color: selectedExam.color }}>{selectedExam.name}</span><span style={{ background: activeResource.tint, color: activeResource.color }}>{activeResource.title}</span></div></div><div className="subject-toolbar"><div className="subject-count"><BookMarked size={18} /><span><strong>{filteredSubjects.length} subjects</strong><small>Available for {selectedExam.name}</small></span></div><label className="subject-search"><Search size={17} /><input value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} placeholder="Search subjects" aria-label="Search subjects" /></label></div><div className="subject-grid">{filteredSubjects.map((subject, index) => { const Icon = subject.icon; const active = selectedSubject === subject.name; return <button key={subject.name} className={`subject-card ${active ? 'subject-card-active' : ''}`} onClick={() => setSelectedSubject(subject.name)} aria-pressed={active}><span className="subject-card-icon"><Icon size={21} /></span><span className="subject-card-content"><small>SUBJECT {String(index + 1).padStart(2, '0')}</small><strong>{subject.name}</strong><span>{subject.description}</span></span><span className="subject-card-action">{active ? <BadgeCheck size={20} /> : <ChevronRight size={20} />}</span></button> })}</div>{filteredSubjects.length === 0 && <div className="empty-subjects">No subjects match “{subjectSearch}”. Try another search.</div>}{selectedSubject && <><div className="subject-confirmation"><span className="confirmation-icon"><CheckCircle2 size={22} /></span><div><strong>{selectedSubject} selected</strong><p>Available {activeResource.title.toLowerCase()} content for {selectedExam.name} appears below.</p></div><button className="text-button" onClick={() => setSelectedSubject(null)}>Change</button></div>{(activeResource.id==='teaching'||activeResource.id==='notes')&&<div className="learner-materials"><h2>{activeResource.id==='teaching'?'Training videos':'PDF notes'}</h2>{learningContent.length===0?<p className="muted-line">No materials published for this subject yet.</p>:learningContent.map(item=><article className="learner-material" key={item.id}>{item.type==='video'?<Video size={21}/>:<FileText size={21}/>}<div><strong>{item.title}</strong><small>{item.exam} · {item.subject}</small></div>{item.type==='video'?<a className="primary-button small-action" href={item.file_url} target="_blank" rel="noreferrer">Watch <ArrowRight size={14}/></a>:<a className="primary-button small-action" href={item.file_url} target="_blank" rel="noreferrer">Open PDF <ArrowRight size={14}/></a>}</article>)}</div>}{(activeResource.id==='quiz'||activeResource.id==='test')&&<div className="learner-materials"><h2>{activeResource.title} questions</h2>{!user?<div className="notice-box">Please <button className="inline-link" onClick={()=>setPage('login')}>sign in</button> to access questions.</div>:learnerQuestions.length===0?<p className="muted-line">No questions published for this subject yet.</p>:learnerQuestions.map((q,i)=><article className="learner-question" key={q.id}><strong>{i+1}. {q.question}</strong><div className="learner-options">{q.options.map((option,j)=><button key={j} className={learnerAnswers[q.id]===j?'chosen':''} onClick={()=>setLearnerAnswers(prev=>({...prev,[q.id]:j}))}>{String.fromCharCode(65+j)}. {option}</button>)}</div>{learnerAnswers[q.id]!==undefined&&<p className={learnerAnswers[q.id]===q.correct_option?'answer-correct':'answer-wrong'}>{learnerAnswers[q.id]===q.correct_option?'Correct answer!':'Not quite. Correct answer: '+String.fromCharCode(65+q.correct_option)}{q.explanation?' — '+q.explanation:''}</p>}</article>)}</div>}</>}</main>}

    {page === 'login' && <main className="inner-page auth-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Back</button><div className="auth-card"><div className="auth-mark"><LockKeyhole size={26} /></div><span className="eyebrow section-eyebrow">YOUR LEARNING SPACE</span><h1>{authMode === 'signin' ? 'Welcome back' : 'Create your account'}</h1><p>Sign in to access your LTL learning space. Admin tools are available only to accounts assigned the admin role in Supabase.</p>{authMode === 'signup' && <label className="profile-field"><span>Full name</span><input value={authName} onChange={e => setAuthName(e.target.value)} autoComplete="name" placeholder="Your full name" /></label>}<label className="profile-field"><span>Email address</span><input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" /></label><label className="profile-field"><span>Password</span><input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} minLength={6} placeholder="At least 6 characters" /></label><button className="primary-button profile-save" disabled={authLoading} onClick={() => void handleAuth()}>{authLoading ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}{authMode === 'signin' ? 'Sign in' : 'Create account'}</button><button className="text-button auth-toggle" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setNotice('') }}>{authMode === 'signin' ? 'New to LTL? Create an account' : 'Already registered? Sign in'}</button>{!supabase && <p className="setup-warning">Supabase setup required: add your project URL and anon key to the environment variables. See <code>.env.example</code> and <code>supabase-setup.sql</code>.</p>}{notice && <div className="notice-box">{notice}</div>}</div></main>}

    {page === 'about' && <main className="inner-page about-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Back</button><div className="about-hero"><div className="about-icon"><BookOpen size={30} /></div><span className="eyebrow section-eyebrow">ABOUT US</span><h1>Live To Learn</h1><p>LTL is a learning platform designed to help competitive-exam aspirants prepare with more clarity and confidence. Choose an exam, explore the relevant subjects, learn through training videos, revise with PDF notes, and practise with quizzes and tests in one organised place.</p></div><div className="about-feature-grid"><article><GraduationCap size={23}/><h3>Learn</h3><p>Structured training resources for your chosen exam and subject.</p></article><article><FileText size={23}/><h3>Revise</h3><p>PDF notes organised by exam and subject for focused revision.</p></article><article><ClipboardList size={23}/><h3>Practise</h3><p>Quiz and test questions with four-option practice formats.</p></article><article><Target size={23}/><h3>Prepare</h3><p>A simple, exam-focused learning flow for TNPSC, RRB and SSC aspirants.</p></article></div><div className="people-card"><span className="eyebrow section-eyebrow">LEADERSHIP</span><h2>Founder &amp; CEO</h2><p className="person-name">Mr.S.Sarathkumar.B.A,DME.,</p><div className="person-divider"/><h2>Developer</h2><p className="person-name">Mr.M.Ajithkumar.B.E.</p></div></main>}

    {page === 'admin' && isAdmin && <main className="inner-page admin-page"><div className="admin-heading"><div><span className="eyebrow section-eyebrow">LTL CONTROL CENTRE</span><h1><ShieldCheck size={28}/> Admin panel</h1><p>Upload training videos and PDF notes, create quizzes, and manage published learning resources.</p></div><button className="outline-button" onClick={() => void handleSignOut()}><LogOut size={16}/> Sign out</button></div><div className="admin-tabs">{([{id:'training',label:'Training videos',icon:Video},{id:'notes',label:'PDF notes',icon:FileText},{id:'quiz',label:'Quiz & Test',icon:ClipboardList},{id:'content',label:'Uploaded content',icon:Eye}] as const).map(tab => {const Icon=tab.icon;return <button key={tab.id} className={adminTab===tab.id?'admin-tab active':'admin-tab'} onClick={()=>setAdminTab(tab.id)}><Icon size={17}/>{tab.label}</button>})}</div>{notice && <div className="notice-box admin-notice">{notice}</div>}<section className="admin-panel-card">{adminTab === 'training' && <><div className="panel-title"><Video size={22}/><div><h2>Upload training video</h2><p>This upload control is visible only to authenticated admins.</p></div></div><label className="profile-field"><span>Video title</span><input value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} placeholder="e.g. Indian Polity – Fundamental Rights"/></label><div className="admin-two-col"><label className="profile-field"><span>Exam</span><select value={uploadExam} onChange={e=>setUploadExam(e.target.value)}><option>TNPSC</option><option>RRB</option><option>SSC</option></select></label><label className="profile-field"><span>Subject</span><input value={uploadSubject} onChange={e=>setUploadSubject(e.target.value)} placeholder="Subject name"/></label></div><label className="file-drop"><Video size={25}/><strong>{uploadFile?.name || 'Choose a video file'}</strong><span>MP4, WebM or other supported video format</span><input type="file" accept="video/*" onChange={e=>setUploadFile(e.target.files?.[0]??null)}/></label><button className="primary-button" disabled={uploading} onClick={()=>void uploadContent('video')}>{uploading?<LoaderCircle className="spin" size={17}/>:<Upload size={17}/>} Upload training video</button></>}{adminTab === 'notes' && <><div className="panel-title"><FileText size={22}/><div><h2>Upload PDF notes</h2><p>Upload subject-wise revision notes for learners.</p></div></div><label className="profile-field"><span>Notes title</span><input value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} placeholder="e.g. Indian Constitution – Quick Notes"/></label><div className="admin-two-col"><label className="profile-field"><span>Exam</span><select value={uploadExam} onChange={e=>setUploadExam(e.target.value)}><option>TNPSC</option><option>RRB</option><option>SSC</option></select></label><label className="profile-field"><span>Subject</span><input value={uploadSubject} onChange={e=>setUploadSubject(e.target.value)} placeholder="Subject name"/></label></div><label className="file-drop"><FileText size={25}/><strong>{uploadFile?.name || 'Choose a PDF file'}</strong><span>PDF documents only</span><input type="file" accept="application/pdf,.pdf" onChange={e=>setUploadFile(e.target.files?.[0]??null)}/></label><button className="primary-button" disabled={uploading} onClick={()=>void uploadContent('note')}>{uploading?<LoaderCircle className="spin" size={17}/>:<Upload size={17}/>} Upload PDF notes</button></>}{adminTab === 'quiz' && <><div className="panel-title"><ClipboardList size={22}/><div><h2>Quiz &amp; Test question builder</h2><p>Choose automatic PDF scanning or enter questions manually.</p></div></div><div className="admin-two-col"><label className="profile-field"><span>Exam</span><select value={uploadExam} onChange={e=>setUploadExam(e.target.value)}><option>TNPSC</option><option>RRB</option><option>SSC</option></select></label><label className="profile-field"><span>Subject</span><input value={uploadSubject} onChange={e=>setUploadSubject(e.target.value)}/></label></div><label className="profile-field"><span>Publish as</span><select value={quizContentMode} onChange={e=>setQuizContentMode(e.target.value as 'quiz'|'test')}><option value="quiz">Quiz</option><option value="test">Test</option></select></label><div className="quiz-mode-switch"><button className={quizMode==='scan'?'selected':''} onClick={()=>setQuizMode('scan')}><ScanText size={18}/> Automatic PDF scanner</button><button className={quizMode==='manual'?'selected':''} onClick={()=>setQuizMode('manual')}><NotebookPen size={18}/> Manual question entry</button></div>{quizMode==='scan'?<><label className="file-drop"><ScanText size={25}/><strong>Choose question PDF</strong><span>Best for selectable text PDFs containing A/B/C/D or 1/2/3/4 options</span><input type="file" accept="application/pdf,.pdf" onChange={e=>{const f=e.target.files?.[0];if(f)void scanPdf(f)}}/></label>{scanBusy&&<p className="muted-line"><LoaderCircle className="spin" size={16}/> Scanning PDF text…</p>}{scannedQuestions.length>0&&<><p className="scanner-hint">Review detected questions and select the correct answer before publishing. The scanner cannot reliably infer the answer key.</p>{scannedQuestions.map((q,i)=><div className="question-editor" key={`scan-${i}`}><div className="question-editor-head"><strong>Question {i+1}</strong><button className="icon-button" onClick={()=>setScannedQuestions(prev=>prev.filter((_,idx)=>idx!==i))} aria-label="Remove question"><Trash2 size={16}/></button></div><textarea value={q.question} onChange={e=>setScannedQuestions(prev=>prev.map((item,idx)=>idx===i?{...item,question:e.target.value}:item))}/><div className="option-editor-grid">{q.options.map((o,j)=><label key={j}><span>Option {String.fromCharCode(65+j)}</span><input value={o} onChange={e=>setScannedQuestions(prev=>prev.map((item,idx)=>idx===i?{...item,options:item.options.map((v,k)=>k===j?e.target.value:v) as [string,string,string,string]}:item))}/></label>)}</div><label className="profile-field"><span>Correct answer</span><select value={q.answer} onChange={e=>setScannedQuestions(prev=>prev.map((item,idx)=>idx===i?{...item,answer:Number(e.target.value)}:item))}>{q.options.map((o,j)=><option value={j} key={j}>{String.fromCharCode(65+j)} — {o||`Option ${j+1}`}</option>)}</select></label></div>)}<button className="primary-button" disabled={uploading} onClick={()=>void publishQuestions(scannedQuestions)}>{uploading?<LoaderCircle className="spin" size={17}/>:<Upload size={17}/>} Publish {scannedQuestions.length} questions</button></>}</>:<><div className="question-editor"><div className="question-editor-head"><strong>Question template</strong><span>4 options</span></div><label className="profile-field"><span>Question</span><textarea value={draft.question} onChange={e=>setDraft({...draft,question:e.target.value})} placeholder="Type your question here…"/></label><div className="option-editor-grid">{draft.options.map((o,i)=><label key={i}><span>Option {String.fromCharCode(65+i)}</span><input value={o} onChange={e=>setDraft({...draft,options:draft.options.map((v,j)=>j===i?e.target.value:v) as [string,string,string,string]})} placeholder={`Enter option ${String.fromCharCode(65+i)}`}/></label>)}</div><label className="profile-field"><span>Correct answer</span><select value={draft.answer} onChange={e=>setDraft({...draft,answer:Number(e.target.value)})}>{draft.options.map((o,i)=><option key={i} value={i}>{String.fromCharCode(65+i)} — {o||`Option ${i+1}`}</option>)}</select></label><label className="profile-field"><span>Explanation (optional)</span><textarea value={draft.explanation} onChange={e=>setDraft({...draft,explanation:e.target.value})} placeholder="Explain why this is correct…"/></label><button className="outline-button" onClick={()=>{if(draft.question.trim()&&draft.options.every(o=>o.trim())){setManualQuestions(prev=>[...prev,draft]);setDraft({question:'',options:['','','',''],answer:0,explanation:''});setNotice('Question added to the draft list.')}}}><Plus size={16}/> Add question to list</button></div>{manualQuestions.length>0&&<div className="draft-list"><strong>{manualQuestions.length} question(s) ready</strong>{manualQuestions.map((q,i)=><div key={i}><span>{i+1}. {q.question}</span><button className="icon-button" onClick={()=>setManualQuestions(prev=>prev.filter((_,idx)=>idx!==i))}><Trash2 size={15}/></button></div>)}<button className="primary-button" disabled={uploading} onClick={()=>void publishQuestions(manualQuestions)}>{uploading?<LoaderCircle className="spin" size={17}/>:<Upload size={17}/>} Publish questions</button></div>}</>}</>}</section>{adminTab==='content'&&<section className="admin-panel-card"><div className="panel-title"><BookMarked size={22}/><div><h2>Uploaded content</h2><p>{contentRows.length} recent items in LTL content library.</p></div></div>{contentRows.length===0?<p className="muted-line">No uploaded files yet.</p>:<div className="content-list">{contentRows.map(row=><div className="content-row" key={row.id}><span className="content-row-icon">{row.type==='video'?<Video size={19}/>:<FileText size={19}/>}</span><span className="content-row-copy"><strong>{row.title}</strong><small>{row.exam} · {row.subject} · {row.type}</small></span><a href={row.file_url} target="_blank" rel="noreferrer" className="text-button">Open <ArrowRight size={14}/></a></div>)}</div>}</section>}<p className="admin-footnote"><Info size={15}/> Admin access is controlled by the Supabase <code>profiles.role</code> field and database policies, not by hiding a button alone.</p></main>}

    {page === 'admin' && !isAdmin && <main className="inner-page"><div className="notice-box">Admin access required. Sign in with an account assigned the admin role in Supabase.</div><button className="primary-button" onClick={()=>setPage('login')}>Go to sign in <ArrowRight size={17}/></button></main>}

    {page === 'profile' && <main className="inner-page profile-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Back</button><div className="profile-header-card"><div className="profile-large-avatar"><UserRound size={34} /></div><span className="eyebrow section-eyebrow">YOUR LEARNING SPACE</span><h1>My profile</h1><p>Manage your LTL learning space and account.</p><span className="guest-badge"><CheckCircle2 size={14} /> {user ? `Signed in · ${user.email}` : 'Guest profile'}</span>{user && <button className="outline-button" onClick={()=>void handleSignOut()}><LogOut size={16}/> Sign out</button>}</div><div className="profile-form-card"><h2>Profile details</h2><p>Use the sign-in page to keep your account connected across sessions.</p><label className="profile-field"><span>Display name</span><input value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={40} placeholder="Enter your name" /></label><label className="profile-field"><span>Learning goal</span><select value={profileGoal} onChange={e => setProfileGoal(e.target.value)}><option>Prepare consistently</option><option>Improve my weak subjects</option><option>Revise before the exam</option><option>Practise with quizzes and tests</option></select></label><div className="profile-summary"><div><Target size={18} /><span><small>Current exam</small><strong>{selectedExam?.name ?? 'Not selected yet'}</strong></span></div><div><BookOpen size={18} /><span><small>Learning goal</small><strong>{profileGoal}</strong></span></div></div><button className="primary-button profile-save" onClick={() => { if (!user) setPage('login'); else { setPage('home'); window.scrollTo(0, 0) } }}>Save and return home <ArrowRight size={17} /></button></div></main>}

    <footer className="footer" id="page-help"><button className="brand footer-brand" onClick={goHome} aria-label="LTL home"><span className="brand-mark"><BookOpen size={19} strokeWidth={2.4} /></span><span className="brand-copy"><strong>LTL<span>.</span></strong><small>LIVE TO LEARN</small></span></button><p>Learn today. Lead tomorrow. <button className="footer-about-link" onClick={()=>setPage('about')}>About LTL</button></p><span className="copyright">© {new Date().getFullYear()} LTL · Made for learners</span></footer>
  </div>
}
