export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ project: string }>
}

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  'A': { bg: '#dcfce7', text: '#166534' },
  'A-': { bg: '#dcfce7', text: '#166534' },
  'B+': { bg: '#fef9c3', text: '#854d0e' },
  'B': { bg: '#fef9c3', text: '#854d0e' },
  'B-': { bg: '#fef9c3', text: '#854d0e' },
  'C+': { bg: '#ffedd5', text: '#9a3412' },
  'C': { bg: '#ffedd5', text: '#9a3412' },
  'C-': { bg: '#ffedd5', text: '#9a3412' },
  'D': { bg: '#fee2e2', text: '#991b1b' },
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#991b1b',
  high: '#c2410c',
  medium: '#a16207',
  low: '#6b7280',
}

export default async function ProjectDashboard({ params }: PageProps) {
  const { project: slug } = await params

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!project) notFound()

  const [scanRes, auditRes, permRes, rateLimitRes] = await Promise.all([
    supabaseAdmin
      .from('security_scans')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('audit_log')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(20),
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

  const scans = scanRes.data || []
  const latestScan = scans[0] as Record<string, unknown> | undefined
  const auditLogs = auditRes.data || []
  const permissions = permRes.data || []
  const rateLimits = rateLimitRes.data || []

  const trustScore = latestScan?.agent_trust_score as Record<string, unknown> | undefined
  const findings = (trustScore?.findings || []) as Array<Record<string, unknown>>

  const sectionStyle = { marginBottom: 40 }
  const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }
  const thStyle = { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }
  const tdStyle = { padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>
        ← Portfolio
      </Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 8, marginBottom: 8 }}>{project.name}</h1>

      {/* Trust Score Hero */}
      {latestScan?.overall_grade ? (
        <section style={{ ...sectionStyle, padding: 24, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 12,
              background: (GRADE_COLORS[latestScan.overall_grade as string] || { bg: '#f3f4f6' }).bg,
              color: (GRADE_COLORS[latestScan.overall_grade as string] || { text: '#6b7280' }).text,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 800,
            }}>
              {latestScan.overall_grade as string}
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#6b7280' }}>Agent Trust Score</div>
              <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{latestScan.overall_score as number}<span style={{ fontSize: 16, color: '#9ca3af' }}>/100</span></div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                Scanned {new Date(latestScan.created_at as string).toLocaleDateString()}
              </div>
            </div>

            {/* Badge embed */}
            <div style={{ marginLeft: 'auto' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/badge/${slug}`} alt="Trust Score Badge" style={{ height: 88 }} />
            </div>
          </div>

          {/* Dimension scores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Agent Safety', score: latestScan.agent_safety_score as number, weight: '40%' },
              { label: 'Code Security', score: latestScan.code_security_score as number, weight: '25%' },
              { label: 'Cost Governance', score: latestScan.cost_governance_score as number, weight: '20%' },
              { label: 'Compliance', score: latestScan.compliance_score as number, weight: '15%' },
            ].map((dim) => {
              const color = dim.score >= 80 ? '#22c55e' : dim.score >= 55 ? '#f59e0b' : '#ef4444'
              return (
                <div key={dim.label} style={{ background: 'white', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{dim.label} ({dim.weight})</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color }}>{dim.score}</div>
                  <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${dim.score}%`, height: '100%', background: color, borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <section style={{ ...sectionStyle, padding: 24, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#9ca3af', margin: 0 }}>No trust score scan recorded yet. Run a scan via the API or wait for the scheduled cron.</p>
        </section>
      )}

      {/* Findings */}
      {findings.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
            Findings ({findings.length})
            {(latestScan?.critical_count as number) > 0 && (
              <span style={{ color: '#ef4444', fontSize: 14, marginLeft: 8 }}>
                {latestScan?.critical_count as number} critical
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {findings.map((f, i) => (
              <div key={i} style={{
                padding: 16, borderRadius: 8,
                border: `1px solid ${f.severity === 'critical' ? '#fecaca' : '#e5e7eb'}`,
                background: f.severity === 'critical' ? '#fef2f2' : 'white',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    <span style={{ color: '#9ca3af', marginRight: 6 }}>[{f.id as string}]</span>
                    {f.title as string}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    color: 'white', background: SEVERITY_COLORS[f.severity as string] || '#6b7280',
                  }}>
                    {(f.severity as string).toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>{f.detail as string}</div>
                {(f.remediation as string) ? (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    <strong>Fix:</strong> {f.remediation as string}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Scan History */}
      {scans.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Scan History</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Grade</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Safety</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Cost</th>
                <th style={thStyle}>Comply</th>
                <th style={thStyle}>Type</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan: Record<string, unknown>) => (
                <tr key={scan.id as string}>
                  <td style={tdStyle}>{new Date(scan.created_at as string).toLocaleDateString()}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{(scan.overall_grade as string) || '—'}</td>
                  <td style={tdStyle}>{(scan.overall_score as number) ?? '—'}</td>
                  <td style={tdStyle}>{(scan.agent_safety_score as number) ?? '—'}</td>
                  <td style={tdStyle}>{(scan.code_security_score as number) ?? '—'}</td>
                  <td style={tdStyle}>{(scan.cost_governance_score as number) ?? '—'}</td>
                  <td style={tdStyle}>{(scan.compliance_score as number) ?? '—'}</td>
                  <td style={tdStyle}>{(scan.scan_type as string) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

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
