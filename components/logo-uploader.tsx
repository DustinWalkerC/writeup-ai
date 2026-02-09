'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

type Props = {
  currentLogoUrl: string | null
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
}

export function LogoUploader({ currentLogoUrl, onUpload, onRemove }: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB')
      return
    }

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => setPreviewUrl(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload
    setIsUploading(true)
    try {
      await onUpload(file)
    } catch (error) {
      console.error('Upload failed:', error)
      setPreviewUrl(currentLogoUrl)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleRemove = async () => {
    setIsUploading(true)
    try {
      await onRemove()
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Company Logo
      </label>
      
      {previewUrl ? (
        <div className="flex items-center gap-4">
          <div className="relative w-32 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
            <Image
              src={previewUrl}
              alt="Company logo"
              fill
              className="object-contain p-2"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium disabled:opacity-50"
            >
              Change logo
            </button>
            <button
              onClick={handleRemove}
              disabled={isUploading}
              className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${dragActive 
              ? 'border-cyan-500 bg-cyan-50' 
              : 'border-slate-300 hover:border-slate-400 bg-slate-50'
            }
            ${isUploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <div className="text-slate-400 mb-2">
            <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-slate-600 font-medium">
            {isUploading ? 'Uploading...' : 'Drop logo here or click to upload'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            PNG, JPG up to 2MB. Recommended: 400×200px
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden"
      />
    </div>
  )
}
