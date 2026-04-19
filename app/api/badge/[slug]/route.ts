import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateBadgeSvg } from '@/lib/compliance'
import {
  renderBadge,
  renderExpiredBadge,
} from '@caistech/agent-trust-score'
import type { TrustScoreReport, Grade, DimensionScore, Dimension } from '@caistech/agent-trust-score'

// GET /api/badge/[slug] — public compliance badge SVG
// Returns trust score badge if available, falls back to legacy badge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Look up project by slug
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!project) {
    const svg = generateBadgeSvg('FAIL')
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
      },
    })
  }

  // Get latest security scan with trust score
  const { data: scan } = await supabaseAdmin
    .from('security_scans')
    .select('compliance_status, overall_grade, overall_score, agent_safety_score, code_security_score, cost_governance_score, compliance_score, badge_expires_at, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // If trust score exists and badge hasn't expired, render trust badge
  if (scan?.overall_grade) {
    const expired = scan.badge_expires_at && new Date(scan.badge_expires_at) < new Date()

    if (expired) {
      const svg = renderExpiredBadge(slug)
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache',
        },
      })
    }

    const report: TrustScoreReport = {
      project_slug: slug,
      scan_date: scan.created_at,
      overall_grade: scan.overall_grade as Grade,
      overall_score: scan.overall_score,
      dimensions: {
        agent_safety: { dimension: 'agent_safety', score: scan.agent_safety_score ?? 0, grade: scoreToGrade(scan.agent_safety_score ?? 0), criteria: [] },
        code_security: { dimension: 'code_security', score: scan.code_security_score ?? 0, grade: scoreToGrade(scan.code_security_score ?? 0), criteria: [] },
        cost_governance: { dimension: 'cost_governance', score: scan.cost_governance_score ?? 0, grade: scoreToGrade(scan.cost_governance_score ?? 0), criteria: [] },
        compliance: { dimension: 'compliance', score: scan.compliance_score ?? 0, grade: scoreToGrade(scan.compliance_score ?? 0), criteria: [] },
      },
      critical_findings: 0,
      high_findings: 0,
      medium_findings: 0,
      low_findings: 0,
      findings: [],
      badge_url: '',
      report_url: '',
    }

    const svg = renderBadge(report)
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
      },
    })
  }

  // Fallback to legacy badge
  const status = (scan?.compliance_status as 'PASS' | 'FAIL' | 'REVIEW_REQUIRED') || 'REVIEW_REQUIRED'
  const svg = generateBadgeSvg(status)

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

function scoreToGrade(score: number): Grade {
  if (score >= 95) return 'A'
  if (score >= 90) return 'A-'
  if (score >= 85) return 'B+'
  if (score >= 80) return 'B'
  if (score >= 75) return 'B-'
  if (score >= 65) return 'C+'
  if (score >= 55) return 'C'
  if (score >= 45) return 'C-'
  return 'D'
}
