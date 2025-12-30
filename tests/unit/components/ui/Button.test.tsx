import { render, screen } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders left icon by default and respects variant/size classes', () => {
    render(
      <Button variant="secondary" size="sm" icon={<span>i</span>}>
        Click
      </Button>,
    );

    const btn = screen.getByRole('button', { name: /click/i });
    expect(btn).toHaveClass('bg-white');
    expect(btn).toHaveClass('px-3');
    expect(btn).toHaveTextContent('Click');
    expect(btn.querySelector('span')).toHaveTextContent('i');
  });

  it('renders right icon when requested', () => {
    render(
      <Button icon={<span>r</span>} iconPosition="right">
        Go
      </Button>,
    );

    const btn = screen.getByRole('button', { name: /go/i });
    const spans = btn.querySelectorAll('span');
    expect(spans[spans.length - 1]).toHaveTextContent('r');
  });

  it('disables while loading and shows loading text', () => {
    render(
      <Button loading disabled>
        Submit
      </Button>,
    );

    const btn = screen.getByRole('button', { name: /loading/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Loading…');
  });
});
