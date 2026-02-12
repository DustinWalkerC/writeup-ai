'use client';
import { useState, useCallback } from 'react';

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
}

const FILE_TYPES: Record<string, { label: string; desc: string; accept: string; required: boolean; icon: string }> = {
  t12: { label: 'T-12 Operating Statement', desc: 'Monthly income & expense statement (required)', accept: '.xlsx,.xls,.csv,.pdf', required: true, icon: '📊' },
  rent_roll: { label: 'Rent Roll', desc: 'Current tenant & unit details', accept: '.xlsx,.xls,.csv,.pdf', required: false, icon: '🏠' },
  leasing_activity: { label: 'Leasing Activity Report', desc: 'Traffic, applications, move-ins/outs, turn costs', accept: '.xlsx,.xls,.csv,.pdf', required: false, icon: '📋' },
};

export default function FileUploader({ reportId, existingFiles, onFilesChanged }: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUpload = useCallback(async (fileType: string, file: File) => {
    setUploading(prev => ({ ...prev, [fileType]: true }));
    setErrors(prev => ({ ...prev, [fileType]: '' }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      const res = await fetch(`/api/reports/${reportId}/files`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const updated = [...files.filter(f => f.file_type !== fileType), data.file];
      setFiles(updated);
      onFilesChanged(updated);
    } catch (err) {
      setErrors(prev => ({ ...prev, [fileType]: err instanceof Error ? err.message : 'Upload failed' }));
    } finally {
      setUploading(prev => ({ ...prev, [fileType]: false }));
    }
  }, [reportId, files, onFilesChanged]);

  const handleDelete = useCallback(async (fileId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/files`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId }),
      });
      if (res.ok) {
        const updated = files.filter(f => f.id !== fileId);
        setFiles(updated);
        onFilesChanged(updated);
      }
    } catch (e) { console.error('Delete failed:', e); }
  }, [reportId, files, onFilesChanged]);

  const formatSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Upload Documents</h3>
      <p className="text-sm text-gray-500">Upload your financial documents. Claude will analyze all files together.</p>
      <div className="grid gap-4">
        {Object.entries(FILE_TYPES).map(([type, cfg]) => {
          const existing = files.find(f => f.file_type === type);
          const isUp = uploading[type];
          const err = errors[type];
          return (
            <div key={type} className={`border rounded-lg p-4 ${existing ? 'border-green-200 bg-green-50' : cfg.required ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{cfg.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {cfg.label}
                      {cfg.required && <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Required</span>}
                    </h4>
                    <p className="text-sm text-gray-500 mt-0.5">{cfg.desc}</p>
                    {existing && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                        <span>{existing.file_name} ({formatSize(existing.file_size)})</span>
                        <button onClick={() => handleDelete(existing.id)} className="text-red-500 hover:text-red-700 ml-2">Remove</button>
                      </div>
                    )}
                    {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
                  </div>
                </div>
                <label className={`cursor-pointer inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  isUp ? 'bg-gray-100 text-gray-400 cursor-wait' : existing ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}>
                  {isUp ? 'Uploading...' : existing ? 'Replace' : 'Upload'}
                  <input type="file" className="hidden" accept={cfg.accept} disabled={isUp}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(type, f); e.target.value = ''; }} />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

