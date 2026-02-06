import { NextRequest } from 'next/server';
import { withRecruiterAuth } from '@/app/api/utils';
import { handleDashboard } from './handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  return withRecruiterAuth(
    req,
    { tag: 'dashboard', requirePermission: 'recruiter:access' },
    (auth) => handleDashboard(req, auth),
  );
}
