import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { scanProject } from '@caistech/agent-trust-score'
import { execSync } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || ''

/**
 * POST /api/webhooks/github — GitHub webhook handler.
 *
 * Triggers:
 *   - push to main/master → Layer 1 static scan
 *   - pull_request merged → Layer 1 static scan
 *
 * Flow:
 *   1. Verify webhook signature
 *   2. Shallow clone the repo to a temp dir
 *   3. Run scanProject() (Layer 1 only)
 *   4. Store results + update badge
 *   5. Clean up temp dir
 */
export async function POST(req: NextRequest) {
  const body = await req.text()

  // Verify webhook signature
  if (WEBHOOK_SECRET) {
    const signature = req.headers.get('x-hub-signature-256')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const expected = `sha256=${createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')}`
    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const event = req.headers.get('x-github-event')
  const payload = JSON.parse(body)

  // Only process pushes to main/master or merged PRs
  let repoUrl: string | null = null
  let repoName: string | null = null
  let ref: string | null = null

  if (event === 'push') {
    ref = payload.ref as string
    if (!ref?.endsWith('/main') && !ref?.endsWith('/master')) {
      return NextResponse.json({ skipped: true, reason: 'Not main/master branch' })
    }
    repoUrl = payload.repository?.clone_url
    repoName = payload.repository?.full_name
  } else if (event === 'pull_request') {
    if (payload.action !== 'closed' || !payload.pull_request?.merged) {
      return NextResponse.json({ skipped: true, reason: 'PR not merged' })
    }
    repoUrl = payload.repository?.clone_url
    repoName = payload.repository?.full_name
  } else {
    return NextResponse.json({ skipped: true, reason: `Unhandled event: ${event}` })
  }

  if (!repoUrl || !repoName) {
    return NextResponse.json({ error: 'Could not determine repo URL' }, { status: 400 })
  }

  // Look up project by repo name (match against projects table)
  const slug = repoName.split('/').pop()?.toLowerCase() || ''
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, slug')
    .eq('slug', slug)
    .single()

  if (!project) {
    // Try matching by name
    const { data: projectByName } = await supabaseAdmin
      .from('projects')
      .select('id, slug')
      .ilike('name', `%${slug}%`)
      .limit(1)
      .single()

    if (!projectByName) {
      return NextResponse.json({
        skipped: true,
        reason: `No project found for repo: ${repoName}`,
      })
    }

    return await runScan(projectByName, repoUrl, repoName)
  }

  return await runScan(project, repoUrl, repoName)
}

async function runScan(
  project: { id: string; slug: string },
  repoUrl: string,
  repoName: string
) {
  let tempDir: string | null = null

  try {
    // Shallow clone to temp directory
    tempDir = mkdtempSync(join(tmpdir(), 'trust-scan-'))
    execSync(`git clone --depth 1 ${repoUrl} ${tempDir}`, {
      timeout: 60_000,
      stdio: 'pipe',
    })

    // Run Layer 1 static scan
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const report = await scanProject({
      projectRoot: tempDir,
      projectSlug: project.slug,
      projectId: project.id,
      runBehavioural: false, // Layer 1 only on PR merge
      baseUrl,
    })

    // Store results
    const badgeExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin.from('security_scans').insert({
      project_id: project.id,
      scan_type: 'github_webhook',
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
      `[webhook/github] ${repoName}: Grade ${report.overall_grade} (${report.overall_score}/100)`
    )

    return NextResponse.json({
      project_slug: project.slug,
      grade: report.overall_grade,
      score: report.overall_score,
      findings: report.findings.length,
    })
  } catch (err) {
    console.error(`[webhook/github] Scan failed for ${repoName}:`, err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 }
    )
  } finally {
    // Clean up temp directory
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true })
      } catch {
        // Best effort cleanup
      }
    }
  }
}
