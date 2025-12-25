import { auth0 } from '@/lib/auth0';
import HomePageView from '@/features/public/home/HomePageView';

export default async function HomePage() {
  const session = await auth0.getSession();
  return <HomePageView user={session?.user} />;
}
