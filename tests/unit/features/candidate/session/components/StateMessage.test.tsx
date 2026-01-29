import React from 'react';
import { render, screen } from '@testing-library/react';
import { StateMessage } from '@/features/candidate/session/components/StateMessage';

describe('StateMessage', () => {
  it('renders title and description', () => {
    render(<StateMessage title="Done" description="All good" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});
