import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { regenerateSingleSection } from '@/lib/report-generator';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: reportId } = await params;

  try {
    const { sectionId, userNotes } = await request.json();
    if (!sectionId) return NextResponse.json({ error: 'sectionId required' }, { status: 400 });

    const result = await regenerateSingleSection({ reportId, sectionId, userNotes: userNotes || 'Improve this section', userId });
    return NextResponse.json({ success: true, section: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Regeneration failed' }, { status: 500 });
  }
}
