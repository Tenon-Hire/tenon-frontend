import type { Metadata } from 'next';
import { auth0 } from '@/lib/auth0';
import MarketingHomePage from '@/features/marketing/home/MarketingHomePage';

export const metadata: Metadata = {
  title: 'SimuHire | 5-day work simulations for hiring',
  description:
    'Create realistic 5-day work simulations for candidates. Evaluate real execution, not just resumes.',
};

export default async function HomePage() {
  const session = await auth0.getSession();
  return <MarketingHomePage user={session?.user} />;
}
