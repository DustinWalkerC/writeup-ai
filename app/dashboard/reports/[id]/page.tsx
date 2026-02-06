// app/dashboard/reports/[id]/page.tsx
import { getReport } from '@/app/actions/reports'
import { redirect } from 'next/navigation'

type Params = { id: string }
type Props = { params: Params | Promise<Params> }

export default async function ReportRootPage({ params }: Props) {
  const { id } = await Promise.resolve(params)
  if (!id) redirect('/dashboard/reports')

  const report = await getReport(id)

  if (report.status === 'draft') redirect(`/dashboard/reports/${id}/edit`)
  redirect(`/dashboard/reports/${id}/generate`)
}

