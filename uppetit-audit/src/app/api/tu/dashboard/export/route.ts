import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';
import { dashboardResponse } from '@/lib/dashboardHttp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { error, session } = await requireAuth([Role.ADMIN, Role.TU]);
  if (error) return error;
  if (!session?.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return dashboardResponse(request, session!.user.id, true);
}
