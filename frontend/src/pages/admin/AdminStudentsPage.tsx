import { useCallback, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ADMIN_STUDENT_OPS_DATA } from '../../data/adminStudentOps'
import { useBillingSettingsForAdmin } from '../../context/SubscriptionContext'
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
    </div>
  )
}
