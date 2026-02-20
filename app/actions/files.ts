'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { 
  excelToText, 
  pdfToText, 
  extractFinancialDataWithClaude,
  ExtractedFinancialData 
} from '@/lib/document-intelligence'

type ReportFile = {
  id: string
  file_name: string
  file_path: string
  file_type: string
}

/**
 * Parse uploaded files using Claude's intelligence
 */
export async function parseReportFilesWithAI(
  reportId: string
): Promise<{ success: boolean; data?: ExtractedFinancialData; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Get report with files
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*, property:properties(*), report_files(*)')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return { success: false, error: 'Report not found' }
    }

    const files: ReportFile[] = report.report_files || []
    if (files.length === 0) {
      return { success: false, error: 'No files uploaded' }
    }

    // Find financial files (Excel or PDF)
    const financialFiles = files.filter((file) => {
      const name = file.file_name.toLowerCase()
      return name.endsWith('.xlsx') || 
             name.endsWith('.xls') || 
             name.endsWith('.csv') ||
             name.endsWith('.pdf')
    })

    if (financialFiles.length === 0) {
      return { success: false, error: 'No Excel or PDF files found' }
    }

    // Process files and combine text
    const documentTexts: string[] = []
    const sourceFiles: string[] = []

    for (const file of financialFiles) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('report-files')
        .download(file.file_path)

      if (downloadError || !fileData) {
        console.warn(`Could not download ${file.file_name}:`, downloadError)
        continue
      }

      const fileName = file.file_name.toLowerCase()
      sourceFiles.push(file.file_name)

      try {
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
          const arrayBuffer = await fileData.arrayBuffer()
          const text = excelToText(arrayBuffer, file.file_name)
          documentTexts.push(text)
        } else if (fileName.endsWith('.pdf')) {
          const buffer = Buffer.from(await fileData.arrayBuffer())
          const text = await pdfToText(buffer, file.file_name)
          documentTexts.push(text)
        }
      } catch (parseErr) {
        console.warn(`Could not parse ${file.file_name}:`, parseErr)
      }
    }

    if (documentTexts.length === 0) {
      return { success: false, error: 'Could not read any files' }
    }

    // Combine all document text
    const combinedText = documentTexts.join('\n\n---\n\n')

    // Use Claude to extract financial data
    const propertyName = report.property?.name || 'Property'
    const period = `${report.month} ${report.year}`
    
    const extractedData = await extractFinancialDataWithClaude(
      combinedText,
      propertyName,
      period
    )

    // Add source files to metadata
    extractedData.metadata.sourceFiles = sourceFiles

    // Save to database
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        financial_data: extractedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    if (updateError) {
      return { success: false, error: `Failed to save: ${updateError.message}` }
    }

    return { success: true, data: extractedData }
  } catch (error) {
    console.error('File parsing error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to parse files' 
    }
  }
}

/**
 * Get parsed financial data for a report
 */
export async function getReportFinancialData(
  reportId: string
): Promise<{ success: boolean; data?: ExtractedFinancialData; error?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: report, error } = await supabase
    .from('reports')
    .select('financial_data')
    .eq('id', reportId)
    .single()

  if (error || !report) {
    return { success: false, error: 'Report not found' }
  }

  if (!report.financial_data) {
    return { success: false, error: 'No financial data extracted yet' }
  }

  return { success: true, data: report.financial_data as ExtractedFinancialData }
}