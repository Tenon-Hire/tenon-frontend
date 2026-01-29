import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/dynamic', () => {
  return (
    importer: () => Promise<unknown>,
    opts: { loading?: () => JSX.Element },
  ) => {
    const Loading = opts?.loading;
    const Mock: React.FC<{ content?: string }> = () => (
      <div data-testid="mock-md">loaded</div>
    );
    const mockWithStatics = Mock as React.FC<{ content?: string }> & {
      loading?: () => JSX.Element;
      preload?: () => Promise<unknown>;
    };
    mockWithStatics.loading = Loading;
    mockWithStatics.preload = importer;
    return mockWithStatics;
  };
});

describe('LazyMarkdownPreview', () => {
  it('renders loading placeholder and can preload underlying module', async () => {
    const { LazyMarkdownPreview } =
      await import('@/components/ui/LazyMarkdownPreview');
    const Loading = (
      LazyMarkdownPreview as {
        loading?: () => JSX.Element;
        preload?: () => Promise<unknown>;
      }
    ).loading;
    if (!Loading) throw new Error('Loading component missing');
    render(<Loading />);
    expect(screen.getByText(/Loading preview/i)).toBeInTheDocument();

    const preload = (
      LazyMarkdownPreview as {
        preload?: () => Promise<unknown>;
      }
    ).preload;
    expect(typeof preload).toBe('function');
    // Should resolve without throwing
    if (preload) {
      await expect(preload()).resolves.toBeDefined();
    }
  });

  it('renders resolved markdown component after dynamic import', async () => {
    const { LazyMarkdownPreview } =
      await import('@/components/ui/LazyMarkdownPreview');
    render(<LazyMarkdownPreview content="Hello" />);
    expect(screen.getByTestId('mock-md')).toBeInTheDocument();
  });
});
