import { NextResponse } from "next/server";
import { auth0, getAccessToken } from "@/lib/auth0";

function getBackendBaseUrl(): string {
  return process.env.BACKEND_BASE_URL ?? "http://localhost:8000";
}

export async function GET() {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const accessToken = await getAccessToken();
    const backendBase = getBackendBaseUrl();

    const res = await fetch(`${backendBase}/api/simulations`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? ((await res.json()) as unknown)
      : await res.text();

    return NextResponse.json(body, { status: res.status });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? `Upstream error: ${e.message}` : "Upstream error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
