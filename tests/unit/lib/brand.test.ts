describe('brand config', () => {
  const originalNamespace =
    process.env.NEXT_PUBLIC_TENON_AUTH0_CLAIM_NAMESPACE;

  afterEach(() => {
    process.env.NEXT_PUBLIC_TENON_AUTH0_CLAIM_NAMESPACE = originalNamespace;
    jest.resetModules();
  });

  it('adds trailing slash when missing', async () => {
    process.env.NEXT_PUBLIC_TENON_AUTH0_CLAIM_NAMESPACE =
      'https://custom.example';

    const { CUSTOM_CLAIM_NAMESPACE } = await import('@/lib/brand');
    expect(CUSTOM_CLAIM_NAMESPACE).toBe('https://custom.example/');
  });

  it('keeps provided trailing slash intact', async () => {
    process.env.NEXT_PUBLIC_TENON_AUTH0_CLAIM_NAMESPACE =
      'https://namespaced.example/';

    const { CUSTOM_CLAIM_NAMESPACE } = await import('@/lib/brand');
    expect(CUSTOM_CLAIM_NAMESPACE).toBe('https://namespaced.example/');
  });
});
