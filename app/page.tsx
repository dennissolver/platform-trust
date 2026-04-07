export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'A': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  'A-': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  'B+': { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  'B': { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  'B-': { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  'C+': { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  'C': { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  'C-': { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  'D': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
}

interface ScanRow {
  project_id: string
  overall_grade: string
  overall_score: number
  agent_safety_score: number
  code_security_score: number
  cost_governance_score: number
  compliance_score: number
  created_at: string
}

interface ProjectRow {
  id: string
  name: string
  slug: string
}

export default async function PublicPage() {
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, name, slug')
    .order('name')

  // Get latest scan per project
  const { data: allScans } = await supabaseAdmin
    .from('security_scans')
    .select('project_id, overall_grade, overall_score, agent_safety_score, code_security_score, cost_governance_score, compliance_score, created_at')
    .not('overall_grade', 'is', null)
    .order('created_at', { ascending: false })

  const scanMap = new Map<string, ScanRow>()
  for (const scan of (allScans || []) as ScanRow[]) {
    if (!scanMap.has(scan.project_id)) scanMap.set(scan.project_id, scan)
  }

  const scannedProjects = (projects || [])
    .filter((p: ProjectRow) => scanMap.has(p.id))
    .sort((a: ProjectRow, b: ProjectRow) => (scanMap.get(b.id)?.overall_score ?? 0) - (scanMap.get(a.id)?.overall_score ?? 0))

  const totalProjects = scannedProjects.length
  const avgScore = totalProjects > 0
    ? Math.round(scannedProjects.reduce((s: number, p: ProjectRow) => s + (scanMap.get(p.id)?.overall_score ?? 0), 0) / totalProjects)
    : 0
  const gradeA = scannedProjects.filter((p: ProjectRow) => scanMap.get(p.id)?.overall_grade?.startsWith('A')).length
  const gradeB = scannedProjects.filter((p: ProjectRow) => scanMap.get(p.id)?.overall_grade?.startsWith('B')).length
  const gradeC = scannedProjects.filter((p: ProjectRow) => {
    const g = scanMap.get(p.id)?.overall_grade
    return g?.startsWith('C')
  }).length
  const gradeD = scannedProjects.filter((p: ProjectRow) => scanMap.get(p.id)?.overall_grade === 'D').length

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      {/* Hero */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #22c55e, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>
            PT
          </div>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500, letterSpacing: 1.5, textTransform: 'uppercase' }}>Platform Trust</span>
        </div>

        <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 16, maxWidth: 700 }}>
          Agent Trust Score for every project in the portfolio
        </h1>
        <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 600, lineHeight: 1.6, marginBottom: 40 }}>
          Automated security scoring across 4 dimensions: Agent Safety, Code Security, Cost Governance, and Compliance. Scanned on every deploy.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 64 }}>
          {[
            { label: 'Projects Scanned', value: totalProjects },
            { label: 'Portfolio Average', value: `${avgScore}/100` },
            { label: 'Grade A', value: gradeA, color: '#22c55e' },
            { label: 'Grade B', value: gradeB, color: '#eab308' },
            { label: 'Grade C', value: gradeC, color: '#f97316' },
            { label: 'Grade D', value: gradeD, color: '#ef4444' },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize: 36, fontWeight: 800, color: stat.color || 'white' }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Portfolio Scores</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {scannedProjects.map((project: ProjectRow) => {
            const scan = scanMap.get(project.id)!
            const grade = scan.overall_grade
            const colors = GRADE_COLORS[grade] || { bg: '#1e293b', text: '#94a3b8', border: '#334155' }

            return (
              <div
                key={project.id}
                style={{
                  background: '#1e293b',
                  borderRadius: 12,
                  padding: 24,
                  border: `1px solid #334155`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{project.name}</h3>
                  <div style={{
                    background: colors.bg,
                    color: colors.text,
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 800,
                  }}>
                    {grade}
                  </div>
                </div>

                {/* Score bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    <span>Overall Score</span>
                    <span>{scan.overall_score}/100</span>
                  </div>
                  <div style={{ height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${scan.overall_score}%`,
                      height: '100%',
                      background: scan.overall_score >= 80 ? '#22c55e' : scan.overall_score >= 55 ? '#f59e0b' : '#ef4444',
                      borderRadius: 3,
                    }} />
                  </div>
                </div>

                {/* Dimension scores */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                  {[
                    { label: 'Agent Safety', score: scan.agent_safety_score },
                    { label: 'Code Security', score: scan.code_security_score },
                    { label: 'Cost Gov', score: scan.cost_governance_score },
                    { label: 'Compliance', score: scan.compliance_score },
                  ].map((dim) => (
                    <div key={dim.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>{dim.label}</span>
                      <span style={{
                        fontWeight: 600,
                        color: dim.score >= 80 ? '#22c55e' : dim.score >= 55 ? '#f59e0b' : '#ef4444',
                      }}>
                        {dim.score}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Badge embed link */}
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #334155', fontSize: 11, color: '#475569' }}>
                  Badge: <code style={{ color: '#64748b' }}>/api/badge/{project.slug}</code>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
          <span>Platform Trust by Corporate AI Solutions</span>
          <Link href="/dashboard" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            Dashboard &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
