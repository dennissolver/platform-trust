import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { scanProject } from '@caistech/agent-trust-score'
import { execSync } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const WEBHOOK_SECRET = process.env.VERCEL_WEBHOOK_SECRET || ''

/**
 * POST /api/webhooks/vercel — Vercel deploy webhook handler.
 *
 * Triggers Layer 1 + Layer 2 scan on successful deployment.
 * Vercel sends deployment.succeeded events.
 *
 * Flow:
 *   1. Verify webhook (check shared secret header)
 *   2. Extract repo info from deployment payload
 *   3. Clone repo, run full scan (static + behavioural)
 *   4. Store results + update badge
 */
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Verify webhook secret (Vercel uses a simple header)
  if (WEBHOOK_SECRET) {
    const token = req.headers.get('x-vercel-signature') ||
      req.headers.get('authorization')?.replace('Bearer ', '')
    if (token !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
    }
  }

  // Vercel deployment payload
  const deployment = body.payload || body
  const status = deployment.state || deployment.readyState || body.type

  // Only process successful deployments
  if (status !== 'READY' && body.type !== 'deployment.succeeded') {
    return NextResponse.json({
      skipped: true,
      reason: `Deployment status: ${status || body.type}`,
    })
  }

  // Extract repo info
  const gitRepo = deployment.meta?.githubRepo ||
    deployment.gitSource?.repoSlug ||
    deployment.name

  if (!gitRepo) {
    return NextResponse.json({
      skipped: true,
      reason: 'No git repo info in deployment payload',
    })
  }

  // Build clone URL
  const gitOrg = deployment.meta?.githubOrg ||
    deployment.gitSource?.org ||
    'Corporate-AI-Solutions'
  const repoUrl = `https://github.com/${gitOrg}/${gitRepo}.git`

  // Look up project
  const slug = gitRepo.toLowerCase()
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, slug')
    .or(`slug.eq.${slug},name.ilike.%${slug}%`)
    .limit(1)
    .single()

  if (!project) {
    return NextResponse.json({
      skipped: true,
      reason: `No project found for repo: ${gitRepo}`,
    })
  }

  let tempDir: string | null = null

  try {
    // Shallow clone
    tempDir = mkdtempSync(join(tmpdir(), 'trust-deploy-scan-'))
    execSync(`git clone --depth 1 ${repoUrl} ${tempDir}`, {
      timeout: 60_000,
      stdio: 'pipe',
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    // Full scan: Layer 1 (static) + Layer 2 (behavioural) on deploy
    const report = await scanProject({
      projectRoot: tempDir,
      projectSlug: project.slug,
      projectId: project.id,
      runBehavioural: true, // Layer 1 + 2 on deploy
      baseUrl,
    })

    // Store results
    const badgeExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin.from('security_scans').insert({
      project_id: project.id,
      scan_type: 'vercel_deploy',
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

    console.log(
      `[webhook/vercel] ${gitRepo} deployed: Grade ${report.overall_grade} (${report.overall_score}/100)`
    )

    return NextResponse.json({
      project_slug: project.slug,
      grade: report.overall_grade,
      score: report.overall_score,
      findings: report.findings.length,
      scan_type: 'deploy',
    })
  } catch (err) {
    console.error(`[webhook/vercel] Scan failed for ${gitRepo}:`, err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 }
    )
  } finally {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true })
      } catch {
        // Best effort cleanup
      }
    }
  }
}
