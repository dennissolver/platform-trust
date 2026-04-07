export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  slug: string
}

interface ScanData {
  project_id: string
  overall_grade: string | null
  overall_score: number | null
  agent_safety_score: number | null
  code_security_score: number | null
  cost_governance_score: number | null
  compliance_score: number | null
  critical_count: number | null
  high_count: number | null
  compliance_status: string | null
  created_at: string
}

async function getProjects(): Promise<Project[]> {
  const { data } = await supabaseAdmin.from('projects').select('*').order('name')
  return data || []
}

async function getLatestScans(): Promise<Record<string, ScanData>> {
  const { data } = await supabaseAdmin
    .from('security_scans')
    .select('project_id, overall_grade, overall_score, agent_safety_score, code_security_score, cost_governance_score, compliance_score, critical_count, high_count, compliance_status, created_at')
    .order('created_at', { ascending: false })

  const byProject: Record<string, ScanData> = {}
  for (const scan of (data || []) as ScanData[]) {
    if (!byProject[scan.project_id]) {
      byProject[scan.project_id] = scan
    }
  }
  return byProject
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

function GradeBadge({ grade, score }: { grade: string | null; score: number | null }) {
  if (!grade) {
    return (
      <span style={{ background: '#f3f4f6', color: '#9ca3af', padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
        Not scanned
      </span>
    )
  }
  const colors = GRADE_COLORS[grade] || { bg: '#f3f4f6', text: '#6b7280' }
  return (
    <span style={{ background: colors.bg, color: colors.text, padding: '4px 12px', borderRadius: 6, fontSize: 14, fontWeight: 700 }}>
      {grade} ({score}/100)
    </span>
  )
}

function DimensionBar({ label, score }: { label: string; score: number | null }) {
  const val = score ?? 0
  const color = val >= 80 ? '#22c55e' : val >= 55 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span style={{ width: 65, color: '#6b7280', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${val}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ width: 28, textAlign: 'right', color: '#374151', fontWeight: 500 }}>{val}</span>
    </div>
  )
}

export default async function DashboardPage() {
  const [projects, scans] = await Promise.all([getProjects(), getLatestScans()])

  // Sort: scanned projects first (by score desc), then unscanned
  const sorted = [...projects].sort((a, b) => {
    const sa = scans[a.id]?.overall_score ?? -1
    const sb = scans[b.id]?.overall_score ?? -1
    return sb - sa
  })

  const scannedCount = projects.filter(p => scans[p.id]?.overall_grade).length
  const avgScore = scannedCount > 0
    ? Math.round(projects.reduce((s, p) => s + (scans[p.id]?.overall_score ?? 0), 0) / scannedCount)
    : 0
  const totalCritical = projects.reduce((s, p) => s + (scans[p.id]?.critical_count ?? 0), 0)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Platform Trust</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>Agent Trust Score — portfolio security & compliance</p>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 32, padding: 20, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Projects</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{projects.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Scanned</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{scannedCount}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Avg Score</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{avgScore}/100</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Critical Issues</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: totalCritical > 0 ? '#ef4444' : '#22c55e' }}>{totalCritical}</div>
        </div>
      </div>

      {/* Project cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
        {sorted.map((project) => {
          const scan = scans[project.id]
          return (
            <Link
              key={project.id}
              href={`/dashboard/${project.slug}`}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 20,
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{project.name}</h2>
                <GradeBadge grade={scan?.overall_grade ?? null} score={scan?.overall_score ?? null} />
              </div>

              {scan?.overall_grade ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <DimensionBar label="Safety" score={scan.agent_safety_score} />
                  <DimensionBar label="Code" score={scan.code_security_score} />
                  <DimensionBar label="Cost Gov" score={scan.cost_governance_score} />
                  <DimensionBar label="Comply" score={scan.compliance_score} />
                  {(scan.critical_count ?? 0) > 0 && (
                    <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>
                      {scan.critical_count} critical, {scan.high_count} high findings
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>No scan data — run a trust score scan</p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
