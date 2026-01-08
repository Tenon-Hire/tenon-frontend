import { NextRequest } from 'next/server';
import { errorResponse, forwardWithAuth } from '@/app/api/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(_req: NextRequest, { params }: any) {
  const submissionId = params.submissionId;
  if (!submissionId)
    return errorResponse('Missing submission id', 'Bad request');

  return forwardWithAuth(
    {
      path: `/api/submissions/${encodeURIComponent(submissionId)}`,
      tag: 'submission-detail',
      requirePermission: 'recruiter:access',
    },
    _req,
  );
}
