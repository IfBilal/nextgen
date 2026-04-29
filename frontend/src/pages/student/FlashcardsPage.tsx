import { useEffect, useMemo, useState } from 'react'
import {
  BookOpenText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Shuffle,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react'
import { useStudentAuth } from '../../context/StudentAuthContext'
import { buildDailyFlashcardDeck } from '../../services/flashcardsEngine'
import '../../styles/flashcards.css'

type CardStatus = 'new' | 'known' | 'review'

export default function FlashcardsPage() {
  const { user } = useStudentAuth()
  const deck = useMemo(() => buildDailyFlashcardDeck(user?.email ?? ''), [user?.email])

  const [activeIndex, setActiveIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [statusByCardIndex, setStatusByCardIndex] = useState<Record<number, CardStatus>>({})
  const [knownPulse, setKnownPulse] = useState(false)

  const activeCard = deck.cards[activeIndex]
  const knownCount = Object.values(statusByCardIndex).filter(value => value === 'known').length
  const reviewCount = Object.values(statusByCardIndex).filter(value => value === 'review').length
  const completedCount = Object.keys(statusByCardIndex).length
  const completionPct = Math.round((completedCount / deck.cards.length) * 100)
  const activeCardStatus = activeCard ? statusByCardIndex[activeIndex] ?? 'new' : 'new'
  const isSessionCompleted = completionPct === 100

  const gotoCard = (index: number) => {
    setActiveIndex(index)
    setRevealed(false)
  }

  const moveBy = (delta: number) => {
    const next = Math.min(deck.cards.length - 1, Math.max(0, activeIndex + delta))
    gotoCard(next)
  }

  const markCard = (status: CardStatus) => {
    if (!activeCard) return

    setStatusByCardIndex(previous => ({ ...previous, [activeIndex]: status }))
    if (status === 'known') {
      setKnownPulse(true)
      window.setTimeout(() => setKnownPulse(false), 400)
    }
    if (activeIndex < deck.cards.length - 1) {
      gotoCard(activeIndex + 1)
    }
  }

  const gotoRandomCard = () => {
    if (deck.cards.length <= 1) return
    let next = activeIndex
    while (next === activeIndex) {
      next = Math.floor(Math.random() * deck.cards.length)
    }
    gotoCard(next)
  }

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') moveBy(-1)
      if (event.key === 'ArrowRight') moveBy(1)
      if (event.key === ' ') {
        event.preventDefault()
        setRevealed(previous => !previous)
      }
      if (event.key.toLowerCase() === 'k') markCard('known')
      if (event.key.toLowerCase() === 'r') markCard('review')
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  })

  if (!activeCard) {
    return (
      <div className="flashcards-page">
        <header className="flashcards-header">
          <h1>
            <BookOpenText size={20} /> Daily Flashcards
          </h1>
          <p>No flashcards generated yet for today.</p>
        </header>
      </div>
    )
  }

  return (
    <div className="flashcards-page">
      <header className="flashcards-header">
        <h1>
          <BookOpenText size={20} /> Daily Flashcards
        </h1>
        <p>{deck.targetCount} cards generated today from your performance gaps and weak topics.</p>
        <div className="flashcards-shortcuts">
          <span>Space: flip</span>
          <span>K: know</span>
          <span>R: review</span>
        </div>
      </header>

      <section className="flashcards-kpis">
        <article className="flashcards-kpi glass">
          <h4>Today</h4>
          <p>{deck.dateLabel}</p>
        </article>
        <article className="flashcards-kpi glass">
          <h4>Known</h4>
          <p>{knownCount}</p>
        </article>
        <article className="flashcards-kpi glass">
          <h4>Needs Review</h4>
          <p>{reviewCount}</p>
        </article>
        <article className="flashcards-kpi glass">
          <h4>Deck Progress</h4>
          <p>
            {activeIndex + 1}/{deck.cards.length}
          </p>
        </article>
      </section>

      <section className="card flashcards-progress glass">
        <div className="flashcards-progress__title">
          <h3>
            <Gauge size={16} /> Session Progress
          </h3>
          <strong>{completionPct}% complete</strong>
        </div>
        <div className="flashcards-progress__track" role="progressbar" aria-valuenow={completionPct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${completionPct}%` }} />
        </div>
        {isSessionCompleted ? (
          <div className="flashcards-complete-banner" role="status" aria-live="polite">
            <strong>
              All cards completed
            </strong>
            <p>Session complete. You can shuffle through cards to reinforce recall.</p>
          </div>
        ) : null}
      </section>

      <section className="card flashcards-weak-topics glass">
        <h3>
          <Sparkles size={16} /> Weak-topic priority for today
        </h3>
        <div>
          {deck.weakTopics.length === 0 ? (
            <span className="flashcards-topic-chip">Balanced coverage mode</span>
          ) : (
            deck.weakTopics.map(topic => (
              <span key={topic.topicId} className="flashcards-topic-chip">
                {topic.topicId} • {topic.accuracyPct}%
              </span>
            ))
          )}
        </div>
      </section>

      <section className="flashcards-layout">
        <aside className="card flashcards-deck-list glass">
          <h3>Today&apos;s Cards</h3>
          <div className="flashcards-deck-items">
            {deck.cards.map((card, index) => {
              const status = statusByCardIndex[index] ?? 'new'
              return (
                <button
                  key={`${card.id}-${index}`}
                  className={`flashcards-deck-item ${index === activeIndex ? 'active' : ''}`}
                  onClick={() => gotoCard(index)}
                  type="button"
                >
                  <span>{index + 1}</span>
                  <div>
                    <strong>{card.topicLabel}</strong>
                    <small className={`status-${status}`}>{status}</small>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <article className="card flashcards-viewer glass">
          <div className="flashcards-viewer-head">
            <div>
              <h3>{activeCard.subjectLabel}</h3>
              <p>{activeCard.topicLabel}</p>
            </div>
            <div className="flashcards-viewer-meta">
              <span className={`flashcards-card-state state-${activeCardStatus}`}>{activeCardStatus}</span>
              <button type="button" className="flashcards-reset-btn" onClick={gotoRandomCard}>
                <Shuffle size={14} /> Shuffle
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`flashcards-card-shell ${revealed ? 'revealed' : ''}`}
            onClick={() => setRevealed(previous => !previous)}
          >
            <div className="flashcards-card-face flashcards-card-face--front">
              <span className="flashcards-card-label">Clinical Prompt</span>
              <p className="flashcards-main-text">{activeCard.prompt}</p>
              <div className="flashcards-card-hint">
                <strong>Think first:</strong> recall mechanism, diagnosis cues, and first-step management.
              </div>
              <small className="flashcards-card-tip">Tap card or press Space to reveal the high-yield answer</small>
            </div>
            <div className="flashcards-card-face flashcards-card-face--back">
              <span className="flashcards-card-label">High-Yield Answer</span>
              <p className="flashcards-main-text">{activeCard.answer}</p>
              <div className="flashcards-card-hint success">
                <strong>Retention tip:</strong> say this aloud once, then mark known or review.
              </div>
              <small className="flashcards-card-tip">Tap card again to return to the prompt side</small>
            </div>
          </button>

          <div className="flashcards-actions">
            <button type="button" className="flashcards-nav-btn" onClick={() => moveBy(-1)} disabled={activeIndex === 0}>
              <ChevronLeft size={16} /> Prev
            </button>

            <button type="button" className="flashcards-mark-btn review" onClick={() => markCard('review')}>
              <XCircle size={16} /> Need Review
            </button>
            <button type="button" className={`flashcards-mark-btn known ${knownPulse ? 'pulse' : ''}`} onClick={() => markCard('known')}>
              <CheckCircle2 size={16} /> I Know This
            </button>

            <button
              type="button"
              className="flashcards-nav-btn"
              onClick={() => moveBy(1)}
              disabled={activeIndex === deck.cards.length - 1}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>

          <div className="flashcards-footnote">
            <Target size={14} /> Keep tapping cards until every item is marked today.
          </div>
        </article>
      </section>
    </div>
  )
}
