export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export default async function ApprovalsPage() {
  // Fetch all pending approvals across all projects
  const { data: pendingApprovals } = await supabaseAdmin
    .from('audit_log')
    .select('*, projects!inner(name, slug)')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
    .limit(50)

  const approvals = pendingApprovals || []

  const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }
  const thStyle = { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }
  const tdStyle = { padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>
        ← Portfolio
      </Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 8, marginBottom: 8 }}>Approval Queue</h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>Pending human approvals across all projects</p>

      {approvals.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 16 }}>No pending approvals.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Project</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Agent</th>
              <th style={thStyle}>Tool</th>
              <th style={thStyle}>Operation</th>
              <th style={thStyle}>Session</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((a: Record<string, unknown>) => {
              const project = a.projects as Record<string, string>
              return (
                <tr key={a.id as string}>
                  <td style={tdStyle}>
                    <Link href={`/dashboard/${project.slug}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {project.name}
                    </Link>
                  </td>
                  <td style={tdStyle}>{new Date(a.created_at as string).toLocaleString()}</td>
                  <td style={tdStyle}>{a.agent_id as string}</td>
                  <td style={tdStyle}>{a.tool_name as string}</td>
                  <td style={tdStyle}>{a.operation_type as string}</td>
                  <td style={tdStyle} title={a.session_id as string}>
                    {(a.session_id as string)?.slice(0, 12) || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
