'use client'

import { useState, useCallback } from 'react'
import { supabase, ReportFile } from '@/lib/supabase'
import { addReportFile, deleteReportFile } from '@/app/actions/reports'

type Props = {
  reportId: string
  existingFiles: ReportFile[]
}

export function FileUploader({ reportId, existingFiles }: Props) {
  const [files, setFiles] = useState<ReportFile[]>(existingFiles)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getFileType = (fileName: string): 'excel' | 'pdf' | 'csv' => {
    const ext = fileName.toLowerCase().split('.').pop()
    if (ext === 'xlsx' || ext === 'xls') return 'excel'
    if (ext === 'pdf') return 'pdf'
    if (ext === 'csv') return 'csv'
    return 'pdf' // default
  }

  const uploadFile = async (file: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/pdf',
      'text/csv',
    ]
    if (!validTypes.includes(file.type)) {
      setError(`Invalid file type: ${file.name}. Please upload Excel, PDF, or CSV files.`)
      return
    }

    // Generate unique path
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${reportId}/${timestamp}-${safeName}`

    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('report-files')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      // Add record to database
      const fileRecord = await addReportFile(
        reportId,
        file.name,
        getFileType(file.name),
        file.size,
        storagePath
      )

      setFiles(prev => [...prev, fileRecord])
      setError(null)
    } catch (err) {
      console.error('Upload error:', err)
      setError(`Failed to upload ${file.name}`)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    setUploading(true)
    setError(null)

    for (const file of Array.from(selectedFiles)) {
      await uploadFile(file)
    }

    setUploading(false)
    e.target.value = '' // Reset input
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const droppedFiles = e.dataTransfer.files
    if (!droppedFiles.length) return

    setUploading(true)
    setError(null)

    for (const file of Array.from(droppedFiles)) {
      await uploadFile(file)
    }

    setUploading(false)
  }, [reportId])

  const handleDelete = async (file: ReportFile) => {
    if (!confirm(`Delete ${file.file_name}?`)) return

    try {
      await deleteReportFile(file.id, file.storage_path)
      setFiles(prev => prev.filter(f => f.id !== file.id))
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to delete file')
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const fileTypeIcons: Record<string, string> = {
    excel: '📊',
    pdf: '📄',
    csv: '📋',
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="text-4xl mb-2">📁</div>
        <p className="text-slate-600 mb-2">
          {uploading ? 'Uploading...' : 'Drag and drop files here, or'}
        </p>
        <label className="inline-block px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-200">
          Browse Files
          <input
            type="file"
            multiple
            accept=".xlsx,.xls,.pdf,.csv"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <p className="text-slate-400 text-sm mt-2">
          Supports Excel, PDF, CSV
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{fileTypeIcons[file.file_type] || '📄'}</span>
                <div>
                  <p className="font-medium text-slate-900 text-sm">{file.file_name}</p>
                  <p className="text-slate-500 text-xs">
                    {formatFileSize(file.file_size)} • {file.processing_status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(file)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
