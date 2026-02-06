export const hasAuth0Env = () =>
  Boolean(
    process.env.TENON_AUTH0_SECRET &&
    process.env.TENON_AUTH0_DOMAIN &&
    process.env.TENON_AUTH0_CLIENT_ID &&
    process.env.TENON_AUTH0_CLIENT_SECRET &&
    process.env.TENON_APP_BASE_URL,
  );

export const signInReturnToPath = '/dashboard';
