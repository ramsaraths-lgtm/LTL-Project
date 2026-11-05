import { useEffect, useState } from 'react'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import * as pdfjsLib from 'pdfjs-dist'
import ChatPage from './ChatPage'
import ChatAdmin from './ChatAdmin'
import SecurityAudit from './SecurityAudit'
import TestCenter from './TestCenter'
import AiDoubtSolver from './AiDoubtSolver'
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, ClipboardList,
  GraduationCap, Home, Menu, NotebookPen, Search, Settings2, Sparkles, UserRound,
  X, Zap, BookMarked, Brain, Calculator, Globe2, Languages, Landmark, Train,
  BadgeCheck, Target, LockKeyhole, LogIn, LogOut, ShieldCheck, Upload, FileText, Video, Plus, Trash2, ScanText, Info, LoaderCircle, Eye, Users, Bell, Bookmark, BookmarkCheck, ImagePlus, Bot, Trophy,
} from 'lucide-react'

type Exam = { id: string; name: string; subtitle: string; short: string; color: string; tint: string; icon: string }
type Resource = { id: string; title: string; subtitle: string; description: string; color: string; tint: string; icon: typeof GraduationCap }
type Subject = { name: string; description: string; icon: typeof BookOpen }
type Page = 'welcome' | 'home' | 'exams' | 'subexams' | 'options' | 'subjects' | 'profile' | 'login' | 'admin' | 'about' | 'chat' | 'help' | 'ai' | 'leaderboard' | 'mistakes'

type QuestionDraft = { question: string; options: [string, string, string, string]; answer: number; explanation: string }
type ContentRow = { id: string; title: string; exam: string; subject: string; type: string; file_url: string; storage_path?: string; created_at?: string }

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const exams: Exam[] = [
  { id: 'tnpsc', name: 'TNPSC', subtitle: 'Tamil Nadu Public Service Commission', short: 'Tamil Nadu government exams', color: '#2563eb', tint: '#eaf1ff', icon: 'தமிழ்' },
  { id: 'rrb', name: 'RRB', subtitle: 'Railway Recruitment Board', short: 'Railway recruitment exams', color: '#0f8b72', tint: '#e4f7f1', icon: 'RR' },
  { id: 'ssc', name: 'SSC', subtitle: 'Staff Selection Commission', short: 'Central government exams', color: '#8b5cf6', tint: '#f0eaff', icon: 'SC' },
  { id: 'tnusrb', name: 'TNUSRB', subtitle: 'Tamil Nadu Uniformed Services Recruitment Board', short: 'Tamil Nadu police and uniformed services recruitment', color: '#b45309', tint: '#fff4e5', icon: 'TN' },
]

const examTracks: Record<string, string[]> = {
  tnpsc: ['Group I', 'Group II', 'Group IIA', 'Group IV', 'Group VAO', 'Combined Technical Services (ITI / Diploma)', 'Combined Technical Services (Non-Interview)', 'Group I-C'],
  rrb: ['NTPC (Graduate Level)', 'NTPC (Undergraduate Level)', 'Assistant Loco Pilot (ALP)', 'Technician', 'Junior Engineer (JE)', 'Group D / Level 1', 'RPF Sub-Inspector', 'RPF Constable', 'Paramedical Categories', 'Ministerial & Isolated Categories'],
  ssc: ['Combined Graduate Level (CGL)', 'Combined Higher Secondary Level (CHSL)', 'Multi-Tasking Staff (MTS)', 'General Duty Constable (GD)', 'Central Police Organisation (CPO / SI)', 'Stenographer Grade C & D', 'Junior Engineer (JE)', 'Selection Post', 'Combined Hindi Translators (CHT)'],
  tnusrb: ['Sub-Inspector of Police (Taluk)', 'Sub-Inspector of Police (Armed Reserve)', 'Grade II Police Constable', 'Grade II Jail Warder', 'Fireman'],
}

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
  tnusrb: [
    { name: 'Tamil Language Eligibility', description: 'Tamil language, grammar and comprehension', icon: Languages },
    { name: 'General Knowledge', description: 'Indian and Tamil Nadu history, geography, polity and science', icon: Globe2 },
    { name: 'Psychology', description: 'Human behaviour, aptitude and basic psychology', icon: Brain },
    { name: 'Logical Analysis', description: 'Logical reasoning and analytical ability', icon: Brain },
    { name: 'Numerical Analysis', description: 'Arithmetic and numerical problem solving', icon: Calculator },
    { name: 'Communication Skills', description: 'Communication and interpersonal skills', icon: BookOpen },
    { name: 'Information Handling Ability', description: 'Data interpretation and information analysis', icon: Settings2 },
    { name: 'Police Administration & Duties', description: 'Police organisation, duties and public safety basics', icon: ShieldCheck },
    { name: 'Current Affairs', description: 'Tamil Nadu, national and international events', icon: Landmark },
  ],
}

function subjectsForTrack(examId: string, track: string): Subject[] {
  const base = subjects[examId] || []
  const pick = (names: string[]) => names.map(name => base.find(item => item.name === name)).filter(Boolean) as Subject[]
  const extra = (name: string, description: string, icon: typeof BookOpen): Subject => ({ name, description, icon })
  if (examId === 'tnusrb') {
    if (/Sub-Inspector/i.test(track)) return [...base.filter(item => item.name !== 'Tamil Language Eligibility'), extra('Police Administration & Duties','Police organisation, law-and-order duties and public safety',ShieldCheck), extra('Current Affairs','Tamil Nadu, national and international events',Landmark)]
    return [...base.filter(item => item.name !== 'Police Administration & Duties')]
  }
  if (examId === 'tnpsc') {
    if (/Group IV|VAO/i.test(track)) return [
      ...pick(['General Tamil','General English','General Studies','Aptitude & Mental Ability','Current Affairs']),
      extra('Village Administration & Rural Development','Village administration, local bodies and rural development',Landmark),
    ]
    if (/Group I|Group II/i.test(track)) return [
      ...pick(['General Studies','General Tamil','General English','Aptitude & Mental Ability','Current Affairs']),
      extra('Indian Economy & Development Administration','Economy, public administration and development',Landmark),
      extra('Tamil Nadu History, Culture & Heritage','Tamil Nadu history, culture and social movements',Languages),
    ]
    return [...base]
  }
  if (examId === 'rrb') {
    if (/ALP|Technician/i.test(track)) return [
      extra('Mathematics','Arithmetic and applied mathematics',Calculator),
      extra('General Intelligence & Reasoning','Analytical and logical reasoning',Brain),
      extra('Basic Science & Engineering','Basic science, electrical and mechanical fundamentals',Sparkles),
      extra('General Awareness & Current Affairs','Railway and general awareness',Globe2),
    ]
    if (/Junior Engineer/i.test(track)) return [
      extra('General Awareness','Current affairs and general knowledge',Globe2),
      extra('Physics & Chemistry','Fundamental science concepts',Sparkles),
      extra('Basics of Computers & Applications','Computer fundamentals and applications',Settings2),
      extra('Basics of Environment & Pollution Control','Environmental science and pollution control',Landmark),
      extra('Technical Subject','Discipline-specific engineering knowledge',Calculator),
    ]
    return [
      extra('Mathematics','Arithmetic, algebra and data interpretation',Calculator),
      extra('General Intelligence & Reasoning','Analytical, logical and verbal reasoning',Brain),
      extra('General Awareness & Current Affairs','National, international and railway awareness',Globe2),
      extra('General Science','Physics, chemistry and life science basics',Sparkles),
    ]
  }
  if (/Junior Engineer/i.test(track)) return [
    extra('General Intelligence & Reasoning','Verbal and non-verbal reasoning',Brain),
    extra('General Awareness','Current affairs and general knowledge',Globe2),
    extra('General Engineering','Civil, electrical or mechanical engineering discipline',Calculator),
  ]
  if (/MTS|GD Constable/i.test(track)) return [
    extra('Numerical & Mathematical Ability','Basic arithmetic and numerical skills',Calculator),
    extra('Reasoning Ability','Problem solving and logical reasoning',Brain),
    extra('General Awareness','History, geography, polity and current affairs',Globe2),
    extra('English Language','Grammar and comprehension',Languages),
  ]
  return [
    extra('General Intelligence & Reasoning','Verbal and non-verbal reasoning',Brain),
    extra('Quantitative Aptitude','Arithmetic, algebra, geometry and data interpretation',Calculator),
    extra('English Language & Comprehension','Grammar, vocabulary and reading comprehension',Languages),
    extra('General Awareness','History, geography, polity, science and current affairs',Globe2),
  ]
}

export default function App() {
  const [page, setPage] = useState<Page>('welcome')
  const [authReady, setAuthReady] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [myTestPoints, setMyTestPoints] = useState(0)
  const [leaderboardRows, setLeaderboardRows] = useState<Array<{user_id:string;full_name:string;points:number;avatar_path:string|null;rank:number}>>([])
  const [leaderboardBusy, setLeaderboardBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [cropZoom, setCropZoom] = useState(1)
  const [quizView, setQuizView] = useState<'all' | 'bookmarked'>('all')
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([])
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [selectedSubExam, setSelectedSubExam] = useState<string | null>(null)
  const [uploadSubExam, setUploadSubExam] = useState('Group I')
  const [activeResource, setActiveResource] = useState<Resource | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
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
  const [adminTab, setAdminTab] = useState<'training' | 'notes' | 'quiz' | 'content' | 'manageQuiz' | 'chatAdmin' | 'notifications' | 'security' | 'deleteContent'>('training')
  const [uploadExam, setUploadExam] = useState('TNPSC')
  const [deleteExam, setDeleteExam] = useState('TNPSC')
  const [deleteSubExam, setDeleteSubExam] = useState('Group I')
  const [deleteSubject, setDeleteSubject] = useState('General Studies')
  const [deleteCategory, setDeleteCategory] = useState<'quiz' | 'test' | 'video' | 'notes' | 'all'>('quiz')
  const [deleteBusy, setDeleteBusy] = useState(false)
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
  const [adminQuestions, setAdminQuestions] = useState<Array<{id:string;exam:string;subject:string;mode:string;question:string;options:string[];correct_option:number;explanation:string}>>([])
  const [quizSearch, setQuizSearch] = useState('')
  const [adminNotifications, setAdminNotifications] = useState<Array<{id:string;user_email:string|null;user_name:string|null;created_at:string;is_read:boolean}>>([])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { const sessionUser = data.session?.user ?? null; setUser(sessionUser); setPage(sessionUser ? 'home' : 'welcome'); setAuthReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { const sessionUser = session?.user ?? null; setUser(sessionUser); if (sessionUser) setPage(current => current === 'welcome' || current === 'login' ? 'home' : current); else setPage('welcome') })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (authReady && !user && !['welcome', 'login'].includes(page)) setPage('login')
  }, [authReady, user, page])

  useEffect(() => {
    let active = true
    async function loadSavedProfile() {
      if (!supabase || !user) { if (active) setProfileName(''); return }
      const { data, error } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      if (!active) return
      const saved = !error ? (data?.full_name || '') : ''
      const fallback = String(user.user_metadata?.full_name || '')
      setProfileName(saved || fallback || '')
    }
    void loadSavedProfile()
    return () => { active = false }
  }, [user])

  useEffect(() => {
    let active = true
    async function loadAvatar() {
      if (!supabase || !user) { setAvatarUrl(''); return }
      const path = String(user.user_metadata?.avatar_path || '')
      if (!path) { setAvatarUrl(''); return }
      const { data } = supabase.storage.from('ltl-avatars').getPublicUrl(path)
      if (active) setAvatarUrl(data?.publicUrl ? `${data.publicUrl}?v=${Date.now()}` : '')
    }
    void loadAvatar()
    return () => { active = false }
  }, [user])

  useEffect(() => {
    let active = true
    async function loadPoints() {
      if (!supabase || !user) { setMyTestPoints(0); setLeaderboardRows([]); return }
      const { data: mine } = await supabase.rpc('ltl_my_test_points')
      if (active && mine !== null && mine !== undefined) setMyTestPoints(Number(mine) || 0)
      if (page === 'leaderboard') {
        setLeaderboardBusy(true)
        const { data } = await supabase.rpc('ltl_test_leaderboard')
        if (active) setLeaderboardRows((data || []) as typeof leaderboardRows)
        if (active) setLeaderboardBusy(false)
      }
    }
    void loadPoints()
    return () => { active = false }
  }, [user, page])

  useEffect(() => {
    async function loadRoleAndContent() {
      if (!supabase || !user) { setIsAdmin(false); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      const admin = data?.role === 'admin'
      setIsAdmin(admin)
      if (admin) {
        const { data: rows } = await supabase.from('ltl_content').select('*').order('created_at', { ascending: false }).limit(100)
        setContentRows((rows ?? []) as ContentRow[])
        const { data: questionRows } = await supabase.from('ltl_questions').select('id,exam,subject,mode,question,options,correct_option,explanation').order('created_at', { ascending: false }).limit(200)
        setAdminQuestions((questionRows ?? []) as typeof adminQuestions)
        const { data: notificationRows } = await supabase.from('ltl_admin_notifications').select('id,user_email,user_name,created_at,is_read').order('created_at', { ascending: false }).limit(100)
        setAdminNotifications((notificationRows ?? []) as typeof adminNotifications)
      }
    }
    void loadRoleAndContent()
  }, [user, page])

  useEffect(() => {
    if (!supabase || !isAdmin) return
    const channel = supabase.channel('ltl-admin-new-users')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ltl_admin_notifications' }, payload => {
        const row = payload.new as typeof adminNotifications[number]
        setAdminNotifications(prev => [row, ...prev.filter(item => item.id !== row.id)].slice(0, 100))
      }).subscribe()
    return () => { void supabase?.removeChannel(channel) }
  }, [isAdmin])

  function goHome() {
    setPage('home'); setSelectedExam(null); setSelectedSubExam(null); setActiveResource(null); setSelectedSubject(null); setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function openExams() { setPage('exams'); setSelectedExam(null); setSelectedSubExam(null); setActiveResource(null); setSelectedSubject(null); setMenuOpen(false); window.scrollTo(0, 0) }
  function chooseExam(exam: Exam) { setSelectedExam(exam); setSelectedSubExam(null); setActiveResource(null); setSelectedSubject(null); setPage('subexams'); window.scrollTo(0, 0) }
  function chooseSubExam(name: string) { setSelectedSubExam(name); setPage('options'); window.scrollTo(0, 0) }
  const activeExamLabel = selectedExam && selectedSubExam ? `${selectedExam.name} / ${selectedSubExam}` : selectedExam?.name || ''
  function chooseResource(resource: Resource) { setActiveResource(resource); setSelectedSubject(null); setSubjectSearch(''); setPage('subjects'); window.scrollTo(0, 0) }
  function goBack() {
    if (page === 'subjects') setPage('options')
    else if (page === 'options') setPage('exams')
    else if (page === 'exams' || page === 'profile' || page === 'about' || page === 'help' || page === 'login' || page === 'admin' || page === 'ai' || page === 'chat' || page === 'leaderboard' || page === 'mistakes') setPage('home')
    window.scrollTo(0, 0)
  }
  async function handleAuth() {
    if (!supabase) { setNotice('Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file and Vercel settings.'); return }
    setAuthLoading(true); setNotice('')
    try {
      if (authMode === 'signup') {
        if (!authName.trim()) { setNotice('Please enter your full name.'); return }
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { full_name: authName.trim() } } })
        if (error) throw error
        setProfileName(authName.trim())
        setNotice('Account created. Your name is saved to your account. If email confirmation is enabled, verify your email before signing in.')
      } else {
        const { data: signedIn, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        if (error) throw error
        const signedUser = signedIn.user
        const { data: existingProfile } = await supabase.from('profiles').select('full_name').eq('id', signedUser.id).maybeSingle()
        const savedName = String(existingProfile?.full_name || signedUser.user_metadata?.full_name || '').trim()
        if (savedName && !existingProfile?.full_name) await supabase.from('profiles').update({ full_name: savedName }).eq('id', signedUser.id)
        setProfileName(savedName)
        setNotice('Signed in successfully.')
        setPage('profile')
      }
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Authentication failed.') }
    finally { setAuthLoading(false) }
  }

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
    setIsAdmin(false); setPage('welcome'); setNotice('Signed out.')
  }

  async function saveProfile() {
    if (!supabase || !user) { setPage('login'); return }
    const name = profileName.trim()
    if (!name) { setNotice('Please enter your display name.'); return }
    const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', user.id)
    if (error) { setNotice(`Could not save profile: ${error.message}. Run the Phase 7 SQL setup first.`); return }
    const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: name } })
    if (metadataError) { setNotice(`Name saved to profile, but account metadata update failed: ${metadataError.message}`); return }
    setNotice('Your name has been saved. It will be remembered next time you sign in.')
  }

  async function openLearningFile(item: ContentRow) {
    if (!supabase || !user) { setNotice('Please sign in to view learning materials.'); return }
    const bucket = item.type === 'video' ? 'ltl-videos' : 'ltl-notes'
    const path = item.storage_path || item.file_url
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5, { download: false })
    if (error || !data?.signedUrl) { setNotice(error?.message || 'Could not open this file.'); return }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
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
      const { error: rowError } = await supabase.from('ltl_content').insert({ title: uploadTitle.trim(), exam: `${uploadExam} / ${uploadSubExam}`, subject: uploadSubject, type: kind, file_url: path, storage_path: path, created_by: user.id })
      if (rowError) throw rowError
      setNotice(`${kind === 'video' ? 'Training video' : 'Notes PDF'} uploaded successfully.`); setUploadTitle(''); setUploadFile(null)
      const { data: rows } = await supabase.from('ltl_content').select('*').order('created_at', { ascending: false }).limit(100)
      setContentRows((rows ?? []) as ContentRow[])
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Upload failed. Check your Supabase buckets and policies.') }
    finally { setUploading(false) }
  }

  async function deleteScopedLearningContent() {
    if (!supabase || !isAdmin) { setNotice('Only an administrator can delete learning content.'); return }
    const examLabel = `${deleteExam} / ${deleteSubExam}`
    const categoryLabel = deleteCategory === 'video' ? 'training videos' : deleteCategory === 'notes' ? 'PDF notes' : deleteCategory === 'quiz' ? 'quiz questions' : deleteCategory === 'test' ? 'test questions' : 'all learning content'
    const confirmText = `Permanently delete ${categoryLabel} for ${examLabel} → ${deleteSubject}? Other exams and subjects will not be affected.`
    if (!window.confirm(confirmText)) return
    const typed = window.prompt('Type DELETE to confirm this scoped deletion:')
    if (typed !== 'DELETE') { setNotice('Deletion cancelled.'); return }
    setDeleteBusy(true); setNotice('')
    try {
      if (deleteCategory === 'video' || deleteCategory === 'notes' || deleteCategory === 'all') {
        let query = supabase.from('ltl_content').select('id,type,storage_path,file_url').eq('exam', examLabel).eq('subject', deleteSubject)
        if (deleteCategory === 'video') query = query.eq('type', 'video')
        else if (deleteCategory === 'notes') query = query.eq('type', 'note')
        const { data: rows, error: readError } = await query
        if (readError) throw readError
        const buckets: Record<string, string[]> = { 'ltl-videos': [], 'ltl-notes': [] }
        for (const row of rows || []) {
          const bucket = row.type === 'video' ? 'ltl-videos' : 'ltl-notes'
          const path = row.storage_path || row.file_url
          if (path) buckets[bucket].push(path)
        }
        for (const [bucket, paths] of Object.entries(buckets)) {
          if (paths.length) { const { error } = await supabase.storage.from(bucket).remove([...new Set(paths)]); if (error) throw error }
        }
        if (rows?.length) {
          const ids = rows.map(row => row.id)
          const { error } = await supabase.from('ltl_content').delete().in('id', ids)
          if (error) throw error
        }
      }
      if (deleteCategory === 'quiz' || deleteCategory === 'test' || deleteCategory === 'all') {
        let query = supabase.from('ltl_questions').delete().eq('exam', examLabel).eq('subject', deleteSubject)
        if (deleteCategory === 'quiz') query = query.eq('mode', 'quiz')
        else if (deleteCategory === 'test') query = query.eq('mode', 'test')
        const { error } = await query
        if (error) throw error
      }
      const [{ data: content }, { data: questions }] = await Promise.all([
        supabase.from('ltl_content').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('ltl_questions').select('id,exam,subject,mode,question,options,correct_option,explanation').order('created_at', { ascending: false }).limit(300),
      ])
      setContentRows((content || []) as ContentRow[])
      setAdminQuestions((questions || []) as typeof adminQuestions)
      setNotice(`Deleted ${categoryLabel} for ${examLabel} → ${deleteSubject}. Other exam and subject content was left unchanged.`)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Deletion failed. No further content was deleted.') }
    finally { setDeleteBusy(false) }
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
      if (qText && opts.every(Boolean)) {
        const answerMatch = cleaned.match(/(?:correct\s*answer|answer|ans\.?|key)\s*[:.\-=]\s*\(?([A-D])\)?\b/i)
        const answer = answerMatch ? answerMatch[1].toUpperCase().charCodeAt(0) - 65 : -1
        result.push({ question: qText, options: opts as [string, string, string, string], answer, explanation: '' })
      }
    }
    return result
  }

  async function publishQuestions(questions: QuestionDraft[]) {
    if (!supabase || !user || !isAdmin) { setNotice('Only an authenticated admin can publish questions.'); return }
    const valid = questions.filter(q => q.question.trim() && q.options.every(o => o.trim()) && Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3)
    if (!valid.length) { setNotice('No publishable questions. Every question must have full text, four options, and an explicitly confirmed correct answer.'); return }
    if (valid.length !== questions.length) { setNotice('Some questions are incomplete or have no confirmed correct answer. Select the correct answer for every question before publishing.'); return }
    setUploading(true)
    try {
      const { error } = await supabase.from('ltl_questions').insert(valid.map(q => ({ exam: `${uploadExam} / ${uploadSubExam}`, subject: uploadSubject, mode: quizContentMode, question: q.question.trim(), options: q.options, correct_option: q.answer, explanation: q.explanation, created_by: user.id })))
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
        const { data } = await supabase.from('ltl_content').select('*').in('exam', [selectedExam.name, activeExamLabel]).eq('subject', selectedSubject).eq('type', type).order('created_at', { ascending: false })
        setLearningContent((data ?? []) as ContentRow[])
      } else if (user && activeResource.id === 'quiz') {
        const { data } = await supabase.from('ltl_questions').select('id,question,options,correct_option,explanation').in('exam', [selectedExam.name, activeExamLabel]).eq('subject', selectedSubject).eq('mode', activeResource.id).order('created_at', { ascending: true })
        setLearnerQuestions((data ?? []) as Array<{id:string;question:string;options:string[];correct_option:number;explanation:string}>)
      }
    }
    void loadLearningMaterials()
  }, [selectedExam, selectedSubExam, selectedSubject, activeResource, user])

  useEffect(() => {
    let active = true
    async function loadBookmarks() {
      setBookmarkedIds([])
      if (!supabase || !user || !selectedExam || !selectedSubject || activeResource?.id !== 'quiz') return
      const { data, error } = await supabase.from('ltl_quiz_bookmarks').select('question_id').eq('user_id', user.id).eq('exam', activeExamLabel).eq('subject', selectedSubject)
      if (active && !error) setBookmarkedIds((data || []).map(row => row.question_id as string))
    }
    void loadBookmarks()
    return () => { active = false }
  }, [user, selectedExam, selectedSubject, activeResource])

  async function toggleBookmark(questionId: string) {
    if (!supabase || !user || !selectedExam || !selectedSubject) return
    const exists = bookmarkedIds.includes(questionId)
    if (exists) {
      const { error } = await supabase.from('ltl_quiz_bookmarks').delete().eq('user_id', user.id).eq('question_id', questionId)
      if (error) { setNotice(error.message); return }
      setBookmarkedIds(prev => prev.filter(id => id !== questionId))
    } else {
      const { error } = await supabase.from('ltl_quiz_bookmarks').insert({ user_id: user.id, question_id: questionId, exam: activeExamLabel, subject: selectedSubject })
      if (error) { setNotice(error.message); return }
      setBookmarkedIds(prev => [...prev, questionId])
    }
  }

  function selectAvatarFile(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setNotice('Choose an image file.'); return }
    if (file.size > 8 * 1024 * 1024) { setNotice('Choose an image smaller than 8 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const source = String(reader.result || '')
      const image = new Image()
      image.onload = () => { setCropSource(source); setCropZoom(1) }
      image.onerror = () => setNotice('Could not read this image. Please choose another one.')
      image.src = source
    }
    reader.readAsDataURL(file)
  }

  async function saveCroppedAvatar() {
    if (!supabase || !user || !cropSource) return
    setAvatarBusy(true)
    try {
      const image = new Image()
      image.src = cropSource
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Could not load the selected image.')) })
      const side = Math.min(image.naturalWidth, image.naturalHeight) / cropZoom
      const sx = (image.naturalWidth - side) / 2
      const sy = (image.naturalHeight - side) / 2
      const canvas = document.createElement('canvas')
      canvas.width = 512; canvas.height = 512
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Image crop is not supported in this browser.')
      context.drawImage(image, sx, sy, side, side, 0, 0, 512, 512)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not prepare the cropped image.')), 'image/jpeg', 0.88))
      const path = `${user.id}/avatar-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('ltl-avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { error: metaError } = await supabase.auth.updateUser({ data: { avatar_path: path } })
      if (metaError) throw metaError
      const { data } = supabase.storage.from('ltl-avatars').getPublicUrl(path)
      const freshUrl = `${data.publicUrl}?v=${Date.now()}`
      setAvatarUrl(freshUrl)
      await supabase.auth.refreshSession()
      setCropSource(null); setNotice('Profile picture updated successfully.')
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not upload profile picture. Check the Phase 10 avatar bucket and policies.') }
    finally { setAvatarBusy(false) }
  }

  const filteredSubjects = selectedExam ? subjectsForTrack(selectedExam.id, selectedSubExam || '').filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase())) : []

  return <div className="app-shell">
    <header className="topbar">
      <div className="nav-inner">
        <button className="brand" onClick={goHome} aria-label="LTL home"><span className="brand-mark"><BookOpen size={21} strokeWidth={2.4} /></span><span className="brand-copy"><strong>LTL<span>.</span></strong><small>LIVE TO LEARN</small></span></button>
        <nav className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`} aria-label="Main navigation">
          {user && <><button className={`nav-link ${page === 'home' ? 'active' : ''}`} onClick={goHome}>Home</button><button className={`nav-link ${page === 'exams' || page === 'subexams' || page === 'options' || page === 'subjects' ? 'active' : ''}`} onClick={openExams}>Explore exams</button><button className={`nav-link ${page === 'ai' ? 'active' : ''}`} onClick={() => { setPage('ai'); setMenuOpen(false) }}>AI Tutor</button><button className={`nav-link ${page === 'chat' ? 'active' : ''}`} onClick={() => { setPage('chat'); setMenuOpen(false); window.scrollTo(0, 0) }}>Chat</button><button className={`nav-link ${page === 'leaderboard' ? 'active' : ''}`} onClick={() => { setPage('leaderboard'); setMenuOpen(false); window.scrollTo(0, 0) }}>Leaderboard</button><button className={`nav-link ${page === 'mistakes' ? 'active' : ''}`} onClick={() => { setPage('mistakes'); setMenuOpen(false); window.scrollTo(0, 0) }}>Mistake Notebook</button>{isAdmin && <button className={`nav-link nav-admin-link ${page === 'admin' ? 'active' : ''}`} onClick={() => { setPage('admin'); setMenuOpen(false); window.scrollTo(0, 0) }}>Admin panel</button>}</>}
        </nav>
        <div className="nav-right">{user ? <button className="profile-button" onClick={() => { setPage('profile'); setMenuOpen(false); window.scrollTo(0, 0) }}><span className="profile-avatar">{avatarUrl?<img src={avatarUrl} alt="" />:<UserRound size={17}/>}</span><span>{user.email?.split('@')[0] || 'Profile'}</span></button> : <button className="profile-button nav-signin-button" onClick={() => { setPage('login'); setMenuOpen(false); window.scrollTo(0, 0) }}><span className="profile-avatar"><LogIn size={17} /></span><span>Sign in</span></button>}<button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
      </div>
    </header>

    {page === 'welcome' && !user && <main className="welcome-screen"><div className="welcome-orb welcome-orb-one"/><div className="welcome-orb welcome-orb-two"/><div className="welcome-content"><div className="welcome-brand"><span className="brand-mark"><BookOpen size={25}/></span><span className="brand-copy"><strong>LTL<span>.</span></strong><small>LIVE TO LEARN</small></span></div><span className="eyebrow"><Sparkles size={15}/> YOUR FUTURE STARTS HERE</span><h1>Learn with purpose.<br/><span>Grow with confidence.</span></h1><p>Your competitive exam journey, organised in one place. Learn, practise and move closer to your goal — one day at a time.</p><button className="primary-button welcome-cta" onClick={()=>{setPage('login');setAuthMode('signin')}}>Get started <ArrowRight size={18}/></button><small className="welcome-caption">A smarter way to prepare for TNPSC · RRB · SSC · TNUSRB</small></div><div className="welcome-visual"><div className="welcome-ring ring-a"/><div className="welcome-ring ring-b"/><div className="welcome-book"><GraduationCap size={76}/><strong>YOUR NEXT<br/>CHAPTER</strong><span>STARTS NOW</span></div><div className="welcome-chip chip-one"><CheckCircle2 size={16}/> Learn</div><div className="welcome-chip chip-two"><Zap size={16}/> Practise</div><div className="welcome-chip chip-three"><Target size={16}/> Achieve</div></div></main>}

    {page === 'home' && user && <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><Sparkles size={14} /> YOUR GOALS, YOUR PACE</div><h1>One small step.<br /><span>A bigger future.</span></h1><p className="hero-description">Your exam journey doesn't have to feel overwhelming. Choose your path, learn at your pace, and keep moving forward.</p><button className="primary-button" onClick={openExams}>Find your exam <ArrowRight size={17} /></button><div className="hero-footnote"><span className="footnote-icon"><CheckCircle2 size={16} /></span>Simple learning. Steady progress.</div></div>
        <div className="hero-art" aria-label="Illustration of a student learning"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="float-card note-float"><span className="mini-icon blue"><BookOpen size={17} /></span><span><strong>Learn something new</strong><small>One topic at a time</small></span></div><div className="study-card"><div className="study-card-top"><div className="study-avatar"><GraduationCap size={28} /></div><div><strong>Your journey</strong><span>Starts with a choice</span></div><span className="sparkle-dot">✦</span></div><div className="study-lines"><span className="line line-wide" /><span className="line line-short" /></div><div className="study-progress"><div className="progress-head"><span>Keep showing up</span><b>01 / 03</b></div><div className="progress-track"><span /></div></div><div className="study-checks"><span><CheckCircle2 size={15} /> Learn</span><span><span className="empty-check" /> Practice</span><span><span className="empty-check" /> Grow</span></div></div><div className="float-card streak-float"><span className="streak-icon">✦</span><span><strong>Progress, not pressure</strong><small>Every step counts</small></span></div><div className="art-sun" /></div>
      </section>
      <section className="home-callout"><div className="callout-icon"><Target size={23} /></div><div><span className="eyebrow section-eyebrow">YOUR NEXT CHAPTER</span><h2>Which exam are you preparing for?</h2><p>Pick your exam first. We'll guide you to the right subjects and learning tools.</p></div><button className="primary-button" onClick={openExams}>Explore exams <ArrowRight size={17} /></button></section>
      <section className="how-section" id="how-it-works"><div className="how-intro"><span className="eyebrow section-eyebrow">A SIMPLE WAY FORWARD</span><h2>Learn at your pace.<br /><span>Grow with every step.</span></h2></div><div className="how-steps"><div className="how-step"><span className="step-number">01</span><div><strong>Choose your exam</strong><p>Start with the path that matches your goal.</p></div></div><div className="how-step"><span className="step-number">02</span><div><strong>Pick your learning mode</strong><p>Teaching, notes, quizzes, or tests — you choose.</p></div></div><div className="how-step"><span className="step-number">03</span><div><strong>Choose a subject</strong><p>Focus on one subject and build consistency.</p></div></div></div></section>
    </main>}

    {page === 'exams' && <main className="inner-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Back to home</button><div className="page-title-block"><span className="eyebrow section-eyebrow">STEP 01 · PICK YOUR PATH</span><h1>Find your exam</h1><p>Choose the exam you're preparing for. Your learning options will be tailored to that exam.</p></div><div className="exam-grid phase-grid">{exams.map((exam, index) => <button key={exam.id} className="exam-card" onClick={() => chooseExam(exam)} style={{ '--exam-color': exam.color, '--exam-tint': exam.tint } as React.CSSProperties}><div className="exam-card-top"><span className="exam-symbol">{exam.icon}</span><span className="card-arrow"><ArrowRight size={17} /></span></div><div className="exam-card-body"><span className="exam-index">0{index + 1} / EXAM TRACK</span><h3>{exam.name}</h3><p>{exam.short}</p><span className="exam-full-name">{exam.subtitle}</span></div><div className="card-bottom-line" /></button>)}</div></main>}

    {page === 'subexams' && selectedExam && <main className="inner-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17}/> All exam categories</button><div className="page-title-block"><span className="eyebrow section-eyebrow">STEP 02 · {selectedExam.name.toUpperCase()}</span><h1>Choose your {selectedExam.name} exam</h1><p>Select the exact recruitment examination. Subjects and learning materials will be organised for this selection.</p></div><div className="exam-grid phase-grid">{(examTracks[selectedExam.id] || []).map((track,index)=><button key={track} className="exam-card" onClick={()=>chooseSubExam(track)} style={{'--exam-color':selectedExam.color,'--exam-tint':selectedExam.tint} as React.CSSProperties}><div className="exam-card-top"><span className="exam-symbol">{String(index+1).padStart(2,'0')}</span><span className="card-arrow"><ArrowRight size={17}/></span></div><div className="exam-card-body"><span className="exam-index">{selectedExam.name} · EXAM</span><h3>{track}</h3><p>Subjects, notes, teaching, quizzes and tests</p></div><div className="card-bottom-line"/></button>)}</div></main>}

    {page === 'options' && selectedExam && <main className="inner-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> All exams</button><div className="page-title-block"><span className="eyebrow section-eyebrow">STEP 02 · {selectedExam.name.toUpperCase()}</span><h1>How would you like to learn?</h1><p>Choose a learning mode. Next, you'll choose a subject for {activeExamLabel}.</p><div className="current-exam-pill" style={{ background: selectedExam.tint, color: selectedExam.color }}><CheckCircle2 size={15} /> {activeExamLabel} selected</div></div><div className="resource-grid phase-resource-grid">{resources.map((resource, index) => { const Icon = resource.icon; return <button key={resource.id} className="resource-card" onClick={() => chooseResource(resource)} style={{ '--resource-color': resource.color, '--resource-tint': resource.tint } as React.CSSProperties}><span className="resource-icon"><Icon size={22} /></span><span className="resource-number">0{index + 1}</span><strong>{resource.title}</strong><span className="resource-subtitle">{resource.subtitle}</span><span className="resource-link">Choose {resource.title.toLowerCase()} <ArrowRight size={14} /></span></button> })}</div></main>}

    {page === 'subjects' && selectedExam && activeResource && <main className="inner-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Learning options</button><div className="page-title-block"><span className="eyebrow section-eyebrow">STEP 03 · CHOOSE A SUBJECT</span><h1>{activeExamLabel} {activeResource.title}</h1><p>{activeResource.description} Select a subject below to continue.</p><div className="selection-pills"><span style={{ background: selectedExam.tint, color: selectedExam.color }}>{activeExamLabel}</span><span style={{ background: activeResource.tint, color: activeResource.color }}>{activeResource.title}</span></div></div><div className="subject-toolbar"><div className="subject-count"><BookMarked size={18} /><span><strong>{filteredSubjects.length} subjects</strong><small>Available for {activeExamLabel}</small></span></div><label className="subject-search"><Search size={17} /><input value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} placeholder="Search subjects" aria-label="Search subjects" /></label></div><div className="subject-grid">{filteredSubjects.map((subject, index) => { const Icon = subject.icon; const active = selectedSubject === subject.name; return <button key={subject.name} className={`subject-card ${active ? 'subject-card-active' : ''}`} onClick={() => setSelectedSubject(subject.name)} aria-pressed={active}><span className="subject-card-icon"><Icon size={21} /></span><span className="subject-card-content"><small>SUBJECT {String(index + 1).padStart(2, '0')}</small><strong>{subject.name}</strong><span>{subject.description}</span></span><span className="subject-card-action">{active ? <BadgeCheck size={20} /> : <ChevronRight size={20} />}</span></button> })}</div>{filteredSubjects.length === 0 && <div className="empty-subjects">No subjects match “{subjectSearch}”. Try another search.</div>}{selectedSubject && <><div className="subject-confirmation"><span className="confirmation-icon"><CheckCircle2 size={22} /></span><div><strong>{selectedSubject} selected</strong><p>Available {activeResource.title.toLowerCase()} content for {activeExamLabel} appears below.</p></div><button className="text-button" onClick={() => setSelectedSubject(null)}>Change</button></div>{(activeResource.id==='teaching'||activeResource.id==='notes')&&<div className="learner-materials"><h2>{activeResource.id==='teaching'?'Training videos':'PDF notes'}</h2>{learningContent.length===0?<p className="muted-line">No materials published for this subject yet.</p>:learningContent.map(item=><article className="learner-material" key={item.id}>{item.type==='video'?<Video size={21}/>:<FileText size={21}/>}<div><strong>{item.title}</strong><small>{item.exam} · {item.subject}</small></div><button className="primary-button small-action" onClick={()=>void openLearningFile(item)}>{item.type==='video'?'Watch':'Open PDF'} <ArrowRight size={14}/></button></article>)}</div>}{activeResource.id==='quiz'&&<div className="learner-materials"><div className="quiz-heading-row"><div><h2>{activeResource.title} questions</h2><p>{activeExamLabel} · {selectedSubject} — bookmarks stay inside this subject.</p></div><div className="quiz-view-tabs"><button className={quizView==='all'?'selected':''} onClick={()=>setQuizView('all')}>All questions</button><button className={quizView==='bookmarked'?'selected':''} onClick={()=>setQuizView('bookmarked')}><Bookmark size={15}/> Bookmarked ({bookmarkedIds.length})</button></div></div>{!user?<div className="notice-box">Please <button className="inline-link" onClick={()=>setPage('login')}>sign in</button> to access questions.</div>:learnerQuestions.filter(q=>quizView==='all'||bookmarkedIds.includes(q.id)).length===0?<p className="muted-line">{quizView==='bookmarked'?'No bookmarked questions in this subject yet.':'No questions published for this subject yet.'}</p>:learnerQuestions.filter(q=>quizView==='all'||bookmarkedIds.includes(q.id)).map((q,i)=><article className="learner-question" key={q.id}><div className="quiz-question-title"><strong>{i+1}. {q.question}</strong><button className={`bookmark-question ${bookmarkedIds.includes(q.id)?'is-bookmarked':''}`} onClick={()=>void toggleBookmark(q.id)} aria-label={bookmarkedIds.includes(q.id)?'Remove bookmark':'Bookmark question'} title={bookmarkedIds.includes(q.id)?'Remove bookmark':'Bookmark question'}>{bookmarkedIds.includes(q.id)?<BookmarkCheck size={19}/>:<Bookmark size={19}/>}</button></div><div className="learner-options">{q.options.map((option,j)=><button key={j} className={learnerAnswers[q.id]===j?'chosen':''} onClick={()=>setLearnerAnswers(prev=>({...prev,[q.id]:j}))}>{String.fromCharCode(65+j)}. {option}</button>)}</div>{learnerAnswers[q.id]!==undefined&&<p className={learnerAnswers[q.id]===q.correct_option?'answer-correct':'answer-wrong'}>{learnerAnswers[q.id]===q.correct_option?'Correct answer!':'Not quite. Correct answer: '+String.fromCharCode(65+q.correct_option)}{q.explanation?' — '+q.explanation:''}</p>}</article>)}</div>}{activeResource.id==='test'&&(!user?<div className="notice-box">Please <button className="inline-link" onClick={()=>setPage('login')}>sign in</button> to access scheduled tests.</div>:<TestCenter supabase={supabase} user={user} isAdmin={isAdmin} exam={activeExamLabel} subject={selectedSubject}/> )}</>}</main>}

    {page === 'login' && <main className="inner-page auth-page"><button className="back-button" onClick={()=>setPage(user?'home':'welcome')}><ArrowLeft size={17} /> Back</button><div className="auth-card"><div className="auth-mark"><LockKeyhole size={26} /></div><span className="eyebrow section-eyebrow">YOUR LEARNING SPACE</span><h1>{authMode === 'signin' ? 'Welcome back' : 'Create your account'}</h1><p>Sign in to access your LTL learning space. Admin tools are available only to accounts assigned the admin role in Supabase.</p>{authMode === 'signup' && <label className="profile-field"><span>Full name</span><input value={authName} onChange={e => setAuthName(e.target.value)} autoComplete="name" placeholder="Your full name" /></label>}<label className="profile-field"><span>Email address</span><input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" /></label><label className="profile-field"><span>Password</span><input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} minLength={6} placeholder="At least 6 characters" /></label><button className="primary-button profile-save" disabled={authLoading} onClick={() => void handleAuth()}>{authLoading ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}{authMode === 'signin' ? 'Sign in' : 'Create account'}</button><button className="text-button auth-toggle" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setNotice('') }}>{authMode === 'signin' ? 'New to LTL? Create an account' : 'Already registered? Sign in'}</button>{!supabase && <p className="setup-warning">Supabase setup required: add your project URL and anon key to the environment variables. See <code>.env.example</code> and <code>supabase-setup.sql</code>.</p>}{notice && <div className="notice-box">{notice}</div>}</div></main>}

    {page === 'about' && <main className="inner-page about-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Back</button><div className="about-hero"><div className="about-icon"><BookOpen size={30} /></div><span className="eyebrow section-eyebrow">ABOUT US</span><h1>Live To Learn</h1><p>LTL is a learning platform designed to help competitive-exam aspirants prepare with more clarity and confidence. Choose TNPSC, RRB, SSC or TNUSRB, explore the relevant subjects, learn through training videos, revise with PDF notes, and practise with quizzes and tests in one organised place.</p></div><div className="about-feature-grid"><article><GraduationCap size={23}/><h3>Learn</h3><p>Structured training resources for your chosen exam and subject.</p></article><article><FileText size={23}/><h3>Revise</h3><p>PDF notes organised by exam and subject for focused revision.</p></article><article><ClipboardList size={23}/><h3>Practise</h3><p>Quiz and test questions with four-option practice formats.</p></article><article><Target size={23}/><h3>Prepare</h3><p>A simple, exam-focused learning flow for TNPSC, RRB and SSC aspirants.</p></article></div><div className="people-card"><span className="eyebrow section-eyebrow">LEADERSHIP</span><h2>Founder &amp; CEO</h2><p className="person-name">Mr.S.Sarathkumar.B.A,DME.,</p><div className="person-divider"/><h2>Developer</h2><p className="person-name">Mr.M.Ajithkumar.B.E.</p></div></main>}

    {page === 'admin' && isAdmin && <main className="inner-page admin-page"><div className="admin-heading"><div><span className="eyebrow section-eyebrow">LTL CONTROL CENTRE</span><h1><ShieldCheck size={28}/> Admin panel</h1><p>Upload training videos and PDF notes, create quizzes, and manage published learning resources.</p></div><button className="outline-button" onClick={() => void handleSignOut()}><LogOut size={16}/> Sign out</button></div><div className="admin-tabs">{([{id:'training',label:'Training videos',icon:Video},{id:'notes',label:'PDF notes',icon:FileText},{id:'quiz',label:'Quiz & Test',icon:ClipboardList},{id:'content',label:'Uploaded content',icon:Eye},{id:'manageQuiz',label:'Manage questions',icon:Settings2},{id:'deleteContent',label:'Delete content',icon:Trash2},{id:'chatAdmin',label:'Users & Chat',icon:Users},{id:'security',label:'Security activity',icon:ShieldCheck},{id:'notifications',label:`New users${adminNotifications.filter(n=>!n.is_read).length ? ` (${adminNotifications.filter(n=>!n.is_read).length})` : ''}`,icon:Bell}] as const).map(tab => {const Icon=tab.icon;return <button key={tab.id} className={adminTab===tab.id?'admin-tab active':'admin-tab'} onClick={()=>setAdminTab(tab.id)}><Icon size={17}/>{tab.label}</button>})}</div>{notice && <div className="notice-box admin-notice">{notice}</div>}{adminTab==='chatAdmin'&&<ChatAdmin supabase={supabase} />}{adminTab==='security'&&supabase&&<SecurityAudit supabase={supabase} />}<section className="admin-panel-card" style={(adminTab==='chatAdmin'||adminTab==='security'||adminTab==='notifications'||adminTab==='deleteContent')?{display:'none'}:undefined}>{adminTab === 'training' && <><div className="panel-title"><Video size={22}/><div><h2>Upload training video</h2><p>This upload control is visible only to authenticated admins.</p></div></div><label className="profile-field"><span>Video title</span><input value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} placeholder="e.g. Indian Polity – Fundamental Rights"/></label><div className="admin-two-col"><label className="profile-field"><span>Exam</span><select value={uploadExam} onChange={e=>{const next=e.target.value;setUploadExam(next);setUploadSubExam(examTracks[next.toLowerCase()]?.[0] || 'General');setUploadSubject(subjectsForTrack(next.toLowerCase(), examTracks[next.toLowerCase()]?.[0] || '')[0]?.name || 'General Studies')}}><option>TNPSC</option><option>RRB</option><option>SSC</option><option>TNUSRB</option></select></label><label className="profile-field"><span>Specific exam</span><select value={uploadSubExam} onChange={e=>{setUploadSubExam(e.target.value);setUploadSubject(subjectsForTrack(uploadExam.toLowerCase(),e.target.value)[0]?.name || 'General Studies')}}>{(examTracks[uploadExam.toLowerCase()] || []).map(track=><option key={track} value={track}>{track}</option>)}</select></label><label className="profile-field"><span>Subject</span><select value={uploadSubject} onChange={e=>setUploadSubject(e.target.value)}>{subjectsForTrack(uploadExam.toLowerCase(), uploadSubExam).map(subject=><option key={subject.name} value={subject.name}>{subject.name}</option>)}</select></label></div><label className="file-drop"><Video size={25}/><strong>{uploadFile?.name || 'Choose a video file'}</strong><span>MP4, WebM or other supported video format</span><input type="file" accept="video/*" onChange={e=>setUploadFile(e.target.files?.[0]??null)}/></label><button className="primary-button" disabled={uploading} onClick={()=>void uploadContent('video')}>{uploading?<LoaderCircle className="spin" size={17}/>:<Upload size={17}/>} Upload training video</button></>}{adminTab === 'notes' && <><div className="panel-title"><FileText size={22}/><div><h2>Upload PDF notes</h2><p>Upload subject-wise revision notes for learners.</p></div></div><label className="profile-field"><span>Notes title</span><input value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} placeholder="e.g. Indian Constitution – Quick Notes"/></label><div className="admin-two-col"><label className="profile-field"><span>Exam</span><select value={uploadExam} onChange={e=>{const next=e.target.value;setUploadExam(next);setUploadSubExam(examTracks[next.toLowerCase()]?.[0] || 'General');setUploadSubject(subjectsForTrack(next.toLowerCase(), examTracks[next.toLowerCase()]?.[0] || '')[0]?.name || 'General Studies')}}><option>TNPSC</option><option>RRB</option><option>SSC</option><option>TNUSRB</option></select></label><label className="profile-field"><span>Specific exam</span><select value={uploadSubExam} onChange={e=>{setUploadSubExam(e.target.value);setUploadSubject(subjectsForTrack(uploadExam.toLowerCase(),e.target.value)[0]?.name || 'General Studies')}}>{(examTracks[uploadExam.toLowerCase()] || []).map(track=><option key={track} value={track}>{track}</option>)}</select></label><label className="profile-field"><span>Subject</span><select value={uploadSubject} onChange={e=>setUploadSubject(e.target.value)}>{subjectsForTrack(uploadExam.toLowerCase(), uploadSubExam).map(subject=><option key={subject.name} value={subject.name}>{subject.name}</option>)}</select></label></div><label className="file-drop"><FileText size={25}/><strong>{uploadFile?.name || 'Choose a PDF file'}</strong><span>PDF documents only</span><input type="file" accept="application/pdf,.pdf" onChange={e=>setUploadFile(e.target.files?.[0]??null)}/></label><button className="primary-button" disabled={uploading} onClick={()=>void uploadContent('note')}>{uploading?<LoaderCircle className="spin" size={17}/>:<Upload size={17}/>} Upload PDF notes</button></>}{adminTab === 'quiz' && <><div className="panel-title"><ClipboardList size={22}/><div><h2>Quiz &amp; Test question builder</h2><p>Choose automatic PDF scanning or enter questions manually.</p></div></div><div className="admin-two-col"><label className="profile-field"><span>Exam</span><select value={uploadExam} onChange={e=>{const next=e.target.value;setUploadExam(next);setUploadSubExam(examTracks[next.toLowerCase()]?.[0] || 'General');setUploadSubject(subjectsForTrack(next.toLowerCase(), examTracks[next.toLowerCase()]?.[0] || '')[0]?.name || 'General Studies')}}><option>TNPSC</option><option>RRB</option><option>SSC</option><option>TNUSRB</option></select></label><label className="profile-field"><span>Specific exam</span><select value={uploadSubExam} onChange={e=>{setUploadSubExam(e.target.value);setUploadSubject(subjectsForTrack(uploadExam.toLowerCase(),e.target.value)[0]?.name || 'General Studies')}}>{(examTracks[uploadExam.toLowerCase()] || []).map(track=><option key={track} value={track}>{track}</option>)}</select></label><label className="profile-field"><span>Subject</span><select value={uploadSubject} onChange={e=>setUploadSubject(e.target.value)}>{subjectsForTrack(uploadExam.toLowerCase(), uploadSubExam).map(subject=><option key={subject.name} value={subject.name}>{subject.name}</option>)}</select></label></div><label className="profile-field"><span>Publish as</span><select value={quizContentMode} onChange={e=>setQuizContentMode(e.target.value as 'quiz'|'test')}><option value="quiz">Quiz</option><option value="test">Test</option></select></label><div className="quiz-mode-switch"><button className={quizMode==='scan'?'selected':''} onClick={()=>setQuizMode('scan')}><ScanText size={18}/> Automatic PDF scanner</button><button className={quizMode==='manual'?'selected':''} onClick={()=>setQuizMode('manual')}><NotebookPen size={18}/> Manual question entry</button></div>{quizMode==='scan'?<><label className="file-drop"><ScanText size={25}/><strong>Choose question PDF</strong><span>Best for selectable text PDFs containing A/B/C/D or 1/2/3/4 options</span><input type="file" accept="application/pdf,.pdf" onChange={e=>{const f=e.target.files?.[0];if(f)void scanPdf(f)}}/></label>{scanBusy&&<p className="muted-line"><LoaderCircle className="spin" size={16}/> Scanning PDF text…</p>}{scannedQuestions.length>0&&<><p className="scanner-hint">Review detected questions and select the correct answer before publishing. The scanner never assumes Option A. It uses an answer key only when clearly detected; otherwise select the correct answer for every question. Incomplete questions must be fixed or removed.</p>{scannedQuestions.map((q,i)=><div className="question-editor" key={`scan-${i}`}><div className="question-editor-head"><strong>Question {i+1}</strong><button className="icon-button" onClick={()=>setScannedQuestions(prev=>prev.filter((_,idx)=>idx!==i))} aria-label="Remove question"><Trash2 size={16}/></button></div><textarea value={q.question} onChange={e=>setScannedQuestions(prev=>prev.map((item,idx)=>idx===i?{...item,question:e.target.value}:item))}/><div className="option-editor-grid">{q.options.map((o,j)=><label key={j}><span>Option {String.fromCharCode(65+j)}</span><input value={o} onChange={e=>setScannedQuestions(prev=>prev.map((item,idx)=>idx===i?{...item,options:item.options.map((v,k)=>k===j?e.target.value:v) as [string,string,string,string]}:item))}/></label>)}</div><label className="profile-field"><span>Correct answer (confirm before publishing)</span><select value={q.answer} onChange={e=>setScannedQuestions(prev=>prev.map((item,idx)=>idx===i?{...item,answer:Number(e.target.value)}:item))}><option value={-1} key="unconfirmed">Select the correct answer…</option>{q.options.map((o,j)=><option value={j} key={j}>{String.fromCharCode(65+j)} — {o||`Option ${j+1}`}</option>)}</select></label></div>)}<button className="primary-button" disabled={uploading} onClick={()=>void publishQuestions(scannedQuestions)}>{uploading?<LoaderCircle className="spin" size={17}/>:<Upload size={17}/>} Publish {scannedQuestions.length} questions</button></>}</>:<><div className="question-editor"><div className="question-editor-head"><strong>Question template</strong><span>4 options</span></div><label className="profile-field"><span>Question</span><textarea value={draft.question} onChange={e=>setDraft({...draft,question:e.target.value})} placeholder="Type your question here…"/></label><div className="option-editor-grid">{draft.options.map((o,i)=><label key={i}><span>Option {String.fromCharCode(65+i)}</span><input value={o} onChange={e=>setDraft({...draft,options:draft.options.map((v,j)=>j===i?e.target.value:v) as [string,string,string,string]})} placeholder={`Enter option ${String.fromCharCode(65+i)}`}/></label>)}</div><label className="profile-field"><span>Correct answer</span><select value={draft.answer} onChange={e=>setDraft({...draft,answer:Number(e.target.value)})}>{draft.options.map((o,i)=><option key={i} value={i}>{String.fromCharCode(65+i)} — {o||`Option ${i+1}`}</option>)}</select></label><label className="profile-field"><span>Explanation (optional)</span><textarea value={draft.explanation} onChange={e=>setDraft({...draft,explanation:e.target.value})} placeholder="Explain why this is correct…"/></label><button className="outline-button" onClick={()=>{if(draft.question.trim()&&draft.options.every(o=>o.trim())){setManualQuestions(prev=>[...prev,draft]);setDraft({question:'',options:['','','',''],answer:0,explanation:''});setNotice('Question added to the draft list.')}}}><Plus size={16}/> Add question to list</button></div>{manualQuestions.length>0&&<div className="draft-list"><strong>{manualQuestions.length} question(s) ready</strong>{manualQuestions.map((q,i)=><div key={i}><span>{i+1}. {q.question}</span><button className="icon-button" onClick={()=>setManualQuestions(prev=>prev.filter((_,idx)=>idx!==i))}><Trash2 size={15}/></button></div>)}<button className="primary-button" disabled={uploading} onClick={()=>void publishQuestions(manualQuestions)}>{uploading?<LoaderCircle className="spin" size={17}/>:<Upload size={17}/>} Publish questions</button></div>}</>}</>}</section>{adminTab==='content'&&<section className="admin-panel-card"><div className="panel-title"><BookMarked size={22}/><div><h2>Uploaded content</h2><p>{contentRows.length} recent items in LTL content library.</p></div></div>{contentRows.length===0?<p className="muted-line">No uploaded files yet.</p>:<div className="content-list">{contentRows.map(row=><div className="content-row" key={row.id}><span className="content-row-icon">{row.type==='video'?<Video size={19}/>:<FileText size={19}/>}</span><span className="content-row-copy"><strong>{row.title}</strong><small>{row.exam} · {row.subject} · {row.type}</small></span><button onClick={()=>void openLearningFile(row)} className="text-button">Open <ArrowRight size={14}/></button><button className="text-button" onClick={async()=>{const title=window.prompt('Edit content title',row.title);if(!title?.trim()||!supabase||!isAdmin)return;const {error}=await supabase.from('ltl_content').update({title:title.trim()}).eq('id',row.id);if(error){setNotice(error.message);return}setContentRows(prev=>prev.map(item=>item.id===row.id?{...item,title:title.trim()}:item));setNotice('Content title updated.')}}>Edit title</button><button className="icon-button" aria-label="Delete content" onClick={async()=>{if(!window.confirm(`Delete “${row.title}” from the content library?`)||!supabase||!isAdmin)return;const {error}=await supabase.from('ltl_content').delete().eq('id',row.id);if(error){setNotice(error.message);return}setContentRows(prev=>prev.filter(item=>item.id!==row.id));setNotice('Content item deleted from the library. The underlying storage file may need separate cleanup.')}}><Trash2 size={16}/></button></div>)}</div>}</section>}{adminTab==='manageQuiz'&&<section className="admin-panel-card"><div className="panel-title"><ClipboardList size={22}/><div><h2>Manage published questions</h2><p>Edit answer keys and question text or delete incorrect questions. Correct answers are stored as zero-based option indexes (A=0, B=1, C=2, D=3).</p></div></div><label className="subject-search" style={{display:'flex',margin:'16px 0'}}><Search size={17}/><input value={quizSearch} onChange={e=>setQuizSearch(e.target.value)} placeholder="Search question, exam, subject or quiz mode…" aria-label="Search published questions" /></label>{adminQuestions.length===0?<p className="muted-line">No published questions found.</p>:adminQuestions.filter(q=>`${q.question} ${q.exam} ${q.subject} ${q.mode}`.toLowerCase().includes(quizSearch.toLowerCase())).map(q=><article className="question-editor" key={q.id}><div className="question-editor-head"><strong>{q.exam} · {q.subject} · {q.mode}</strong><button className="icon-button" aria-label="Delete question" onClick={async()=>{if(!window.confirm('Delete this question?')||!supabase||!isAdmin)return;const {error}=await supabase.from('ltl_questions').delete().eq('id',q.id);if(error){setNotice(error.message);return}setAdminQuestions(prev=>prev.filter(x=>x.id!==q.id));setNotice('Question deleted.')}}><Trash2 size={16}/></button></div><textarea defaultValue={q.question} id={`q-text-${q.id}`} aria-label="Question text"/><div className="option-editor-grid">{q.options.map((option,index)=><label key={index}><span>Option {String.fromCharCode(65+index)}</span><input defaultValue={option} id={`q-${q.id}-opt-${index}`} aria-label={`Option ${String.fromCharCode(65+index)}`}/></label>)}</div><label className="profile-field"><span>Correct answer — verify the actual answer</span><select defaultValue={q.correct_option} id={`q-answer-${q.id}`}>{q.options.map((option,index)=><option key={index} value={index}>{String.fromCharCode(65+index)} — {option}</option>)}</select></label><label className="profile-field"><span>Explanation</span><textarea defaultValue={q.explanation||''} id={`q-exp-${q.id}`}/></label><button className="outline-button" onClick={async()=>{if(!supabase||!isAdmin)return;const question=(document.getElementById(`q-text-${q.id}`) as HTMLTextAreaElement).value.trim();const options=q.options.map((_,index)=>(document.getElementById(`q-${q.id}-opt-${index}`) as HTMLInputElement).value.trim());const correct_option=Number((document.getElementById(`q-answer-${q.id}`) as HTMLSelectElement).value);const explanation=(document.getElementById(`q-exp-${q.id}`) as HTMLTextAreaElement).value.trim();if(!question||options.some(x=>!x)){setNotice('Question and all four options are required.');return}const {error}=await supabase.from('ltl_questions').update({question,options,correct_option,explanation}).eq('id',q.id);if(error){setNotice(error.message);return}setAdminQuestions(prev=>prev.map(x=>x.id===q.id?{...x,question,options,correct_option,explanation}:x));setNotice('Question and answer key updated.')}}><CheckCircle2 size={16}/> Save question &amp; answer key</button></article>)}</section>}{adminTab==='deleteContent'&&<section className="admin-panel-card"><div className="panel-title"><Trash2 size={22}/><div><h2>Delete learning content</h2><p>Delete only the selected content category for one specific exam, recruitment and subject. Other exams and subjects remain untouched.</p></div></div><div className="admin-two-col"><label className="profile-field"><span>Exam category</span><select value={deleteExam} onChange={e=>{const next=e.target.value;const first=examTracks[next.toLowerCase()]?.[0] || '';setDeleteExam(next);setDeleteSubExam(first);setDeleteSubject(subjectsForTrack(next.toLowerCase(),first)[0]?.name || '')}}>{exams.map(exam=><option key={exam.id} value={exam.name}>{exam.name}</option>)}</select></label><label className="profile-field"><span>Specific exam</span><select value={deleteSubExam} onChange={e=>{setDeleteSubExam(e.target.value);setDeleteSubject(subjectsForTrack(deleteExam.toLowerCase(),e.target.value)[0]?.name || '')}}>{(examTracks[deleteExam.toLowerCase()] || []).map(track=><option key={track} value={track}>{track}</option>)}</select></label><label className="profile-field"><span>Subject</span><select value={deleteSubject} onChange={e=>setDeleteSubject(e.target.value)}>{subjectsForTrack(deleteExam.toLowerCase(),deleteSubExam).map(subject=><option key={subject.name} value={subject.name}>{subject.name}</option>)}</select></label><label className="profile-field"><span>Content to delete</span><select value={deleteCategory} onChange={e=>setDeleteCategory(e.target.value as typeof deleteCategory)}><option value="quiz">Quiz questions only</option><option value="test">Test questions only</option><option value="video">Training videos only</option><option value="notes">PDF notes only</option><option value="all">All four content types for this subject</option></select></label></div><div className="notice-box"><strong>Scope preview:</strong> {deleteExam} / {deleteSubExam} → {deleteSubject}. Only the selected category will be deleted. Test attempt history and learner points are not deleted by this tool.</div><button className="primary-button danger-action" disabled={deleteBusy || !deleteSubject} onClick={()=>void deleteScopedLearningContent()}>{deleteBusy?<LoaderCircle className="spin" size={17}/>:<Trash2 size={17}/>} {deleteBusy?'Deleting…':'Delete selected content'}</button><p className="admin-footnote">A second confirmation is required. The deletion uses exact exam + subject filters; it does not run a global delete.</p></section>}{adminTab==='notifications'&&<section className="admin-panel-card"><div className="panel-title"><Bell size={22}/><div><h2>New user notifications</h2><p>New registrations appear here automatically when the Phase 7 database trigger is enabled.</p></div></div>{adminNotifications.length===0?<p className="muted-line">No new-user notifications yet. Run phase-7-setup.sql in Supabase SQL Editor.</p>:<div className="content-list">{adminNotifications.map(n=><div className="content-row" key={n.id}><span className="content-row-icon"><Users size={18}/></span><span className="content-row-copy"><strong>{n.user_name || 'New learner'}</strong><small>{n.user_email || 'Email unavailable'} · {new Date(n.created_at).toLocaleString()}</small></span>{!n.is_read&&<span className="guest-badge">New</span>}<button className="text-button" onClick={async()=>{if(!supabase)return;const {error}=await supabase.from('ltl_admin_notifications').update({is_read:true}).eq('id',n.id);if(error){setNotice(error.message);return}setAdminNotifications(prev=>prev.map(x=>x.id===n.id?{...x,is_read:true}:x))}}>Mark read</button></div>)}</div>}</section>}<p className="admin-footnote"><Info size={15}/> Admin access is controlled by the Supabase <code>profiles.role</code> field and database policies, not by hiding a button alone.</p></main>}

    {page === 'help' && <main className="inner-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17}/> Back</button><div className="page-title-block"><span className="eyebrow section-eyebrow">LTL SUPPORT</span><h1>Help Centre</h1><p>Need help with your account, learning materials, quizzes or chat? Contact our support team.</p></div><section className="admin-panel-card"><div className="panel-title"><Info size={22}/><div><h2>Contact support</h2><p>Send us your question and include a screenshot if you are reporting a technical issue.</p></div></div><a className="primary-button" href="mailto:bugzen.ai28@gmail.com?subject=LTL%20Help%20Centre%20Support">Email bugzen.ai28@gmail.com <ArrowRight size={17}/></a></section></main>}

    {page === 'leaderboard' && user && <main className="inner-page leaderboard-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17}/> Back</button><div className="page-title-block"><span className="eyebrow section-eyebrow">TEST PERFORMANCE</span><h1><Trophy size={30}/> Leaderboard</h1><p>Points are earned only from marks scored in scheduled tests. Quiz scores, chat activity and AI usage do not add points.</p></div><div className="leaderboard-my-score"><Trophy size={22}/><span><small>Your test points</small><strong>{myTestPoints}</strong></span></div>{leaderboardBusy?<p className="muted-line">Loading leaderboard…</p>:leaderboardRows.length===0?<p className="muted-line">No submitted test scores yet. Complete a scheduled test to appear here.</p>:<div className="leaderboard-list">{leaderboardRows.map(row=><article className={`leaderboard-row ${row.user_id===user.id?'is-me':''}`} key={row.user_id}><b className="leaderboard-rank">#{row.rank}</b><span className="leaderboard-avatar">{row.avatar_path?<img src={supabase?.storage.from('ltl-avatars').getPublicUrl(row.avatar_path).data.publicUrl} alt=""/>:(row.full_name||'L').slice(0,1).toUpperCase()}</span><span className="leaderboard-name"><strong>{row.full_name}{row.user_id===user.id?' (You)':''}</strong><small>Test performance</small></span><strong className="leaderboard-points">{row.points} pts</strong></article>)}</div>}</main>}

    {page === 'profile' && !user && <main className="inner-page"><div className="notice-box">Please sign in to view and save your profile.</div><button className="primary-button" onClick={()=>setPage('login')}>Go to sign in <ArrowRight size={17}/></button></main>}

    {page === 'ai' && user && <main className="inner-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17}/> Back</button><div className="page-title-block"><span className="eyebrow section-eyebrow">SMART STUDY SUPPORT</span><h1>AI Doubt Solver</h1><p>Ask questions from any competitive-exam subject and get a step-by-step explanation.</p></div><AiDoubtSolver supabase={supabase} user={user} exam={activeExamLabel || 'TNPSC / RRB / SSC'} subject={selectedSubject || 'General studies'}/></main>}


    {page === 'mistakes' && user && supabase && <MistakeNotebook supabase={supabase} user={user} />}
    {page === 'chat' && <ChatPage supabase={supabase} user={user} isAdmin={isAdmin} />}

    {page === 'admin' && !isAdmin && <main className="inner-page"><div className="notice-box">Admin access required. Sign in with an account assigned the admin role in Supabase.</div><button className="primary-button" onClick={()=>setPage('login')}>Go to sign in <ArrowRight size={17}/></button></main>}

    {page === 'profile' && user && <main className="inner-page profile-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Back</button><div className="profile-header-card"><div className="profile-large-avatar">{avatarUrl?<img src={avatarUrl} alt="Your profile"/>:<UserRound size={34}/>}</div><label className="avatar-upload-button"><ImagePlus size={16}/>{avatarBusy?'Uploading…':'Change profile photo'}<input type="file" accept="image/*" disabled={avatarBusy} onChange={e=>{selectAvatarFile(e.target.files?.[0]);e.currentTarget.value=''}}/></label><span className="eyebrow section-eyebrow">YOUR LEARNING SPACE</span><h1>My profile</h1><p>Manage your LTL learning space and account.</p><span className="guest-badge"><CheckCircle2 size={14} /> Signed in · {user.email}</span>{user && <button className="outline-button" onClick={()=>void handleSignOut()}><LogOut size={16}/> Sign out</button>}</div><div className="profile-form-card"><h2>Profile details</h2><p>Use the sign-in page to keep your account connected across sessions.</p><label className="profile-field"><span>Display name</span><input value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={40} placeholder="Enter your name" /></label><label className="profile-field"><span>Learning goal</span><select value={profileGoal} onChange={e => setProfileGoal(e.target.value)}><option>Prepare consistently</option><option>Improve my weak subjects</option><option>Revise before the exam</option><option>Practise with quizzes and tests</option></select></label><div className="test-points-card"><Trophy size={21}/><span><small>Test points</small><strong>{myTestPoints} points</strong></span><button className="outline-button" onClick={()=>{setPage('leaderboard');window.scrollTo(0,0)}}>View leaderboard</button></div><div className="profile-summary"><div><Target size={18} /><span><small>Current exam</small><strong>{activeExamLabel || 'Not selected yet'}</strong></span></div><div><BookOpen size={18} /><span><small>Learning goal</small><strong>{profileGoal}</strong></span></div></div><button className="primary-button profile-save" onClick={() => void saveProfile()}>Save profile <CheckCircle2 size={17} /></button></div></main>}

    {cropSource && <div className="crop-modal-backdrop" role="presentation"><section className="crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-title"><div className="crop-modal-head"><div><span className="eyebrow section-eyebrow">PROFILE PHOTO</span><h2 id="crop-title">Crop your picture</h2></div><button className="icon-button" type="button" onClick={()=>setCropSource(null)} aria-label="Cancel crop"><X size={19}/></button></div><div className="avatar-crop-window"><img src={cropSource} alt="Selected profile crop preview" style={{transform:`scale(${cropZoom})`}}/></div><label className="profile-field crop-zoom-control"><span>Zoom</span><input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={e=>setCropZoom(Number(e.target.value))}/></label><p className="muted-line">Move the zoom slider to frame your face inside the square. The centre area will be saved.</p><div className="crop-modal-actions"><button className="outline-button" type="button" onClick={()=>setCropSource(null)}>Cancel</button><button className="primary-button" type="button" disabled={avatarBusy} onClick={()=>void saveCroppedAvatar()}>{avatarBusy?<LoaderCircle className="spin" size={16}/>:<CheckCircle2 size={16}/>} Save cropped photo</button></div></section></div>}

    <footer className="footer" id="page-help"><button className="brand footer-brand" onClick={goHome} aria-label="LTL home"><span className="brand-mark"><BookOpen size={19} strokeWidth={2.4} /></span><span className="brand-copy"><strong>LTL<span>.</span></strong><small>LIVE TO LEARN</small></span></button><p>Learn today. Lead tomorrow. <button className="footer-about-link" onClick={()=>setPage('about')}>About LTL</button> · <button className="footer-about-link" onClick={()=>setPage('help')}>Help Centre</button></p><span className="copyright">© {new Date().getFullYear()} LTL · Made for learners</span></footer>
  </div>
}


function MistakeNotebook({supabase,user}:{supabase:SupabaseClient;user:User}) {
 const [rows,setRows]=useState<any[]>([]); const [busy,setBusy]=useState(true); const [filter,setFilter]=useState('All');
 useEffect(()=>{let live=true; (async()=>{const {data,error}=await supabase.from('ltl_mistake_notebook').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(500);if(live){setRows(error?[]:(data||[]));setBusy(false)}})();return()=>{live=false}},[supabase,user.id]);
 const visible=filter==='All'?rows:rows.filter(r=>r.exam===filter);
 return <main className="inner-page"><button className="back-button" onClick={()=>window.history.back()}>← Back</button><div className="page-title-block"><span className="eyebrow section-eyebrow">LEARN FROM EVERY ATTEMPT</span><h1>📘 Mistake Notebook</h1><p>Wrong and unanswered questions from your submitted scheduled tests are saved here automatically.</p></div><label className="profile-field"><span>Filter by exam</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option>{Array.from(new Set(rows.map(r=>r.exam))).map(x=><option key={x}>{x}</option>)}</select></label>{busy?<p>Loading mistakes…</p>:visible.length===0?<p className="muted-line">No mistakes saved yet. Complete a scheduled test to build your notebook.</p>:visible.map((r,i)=><article className="learner-question" key={r.id}><small>{r.exam} · {r.subject} · {new Date(r.created_at).toLocaleDateString()}</small><strong>{i+1}. {r.question}</strong><p>Your answer: {r.selected_option===null?'Not answered':String.fromCharCode(65+r.selected_option)+'. '+r.options[r.selected_option]}</p><p className="answer-correct">Correct answer: {String.fromCharCode(65+r.correct_option)}. {r.options[r.correct_option]}</p><button className="outline-button" onClick={async()=>{const {error}=await supabase.from('ltl_mistake_notebook').delete().eq('id',r.id);if(!error)setRows(prev=>prev.filter(x=>x.id!==r.id))}}>Remove from notebook</button></article>)}</main>
}
