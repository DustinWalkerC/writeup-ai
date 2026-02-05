import { UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';

export default async function DashboardPage() {
  // Get the current user's info from the server
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">writeup-ai</h1>
          {/* User button shows avatar and sign-out option */}
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome message */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome back, {user?.firstName || 'there'}! 👋
          </h2>
          <p className="text-slate-600">
            Ready to create investor reports? Let's get started.
          </p>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: New Report */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="font-semibold text-slate-900 mb-1">Create New Report</h3>
            <p className="text-sm text-slate-500">Generate an AI-powered investor report</p>
          </div>

          {/* Card 2: Properties */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">🏢</div>
            <h3 className="font-semibold text-slate-900 mb-1">My Properties</h3>
            <p className="text-sm text-slate-500">Manage your property portfolio</p>
          </div>

          {/* Card 3: Past Reports */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-slate-900 mb-1">Past Reports</h3>
            <p className="text-sm text-slate-500">View and download previous reports</p>
          </div>
        </div>
      </main>
    </div>
  );
}
