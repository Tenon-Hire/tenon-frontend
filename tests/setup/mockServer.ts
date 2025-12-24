type RouteMatcher = string | RegExp | ((path: string) => boolean);

type MockResponseInit = {
  status?: number;
  headers?: Record<string, string>;
  body?: string | Record<string, unknown> | Array<unknown>;
};

type MockRequest = {
  url: URL;
  method: string;
  headers: Headers;
  bodyText: string;
  json(): Promise<unknown>;
};

type MockResolver = (req: MockRequest) => Promise<Response | MockResponseInit> | Response | MockResponseInit;

type Handler = {
  method: string;
  matcher: RouteMatcher;
  resolver: MockResolver;
};

function toURL(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input;

  if (typeof input === "string") {
    try {
      return new URL(input);
    } catch {
      return new URL(input, "http://localhost");
    }
  }

  try {
    return new URL((input as Request).url);
  } catch {
    return new URL("http://localhost");
  }
}

function matches(matcher: RouteMatcher, path: string) {
  if (typeof matcher === "string") return matcher === path;
  if (matcher instanceof RegExp) return matcher.test(path);
  return matcher(path);
}

function toResponse(init: Response | MockResponseInit): Response {
  if (typeof Response !== "undefined" && init instanceof Response) return init;

  const status = init.status ?? 200;
  const headerMap = init.headers ?? {};
  const lower = Object.fromEntries(
    Object.entries(headerMap).map(([k, v]) => [k.toLowerCase(), v])
  );

  const hasResponseCtor = typeof Response !== "undefined";

  const bodyIsString = typeof init.body === "string";
  const bodyText =
    init.body === undefined
      ? ""
      : bodyIsString
        ? (init.body as string)
        : JSON.stringify(init.body);

  if (hasResponseCtor) {
    const headers = new Headers(init.headers ?? {});
    if (!headers.has("content-type")) {
      headers.set("content-type", bodyIsString ? "text/plain" : "application/json");
    }
    return new Response(bodyText, { status, headers });
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => lower[name.toLowerCase()] ?? null,
    },
    json: async () => {
      try {
        return JSON.parse(bodyText || "{}");
      } catch {
        return {};
      }
    },
    text: async () => bodyText,
  } as unknown as Response;
}

function buildRequest(input: RequestInfo | URL, init?: RequestInit): MockRequest {
  const url = toURL(input);
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers ?? {});
  const bodyRaw = init?.body ?? "";
  const bodyText = typeof bodyRaw === "string" ? bodyRaw : bodyRaw ? JSON.stringify(bodyRaw) : "";

  return {
    url,
    method,
    headers,
    bodyText,
    async json() {
      try {
        return JSON.parse(bodyText || "{}");
      } catch {
        return {};
      }
    },
  };
}

export function createMockServer() {
  const handlers: Handler[] = [];
  let originalFetch: typeof fetch | null = null;

  async function handleFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const req = buildRequest(input, init);
    const path = req.url.pathname;
    const method = req.method;

    const handler = handlers.find(
      (h) => h.method === method && matches(h.matcher, path)
    );

    if (!handler) {
      return toResponse({
        status: 404,
        body: { message: `Unhandled request for ${method} ${path}` },
      });
    }

    const result = await handler.resolver(req);
    return toResponse(result);
  }

  return {
    listen() {
      if (originalFetch) return;
      originalFetch = global.fetch;
      global.fetch = handleFetch as typeof fetch;
    },
    resetHandlers() {
      handlers.length = 0;
    },
    close() {
      if (originalFetch) {
        global.fetch = originalFetch;
        originalFetch = null;
      }
      handlers.length = 0;
    },
    use(method: string, matcher: RouteMatcher, resolver: MockResolver) {
      handlers.push({ method: method.toUpperCase(), matcher, resolver });
    },
  };
}

export function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return toResponse({ body: body as Record<string, unknown>, status, headers });
}
