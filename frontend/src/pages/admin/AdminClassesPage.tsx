import { useState, useEffect } from 'react'
import { Plus, BookOpen, X, Users } from 'lucide-react'
import {
  adminGetClasses, adminCreateClass, adminGetEnrollmentsForClass,
  adminEnrollStudent, adminRemoveEnrollment, adminGetTeachers, adminGetProducts,
} from '../../services/lmsApi'
import type { LmsClass, Teacher, Product, StudentEnrollment, CreateClassPayload } from '../../types/lms'
import '../../styles/admin/admin-classes.css'

const MOCK_STUDENTS = [
  { id: 'student-mock-001', name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 'student-mock-002', name: 'Bob Smith', email: 'bob@example.com' },
  { id: 'student-mock-003', name: 'Carol Davis', email: 'carol@example.com' },
  { id: 'student-mock-004', name: 'Dan Wilson', email: 'dan@example.com' },
]

function demoBadge(demoExpiresAt?: string) {
  if (!demoExpiresAt) return <span className="enrollment-demo-chip enrollment-demo-chip--full">Full Access</span>
  const exp = new Date(demoExpiresAt)
  if (exp <= new Date()) return <span className="enrollment-demo-chip enrollment-demo-chip--expired">Expired</span>
  const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return <span className="enrollment-demo-chip enrollment-demo-chip--active">Demo: {days}d</span>
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<LmsClass[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [drawerClassId, setDrawerClassId] = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Create class form
  const [formName, setFormName] = useState('')
  const [formProductId, setFormProductId] = useState('')
  const [formTeacherId, setFormTeacherId] = useState('')
  const [formDuration, setFormDuration] = useState(90)
  const [formDescription, setFormDescription] = useState('')
  const [formError, setFormError] = useState('')

  // Enroll form
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [enrollDemoType, setEnrollDemoType] = useState<'full' | 'demo'>('full')
  const [enrollDemoExpiry, setEnrollDemoExpiry] = useState('')
  const [enrollError, setEnrollError] = useState('')
  const [enrollSubmitting, setEnrollSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([adminGetClasses(), adminGetTeachers(), adminGetProducts()]).then(([cls, tch, prd]) => {
      setClasses(cls)
      setTeachers(tch.filter(t => t.status === 'approved'))
      setProducts(prd)
      if (!formProductId && prd[0]) setFormProductId(prd[0].id)
      if (!formTeacherId && tch.filter(t => t.status === 'approved')[0]) setFormTeacherId(tch.filter(t => t.status === 'approved')[0].id)
    })
  }, [])

  useEffect(() => {
    if (!drawerClassId) return
    adminGetEnrollmentsForClass(drawerClassId).then(setEnrollments)
  }, [drawerClassId])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCreateClass() {
    if (!formName.trim()) { setFormError('Class name is required.'); return }
    if (!formProductId) { setFormError('Product is required.'); return }
    if (!formTeacherId) { setFormError('Teacher is required.'); return }
    setFormError('')
    setSubmitting(true)
    try {
      const payload: CreateClassPayload = {
        productId: formProductId, name: formName.trim(),
        description: formDescription.trim(), teacherId: formTeacherId,
        defaultDurationMinutes: formDuration,
      }
      const newClass = await adminCreateClass(payload)
      setClasses(prev => [...prev, newClass])
      setShowCreateModal(false)
      setFormName(''); setFormDescription(''); setFormError('')
      showToast('Class created ✓')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create class.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEnroll() {
    if (!enrollStudentId || !drawerClassId) { setEnrollError('Select a student.'); return }
    setEnrollError('')
    setEnrollSubmitting(true)
    try {
      const student = MOCK_STUDENTS.find(s => s.id === enrollStudentId)!
      await adminEnrollStudent({
        classId: drawerClassId,
        studentId: enrollStudentId,
        studentName: student.name,
        studentEmail: student.email,
        demoExpiresAt: enrollDemoType === 'demo' && enrollDemoExpiry ? new Date(enrollDemoExpiry).toISOString() : null,
      })
      const updated = await adminGetEnrollmentsForClass(drawerClassId)
      setEnrollments(updated)
      setEnrollStudentId('')
      showToast('Student enrolled ✓')
    } catch (err: unknown) {
      setEnrollError(err instanceof Error ? err.message : 'Failed to enroll student.')
    } finally {
      setEnrollSubmitting(false)
    }
  }

  async function handleRemove(classId: string, studentId: string) {
    await adminRemoveEnrollment(classId, studentId)
    setEnrollments(prev => prev.filter(e => !(e.classId === classId && e.studentId === studentId)))
    showToast('Student removed')
  }

  const drawerClass = classes.find(c => c.id === drawerClassId)

  return (
    <div className="admin-classes-page">
      <div className="admin-classes-header">
        <div>
          <h1>Class Management</h1>
          <p>Create and manage LMS classes and enrollments.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.87rem', cursor: 'pointer' }}
        >
          <Plus size={14} /> Create Class
        </button>
      </div>

      <div className="admin-classes-kpis">
        <article className="admin-classes-kpi"><h4>Total Classes</h4><p>{classes.length}</p></article>
        <article className="admin-classes-kpi"><h4>Total Enrolled</h4><p>{classes.reduce((a, c) => a + c.enrolledStudentIds.length, 0)}</p></article>
        <article className="admin-classes-kpi"><h4>Teachers Active</h4><p>{teachers.length}</p></article>
      </div>

      <div className="admin-classes-table-card">
        <h3>All Classes</h3>
        <div className="admin-classes-table-wrap">
          <table className="admin-classes-table">
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Product</th>
                <th>Teacher</th>
                <th>Enrolled</th>
                <th>Duration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => (
                <tr key={cls.id}>
                  <td style={{ fontWeight: 700, color: '#1E1B4B' }}>{cls.name}</td>
                  <td style={{ fontSize: '0.8rem' }}>{products.find(p => p.id === cls.productId)?.name ?? '—'}</td>
                  <td style={{ fontSize: '0.82rem' }}>{teachers.find(t => t.id === cls.teacherId)?.name ?? '—'}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                      <Users size={11} style={{ color: '#6B7280' }} />
                      {cls.enrolledStudentIds.length}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{cls.defaultDurationMinutes} min</td>
                  <td>
                    <div className="admin-classes-actions">
                      <button
                        className="admin-classes-btn admin-classes-btn--primary"
                        onClick={() => setDrawerClassId(cls.id)}
                      >
                        <Users size={11} /> Enrollments
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {classes.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No classes yet. Create one to get started.</div>}
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="admin-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false) }}>
          <div className="admin-modal">
            <div className="admin-modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <BookOpen size={16} style={{ color: '#3730A3' }} />
                <h3 className="admin-modal__title">Create Class</h3>
              </div>
              <button className="admin-modal__close" onClick={() => setShowCreateModal(false)}><X size={16} /></button>
            </div>
            <div className="admin-modal-field"><label>Class Name *</label><input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Step 1 Cohort B" /></div>
            <div className="admin-modal-field"><label>Product *</label><select value={formProductId} onChange={e => setFormProductId(e.target.value)}>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="admin-modal-field"><label>Teacher *</label><select value={formTeacherId} onChange={e => setFormTeacherId(e.target.value)}>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="admin-modal-field"><label>Default Duration (min)</label><input type="number" min={30} value={formDuration} onChange={e => setFormDuration(Number(e.target.value))} /></div>
            <div className="admin-modal-field"><label>Description (optional)</label><textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Brief class description" style={{ minHeight: 60 }} /></div>
            {formError && <div style={{ fontSize: '0.82rem', color: '#dc2626', marginBottom: 10 }}>{formError}</div>}
            <div className="admin-modal__actions">
              <button className="admin-modal__cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="admin-modal__submit" onClick={handleCreateClass} disabled={submitting}>{submitting ? 'Creating…' : 'Create Class'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Drawer */}
      {drawerClassId && (
        <div className="enrollment-drawer-overlay" onClick={e => { if (e.target === e.currentTarget) setDrawerClassId(null) }}>
          <div className="enrollment-drawer">
            <div className="enrollment-drawer__header">
              <div>
                <h2>Manage Enrollments</h2>
                <p>{drawerClass?.name}</p>
              </div>
              <button className="enrollment-drawer__close" onClick={() => setDrawerClassId(null)}><X size={18} /></button>
            </div>
            <div className="enrollment-drawer__body">
              {/* Current enrollments */}
              <div className="enrollment-section">
                <h3>Current Enrollments ({enrollments.length})</h3>
                {enrollments.length === 0 ? (
                  <p style={{ fontSize: '0.83rem', color: '#9ca3af' }}>No students enrolled yet.</p>
                ) : (
                  enrollments.map(e => {
                    const student = MOCK_STUDENTS.find(s => s.id === e.studentId)
                    return (
                      <div key={e.studentId} className="enrollment-item">
                        <div className="enrollment-item__info">
                          <div className="enrollment-item__name">{student?.name ?? e.studentId}</div>
                          <div className="enrollment-item__meta">
                            Enrolled {new Date(e.enrolledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        {demoBadge(e.demoExpiresAt)}
                        <button className="enrollment-remove-btn" onClick={() => handleRemove(drawerClassId, e.studentId)}>Remove</button>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Enroll new */}
              <div className="enrollment-section">
                <h3>Enroll New Student</h3>
                <div className="enrollment-add-form">
                  <select value={enrollStudentId} onChange={e => setEnrollStudentId(e.target.value)}>
                    <option value="">Select student…</option>
                    {MOCK_STUDENTS.filter(s => !enrollments.some(e => e.studentId === s.id)).map(s => (
                      <option key={s.id} value={s.id}>{s.name} — {s.email}</option>
                    ))}
                  </select>
                  <select value={enrollDemoType} onChange={e => setEnrollDemoType(e.target.value as 'full' | 'demo')}>
                    <option value="full">Full Access</option>
                    <option value="demo">Demo Access (set expiry)</option>
                  </select>
                  {enrollDemoType === 'demo' && (
                    <input type="date" value={enrollDemoExpiry} onChange={e => setEnrollDemoExpiry(e.target.value)} />
                  )}
                  {enrollError && <div style={{ fontSize: '0.78rem', color: '#dc2626' }}>{enrollError}</div>}
                  <button className="enrollment-add-btn" onClick={handleEnroll} disabled={enrollSubmitting}>
                    {enrollSubmitting ? 'Enrolling…' : 'Enroll Student'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1E1B4B', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: '0.87rem', fontWeight: 600, zIndex: 2000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
