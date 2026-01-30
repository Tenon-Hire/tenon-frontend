import React from 'react';
import { render, screen } from '@testing-library/react';
import { StateMessage } from '@/features/candidate/session/components/StateMessage';

describe('StateMessage', () => {
  it('renders title and description', () => {
    render(<StateMessage title="Done" description="All good" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders title only when description is null', () => {
    render(<StateMessage title="Title Only" description={null} />);
    expect(screen.getByText('Title Only')).toBeInTheDocument();
    expect(screen.queryByText(/All good/i)).not.toBeInTheDocument();
  });

  it('renders title only when description is undefined', () => {
    render(<StateMessage title="No Desc" />);
    expect(screen.getByText('No Desc')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(
      <StateMessage
        title="With Action"
        description="Some text"
        action={<button>Click me</button>}
      />,
    );
    expect(screen.getByRole('button', { name: /Click me/i })).toBeInTheDocument();
  });

  it('does not render action container when action is undefined', () => {
    const { container } = render(<StateMessage title="No Action" />);
    expect(container.querySelector('.mt-4')).not.toBeInTheDocument();
  });
});
