import { HomeSignedIn } from './HomeSignedIn';
import { HomeSignedOut } from './HomeSignedOut';

type HomePageViewProps = {
  user?: { name?: string | null } | null;
};

export default function HomePageView({ user }: HomePageViewProps) {
  if (user) {
    return <HomeSignedIn name={user.name} />;
  }
  return <HomeSignedOut />;
}
