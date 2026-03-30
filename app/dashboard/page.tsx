export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  slug: string
}

interface ScanSummary {
  project_id: string
  compliance_status: string
}

interface EvalSummary {
  project_id: string
  score: number
  flagged: boolean
}

async function getProjects(): Promise<Project[]> {
  const { data } = await supabaseAdmin
    .from('projects')
    .select('*')
    .order('name')
  return data || []
}

async function getLatestScans(): Promise<Record<string, ScanSummary>> {
  const { data } = await supabaseAdmin
    .from('security_scans')
    .select('project_id, compliance_status, created_at')
    .order('created_at', { ascending: false })

  const byProject: Record<string, ScanSummary> = {}
  for (const scan of data || []) {
    if (!byProject[scan.project_id]) {
      byProject[scan.project_id] = scan
    }
  }
  return byProject
}

async function getLatestEvals(): Promise<Record<string, EvalSummary>> {
  const { data } = await supabaseAdmin
    .from('eval_runs')
    .select('project_id, score, flagged, run_at')
    .order('run_at', { ascending: false })

  const byProject: Record<string, EvalSummary> = {}
  for (const run of data || []) {
    if (!byProject[run.project_id]) {
      byProject[run.project_id] = run
    }
  }
  return byProject
}

function StatusBadge({ status }: { status: string | undefined }) {
  const colors: Record<string, string> = {
    PASS: '#22c55e',
    FAIL: '#ef4444',
    REVIEW_REQUIRED: '#f59e0b',
  }
  const bg = colors[status || ''] || '#6b7280'
  return (
    <span style={{ background: bg, color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
      {status || 'N/A'}
    </span>
  )
}

export default async function DashboardPage() {
  const [projects, scans, evals] = await Promise.all([
    getProjects(),
    getLatestScans(),
    getLatestEvals(),
  ])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Platform Trust</h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>Portfolio compliance, security, and observability</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
        {projects.map((project) => {
          const scan = scans[project.id]
          const evalRun = evals[project.id]
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
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{project.name}</h2>
                <StatusBadge status={scan?.compliance_status} />
              </div>
              <div style={{ display: 'flex', gap: 24, fontSize: 14, color: '#6b7280' }}>
                <div>
                  <span style={{ fontWeight: 500 }}>Eval:</span>{' '}
                  {evalRun ? `${evalRun.score}%` : '—'}
                  {evalRun?.flagged && ' ⚠'}
                </div>
                <div>
                  <span style={{ fontWeight: 500 }}>Slug:</span> {project.slug}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
