'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function approveAction(auditLogId: string, decidedBy: string) {
  const now = new Date()

  // Update audit_log
  const { error: updateError } = await supabaseAdmin
    .from('audit_log')
    .update({
      status: 'completed',
      approved_by: decidedBy,
      approved_at: now.toISOString(),
    })
    .eq('id', auditLogId)
    .eq('status', 'pending_approval')

  if (updateError) throw new Error(updateError.message)

  // Record decision
  const { data: entry } = await supabaseAdmin
    .from('audit_log')
    .select('project_id')
    .eq('id', auditLogId)
    .single()

  if (entry) {
    await supabaseAdmin
      .from('approval_decisions')
      .insert({
        audit_log_id: auditLogId,
        project_id: entry.project_id,
        decision: 'approved',
        decided_by: decidedBy,
      } as never)
  }

  revalidatePath('/dashboard/approvals')
}

export async function rejectAction(auditLogId: string, decidedBy: string, reason?: string) {
  const now = new Date()

  const { error: updateError } = await supabaseAdmin
    .from('audit_log')
    .update({
      status: 'failed',
      approved_by: decidedBy,
      approved_at: now.toISOString(),
    })
    .eq('id', auditLogId)
    .eq('status', 'pending_approval')

  if (updateError) throw new Error(updateError.message)

  const { data: entry } = await supabaseAdmin
    .from('audit_log')
    .select('project_id')
    .eq('id', auditLogId)
    .single()

  if (entry) {
    await supabaseAdmin
      .from('approval_decisions')
      .insert({
        audit_log_id: auditLogId,
        project_id: entry.project_id,
        decision: 'rejected',
        decided_by: decidedBy,
        reason: reason || null,
      } as never)
  }

  revalidatePath('/dashboard/approvals')
}
