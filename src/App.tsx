import { useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, ClipboardList,
  GraduationCap, Home, Menu, NotebookPen, Search, Settings2, Sparkles, UserRound,
  X, Zap, BookMarked, Brain, Calculator, Globe2, Languages, Landmark, Train,
  BadgeCheck, Target,
} from 'lucide-react'

type Exam = { id: string; name: string; subtitle: string; short: string; color: string; tint: string; icon: string }
type Resource = { id: string; title: string; subtitle: string; description: string; color: string; tint: string; icon: typeof GraduationCap }
type Subject = { name: string; description: string; icon: typeof BookOpen }
type Page = 'home' | 'exams' | 'options' | 'subjects' | 'profile'

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
    else if (page === 'exams' || page === 'profile') setPage('home')
    window.scrollTo(0, 0)
  }
  const filteredSubjects = selectedExam ? (subjects[selectedExam.id] || []).filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase())) : []

  return <div className="app-shell">
    <header className="topbar">
      <div className="nav-inner">
        <button className="brand" onClick={goHome} aria-label="LTL home"><span className="brand-mark"><BookOpen size={21} strokeWidth={2.4} /></span><span className="brand-copy"><strong>LTL<span>.</span></strong><small>LIVE TO LEARN</small></span></button>
        <nav className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`} aria-label="Main navigation">
          <button className={`nav-link ${page === 'home' ? 'active' : ''}`} onClick={goHome}>Home</button>
          <button className={`nav-link ${page !== 'home' && page !== 'profile' ? 'active' : ''}`} onClick={openExams}>Explore exams</button>
          <a className="nav-link" href={page === 'home' ? '#how-it-works' : '#page-help'} onClick={() => setMenuOpen(false)}>How it works</a>
        </nav>
        <div className="nav-right"><button className="profile-button" onClick={() => { setPage('profile'); setMenuOpen(false); window.scrollTo(0, 0) }}><span className="profile-avatar"><UserRound size={17} /></span><span>Profile</span></button><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
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

    {page === 'subjects' && selectedExam && activeResource && <main className="inner-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Learning options</button><div className="page-title-block"><span className="eyebrow section-eyebrow">STEP 03 · CHOOSE A SUBJECT</span><h1>{selectedExam.name} {activeResource.title}</h1><p>{activeResource.description} Select a subject below to continue.</p><div className="selection-pills"><span style={{ background: selectedExam.tint, color: selectedExam.color }}>{selectedExam.name}</span><span style={{ background: activeResource.tint, color: activeResource.color }}>{activeResource.title}</span></div></div><div className="subject-toolbar"><div className="subject-count"><BookMarked size={18} /><span><strong>{filteredSubjects.length} subjects</strong><small>Available for {selectedExam.name}</small></span></div><label className="subject-search"><Search size={17} /><input value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} placeholder="Search subjects" aria-label="Search subjects" /></label></div><div className="subject-grid">{filteredSubjects.map((subject, index) => { const Icon = subject.icon; const active = selectedSubject === subject.name; return <button key={subject.name} className={`subject-card ${active ? 'subject-card-active' : ''}`} onClick={() => setSelectedSubject(subject.name)} aria-pressed={active}><span className="subject-card-icon"><Icon size={21} /></span><span className="subject-card-content"><small>SUBJECT {String(index + 1).padStart(2, '0')}</small><strong>{subject.name}</strong><span>{subject.description}</span></span><span className="subject-card-action">{active ? <BadgeCheck size={20} /> : <ChevronRight size={20} />}</span></button> })}</div>{filteredSubjects.length === 0 && <div className="empty-subjects">No subjects match “{subjectSearch}”. Try another search.</div>}{selectedSubject && <div className="subject-confirmation"><span className="confirmation-icon"><CheckCircle2 size={22} /></span><div><strong>{selectedSubject} selected</strong><p>Your {activeResource.title.toLowerCase()} section for {selectedExam.name} is selected. Lesson, notes, quiz and test content can be connected in the next build step.</p></div><button className="text-button" onClick={() => setSelectedSubject(null)}>Change</button></div>}</main>}

    {page === 'profile' && <main className="inner-page profile-page"><button className="back-button" onClick={goBack}><ArrowLeft size={17} /> Back</button><div className="profile-header-card"><div className="profile-large-avatar"><UserRound size={34} /></div><span className="eyebrow section-eyebrow">YOUR LEARNING SPACE</span><h1>My profile</h1><p>Personalise your LTL experience. Sign-in and account sync will be added in the final phase.</p><span className="guest-badge"><CheckCircle2 size={14} /> Guest profile · No login yet</span></div><div className="profile-form-card"><h2>Profile details</h2><p>Your changes are kept while this page is open. Login and saved profiles will come in the final phase.</p><label className="profile-field"><span>Display name</span><input value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={40} placeholder="Enter your name" /></label><label className="profile-field"><span>Learning goal</span><select value={profileGoal} onChange={e => setProfileGoal(e.target.value)}><option>Prepare consistently</option><option>Improve my weak subjects</option><option>Revise before the exam</option><option>Practise with quizzes and tests</option></select></label><div className="profile-summary"><div><Target size={18} /><span><small>Current exam</small><strong>{selectedExam?.name ?? 'Not selected yet'}</strong></span></div><div><BookOpen size={18} /><span><small>Learning goal</small><strong>{profileGoal}</strong></span></div></div><button className="primary-button profile-save" onClick={() => { setPage('home'); window.scrollTo(0, 0) }}>Save and return home <ArrowRight size={17} /></button></div></main>}

    <footer className="footer" id="page-help"><button className="brand footer-brand" onClick={goHome} aria-label="LTL home"><span className="brand-mark"><BookOpen size={19} strokeWidth={2.4} /></span><span className="brand-copy"><strong>LTL<span>.</span></strong><small>LIVE TO LEARN</small></span></button><p>Learn today. Lead tomorrow.</p><span className="copyright">© {new Date().getFullYear()} LTL · Made for learners</span></footer>
  </div>
}
