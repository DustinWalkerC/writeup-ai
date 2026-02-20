'use client';
import { useState, useCallback, useRef, DragEvent } from 'react';

interface UploadedFile {
  id: string; file_type: string; file_name: string; file_size: number; storage_path: string; created_at: string;
}
interface FileUploaderProps {
  reportId: string; existingFiles: UploadedFile[]; onFilesChanged: (files: UploadedFile[]) => void;
  tier?: 'foundational' | 'professional' | 'institutional';
}

const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.csv,.pdf,.txt,.doc,.docx';

const W = {
  accent: '#00B7DB',
  bg: '#FFFFFF', bgAlt: '#F7F5F1', bgWarm: '#FAF9F7',
  text: '#1A1A1A', textMid: '#4A4A4A', textSoft: '#7A7A7A', textMuted: '#A3A3A3',
  border: '#E8E5E0', borderL: '#F0EDE8',
  green: '#008A3E', red: '#CC0000',
};

export default function FileUploader({ reportId, existingFiles, onFilesChanged, tier = 'foundational' }: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);

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
      const formData = new FormData(); formData.append('file', file); formData.append('fileType', fileType);
      const res = await fetch(`/api/reports/${reportId}/files`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      let updated: UploadedFile[];
      if (fileType in availableFileTypes) { updated = [...files.filter(f => f.file_type !== fileType), data.file]; }
      else { updated = [...files, data.file]; }
      setFiles(updated); onFilesChanged(updated);
    } catch (err) {
      setErrors(prev => ({ ...prev, [uploadKey]: err instanceof Error ? err.message : 'Upload failed' }));
    } finally { setUploading(prev => ({ ...prev, [uploadKey]: false })); }
  }, [reportId, files, onFilesChanged]);

  const handleDelete = useCallback(async (fileId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/files`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId }) });
      if (res.ok) { const updated = files.filter(f => f.id !== fileId); setFiles(updated); onFilesChanged(updated); }
    } catch (e) { console.error('Delete failed:', e); }
  }, [reportId, files, onFilesChanged]);

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) Array.from(droppedFiles).forEach(file => handleUpload('additional', file));
  }, [handleUpload]);

  const formatSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h3 style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: 18, fontWeight: 500, color: W.text,
        }}>Upload Documents</h3>
        <p style={{ fontSize: 13, color: W.textSoft, marginTop: 4 }}>
          Upload your financial documents. The analysis engine will process all files and extract relevant data for your property.
        </p>
      </div>

      {/* Primary Document Slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(availableFileTypes).map(([type, cfg]) => {
          const existing = files.find(f => f.file_type === type);
          const isUp = uploading[type];
          const err = errors[type];

          return (
            <div key={type} style={{
              borderRadius: 12, padding: 16, transition: 'all 0.25s',
              border: `1px solid ${existing ? `${W.green}30` : cfg.required ? `${W.accent}30` : W.border}`,
              background: existing ? `${W.green}06` : cfg.required ? `${W.accent}04` : W.bg,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: existing ? `${W.green}12` : cfg.required ? `${W.accent}12` : W.bgAlt,
                  }}>
                    {existing ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill={W.green}>
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cfg.required ? W.accent : W.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>

                  {/* Details */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: W.text }}>{cfg.label}</h4>
                      {cfg.required && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: W.accent,
                          background: `${W.accent}12`, padding: '2px 8px', borderRadius: 100,
                        }}>Required</span>
                      )}
                    </div>
                    {existing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <p style={{ fontSize: 13, color: W.green, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{existing.file_name}</p>
                        <span style={{ fontSize: 11, color: `${W.green}90` }}>{formatSize(existing.file_size)}</span>
                      </div>
                    ) : (
                      <p style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>{cfg.desc}</p>
                    )}
                    {err && <p style={{ fontSize: 11, color: W.red, marginTop: 4 }}>{err}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                  {existing && (
                    <button onClick={() => handleDelete(existing.id)} title="Remove file"
                      style={{
                        padding: 6, border: 'none', borderRadius: 8, cursor: 'pointer',
                        background: 'transparent', color: W.textMuted, transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = W.red; e.currentTarget.style.background = `${W.red}08`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = W.textMuted; e.currentTarget.style.background = 'transparent'; }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v3"/>
                        <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </button>
                  )}
                  <label style={{
                    cursor: isUp ? 'wait' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    transition: 'all 0.2s',
                    ...(isUp ? {
                      background: W.bgAlt, color: W.textMuted, border: 'none',
                    } : existing ? {
                      background: W.bg, color: W.textMid, border: `1.5px solid ${W.border}`,
                    } : cfg.required ? {
                      background: W.accent, color: '#fff', border: 'none',
                      boxShadow: `0 2px 8px ${W.accent}30`,
                    } : {
                      background: W.bg, color: W.textMid, border: `1.5px solid ${W.border}`,
                    }),
                  }}>
                    {isUp ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                          <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </>
                    ) : existing ? 'Replace' : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                        </svg>
                        Upload
                      </>
                    )}
                    <input type="file" style={{ display: 'none' }} accept={ACCEPTED_EXTENSIONS} disabled={isUp}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(type, f); e.target.value = ''; }} />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isDropZoneAvailable ? (
        <div>
          {/* Drop Zone Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: W.textMid }}>Supporting Documents</h4>
            <span style={{ fontSize: 11, color: W.textMuted }}>Optional</span>
          </div>

          {/* Drop Zone */}
          <div ref={dropRef} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            style={{
              position: 'relative', borderRadius: 12, transition: 'all 0.25s',
              border: `2px dashed ${dragActive ? `${W.accent}60` : W.border}`,
              background: dragActive ? `${W.accent}04` : W.bgWarm,
            }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: dragActive ? `${W.accent}12` : W.bgAlt,
                transition: 'background 0.2s',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={dragActive ? W.accent : W.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: W.textMid }}>
                {dragActive ? 'Drop files here' : 'Drag and drop files here'}
              </p>
              <p style={{ fontSize: 11, color: W.textMuted, marginTop: 4, marginBottom: 12, textAlign: 'center' }}>
                Financial statements, property reports, market data, or any supporting documentation
              </p>
              <label style={{
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', background: W.bg, border: `1.5px solid ${W.border}`,
                borderRadius: 10, fontSize: 13, fontWeight: 600, color: W.textMid,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.2s',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Browse Files
                <input type="file" style={{ display: 'none' }} accept={ACCEPTED_EXTENSIONS} multiple
                  onChange={e => { const fl = e.target.files; if (fl) Array.from(fl).forEach(f => handleUpload('additional', f)); e.target.value = ''; }} />
              </label>
              <p style={{ fontSize: 11, color: W.textMuted, marginTop: 8 }}>
                Supports PDF, Excel, CSV, Word, and text files
              </p>
            </div>
          </div>

          {/* Additional Files List */}
          {additionalFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {additionalFiles.map(file => (
                <div key={file.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', background: W.bg, borderRadius: 10, border: `1px solid ${W.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: W.bgAlt,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={W.textSoft} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: W.textMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</p>
                      <p style={{ fontSize: 11, color: W.textMuted }}>{formatSize(file.file_size)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(file.id)} title="Remove file"
                    style={{
                      padding: 6, border: 'none', borderRadius: 8, cursor: 'pointer',
                      background: 'transparent', color: W.textMuted, flexShrink: 0, transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = W.red; e.currentTarget.style.background = `${W.red}08`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = W.textMuted; e.currentTarget.style.background = 'transparent'; }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Upgrade prompt for foundational tier */
        <div style={{
          borderRadius: 12, border: `1px solid ${W.border}`,
          background: `linear-gradient(135deg, ${W.bgWarm}, ${W.accent}04)`,
          padding: 24, textAlign: 'center' as const,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: `${W.accent}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={W.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h4 style={{
            fontFamily: 'var(--font-display, Georgia, serif)',
            fontSize: 15, fontWeight: 500, color: W.text, marginBottom: 4,
          }}>Unlock Additional Document Uploads</h4>
          <p style={{ fontSize: 12, color: W.textSoft, marginBottom: 16 }}>
            Upgrade to Professional to upload leasing activity reports, market data, and supporting documents for deeper analysis.
          </p>
          <a href="/dashboard/pricing" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', background: W.accent, color: '#fff',
            borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none',
            boxShadow: `0 2px 10px ${W.accent}30`, transition: 'all 0.2s',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 7l5 5m0 0l-5 5m5-5H6"/>
            </svg>
            View Plans
          </a>
        </div>
      )}
    </div>
  );
}
