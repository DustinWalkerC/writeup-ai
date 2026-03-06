// app/report/layout.tsx
// Public report layout — no sidebar, no auth required
// Used for "View Full Report" links from email delivery

export default function PublicReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F5F1" }}>
      {children}
    </div>
  );
}
