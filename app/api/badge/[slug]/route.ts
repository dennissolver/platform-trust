import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateBadgeSvg } from '@/lib/compliance'

// GET /api/badge/[slug] — public compliance badge SVG
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

  // Get latest security scan
  const { data: scan } = await supabaseAdmin
    .from('security_scans')
    .select('compliance_status')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const status = (scan?.compliance_status as 'PASS' | 'FAIL' | 'REVIEW_REQUIRED') || 'REVIEW_REQUIRED'
  const svg = generateBadgeSvg(status)

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300', // 5 min cache
    },
  })
}
