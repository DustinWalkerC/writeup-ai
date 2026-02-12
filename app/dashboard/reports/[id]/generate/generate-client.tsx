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
              setStreamText(streamRef.current);
            } else if (event.type === 'usage') {
              finalUsage = { inputTokens: event.inputTokens, outputTokens: event.outputTokens };
              setUsage(finalUsage);
            } else if (event.type === 'error') {
              throw new Error(event.message);
            } else if (event.type === 'done') {
              const fullText = streamRef.current;
              let parsedSections: GeneratedSection[] = [];
              try {
                let jsonContent = fullText;
                const match = fullText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (match) jsonContent = match[1];
                const objMatch = jsonContent.match(/\{[\s\S]*\}/);
                if (objMatch) jsonContent = objMatch[0];
                const parsed = JSON.parse(jsonContent);
                parsedSections = parsed.sections || [];
              } catch {
                parsedSections = [{ id: 'executive_summary', title: 'Report', content: fullText, metrics: [], included: true, skipReason: null }];
              }
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
      if (streamRef.current && status !== 'completed') {
        let parsedSections: GeneratedSection[] = [];
        try {
          let jsonContent = streamRef.current;
          const match = streamRef.current.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (match) jsonContent = match[1];
          const objMatch = jsonContent.match(/\{[\s\S]*\}/);
          if (objMatch) jsonContent = objMatch[0];
          const parsed = JSON.parse(jsonContent);
          parsedSections = parsed.sections || [];
        } catch {
          parsedSections = [{ id: 'executive_summary', title: 'Report', content: streamRef.current, metrics: [], included: true, skipReason: null }];
        }
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
