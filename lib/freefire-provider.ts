const BASE_URL = "https://developers.freefirecommunity.com/api/v1";

type ProviderEndpoint = "info" | "stats" | "guild";

export async function callFreeFireProvider(
  endpoint: ProviderEndpoint,
  params: Record<string, string>
) {
  const apiKey = process.env.FF_PROVIDER_API_KEY;
  if (!apiKey) {
    return {
      ok: false as const,
      status: 503,
      body: {
        ok: false,
        error: "PROVIDER_NOT_CONFIGURED",
        message: "Set FF_PROVIDER_API_KEY in Vercel Environment Variables."
      }
    };
  }

  const url = new URL(`${BASE_URL}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "User-Agent": "MadaraFF/1.0 (+https://madara-ff-api-mu.vercel.app)",
        "Accept": "application/json"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(9000)
    });

    const raw = await response.text();
    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = { message: "Provider returned a non-JSON response." };
    }

    if (!response.ok) {
      const status = response.status === 401 || response.status === 403
        ? 502
        : response.status === 429
          ? 429
          : response.status >= 500
            ? 502
            : response.status;

      return {
        ok: false as const,
        status,
        body: {
          ok: false,
          error: "PROVIDER_REQUEST_FAILED",
          providerStatus: response.status,
          details: body
        }
      };
    }

    return { ok: true as const, status: 200, body: { ok: true, data: body } };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      ok: false as const,
      status: timedOut ? 504 : 502,
      body: {
        ok: false,
        error: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE",
        message: timedOut
          ? "The Free Fire data provider did not respond in time."
          : "Could not reach the Free Fire data provider."
      }
    };
  }
}
