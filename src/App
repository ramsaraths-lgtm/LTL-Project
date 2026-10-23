import { useState } from 'react'
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ClipboardList,
  GraduationCap, Menu, NotebookPen, Sparkles, X, Zap,
} from 'lucide-react'

type Exam = {
  id: string
  name: string
  subtitle: string
  short: string
  color: string
  tint: string
  icon: string
}

const exams: Exam[] = [
  {
    id: 'tnpsc',
    name: 'TNPSC',
    subtitle: 'Tamil Nadu Public Service Commission',
    short: 'Tamil Nadu government exams',
    color: '#2563eb',
    tint: '#eaf1ff',
    icon: 'தமிழ்',
  },
  {
    id: 'rrb',
    name: 'RRB',
    subtitle: 'Railway Recruitment Board',
    short: 'Railway recruitment exams',
    color: '#0f8b72',
    tint: '#e4f7f1',
    icon: 'RR',
  },
  {
    id: 'ssc',
    name: 'SSC',
    subtitle: 'Staff Selection Commission',
    short: 'Central government exams',
    color: '#8b5cf6',
    tint: '#f0eaff',
    icon: 'SC',
  },
]

const resources = [
  {
    id: 'teaching',
    title: 'Teaching',
    subtitle: 'Understand concepts, one step at a time.',
    description: 'Learn key concepts with simple explanations and structured lessons.',
    icon: GraduationCap,
    color: '#2563eb',
    tint: '#eaf1ff',
  },
  {
    id: 'notes',
    title: 'Notes',
    subtitle: 'Quick revision, whenever you need it.',
    description: 'Keep important topics and revision notes within easy reach.',
    icon: NotebookPen,
    color: '#0f8b72',
    tint: '#e4f7f1',
  },
  {
    id: 'quiz',
    title: 'Quiz',
    subtitle: 'Practice a little. Improve every day.',
    description: 'Sharpen your knowledge with topic-based practice questions.',
    icon: Zap,
    color: '#d97706',
    tint: '#fff2dc',
  },
  {
    id: 'test',
    title: 'Test',
    subtitle: 'Check your preparation and build confidence.',
    description: 'Try timed practice tests and review your readiness.',
    icon: ClipboardList,
    color: '#8b5cf6',
    tint: '#f0eaff',
  },
]

export default function App() {
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [activeResource, setActiveResource] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const selected = resources.find((item) => item.id === activeResource)

  function chooseExam(exam: Exam) {
    setSelectedExam(exam)
    setActiveResource(null)
    window.setTimeout(() => {
      document.getElementById('learning-options')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  function goHome() {
    setSelectedExam(null)
    setActiveResource(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="nav-inner">
          <button className="brand" onClick={goHome} aria-label="LTL home">
            <span className="brand-mark"><BookOpen size={21} strokeWidth={2.4} /></span>
            <span className="brand-copy">
              <strong>LTL<span>.</span></strong>
              <small>LIVE TO LEARN</small>
            </span>
          </button>

          <nav className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`} aria-label="Main navigation">
            <button className="nav-link active" onClick={goHome}>Home</button>
            <a className="nav-link" href="#exams" onClick={() => setMenuOpen(false)}>Explore exams</a>
            <a className="nav-link" href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          </nav>

          <div className="nav-right">
            <span className="nav-note"><span className="live-dot" /> Your next step starts here</span>
            <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> YOUR GOALS, YOUR PACE</div>
            <h1>One small step.<br /><span>A bigger future.</span></h1>
            <p className="hero-description">
              Your exam journey doesn't have to feel overwhelming.
              Choose your path, learn at your pace, and keep moving forward.
            </p>
            <a href="#exams" className="primary-button">
              Find your exam <ArrowRight size={17} />
            </a>
            <div className="hero-footnote">
              <span className="footnote-icon"><CheckCircle2 size={16} /></span>
              Simple learning. Steady progress.
            </div>
          </div>

          <div className="hero-art" aria-label="Illustration of a student learning">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="float-card note-float">
              <span className="mini-icon blue"><BookOpen size={17} /></span>
              <span><strong>Learn something new</strong><small>One topic at a time</small></span>
            </div>
            <div className="study-card">
              <div className="study-card-top">
                <div className="study-avatar"><GraduationCap size={28} /></div>
                <div><strong>Your journey</strong><span>Starts with a choice</span></div>
                <span className="sparkle-dot">✦</span>
              </div>
              <div className="study-lines">
                <span className="line line-wide" /><span className="line line-short" />
              </div>
              <div className="study-progress">
                <div className="progress-head"><span>Keep showing up</span><b>01 / 03</b></div>
                <div className="progress-track"><span /></div>
              </div>
              <div className="study-checks">
                <span><CheckCircle2 size={15} /> Learn</span>
                <span><span className="empty-check" /> Practice</span>
                <span><span className="empty-check" /> Grow</span>
              </div>
            </div>
            <div className="float-card streak-float">
              <span className="streak-icon">✦</span>
              <span><strong>Progress, not pressure</strong><small>Every step counts</small></span>
            </div>
            <div className="art-sun" />
          </div>
        </section>

        <section className="exam-section" id="exams">
          <div className="section-heading">
            <div>
              <div className="eyebrow section-eyebrow">PICK YOUR PATH</div>
              <h2>Where are you headed?</h2>
              <p>Choose an exam to find the learning tools made for your journey.</p>
            </div>
            {selectedExam && (
              <button className="text-button" onClick={() => { setSelectedExam(null); setActiveResource(null) }}>
                Change exam <ArrowRight size={15} />
              </button>
            )}
          </div>

          <div className="exam-grid">
            {exams.map((exam, index) => (
              <button
                key={exam.id}
                className={`exam-card ${selectedExam?.id === exam.id ? 'exam-card-selected' : ''}`}
                onClick={() => chooseExam(exam)}
                style={{ '--exam-color': exam.color, '--exam-tint': exam.tint } as React.CSSProperties}
                aria-pressed={selectedExam?.id === exam.id}
              >
                <div className="exam-card-top">
                  <span className="exam-symbol">{exam.icon}</span>
                  <span className="card-arrow"><ArrowRight size={17} /></span>
                </div>
                <div className="exam-card-body">
                  <span className="exam-index">0{index + 1} / EXAM TRACK</span>
                  <h3>{exam.name}</h3>
                  <p>{exam.short}</p>
                  <span className="exam-full-name">{exam.subtitle}</span>
                </div>
                <div className="card-bottom-line" />
              </button>
            ))}
          </div>

          {selectedExam && (
            <section className="learning-options" id="learning-options" aria-live="polite">
              <div className="options-heading">
                <div className="selected-badge" style={{ background: selectedExam.tint, color: selectedExam.color }}>
                  <CheckCircle2 size={15} /> {selectedExam.name} selected
                </div>
                <h2>How would you like to learn?</h2>
                <p>Pick what you need today. You can always come back and try another.</p>
              </div>

              <div className="resource-grid">
                {resources.map((resource, index) => {
                  const Icon = resource.icon
                  return (
                    <button
                      key={resource.id}
                      className={`resource-card ${activeResource === resource.id ? 'resource-card-active' : ''}`}
                      onClick={() => setActiveResource(activeResource === resource.id ? null : resource.id)}
                      style={{ '--resource-color': resource.color, '--resource-tint': resource.tint } as React.CSSProperties}
                      aria-pressed={activeResource === resource.id}
                    >
                      <span className="resource-icon"><Icon size={22} /></span>
                      <span className="resource-number">0{index + 1}</span>
                      <strong>{resource.title}</strong>
                      <span className="resource-subtitle">{resource.subtitle}</span>
                      <span className="resource-link">{activeResource === resource.id ? 'Selected' : 'Explore'} <ArrowRight size={14} /></span>
                    </button>
                  )
                })}
              </div>

              {selected && (
                <div className="selection-message">
                  <div className="selection-message-icon" style={{ background: selected.tint, color: selected.color }}>
                    <selected.icon size={22} />
                  </div>
                  <div>
                    <strong>{selectedExam.name} · {selected.title}</strong>
                    <p>{selected.description} This section is ready to be connected in the next development step.</p>
                  </div>
                  <button className="close-selection" onClick={() => setActiveResource(null)} aria-label="Close selection"><X size={18} /></button>
                </div>
              )}
            </section>
          )}
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-intro">
            <span className="eyebrow section-eyebrow">A SIMPLE WAY FORWARD</span>
            <h2>Learn at your pace.<br /><span>Grow with every step.</span></h2>
          </div>
          <div className="how-steps">
            <div className="how-step"><span className="step-number">01</span><div><strong>Choose your exam</strong><p>Start with the path that matches your goal.</p></div></div>
            <div className="how-step"><span className="step-number">02</span><div><strong>Pick your learning mode</strong><p>Teaching, notes, quizzes, or tests — you choose.</p></div></div>
            <div className="how-step"><span className="step-number">03</span><div><strong>Keep moving forward</strong><p>Build consistency, one session at a time.</p></div></div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <button className="brand footer-brand" onClick={goHome} aria-label="LTL home">
          <span className="brand-mark"><BookOpen size={19} strokeWidth={2.4} /></span>
          <span className="brand-copy"><strong>LTL<span>.</span></strong><small>LIVE TO LEARN</small></span>
        </button>
        <p>Learn today. Lead tomorrow.</p>
        <span className="copyright">© {new Date().getFullYear()} LTL · Made for learners</span>
      </footer>
    </div>
  )
}
