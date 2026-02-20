'use client';

interface ReportStepperProps {
  /** 1 = Property & Period, 2 = Upload & Context, 3 = Generate, 4 = Review & Export */
  currentStep: 1 | 2 | 3 | 4;
}

const STEPS = [
  { key: 'property', label: 'Property & Period' },
  { key: 'upload', label: 'Upload & Context' },
  { key: 'generate', label: 'Generate' },
  { key: 'review', label: 'Review & Export' },
];

const accent = '#00B7DB';
const green = '#29581D';
const border = '#E8E5E0';
const borderL = '#F0EDE8';
const textMuted = '#A3A3A3';

export function ReportStepper({ currentStep }: ReportStepperProps) {
  const doneCount = currentStep - 1;
  const fillPct = doneCount === 0
    ? 0
    : ((doneCount + 0.5) / (STEPS.length - 1)) * 100;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
        {/* Track background */}
        <div style={{
          position: 'absolute', top: 8, left: 40, right: 40,
          height: 2, background: borderL, borderRadius: 100,
        }}>
          {/* Filled portion */}
          <div style={{
            height: '100%', borderRadius: 100, background: green,
            width: `${Math.min(fillPct, 100)}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>

        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          return (
            <div key={step.key} style={{
              position: 'relative', zIndex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', width: 88,
            }}>
              {/* Dot */}
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: isDone ? green : isActive ? accent : '#FFFFFF',
                border: isDone || isActive ? 'none' : `2px solid ${border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? `0 0 0 4px ${accent}15` : 'none',
                transition: 'all 0.3s',
              }}>
                {isDone && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff"
                    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {isActive && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                )}
              </div>
              {/* Label */}
              <span style={{
                fontSize: 11, fontWeight: 600, marginTop: 8,
                textAlign: 'center' as const, whiteSpace: 'nowrap' as const,
                color: isDone ? green : isActive ? accent : textMuted,
              }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
