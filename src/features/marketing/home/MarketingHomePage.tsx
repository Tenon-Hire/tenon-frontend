import { MarketingHomeSignedIn } from './MarketingHomeSignedIn';
import { MarketingHomeSignedOut } from './MarketingHomeSignedOut';

type MarketingHomePageProps = {
  user?: { name?: string | null } | null;
};

export default function MarketingHomePage({ user }: MarketingHomePageProps) {
  if (user) {
    return <MarketingHomeSignedIn name={user.name} />;
  }
  return <MarketingHomeSignedOut />;
}
