import { render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children and merges className', () => {
    render(
      <Card className="custom">
        <div>Content</div>
      </Card>,
    );

    const card = screen.getByText('Content').parentElement;
    expect(card).toHaveClass('custom');
    expect(card).toHaveClass('rounded-lg');
  });
});
