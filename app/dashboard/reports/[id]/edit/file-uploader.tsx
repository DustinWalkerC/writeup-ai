'use client';
import { useState, useCallback, useRef, DragEvent } from 'react';

interface UploadedFile {
  id: string;
  file_type: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

interface FileUploaderProps {
  reportId: string;
  existingFiles: UploadedFile[];
  onFilesChanged: (files: UploadedFile[]) => void;
  tier?: 'foundational' | 'professional' | 'institutional';
}

const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.csv,.pdf,.txt,.doc,.docx';

export default function FileUploader({ reportId, existingFiles, onFilesChanged, tier = 'foundational' }: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);

  // Tier-gated file types
  const availableFileTypes: Record<string, { label: string; desc: string; required: boolean }> = {
    t12: { label: 'T-12 Operating Statement', desc: 'Monthly income and expense statement', required: true },
    rent_roll: { label: 'Rent Roll', desc: 'Current tenant and unit details', required: false },
  };
  if (tier === 'professional' || tier === 'institutional') {
    availableFileTypes.leasing_activity = { label: 'Leasing Activity Report', desc: 'Traffic, applications, move-ins/outs', required: false };
  }
  const isDropZoneAvailable = tier === 'professional' || tier === 'institutional';

  const dropRef = useRef<HTMLDivElement>(null);

  const primaryFiles = files.filter(f => f.file_type in availableFileTypes);
  const additionalFiles = files.filter(f => !(f.file_type in availableFileTypes));

  const handleUpload = useCallback(async (fileType: string, file: File) => {
    const uploadKey = fileType === 'additional' ? `additional_${file.name}` : fileType;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));
    setErrors(prev => ({ ...prev, [uploadKey]: '' }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      const res = await fetch(`/api/reports/${reportId}/files`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      let updated: UploadedFile[];
      if (fileType in availableFileTypes) {
        // Replace existing file of same type
        updated = [...files.filter(f => f.file_type !== fileType), data.file];
      } else {
        // Add to additional files
        updated = [...files, data.file];
      }
      setFiles(updated);
      onFilesChanged(updated);
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [uploadKey]: err instanceof Error ? err.message : 'Upload failed',
      }));
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  }, [reportId, files, onFilesChanged]);

  const handleDelete = useCallback(async (fileId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });
      if (res.ok) {
        const updated = files.filter(f => f.id !== fileId);
        setFiles(updated);
        onFilesChanged(updated);
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  }, [reportId, files, onFilesChanged]);

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      // Upload each dropped file as 'additional' type
      Array.from(droppedFiles).forEach(file => {
        handleUpload('additional', file);
      });
    }
  }, [handleUpload]);

  const formatSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Upload Documents</h3>
        <p className="text-sm text-slate-500 mt-1">
          Upload your financial documents. The analysis engine will process all files and extract relevant data for your property.
        </p>
      </div>

      {/* Primary Document Slots */}
      <div className="space-y-3">
        {Object.entries(availableFileTypes).map(([type, cfg]) => {
          const existing = files.find(f => f.file_type === type);
          const isUp = uploading[type];
          const err = errors[type];

          return (
            <div
              key={type}
              className={`rounded-xl border p-4 transition-all ${
                existing
                  ? 'border-green-200 bg-green-50/50'
                  : cfg.required
                  ? 'border-cyan-200 bg-cyan-50/30'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      existing
                        ? 'bg-green-100'
                        : cfg.required
                        ? 'bg-cyan-100'
                        : 'bg-slate-100'
                    }`}
                  >
                    {existing ? (
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg
                        className={`w-5 h-5 ${cfg.required ? 'text-cyan-600' : 'text-slate-400'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-slate-900">{cfg.label}</h4>
                      {cfg.required && (
                        <span className="text-xs font-medium text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    {existing ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-green-700 truncate">{existing.file_name}</p>
                        <span className="text-xs text-green-600/70">{formatSize(existing.file_size)}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">{cfg.desc}</p>
                    )}
                    {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {existing && (
                    <button
                      onClick={() => handleDelete(existing.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <label
                    className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isUp
                        ? 'bg-slate-100 text-slate-400 cursor-wait'
                        : existing
                        ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        : cfg.required
                        ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:from-cyan-700 hover:to-teal-700 shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isUp ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </>
                    ) : existing ? (
                      'Replace'
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept={ACCEPTED_EXTENSIONS}
                      disabled={isUp}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(type, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isDropZoneAvailable ? (
        /* Existing drop zone code stays exactly as-is — just move it inside this conditional */
        <div>
          {/* Drop Zone for Additional Documents */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-slate-700">Supporting Documents</h4>
              <span className="text-xs text-slate-400">Optional</span>
            </div>

            <div
              ref={dropRef}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-xl border-2 border-dashed transition-all ${
                dragActive
                  ? 'border-cyan-400 bg-cyan-50/50'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    dragActive ? 'bg-cyan-100' : 'bg-slate-100'
                  }`}
                >
                  <svg
                    className={`w-6 h-6 ${dragActive ? 'text-cyan-600' : 'text-slate-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {dragActive ? 'Drop files here' : 'Drag and drop files here'}
                </p>
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  Financial statements, property reports, market data, or any supporting documentation
                </p>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Browse Files
                  <input
                    type="file"
                    className="hidden"
                    accept={ACCEPTED_EXTENSIONS}
                    multiple
                    onChange={e => {
                      const fileList = e.target.files;
                      if (fileList) {
                        Array.from(fileList).forEach(f => handleUpload('additional', f));
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                <p className="text-xs text-slate-400 mt-2">
                  Supports PDF, Excel, CSV, Word, and text files
                </p>
              </div>
            </div>

            {/* Additional Files List */}
            {additionalFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {additionalFiles.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between px-4 py-2.5 bg-white rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{file.file_name}</p>
                        <p className="text-xs text-slate-400">{formatSize(file.file_size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-cyan-50/30 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-slate-900 mb-1">Unlock Additional Document Uploads</h4>
          <p className="text-xs text-slate-500 mb-4">
            Upgrade to Professional to upload leasing activity reports, market data, and supporting documents for deeper analysis.
          </p>
          <a
            href="/dashboard/pricing"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-cyan-700 hover:to-teal-700 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            View Plans
          </a>
        </div>
      )}
    </div>
  );
}
