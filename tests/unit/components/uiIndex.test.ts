describe('components/ui index export', () => {
  it('exposes expected primitives', async () => {
    const ui = await import('@/components/ui');
    expect(ui).toHaveProperty('Button');
    expect(ui).toHaveProperty('Input');
    expect(ui).toHaveProperty('PageHeader');
    expect(ui).toHaveProperty('CodeEditor');
    expect(ui).toHaveProperty('StatusPill');
    expect(ui).toHaveProperty('Card');
    expect(ui).toHaveProperty('cn');
  });
});
