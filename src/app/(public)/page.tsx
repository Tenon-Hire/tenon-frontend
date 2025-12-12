import { auth0 } from "@/lib/auth0";
import PublicHomeContent from "./PublicHomeContent";

export default async function HomePage() {
  const session = await auth0.getSession();
  return <PublicHomeContent user={session?.user} />;
}
