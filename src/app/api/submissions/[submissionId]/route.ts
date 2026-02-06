import { NextRequest } from 'next/server';
import { errorResponse, forwardBffWithAuth } from '@/app/api/bffRouteHelpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await context.params;
  if (!submissionId)
    return errorResponse('Missing submission id', 'Bad request');

  return forwardBffWithAuth(
    {
      path: `/api/submissions/${encodeURIComponent(submissionId)}`,
      tag: 'submission-detail',
      requirePermission: 'recruiter:access',
    },
    _req,
  );
}
