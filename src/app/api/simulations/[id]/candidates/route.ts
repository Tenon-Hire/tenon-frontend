import { NextResponse } from "next/server";
import { auth0, getAccessToken } from "@/lib/auth0";

function getBackendBaseUrl(): string {
  const raw = process.env.BACKEND_BASE_URL ?? "http://localhost:8000";
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

async function parseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return (await res.json()) as unknown;
    } catch {
      return undefined;
    }
  }

  try {
    return await res.text();
  } catch {
    return undefined;
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown token error";
    return NextResponse.json(
      { message: "Not authenticated", details: msg },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const backendBase = getBackendBaseUrl();

  const upstream = await fetch(
    `${backendBase}/api/simulations/${encodeURIComponent(id)}/candidates`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

  const body = await parseBody(upstream);
  const resp = NextResponse.json(body, { status: upstream.status });
  resp.headers.set("x-simuhire-bff", "simulations-candidates");
  return resp;
}
