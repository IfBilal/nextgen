import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, ShieldCheck } from 'lucide-react'
import { ADMIN_STUDENT_OPS_DATA } from '../../data/adminStudentOps'
import { useBillingSettingsForAdmin } from '../../context/SubscriptionContext'
import { adminGetDemoOverrides, adminSetDemoOverride } from '../../services/lmsApi'
import type { DemoOverride } from '../../types/lms'
import '../../styles/admin-student-ops.css'

export default function AdminStudentsPage() {
  const { billingSettings } = useBillingSettingsForAdmin()
  const students = ADMIN_STUDENT_OPS_DATA

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudentRowKey, setSelectedStudentRowKey] = useState(
    ADMIN_STUDENT_OPS_DATA[0] ? `${ADMIN_STUDENT_OPS_DATA[0].id}-${ADMIN_STUDENT_OPS_DATA[0].email}-0` : '',
  )

  const tierIds = useMemo(() => ['demo', ...billingSettings.plans.map(plan => plan.id)], [billingSettings.plans])
  const defaultPaidTier = useMemo(() => billingSettings.plans[0]?.id ?? 'demo', [billingSettings.plans])
  const tierFilters = useMemo(() => ['all', ...tierIds], [tierIds])
  const [tierFilter, setTierFilter] = useState<(typeof tierFilters)[number]>('all')

  const cohortOptions = useMemo(() => ['all', ...new Set(students.map(student => student.cohort))], [students])
  const [cohortFilter, setCohortFilter] = useState<(typeof cohortOptions)[number]>('all')

  const resolveTierId = useCallback(
    (subscription: string) => {
      const normalized = subscription.trim().toLowerCase()
      if (tierIds.includes(normalized)) return normalized
      if (normalized === 'trial') return 'demo'

      if (normalized === 'active' || normalized === 'past_due' || normalized === 'canceled') {
        return defaultPaidTier
      }

      return defaultPaidTier
    },
    [tierIds, defaultPaidTier],
  )

  const studentsWithTier = useMemo(
    () =>
      students.map((student, index) => ({
        ...student,
        rowKey: `${student.id}-${student.email}-${index}`,
        resolvedTier: resolveTierId(student.subscription),
      })),
    [students, resolveTierId],
  )

  const filteredStudents = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase()

    return studentsWithTier.filter(student => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        student.name.toLowerCase().includes(normalizedQuery) ||
        student.email.toLowerCase().includes(normalizedQuery)

      const matchesTier = tierFilter === 'all' || student.resolvedTier === tierFilter
      const matchesCohort = cohortFilter === 'all' || student.cohort === cohortFilter

      return matchesSearch && matchesTier && matchesCohort
    })
  }, [studentsWithTier, searchTerm, tierFilter, cohortFilter])

  const activeStudentRowKey =
    filteredStudents.some(student => student.rowKey === selectedStudentRowKey)
      ? selectedStudentRowKey
      : (filteredStudents[0]?.rowKey ?? '')

  const selectedStudent = useMemo(
    () => studentsWithTier.find(student => student.rowKey === activeStudentRowKey) ?? null,
    [studentsWithTier, activeStudentRowKey],
  )

  // Demo override state
  const [overrides, setOverrides] = useState<DemoOverride[]>([])
  const [overrideModal, setOverrideModal] = useState<{ studentId: string; studentName: string; studentEmail: string } | null>(null)
  const [overrideType, setOverrideType] = useState<'extend' | 'full_access' | 'reset'>('extend')
  const [extendDays, setExtendDays] = useState(7)
  const [overrideSubmitting, setOverrideSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    adminGetDemoOverrides().then(setOverrides)
  }, [])

  function getOverrideStatus(studentId: string): string {
    const o = overrides.find(x => x.studentId === studentId)
    if (!o) return '—'
    if (!o.demoExpiresAt) return 'Full Access'
    const exp = new Date(o.demoExpiresAt)
    if (exp <= new Date()) return 'Expired'
    return `Until ${exp.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleOverrideSubmit() {
    if (!overrideModal) return
    setOverrideSubmitting(true)
    const action =
      overrideType === 'extend'
        ? { type: 'extend' as const, days: extendDays }
        : overrideType === 'full_access'
        ? { type: 'full_access' as const }
        : { type: 'reset' as const }
    await adminSetDemoOverride(overrideModal.studentId, overrideModal.studentName, overrideModal.studentEmail, action)
    const updated = await adminGetDemoOverrides()
    setOverrides(updated)
    setOverrideSubmitting(false)
    setOverrideModal(null)
    showToast('Demo access updated ✓')
  }

  const kpis = useMemo(() => {
    const tierCounts = tierIds.reduce<Record<string, number>>((accumulator, tierId) => {
      accumulator[tierId] = 0
      return accumulator
    }, {})

    studentsWithTier.forEach(student => {
      tierCounts[student.resolvedTier] = (tierCounts[student.resolvedTier] ?? 0) + 1
    })

    return {
      total: students.length,
      tierCounts,
    }
  }, [studentsWithTier, students.length, tierIds])

  return (
    <div className="admin-students-page">
      <header className="admin-students-header">
        <h1>Student Insights</h1>
        <p>Overview of total students and distribution across tiers.</p>
      </header>

      <section className="admin-students-kpis">
        <article className="admin-students-kpi">
          <h4>Total Students</h4>
          <p>{kpis.total}</p>
        </article>
        {tierIds.map(tierId => (
          <article className="admin-students-kpi" key={tierId}>
            <h4>{tierId.charAt(0).toUpperCase() + tierId.slice(1)}</h4>
            <p>{kpis.tierCounts[tierId] ?? 0}</p>
          </article>
        ))}
      </section>

      <section className="admin-students-filters card">
        <label className="admin-students-input">
          <Search size={16} />
          <input
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Search by name or email"
          />
        </label>

        <select value={tierFilter} onChange={event => setTierFilter(event.target.value as typeof tierFilter)}>
          {tierFilters.map(option => (
            <option key={option} value={option}>
              Tier: {option}
            </option>
          ))}
        </select>

        <select value={cohortFilter} onChange={event => setCohortFilter(event.target.value)}>
          {cohortOptions.map(option => (
            <option key={option} value={option}>
              Cohort: {option}
            </option>
          ))}
        </select>
      </section>

      <section className="admin-students-grid">
        <article className="card admin-students-table-card">
          <h3>Student Directory</h3>
          <p>{filteredStudents.length} matching students</p>

          <div className="admin-students-table-wrap">
            <table className="admin-students-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Cohort</th>
                  <th>Tier</th>
                  <th>Avg Score</th>
                  <th>Last Active</th>
                  <th>Demo Access</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr
                    key={student.rowKey}
                    className={student.rowKey === activeStudentRowKey ? 'selected' : ''}
                    onClick={() => setSelectedStudentRowKey(student.rowKey)}
                  >
                    <td>
                      <strong>{student.name}</strong>
                      <span>{student.email}</span>
                    </td>
                    <td>{student.cohort}</td>
                    <td>{student.resolvedTier}</td>
                    <td>{student.avgScore}%</td>
                    <td>{student.lastActive}</td>
                    <td style={{ fontSize: '0.8rem', color: '#6B7280' }}>{getOverrideStatus(student.id)}</td>
                    <td>
                      <button
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 600, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={e => {
                          e.stopPropagation()
                          setOverrideType('extend')
                          setExtendDays(7)
                          setOverrideModal({ studentId: student.id, studentName: student.name, studentEmail: student.email })
                        }}
                      >
                        <ShieldCheck size={12} />
                        Override Demo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredStudents.length === 0 ? <div className="admin-students-empty">No students match current filters.</div> : null}
          </div>
        </article>

        <article className="card admin-students-detail-card">
          {selectedStudent ? (
            <>
              <header className="admin-students-detail-header">
                <div>
                  <h3>{selectedStudent.name}</h3>
                  <p>{selectedStudent.email}</p>
                </div>
                <span className="ops-chip">Tier: {selectedStudent.resolvedTier}</span>
              </header>

              <div className="admin-students-meta">
                <span>Cohort: {selectedStudent.cohort}</span>
                <span>Roadmap: {selectedStudent.roadmapStage}</span>
                <span>Phone: {selectedStudent.phone}</span>
              </div>

              <div className="admin-students-progress-grid">
                <div>
                  <label>Video Progress</label>
                  <div className="ops-progress"><span style={{ width: `${selectedStudent.videoProgress}%` }} /></div>
                </div>
                <div>
                  <label>PDF Progress</label>
                  <div className="ops-progress"><span style={{ width: `${selectedStudent.pdfProgress}%` }} /></div>
                </div>
                <div>
                  <label>Test Completion</label>
                  <div className="ops-progress"><span style={{ width: `${selectedStudent.testCompletion}%` }} /></div>
                </div>
              </div>
            </>
          ) : (
            <p className="admin-students-empty-inline">Select a student to view insights.</p>
          )}
        </article>
      </section>
      {/* Demo Override Modal */}
      {overrideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '28px 28px 24px', width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <ShieldCheck size={18} style={{ color: '#3730A3' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1E1B4B' }}>Override Demo Access</h3>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '0.83rem', color: '#6B7280' }}>
              {overrideModal.studentName} &mdash; {overrideModal.studentEmail}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {(['extend', 'full_access', 'reset'] as const).map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `1px solid ${overrideType === opt ? '#3730A3' : '#E0E7FF'}`, borderRadius: 8, cursor: 'pointer', background: overrideType === opt ? '#EEF2FF' : '#fff' }}>
                  <input type="radio" name="overrideType" checked={overrideType === opt} onChange={() => setOverrideType(opt)} style={{ accentColor: '#3730A3' }} />
                  <span style={{ fontSize: '0.87rem', fontWeight: 600, color: '#1E1B4B' }}>
                    {opt === 'extend' ? 'Extend by days' : opt === 'full_access' ? 'Grant Full Access' : 'Reset to Expired'}
                  </span>
                </label>
              ))}
            </div>

            {overrideType === 'extend' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Number of days (1–30)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={extendDays}
                  onChange={e => setExtendDays(Math.min(30, Math.max(1, Number(e.target.value))))}
                  style={{ padding: '8px 12px', border: '1px solid #C7D2FE', borderRadius: 8, fontSize: '0.9rem', width: 100 }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setOverrideModal(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E0E7FF', background: '#fff', color: '#6B7280', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideSubmit}
                disabled={overrideSubmitting}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3730A3', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', opacity: overrideSubmitting ? 0.6 : 1 }}
              >
                {overrideSubmitting ? 'Saving…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1E1B4B', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: '0.87rem', fontWeight: 600, zIndex: 2000, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
