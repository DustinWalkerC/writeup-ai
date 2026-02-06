'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase, Report, ReportFile, QuestionnaireData } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// ===================
// Report CRUD
// ===================

export async function getReports() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      property:properties(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as (Report & { property: Report['property'] })[]
}

export async function getReport(id: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      property:properties(*)
    `)
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data as Report & { property: Report['property'] }
}

export async function createReport(propertyId: string, month: string, year: number) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('reports')
    .insert({
      property_id: propertyId,
      user_id: userId,
      month,
      year,
      status: 'draft',
      template_version: 'v1',
      input_mode: 'guided',
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/dashboard/reports')
  return data as Report
}

export async function updateReport(
  id: string, 
  updates: Partial<Report>
): Promise<Report> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

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

  if (error) throw error
  revalidatePath(`/dashboard/reports/${id}`)
  return data as Report
}

export async function deleteReport(id: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // First delete associated files from storage
  const { data: files } = await supabase
    .from('report_files')
    .select('storage_path')
    .eq('report_id', id)

  if (files && files.length > 0) {
    const paths = files.map(f => f.storage_path)
    await supabase.storage.from('report-files').remove(paths)
  }

  // Then delete the report (cascade will delete report_files records)
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
  revalidatePath('/dashboard/reports')
}

// ===================
// File Operations
// ===================

export async function getReportFiles(reportId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('report_files')
    .select('*')
    .eq('report_id', reportId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
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

  if (error) throw error
  revalidatePath(`/dashboard/reports/${reportId}`)
  return data as ReportFile
}

export async function deleteReportFile(fileId: string, storagePath: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Delete from storage
  await supabase.storage.from('report-files').remove([storagePath])

  // Delete from database
  const { error } = await supabase
    .from('report_files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', userId)

  if (error) throw error
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
    freeform_narrative: narrative 
  })
}
