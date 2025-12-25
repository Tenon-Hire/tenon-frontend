import { auth0 } from '@/lib/auth0';
import MarketingHomePage from '@/features/marketing/home/MarketingHomePage';

export default async function HomePage() {
  const session = await auth0.getSession();
  return <MarketingHomePage user={session?.user} />;
}
