import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarkdownPreview } from '@/components/ui/Markdown';
import { LazyMarkdownPreview } from '@/components/ui/LazyMarkdownPreview';
import { StatusPill } from '@/components/ui/StatusPill';

jest.mock('next/dynamic', () => {
  return (
    _importer: () => Promise<unknown>,
    opts: { loading?: () => React.ReactElement },
  ) => {
    const Fallback = opts?.loading;
    return function MockDynamic() {
      return Fallback ? <Fallback /> : null;
    };
  };
});

describe('MarkdownPreview extras', () => {
  it('renders empty placeholder when content missing', () => {
    render(
      <MarkdownPreview
        content="   "
        emptyPlaceholder={<span data-testid="empty">empty</span>}
      />,
    );
    expect(screen.getByTestId('empty')).toBeInTheDocument();
  });

  it('renders markdown content when provided', () => {
    render(<MarkdownPreview content="# Title" />);
    expect(screen.getByTestId('react-markdown')).toBeInTheDocument();
  });

  it('treats non-string content as empty and shows default placeholder', () => {
    // @ts-expect-error intentional null to hit safeContent branch
    render(<MarkdownPreview content={null} />);
    expect(screen.getByText(/Nothing to preview yet/i)).toBeInTheDocument();
  });
});

describe('LazyMarkdownPreview loading fallback', () => {
  it('shows loading placeholder while dynamic import resolves', () => {
    render(<LazyMarkdownPreview content="preview me" />);
    expect(screen.getByText(/Loading preview/i)).toBeInTheDocument();
  });
});

describe('StatusPill', () => {
  it('uses default muted tone when tone not provided', () => {
    render(<StatusPill label="Muted" />);
    const pill = screen.getByText('Muted');
    expect(pill.className).toContain('bg-gray-100');
  });

  it('renders other tones', () => {
    render(<StatusPill label="Warn" tone="warning" />);
    expect(screen.getByText('Warn').className).toContain('bg-yellow-50');
  });
});
