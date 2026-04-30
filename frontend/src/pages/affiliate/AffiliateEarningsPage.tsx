import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, Wallet } from 'lucide-react'
import { useAffiliateAuth } from '../../context/AffiliateAuthContext'
import { getAffiliateEarnings, getAffiliateProfile } from '../../services/affiliateApi'
import type { AffiliateProfile, EarningsEntry } from '../../types/affiliate'
import '../../styles/affiliate.css'

export default function AffiliateEarningsPage() {
  const { affiliate } = useAffiliateAuth()
  const [profile, setProfile] = useState<AffiliateProfile | null>(null)
  const [earnings, setEarnings] = useState<EarningsEntry[]>([])

  useEffect(() => {
    if (!affiliate) return
    getAffiliateProfile(affiliate.id).then(setProfile)
    getAffiliateEarnings(affiliate.id).then(setEarnings)
  }, [affiliate])

  const totalCommission = earnings.reduce((sum, e) => sum + e.commissionEarned, 0)

  return (
    <div className="affiliate-page">
      <header className="affiliate-page-header">
        <div>
          <h1>Earnings</h1>
          <p>Your full commission ledger — every transaction you've earned from.</p>
        </div>
      </header>

      <section className="affiliate-kpi-grid affiliate-kpi-grid--3">
        <article className="affiliate-kpi-card">
          <div className="affiliate-kpi-icon affiliate-kpi-icon--green">
            <DollarSign size={18} />
          </div>
          <div>
            <p className="affiliate-kpi-label">Pending Payout</p>
            <p className="affiliate-kpi-value">${profile?.pendingBalance?.toFixed(2) ?? '0.00'}</p>
            <p className="affiliate-kpi-sub">Awaiting bank transfer from admin</p>
          </div>
        </article>

        <article className="affiliate-kpi-card">
          <div className="affiliate-kpi-icon affiliate-kpi-icon--blue">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="affiliate-kpi-label">Total Commissions</p>
            <p className="affiliate-kpi-value">${totalCommission.toFixed(2)}</p>
            <p className="affiliate-kpi-sub">Across {earnings.length} transactions</p>
          </div>
        </article>

        <article className="affiliate-kpi-card">
          <div className="affiliate-kpi-icon affiliate-kpi-icon--navy">
            <Wallet size={18} />
          </div>
          <div>
            <p className="affiliate-kpi-label">Total Paid Out</p>
            <p className="affiliate-kpi-value">${profile?.totalPaidOut?.toFixed(2) ?? '0.00'}</p>
            <p className="affiliate-kpi-sub">Lifetime disbursements</p>
          </div>
        </article>
      </section>

      <section className="affiliate-card">
        <h3>Transaction Ledger</h3>
        <p className="affiliate-card-sub">Every commission earned, in chronological order</p>

        {earnings.length === 0 ? (
          <p className="affiliate-empty">No transactions yet. Commissions appear here when referred students make payments.</p>
        ) : (
          <div className="affiliate-table-wrap">
            <table className="affiliate-table affiliate-table--full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Plan</th>
                  <th>Amount Paid</th>
                  <th>Commission ({affiliate?.commissionPct}%)</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((entry, index) => (
                  <tr key={entry.id}>
                    <td className="affiliate-date">{index + 1}</td>
                    <td>{entry.studentName}</td>
                    <td><span className="affiliate-plan-badge">{entry.plan}</span></td>
                    <td className="affiliate-date">${entry.amountPaid.toFixed(2)}</td>
                    <td className="affiliate-amount affiliate-amount--highlight">+${entry.commissionEarned.toFixed(2)}</td>
                    <td className="affiliate-date">{new Date(entry.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, color: '#1E1B4B' }}>Total</td>
                  <td className="affiliate-amount affiliate-amount--highlight">+${totalCommission.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
