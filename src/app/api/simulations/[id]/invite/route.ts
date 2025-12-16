import { NextResponse } from "next/server";
import { auth0, getAccessToken } from "@/lib/auth0";

function getBackendBaseUrl(): string {
  return process.env.BACKEND_BASE_URL ?? "http://localhost:8000";
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const accessToken = await getAccessToken();
    const backendBase = getBackendBaseUrl();

    const res = await fetch(`${backendBase}/api/simulations/${id}/invite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
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
