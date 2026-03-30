'use client'

import { useState } from 'react'
import { approveAction, rejectAction } from './actions'

export function ApprovalButtons({ auditLogId, hoursRemaining }: { auditLogId: string; hoursRemaining: number }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [result, setResult] = useState<string | null>(null)

  const isExpired = hoursRemaining <= 0

  async function handleApprove() {
    setStatus('loading')
    try {
      await approveAction(auditLogId, 'dashboard-admin')
      setResult('Approved')
      setStatus('done')
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Failed')
      setStatus('idle')
    }
  }

  async function handleReject() {
    setStatus('loading')
    try {
      await rejectAction(auditLogId, 'dashboard-admin', 'Rejected via dashboard')
      setResult('Rejected')
      setStatus('done')
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Failed')
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <span style={{ fontSize: 12, fontWeight: 600, color: result === 'Approved' ? '#22c55e' : '#ef4444' }}>
        {result}
      </span>
    )
  }

  if (isExpired) {
    return <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Expired</span>
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        onClick={handleApprove}
        disabled={status === 'loading'}
        style={{
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          background: '#22c55e',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: status === 'loading' ? 'wait' : 'pointer',
          opacity: status === 'loading' ? 0.6 : 1,
        }}
      >
        Approve
      </button>
      <button
        onClick={handleReject}
        disabled={status === 'loading'}
        style={{
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: status === 'loading' ? 'wait' : 'pointer',
          opacity: status === 'loading' ? 0.6 : 1,
        }}
      >
        Reject
      </button>
    </div>
  )
}
