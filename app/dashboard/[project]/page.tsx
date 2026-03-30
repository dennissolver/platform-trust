export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ project: string }>
}

export default async function ProjectDashboard({ params }: PageProps) {
  const { project: slug } = await params

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!project) notFound()

  // Fetch all data in parallel
  const [auditRes, scanRes, evalRes, permRes, rateLimitRes] = await Promise.all([
    supabaseAdmin
      .from('audit_log')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('security_scans')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('eval_runs')
      .select('*')
      .eq('project_id', project.id)
      .order('run_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('permission_policies')
      .select('*')
      .eq('project_id', project.id)
      .order('agent_id'),
    supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('project_id', project.id)
      .order('window_type'),
  ])

  const auditLogs = auditRes.data || []
  const scans = scanRes.data || []
  const evalRuns = evalRes.data || []
  const permissions = permRes.data || []
  const rateLimits = rateLimitRes.data || []

  const sectionStyle = { marginBottom: 32 }
  const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }
  const thStyle = { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }
  const tdStyle = { padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>
        ← Portfolio
      </Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 8, marginBottom: 32 }}>{project.name}</h1>

      {/* Audit Log */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Audit Log</h2>
        {auditLogs.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No audit events recorded yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Agent</th>
                <th style={thStyle}>Tool</th>
                <th style={thStyle}>Op</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log: Record<string, string>) => (
                <tr key={log.id}>
                  <td style={tdStyle}>{new Date(log.created_at).toLocaleString()}</td>
                  <td style={tdStyle}>{log.agent_id}</td>
                  <td style={tdStyle}>{log.tool_name}</td>
                  <td style={tdStyle}>{log.operation_type}</td>
                  <td style={tdStyle}>{log.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Security Scans */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Security Scans</h2>
        {scans.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No scans recorded yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Trigger</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan: Record<string, string>) => (
                <tr key={scan.id}>
                  <td style={tdStyle}>{new Date(scan.created_at).toLocaleString()}</td>
                  <td style={tdStyle}>{scan.scan_type}</td>
                  <td style={tdStyle}>{scan.triggered_by}</td>
                  <td style={tdStyle}>{scan.compliance_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Eval Runs */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Eval Runs</h2>
        {evalRuns.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No eval runs recorded yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Agent</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Delta</th>
                <th style={thStyle}>Flagged</th>
              </tr>
            </thead>
            <tbody>
              {evalRuns.map((run: Record<string, string | boolean>) => (
                <tr key={run.id as string}>
                  <td style={tdStyle}>{new Date(run.run_at as string).toLocaleString()}</td>
                  <td style={tdStyle}>{run.agent_id as string}</td>
                  <td style={tdStyle}>{run.score as string}%</td>
                  <td style={tdStyle}>{run.degradation_delta ?? '—'}</td>
                  <td style={tdStyle}>{run.flagged ? 'YES' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Permission Policies */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Permission Policies</h2>
        {permissions.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No policies configured.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Agent</th>
                <th style={thStyle}>Scope</th>
                <th style={thStyle}>Operation</th>
                <th style={thStyle}>Approval</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((p: Record<string, string | boolean>) => (
                <tr key={p.id as string}>
                  <td style={tdStyle}>{p.agent_id as string}</td>
                  <td style={tdStyle}>{p.scope as string}</td>
                  <td style={tdStyle}>{p.operation as string}</td>
                  <td style={tdStyle}>{p.requires_approval ? 'Required' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Rate Limits */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Rate Limits</h2>
        {rateLimits.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No rate limits configured.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Agent</th>
                <th style={thStyle}>Window</th>
                <th style={thStyle}>Max Requests</th>
                <th style={thStyle}>Current</th>
              </tr>
            </thead>
            <tbody>
              {rateLimits.map((rl: Record<string, string | number>) => (
                <tr key={rl.id as string}>
                  <td style={tdStyle}>{rl.agent_id as string}</td>
                  <td style={tdStyle}>{rl.window_type as string}</td>
                  <td style={tdStyle}>{rl.max_requests as number}</td>
                  <td style={tdStyle}>{rl.current_count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
