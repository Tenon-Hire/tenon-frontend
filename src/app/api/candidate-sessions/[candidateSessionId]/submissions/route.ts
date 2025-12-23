import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
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

  const backendBase = getBackendBaseUrl();

  const url = new URL(req.url);
  const candidateSessionId = url.searchParams.get("candidateSessionId");
  const taskId = url.searchParams.get("taskId");

  const upstreamUrl = new URL(`${backendBase}/api/submissions`);
  if (candidateSessionId)
    upstreamUrl.searchParams.set("candidateSessionId", candidateSessionId);
  if (taskId) upstreamUrl.searchParams.set("taskId", taskId);

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    const body = await parseBody(upstream);
    const resp = NextResponse.json(body, { status: upstream.status });
    resp.headers.set("x-simuhire-bff", "submissions-list");
    return resp;
  } catch (e: unknown) {
    const message =
      e instanceof Error ? `Upstream error: ${e.message}` : "Upstream error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
