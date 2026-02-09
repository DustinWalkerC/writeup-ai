'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase, Report, ReportFile, QuestionnaireData } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  )
}

function stringifyError(err: unknown) {
  try {
    return JSON.stringify(err, null, 2)
  } catch {
    return String(err)
  }
}

// ===================
// Report CRUD
// ===================

export async function getReports() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('reports')
    .select(
      `
      *,
      property:properties(*)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getReports error:', error)
    throw new Error(`getReports failed: ${stringifyError(error)}`)
  }

  return data as (Report & { property: Report['property'] })[]
}

export async function getReport(id: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  if (!isUuid(id)) {
    console.error('getReport called with non-UUID id:', id)
    throw new Error(`getReport invalid id (expected UUID): ${id}`)
  }

  const { data, error } = await supabase
    .from('reports')
    .select(
      `
      *,
      property:properties(*)
    `
    )
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('getReport error:', { id, userId, error })
    throw new Error(`getReport failed: ${stringifyError(error)}`)
  }

  return data as Report & { property: Report['property'] }
}

export async function createReport(propertyId: string, month: string, year: number) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  console.log('createReport inputs:', { propertyId, month, year, userId })

  if (!isUuid(propertyId)) {
    throw new Error(`createReport invalid propertyId (expected UUID): ${propertyId}`)
  }

  if (typeof month !== 'string' || !month.trim()) {
    throw new Error(`createReport invalid month: ${String(month)}`)
  }

  if (typeof year !== 'number' || Number.isNaN(year)) {
    throw new Error(`createReport invalid year: ${String(year)}`)
  }

  const insertPayload = {
    property_id: propertyId,
    user_id: userId,
    month,
    year,
    status: 'draft',
    template_version: 'v1',
    input_mode: 'guided',
  }

  const { data, error } = await supabase
    .from('reports')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    console.error('createReport error:', { insertPayload, error })
    throw new Error(`createReport failed: ${stringifyError(error)}`)
  }

  if (!data?.id) {
    console.error('createReport returned no data:', { insertPayload, data })
    throw new Error(`createReport failed: no row returned from Supabase`)
  }

  revalidatePath('/dashboard/reports')
  return data as Report
}

export async function updateReport(
  id: string,
  updates: Partial<Report>
): Promise<Report> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  if (!isUuid(id)) {
    throw new Error(`updateReport invalid id (expected UUID): ${id}`)
  }

  const { data, error } = await supabase
    .from('reports')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('updateReport error:', { id, userId, updates, error })
    throw new Error(`updateReport failed: ${stringifyError(error)}`)
  }

  revalidatePath(`/dashboard/reports/${id}`)
  return data as Report
}

export async function deleteReport(id: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  if (!isUuid(id)) {
    throw new Error(`deleteReport invalid id (expected UUID): ${id}`)
  }

  const { data: files, error: filesErr } = await supabase
    .from('report_files')
    .select('storage_path')
    .eq('report_id', id)

  if (filesErr) {
    console.error('deleteReport fetch files error:', { id, filesErr })
    throw new Error(`deleteReport failed fetching files: ${stringifyError(filesErr)}`)
  }

  if (files && files.length > 0) {
    const paths = files.map((f) => f.storage_path)
    const { error: removeErr } = await supabase.storage.from('report-files').remove(paths)
    if (removeErr) {
      console.error('deleteReport storage remove error:', { id, removeErr })
      throw new Error(`deleteReport failed removing files: ${stringifyError(removeErr)}`)
    }
  }

  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('deleteReport error:', { id, userId, error })
    throw new Error(`deleteReport failed: ${stringifyError(error)}`)
  }

  revalidatePath('/dashboard/reports')
}

// ===================
// File Operations
// ===================

export async function getReportFiles(reportId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  if (!isUuid(reportId)) {
    throw new Error(`getReportFiles invalid reportId (expected UUID): ${reportId}`)
  }

  const { data, error } = await supabase
    .from('report_files')
    .select('*')
    .eq('report_id', reportId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getReportFiles error:', { reportId, userId, error })
    throw new Error(`getReportFiles failed: ${stringifyError(error)}`)
  }

  return data as ReportFile[]
}

export async function addReportFile(
  reportId: string,
  fileName: string,
  fileType: 'excel' | 'pdf' | 'csv',
  fileSize: number,
  storagePath: string
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  if (!isUuid(reportId)) {
    throw new Error(`addReportFile invalid reportId (expected UUID): ${reportId}`)
  }

  const { data, error } = await supabase
    .from('report_files')
    .insert({
      report_id: reportId,
      user_id: userId,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      storage_path: storagePath,
      processing_status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('addReportFile error:', { reportId, userId, error })
    throw new Error(`addReportFile failed: ${stringifyError(error)}`)
  }

  revalidatePath(`/dashboard/reports/${reportId}`)
  return data as ReportFile
}

export async function deleteReportFile(fileId: string, storagePath: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  if (!isUuid(fileId)) {
    throw new Error(`deleteReportFile invalid fileId (expected UUID): ${fileId}`)
  }

  const { error: removeErr } = await supabase.storage
    .from('report-files')
    .remove([storagePath])

  if (removeErr) {
    console.error('deleteReportFile storage remove error:', { fileId, removeErr })
    throw new Error(`deleteReportFile storage remove failed: ${stringifyError(removeErr)}`)
  }

  const { error } = await supabase
    .from('report_files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', userId)

  if (error) {
    console.error('deleteReportFile db delete error:', { fileId, userId, error })
    throw new Error(`deleteReportFile failed: ${stringifyError(error)}`)
  }
}

// ===================
// Save Questionnaire
// ===================

export async function saveQuestionnaire(reportId: string, questionnaire: QuestionnaireData) {
  return updateReport(reportId, { questionnaire })
}

export async function saveFreeformNarrative(reportId: string, narrative: string) {
  return updateReport(reportId, {
    input_mode: 'freeform',
    freeform_narrative: narrative,
  })
}

// Add this function to your src/app/actions/reports.ts file

/**
 * Update questionnaire data for a report
 */
export async function updateQuestionnaire(
  reportId: string,
  questionnaire: Record<string, unknown>,
  inputMode: 'guided' | 'freeform',
  freeformNarrative: string | null
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('reports')
    .update({
      questionnaire,
      input_mode: inputMode,
      freeform_narrative: freeformNarrative,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/reports/${reportId}/edit`)
  return { success: true }
}