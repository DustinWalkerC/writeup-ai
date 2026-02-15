'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AIGenerationDisplay from './ai-generation-display';

interface GeneratedSection {
  id: string; title: string; content: string;
  metrics: Array<{ label: string; value: string; change?: string; changeDirection?: string; vsbudget?: string }>;
  included: boolean; skipReason: string | null;
}

interface GenerateClientProps {
  reportId: string; propertyId: string; selectedMonth: number; selectedYear: number;
  tier: string; distributionStatus: string; distributionNote: string;
  questionnaireAnswers: Record<string, string>; existingSections: GeneratedSection[];
  propertyName: string;
}

/**
 * Robust JSON parser for Claude's report output.
 * Handles: valid JSON, code-fenced JSON, truncated JSON, and raw text fallback.
 */
function parseGeneratedJSON(fullText: string): GeneratedSection[] {
  // The API uses assistant prefill '{"sections": [' so the streamed
  // text starts mid-JSON. Prepend the prefill to reconstruct valid JSON.
  let jsonContent = fullText;

  // Remove code fences if present
  const fenceMatch = fullText.match(/```(?:json)?\s*\n?([\s\S]+?)```/);
  if (fenceMatch) {
    jsonContent = fenceMatch[1].trim();
  }

  // If the response doesn't start with '{', prepend the prefill
  const trimmed = jsonContent.trim();
  if (!trimmed.startsWith('{')) {
    jsonContent = '{"sections": [' + trimmed;
  }

  // Try to find the outer JSON object
  const objStart = jsonContent.indexOf('{');
  if (objStart >= 0) {
    jsonContent = jsonContent.slice(objStart);
  }

  // Step 3: Try full JSON parse
  try {
    const parsed = JSON.parse(jsonContent);
    if (parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
      return parsed.sections;
    }
  } catch {
    // JSON parse failed — likely truncated. Try recovery.
  }

  // Step 4: Truncation recovery — extract individual section objects
  try {
    const sections: GeneratedSection[] = [];
    // Match complete section objects: { "id": "...", ... "skipReason": ... }
    const sectionRegex = /\{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"title"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"metrics"\s*:\s*(\[[\s\S]*?\])\s*,\s*"included"\s*:\s*(true|false)\s*,\s*"skipReason"\s*:\s*(null|"[^"]*")\s*\}/g;

    let match;
    while ((match = sectionRegex.exec(jsonContent)) !== null) {
      try {
        // Parse the full matched section as JSON to handle escaping properly
        const sectionJSON = match[0];
        const section = JSON.parse(sectionJSON);
        sections.push(section);
      } catch {
        // If individual section parse fails, build it manually
        sections.push({
          id: match[1],
          title: match[2],
          content: match[3].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
          metrics: tryParseArray(match[4]),
          included: match[5] === 'true',
          skipReason: match[6] === 'null' ? null : match[6].replace(/^"|"$/g, ''),
        });
      }
    }

    if (sections.length > 0) {
      return sections;
    }
  } catch {
    // Section extraction failed too
  }

  // Step 5: Simpler extraction — find section blocks by splitting on "id" patterns
  try {
    const sections: GeneratedSection[] = [];
    const idMatches = [...jsonContent.matchAll(/"id"\s*:\s*"([^"]+)"/g)];

    for (let i = 0; i < idMatches.length; i++) {
      const idMatch = idMatches[i];
      const startIdx = jsonContent.lastIndexOf('{', idMatch.index!);
      const endBound = i < idMatches.length - 1 ? idMatches[i + 1].index! : jsonContent.length;

      // Find the closing brace for this section
      let braceCount = 0;
      let endIdx = startIdx;
      for (let j = startIdx; j < endBound + 200 && j < jsonContent.length; j++) {
        if (jsonContent[j] === '{') braceCount++;
        if (jsonContent[j] === '}') braceCount--;
        if (braceCount === 0 && j > startIdx) {
          endIdx = j + 1;
          break;
        }
      }

      if (endIdx > startIdx) {
        try {
          const sectionStr = jsonContent.slice(startIdx, endIdx);
          const section = JSON.parse(sectionStr);
          if (section.id && section.title) {
            sections.push({
              id: section.id,
              title: section.title,
              content: section.content || '',
              metrics: Array.isArray(section.metrics) ? section.metrics : [],
              included: section.included !== false,
              skipReason: section.skipReason || null,
            });
          }
        } catch {
          // Skip this section
        }
      }
    }

    if (sections.length > 0) {
      return sections;
    }
  } catch {
    // All extraction methods failed
  }

  // Step 6: Final fallback — return as single section with cleaned content
  // Clean up JSON artifacts so it's at least readable
  let cleaned = fullText
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .replace(/^\s*\{\s*"sections"\s*:\s*\[\s*/m, '')
    .replace(/"id"\s*:\s*"[^"]*"\s*,\s*/g, '')
    .replace(/"title"\s*:\s*"[^"]*"\s*,\s*/g, '')
    .replace(/"content"\s*:\s*"/g, '')
    .replace(/",\s*"metrics"\s*:[\s\S]*?"skipReason"\s*:\s*(?:null|"[^"]*")\s*\}\s*,?/g, '\n\n')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();

  // If cleaned text is mostly JSON noise, just show a simpler message
  if (cleaned.length < 50 || cleaned.startsWith('{')) {
    cleaned = 'Report generation completed but output could not be parsed. Please try regenerating with "Regenerate All".';
  }

  return [{
    id: 'executive_summary',
    title: 'Report',
    content: cleaned,
    metrics: [],
    included: true,
    skipReason: null,
  }];
}

function tryParseArray(str: string): GeneratedSection['metrics'] {
  try {
    return JSON.parse(str) || [];
  } catch {
    return [];
  }
}

export default function GenerateClient({
  reportId, propertyId, selectedMonth, selectedYear, tier,
  distributionStatus, distributionNote, questionnaireAnswers,
  existingSections, propertyName,
}: GenerateClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>(
    existingSections.length > 0 ? 'completed' : 'idle'
  );
  const [streamText, setStreamText] = useState('');
  const [sections, setSections] = useState<GeneratedSection[]>(existingSections);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const [regenModal, setRegenModal] = useState<{ sectionId: string; sectionTitle: string } | null>(null);
  const [regenNotes, setRegenNotes] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const streamRef = useRef('');
  const hasAutoStarted = useRef(false);

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Save generated sections and update report status to 'complete'
  const saveGenerationResults = useCallback(async (generatedSections: GeneratedSection[], tokenUsage?: { inputTokens: number; outputTokens: number }) => {
    try {
      await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generated_sections: generatedSections,
          status: 'complete',
          generation_status: 'completed',
          generation_completed_at: new Date().toISOString(),
          generation_config: {
            tier,
            model: 'claude-sonnet-4-20250514',
            inputTokens: tokenUsage?.inputTokens || 0,
            outputTokens: tokenUsage?.outputTokens || 0,
          },
        }),
      });
    } catch (err) {
      console.error('Failed to save generation results:', err);
    }
  }, [reportId, tier]);

  const handleGenerate = useCallback(async () => {
    setStatus('generating');
    setStreamText('');
    setError(null);
    streamRef.current = '';

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId, propertyId, selectedMonth, selectedYear, tier,
          distributionStatus, distributionNote, questionnaireAnswers,
          streaming: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalUsage: { inputTokens: number; outputTokens: number } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'text') {
              streamRef.current += event.text;
              // Don't show raw JSON to user — show progress indicator
              const sectionMatches = streamRef.current.match(/"title"\s*:\s*"([^"]+)"/g);
              if (sectionMatches) {
                const titles = sectionMatches.map(m => m.match(/"title"\s*:\s*"([^"]+)"/)?.[1] || '');
                setStreamText(`Generating report...\n\n${titles.map((t, i) => `${i + 1}. ${t} ✓`).join('\n')}\n\nGenerating section ${titles.length + 1}...`);
              } else {
                setStreamText('Analyzing financial documents...');
              }
            } else if (event.type === 'usage') {
              finalUsage = { inputTokens: event.inputTokens, outputTokens: event.outputTokens };
              setUsage(finalUsage);
            } else if (event.type === 'error') {
              throw new Error(event.message);
            } else if (event.type === 'done') {
              const fullText = streamRef.current;
              const parsedSections = parseGeneratedJSON(fullText);
              setSections(parsedSections);
              setStatus('completed');
              // Save to database
              await saveGenerationResults(parsedSections, finalUsage || undefined);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Generation failed') {
              // Skip unparseable SSE events, but re-throw actual errors
              if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
            }
          }
        }
      }

      // If we exited without 'done' event, still try to parse and save
      if (status !== 'completed' && streamRef.current) {
        const parsedSections = parseGeneratedJSON(streamRef.current);
        setSections(parsedSections);
        setStatus('completed');
        await saveGenerationResults(parsedSections, finalUsage || undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStatus('error');
    }
  }, [reportId, propertyId, selectedMonth, selectedYear, tier, distributionStatus, distributionNote, questionnaireAnswers, saveGenerationResults, status]);

  // Auto-start generation when arriving from edit page
  useEffect(() => {
    const autoGenerate = searchParams.get('autoGenerate');
    if (autoGenerate === 'true' && status === 'idle' && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      handleGenerate();
    }
  }, [searchParams, status, handleGenerate]);

  const handleRegenerateSection = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      setRegenModal({ sectionId, sectionTitle: section.title });
      setRegenNotes('');
    }
  }, [sections]);

  const handleSubmitRegenerate = useCallback(async () => {
    if (!regenModal) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/regenerate-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: regenModal.sectionId, userNotes: regenNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setSections(prev => prev.map(s => s.id === regenModal.sectionId ? data.section : s));
      }
    } catch (err) {
      console.error('Regeneration failed:', err);
    } finally {
      setRegenerating(false);
      setRegenModal(null);
    }
  }, [reportId, regenModal, regenNotes]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <button onClick={() => router.push(`/dashboard/reports/${reportId}/edit`)}
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Edit
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{propertyName} — Report Generation</h1>
          <p className="text-slate-500 mt-1">
            {monthNames[selectedMonth]} {selectedYear} — {tier.charAt(0).toUpperCase() + tier.slice(1)} tier
          </p>
        </div>
        <div className="flex gap-3">
          {status === 'completed' && (
            <>
              <button onClick={handleGenerate}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                Regenerate All
              </button>
              <button onClick={() => router.push('/dashboard/reports')}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-cyan-700 hover:to-teal-700 transition-all shadow-sm">
                View Reports
              </button>
            </>
          )}
          {status === 'error' && (
            <button onClick={handleGenerate}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-cyan-700 hover:to-teal-700 transition-all shadow-sm">
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Main Display */}
      <AIGenerationDisplay
        status={status} streamText={streamText} sections={sections}
        error={error} usage={usage} onRegenerateSection={handleRegenerateSection}
        tier={tier}
      />

      {/* Regeneration Modal */}
      {regenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Regenerate: {regenModal.sectionTitle}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Provide feedback or instructions for improving this section.
            </p>
            <textarea value={regenNotes} onChange={e => setRegenNotes(e.target.value)}
              placeholder="e.g., Make this more analytical, add market context, focus on NOI improvement..."
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all placeholder-slate-400 mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setRegenModal(null)} disabled={regenerating}
                className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button onClick={handleSubmitRegenerate} disabled={regenerating}
                className="px-4 py-2 text-sm text-white bg-gradient-to-r from-cyan-600 to-teal-600 rounded-lg hover:from-cyan-700 hover:to-teal-700 transition-all disabled:opacity-50">
                {regenerating ? 'Regenerating...' : 'Regenerate Section'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

