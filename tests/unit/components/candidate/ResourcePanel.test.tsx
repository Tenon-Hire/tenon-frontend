import { render, screen } from '@testing-library/react';
import { ResourcePanel } from '@/features/candidate/session/task/components/ResourcePanel';

describe('ResourcePanel', () => {
  it('renders a link when a url is provided', () => {
    render(
      <ResourcePanel
        title="Day 4 recording"
        description="Record a short walkthrough."
        linkUrl="https://example.com/record"
        linkLabel="Open recording link"
      />,
    );

    expect(
      screen.getByRole('link', { name: /open recording link/i }),
    ).toHaveAttribute('href', 'https://example.com/record');
  });

  it('shows a fallback message when no link is provided', () => {
    render(
      <ResourcePanel
        title="Day 5 documentation"
        description="Write your summary."
        emptyMessage="Check the prompt for the link."
      />,
    );

    expect(
      screen.getByText(/check the prompt for the link/i),
    ).toBeInTheDocument();
  });
});
