// Compliance report generator
// Generates structured compliance data for PDF/badge rendering

export interface ComplianceReport {
  projectSlug: string
  generatedAt: string
  overallStatus: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED'
  modules: {
    security: ModuleStatus
    permissions: ModuleStatus
    auditLog: ModuleStatus
    rateLimiting: ModuleStatus
  }
  findings: ComplianceFinding[]
}

export interface ModuleStatus {
  status: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | 'NOT_CONFIGURED'
  details: string
}

export interface ComplianceFinding {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  description: string
  recommendation: string
}

export function generateBadgeSvg(status: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED'): string {
  const colors = {
    PASS: '#22c55e',
    FAIL: '#ef4444',
    REVIEW_REQUIRED: '#f59e0b',
  }
  const labels = {
    PASS: 'passing',
    FAIL: 'failing',
    REVIEW_REQUIRED: 'review required',
  }

  const color = colors[status]
  const label = labels[status]
  const labelWidth = label.length * 7 + 10
  const totalWidth = 90 + labelWidth

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h90v20H0z"/>
    <path fill="${color}" d="M90 0h${labelWidth}v20H90z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="45" y="15" fill="#010101" fill-opacity=".3">compliance</text>
    <text x="45" y="14">compliance</text>
    <text x="${90 + labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${90 + labelWidth / 2}" y="14">${label}</text>
  </g>
</svg>`
}
