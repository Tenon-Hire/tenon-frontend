import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/dynamic', () => {
  return (importer: () => Promise<any>, opts: { loading?: () => JSX.Element }) => {
    // Immediately invoke the loading component to mirror suspense fallback
    const Loading = opts?.loading;
    const Mock = () => <div data-testid="mock-md">loaded</div>;
    // Expose loading so tests can assert it
    (Mock as any).loading = Loading;
    // Simulate dynamic import resolution
    (Mock as any).preload = importer;
    return Mock as unknown as React.ComponentType<any>;
  };
});

describe('LazyMarkdownPreview', () => {
  it('renders loading placeholder and can preload underlying module', async () => {
    const { LazyMarkdownPreview } = await import('@/components/ui/LazyMarkdownPreview');
    const Loading = (LazyMarkdownPreview as any).loading as React.FC | undefined;
    if (!Loading) throw new Error('Loading component missing');
    render(<Loading />);
    expect(screen.getByText(/Loading preview/i)).toBeInTheDocument();

    const preload = (LazyMarkdownPreview as any).preload as () => Promise<any>;
    expect(typeof preload).toBe('function');
    // Should resolve without throwing
    await expect(preload()).resolves.toBeDefined();
  });

  it('renders resolved markdown component after dynamic import', async () => {
    const { LazyMarkdownPreview } = await import('@/components/ui/LazyMarkdownPreview');
    render(<LazyMarkdownPreview content="Hello" />);
    expect(screen.getByTestId('mock-md')).toBeInTheDocument();
  });
});
