import { Role } from '@prisma/client';
import { requireAuth } from '@/lib/requireAuth';
import { dashboardResponse } from '@/lib/dashboardHttp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;
  return dashboardResponse(request, undefined, true);
}
