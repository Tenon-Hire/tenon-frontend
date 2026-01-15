import nextConfig from '../../next.config';

describe('next.config headers', () => {
  it('adds CSP report-only headers for app routes', async () => {
    const headers = await nextConfig.headers?.();
    expect(headers).toBeDefined();

    const route = headers?.find((entry) => entry.source.includes('(?!api'));
    expect(route).toBeDefined();

    const headerList = route?.headers ?? [];
    const csp = headerList.find(
      (header) => header.key === 'Content-Security-Policy-Report-Only',
    );
    expect(csp?.value).toContain("object-src 'none'");
    expect(csp?.value).toContain("frame-src 'none'");
    expect(csp?.value).toContain("frame-ancestors 'none'");
  });
});
