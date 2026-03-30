export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { ApprovalButtons } from './approval-buttons'

export default async function ApprovalsPage() {
  const { data: pendingApprovals } = await supabaseAdmin
    .from('audit_log')
    .select('*, projects!inner(name, slug)')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
    .limit(50)

  // Also fetch recent decisions for context
  const { data: recentDecisions } = await supabaseAdmin
    .from('approval_decisions')
    .select('*, audit_log!inner(agent_id, tool_name, operation_type), projects!inner(name)')
    .order('decided_at', { ascending: false })
    .limit(20)

  const approvals = pendingApprovals || []
  const decisions = recentDecisions || []
  const now = new Date()

  const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }
  const thStyle = { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }
  const tdStyle = { padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>
        ← Portfolio
      </Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 8, marginBottom: 8 }}>Approval Queue</h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>
        Pending human approvals across all projects. Approvals expire after 24 hours.
      </p>

      {approvals.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 16, marginBottom: 48 }}>No pending approvals.</p>
      ) : (
        <table style={{ ...tableStyle, marginBottom: 48 }}>
          <thead>
            <tr>
              <th style={thStyle}>Project</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Agent</th>
              <th style={thStyle}>Tool</th>
              <th style={thStyle}>Op</th>
              <th style={thStyle}>Expires In</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((a: Record<string, unknown>) => {
              const project = a.projects as Record<string, string>
              const createdAt = new Date(a.created_at as string)
              const hoursRemaining = Math.max(0, 24 - (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
              const hoursDisplay = hoursRemaining <= 0
                ? 'Expired'
                : hoursRemaining < 1
                  ? `${Math.round(hoursRemaining * 60)}m`
                  : `${Math.round(hoursRemaining * 10) / 10}h`

              return (
                <tr key={a.id as string}>
                  <td style={tdStyle}>
                    <Link href={`/dashboard/${project.slug}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {project.name}
                    </Link>
                  </td>
                  <td style={tdStyle}>{createdAt.toLocaleString()}</td>
                  <td style={tdStyle}>{a.agent_id as string}</td>
                  <td style={tdStyle}>{a.tool_name as string}</td>
                  <td style={tdStyle}>{a.operation_type as string}</td>
                  <td style={{ ...tdStyle, color: hoursRemaining < 2 ? '#ef4444' : '#6b7280', fontWeight: 500 }}>
                    {hoursDisplay}
                  </td>
                  <td style={tdStyle}>
                    <ApprovalButtons auditLogId={a.id as string} hoursRemaining={hoursRemaining} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Recent decisions */}
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Recent Decisions</h2>
      {decisions.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>No decisions recorded yet.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Project</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Decision</th>
              <th style={thStyle}>By</th>
              <th style={thStyle}>Tool</th>
              <th style={thStyle}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d: Record<string, unknown>) => {
              const project = d.projects as Record<string, string>
              const audit = d.audit_log as Record<string, string>
              const isApproved = (d.decision as string) === 'approved'
              return (
                <tr key={d.id as string}>
                  <td style={tdStyle}>{project.name}</td>
                  <td style={tdStyle}>{new Date(d.decided_at as string).toLocaleString()}</td>
                  <td style={{ ...tdStyle, color: isApproved ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                    {(d.decision as string).toUpperCase()}
                  </td>
                  <td style={tdStyle}>{d.decided_by as string}</td>
                  <td style={tdStyle}>{audit.tool_name}</td>
                  <td style={tdStyle}>{(d.reason as string) || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
