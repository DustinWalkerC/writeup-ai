import { currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import { getProperties } from '@/app/actions/properties'
import { getReports } from '@/app/actions/reports'

export default async function DashboardPage() {
  const user = await currentUser()
  const properties = await getProperties()
  const reports = await getReports()
  
  const currentMonth = new Date().toLocaleString('default', { month: 'long' })
  const reportsThisMonth = reports.filter(r => r.month === currentMonth).length

  return (
    <div>
      {/* Welcome message */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome back, {user?.firstName || 'there'}! 👋
        </h1>
        <p className="text-slate-600">
          Ready to create investor reports? Let's get started.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="text-3xl font-bold text-slate-900">{properties.length}</div>
          <div className="text-slate-500">Properties</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="text-3xl font-bold text-slate-900">{reportsThisMonth}</div>
          <div className="text-slate-500">Reports This Month</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="text-3xl font-bold text-slate-900">{reports.length}</div>
          <div className="text-slate-500">Total Reports</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/dashboard/reports/new"
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="text-3xl mb-3">📝</div>
          <h3 className="font-semibold text-slate-900 mb-1">Create Report</h3>
          <p className="text-sm text-slate-500">
            Generate an AI-powered investor report
          </p>
        </Link>

        <Link
          href="/dashboard/properties/new"
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="text-3xl mb-3">🏢</div>
          <h3 className="font-semibold text-slate-900 mb-1">Add Property</h3>
          <p className="text-sm text-slate-500">
            Add a new property to your portfolio
          </p>
        </Link>
      </div>
    </div>
  )
}
