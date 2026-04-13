import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, AlertCircle, Settings, PlayCircle } from 'lucide-react'
import { EXAM_TAXONOMY } from '../../../data/examTaxonomy'
import { mockRoadmapContext, type TestBlueprint } from '../../../data/createTest'
import { useSubscription } from '../../../context/SubscriptionContext'

export default function AutoTestBuilder() {
  const navigate = useNavigate()
  const { canStartMockExam, recordDemoMockUsage, snapshot } = useSubscription()
  const [isCustom, setIsCustom] = useState(false)
  const [questionCount, setQuestionCount] = useState(mockRoadmapContext.questionCount)

  const [subjectId, setSubjectId] = useState(mockRoadmapContext.subjectId)
  const [topicId, setTopicId] = useState(mockRoadmapContext.topicId)

  const examId = mockRoadmapContext.examId
  const effectiveQuestionCount = isCustom ? questionCount : mockRoadmapContext.questionCount
  const effectiveSubjectId = isCustom ? subjectId : mockRoadmapContext.subjectId
  const effectiveTopicId = isCustom ? topicId : mockRoadmapContext.topicId

  const selectedExam = useMemo(
    () => EXAM_TAXONOMY.find(item => item.id === examId) ?? EXAM_TAXONOMY[0],
    [examId],
  )

  const selectedSubject = useMemo(
    () => selectedExam.subjects.find(item => item.id === effectiveSubjectId) ?? selectedExam.subjects[0],
    [selectedExam, effectiveSubjectId],
  )

  const selectedTopic = useMemo(
    () => selectedSubject.topics.find(item => item.id === effectiveTopicId) ?? selectedSubject.topics[0],
    [selectedSubject, effectiveTopicId],
  )

  const selectedBlueprint: TestBlueprint = {
    examId: selectedExam.id,
    examLabel: selectedExam.label,
    subjectId: selectedSubject.id,
    subjectLabel: selectedSubject.label,
    topicId: selectedTopic.id,
    topicLabel: selectedTopic.label,
    questionCount: effectiveQuestionCount,
    mode: 'Timed',
    testType: isCustom ? 'custom' : 'roadmap',
  }

  const handleSubjectChange = (nextSubjectId: string) => {
    const subject = selectedExam.subjects.find(item => item.id === nextSubjectId)
    if (!subject) return
    setSubjectId(subject.id)
    setTopicId(subject.topics[0].id)
  }

  const handleStart = () => {
    if (!canStartMockExam()) {
      navigate('/student/upgrade')
      return
    }

    recordDemoMockUsage()
    navigate('/student/test-session', {
      state: {
        testBlueprint: selectedBlueprint,
      },
    })
  }

  return (
    <div className="card builder-card">
      <div className="builder-header">
        <div className="builder-title">
          <BookOpen size={24} className="text-primary" />
          <h2>{selectedExam.label} Practice Session</h2>
        </div>
        <div className="builder-toggle">
          <span className={!isCustom ? 'active-label' : 'muted-label'}>Roadmap Match</span>
          <label className="switch">
            <input type="checkbox" checked={isCustom} onChange={() => setIsCustom(previous => !previous)} />
            <span className="slider round"></span>
          </label>
          <span className={isCustom ? 'active-label' : 'muted-label'}>Custom</span>
        </div>
      </div>

      {!isCustom ? (
        <div className="roadmap-context-banner">
          <div className="banner-icon"><AlertCircle size={24} /></div>
          <div>
            <h4>Auto-configured for Today's Plan</h4>
            <p>
              We&apos;ve mapped this session to target <strong>{selectedSubject.label}: {selectedTopic.label}</strong>
              {' '}for <strong>{selectedExam.label}</strong> based on your Day {mockRoadmapContext.currentDay} roadmap constraints.
            </p>
          </div>
        </div>
      ) : (
        <div className="custom-context-banner">
          <div className="banner-icon"><Settings size={24} /></div>
          <div>
            <h4>Custom Test Mode</h4>
            <p>You have unlinked from the roadmap. Select subject, topic, and session length below.</p>
          </div>
        </div>
      )}

      {isCustom && (
        <>
          <div className="form-group">
            <label htmlFor="test-exam">Exam</label>
            <select id="test-exam" className="taxonomy-select" value={examId} disabled>
              <option value={selectedExam.id}>{selectedExam.label}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="test-subject">Subject</label>
            <select
              id="test-subject"
              className="taxonomy-select"
              value={selectedSubject.id}
              onChange={event => handleSubjectChange(event.target.value)}
            >
              {selectedExam.subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="test-topic">Topic</label>
            <select
              id="test-topic"
              className="taxonomy-select"
              value={selectedTopic.id}
              onChange={event => setTopicId(event.target.value)}
            >
              {selectedSubject.topics.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {topic.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="form-group">
        <label>Selection Snapshot</label>
        <div className="subject-chips">
          <span className="subject-chip active">{selectedExam.label}</span>
          <span className="subject-chip active">{selectedSubject.label}</span>
          <span className="subject-chip active">{selectedTopic.label}</span>
          <span className="subject-chip">{selectedBlueprint.testType}</span>
        </div>
      </div>

      {isCustom && (
        <div className="form-group">
          <label>Number of Questions</label>
          <div className="range-container">
            <input
              type="range"
              min="10" max="100" step="10"
              value={questionCount}
              onChange={event => setQuestionCount(Number(event.target.value))}
            />
            <span className="range-val">{questionCount}</span>
          </div>
        </div>
      )}

      {snapshot?.entitlement.currentPlan === 'demo' ? (
        <div className="roadmap-context-banner" style={{ marginTop: 12 }}>
          <div className="banner-icon"><AlertCircle size={24} /></div>
          <div>
            <h4>Demo Trial Access</h4>
            <p>
              You have used <strong>{snapshot.entitlement.mockExamsUsedInDemo}/1</strong> full mock exam in demo.
              Upgrade to unlock the full mock exam library.
            </p>
          </div>
        </div>
      ) : null}

      <button className="btn btn-primary start-btn" onClick={handleStart} disabled={!canStartMockExam()}>
        <PlayCircle size={20} />
        {canStartMockExam() ? `Start ${isCustom ? 'Custom' : 'Roadmap'} Test` : 'Demo mock limit reached'}
      </button>
    </div>
  )
}
