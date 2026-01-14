type AccessTokenResponse = {
  accessToken?: string;
};

export async function fetchAuthAccessToken(): Promise<string> {
  const res = await fetch('/api/auth/access-token', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = new Error('Unable to fetch access token') as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }

  const data = (await res.json()) as AccessTokenResponse;
  if (!data?.accessToken || typeof data.accessToken !== 'string') {
    throw new Error('Access token missing from response');
  }
  return data.accessToken;
}
