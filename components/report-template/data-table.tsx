import { TableRow, formatCurrency } from '@/lib/report-template-types'

type Props = {
  title: string
  rows: TableRow[]
  showBudget?: boolean
  showVariance?: boolean
}

export function DataTable({ title, rows, showBudget = true, showVariance = true }: Props) {
  const formatCell = (value: number | string | undefined) => {
    if (value === undefined) return '—'
    if (typeof value === 'string') return value
    return formatCurrency(value)
  }

  const getVarianceColor = (variance: number | undefined) => {
    if (variance === undefined) return '#64748b'
    if (variance > 0) return '#059669'
    if (variance < 0) return '#dc2626'
    return '#64748b'
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <h4
        style={{
          fontSize: '0.9rem',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </h4>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 500 }}>
              Item
            </th>
            <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b', fontWeight: 500 }}>
              Actual
            </th>
            {showBudget && (
              <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b', fontWeight: 500 }}>
                Budget
              </th>
            )}
            {showVariance && (
              <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b', fontWeight: 500 }}>
                Variance
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              style={{
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
              }}
            >
              <td style={{ padding: '10px 12px', color: '#374151' }}>
                {row.label}
              </td>
              <td style={{ textAlign: 'right', padding: '10px 12px', color: '#0f172a', fontWeight: 500 }}>
                {formatCell(row.actual)}
              </td>
              {showBudget && (
                <td style={{ textAlign: 'right', padding: '10px 12px', color: '#64748b' }}>
                  {formatCell(row.budget)}
                </td>
              )}
              {showVariance && (
                <td
                  style={{
                    textAlign: 'right',
                    padding: '10px 12px',
                    color: getVarianceColor(row.variancePercent),
                    fontWeight: 500,
                  }}
                >
                  {row.variancePercent !== undefined
                    ? `${row.variancePercent >= 0 ? '+' : ''}${row.variancePercent.toFixed(1)}%`
                    : formatCell(row.variance)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
