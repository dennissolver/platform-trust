import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { scanProject } from '@caistech/agent-trust-score'
import type { TrustScoreReport } from '@caistech/agent-trust-score'

/**
 * POST /api/scan — Run an Agent Trust Score scan against a project.
 *
 * Body:
 *   project_slug: string   — project slug in Platform Trust
 *   project_path: string   — absolute path to project root on disk
 *   layer2?: boolean       — run behavioural probes (default: false)
 *
 * Returns: TrustScoreReport JSON
 *
 * Results are stored in security_scans table and badge is updated.
 */
export async function POST(req: NextRequest) {
  try {
    const { project_slug, project_path, layer2 } = await req.json()

    if (!project_slug || !project_path) {
      return NextResponse.json(
        { error: 'project_slug and project_path are required' },
        { status: 400 }
      )
    }

    // Look up project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, slug, name')
      .eq('slug', project_slug)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: `Project not found: ${project_slug}` },
        { status: 404 }
      )
    }

    // Run the scan
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const report = await scanProject({
      projectRoot: project_path,
      projectSlug: project_slug,
      projectId: project.id,
      runBehavioural: layer2 === true,
      baseUrl,
    })

    // Store results in security_scans
    const badgeExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin.from('security_scans').insert({
      project_id: project.id,
      scan_type: 'agent_trust_score',
      compliance_status: report.overall_grade.startsWith('A') || report.overall_grade.startsWith('B')
        ? 'PASS' : report.overall_grade === 'D' ? 'FAIL' : 'REVIEW_REQUIRED',
      findings: report.findings,
      agent_trust_score: report,
      overall_grade: report.overall_grade,
      overall_score: report.overall_score,
      agent_safety_score: report.dimensions.agent_safety.score,
      code_security_score: report.dimensions.code_security.score,
      cost_governance_score: report.dimensions.cost_governance.score,
      compliance_score: report.dimensions.compliance.score,
      critical_count: report.critical_findings,
      high_count: report.high_findings,
      medium_count: report.medium_findings,
      low_count: report.low_findings,
      badge_expires_at: badgeExpiresAt,
    } as never)

    return NextResponse.json(report, { status: 200 })
  } catch (err) {
    console.error('[scan] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/scan?project=slug — Get latest scan result for a project.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('project')

  if (!slug) {
    // Return all latest scores
    const { data } = await supabaseAdmin
      .from('trust_score_latest')
      .select('*')

    return NextResponse.json({ projects: data ?? [] })
  }

  // Single project
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { data: scan } = await supabaseAdmin
    .from('security_scans')
    .select('*')
    .eq('project_id', project.id)
    .not('overall_grade', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!scan) {
    return NextResponse.json({ error: 'No scan results found', project_slug: slug }, { status: 404 })
  }

  return NextResponse.json({
    project_slug: slug,
    overall_grade: scan.overall_grade,
    overall_score: scan.overall_score,
    dimensions: {
      agent_safety: scan.agent_safety_score,
      code_security: scan.code_security_score,
      cost_governance: scan.cost_governance_score,
      compliance: scan.compliance_score,
    },
    findings: scan.findings,
    scan_date: scan.created_at,
    badge_url: `/api/badge/${slug}`,
    report: scan.agent_trust_score,
  })
}
