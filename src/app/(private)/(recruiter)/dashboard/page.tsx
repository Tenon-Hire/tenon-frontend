import { redirect } from "next/navigation";
import { auth0, getAccessToken } from "@/lib/auth0";
import RecruiterDashboardContent, {
  type RecruiterProfile,
} from "./RecruiterDashboardContent";

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect('/login');
  }

  console.log("ENV CHECK", {
    hasBackend: !!process.env.BACKEND_BASE_URL,
    hasAudience: !!process.env.AUTH0_AUDIENCE,
    appBaseUrl: process.env.APP_BASE_URL,
  });

  let me: RecruiterProfile | null = null;
  let error: string | null = null;

  try {
    const accessToken = await getAccessToken();
    const backendBase = process.env.BACKEND_BASE_URL ?? "http://localhost:8000";

    const response = await fetch(`${backendBase}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      console.log("ME FAILED", response.status, bodyText);
      error = `Unable to fetch profile (status ${response.status})${
        bodyText ? `: ${bodyText}` : ""
      }`;
    } else {
      me = (await response.json()) as RecruiterProfile;
    }

  } catch (e) {
    error =
      e instanceof Error
        ? `Unexpected error while loading profile: ${e.message}`
        : "Unexpected error while loading profile";
  }

  return <RecruiterDashboardContent profile={me} error={error} />;
}
