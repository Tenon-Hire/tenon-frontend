import type { Metadata } from 'next';
import { getCachedSessionNormalized } from '@/lib/auth0';
import { BRAND_NAME } from '@/lib/brand';
import MarketingHomePage from '@/features/marketing/home/MarketingHomePage';

export const metadata: Metadata = {
  title: `${BRAND_NAME} | 5-day work simulations for hiring`,
  description:
    'Create realistic 5-day work simulations for candidates. Evaluate real execution, not just resumes.',
};

export default async function HomePage() {
  const session = await getCachedSessionNormalized();
  return <MarketingHomePage user={session?.user} />;
}
